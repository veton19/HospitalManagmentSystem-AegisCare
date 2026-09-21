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
    [Authorize]
    public class PharmacyController : ControllerBase
    {
        private readonly HospitalDbContext _context;
        private readonly IAuditService _auditService;

        public PharmacyController(HospitalDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        [HttpGet("stats")]
        [Authorize(Roles = "Pharmacist,Admin")]
        public async Task<IActionResult> GetStats()
        {
            var pendingCount = await _context.MedicationRequests.CountAsync(r => r.Status == "Pending");
            var verifiedCount = await _context.MedicationRequests.CountAsync(r => r.Status == "Verified");
            var releasedToday = await _context.MedicationRequests.CountAsync(r =>
                r.Status == "ReleasedToNurse" && r.ReleasedAt >= DateTime.UtcNow.Date);
            var totalMeds = await _context.Medications.CountAsync(m => m.IsActive);
            var lowStockCount = await _context.Medications.CountAsync(m => m.IsActive && m.QuantityOnHand <= m.ReorderLevel);
            var outOfStockCount = await _context.Medications.CountAsync(m => m.IsActive && m.QuantityOnHand == 0);

            return Ok(new
            {
                pendingCount,
                verifiedCount,
                releasedToday,
                totalMeds,
                lowStockCount,
                outOfStockCount
            });
        }

        [HttpGet("medications")]
        [Authorize(Roles = "Pharmacist,Doctor,Nurse,Admin")]
        public async Task<IActionResult> GetMedications([FromQuery] string? search, [FromQuery] string? category)
        {
            var query = _context.Medications.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(m => m.Name.ToLower().Contains(search.ToLower()) ||
                                         m.Strength.ToLower().Contains(search.ToLower()));

            if (!string.IsNullOrWhiteSpace(category) && category != "All")
                query = query.Where(m => m.Category == category);

            var meds = await query
                .OrderBy(m => m.Name)
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Strength,
                    m.Form,
                    m.Unit,
                    m.QuantityOnHand,
                    m.ReorderLevel,
                    m.Category,
                    m.IsActive,
                    isLowStock = m.QuantityOnHand <= m.ReorderLevel && m.QuantityOnHand > 0,
                    isOutOfStock = m.QuantityOnHand == 0
                })
                .ToListAsync();

            return Ok(meds);
        }

        [HttpGet("medications/low-stock")]
        [Authorize(Roles = "Pharmacist,Admin")]
        public async Task<IActionResult> GetLowStock()
        {
            var meds = await _context.Medications
                .Where(m => m.IsActive && m.QuantityOnHand <= m.ReorderLevel)
                .OrderBy(m => m.QuantityOnHand)
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Strength,
                    m.Form,
                    m.Unit,
                    m.QuantityOnHand,
                    m.ReorderLevel,
                    m.Category,
                    isOutOfStock = m.QuantityOnHand == 0
                })
                .ToListAsync();

            return Ok(meds);
        }

        [HttpGet("pharmacists")]
        [Authorize(Roles = "Pharmacist,Admin")]
        public async Task<IActionResult> GetPharmacists()
        {
            var pharmacists = await _context.Staff
                .Include(s => s.PharmacistDetail)
                .Where(s => s.RoleCode == 40 && s.IsActive)
                .OrderBy(s => s.LastName)
                .Select(s => new
                {
                    s.Id,
                    s.StaffId,
                    s.FirstName,
                    s.LastName,
                    ShiftType = s.PharmacistDetail != null ? s.PharmacistDetail.ShiftType : "Day",
                    LicenseNumber = s.PharmacistDetail != null ? s.PharmacistDetail.LicenseNumber : string.Empty
                })
                .ToListAsync();

            return Ok(pharmacists);
        }

        [HttpGet("stock")]
        [Authorize(Roles = "Pharmacist,Doctor,Admin")]
        public async Task<IActionResult> CheckStock([FromQuery] string drugName, [FromQuery] int quantity = 1)
        {
            if (string.IsNullOrWhiteSpace(drugName))
                return BadRequest(new { message = "Drug name is required." });

            var med = await FindMedicationAsync(drugName);
            if (med == null || !med.IsActive)
            {
                return Ok(new
                {
                    inStock = false,
                    available = 0,
                    requested = quantity,
                    message = $"'{drugName}' is not in the pharmacy formulary."
                });
            }

            bool enough = med.QuantityOnHand >= quantity;
            return Ok(new
            {
                inStock = enough,
                medicationId = med.Id,
                name = med.Name,
                available = med.QuantityOnHand,
                requested = quantity,
                unit = med.Unit,
                message = enough
                    ? $"{med.Name} is in stock ({med.QuantityOnHand} {med.Unit} remaining)."
                    : $"Insufficient stock for {med.Name}. Only {med.QuantityOnHand} {med.Unit} left; {quantity} requested."
            });
        }

        public class RestockRequest
        {
            public string Name { get; set; } = string.Empty;
            public string Strength { get; set; } = string.Empty;
            public string Form { get; set; } = "Tablet";
            public string Unit { get; set; } = "units";
            public int QuantityOnHand { get; set; }
            public int ReorderLevel { get; set; } = 20;
            public string Category { get; set; } = "General";
            public int? AddQuantity { get; set; }
        }

        [HttpPost("medications")]
        [Authorize(Roles = "Pharmacist,Admin")]
        public async Task<IActionResult> UpsertMedication([FromBody] RestockRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "Medication name is required." });

            var med = await FindMedicationAsync(request.Name);
            if (med == null)
            {
                med = new Medication
                {
                    Name = request.Name.Trim(),
                    Strength = request.Strength,
                    Form = request.Form,
                    Unit = request.Unit,
                    QuantityOnHand = request.QuantityOnHand,
                    ReorderLevel = request.ReorderLevel,
                    Category = request.Category,
                    IsActive = true
                };
                _context.Medications.Add(med);
            }
            else
            {
                if (!string.IsNullOrWhiteSpace(request.Strength)) med.Strength = request.Strength;
                if (!string.IsNullOrWhiteSpace(request.Form)) med.Form = request.Form;
                if (!string.IsNullOrWhiteSpace(request.Unit)) med.Unit = request.Unit;
                if (!string.IsNullOrWhiteSpace(request.Category)) med.Category = request.Category;
                if (request.ReorderLevel > 0) med.ReorderLevel = request.ReorderLevel;
                if (request.AddQuantity.HasValue)
                    med.QuantityOnHand += request.AddQuantity.Value;
                else if (request.QuantityOnHand > 0)
                    med.QuantityOnHand = request.QuantityOnHand;
                med.IsActive = true;
            }

            await _context.SaveChangesAsync();
            return Ok(med);
        }

        public class UpdateMedicationRequest
        {
            public string? Strength { get; set; }
            public string? Form { get; set; }
            public string? Unit { get; set; }
            public string? Category { get; set; }
            public int? ReorderLevel { get; set; }
            public bool? IsActive { get; set; }
        }

        [HttpPut("medications/{id:int}")]
        [Authorize(Roles = "Pharmacist,Admin")]
        public async Task<IActionResult> UpdateMedication(int id, [FromBody] UpdateMedicationRequest request)
        {
            var med = await _context.Medications.FindAsync(id);
            if (med == null) return NotFound(new { message = "Medication not found." });

            if (!string.IsNullOrWhiteSpace(request.Strength)) med.Strength = request.Strength;
            if (!string.IsNullOrWhiteSpace(request.Form)) med.Form = request.Form;
            if (!string.IsNullOrWhiteSpace(request.Unit)) med.Unit = request.Unit;
            if (!string.IsNullOrWhiteSpace(request.Category)) med.Category = request.Category;
            if (request.ReorderLevel.HasValue && request.ReorderLevel.Value >= 0)
                med.ReorderLevel = request.ReorderLevel.Value;
            if (request.IsActive.HasValue) med.IsActive = request.IsActive.Value;

            await _context.SaveChangesAsync();
            await LogPharmacy("UPDATE_MEDICATION", id.ToString(),
                $"Updated medication '{med.Name}' — IsActive={med.IsActive}, ReorderLevel={med.ReorderLevel}");

            return Ok(new
            {
                med.Id,
                med.Name,
                med.Strength,
                med.Form,
                med.Unit,
                med.QuantityOnHand,
                med.ReorderLevel,
                med.Category,
                med.IsActive
            });
        }

        [HttpGet("requests")]
        [Authorize(Roles = "Pharmacist,Doctor,Admin")]
        public async Task<IActionResult> GetRequests([FromQuery] string? status)
        {
            var query = _context.MedicationRequests
                .Include(r => r.Patient)
                .Include(r => r.Doctor)
                .Include(r => r.Medication)
                .Include(r => r.Prescription)
                .Include(r => r.VerifiedByPharmacist)
                .Include(r => r.ReleasedByPharmacist)
                .Include(r => r.ReceivingNurse)
                .AsQueryable();

            if (User.IsInRole("Doctor") && !User.IsInRole("Admin"))
            {
                var doctorId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(doctorId, out var doctorGuid))
                    query = query.Where(r => r.DoctorId == doctorGuid);
            }

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(r => r.Status == status);

            var list = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
            return Ok(list.Select(MapRequest));
        }

        [HttpGet("nurses")]
        [Authorize(Roles = "Pharmacist,Admin")]
        public async Task<IActionResult> GetNurses()
        {
            var nurses = await _context.Staff
                .Include(s => s.NurseDetail)
                .Where(s => s.RoleCode == 30 && s.IsActive)
                .OrderBy(s => s.LastName)
                .Select(s => new
                {
                    s.Id,
                    s.StaffId,
                    s.FirstName,
                    s.LastName,
                    ShiftType = s.NurseDetail != null ? s.NurseDetail.ShiftType : "Day"
                })
                .ToListAsync();

            return Ok(nurses);
        }

        public class ReleaseToNurseRequest
        {
            public Guid ReceivingNurseId { get; set; }
            public string? Notes { get; set; }
        }

        [HttpPost("requests/{id}/verify")]
        [Authorize(Roles = "Pharmacist,Admin")]
        public async Task<IActionResult> VerifyRequest(int id)
        {
            var request = await _context.MedicationRequests
                .Include(r => r.Medication)
                .Include(r => r.Prescription)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null) return NotFound(new { message = "Medication request not found." });
            if (request.Status != "Pending")
                return BadRequest(new { message = $"Request is already {request.Status}." });

            var med = request.Medication;
            if (med == null || med.QuantityOnHand < request.QuantityRequested)
            {
                return BadRequest(new
                {
                    message = med == null
                        ? "Medication is no longer in the formulary."
                        : $"Not enough stock. {med.QuantityOnHand} remaining, {request.QuantityRequested} requested."
                });
            }

            var pharmacistId = GetCurrentStaffGuid();
            med.QuantityOnHand -= request.QuantityRequested;
            request.Status = "Verified";
            request.VerifiedByPharmacistId = pharmacistId;
            request.VerifiedAt = DateTime.UtcNow;
            if (request.Prescription != null)
                request.Prescription.PharmacyStatus = "Verified";

            await _context.SaveChangesAsync();
            await LogPharmacy("VERIFY_MEDICATION_REQUEST", request.Id.ToString(),
                $"Verified request #{request.Id} and reserved {request.QuantityRequested} of {med.Name}");

            return Ok(await ReloadRequest(id));
        }

        [HttpPost("requests/{id}/release-to-nurse")]
        [Authorize(Roles = "Pharmacist,Admin")]
        public async Task<IActionResult> ReleaseToNurse(int id, [FromBody] ReleaseToNurseRequest body)
        {
            var request = await _context.MedicationRequests
                .Include(r => r.Prescription)
                .Include(r => r.Patient)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null) return NotFound(new { message = "Medication request not found." });
            if (request.Status != "Verified")
                return BadRequest(new { message = "First approval (verify stock) must be completed before handing medication to a nurse." });

            var nurse = await _context.Staff.FirstOrDefaultAsync(s => s.Id == body.ReceivingNurseId && s.RoleCode == 30 && s.IsActive);
            if (nurse == null)
                return BadRequest(new { message = "Select a valid nurse to receive the medication." });

            request.Status = "ReleasedToNurse";
            request.ReleasedByPharmacistId = GetCurrentStaffGuid();
            request.ReleasedAt = DateTime.UtcNow;
            request.ReceivingNurseId = nurse.Id;
            if (!string.IsNullOrWhiteSpace(body.Notes)) request.Notes = body.Notes;
            if (request.Prescription != null)
                request.Prescription.PharmacyStatus = "ReleasedToNurse";

            _context.Notifications.Add(new Notification
            {
                RecipientStaffId = nurse.StaffId,
                Title = "Medication ready for administration",
                Message = $"{request.Prescription?.DrugName} for {request.Patient?.FirstName} {request.Patient?.LastName} has been released from pharmacy.",
                Type = "OrderAction"
            });

            await _context.SaveChangesAsync();
            await LogPharmacy("RELEASE_MEDICATION_TO_NURSE", request.Id.ToString(),
                $"Released request #{request.Id} to Nurse {nurse.FirstName} {nurse.LastName} ({nurse.StaffId})");

            return Ok(await ReloadRequest(id));
        }

        [HttpPost("requests/{id}/reject")]
        [Authorize(Roles = "Pharmacist,Admin")]
        public async Task<IActionResult> RejectRequest(int id, [FromBody] ReleaseToNurseRequest? body)
        {
            var request = await _context.MedicationRequests
                .Include(r => r.Prescription)
                .Include(r => r.Medication)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null) return NotFound(new { message = "Medication request not found." });
            if (request.Status == "ReleasedToNurse")
                return BadRequest(new { message = "Cannot reject a request already given to a nurse." });

            if (request.Status == "Verified" && request.Medication != null)
                request.Medication.QuantityOnHand += request.QuantityRequested;

            request.Status = "Rejected";
            request.Notes = body?.Notes ?? "Rejected by pharmacy";
            if (request.Prescription != null)
            {
                request.Prescription.PharmacyStatus = "Rejected";
                request.Prescription.Status = "Discontinued";
            }

            await _context.SaveChangesAsync();
            await LogPharmacy("REJECT_MEDICATION_REQUEST", request.Id.ToString(), request.Notes);
            return Ok(await ReloadRequest(id));
        }

        private async Task<Medication?> FindMedicationAsync(string drugName)
        {
            var name = drugName.Trim();
            var exact = await _context.Medications
                .FirstOrDefaultAsync(m => m.Name.ToLower() == name.ToLower());
            if (exact != null) return exact;

            return await _context.Medications
                .FirstOrDefaultAsync(m => m.Name.ToLower().Contains(name.ToLower()) || name.ToLower().Contains(m.Name.ToLower()));
        }

        private Guid? GetCurrentStaffGuid()
        {
            var raw = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(raw, out var id) ? id : null;
        }

        private async Task LogPharmacy(string action, string entityId, string details)
        {
            var staffId = User.FindFirst("staff_id")?.Value ?? "SYSTEM";
            var name = User.Identity?.Name ?? "Pharmacist";
            await _auditService.LogAsync(staffId, name, "Pharmacist", action, "MedicationRequest", entityId, details);
        }

        private async Task<object> ReloadRequest(int id)
        {
            var request = await _context.MedicationRequests
                .Include(r => r.Patient)
                .Include(r => r.Doctor)
                .Include(r => r.Medication)
                .Include(r => r.Prescription)
                .Include(r => r.VerifiedByPharmacist)
                .Include(r => r.ReleasedByPharmacist)
                .Include(r => r.ReceivingNurse)
                .FirstAsync(r => r.Id == id);
            return MapRequest(request);
        }

        private static object MapRequest(MedicationRequest r)
        {
            return new
            {
                r.Id,
                r.PrescriptionId,
                r.MedicationId,
                r.PatientId,
                r.DoctorId,
                r.QuantityRequested,
                r.Status,
                r.Notes,
                r.CreatedAt,
                r.VerifiedAt,
                r.ReleasedAt,
                drugName = r.Prescription?.DrugName ?? r.Medication?.Name,
                dosage = r.Prescription?.Dosage,
                frequency = r.Prescription?.Frequency,
                duration = r.Prescription?.Duration,
                remainingStock = r.Medication?.QuantityOnHand,
                unit = r.Medication?.Unit,
                patient = r.Patient == null ? null : new { r.Patient.Id, r.Patient.FirstName, r.Patient.LastName, r.Patient.MRN },
                doctor = r.Doctor == null ? null : new { r.Doctor.Id, r.Doctor.StaffId, r.Doctor.FirstName, r.Doctor.LastName },
                verifiedBy = r.VerifiedByPharmacist == null ? null : new { r.VerifiedByPharmacist.StaffId, r.VerifiedByPharmacist.FirstName, r.VerifiedByPharmacist.LastName },
                releasedBy = r.ReleasedByPharmacist == null ? null : new { r.ReleasedByPharmacist.StaffId, r.ReleasedByPharmacist.FirstName, r.ReleasedByPharmacist.LastName },
                receivingNurse = r.ReceivingNurse == null ? null : new { r.ReceivingNurse.Id, r.ReceivingNurse.StaffId, r.ReceivingNurse.FirstName, r.ReceivingNurse.LastName }
            };
        }
    }
}
