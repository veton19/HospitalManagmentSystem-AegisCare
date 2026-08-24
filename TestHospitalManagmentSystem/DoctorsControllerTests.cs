using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HospitalManagmentSystem.Controllers;
using HospitalManagmentSystem.DBContext;
using HospitalManagmentSystem.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TestHospitalManagmentSystem;

public class DoctorsControllerTests
{
    // ── helpers ──────────────────────────────────────────────────────────────

    private static HospitalDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<HospitalDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return new HospitalDbContext(options);
    }

    private static DoctorsController CreateController(HospitalDbContext context)
    {
        var controller = new DoctorsController(context);

        var user = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Name, "admin"),
            new Claim(ClaimTypes.Role, "Admin")
        ], "TestAuth"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        return controller;
    }

    // ── Test 1: GET /api/doctors returns only active doctors ─────────────────

    [Fact]
    public async Task GetDoctors_ReturnsOnlyActiveDoctors()
    {
        // Arrange
        var context = CreateInMemoryContext(nameof(GetDoctors_ReturnsOnlyActiveDoctors));

        var activeDoctor = new Staff
        {
            StaffId = "200001", RoleCode = 20, Role = "Doctor",
            FirstName = "Jane", LastName = "Doe",
            Email = "jane@hospital.com", PasswordHash = "hash",
            IsActive = true
        };
        var inactiveDoctor = new Staff
        {
            StaffId = "200002", RoleCode = 20, Role = "Doctor",
            FirstName = "John", LastName = "Smith",
            Email = "john@hospital.com", PasswordHash = "hash",
            IsActive = false   // should be excluded
        };

        context.Staff.AddRange(activeDoctor, inactiveDoctor);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetDoctors();

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(ok.Value);
        int count = 0;
        foreach (var _ in list) count++;
        Assert.Equal(1, count);  // only the active doctor
    }

    // ── Test 2: GET /api/doctors returns empty list when no doctors exist ─────

    [Fact]
    public async Task GetDoctors_ReturnsEmptyList_WhenNoDoctorsExist()
    {
        // Arrange
        var context = CreateInMemoryContext(nameof(GetDoctors_ReturnsEmptyList_WhenNoDoctorsExist));
        // Add a nurse — should not appear in doctors list
        context.Staff.Add(new Staff
        {
            StaffId = "300001", RoleCode = 30, Role = "Nurse",
            FirstName = "Nurse", LastName = "Nancy",
            Email = "nurse@hospital.com", PasswordHash = "hash",
            IsActive = true
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetDoctors();

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(ok.Value);
        int count = 0;
        foreach (var _ in list) count++;
        Assert.Equal(0, count);
    }

    // ── Test 3: GET /api/doctors includes specialty from DoctorDetail ─────────

    [Fact]
    public async Task GetDoctors_IncludesSpecialty_FromDoctorDetail()
    {
        // Arrange
        var context = CreateInMemoryContext(nameof(GetDoctors_IncludesSpecialty_FromDoctorDetail));

        var doctor = new Staff
        {
            StaffId = "200003", RoleCode = 20, Role = "Doctor",
            FirstName = "Emily", LastName = "Clark",
            Email = "emily@hospital.com", PasswordHash = "hash",
            IsActive = true
        };
        context.Staff.Add(doctor);
        await context.SaveChangesAsync();

        context.DoctorDetails.Add(new DoctorDetail
        {
            StaffId = doctor.Id,
            Specialty = "Cardiology",
            LicenseNumber = "LIC-200003",
            DigitalSignatureHash = "SIG-200003-DIGITAL"
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetDoctors();

        // Assert: result is OK
        var ok = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(ok.Value);

        // Pull the single projected object via reflection
        object? first = null;
        foreach (var item in list) { first = item; break; }

        Assert.NotNull(first);
        var specialty = first!.GetType().GetProperty("Specialty")?.GetValue(first)?.ToString();
        Assert.Equal("Cardiology", specialty);
    }
}
