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

public class StaffControllerTests
{
    // ── helpers ──────────────────────────────────────────────────────────────

    private static HospitalDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<HospitalDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return new HospitalDbContext(options);
    }

    private static StaffController CreateController(
        HospitalDbContext context,
        IStaffIdGenerator idGenerator,
        IAuditService auditService)
    {
        var controller = new StaffController(context, idGenerator, auditService);

        var user = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Name, "admin"),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim("staff_id", "100001")
        ], "TestAuth"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        return controller;
    }

    // ── Test 1: POST /api/staff returns 400 when required fields are missing ──

    [Fact]
    public async Task CreateStaff_ReturnsBadRequest_WhenRequiredFieldsMissing()
    {
        // Arrange
        var context   = CreateInMemoryContext(nameof(CreateStaff_ReturnsBadRequest_WhenRequiredFieldsMissing));
        var idGenMock = new Mock<IStaffIdGenerator>();
        var auditMock = new Mock<IAuditService>();
        var controller = CreateController(context, idGenMock.Object, auditMock.Object);

        var badRequest = new StaffController.CreateStaffRequest
        {
            RoleCode  = 20,
            FirstName = "",       // required – missing
            LastName  = "",       // required – missing
            Password  = "",       // required – missing
            Email     = "x@x.com"
        };

        // Act
        var result = await controller.CreateStaff(badRequest);

        // Assert
        var bad = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(bad.Value);
        idGenMock.Verify(g => g.GenerateStaffIdAsync(It.IsAny<int>()), Times.Never);
    }

    // ── Test 2: POST /api/staff creates a doctor and returns 201 ─────────────

    [Fact]
    public async Task CreateStaff_CreatesDoctor_AndReturns201()
    {
        // Arrange
        var context = CreateInMemoryContext(nameof(CreateStaff_CreatesDoctor_AndReturns201));

        var idGenMock = new Mock<IStaffIdGenerator>();
        idGenMock.Setup(g => g.GenerateStaffIdAsync(20))
                 .ReturnsAsync("200001");

        var auditMock = new Mock<IAuditService>();
        auditMock
            .Setup(a => a.LogAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var controller = CreateController(context, idGenMock.Object, auditMock.Object);

        var request = new StaffController.CreateStaffRequest
        {
            RoleCode  = 20,
            FirstName = "Alice",
            LastName  = "Wonder",
            Email     = "alice@hospital.com",
            PhoneNumber = "0123456789",
            Password  = "Secure@123",
            Specialty = "Neurology",
            LicenseNumber = "LIC-99999"
        };

        // Act
        var result = await controller.CreateStaff(request);

        // Assert HTTP 201
        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.NotNull(created.Value);

        // Assert staff was persisted
        Assert.Equal(1, await context.Staff.CountAsync());

        // Assert doctor detail was also persisted
        Assert.Equal(1, await context.DoctorDetails.CountAsync());

        // Assert audit log was triggered once
        auditMock.Verify(a => a.LogAsync(
            It.IsAny<string>(), It.IsAny<string>(), "Admin",
            "CREATE_STAFF", "Staff", "200001",
            It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }

    // ── Test 3: PUT /api/staff/{id}/status returns 404 for unknown staff ──────

    [Fact]
    public async Task ToggleStaffStatus_ReturnsNotFound_WhenStaffDoesNotExist()
    {
        // Arrange
        var context   = CreateInMemoryContext(nameof(ToggleStaffStatus_ReturnsNotFound_WhenStaffDoesNotExist));
        var idGenMock = new Mock<IStaffIdGenerator>();
        var auditMock = new Mock<IAuditService>();
        var controller = CreateController(context, idGenMock.Object, auditMock.Object);

        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await controller.ToggleStaffStatus(nonExistentId, isActive: false);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }
}
