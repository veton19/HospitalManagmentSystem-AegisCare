using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalManagmentSystem.Migrations
{
    /// <inheritdoc />
    public partial class AssignPrimaryDoctorToPatients : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PrimaryDoctorId",
                table: "Patients",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_PrimaryDoctorId",
                table: "Patients",
                column: "PrimaryDoctorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Patients_Staff_PrimaryDoctorId",
                table: "Patients",
                column: "PrimaryDoctorId",
                principalTable: "Staff",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Patients_Staff_PrimaryDoctorId",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_PrimaryDoctorId",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "PrimaryDoctorId",
                table: "Patients");
        }
    }
}
