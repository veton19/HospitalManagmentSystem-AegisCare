using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HospitalManagmentSystem.Models
{
    public class Encounter
    {
        [Key]
        public int Id { get; set; }

        public int PatientId { get; set; }
        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid DoctorId { get; set; }
        [ForeignKey("DoctorId")]
        public Staff? Doctor { get; set; }

        public Guid? NurseId { get; set; }
        [ForeignKey("NurseId")]
        public Staff? Nurse { get; set; }

        public DateTime StartTime { get; set; } = DateTime.UtcNow;
        public DateTime? EndTime { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "InConsultation"; // InConsultation, Completed, Admitted

        public string ReasonForVisit { get; set; } = string.Empty;
    }

    public class ClinicalNote
    {
        [Key]
        public int Id { get; set; }

        public int EncounterId { get; set; }
        [ForeignKey("EncounterId")]
        public Encounter? Encounter { get; set; }

        public int PatientId { get; set; }
        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid DoctorId { get; set; }
        [ForeignKey("DoctorId")]
        public Staff? Doctor { get; set; }

        // SOAP Format
        public string Subjective { get; set; } = string.Empty;
        public string Objective { get; set; } = string.Empty;
        public string Assessment { get; set; } = string.Empty;
        public string Plan { get; set; } = string.Empty;

        public string ICD10Codes { get; set; } = string.Empty;

        public bool IsDigitallySigned { get; set; } = false;
        public DateTime? SignedAt { get; set; }
        public string DigitalSignatureHash { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Prescription
    {
        [Key]
        public int Id { get; set; }

        public int? EncounterId { get; set; }
        [ForeignKey("EncounterId")]
        public Encounter? Encounter { get; set; }

        public int PatientId { get; set; }
        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid DoctorId { get; set; }
        [ForeignKey("DoctorId")]
        public Staff? Doctor { get; set; }

        [Required]
        [MaxLength(150)]
        public string DrugName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Dosage { get; set; } = string.Empty; // e.g. 500mg

        [Required]
        [MaxLength(50)]
        public string Frequency { get; set; } = string.Empty; // e.g. Twice daily

        [Required]
        [MaxLength(50)]
        public string Duration { get; set; } = string.Empty; // e.g. 7 Days

        [MaxLength(30)]
        public string Status { get; set; } = "Active"; // Active, Discontinued, Completed

        public bool InteractionCheckPassed { get; set; } = true;
        public string InteractionAlerts { get; set; } = "None";

        public bool IsDigitallySigned { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class LabOrder
    {
        [Key]
        public int Id { get; set; }

        public int? EncounterId { get; set; }
        [ForeignKey("EncounterId")]
        public Encounter? Encounter { get; set; }

        public int PatientId { get; set; }
        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid DoctorId { get; set; }
        [ForeignKey("DoctorId")]
        public Staff? Doctor { get; set; }

        [Required]
        [MaxLength(150)]
        public string TestName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Category { get; set; } = "Hematology"; // Hematology, Biochemistry, Radiology

        [MaxLength(30)]
        public string Status { get; set; } = "Ordered"; // Ordered, Pending, Completed, Cancelled

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;

        public LabResult? Result { get; set; }
    }

    public class LabResult
    {
        [Key]
        public int Id { get; set; }

        public int LabOrderId { get; set; }
        [ForeignKey("LabOrderId")]
        public LabOrder? LabOrder { get; set; }

        public int PatientId { get; set; }
        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        [Required]
        [MaxLength(150)]
        public string TestName { get; set; } = string.Empty;

        public string Value { get; set; } = string.Empty; // e.g. "14.2" or "145"
        public string Unit { get; set; } = string.Empty; // e.g. "g/dL" or "mmol/L"
        public string ReferenceRange { get; set; } = string.Empty; // e.g. "12.0 - 16.0"

        public bool IsAbnormal { get; set; } = false;
        public bool IsCritical { get; set; } = false;

        public DateTime ResultDate { get; set; } = DateTime.UtcNow;
        public string Notes { get; set; } = string.Empty;
    }

    public class Vital
    {
        [Key]
        public int Id { get; set; }

        public int? EncounterId { get; set; }
        [ForeignKey("EncounterId")]
        public Encounter? Encounter { get; set; }

        public int PatientId { get; set; }
        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid NurseId { get; set; }
        [ForeignKey("NurseId")]
        public Staff? Nurse { get; set; }

        public int BloodPressureSystolic { get; set; } // mmHg
        public int BloodPressureDiastolic { get; set; } // mmHg
        public int HeartRate { get; set; } // bpm
        public double Temperature { get; set; } // °C
        public int SpO2 { get; set; } // %

        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    }

    public class Admission
    {
        [Key]
        public int Id { get; set; }

        public int PatientId { get; set; }
        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid AttendingDoctorId { get; set; }
        [ForeignKey("AttendingDoctorId")]
        public Staff? AttendingDoctor { get; set; }

        [Required]
        [MaxLength(100)]
        public string Ward { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string BedNumber { get; set; } = string.Empty;

        public DateTime AdmitDate { get; set; } = DateTime.UtcNow;
        public DateTime? DischargeDate { get; set; }

        [MaxLength(30)]
        public string Status { get; set; } = "Admitted"; // Admitted, Discharged, Transferred

        public string AdmissionNotes { get; set; } = string.Empty;
        public string DischargeSummary { get; set; } = string.Empty;
    }

    public class Referral
    {
        [Key]
        public int Id { get; set; }

        public int PatientId { get; set; }
        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid ReferringDoctorId { get; set; }
        [ForeignKey("ReferringDoctorId")]
        public Staff? ReferringDoctor { get; set; }

        public Guid? ReferredToDoctorId { get; set; }
        [ForeignKey("ReferredToDoctorId")]
        public Staff? ReferredToDoctor { get; set; }

        public int TargetDepartmentId { get; set; }
        [ForeignKey("TargetDepartmentId")]
        public Department? TargetDepartment { get; set; }

        public string Reason { get; set; } = string.Empty;

        [MaxLength(30)]
        public string Status { get; set; } = "Pending"; // Pending, Accepted, Completed

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class CarePlanTask
    {
        [Key]
        public int Id { get; set; }

        public int PatientId { get; set; }
        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid AssignedNurseId { get; set; }
        [ForeignKey("AssignedNurseId")]
        public Staff? AssignedNurse { get; set; }

        public string TaskDescription { get; set; } = string.Empty;
        public DateTime DueDate { get; set; } = DateTime.UtcNow;
        public bool IsCompleted { get; set; } = false;
        public DateTime? CompletedAt { get; set; }
    }

    public class MedicationAdministrationRecord
    {
        [Key]
        public int Id { get; set; }

        public int PrescriptionId { get; set; }
        [ForeignKey("PrescriptionId")]
        public Prescription? Prescription { get; set; }

        public int PatientId { get; set; }
        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid NurseId { get; set; }
        [ForeignKey("NurseId")]
        public Staff? Nurse { get; set; }

        public DateTime AdministeredAt { get; set; } = DateTime.UtcNow;
        public string DosageGiven { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }

    public class AuditLog
    {
        [Key]
        public int Id { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public string StaffId { get; set; } = string.Empty; // Fixed 6-digit staff ID
        public string StaffName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty; // e.g. LOGIN, VIEW_PATIENT_CHART, CREATE_PRESCRIPTION
        public string EntityName { get; set; } = string.Empty;
        public string EntityId { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
    }

    public class Notification
    {
        [Key]
        public int Id { get; set; }

        public string RecipientStaffId { get; set; } = string.Empty; // StaffId string
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = "Info"; // CriticalLab, Deterioration, NewAdmission, OrderAction
        public bool IsRead { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
