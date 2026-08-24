using System;
using System.Threading.Tasks;
using HospitalManagmentSystem.DBContext;
using HospitalManagmentSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagmentSystem.Services
{
    public interface IStaffIdGenerator
    {
        Task<string> GenerateStaffIdAsync(int roleCode);
    }

    public class StaffIdGenerator : IStaffIdGenerator
    {
        private readonly HospitalDbContext _context;

        public StaffIdGenerator(HospitalDbContext context)
        {
            _context = context;
        }

        public async Task<string> GenerateStaffIdAsync(int roleCode)
        {
            var sequence = await _context.StaffRoleSequences.FirstOrDefaultAsync(s => s.RoleCode == roleCode);
            if (sequence == null)
            {
                sequence = new StaffRoleSequence { RoleCode = roleCode, LastSequenceNumber = 0 };
                _context.StaffRoleSequences.Add(sequence);
            }

            sequence.LastSequenceNumber++;
            await _context.SaveChangesAsync();

            // Format: RR NNNN -> e.g. 20 + 0047 = "200047"
            return $"{roleCode}{sequence.LastSequenceNumber:D4}";
        }
    }
}
