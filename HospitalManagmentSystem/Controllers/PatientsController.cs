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
            var query = _context.Patients.AsQueryable();

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
            var patient = await _context.Patients.FindAsync(id);
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
    }
}
