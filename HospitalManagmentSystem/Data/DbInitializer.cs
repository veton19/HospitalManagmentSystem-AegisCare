using System;
using System.Linq;
using System.Threading.Tasks;
using HospitalManagmentSystem.DBContext;
using HospitalManagmentSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagmentSystem.Data
{
    public static class DbInitializer
    {
        public static async Task SeedAsync(HospitalDbContext context)
        {
            await context.Database.MigrateAsync();

            // Seed Departments if empty
            if (!context.Departments.Any())
            {
                var departments = new[]
                {
                    new Department { Name = "Cardiology", Code = "CARD", Location = "Wing A, Floor 2" },
                    new Department { Name = "Emergency", Code = "EMERG", Location = "Ground Floor" },
                    new Department { Name = "Neurology", Code = "NEURO", Location = "Wing B, Floor 3" },
                    new Department { Name = "Pediatrics", Code = "PED", Location = "Wing C, Floor 1" },
                    new Department { Name = "Orthopedics", Code = "ORTHO", Location = "Wing A, Floor 4" },
                    new Department { Name = "Pharmacy", Code = "PHARM", Location = "Ground Floor, Dispensary" }
                };
                context.Departments.AddRange(departments);
                await context.SaveChangesAsync();
            }

            var cardDept = await context.Departments.FirstAsync(d => d.Code == "CARD");
            var neuroDept = await context.Departments.FirstAsync(d => d.Code == "NEURO");
            var emergDept = await context.Departments.FirstAsync(d => d.Code == "EMERG");
            var pedDept = await context.Departments.FirstAsync(d => d.Code == "PED");
            var orthoDept = await context.Departments.FirstAsync(d => d.Code == "ORTHO");
            var pharmDept = await context.Departments.FirstOrDefaultAsync(d => d.Code == "PHARM");
            if (pharmDept == null)
            {
                pharmDept = new Department { Name = "Pharmacy", Code = "PHARM", Location = "Ground Floor, Dispensary" };
                context.Departments.Add(pharmDept);
                await context.SaveChangesAsync();
            }

            string adminPass = BCrypt.Net.BCrypt.HashPassword("Admin123!");
            string doctorPass = BCrypt.Net.BCrypt.HashPassword("Doctor123!");
            string nursePass = BCrypt.Net.BCrypt.HashPassword("Nurse123!");
            string pharmacistPass = BCrypt.Net.BCrypt.HashPassword("Pharmacist123!");

            // Seed initial Staff (Admin, 2 Doctors, 2 Nurses) if completely empty
            if (!context.Staff.Any())
            {
                // Admin
                var adminStaff = new Staff
                {
                    StaffId = "100001",
                    RoleCode = 10,
                    Role = "Admin",
                    FirstName = "Sarah",
                    LastName = "Connor",
                    Email = "admin@hospital.org",
                    PhoneNumber = "+1-555-0101",
                    PasswordHash = adminPass,
                    IsActive = true
                };
                context.Staff.Add(adminStaff);
                context.AdminDetails.Add(new AdminDetail
                {
                    StaffId = adminStaff.Id,
                    Department = "Administration",
                    PermissionsJson = "[\"SuperAdmin\", \"StaffManager\"]"
                });

                // Doctor 1
                var doc1 = new Staff
                {
                    StaffId = "200001",
                    RoleCode = 20,
                    Role = "Doctor",
                    FirstName = "Alexander",
                    LastName = "Fleming",
                    Email = "fleming@hospital.org",
                    PhoneNumber = "+1-555-0201",
                    PasswordHash = doctorPass,
                    IsActive = true
                };
                context.Staff.Add(doc1);
                context.DoctorDetails.Add(new DoctorDetail
                {
                    StaffId = doc1.Id,
                    Specialty = "Cardiology",
                    LicenseNumber = "DOC-99482",
                    DepartmentId = cardDept.Id,
                    DigitalSignatureHash = "SIG-FL-99482-A7X"
                });

                // Doctor 2
                var doc2 = new Staff
                {
                    StaffId = "200002",
                    RoleCode = 20,
                    Role = "Doctor",
                    FirstName = "Gregory",
                    LastName = "House",
                    Email = "house@hospital.org",
                    PhoneNumber = "+1-555-0202",
                    PasswordHash = doctorPass,
                    IsActive = true
                };
                context.Staff.Add(doc2);
                context.DoctorDetails.Add(new DoctorDetail
                {
                    StaffId = doc2.Id,
                    Specialty = "Neurology",
                    LicenseNumber = "DOC-88120",
                    DepartmentId = neuroDept.Id,
                    DigitalSignatureHash = "SIG-HS-88120-B9Z"
                });

                // Nurse 1
                var nurse1 = new Staff
                {
                    StaffId = "300001",
                    RoleCode = 30,
                    Role = "Nurse",
                    FirstName = "Florence",
                    LastName = "Nightingale",
                    Email = "florence@hospital.org",
                    PhoneNumber = "+1-555-0301",
                    PasswordHash = nursePass,
                    IsActive = true
                };
                context.Staff.Add(nurse1);
                context.NurseDetails.Add(new NurseDetail
                {
                    StaffId = nurse1.Id,
                    LicenseNumber = "NUR-11203",
                    DepartmentId = emergDept.Id,
                    ShiftType = "Day"
                });

                // Nurse 2
                var nurse2 = new Staff
                {
                    StaffId = "300002",
                    RoleCode = 30,
                    Role = "Nurse",
                    FirstName = "Clara",
                    LastName = "Barton",
                    Email = "clara@hospital.org",
                    PhoneNumber = "+1-555-0302",
                    PasswordHash = nursePass,
                    IsActive = true
                };
                context.Staff.Add(nurse2);
                context.NurseDetails.Add(new NurseDetail
                {
                    StaffId = nurse2.Id,
                    LicenseNumber = "NUR-44910",
                    DepartmentId = cardDept.Id,
                    ShiftType = "Night"
                });

                await context.SaveChangesAsync();
            }

            // Seed 4 additional doctors (200003..200006) if missing
            if (!context.Staff.Any(s => s.StaffId == "200003"))
            {
                var newDoctors = new[]
                {
                    new { StaffId = "200003", FirstName = "Elizabeth", LastName = "Blackwell", Email = "blackwell@hospital.org", Phone = "+1-555-0203", Specialty = "Pediatrics", License = "DOC-77291", DeptId = pedDept.Id, Sig = "SIG-EB-77291-C1X" },
                    new { StaffId = "200004", FirstName = "Jonas", LastName = "Salk", Email = "salk@hospital.org", Phone = "+1-555-0204", Specialty = "Emergency Medicine", License = "DOC-66104", DeptId = emergDept.Id, Sig = "SIG-JS-66104-D2Y" },
                    new { StaffId = "200005", FirstName = "Virginia", LastName = "Apgar", Email = "apgar@hospital.org", Phone = "+1-555-0205", Specialty = "Anesthesiology", License = "DOC-55319", DeptId = orthoDept.Id, Sig = "SIG-VA-55319-E3Z" },
                    new { StaffId = "200006", FirstName = "Sigmund", LastName = "Freud", Email = "freud@hospital.org", Phone = "+1-555-0206", Specialty = "Neurology", License = "DOC-44822", DeptId = neuroDept.Id, Sig = "SIG-SF-44822-F4W" }
                };

                foreach (var d in newDoctors)
                {
                    var docStaff = new Staff
                    {
                        StaffId = d.StaffId,
                        RoleCode = 20,
                        Role = "Doctor",
                        FirstName = d.FirstName,
                        LastName = d.LastName,
                        Email = d.Email,
                        PhoneNumber = d.Phone,
                        PasswordHash = doctorPass,
                        IsActive = true
                    };
                    context.Staff.Add(docStaff);
                    context.DoctorDetails.Add(new DoctorDetail
                    {
                        StaffId = docStaff.Id,
                        Specialty = d.Specialty,
                        LicenseNumber = d.License,
                        DepartmentId = d.DeptId,
                        DigitalSignatureHash = d.Sig
                    });
                }
                await context.SaveChangesAsync();
            }

            // Seed 8 additional nurses (300003..300010) if missing
            if (!context.Staff.Any(s => s.StaffId == "300003"))
            {
                var newNurses = new[]
                {
                    new { StaffId = "300003", FirstName = "Mary Eliza", LastName = "Mahoney", Email = "mahoney@hospital.org", Phone = "+1-555-0303", License = "NUR-55101", DeptId = pedDept.Id, Shift = "Day" },
                    new { StaffId = "300004", FirstName = "Edith", LastName = "Cavell", Email = "cavell@hospital.org", Phone = "+1-555-0304", License = "NUR-66202", DeptId = emergDept.Id, Shift = "Night" },
                    new { StaffId = "300005", FirstName = "Hazel", LastName = "Johnson-Brown", Email = "hazel@hospital.org", Phone = "+1-555-0305", License = "NUR-77303", DeptId = orthoDept.Id, Shift = "Rotating" },
                    new { StaffId = "300006", FirstName = "Margaret", LastName = "Sanger", Email = "sanger@hospital.org", Phone = "+1-555-0306", License = "NUR-88404", DeptId = cardDept.Id, Shift = "Day" },
                    new { StaffId = "300007", FirstName = "Dorothea", LastName = "Dix", Email = "dix@hospital.org", Phone = "+1-555-0307", License = "NUR-99505", DeptId = neuroDept.Id, Shift = "Night" },
                    new { StaffId = "300008", FirstName = "Mary", LastName = "Breckinridge", Email = "breckinridge@hospital.org", Phone = "+1-555-0308", License = "NUR-11606", DeptId = pedDept.Id, Shift = "Day" },
                    new { StaffId = "300009", FirstName = "Lillian", LastName = "Wald", Email = "wald@hospital.org", Phone = "+1-555-0309", License = "NUR-22707", DeptId = emergDept.Id, Shift = "Rotating" },
                    new { StaffId = "300010", FirstName = "Walt", LastName = "Whitman", Email = "whitman@hospital.org", Phone = "+1-555-0310", License = "NUR-33808", DeptId = orthoDept.Id, Shift = "Night" }
                };

                foreach (var n in newNurses)
                {
                    var nurseStaff = new Staff
                    {
                        StaffId = n.StaffId,
                        RoleCode = 30,
                        Role = "Nurse",
                        FirstName = n.FirstName,
                        LastName = n.LastName,
                        Email = n.Email,
                        PhoneNumber = n.Phone,
                        PasswordHash = nursePass,
                        IsActive = true
                    };
                    context.Staff.Add(nurseStaff);
                    context.NurseDetails.Add(new NurseDetail
                    {
                        StaffId = nurseStaff.Id,
                        LicenseNumber = n.License,
                        DepartmentId = n.DeptId,
                        ShiftType = n.Shift
                    });
                }
                await context.SaveChangesAsync();
            }

            // Update StaffRoleSequences
            var seq10 = await context.StaffRoleSequences.FindAsync(10);
            if (seq10 != null && seq10.LastSequenceNumber < 1) seq10.LastSequenceNumber = 1;

            var seq20 = await context.StaffRoleSequences.FindAsync(20);
            if (seq20 != null && seq20.LastSequenceNumber < 6) seq20.LastSequenceNumber = 6;

            var seq30 = await context.StaffRoleSequences.FindAsync(30);
            if (seq30 != null && seq30.LastSequenceNumber < 10) seq30.LastSequenceNumber = 10;

            await context.SaveChangesAsync();

            var pharmacistsToSeed = new[]
            {
                new { StaffId = "400001", FirstName = "Elizabeth", LastName = "Gookin", Email = "gookin@hospital.org", Phone = "+1-555-0401", License = "PHARM-40101", Shift = "Day" },
                new { StaffId = "400002", FirstName = "Harvey", LastName = "Whitney", Email = "whitney@hospital.org", Phone = "+1-555-0402", License = "PHARM-40202", Shift = "Night" },
                new { StaffId = "400003", FirstName = "Joseph", LastName = "Remington", Email = "remington@hospital.org", Phone = "+1-555-0403", License = "PHARM-40303", Shift = "Rotating" }
            };

            foreach (var p in pharmacistsToSeed)
            {
                var existingStaff = await context.Staff
                    .Include(s => s.PharmacistDetail)
                    .FirstOrDefaultAsync(s => s.StaffId == p.StaffId);

                if (existingStaff == null)
                {
                    var staff = new Staff
                    {
                        StaffId = p.StaffId,
                        RoleCode = 40,
                        Role = "Pharmacist",
                        FirstName = p.FirstName,
                        LastName = p.LastName,
                        Email = p.Email,
                        PhoneNumber = p.Phone,
                        PasswordHash = pharmacistPass,
                        IsActive = true
                    };
                    context.Staff.Add(staff);
                    context.PharmacistDetails.Add(new PharmacistDetail
                    {
                        StaffId = staff.Id,
                        LicenseNumber = p.License,
                        DepartmentId = pharmDept.Id,
                        ShiftType = p.Shift
                    });
                }
                else
                {
                    existingStaff.IsActive = true;
                    existingStaff.PasswordHash = pharmacistPass;
                    if (existingStaff.PharmacistDetail == null)
                    {
                        context.PharmacistDetails.Add(new PharmacistDetail
                        {
                            StaffId = existingStaff.Id,
                            LicenseNumber = p.License,
                            DepartmentId = pharmDept.Id,
                            ShiftType = p.Shift
                        });
                    }
                }
            }

            await context.SaveChangesAsync();

            var seq40 = await context.StaffRoleSequences.FindAsync(40);
            if (seq40 != null && seq40.LastSequenceNumber < 3) seq40.LastSequenceNumber = 3;
            await context.SaveChangesAsync();

            // Seed default Lab Technician (500001) if not present
            string labTechPass = BCrypt.Net.BCrypt.HashPassword("LabTech123!");
            var existingLabTech = await context.Staff.FirstOrDefaultAsync(s => s.StaffId == "500001");
            if (existingLabTech == null)
            {
                var labTechStaff = new Staff
                {
                    StaffId = "500001",
                    RoleCode = 50,
                    Role = "LabTech",
                    FirstName = "Rosalind",
                    LastName = "Franklin",
                    Email = "franklin@hospital.org",
                    PhoneNumber = "+1-555-0501",
                    PasswordHash = labTechPass,
                    IsActive = true
                };
                context.Staff.Add(labTechStaff);
            }
            else
            {
                existingLabTech.IsActive = true;
                existingLabTech.PasswordHash = labTechPass;
            }

            var seq50 = await context.StaffRoleSequences.FindAsync(50);
            if (seq50 != null && seq50.LastSequenceNumber < 1) seq50.LastSequenceNumber = 1;
            await context.SaveChangesAsync();

            // Seed default Receptionist (600001) if not present
            string receptionistPass = BCrypt.Net.BCrypt.HashPassword("Receptionist123!");
            var existingReceptionist = await context.Staff.FirstOrDefaultAsync(s => s.StaffId == "600001");
            if (existingReceptionist == null)
            {
                var receptionistStaff = new Staff
                {
                    StaffId = "600001",
                    RoleCode = 60,
                    Role = "Receptionist",
                    FirstName = "Grace",
                    LastName = "Hopper",
                    Email = "hopper@hospital.org",
                    PhoneNumber = "+1-555-0601",
                    PasswordHash = receptionistPass,
                    IsActive = true
                };
                context.Staff.Add(receptionistStaff);
            }
            else
            {
                existingReceptionist.IsActive = true;
                existingReceptionist.PasswordHash = receptionistPass;
            }

            var seq60 = await context.StaffRoleSequences.FindAsync(60);
            if (seq60 != null && seq60.LastSequenceNumber < 1) seq60.LastSequenceNumber = 1;
            await context.SaveChangesAsync();

            if (!context.Medications.Any())
            {
                context.Medications.AddRange(
                    new Medication { Name = "Lisinopril", Strength = "10mg", Form = "Tablet", Unit = "tablets", QuantityOnHand = 240, ReorderLevel = 40, Category = "Cardiovascular" },
                    new Medication { Name = "Atorvastatin", Strength = "20mg", Form = "Tablet", Unit = "tablets", QuantityOnHand = 180, ReorderLevel = 30, Category = "Cardiovascular" },
                    new Medication { Name = "Amoxicillin", Strength = "250mg", Form = "Capsule", Unit = "capsules", QuantityOnHand = 90, ReorderLevel = 25, Category = "Antibiotic" },
                    new Medication { Name = "Metoprolol", Strength = "25mg", Form = "Tablet", Unit = "tablets", QuantityOnHand = 150, ReorderLevel = 30, Category = "Cardiovascular" },
                    new Medication { Name = "Furosemide", Strength = "40mg", Form = "Vial", Unit = "vials", QuantityOnHand = 48, ReorderLevel = 12, Category = "Diuretic" },
                    new Medication { Name = "Morphine", Strength = "5mg", Form = "Ampoule", Unit = "ampoules", QuantityOnHand = 22, ReorderLevel = 8, Category = "Analgesic" },
                    new Medication { Name = "Levetiracetam", Strength = "500mg", Form = "Tablet", Unit = "tablets", QuantityOnHand = 110, ReorderLevel = 20, Category = "Neurology" },
                    new Medication { Name = "Enoxaparin", Strength = "40mg", Form = "Syringe", Unit = "syringes", QuantityOnHand = 36, ReorderLevel = 10, Category = "Anticoagulant" },
                    new Medication { Name = "Salbutamol", Strength = "2.5mg", Form = "Nebule", Unit = "nebules", QuantityOnHand = 60, ReorderLevel = 15, Category = "Respiratory" },
                    new Medication { Name = "Paracetamol", Strength = "500mg", Form = "Tablet", Unit = "tablets", QuantityOnHand = 400, ReorderLevel = 80, Category = "Analgesic" }
                );
                await context.SaveChangesAsync();
            }

            // Seed initial 3 Patients if completely empty
            if (!context.Patients.Any())
            {
                var p1 = new Patient
                {
                    MRN = "MRN-100201",
                    FirstName = "John",
                    LastName = "Doe",
                    DateOfBirth = new DateTime(1985, 4, 12),
                    Gender = "Male",
                    BloodType = "A+",
                    Allergies = "Penicillin, Peanuts",
                    EmergencyContactName = "Jane Doe (Wife)",
                    EmergencyContactPhone = "+1-555-9001",
                    ContactNumber = "+1-555-1101",
                    Address = "742 Evergreen Terrace, Springfield"
                };

                var p2 = new Patient
                {
                    MRN = "MRN-100202",
                    FirstName = "Alice",
                    LastName = "Smith",
                    DateOfBirth = new DateTime(1992, 9, 25),
                    Gender = "Female",
                    BloodType = "O-",
                    Allergies = "Latex, Sulfa Drugs",
                    EmergencyContactName = "Bob Smith (Brother)",
                    EmergencyContactPhone = "+1-555-9002",
                    ContactNumber = "+1-555-1102",
                    Address = "123 Maple Street, Metropolis"
                };

                var p3 = new Patient
                {
                    MRN = "MRN-100203",
                    FirstName = "Robert",
                    LastName = "Johnson",
                    DateOfBirth = new DateTime(1968, 11, 3),
                    Gender = "Male",
                    BloodType = "B+",
                    Allergies = "None known",
                    EmergencyContactName = "Mary Johnson (Daughter)",
                    EmergencyContactPhone = "+1-555-9003",
                    ContactNumber = "+1-555-1103",
                    Address = "456 Oak Lane, Gotham"
                };

                context.Patients.AddRange(p1, p2, p3);
                await context.SaveChangesAsync();

                var doc1 = await context.Staff.FirstAsync(s => s.StaffId == "200001");
                var nurse1 = await context.Staff.FirstAsync(s => s.StaffId == "300001");

                p1.PrimaryDoctorId = doc1.Id;
                p2.PrimaryDoctorId = doc1.Id;
                p3.PrimaryDoctorId = doc1.Id;

                // Appointments
                context.Appointments.AddRange(
                    new Appointment { PatientId = p1.Id, DoctorId = doc1.Id, AppointmentDateTime = DateTime.UtcNow.AddHours(1), Status = "Scheduled", Reason = "Routine Cardiac Follow-up", Notes = "Patient reported mild chest tightness last week." },
                    new Appointment { PatientId = p2.Id, DoctorId = doc1.Id, AppointmentDateTime = DateTime.UtcNow.AddHours(3), Status = "Scheduled", Reason = "Hypertension Consultation", Notes = "Check blood pressure trend and adjust dosage." },
                    new Appointment { PatientId = p3.Id, DoctorId = doc1.Id, AppointmentDateTime = DateTime.UtcNow.AddDays(-1), Status = "Completed", Reason = "ECG Evaluation", Notes = "Normal sinus rhythm." }
                );

                // Encounters
                var encounter = new Encounter
                {
                    PatientId = p1.Id,
                    DoctorId = doc1.Id,
                    NurseId = nurse1.Id,
                    StartTime = DateTime.UtcNow.AddHours(-2),
                    Status = "InConsultation",
                    ReasonForVisit = "Shortness of breath and elevated blood pressure"
                };
                context.Encounters.Add(encounter);
                await context.SaveChangesAsync();

                // Clinical Note
                context.ClinicalNotes.Add(new ClinicalNote
                {
                    EncounterId = encounter.Id,
                    PatientId = p1.Id,
                    DoctorId = doc1.Id,
                    Subjective = "Patient complains of dyspnea on exertion over the past 3 days.",
                    Objective = "BP: 142/90 mmHg, HR: 88 bpm, SpO2: 96% on room air. S1 S2 dual normal, no murmur.",
                    Assessment = "Essential Hypertension, mild left ventricular strain.",
                    Plan = "1. Start Lisinopril 10mg PO daily. 2. Order Lipid Panel & Echocardiogram. 3. Re-evaluate in 2 weeks.",
                    ICD10Codes = "I10, R06.02",
                    IsDigitallySigned = true,
                    SignedAt = DateTime.UtcNow,
                    DigitalSignatureHash = doc1.StaffId + "-SIGNED-2026"
                });

                // Prescriptions
                context.Prescriptions.AddRange(
                    new Prescription { EncounterId = encounter.Id, PatientId = p1.Id, DoctorId = doc1.Id, DrugName = "Lisinopril", Dosage = "10mg", Frequency = "Once daily", Duration = "30 Days", Status = "Active", InteractionCheckPassed = true, InteractionAlerts = "No conflict with Penicillin allergy", IsDigitallySigned = true },
                    new Prescription { EncounterId = encounter.Id, PatientId = p1.Id, DoctorId = doc1.Id, DrugName = "Atorvastatin", Dosage = "20mg", Frequency = "Once daily at bedtime", Duration = "30 Days", Status = "Active", InteractionCheckPassed = true, InteractionAlerts = "Checked against patient profile", IsDigitallySigned = true }
                );

                // Lab Order & Result
                var labOrder1 = new LabOrder { EncounterId = encounter.Id, PatientId = p1.Id, DoctorId = doc1.Id, TestName = "Lipid Panel", Category = "Biochemistry", Status = "Completed", OrderDate = DateTime.UtcNow.AddHours(-4) };
                var labOrder2 = new LabOrder { EncounterId = encounter.Id, PatientId = p1.Id, DoctorId = doc1.Id, TestName = "Troponin I", Category = "Biochemistry", Status = "Completed", OrderDate = DateTime.UtcNow.AddHours(-2) };
                context.LabOrders.AddRange(labOrder1, labOrder2);
                await context.SaveChangesAsync();

                context.LabResults.AddRange(
                    new LabResult { LabOrderId = labOrder1.Id, PatientId = p1.Id, TestName = "Total Cholesterol", Value = "235", Unit = "mg/dL", ReferenceRange = "< 200", IsAbnormal = true, IsCritical = false, Notes = "Elevated cholesterol level." },
                    new LabResult { LabOrderId = labOrder2.Id, PatientId = p1.Id, TestName = "Troponin I", Value = "0.02", Unit = "ng/mL", ReferenceRange = "< 0.04", IsAbnormal = false, IsCritical = false, Notes = "Normal cardiac marker." }
                );

                // Vitals
                context.Vitals.AddRange(
                    new Vital { EncounterId = encounter.Id, PatientId = p1.Id, NurseId = nurse1.Id, BloodPressureSystolic = 142, BloodPressureDiastolic = 90, HeartRate = 88, Temperature = 36.8, SpO2 = 96, RecordedAt = DateTime.UtcNow.AddHours(-2) },
                    new Vital { PatientId = p1.Id, NurseId = nurse1.Id, BloodPressureSystolic = 138, BloodPressureDiastolic = 86, HeartRate = 82, Temperature = 36.7, SpO2 = 98, RecordedAt = DateTime.UtcNow.AddHours(-1) },
                    new Vital { PatientId = p2.Id, NurseId = nurse1.Id, BloodPressureSystolic = 120, BloodPressureDiastolic = 80, HeartRate = 72, Temperature = 36.5, SpO2 = 99, RecordedAt = DateTime.UtcNow.AddMinutes(-30) }
                );

                // Admission
                context.Admissions.Add(new Admission
                {
                    PatientId = p1.Id,
                    AttendingDoctorId = doc1.Id,
                    Ward = "Cardiology Inpatient Ward A",
                    BedNumber = "Bed-104",
                    AdmitDate = DateTime.UtcNow.AddDays(-2),
                    Status = "Admitted",
                    AdmissionNotes = "Admitted for observation and titration of antihypertensive medications."
                });

                // Care Plan Tasks
                context.CarePlanTasks.AddRange(
                    new CarePlanTask { PatientId = p1.Id, AssignedNurseId = nurse1.Id, TaskDescription = "Check Q4H Vitals & SpO2", DueDate = DateTime.UtcNow.AddHours(2), IsCompleted = false },
                    new CarePlanTask { PatientId = p1.Id, AssignedNurseId = nurse1.Id, TaskDescription = "Administer Evening Lisinopril 10mg", DueDate = DateTime.UtcNow.AddHours(4), IsCompleted = false },
                    new CarePlanTask { PatientId = p2.Id, AssignedNurseId = nurse1.Id, TaskDescription = "Admission Intake & Allergy Verification", DueDate = DateTime.UtcNow.AddHours(1), IsCompleted = true, CompletedAt = DateTime.UtcNow.AddMinutes(-20) }
                );

                // Audit Logs
                context.AuditLogs.AddRange(
                    new AuditLog { Timestamp = DateTime.UtcNow.AddDays(-1), StaffId = "100001", StaffName = "Sarah Connor", Role = "Admin", Action = "CREATE_STAFF", EntityName = "Staff", EntityId = "200001", Details = "Created Doctor account Alexander Fleming (200001)" },
                    new AuditLog { Timestamp = DateTime.UtcNow.AddHours(-3), StaffId = "200001", StaffName = "Alexander Fleming", Role = "Doctor", Action = "VIEW_PATIENT_CHART", EntityName = "Patient", EntityId = p1.Id.ToString(), Details = "Accessed patient chart John Doe (MRN-100201)" },
                    new AuditLog { Timestamp = DateTime.UtcNow.AddHours(-2), StaffId = "300001", StaffName = "Florence Nightingale", Role = "Nurse", Action = "ENTER_VITALS", EntityName = "Vital", EntityId = "1", Details = "Recorded BP 142/90 for patient John Doe" }
                );

                // Notifications
                context.Notifications.AddRange(
                    new Notification { RecipientStaffId = "200001", Title = "Lab Result Available", Message = "Lipid Panel completed for John Doe (MRN-100201) with abnormal result (Cholesterol: 235 mg/dL)", Type = "CriticalLab", IsRead = false },
                    new Notification { RecipientStaffId = "300001", Title = "New Admission Action", Message = "John Doe assigned to Bed-104 in Ward A", Type = "NewAdmission", IsRead = false }
                );

                await context.SaveChangesAsync();
            }

            // Seed 25 additional Patients (MRN-100204..MRN-100228) if missing
            if (!context.Patients.Any(p => p.MRN == "MRN-100204"))
            {
                var newPatients = new[]
                {
                    new Patient { MRN = "MRN-100204", FirstName = "Michael", LastName = "Brown", DateOfBirth = new DateTime(1978, 6, 15), Gender = "Male", BloodType = "O+", Allergies = "Aspirin", EmergencyContactName = "Sarah Brown (Wife)", EmergencyContactPhone = "+1-555-9004", ContactNumber = "+1-555-1104", Address = "888 Pine Street, Springfield" },
                    new Patient { MRN = "MRN-100205", FirstName = "Emily", LastName = "Davis", DateOfBirth = new DateTime(1995, 2, 28), Gender = "Female", BloodType = "A-", Allergies = "None known", EmergencyContactName = "David Davis (Father)", EmergencyContactPhone = "+1-555-9005", ContactNumber = "+1-555-1105", Address = "321 Cedar Road, Metropolis" },
                    new Patient { MRN = "MRN-100206", FirstName = "David", LastName = "Wilson", DateOfBirth = new DateTime(1960, 12, 10), Gender = "Male", BloodType = "AB+", Allergies = "Codeine", EmergencyContactName = "Linda Wilson (Wife)", EmergencyContactPhone = "+1-555-9006", ContactNumber = "+1-555-1106", Address = "555 Birch Ave, Gotham" },
                    new Patient { MRN = "MRN-100207", FirstName = "Jessica", LastName = "Taylor", DateOfBirth = new DateTime(1989, 8, 4), Gender = "Female", BloodType = "B-", Allergies = "Peanuts", EmergencyContactName = "Mark Taylor (Husband)", EmergencyContactPhone = "+1-555-9007", ContactNumber = "+1-555-1107", Address = "777 Walnut St, Star City" },
                    new Patient { MRN = "MRN-100208", FirstName = "James", LastName = "Anderson", DateOfBirth = new DateTime(1972, 3, 22), Gender = "Male", BloodType = "O-", Allergies = "Shellfish", EmergencyContactName = "Karen Anderson (Sister)", EmergencyContactPhone = "+1-555-9008", ContactNumber = "+1-555-1108", Address = "999 Elm St, Central City" },
                    new Patient { MRN = "MRN-100209", FirstName = "Sophia", LastName = "Martinez", DateOfBirth = new DateTime(2001, 10, 18), Gender = "Female", BloodType = "A+", Allergies = "None known", EmergencyContactName = "Maria Martinez (Mother)", EmergencyContactPhone = "+1-555-9009", ContactNumber = "+1-555-1109", Address = "147 Spruce Lane, Coast City" },
                    new Patient { MRN = "MRN-100210", FirstName = "Daniel", LastName = "Thomas", DateOfBirth = new DateTime(1982, 7, 30), Gender = "Male", BloodType = "B+", Allergies = "Sulfa", EmergencyContactName = "Amy Thomas (Wife)", EmergencyContactPhone = "+1-555-9010", ContactNumber = "+1-555-1110", Address = "258 Ash Way, Bludhaven" },
                    new Patient { MRN = "MRN-100211", FirstName = "Olivia", LastName = "White", DateOfBirth = new DateTime(1998, 5, 14), Gender = "Female", BloodType = "O+", Allergies = "Ibuprofen", EmergencyContactName = "George White (Father)", EmergencyContactPhone = "+1-555-9011", ContactNumber = "+1-555-1111", Address = "369 Beech Blvd, Keystone City" },
                    new Patient { MRN = "MRN-100212", FirstName = "Matthew", LastName = "Harris", DateOfBirth = new DateTime(1965, 1, 9), Gender = "Male", BloodType = "A+", Allergies = "Penicillin", EmergencyContactName = "Rachel Harris (Wife)", EmergencyContactPhone = "+1-555-9012", ContactNumber = "+1-555-1112", Address = "741 Willow Dr, Smallville" },
                    new Patient { MRN = "MRN-100213", FirstName = "Emma", LastName = "Martin", DateOfBirth = new DateTime(2003, 11, 20), Gender = "Female", BloodType = "AB-", Allergies = "None known", EmergencyContactName = "Tom Martin (Brother)", EmergencyContactPhone = "+1-555-9013", ContactNumber = "+1-555-1113", Address = "852 Poplar St, National City" },
                    new Patient { MRN = "MRN-100214", FirstName = "Christopher", LastName = "Clark", DateOfBirth = new DateTime(1975, 9, 5), Gender = "Male", BloodType = "O-", Allergies = "Contrast Dye", EmergencyContactName = "Laura Clark (Wife)", EmergencyContactPhone = "+1-555-9014", ContactNumber = "+1-555-1114", Address = "963 Magnolia Ct, Freeland" },
                    new Patient { MRN = "MRN-100215", FirstName = "Ava", LastName = "Rodriguez", DateOfBirth = new DateTime(1991, 4, 17), Gender = "Female", BloodType = "B+", Allergies = "Latex", EmergencyContactName = "Carlos Rodriguez (Father)", EmergencyContactPhone = "+1-555-9015", ContactNumber = "+1-555-1115", Address = "159 Cypress Rd, Ivy Town" },
                    new Patient { MRN = "MRN-100216", FirstName = "Andrew", LastName = "Lewis", DateOfBirth = new DateTime(1987, 12, 1), Gender = "Male", BloodType = "A-", Allergies = "None known", EmergencyContactName = "Megan Lewis (Wife)", EmergencyContactPhone = "+1-555-9016", ContactNumber = "+1-555-1116", Address = "357 Hickory St, Midway City" },
                    new Patient { MRN = "MRN-100217", FirstName = "Isabella", LastName = "Lee", DateOfBirth = new DateTime(1994, 6, 28), Gender = "Female", BloodType = "O+", Allergies = "Morphine", EmergencyContactName = "Kevin Lee (Brother)", EmergencyContactPhone = "+1-555-9017", ContactNumber = "+1-555-1117", Address = "468 Sycamore Ave, Hub City" },
                    new Patient { MRN = "MRN-100218", FirstName = "Joshua", LastName = "Walker", DateOfBirth = new DateTime(1980, 2, 14), Gender = "Male", BloodType = "AB+", Allergies = "Dust, Pollen", EmergencyContactName = "Hannah Walker (Wife)", EmergencyContactPhone = "+1-555-9018", ContactNumber = "+1-555-1118", Address = "579 Alder St, Opal City" },
                    new Patient { MRN = "MRN-100219", FirstName = "Mia", LastName = "Hall", DateOfBirth = new DateTime(2000, 8, 9), Gender = "Female", BloodType = "B-", Allergies = "None known", EmergencyContactName = "Brian Hall (Father)", EmergencyContactPhone = "+1-555-9019", ContactNumber = "+1-555-1119", Address = "680 Chestnut Rd, Charlton" },
                    new Patient { MRN = "MRN-100220", FirstName = "Ethan", LastName = "Allen", DateOfBirth = new DateTime(1973, 10, 31), Gender = "Male", BloodType = "O+", Allergies = "Soy", EmergencyContactName = "Diana Allen (Wife)", EmergencyContactPhone = "+1-555-9020", ContactNumber = "+1-555-1120", Address = "791 Redwood Dr, Fawcett City" },
                    new Patient { MRN = "MRN-100221", FirstName = "Charlotte", LastName = "Young", DateOfBirth = new DateTime(1996, 3, 19), Gender = "Female", BloodType = "A+", Allergies = "Erythromycin", EmergencyContactName = "Edward Young (Brother)", EmergencyContactPhone = "+1-555-9021", ContactNumber = "+1-555-1121", Address = "802 Hemlock Way, Happy Harbor" },
                    new Patient { MRN = "MRN-100222", FirstName = "Ryan", LastName = "King", DateOfBirth = new DateTime(1984, 1, 24), Gender = "Male", BloodType = "B+", Allergies = "None known", EmergencyContactName = "Nicole King (Wife)", EmergencyContactPhone = "+1-555-9022", ContactNumber = "+1-555-1122", Address = "913 Fir St, Blue Valley" },
                    new Patient { MRN = "MRN-100223", FirstName = "Amelia", LastName = "Wright", DateOfBirth = new DateTime(1990, 7, 12), Gender = "Female", BloodType = "O-", Allergies = "Ciprofloxacin", EmergencyContactName = "Steven Wright (Father)", EmergencyContactPhone = "+1-555-9023", ContactNumber = "+1-555-1123", Address = "124 Larch Lane, Monument Point" },
                    new Patient { MRN = "MRN-100224", FirstName = "Jacob", LastName = "Scott", DateOfBirth = new DateTime(1979, 5, 8), Gender = "Male", BloodType = "A-", Allergies = "Clindamycin", EmergencyContactName = "Rebecca Scott (Wife)", EmergencyContactPhone = "+1-555-9024", ContactNumber = "+1-555-1124", Address = "235 Maplewood Dr, Suburbia" },
                    new Patient { MRN = "MRN-100225", FirstName = "Harper", LastName = "Green", DateOfBirth = new DateTime(1997, 9, 30), Gender = "Female", BloodType = "AB+", Allergies = "None known", EmergencyContactName = "Jason Green (Husband)", EmergencyContactPhone = "+1-555-9025", ContactNumber = "+1-555-1125", Address = "346 Oakwood Ave, Riverdale" },
                    new Patient { MRN = "MRN-100226", FirstName = "Logan", LastName = "Adams", DateOfBirth = new DateTime(1986, 11, 15), Gender = "Male", BloodType = "O+", Allergies = "Penicillin", EmergencyContactName = "Stephanie Adams (Wife)", EmergencyContactPhone = "+1-555-9026", ContactNumber = "+1-555-1126", Address = "457 Pinewood Ter, Greendale" },
                    new Patient { MRN = "MRN-100227", FirstName = "Evelyn", LastName = "Baker", DateOfBirth = new DateTime(1993, 4, 3), Gender = "Female", BloodType = "B+", Allergies = "Tree Nuts", EmergencyContactName = "Nathan Baker (Brother)", EmergencyContactPhone = "+1-555-9027", ContactNumber = "+1-555-1127", Address = "568 Rosewood Ct, Sunnydale" },
                    new Patient { MRN = "MRN-100228", FirstName = "Benjamin", LastName = "Gonzalez", DateOfBirth = new DateTime(1981, 12, 22), Gender = "Male", BloodType = "A+", Allergies = "None known", EmergencyContactName = "Victoria Gonzalez (Wife)", EmergencyContactPhone = "+1-555-9028", ContactNumber = "+1-555-1128", Address = "679 Cedarwood Way, Mystic Falls" }
                };

                context.Patients.AddRange(newPatients);
                await context.SaveChangesAsync();
            }

            await AssignPatientsToDoctorsAsync(context);
            await AssignPatientsToNursesAsync(context);
            await SeedPendingMedicationRequestsAsync(context);
        }

        private static async Task SeedPendingMedicationRequestsAsync(HospitalDbContext context)
        {
            if (await context.MedicationRequests.AnyAsync() || !await context.Prescriptions.AnyAsync())
                return;

            var prescriptions = await context.Prescriptions.ToListAsync();
            var meds = await context.Medications.ToListAsync();
            foreach (var rx in prescriptions)
            {
                var med = meds.FirstOrDefault(m =>
                    m.Name.Equals(rx.DrugName, StringComparison.OrdinalIgnoreCase));
                if (med == null) continue;

                rx.QuantityRequested = Math.Max(1, rx.QuantityRequested);
                rx.PharmacyStatus = "Pending";
                context.MedicationRequests.Add(new MedicationRequest
                {
                    PrescriptionId = rx.Id,
                    MedicationId = med.Id,
                    PatientId = rx.PatientId,
                    DoctorId = rx.DoctorId,
                    QuantityRequested = rx.QuantityRequested,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                });
            }

            await context.SaveChangesAsync();
        }


        private static async Task AssignPatientsToDoctorsAsync(HospitalDbContext context)
        {
            var doctors = await context.Staff
                .Where(s => s.RoleCode == 20 && s.IsActive)
                .OrderBy(s => s.StaffId)
                .ToListAsync();

            if (doctors.Count == 0)
                return;

            var patients = await context.Patients.OrderBy(p => p.Id).ToListAsync();
            if (patients.Count == 0)
                return;

            var existingAppointments = await context.Appointments
                .Select(a => new { a.PatientId, a.DoctorId })
                .ToListAsync();

            var appointmentKeys = existingAppointments
                .Select(a => (a.PatientId, a.DoctorId))
                .ToHashSet();

            var reasons = new[]
            {
                "Follow-up visit",
                "New patient consult",
                "Medication review",
                "Symptom evaluation",
                "Post-procedure check"
            };

            for (var i = 0; i < patients.Count; i++)
            {
                var doctor = doctors[i % doctors.Count];
                patients[i].PrimaryDoctorId = doctor.Id;

                if (!appointmentKeys.Contains((patients[i].Id, doctor.Id)))
                {
                    context.Appointments.Add(new Appointment
                    {
                        PatientId = patients[i].Id,
                        DoctorId = doctor.Id,
                        AppointmentDateTime = DateTime.UtcNow.AddHours(1 + (i % 8)),
                        Status = "Scheduled",
                        Reason = reasons[i % reasons.Length],
                        Notes = $"Assigned to Dr. {doctor.LastName}"
                    });
                    appointmentKeys.Add((patients[i].Id, doctor.Id));
                }
            }

            await context.SaveChangesAsync();
        }

        private static async Task AssignPatientsToNursesAsync(HospitalDbContext context)
        {
            // Already seeded nurse tasks?
            if (await context.CarePlanTasks.AnyAsync(t => t.AssignedNurseId != Guid.Empty
                && context.Staff.Any(s => s.Id == t.AssignedNurseId && s.RoleCode == 30 && s.StaffId != "300001")))
                return;

            var nurses = await context.Staff
                .Include(s => s.NurseDetail)
                .Where(s => s.RoleCode == 30 && s.IsActive)
                .OrderBy(s => s.StaffId)
                .ToListAsync();

            if (nurses.Count == 0) return;

            var patients = await context.Patients.OrderBy(p => p.Id).ToListAsync();
            if (patients.Count == 0) return;

            var doctors = await context.Staff
                .Where(s => s.RoleCode == 20 && s.IsActive)
                .OrderBy(s => s.StaffId)
                .ToListAsync();

            // Ward names keyed by department name fragment
            var wardMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "Emergency",    "Emergency Ward" },
                { "Cardiology",   "Cardiology Inpatient Ward A" },
                { "Neurology",    "Neurology Ward B" },
                { "Pediatrics",   "Pediatrics Ward C" },
                { "Orthopedics",  "Orthopedics Ward D" },
            };

            // Task templates per nurse (index 0..9 maps to nurses sorted by StaffId)
            var taskTemplates = new[]
            {
                // Nurse 0 — Florence Nightingale (Emergency)
                new[] {
                    "Check Q4H Vitals & SpO2",
                    "Administer Morning Lisinopril 10mg",
                    "Wound Dressing Change — Left Forearm"
                },
                // Nurse 1 — Clara Barton (Cardiology)
                new[] {
                    "Cardiac Monitor Review & Rhythm Strip",
                    "Administer IV Furosemide 40mg",
                    "Patient Education: Low-Sodium Diet"
                },
                // Nurse 2 — Mary Eliza Mahoney (Pediatrics)
                new[] {
                    "Pediatric Weight & Growth Chart Update",
                    "Administer Amoxicillin 250mg PO",
                    "Pain Assessment (FLACC Scale)"
                },
                // Nurse 3 — Edith Cavell (Emergency)
                new[] {
                    "Triage Reassessment & Priority Update",
                    "IV Line Flush & Site Inspection",
                    "Collect Blood Culture Samples"
                },
                // Nurse 4 — Hazel Johnson-Brown (Orthopedics)
                new[] {
                    "Post-Op Neurovascular Check (Hourly)",
                    "Apply Cold Pack to Left Knee",
                    "Administer Morphine 5mg IV PRN"
                },
                // Nurse 5 — Margaret Sanger (Cardiology)
                new[] {
                    "12-Lead ECG Recording",
                    "Administer Evening Metoprolol 25mg",
                    "Daily Weight & Fluid Balance Chart"
                },
                // Nurse 6 — Dorothea Dix (Neurology)
                new[] {
                    "Neuro Observations (GCS) Q2H",
                    "Administer Levetiracetam 500mg",
                    "Seizure Precaution Environment Check"
                },
                // Nurse 7 — Mary Breckinridge (Pediatrics)
                new[] {
                    "Infant Feeding Log & Latch Assessment",
                    "Administer Vitamin D 400IU Drops",
                    "Neonatal Jaundice Bili-Light Check"
                },
                // Nurse 8 — Lillian Wald (Emergency)
                new[] {
                    "Rapid Glucose Check (BGL)",
                    "Administer Salbutamol Nebulisation",
                    "Urine Output Measurement & Catheter Care"
                },
                // Nurse 9 — Walt Whitman (Orthopedics)
                new[] {
                    "Mobility Assessment & Ambulation Assist",
                    "Administer Enoxaparin 40mg SC",
                    "Pressure Sore Skin Integrity Check"
                }
            };

            var existingAdmissions = await context.Admissions
                .Select(a => a.PatientId)
                .ToHashSetAsync();

            var existingNurseTasks = await context.CarePlanTasks
                .Select(t => t.AssignedNurseId)
                .ToListAsync();

            int bedCounter = 200; // Start new beds from 200 to avoid collisions

            for (int i = 0; i < nurses.Count; i++)
            {
                var nurse = nurses[i];
                var templates = taskTemplates[i % taskTemplates.Length];

                // Determine this nurse's ward from their department
                var dept = await context.Departments
                    .FindAsync(nurse.NurseDetail?.DepartmentId);

                string ward = "General Ward";
                if (dept != null)
                {
                    foreach (var kv in wardMap)
                        if (dept.Name.Contains(kv.Key, StringComparison.OrdinalIgnoreCase))
                        { ward = kv.Value; break; }
                }

                // Assign 2–3 patients to this nurse (round-robin, skip already-admitted)
                var assignedPatients = new List<Patient>();
                for (int j = 0; j < patients.Count; j++)
                {
                    if (j % nurses.Count == i)
                        assignedPatients.Add(patients[j]);
                }

                // Ensure this nurse has an attending doctor
                var attendingDoctor = doctors.Count > 0 ? doctors[i % doctors.Count] : null;

                for (int p = 0; p < assignedPatients.Count && p < 3; p++)
                {
                    var patient = assignedPatients[p];
                    bedCounter++;

                    // Create admission if not already admitted
                    if (!existingAdmissions.Contains(patient.Id) && attendingDoctor != null)
                    {
                        context.Admissions.Add(new Admission
                        {
                            PatientId = patient.Id,
                            AttendingDoctorId = attendingDoctor.Id,
                            Ward = ward,
                            BedNumber = $"Bed-{bedCounter}",
                            AdmitDate = DateTime.UtcNow.AddDays(-(p + 1)),
                            Status = "Admitted",
                            AdmissionNotes = $"Admitted under the care of Nurse {nurse.LastName}."
                        });
                        existingAdmissions.Add(patient.Id);
                    }

                    // Add care plan tasks for this nurse & patient
                    for (int t = 0; t < templates.Length; t++)
                    {
                        context.CarePlanTasks.Add(new CarePlanTask
                        {
                            PatientId = patient.Id,
                            AssignedNurseId = nurse.Id,
                            TaskDescription = templates[t],
                            DueDate = DateTime.UtcNow.AddHours(2 + t * 2 + p),
                            IsCompleted = false
                        });
                    }
                }
            }

            await context.SaveChangesAsync();
        }
    }
}
