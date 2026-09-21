using System;
using System.Collections.Concurrent;
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
    public class AuthController : ControllerBase
    {
        private readonly HospitalDbContext _context;
        private readonly IJwtTokenService _tokenService;
        private readonly IAuditService _auditService;

        // In-memory rate limiting tracker (Attempts per staff ID within timeframe)
        private static readonly ConcurrentDictionary<string, (int Attempts, DateTime LastAttempt)> _loginAttempts = new();

        public AuthController(HospitalDbContext context, IJwtTokenService tokenService, IAuditService auditService)
        {
            _context = context;
            _tokenService = tokenService;
            _auditService = auditService;
        }

        public class LoginRequest
        {
            public string StaffId { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.StaffId) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Staff ID and password are required." });
            }

            var cleanStaffId = request.StaffId.Trim();

            // Rate-limiting check: max 5 failed attempts per 5 minutes per StaffId
            if (_loginAttempts.TryGetValue(cleanStaffId, out var tracker))
            {
                if (tracker.Attempts >= 5 && tracker.LastAttempt.AddMinutes(5) > DateTime.UtcNow)
                {
                    await _auditService.LogAsync(cleanStaffId, "UNKNOWN", "UNKNOWN", "LOGIN_RATE_LIMITED", "Auth", cleanStaffId, "Excessive failed login attempts blocked.");
                    return StatusCode(429, new { message = "Too many failed login attempts for this Staff ID. Please wait 5 minutes." });
                }

                if (tracker.LastAttempt.AddMinutes(5) <= DateTime.UtcNow)
                {
                    _loginAttempts.TryRemove(cleanStaffId, out _);
                }
            }

            var staff = await _context.Staff
                .Include(s => s.DoctorDetail)
                .Include(s => s.NurseDetail)
                .Include(s => s.PharmacistDetail)
                .Include(s => s.AdminDetail)
                .FirstOrDefaultAsync(s => s.StaffId == cleanStaffId);

            if (staff == null || !staff.IsActive || !BCrypt.Net.BCrypt.Verify(request.Password, staff.PasswordHash))
            {
                // Record failed attempt
                _loginAttempts.AddOrUpdate(cleanStaffId, 
                    (1, DateTime.UtcNow), 
                    (key, old) => (old.Attempts + 1, DateTime.UtcNow));

                await _auditService.LogAsync(cleanStaffId, "UNKNOWN", "UNKNOWN", "LOGIN_FAILED", "Auth", cleanStaffId, "Invalid Staff ID or password.");
                return Unauthorized(new { message = "Invalid Staff ID or password." });
            }

            // Reset rate limiter on successful login
            _loginAttempts.TryRemove(cleanStaffId, out _);

            var token = _tokenService.GenerateToken(staff);

            await _auditService.LogAsync(
                staff.StaffId, 
                $"{staff.FirstName} {staff.LastName}", 
                staff.Role, 
                "LOGIN_SUCCESS", 
                "Staff", 
                staff.Id.ToString(), 
                $"Staff member logged in successfully as {staff.Role}"
            );

            return Ok(new
            {
                token,
                staff = new
                {
                    id = staff.Id,
                    staffId = staff.StaffId,
                    role = staff.Role,
                    roleCode = staff.RoleCode,
                    firstName = staff.FirstName,
                    lastName = staff.LastName,
                    email = staff.Email,
                    specialty = staff.DoctorDetail?.Specialty,
                    departmentId = staff.DoctorDetail?.DepartmentId ?? staff.NurseDetail?.DepartmentId ?? staff.PharmacistDetail?.DepartmentId,
                    shiftType = staff.NurseDetail?.ShiftType ?? staff.PharmacistDetail?.ShiftType,
                    licenseNumber = staff.DoctorDetail?.LicenseNumber ?? staff.NurseDetail?.LicenseNumber ?? staff.PharmacistDetail?.LicenseNumber
                }
            });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var staffIdClaim = User.FindFirst("staff_id")?.Value;
            if (string.IsNullOrEmpty(staffIdClaim))
            {
                return Unauthorized(new { message = "Invalid token claims." });
            }

            var staff = await _context.Staff
                .Include(s => s.DoctorDetail)
                .Include(s => s.NurseDetail)
                .Include(s => s.PharmacistDetail)
                .Include(s => s.AdminDetail)
                .FirstOrDefaultAsync(s => s.StaffId == staffIdClaim);

            if (staff == null || !staff.IsActive)
            {
                return Unauthorized(new { message = "Staff account is inactive or not found." });
            }

            return Ok(new
            {
                id = staff.Id,
                staffId = staff.StaffId,
                role = staff.Role,
                roleCode = staff.RoleCode,
                firstName = staff.FirstName,
                lastName = staff.LastName,
                email = staff.Email,
                phoneNumber = staff.PhoneNumber,
                specialty = staff.DoctorDetail?.Specialty,
                licenseNumber = staff.DoctorDetail?.LicenseNumber ?? staff.NurseDetail?.LicenseNumber ?? staff.PharmacistDetail?.LicenseNumber,
                departmentId = staff.DoctorDetail?.DepartmentId ?? staff.NurseDetail?.DepartmentId ?? staff.PharmacistDetail?.DepartmentId,
                shiftType = staff.NurseDetail?.ShiftType ?? staff.PharmacistDetail?.ShiftType
            });
        }
    }
}
