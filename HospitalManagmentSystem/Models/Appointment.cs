using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HospitalManagmentSystem.Models
{
    public class Appointment
    {
        [Key]
        public int Id { get; set; }

        public int PatientId { get; set; }

        [ForeignKey("PatientId")]
        public Patient? Patient { get; set; }

        public Guid DoctorId { get; set; }

        [ForeignKey("DoctorId")]
        public Staff? Doctor { get; set; }

        public DateTime AppointmentDateTime { get; set; }

        [MaxLength(30)]
        public string Status { get; set; } = "Scheduled"; // Scheduled, Completed, Cancelled, NoShow

        public string Reason { get; set; } = string.Empty;

        public string Notes { get; set; } = string.Empty;
    }
}
