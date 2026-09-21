using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HospitalManagmentSystem.Models
{
    public class Staff
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(6)]
        public string StaffId { get; set; } = string.Empty; // Fixed 6-character zero-padded (e.g. 200047)

        public int RoleCode { get; set; } // 10=Admin, 20=Doctor, 30=Nurse, 40=Pharmacist, 50=LabTech, 60=Receptionist

        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = string.Empty; // Admin, Doctor, Nurse, etc.

        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(20)]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public AdminDetail? AdminDetail { get; set; }
        public DoctorDetail? DoctorDetail { get; set; }
        public NurseDetail? NurseDetail { get; set; }
        public PharmacistDetail? PharmacistDetail { get; set; }
    }

    public class StaffRoleSequence
    {
        [Key]
        public int RoleCode { get; set; } // Primary Key (10, 20, 30, etc.)

        public int LastSequenceNumber { get; set; } = 0; // Incremented for each registration
    }
}
