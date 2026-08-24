using System.Linq;
using System.Threading.Tasks;
using HospitalManagmentSystem.DBContext;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagmentSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DoctorsController : ControllerBase
    {
        private readonly HospitalDbContext _context;

        public DoctorsController(HospitalDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetDoctors()
        {
            var doctors = await _context.Staff
                .Include(s => s.DoctorDetail)
                .ThenInclude(d => d!.Department)
                .Where(s => s.RoleCode == 20 && s.IsActive)
                .Select(s => new
                {
                    s.Id,
                    s.StaffId,
                    s.FirstName,
                    s.LastName,
                    s.Email,
                    s.PhoneNumber,
                    Specialty = s.DoctorDetail != null ? s.DoctorDetail.Specialty : "General",
                    LicenseNumber = s.DoctorDetail != null ? s.DoctorDetail.LicenseNumber : "",
                    DepartmentName = s.DoctorDetail != null && s.DoctorDetail.Department != null ? s.DoctorDetail.Department.Name : "Unassigned"
                })
                .ToListAsync();

            return Ok(doctors);
        }
    }
}
