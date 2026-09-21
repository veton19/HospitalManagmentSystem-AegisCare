using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HospitalManagmentSystem.Models
{
    public class Patient
    {
        [Key]
        public int Id { get; set; }

        [MaxLength(20)]
        public string MRN { get; set; } = string.Empty; // Medical Record Number (e.g. MRN-100234)

        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        public DateTime DateOfBirth { get; set; }

        [MaxLength(15)]
        public string Gender { get; set; } = string.Empty;

        [MaxLength(5)]
        public string BloodType { get; set; } = "O+";

        public string Allergies { get; set; } = "None known";

        [MaxLength(100)]
        public string EmergencyContactName { get; set; } = string.Empty;

        [MaxLength(20)]
        public string EmergencyContactPhone { get; set; } = string.Empty;

        [MaxLength(20)]
        public string ContactNumber { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Guid? PrimaryDoctorId { get; set; }
        [ForeignKey("PrimaryDoctorId")]
        public Staff? PrimaryDoctor { get; set; }

        public Guid? PrimaryNurseId { get; set; }
        [ForeignKey("PrimaryNurseId")]
        public Staff? PrimaryNurse { get; set; }
    }
}
