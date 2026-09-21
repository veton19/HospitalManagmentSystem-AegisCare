using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using HospitalManagmentSystem.DBContext;
using HospitalManagmentSystem.Models;
using HospitalManagmentSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagmentSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PatientsController : ControllerBase
    {
        private readonly HospitalDbContext _context;
        private readonly IAuditService _auditService;

        public PatientsController(HospitalDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        [HttpGet]
        public async Task<IActionResult> GetPatients([FromQuery] string? search)
        {
            var query = _context.Patients
                .Include(p => p.PrimaryDoctor)
                .Include(p => p.PrimaryNurse)
                .AsQueryable();

            if (User.IsInRole("Doctor"))
            {
                var doctorId = GetCurrentStaffId();
                if (doctorId.HasValue)
                    query = query.Where(p => p.PrimaryDoctorId == doctorId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower().Trim();
                query = query.Where(p => p.FirstName.ToLower().Contains(s) || 
                                         p.LastName.ToLower().Contains(s) || 
                                         p.MRN.ToLower().Contains(s));
            }

            var patients = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
            return Ok(patients);
        }

        [HttpPost]
        public async Task<IActionResult> CreatePatient([FromBody] Patient patient)
        {
            if (string.IsNullOrWhiteSpace(patient.FirstName) || string.IsNullOrWhiteSpace(patient.LastName))
            {
                return BadRequest(new { message = "Patient name is required." });
            }

            // Auto-generate MRN if blank
            if (string.IsNullOrWhiteSpace(patient.MRN))
            {
                var count = await _context.Patients.CountAsync() + 1;
                patient.MRN = $"MRN-{100200 + count}";
            }

            patient.CreatedAt = DateTime.UtcNow;
            if (User.IsInRole("Doctor"))
            {
                var doctorId = GetCurrentStaffId();
                if (doctorId.HasValue)
                    patient.PrimaryDoctorId = doctorId.Value;
            }
            _context.Patients.Add(patient);
            await _context.SaveChangesAsync();

            var currentStaffId = User.FindFirst("staff_id")?.Value ?? "SYSTEM";
            var currentStaffName = User.Identity?.Name ?? "Staff";
            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "Staff";

            await _auditService.LogAsync(currentStaffId, currentStaffName, role, "CREATE_PATIENT", "Patient", patient.Id.ToString(), $"Registered new patient {patient.FirstName} {patient.LastName} ({patient.MRN})");

            return CreatedAtAction(nameof(GetPatientChart), new { id = patient.Id }, patient);
        }

        private Guid? GetCurrentStaffId()
        {
            var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value;
            return Guid.TryParse(raw, out var id) ? id : null;
        }

        [HttpGet("{id}/chart")]
        public async Task<IActionResult> GetPatientChart(int id)
        {
            var patient = await _context.Patients
                .Include(p => p.PrimaryDoctor)
                .Include(p => p.PrimaryNurse)
                .FirstOrDefaultAsync(p => p.Id == id);
            if (patient == null) return NotFound(new { message = "Patient not found." });

            if (User.IsInRole("Doctor"))
            {
                var doctorId = GetCurrentStaffId();
                if (!doctorId.HasValue || patient.PrimaryDoctorId != doctorId.Value)
                    return Forbid();
            }

            var appointments = await _context.Appointments
                .Where(a => a.PatientId == id)
                .Include(a => a.Doctor)
                .OrderByDescending(a => a.AppointmentDateTime)
                .ToListAsync();

            var encounters = await _context.Encounters
                .Where(e => e.PatientId == id)
                .Include(e => e.Doctor)
                .Include(e => e.Nurse)
                .OrderByDescending(e => e.StartTime)
                .ToListAsync();

            var clinicalNotes = await _context.ClinicalNotes
                .Where(n => n.PatientId == id)
                .Include(n => n.Doctor)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            var prescriptions = await _context.Prescriptions
                .Where(p => p.PatientId == id)
                .Include(p => p.Doctor)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var labOrders = await _context.LabOrders
                .Where(l => l.PatientId == id)
                .Include(l => l.Result)
                .OrderByDescending(l => l.OrderDate)
                .ToListAsync();

            var vitals = await _context.Vitals
                .Where(v => v.PatientId == id)
                .OrderByDescending(v => v.RecordedAt)
                .ToListAsync();

            var admissions = await _context.Admissions
                .Where(a => a.PatientId == id)
                .Include(a => a.AttendingDoctor)
                .OrderByDescending(a => a.AdmitDate)
                .ToListAsync();

            var currentStaffId = User.FindFirst("staff_id")?.Value ?? "SYSTEM";
            var currentStaffName = User.Identity?.Name ?? "Staff";
            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "Staff";

            await _auditService.LogAsync(currentStaffId, currentStaffName, role, "VIEW_PATIENT_CHART", "Patient", id.ToString(), $"Accessed patient chart for {patient.FirstName} {patient.LastName} ({patient.MRN})");

            return Ok(new
            {
                patient,
                appointments,
                encounters,
                clinicalNotes,
                prescriptions,
                labOrders,
                vitals,
                admissions
            });
        }

        public class AssignPatientRequest
        {
            public Guid? PrimaryDoctorId { get; set; }
            public Guid? PrimaryNurseId { get; set; }
        }

        [HttpPut("{id}/assign")]
        [Authorize(Roles = "Receptionist,Admin")]
        public async Task<IActionResult> AssignPatient(int id, [FromBody] AssignPatientRequest request)
        {
            var patient = await _context.Patients
                .Include(p => p.PrimaryDoctor)
                .Include(p => p.PrimaryNurse)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (patient == null) return NotFound(new { message = "Patient not found." });

            Staff? newDoctor = null;
            Staff? newNurse = null;

            if (request.PrimaryDoctorId.HasValue && request.PrimaryDoctorId.Value != Guid.Empty)
            {
                newDoctor = await _context.Staff.FirstOrDefaultAsync(s => s.Id == request.PrimaryDoctorId.Value && s.RoleCode == 20 && s.IsActive);
                if (newDoctor == null) return BadRequest(new { message = "Selected doctor was not found or is inactive." });
                patient.PrimaryDoctorId = newDoctor.Id;
            }
            else if (request.PrimaryDoctorId == Guid.Empty)
            {
                patient.PrimaryDoctorId = null;
            }

            if (request.PrimaryNurseId.HasValue && request.PrimaryNurseId.Value != Guid.Empty)
            {
                newNurse = await _context.Staff.FirstOrDefaultAsync(s => s.Id == request.PrimaryNurseId.Value && s.RoleCode == 30 && s.IsActive);
                if (newNurse == null) return BadRequest(new { message = "Selected nurse was not found or is inactive." });
                patient.PrimaryNurseId = newNurse.Id;
            }
            else if (request.PrimaryNurseId == Guid.Empty)
            {
                patient.PrimaryNurseId = null;
            }

            await _context.SaveChangesAsync();

            // Send notification to newly assigned Doctor
            if (newDoctor != null)
            {
                _context.Notifications.Add(new Notification
                {
                    RecipientStaffId = newDoctor.StaffId,
                    Title = "New Patient Assigned",
                    Message = $"Patient {patient.FirstName} {patient.LastName} ({patient.MRN}) has been assigned to you by Reception.",
                    Type = "OrderAction",
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Send notification to newly assigned Nurse
            if (newNurse != null)
            {
                _context.Notifications.Add(new Notification
                {
                    RecipientStaffId = newNurse.StaffId,
                    Title = "New Patient Assigned",
                    Message = $"Patient {patient.FirstName} {patient.LastName} ({patient.MRN}) has been assigned to your nursing care by Reception.",
                    Type = "OrderAction",
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            var currentStaffId = User.FindFirst("staff_id")?.Value ?? "SYSTEM";
            var currentStaffName = User.Identity?.Name ?? "Receptionist";
            var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Receptionist";

            await _auditService.LogAsync(
                currentStaffId,
                currentStaffName,
                role,
                "ASSIGN_PATIENT",
                "Patient",
                patient.Id.ToString(),
                $"Assigned patient {patient.FirstName} {patient.LastName} ({patient.MRN}) to Doctor: {(newDoctor != null ? newDoctor.FirstName + " " + newDoctor.LastName : "Unchanged")}, Nurse: {(newNurse != null ? newNurse.FirstName + " " + newNurse.LastName : "Unchanged")}"
            );

            return Ok(new
            {
                message = "Patient assignment updated successfully.",
                patientId = patient.Id,
                primaryDoctorId = patient.PrimaryDoctorId,
                primaryDoctor = newDoctor != null ? new { newDoctor.Id, newDoctor.StaffId, newDoctor.FirstName, newDoctor.LastName } : (patient.PrimaryDoctor != null ? new { patient.PrimaryDoctor.Id, patient.PrimaryDoctor.StaffId, patient.PrimaryDoctor.FirstName, patient.PrimaryDoctor.LastName } : null),
                primaryNurseId = patient.PrimaryNurseId,
                primaryNurse = newNurse != null ? new { newNurse.Id, newNurse.StaffId, newNurse.FirstName, newNurse.LastName } : (patient.PrimaryNurse != null ? new { patient.PrimaryNurse.Id, patient.PrimaryNurse.StaffId, patient.PrimaryNurse.FirstName, patient.PrimaryNurse.LastName } : null)
            });
        }
    }
}
