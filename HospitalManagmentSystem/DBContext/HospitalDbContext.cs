using HospitalManagmentSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagmentSystem.DBContext
{
    public class HospitalDbContext : DbContext
    {
        public HospitalDbContext(DbContextOptions<HospitalDbContext> options) : base(options) { }

        public DbSet<Staff> Staff { get; set; }
        public DbSet<StaffRoleSequence> StaffRoleSequences { get; set; }
        public DbSet<AdminDetail> AdminDetails { get; set; }
        public DbSet<DoctorDetail> DoctorDetails { get; set; }
        public DbSet<NurseDetail> NurseDetails { get; set; }
        public DbSet<PharmacistDetail> PharmacistDetails { get; set; }

        public DbSet<Patient> Patients { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<Appointment> Appointments { get; set; }
        public DbSet<Encounter> Encounters { get; set; }
        public DbSet<ClinicalNote> ClinicalNotes { get; set; }
        public DbSet<Prescription> Prescriptions { get; set; }
        public DbSet<LabOrder> LabOrders { get; set; }
        public DbSet<LabResult> LabResults { get; set; }
        public DbSet<Vital> Vitals { get; set; }
        public DbSet<Admission> Admissions { get; set; }
        public DbSet<Referral> Referrals { get; set; }
        public DbSet<CarePlanTask> CarePlanTasks { get; set; }
        public DbSet<MedicationAdministrationRecord> MedicationAdministrationRecords { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Medication> Medications { get; set; }
        public DbSet<MedicationRequest> MedicationRequests { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Staff & 6-digit StaffId configuration
            modelBuilder.Entity<Staff>()
                .HasIndex(s => s.StaffId)
                .IsUnique();

            modelBuilder.Entity<Patient>()
                .HasIndex(p => p.MRN)
                .IsUnique();

            modelBuilder.Entity<Patient>()
                .HasOne(p => p.PrimaryDoctor)
                .WithMany()
                .HasForeignKey(p => p.PrimaryDoctorId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Patient>()
                .HasOne(p => p.PrimaryNurse)
                .WithMany()
                .HasForeignKey(p => p.PrimaryNurseId)
                .OnDelete(DeleteBehavior.SetNull);

            // 1:1 relationships with Staff
            modelBuilder.Entity<Staff>()
                .HasOne(s => s.AdminDetail)
                .WithOne(a => a.Staff)
                .HasForeignKey<AdminDetail>(a => a.StaffId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Staff>()
                .HasOne(s => s.DoctorDetail)
                .WithOne(d => d.Staff)
                .HasForeignKey<DoctorDetail>(d => d.StaffId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Staff>()
                .HasOne(s => s.NurseDetail)
                .WithOne(n => n.Staff)
                .HasForeignKey<NurseDetail>(n => n.StaffId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Staff>()
                .HasOne(s => s.PharmacistDetail)
                .WithOne(p => p.Staff)
                .HasForeignKey<PharmacistDetail>(p => p.StaffId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Medication>()
                .HasIndex(m => m.Name)
                .IsUnique();

            modelBuilder.Entity<MedicationRequest>()
                .HasOne(r => r.Doctor)
                .WithMany()
                .HasForeignKey(r => r.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<MedicationRequest>()
                .HasOne(r => r.VerifiedByPharmacist)
                .WithMany()
                .HasForeignKey(r => r.VerifiedByPharmacistId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<MedicationRequest>()
                .HasOne(r => r.ReleasedByPharmacist)
                .WithMany()
                .HasForeignKey(r => r.ReleasedByPharmacistId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<MedicationRequest>()
                .HasOne(r => r.ReceivingNurse)
                .WithMany()
                .HasForeignKey(r => r.ReceivingNurseId)
                .OnDelete(DeleteBehavior.Restrict);

            // Seed role sequence initial defaults (10=Admin, 20=Doctor, 30=Nurse, 40=Pharmacist, 50=LabTech, 60=Receptionist)
            modelBuilder.Entity<StaffRoleSequence>().HasData(
                new StaffRoleSequence { RoleCode = 10, LastSequenceNumber = 0 },
                new StaffRoleSequence { RoleCode = 20, LastSequenceNumber = 0 },
                new StaffRoleSequence { RoleCode = 30, LastSequenceNumber = 0 },
                new StaffRoleSequence { RoleCode = 40, LastSequenceNumber = 0 },
                new StaffRoleSequence { RoleCode = 50, LastSequenceNumber = 0 },
                new StaffRoleSequence { RoleCode = 60, LastSequenceNumber = 0 }
            );
        }
    }
}
