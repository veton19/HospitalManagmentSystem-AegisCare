using System;
using System.Linq;
using System.Threading.Tasks;
using HospitalManagmentSystem.DBContext;
using HospitalManagmentSystem.Models;
using HospitalManagmentSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagmentSystem.Controllers
{
    // ==========================================
    // 1. SOAP Notes & Clinical Documentation
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Doctor,Admin")]
    public class SOAPNotesController : ControllerBase
    {
        private readonly HospitalDbContext _context;
        private readonly IAuditService _auditService;

        public SOAPNotesController(HospitalDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateNote([FromBody] ClinicalNote note)
        {
            if (note.PatientId <= 0 || note.DoctorId == Guid.Empty)
            {
                return BadRequest(new { message = "Patient and Doctor are required." });
            }

            var doctor = await _context.Staff.Include(s => s.DoctorDetail).FirstOrDefaultAsync(s => s.Id == note.DoctorId);
            if (doctor == null) return BadRequest(new { message = "Invalid doctor account." });

            if (note.EncounterId <= 0)
            {
                var encounter = new Encounter
                {
                    PatientId = note.PatientId,
                    DoctorId = note.DoctorId,
                    StartTime = DateTime.UtcNow,
                    Status = "InConsultation",
                    ReasonForVisit = "Clinical documentation"
                };
                _context.Encounters.Add(encounter);
                await _context.SaveChangesAsync();
                note.EncounterId = encounter.Id;
            }

            note.CreatedAt = DateTime.UtcNow;
            if (note.IsDigitallySigned)
            {
                note.SignedAt = DateTime.UtcNow;
                note.DigitalSignatureHash = $"SIG-{doctor.StaffId}-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";
            }

            _context.ClinicalNotes.Add(note);
            await _context.SaveChangesAsync();

            await _auditService.LogAsync(
                doctor.StaffId,
                $"{doctor.FirstName} {doctor.LastName}",
                "Doctor",
                "CREATE_SOAP_NOTE",
                "ClinicalNote",
                note.Id.ToString(),
                $"Created SOAP Note for Patient ID {note.PatientId} with Digital Signature: {note.IsDigitallySigned}"
            );

            return Ok(note);
        }
    }

    // ==========================================
    // 2. e-Prescribing & Allergy Check
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Doctor,Admin")]
    public class PrescriptionsController : ControllerBase
    {
        private readonly HospitalDbContext _context;
        private readonly IAuditService _auditService;

        public PrescriptionsController(HospitalDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        [HttpPost("check-interactions")]
        public async Task<IActionResult> CheckInteractions([FromQuery] int patientId, [FromQuery] string drugName)
        {
            var patient = await _context.Patients.FindAsync(patientId);
            if (patient == null) return NotFound(new { message = "Patient not found." });

            bool isAlert = false;
            string alertText = "No known contraindications found.";

            if (!string.IsNullOrEmpty(patient.Allergies) && patient.Allergies.ToLower().Contains(drugName.ToLower()))
            {
                isAlert = true;
                alertText = $"WARNING: Patient is documented as allergic to '{drugName}'! Registered Allergies: {patient.Allergies}";
            }

            return Ok(new { passed = !isAlert, message = alertText });
        }

        [HttpPost]
        public async Task<IActionResult> CreatePrescription([FromBody] Prescription prescription)
        {
            if (string.IsNullOrWhiteSpace(prescription.DrugName))
                return BadRequest(new { message = "Drug name is required." });

            if (prescription.QuantityRequested <= 0)
                prescription.QuantityRequested = 1;

            var medication = await _context.Medications
                .FirstOrDefaultAsync(m => m.IsActive && m.Name.ToLower() == prescription.DrugName.Trim().ToLower());

            if (medication == null)
            {
                medication = await _context.Medications
                    .FirstOrDefaultAsync(m => m.IsActive && (
                        m.Name.ToLower().Contains(prescription.DrugName.Trim().ToLower()) ||
                        prescription.DrugName.Trim().ToLower().Contains(m.Name.ToLower())));
            }

            if (medication == null)
            {
                return BadRequest(new { message = $"'{prescription.DrugName}' is not available in the pharmacy. Choose a listed medication." });
            }

            if (medication.QuantityOnHand < prescription.QuantityRequested)
            {
                return BadRequest(new
                {
                    message = $"Insufficient pharmacy stock for {medication.Name}. {medication.QuantityOnHand} {medication.Unit} remaining; {prescription.QuantityRequested} requested."
                });
            }

            var doctor = await _context.Staff.FirstOrDefaultAsync(s => s.Id == prescription.DoctorId);
            prescription.CreatedAt = DateTime.UtcNow;
            prescription.Status = "Active";
            prescription.PharmacyStatus = "Pending";
            prescription.IsDigitallySigned = true;

            _context.Prescriptions.Add(prescription);
            await _context.SaveChangesAsync();

            var request = new MedicationRequest
            {
                PrescriptionId = prescription.Id,
                MedicationId = medication.Id,
                PatientId = prescription.PatientId,
                DoctorId = prescription.DoctorId,
                QuantityRequested = prescription.QuantityRequested,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };
            _context.MedicationRequests.Add(request);

            var pharmacists = await _context.Staff
                .Where(s => s.RoleCode == 40 && s.IsActive)
                .Select(s => s.StaffId)
                .ToListAsync();

            var patient = await _context.Patients.FindAsync(prescription.PatientId);
            foreach (var pharmacistStaffId in pharmacists)
            {
                _context.Notifications.Add(new Notification
                {
                    RecipientStaffId = pharmacistStaffId,
                    Title = "New medication request",
                    Message = $"Dr. {doctor?.LastName} requested {medication.Name} ({prescription.QuantityRequested} {medication.Unit}) for {patient?.FirstName} {patient?.LastName} ({patient?.MRN}).",
                    Type = "OrderAction"
                });
            }

            await _context.SaveChangesAsync();

            if (doctor != null)
            {
                await _auditService.LogAsync(
                    doctor.StaffId,
                    $"{doctor.FirstName} {doctor.LastName}",
                    "Doctor",
                    "CREATE_PRESCRIPTION",
                    "Prescription",
                    prescription.Id.ToString(),
                    $"Prescribed {prescription.DrugName} ({prescription.Dosage}) to Patient ID {prescription.PatientId}; pharmacy request #{request.Id}"
                );
            }

            return Ok(new
            {
                prescription.Id,
                prescription.PatientId,
                prescription.DoctorId,
                prescription.DrugName,
                prescription.Dosage,
                prescription.Frequency,
                prescription.Duration,
                prescription.Status,
                prescription.PharmacyStatus,
                prescription.QuantityRequested,
                remainingStock = medication.QuantityOnHand,
                requestId = request.Id
            });
        }
    }

    // ==========================================
    // 3. Lab Orders & Results
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class LabsController : ControllerBase
    {
        private readonly HospitalDbContext _context;
        private readonly IAuditService _auditService;

        public LabsController(HospitalDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        [HttpGet]
        public async Task<IActionResult> GetLabOrders([FromQuery] int? patientId)
        {
            var query = _context.LabOrders
                .Include(l => l.Patient)
                .Include(l => l.Doctor)
                .Include(l => l.Result)
                .AsQueryable();

            if (patientId.HasValue) query = query.Where(l => l.PatientId == patientId.Value);

            var list = await query.OrderByDescending(l => l.OrderDate).ToListAsync();
            return Ok(list);
        }

        // Pending queue for Lab Technicians — all unresolved orders
        [HttpGet("pending")]
        [Authorize(Roles = "LabTech,Admin")]
        public async Task<IActionResult> GetPendingLabOrders()
        {
            var list = await _context.LabOrders
                .Include(l => l.Patient)
                .Include(l => l.Doctor)
                .Include(l => l.Result)
                .Where(l => l.Status == "Ordered" || l.Status == "InProgress")
                .OrderBy(l => l.OrderDate)
                .ToListAsync();

            return Ok(list);
        }

        // Completed queue — orders that have finalized results
        [HttpGet("completed")]
        [Authorize]
        public async Task<IActionResult> GetCompletedLabOrders([FromQuery] int? patientId)
        {
            var query = _context.LabOrders
                .Include(l => l.Patient)
                .Include(l => l.Doctor)
                .Include(l => l.Result)
                .Where(l => l.Status == "Completed" || l.Result != null)
                .AsQueryable();

            if (patientId.HasValue) query = query.Where(l => l.PatientId == patientId.Value);

            var list = await query.OrderByDescending(l => l.Result != null ? l.Result.ResultDate : l.OrderDate).ToListAsync();
            return Ok(list);
        }

        // Allow LabTech to mark an order as InProgress
        [HttpPut("{id}/status")]
        [Authorize(Roles = "LabTech,Admin")]
        public async Task<IActionResult> UpdateLabOrderStatus(int id, [FromBody] string status)
        {
            var order = await _context.LabOrders.FindAsync(id);
            if (order == null) return NotFound(new { message = "Lab order not found." });

            var allowed = new[] { "Ordered", "InProgress", "Completed", "Cancelled" };
            if (!allowed.Contains(status))
                return BadRequest(new { message = $"Invalid status '{status}'." });

            order.Status = status;
            await _context.SaveChangesAsync();

            var currentStaffId = User.FindFirst("staff_id")?.Value ?? "SYSTEM";
            var currentStaffName = User.Identity?.Name ?? "LabTech";
            await _auditService.LogAsync(currentStaffId, currentStaffName, "LabTech",
                "UPDATE_LAB_ORDER_STATUS", "LabOrder", id.ToString(),
                $"Changed Lab Order #{id} status to '{status}'");

            return Ok(new { message = "Status updated.", order });
        }

        [HttpPost]
        [Authorize(Roles = "Doctor,Admin")]
        public async Task<IActionResult> CreateLabOrder([FromBody] LabOrder order)
        {
            order.OrderDate = DateTime.UtcNow;
            order.Status = "Ordered";

            _context.LabOrders.Add(order);
            await _context.SaveChangesAsync();

            var currentStaffId = User.FindFirst("staff_id")?.Value ?? "SYSTEM";
            var currentStaffName = User.Identity?.Name ?? "Doctor";
            await _auditService.LogAsync(currentStaffId, currentStaffName, "Doctor",
                "CREATE_LAB_ORDER", "LabOrder", order.Id.ToString(),
                $"Ordered lab '{order.TestName}' ({order.Category}) for Patient ID {order.PatientId}");

            // Notify all active LabTechs
            var labTechs = await _context.Staff
                .Where(s => s.RoleCode == 50 && s.IsActive)
                .Select(s => s.StaffId)
                .ToListAsync();

            var patient = await _context.Patients.FindAsync(order.PatientId);
            foreach (var labTechStaffId in labTechs)
            {
                _context.Notifications.Add(new Notification
                {
                    RecipientStaffId = labTechStaffId,
                    Title = "New Lab Order",
                    Message = $"Lab test '{order.TestName}' ordered for patient {patient?.FirstName} {patient?.LastName} ({patient?.MRN}).",
                    Type = "OrderAction",
                    CreatedAt = DateTime.UtcNow
                });
            }
            await _context.SaveChangesAsync();

            return Ok(order);
        }

        [HttpPost("result")]
        [Authorize(Roles = "LabTech,Admin")]
        public async Task<IActionResult> PostLabResult([FromBody] LabResult result)
        {
            var order = await _context.LabOrders
                .Include(l => l.Doctor)
                .Include(l => l.Result)
                .FirstOrDefaultAsync(l => l.Id == result.LabOrderId);
            if (order == null) return NotFound(new { message = "Lab order not found." });

            result.PatientId = order.PatientId;
            if (string.IsNullOrWhiteSpace(result.TestName))
            {
                result.TestName = order.TestName;
            }

            var existingResult = await _context.LabResults
                .FirstOrDefaultAsync(r => r.LabOrderId == result.LabOrderId);

            if (existingResult != null)
            {
                existingResult.Value = result.Value;
                existingResult.Unit = result.Unit;
                existingResult.ReferenceRange = result.ReferenceRange ?? string.Empty;
                existingResult.IsAbnormal = result.IsAbnormal;
                existingResult.IsCritical = result.IsCritical;
                existingResult.Notes = result.Notes ?? string.Empty;
                existingResult.ResultDate = DateTime.UtcNow;
                existingResult.TestName = result.TestName;
                existingResult.PatientId = order.PatientId;
            }
            else
            {
                result.ResultDate = DateTime.UtcNow;
                result.ReferenceRange = result.ReferenceRange ?? string.Empty;
                result.Notes = result.Notes ?? string.Empty;
                _context.LabResults.Add(result);
            }

            order.Status = "Completed";
            await _context.SaveChangesAsync();

            var doctor = await _context.Staff.FindAsync(order.DoctorId);
            var patient = await _context.Patients.FindAsync(order.PatientId);

            // Always notify the ordering doctor when a result is ready
            string notifTitle = result.IsCritical
                ? "CRITICAL LAB VALUE ALERT"
                : result.IsAbnormal
                    ? "Abnormal Lab Result"
                    : "Lab Result Ready";

            string notifType = (result.IsCritical || result.IsAbnormal) ? "CriticalLab" : "OrderAction";

            string notifMsg = (result.IsCritical || result.IsAbnormal)
                ? $"Test '{result.TestName}' for {patient?.FirstName} {patient?.LastName} returned {result.Value} {result.Unit} (Ref: {result.ReferenceRange}). ATTENTION REQUIRED."
                : $"Test '{result.TestName}' for {patient?.FirstName} {patient?.LastName} is complete: {result.Value} {result.Unit} (Ref: {result.ReferenceRange}).";

            _context.Notifications.Add(new Notification
            {
                RecipientStaffId = doctor?.StaffId ?? order.DoctorId.ToString(),
                Title = notifTitle,
                Message = notifMsg,
                Type = notifType,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            var finalResult = existingResult ?? result;

            // Audit log
            var currentStaffId = User.FindFirst("staff_id")?.Value ?? "SYSTEM";
            var currentStaffName = User.Identity?.Name ?? "LabTech";
            await _auditService.LogAsync(currentStaffId, currentStaffName, "LabTech",
                "POST_LAB_RESULT", "LabResult", finalResult.Id.ToString(),
                $"Entered result for '{result.TestName}' (Order #{order.Id}) — Patient {patient?.MRN}; Value: {result.Value} {result.Unit}; Abnormal: {result.IsAbnormal}; Critical: {result.IsCritical}");

            return Ok(new
            {
                id = finalResult.Id,
                labOrderId = finalResult.LabOrderId,
                patientId = finalResult.PatientId,
                testName = finalResult.TestName,
                value = finalResult.Value,
                unit = finalResult.Unit,
                referenceRange = finalResult.ReferenceRange,
                isAbnormal = finalResult.IsAbnormal,
                isCritical = finalResult.IsCritical,
                resultDate = finalResult.ResultDate,
                notes = finalResult.Notes
            });
        }
    }

    // ==========================================
    // 4. Vitals Management & Trend Graphs
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class VitalsController : ControllerBase
    {
        private readonly HospitalDbContext _context;
        private readonly IAuditService _auditService;

        public VitalsController(HospitalDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        [HttpGet("{patientId}")]
        public async Task<IActionResult> GetPatientVitals(int patientId)
        {
            var vitals = await _context.Vitals
                .Where(v => v.PatientId == patientId)
                .Include(v => v.Nurse)
                .OrderByDescending(v => v.RecordedAt)
                .ToListAsync();

            return Ok(vitals);
        }

        [HttpPost]
        [Authorize(Roles = "Nurse,Doctor,Admin")]
        public async Task<IActionResult> RecordVitals([FromBody] Vital vital)
        {
            vital.RecordedAt = DateTime.UtcNow;
            _context.Vitals.Add(vital);
            await _context.SaveChangesAsync();

            var currentStaffId = User.FindFirst("staff_id")?.Value ?? "300001";
            var currentStaffName = User.Identity?.Name ?? "Nurse";

            await _auditService.LogAsync(
                currentStaffId,
                currentStaffName,
                "Nurse",
                "ENTER_VITALS",
                "Vital",
                vital.Id.ToString(),
                $"Recorded Vitals for Patient ID {vital.PatientId}: BP {vital.BloodPressureSystolic}/{vital.BloodPressureDiastolic}, HR {vital.HeartRate}, Temp {vital.Temperature}°C, SpO2 {vital.SpO2}%"
            );

            return Ok(vital);
        }
    }

    // ==========================================
    // 5. Inpatient ADT (Admit / Discharge / Transfer)
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AdmissionsController : ControllerBase
    {
        private readonly HospitalDbContext _context;
        private readonly IAuditService _auditService;

        public AdmissionsController(HospitalDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        [HttpGet]
        public async Task<IActionResult> GetActiveAdmissions()
        {
            var admissions = await _context.Admissions
                .Include(a => a.Patient)
                .Include(a => a.AttendingDoctor)
                .OrderByDescending(a => a.AdmitDate)
                .ToListAsync();

            return Ok(admissions);
        }

        [HttpPost]
        [Authorize(Roles = "Doctor,Admin")]
        public async Task<IActionResult> AdmitPatient([FromBody] Admission admission)
        {
            admission.AdmitDate = DateTime.UtcNow;
            admission.Status = "Admitted";

            _context.Admissions.Add(admission);
            await _context.SaveChangesAsync();

            return Ok(admission);
        }

        [HttpPut("{id}/discharge")]
        [Authorize(Roles = "Doctor,Admin")]
        public async Task<IActionResult> DischargePatient(int id, [FromBody] string dischargeSummary)
        {
            var admission = await _context.Admissions.FindAsync(id);
            if (admission == null) return NotFound(new { message = "Admission record not found." });

            admission.DischargeDate = DateTime.UtcNow;
            admission.Status = "Discharged";
            admission.DischargeSummary = dischargeSummary;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Patient discharged successfully.", admission });
        }
    }

    // ==========================================
    // 6. Nurse Portal & MAR Tracker
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Nurse,Admin")]
    public class NurseController : ControllerBase
    {
        private readonly HospitalDbContext _context;

        public NurseController(HospitalDbContext context)
        {
            _context = context;
        }

        [HttpGet("care-plans")]
        public async Task<IActionResult> GetCarePlanTasks([FromQuery] int? patientId)
        {
            var isAdmin = User.IsInRole("Admin");
            var query = _context.CarePlanTasks.Include(c => c.Patient).AsQueryable();

            // Nurses only see their own assigned tasks; Admins see all
            if (!isAdmin)
            {
                var nurseGuidStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(nurseGuidStr, out var nurseGuid))
                {
                    query = query.Where(c => c.AssignedNurseId == nurseGuid);
                }
            }

            if (patientId.HasValue) query = query.Where(c => c.PatientId == patientId.Value);

            var tasks = await query.OrderBy(c => c.DueDate).ToListAsync();
            return Ok(tasks);
        }

        [HttpGet("my-patients")]
        public async Task<IActionResult> GetMyPatients()
        {
            var isAdmin = User.IsInRole("Admin");

            if (isAdmin)
            {
                // Admins see all admitted patients
                var allPatients = await _context.Admissions
                    .Where(a => a.Status == "Admitted")
                    .Include(a => a.Patient)
                    .Include(a => a.AttendingDoctor)
                    .OrderBy(a => a.BedNumber)
                    .ToListAsync();
                return Ok(allPatients);
            }

            var nurseGuidStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(nurseGuidStr, out var nurseId))
                return Unauthorized(new { message = "Invalid token." });

            // Return patients who have at least one care plan task assigned to this nurse
            var patientIds = await _context.CarePlanTasks
                .Where(c => c.AssignedNurseId == nurseId)
                .Select(c => c.PatientId)
                .Distinct()
                .ToListAsync();

            var admissions = await _context.Admissions
                .Where(a => a.Status == "Admitted" && patientIds.Contains(a.PatientId))
                .Include(a => a.Patient)
                .Include(a => a.AttendingDoctor)
                .OrderBy(a => a.BedNumber)
                .ToListAsync();

            return Ok(admissions);
        }

        [HttpPut("care-plans/{id}/toggle")]
        public async Task<IActionResult> ToggleTask(int id)
        {
            var task = await _context.CarePlanTasks.FindAsync(id);
            if (task == null) return NotFound();

            task.IsCompleted = !task.IsCompleted;
            task.CompletedAt = task.IsCompleted ? DateTime.UtcNow : null;
            await _context.SaveChangesAsync();

            return Ok(task);
        }

        [HttpGet("mar")]
        public async Task<IActionResult> GetMAR([FromQuery] int patientId)
        {
            var prescriptions = await _context.Prescriptions
                .Where(p => p.PatientId == patientId && p.Status == "Active" && p.PharmacyStatus == "ReleasedToNurse")
                .ToListAsync();

            var marRecords = await _context.MedicationAdministrationRecords
                .Where(m => m.PatientId == patientId)
                .OrderByDescending(m => m.AdministeredAt)
                .ToListAsync();

            return Ok(new { prescriptions, marRecords });
        }

        [HttpPost("mar")]
        public async Task<IActionResult> AdministerMedication([FromBody] MedicationAdministrationRecord mar)
        {
            mar.AdministeredAt = DateTime.UtcNow;
            _context.MedicationAdministrationRecords.Add(mar);
            await _context.SaveChangesAsync();

            return Ok(mar);
        }
    }

    // ==========================================
    // 7. Audit Log Review (Admin)
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AuditLogController : ControllerBase
    {
        private readonly HospitalDbContext _context;

        public AuditLogController(HospitalDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs([FromQuery] string? staffId, [FromQuery] string? action)
        {
            var query = _context.AuditLogs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(staffId)) query = query.Where(l => l.StaffId == staffId);
            if (!string.IsNullOrWhiteSpace(action)) query = query.Where(l => l.Action == action);

            var logs = await query.OrderByDescending(l => l.Timestamp).Take(200).ToListAsync();
            return Ok(logs);
        }
    }

    // ==========================================
    // 8. System Analytics & Department Management (Admin)
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AnalyticsController : ControllerBase
    {
        private readonly HospitalDbContext _context;

        public AnalyticsController(HospitalDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetDashboardMetrics()
        {
            var totalPatients = await _context.Patients.CountAsync();
            var totalStaff = await _context.Staff.CountAsync(s => s.IsActive);
            var activeAdmissions = await _context.Admissions.CountAsync(a => a.Status == "Admitted");
            var pendingLabs = await _context.LabOrders.CountAsync(l => l.Status == "Ordered" || l.Status == "Pending");
            var todayAppointments = await _context.Appointments.CountAsync(a => a.AppointmentDateTime.Date == DateTime.UtcNow.Date);

            return Ok(new
            {
                totalPatients,
                totalStaff,
                activeAdmissions,
                pendingLabs,
                todayAppointments,
                occupancyRatePercent = Math.Round((double)activeAdmissions / 50 * 100, 1) // Assuming 50 capacity
            });
        }
    }

    // ==========================================
    // 9. Staff Notifications & Clinical Alerts
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly HospitalDbContext _context;

        public NotificationsController(HospitalDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var staffId = User.FindFirst("staff_id")?.Value;
            var list = await _context.Notifications
                .Where(n => n.RecipientStaffId == staffId || n.RecipientStaffId == "ALL")
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return Ok(list);
        }
    }
}
