using System;
using System.Threading.Tasks;
using HospitalManagmentSystem.DBContext;
using HospitalManagmentSystem.Models;

namespace HospitalManagmentSystem.Services
{
    public interface IAuditService
    {
        Task LogAsync(string staffId, string staffName, string role, string action, string entityName, string entityId, string details, string ipAddress = "");
    }

    public class AuditService : IAuditService
    {
        private readonly HospitalDbContext _context;

        public AuditService(HospitalDbContext context)
        {
            _context = context;
        }

        public async Task LogAsync(string staffId, string staffName, string role, string action, string entityName, string entityId, string details, string ipAddress = "")
        {
            var log = new AuditLog
            {
                Timestamp = DateTime.UtcNow,
                StaffId = staffId,
                StaffName = staffName,
                Role = role,
                Action = action,
                EntityName = entityName,
                EntityId = entityId,
                Details = details,
                IpAddress = string.IsNullOrEmpty(ipAddress) ? "127.0.0.1" : ipAddress
            };

            _context.AuditLogs.Add(log);
            await _context.SaveChangesAsync();
        }
    }
}
