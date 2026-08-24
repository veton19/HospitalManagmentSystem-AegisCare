using System.ComponentModel.DataAnnotations;

namespace HospitalManagmentSystem.DTOs
{ 
        public class PatientDTO
        {
            public int Id { get; set; }
            public string FirstName { get; set; } = string.Empty;
            public string LastName { get; set; } = string.Empty;
            public DateTime DateOfBirth { get; set; }
            public string Gender { get; set; } = string.Empty;
            public string ContactNumber { get; set; } = string.Empty;
            public string MedicalHistory { get; set; } = string.Empty;
        }

        public class PatientCreateDTO
        {
            [Required]
            [MaxLength(100)]
            public string FirstName { get; set; } = string.Empty;

            [Required]
            [MaxLength(100)]
            public string LastName { get; set; } = string.Empty;

            public DateTime DateOfBirth { get; set; }

            [MaxLength(10)]
            public string Gender { get; set; } = string.Empty;

            [MaxLength(20)]
            public string ContactNumber { get; set; } = string.Empty;

            public string MedicalHistory { get; set; } = string.Empty;
        }
 }
