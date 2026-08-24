using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HospitalManagmentSystem.Controllers;
using HospitalManagmentSystem.DBContext;
using HospitalManagmentSystem.Models;
using HospitalManagmentSystem.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace TestHospitalManagmentSystem;

public class PatientsControllerTests
{
    // ── helpers ──────────────────────────────────────────────────────────────

    private static HospitalDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<HospitalDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return new HospitalDbContext(options);
    }

    private static PatientsController CreateController(
        HospitalDbContext context,
        IAuditService auditService,
        ClaimsPrincipal? user = null)
    {
        var controller = new PatientsController(context, auditService);

        user ??= new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Name, "testuser"),
            new Claim(ClaimTypes.Role, "Admin")
        ], "TestAuth"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        return controller;
    }

    // ── Test 1: GET /api/patients returns all patients ────────────────────────

    [Fact]
    public async Task GetPatients_ReturnsAllPatients_WhenNoSearchProvided()
    {
        // Arrange
        var context = CreateInMemoryContext(nameof(GetPatients_ReturnsAllPatients_WhenNoSearchProvided));
        context.Patients.AddRange(
            new Patient { FirstName = "Alice", LastName = "Smith", MRN = "MRN-100201" },
            new Patient { FirstName = "Bob",   LastName = "Jones", MRN = "MRN-100202" });
        await context.SaveChangesAsync();

        var auditMock = new Mock<IAuditService>();
        var controller = CreateController(context, auditMock.Object);

        // Act
        var result = await controller.GetPatients(search: null);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var patients = Assert.IsAssignableFrom<System.Collections.IEnumerable>(ok.Value);
        int count = 0;
        foreach (var _ in patients) count++;
        Assert.Equal(2, count);
    }

    // ── Test 2: POST /api/patients returns 400 when name is missing ───────────

    [Fact]
    public async Task CreatePatient_ReturnsBadRequest_WhenNameIsMissing()
    {
        // Arrange
        var context = CreateInMemoryContext(nameof(CreatePatient_ReturnsBadRequest_WhenNameIsMissing));
        var auditMock = new Mock<IAuditService>();
        var controller = CreateController(context, auditMock.Object);

        var invalidPatient = new Patient
        {
            FirstName = "",   // missing
            LastName  = "",   // missing
            MRN       = "MRN-000001"
        };

        // Act
        var result = await controller.CreatePatient(invalidPatient);

        // Assert
        var bad = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(bad.Value);
    }

    // ── Test 3: POST /api/patients auto-generates MRN and creates patient ─────

    [Fact]
    public async Task CreatePatient_AutoGeneratesMRN_AndReturns201()
    {
        // Arrange
        var context = CreateInMemoryContext(nameof(CreatePatient_AutoGeneratesMRN_AndReturns201));
        var auditMock = new Mock<IAuditService>();
        auditMock
            .Setup(a => a.LogAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var controller = CreateController(context, auditMock.Object);

        var newPatient = new Patient
        {
            FirstName = "Carol",
            LastName  = "White",
            MRN       = ""   // intentionally blank — should be auto-generated
        };

        // Act
        var result = await controller.CreatePatient(newPatient);

        // Assert: HTTP 201 Created
        var created = Assert.IsType<CreatedAtActionResult>(result);
        var patient  = Assert.IsType<Patient>(created.Value);

        Assert.False(string.IsNullOrWhiteSpace(patient.MRN),
            "MRN should have been auto-generated.");
        Assert.StartsWith("MRN-", patient.MRN,
            StringComparison.Ordinal);

        // Verify the patient was persisted
        Assert.Equal(1, await context.Patients.CountAsync());

        // Verify audit was called exactly once
        auditMock.Verify(a => a.LogAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
            "CREATE_PATIENT", "Patient", It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }
}
