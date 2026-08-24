using System;
using System.ComponentModel.DataAnnotations;

namespace HospitalManagmentSystem.Models
{
    public class Department
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(20)]
        public string Code { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Location { get; set; } = string.Empty;
    }
}
