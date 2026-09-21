using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HospitalManagmentSystem.Models
{
    public class Medication
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Strength { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Form { get; set; } = "Tablet";

        [MaxLength(30)]
        public string Unit { get; set; } = "units";

        public int QuantityOnHand { get; set; }

        public int ReorderLevel { get; set; } = 20;

        [MaxLength(80)]
        public string Category { get; set; } = "General";

        public bool IsActive { get; set; } = true;
    }

    public class MedicationRequest
    {
        [Key]
        public int Id { get; set; }

        public int PrescriptionId { get; set; }
        [ForeignKey("PrescriptionId")]
        public Prescription? Prescription { get; set; }

        public int MedicationId { get; set; }
        [ForeignKey("MedicationId")]
        public Medication? Medication { get; set; }

        public int PatientId { get; set; }
        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid DoctorId { get; set; }
        [ForeignKey("DoctorId")]
        public Staff? Doctor { get; set; }

        public int QuantityRequested { get; set; } = 1;

        [MaxLength(30)]
        public string Status { get; set; } = "Pending"; // Pending, Verified, ReleasedToNurse, Rejected

        public Guid? VerifiedByPharmacistId { get; set; }
        [ForeignKey("VerifiedByPharmacistId")]
        public Staff? VerifiedByPharmacist { get; set; }

        public DateTime? VerifiedAt { get; set; }

        public Guid? ReleasedByPharmacistId { get; set; }
        [ForeignKey("ReleasedByPharmacistId")]
        public Staff? ReleasedByPharmacist { get; set; }

        public DateTime? ReleasedAt { get; set; }

        public Guid? ReceivingNurseId { get; set; }
        [ForeignKey("ReceivingNurseId")]
        public Staff? ReceivingNurse { get; set; }

        public string Notes { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
