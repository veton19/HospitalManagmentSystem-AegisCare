using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HospitalManagmentSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddPharmacyEntitiesAndPharmacist : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PharmacyStatus",
                table: "Prescriptions",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "QuantityRequested",
                table: "Prescriptions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Medications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Strength = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Form = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Unit = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    QuantityOnHand = table.Column<int>(type: "integer", nullable: false),
                    ReorderLevel = table.Column<int>(type: "integer", nullable: false),
                    Category = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Medications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PharmacistDetails",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    LicenseNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DepartmentId = table.Column<int>(type: "integer", nullable: true),
                    ShiftType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PharmacistDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PharmacistDetails_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PharmacistDetails_Staff_StaffId",
                        column: x => x.StaffId,
                        principalTable: "Staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MedicationRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PrescriptionId = table.Column<int>(type: "integer", nullable: false),
                    MedicationId = table.Column<int>(type: "integer", nullable: false),
                    PatientId = table.Column<int>(type: "integer", nullable: false),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuantityRequested = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    VerifiedByPharmacistId = table.Column<Guid>(type: "uuid", nullable: true),
                    VerifiedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ReleasedByPharmacistId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReleasedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ReceivingNurseId = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicationRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MedicationRequests_Medications_MedicationId",
                        column: x => x.MedicationId,
                        principalTable: "Medications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MedicationRequests_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MedicationRequests_Prescriptions_PrescriptionId",
                        column: x => x.PrescriptionId,
                        principalTable: "Prescriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MedicationRequests_Staff_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MedicationRequests_Staff_ReceivingNurseId",
                        column: x => x.ReceivingNurseId,
                        principalTable: "Staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MedicationRequests_Staff_ReleasedByPharmacistId",
                        column: x => x.ReleasedByPharmacistId,
                        principalTable: "Staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MedicationRequests_Staff_VerifiedByPharmacistId",
                        column: x => x.VerifiedByPharmacistId,
                        principalTable: "Staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MedicationRequests_DoctorId",
                table: "MedicationRequests",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationRequests_MedicationId",
                table: "MedicationRequests",
                column: "MedicationId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationRequests_PatientId",
                table: "MedicationRequests",
                column: "PatientId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationRequests_PrescriptionId",
                table: "MedicationRequests",
                column: "PrescriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationRequests_ReceivingNurseId",
                table: "MedicationRequests",
                column: "ReceivingNurseId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationRequests_ReleasedByPharmacistId",
                table: "MedicationRequests",
                column: "ReleasedByPharmacistId");

            migrationBuilder.CreateIndex(
                name: "IX_MedicationRequests_VerifiedByPharmacistId",
                table: "MedicationRequests",
                column: "VerifiedByPharmacistId");

            migrationBuilder.CreateIndex(
                name: "IX_Medications_Name",
                table: "Medications",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PharmacistDetails_DepartmentId",
                table: "PharmacistDetails",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_PharmacistDetails_StaffId",
                table: "PharmacistDetails",
                column: "StaffId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MedicationRequests");

            migrationBuilder.DropTable(
                name: "PharmacistDetails");

            migrationBuilder.DropTable(
                name: "Medications");

            migrationBuilder.DropColumn(
                name: "PharmacyStatus",
                table: "Prescriptions");

            migrationBuilder.DropColumn(
                name: "QuantityRequested",
                table: "Prescriptions");
        }
    }
}
