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
    public class AppointmentsController : ControllerBase
    {
        private readonly HospitalDbContext _context;
        private readonly IAuditService _auditService;

        public AppointmentsController(HospitalDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAppointments([FromQuery] Guid? doctorId, [FromQuery] string? date)
        {
            var query = _context.Appointments
                .Include(a => a.Patient)
                .Include(a => a.Doctor)
                .AsQueryable();

            if (User.IsInRole("Doctor"))
            {
                var currentDoctorId = GetCurrentStaffId();
                if (currentDoctorId.HasValue)
                    query = query.Where(a => a.DoctorId == currentDoctorId.Value
                                             && a.Patient != null
                                             && a.Patient.PrimaryDoctorId == currentDoctorId.Value);
            }
            else if (doctorId.HasValue && doctorId.Value != Guid.Empty)
            {
                query = query.Where(a => a.DoctorId == doctorId.Value);
            }

            if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out var parsedDate))
            {
                var startOfDay = parsedDate.Date;
                var endOfDay = startOfDay.AddDays(1);
                query = query.Where(a => a.AppointmentDateTime >= startOfDay && a.AppointmentDateTime < endOfDay);
            }

            var appointments = await query
                .OrderBy(a => a.AppointmentDateTime)
                .Select(a => new
                {
                    a.Id,
                    a.PatientId,
                    PatientName = a.Patient != null ? $"{a.Patient.FirstName} {a.Patient.LastName}" : "Unknown",
                    PatientMRN = a.Patient != null ? a.Patient.MRN : "",
                    a.DoctorId,
                    DoctorName = a.Doctor != null ? $"{a.Doctor.FirstName} {a.Doctor.LastName}" : "Unassigned",
                    a.AppointmentDateTime,
                    a.Status,
                    a.Reason,
                    a.Notes
                })
                .ToListAsync();

            return Ok(appointments);
        }

        [HttpPost]
        public async Task<IActionResult> CreateAppointment([FromBody] Appointment appointment)
        {
            if (appointment.PatientId <= 0 || appointment.DoctorId == Guid.Empty)
            {
                return BadRequest(new { message = "Valid patient and doctor are required." });
            }

            _context.Appointments.Add(appointment);
            await _context.SaveChangesAsync();

            var currentStaffId = User.FindFirst("staff_id")?.Value ?? "SYSTEM";
            var currentStaffName = User.Identity?.Name ?? "Staff";
            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "Staff";

            await _auditService.LogAsync(currentStaffId, currentStaffName, role, "SCHEDULE_APPOINTMENT", "Appointment", appointment.Id.ToString(), $"Scheduled appointment for Patient ID {appointment.PatientId} at {appointment.AppointmentDateTime}");

            return CreatedAtAction(nameof(GetAppointments), new { id = appointment.Id }, appointment);
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] string status)
        {
            var appointment = await _context.Appointments.FindAsync(id);
            if (appointment == null) return NotFound(new { message = "Appointment not found." });

            appointment.Status = status;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Appointment status updated.", status = appointment.Status });
        }

        private Guid? GetCurrentStaffId()
        {
            var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value;
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }
}
