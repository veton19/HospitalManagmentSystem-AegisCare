using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HospitalManagmentSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddPrimaryNurseToPatient : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PrimaryNurseId",
                table: "Patients",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_PrimaryNurseId",
                table: "Patients",
                column: "PrimaryNurseId");

            migrationBuilder.AddForeignKey(
                name: "FK_Patients_Staff_PrimaryNurseId",
                table: "Patients",
                column: "PrimaryNurseId",
                principalTable: "Staff",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Patients_Staff_PrimaryNurseId",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_PrimaryNurseId",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "PrimaryNurseId",
                table: "Patients");
        }
    }
}
