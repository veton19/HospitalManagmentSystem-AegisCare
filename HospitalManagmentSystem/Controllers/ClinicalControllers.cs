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
            var doctor = await _context.Staff.FirstOrDefaultAsync(s => s.Id == prescription.DoctorId);
            prescription.CreatedAt = DateTime.UtcNow;
            prescription.Status = "Active";
            prescription.IsDigitallySigned = true;

            _context.Prescriptions.Add(prescription);
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
                    $"Prescribed {prescription.DrugName} ({prescription.Dosage}) to Patient ID {prescription.PatientId}"
                );
            }

            return Ok(prescription);
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

        [HttpPost]
        [Authorize(Roles = "Doctor,Admin")]
        public async Task<IActionResult> CreateLabOrder([FromBody] LabOrder order)
        {
            order.OrderDate = DateTime.UtcNow;
            order.Status = "Ordered";

            _context.LabOrders.Add(order);
            await _context.SaveChangesAsync();

            return Ok(order);
        }

        [HttpPost("result")]
        [Authorize(Roles = "Doctor,Nurse,Admin,LabTech")]
        public async Task<IActionResult> PostLabResult([FromBody] LabResult result)
        {
            var order = await _context.LabOrders.FindAsync(result.LabOrderId);
            if (order == null) return NotFound(new { message = "Lab order not found." });

            result.ResultDate = DateTime.UtcNow;
            _context.LabResults.Add(result);

            order.Status = "Completed";
            await _context.SaveChangesAsync();

            // If abnormal or critical, issue notification to attending doctor
            if (result.IsAbnormal || result.IsCritical)
            {
                var doctor = await _context.Staff.FindAsync(order.DoctorId);
                var patient = await _context.Patients.FindAsync(order.PatientId);

                _context.Notifications.Add(new Notification
                {
                    RecipientStaffId = doctor?.StaffId ?? "200001",
                    Title = result.IsCritical ? "CRITICAL LAB VALUE ALERT" : "Abnormal Lab Result",
                    Message = $"Test '{result.TestName}' for {patient?.FirstName} {patient?.LastName} returned {result.Value} {result.Unit} (Ref: {result.ReferenceRange})",
                    Type = "CriticalLab",
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            return Ok(result);
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
            var query = _context.CarePlanTasks.Include(c => c.Patient).AsQueryable();
            if (patientId.HasValue) query = query.Where(c => c.PatientId == patientId.Value);

            var tasks = await query.OrderBy(c => c.DueDate).ToListAsync();
            return Ok(tasks);
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
                .Where(p => p.PatientId == patientId && p.Status == "Active")
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
