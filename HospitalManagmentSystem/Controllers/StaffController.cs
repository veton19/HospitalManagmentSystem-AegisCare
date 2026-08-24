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
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class StaffController : ControllerBase
    {
        private readonly HospitalDbContext _context;
        private readonly IStaffIdGenerator _staffIdGenerator;
        private readonly IAuditService _auditService;

        public StaffController(HospitalDbContext context, IStaffIdGenerator staffIdGenerator, IAuditService auditService)
        {
            _context = context;
            _staffIdGenerator = staffIdGenerator;
            _auditService = auditService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllStaff()
        {
            var staffList = await _context.Staff
                .Include(s => s.DoctorDetail)
                .Include(s => s.NurseDetail)
                .Include(s => s.AdminDetail)
                .OrderBy(s => s.RoleCode)
                .ThenBy(s => s.StaffId)
                .Select(s => new
                {
                    s.Id,
                    s.StaffId,
                    s.RoleCode,
                    s.Role,
                    s.FirstName,
                    s.LastName,
                    s.Email,
                    s.PhoneNumber,
                    s.IsActive,
                    s.CreatedAt,
                    Specialty = s.DoctorDetail != null ? s.DoctorDetail.Specialty : null,
                    LicenseNumber = s.DoctorDetail != null ? s.DoctorDetail.LicenseNumber : (s.NurseDetail != null ? s.NurseDetail.LicenseNumber : null),
                    ShiftType = s.NurseDetail != null ? s.NurseDetail.ShiftType : null
                })
                .ToListAsync();

            return Ok(staffList);
        }

        public class CreateStaffRequest
        {
            public int RoleCode { get; set; } // 10=Admin, 20=Doctor, 30=Nurse, 40=Pharmacist, 50=LabTech, 60=Receptionist
            public string FirstName { get; set; } = string.Empty;
            public string LastName { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string PhoneNumber { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string? Specialty { get; set; }
            public string? LicenseNumber { get; set; }
            public int? DepartmentId { get; set; }
            public string? ShiftType { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> CreateStaff([FromBody] CreateStaffRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "First name, last name, and password are required." });
            }

            string roleName = request.RoleCode switch
            {
                10 => "Admin",
                20 => "Doctor",
                30 => "Nurse",
                40 => "Pharmacist",
                50 => "LabTech",
                60 => "Receptionist",
                _ => "Staff"
            };

            // Generate 6-digit staff ID (RR NNNN)
            string staffId = await _staffIdGenerator.GenerateStaffIdAsync(request.RoleCode);

            var staff = new Staff
            {
                StaffId = staffId,
                RoleCode = request.RoleCode,
                Role = roleName,
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Staff.Add(staff);

            if (request.RoleCode == 10)
            {
                _context.AdminDetails.Add(new AdminDetail { StaffId = staff.Id, Department = "Administration" });
            }
            else if (request.RoleCode == 20)
            {
                _context.DoctorDetails.Add(new DoctorDetail
                {
                    StaffId = staff.Id,
                    Specialty = request.Specialty ?? "General Practice",
                    LicenseNumber = request.LicenseNumber ?? $"LIC-{staffId}",
                    DepartmentId = request.DepartmentId,
                    DigitalSignatureHash = $"SIG-{staffId}-DIGITAL"
                });
            }
            else if (request.RoleCode == 30)
            {
                _context.NurseDetails.Add(new NurseDetail
                {
                    StaffId = staff.Id,
                    LicenseNumber = request.LicenseNumber ?? $"NUR-{staffId}",
                    DepartmentId = request.DepartmentId,
                    ShiftType = request.ShiftType ?? "Day"
                });
            }

            await _context.SaveChangesAsync();

            var currentStaffId = User.FindFirst("staff_id")?.Value ?? "SYSTEM";
            var currentStaffName = User.Identity?.Name ?? "Admin";

            await _auditService.LogAsync(
                currentStaffId,
                currentStaffName,
                "Admin",
                "CREATE_STAFF",
                "Staff",
                staff.StaffId,
                $"Created new {roleName} with 6-digit ID {staffId}"
            );

            return CreatedAtAction(nameof(GetAllStaff), new { id = staff.Id }, new
            {
                staff.Id,
                staff.StaffId,
                staff.Role,
                staff.RoleCode,
                staff.FirstName,
                staff.LastName,
                staff.Email
            });
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> ToggleStaffStatus(Guid id, [FromBody] bool isActive)
        {
            var staff = await _context.Staff.FindAsync(id);
            if (staff == null) return NotFound(new { message = "Staff member not found." });

            staff.IsActive = isActive;
            await _context.SaveChangesAsync();

            var currentStaffId = User.FindFirst("staff_id")?.Value ?? "SYSTEM";
            var currentStaffName = User.Identity?.Name ?? "Admin";

            await _auditService.LogAsync(
                currentStaffId,
                currentStaffName,
                "Admin",
                "TOGGLE_STAFF_STATUS",
                "Staff",
                staff.StaffId,
                $"Changed status of {staff.StaffId} to IsActive={isActive}"
            );

            return Ok(new { message = "Status updated successfully.", isActive = staff.IsActive });
        }
    }
}
