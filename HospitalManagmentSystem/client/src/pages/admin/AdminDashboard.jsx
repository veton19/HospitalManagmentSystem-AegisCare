import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, UserPlus, ShieldAlert, BarChart3, Activity, Check, X, 
  Search, ShieldCheck, Lock, BedDouble, AlertCircle, RefreshCw
} from 'lucide-react';

export const AdminDashboard = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const [metrics, setMetrics] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('staff'); // staff, audit, analytics

  // Staff Creation Modal
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    roleCode: 20, // Doctor by default
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: 'Password123!',
    specialty: 'Cardiology',
    licenseNumber: 'DOC-10020',
    shiftType: 'Day'
  });

  useEffect(() => {
    fetchMetrics();
    fetchStaff();
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith('/staff')) setActiveTab('staff');
    else if (path.endsWith('/audit')) setActiveTab('audit');
    else if (path.endsWith('/analytics')) setActiveTab('analytics');
    else setActiveTab('staff');
  }, [location.pathname]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error('Failed to load staff:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/auditlog', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roleCode: parseInt(newStaff.roleCode),
          firstName: newStaff.firstName,
          lastName: newStaff.lastName,
          email: newStaff.email,
          phoneNumber: newStaff.phoneNumber,
          password: newStaff.password,
          specialty: newStaff.specialty,
          licenseNumber: newStaff.licenseNumber,
          shiftType: newStaff.shiftType
        })
      });

      if (res.ok) {
        setShowStaffModal(false);
        setNewStaff({
          roleCode: 20,
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          password: 'Password123!',
          specialty: 'Cardiology',
          licenseNumber: 'DOC-10020',
          shiftType: 'Day'
        });
        fetchStaff();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Staff registration failed:', err);
    }
  };

  const handleToggleStatus = async (staffGuid, currentStatus) => {
    try {
      const res = await fetch(`/api/staff/${staffGuid}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(!currentStatus)
      });
      if (res.ok) {
        fetchStaff();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // 6-Digit ID Prefix helper preview
  const getRolePrefix = (code) => {
    const c = parseInt(code);
    if (c === 10) return '10 (Admin)';
    if (c === 20) return '20 (Doctor)';
    if (c === 30) return '30 (Nurse)';
    if (c === 40) return '40 (Pharmacist)';
    if (c === 50) return '50 (Lab Tech)';
    if (c === 60) return '60 (Receptionist)';
    return `${code} (Custom)`;
  };

  return (
    <div className="space-y-6">
      {/* Top Admin Banner */}
      <div className="glass-panel p-6 border-l-4 border-amber-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <span>Admin Control Panel & System Oversight</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono font-semibold">
              SuperAdmin ID: {user.staffId}
            </span>
          </h2>
          <p className="text-sm text-slate-400">
            6-Digit Staff Scheme Enforcement • JWT Role Security Boundary • System Audit Trail
          </p>
        </div>

        <button
          onClick={() => setShowStaffModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <UserPlus className="w-4 h-4" /> Register New Staff (Auto 6-Digit ID)
        </button>
      </div>

      {/* Hospital Metrics KPI Grid */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-panel p-4 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Total Registered Patients</div>
            <div className="text-2xl font-bold text-slate-100 font-mono mt-1">{metrics.totalPatients}</div>
          </div>
          <div className="glass-panel p-4 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Active Staff Accounts</div>
            <div className="text-2xl font-bold text-teal-400 font-mono mt-1">{metrics.totalStaff}</div>
          </div>
          <div className="glass-panel p-4 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Admitted Inpatients</div>
            <div className="text-2xl font-bold text-rose-400 font-mono mt-1">{metrics.activeAdmissions}</div>
          </div>
          <div className="glass-panel p-4 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Bed Occupancy Rate</div>
            <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{metrics.occupancyRatePercent}%</div>
          </div>
          <div className="glass-panel p-4 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Today's Appointments</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">{metrics.todayAppointments}</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 flex items-center gap-2 transition-all ${activeTab === 'staff' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Users className="w-4 h-4" /> Staff Management & 6-Digit IDs
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 flex items-center gap-2 transition-all ${activeTab === 'audit' ? 'text-rose-400 border-b-2 border-rose-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <ShieldAlert className="w-4 h-4" /> Security Audit Log Review
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 flex items-center gap-2 transition-all ${activeTab === 'analytics' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <BarChart3 className="w-4 h-4" /> Occupancy Analytics
        </button>
      </div>

      {/* TAB 1: STAFF MANAGEMENT */}
      {activeTab === 'staff' && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" /> Active Staff Roster (6-Digit ID Format RR NNNN)
            </h3>
            <span className="text-xs text-slate-400">{staffList.length} Accounts Registered</span>
          </div>

          <div className="overflow-x-auto">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>6-Digit Staff ID</th>
                  <th>Role & Code</th>
                  <th>Staff Name</th>
                  <th>Email & Phone</th>
                  <th>License / Specialty</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono font-bold text-cyan-300 text-sm">
                      {s.staffId}
                    </td>
                    <td>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${s.role === 'Admin' ? 'badge-admin' : s.role === 'Doctor' ? 'badge-doctor' : 'badge-nurse'}`}>
                        {s.role} ({s.roleCode})
                      </span>
                    </td>
                    <td className="font-semibold text-slate-200">{s.firstName} {s.lastName}</td>
                    <td className="text-slate-400 text-xs">{s.email}<br />{s.phoneNumber}</td>
                    <td className="text-slate-400 text-xs">
                      {s.specialty ? `Spec: ${s.specialty}` : (s.shiftType ? `Shift: ${s.shiftType}` : 'Admin')}
                    </td>
                    <td>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${s.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {s.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleStatus(s.id, s.isActive)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${s.isActive ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'}`}
                      >
                        {s.isActive ? 'Deactivate' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" /> HIPAA / Healthcare Access Audit Trail
            </h3>
            <span className="text-xs text-slate-400">Showing Last {auditLogs.length} Events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Staff ID</th>
                  <th>Staff Member</th>
                  <th>Action Event</th>
                  <th>Target Entity</th>
                  <th>Audit Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono text-xs text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="font-mono text-xs font-bold text-amber-300">{log.staffId}</td>
                    <td className="text-xs text-slate-200 font-semibold">{log.staffName} ({log.role})</td>
                    <td>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="text-xs text-slate-400 font-mono">{log.entityName} #{log.entityId}</td>
                    <td className="text-xs text-slate-300 max-w-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: OCCUPANCY ANALYTICS */}
      {activeTab === 'analytics' && metrics && (
        <div className="glass-panel p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" /> Hospital Occupancy & Operations Analytics
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-300">Bed Occupancy</h4>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Occupancy Rate</span>
                  <span className="text-2xl font-bold text-amber-400 font-mono">{metrics.occupancyRatePercent}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(metrics.occupancyRatePercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>{metrics.activeAdmissions} admitted</span>
                  <span>Capacity utilization</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-300">Daily Operations</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                  <BedDouble className="w-6 h-6 text-rose-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-slate-100 font-mono">{metrics.activeAdmissions}</div>
                  <div className="text-[11px] text-slate-400">Active Admissions</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                  <Activity className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-slate-100 font-mono">{metrics.todayAppointments}</div>
                  <div className="text-[11px] text-slate-400">Today's Appointments</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                  <Users className="w-6 h-6 text-teal-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-slate-100 font-mono">{metrics.totalStaff}</div>
                  <div className="text-[11px] text-slate-400">Active Staff</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                  <BarChart3 className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <div className="text-xl font-bold text-slate-100 font-mono">{metrics.totalPatients}</div>
                  <div className="text-[11px] text-slate-400">Total Patients</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER STAFF MODAL */}
      {showStaffModal && (
        <div className="modal-overlay">
          <div className="glass-panel p-6 w-full max-w-lg space-y-4 border border-slate-700">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <UserPlus className="w-5 h-5 text-amber-400" /> Register Staff (Auto 6-Digit ID)
            </h3>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Staff Role & 2-Digit Prefix (RR)</label>
                <select
                  value={newStaff.roleCode}
                  onChange={(e) => setNewStaff({ ...newStaff, roleCode: parseInt(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-bold focus:outline-none focus:border-amber-400"
                >
                  <option value={10}>10 - Administrator (10xxxx)</option>
                  <option value={20}>20 - Doctor (20xxxx)</option>
                  <option value={30}>30 - Nurse (30xxxx)</option>
                  <option value={40}>40 - Pharmacist (40xxxx)</option>
                  <option value={50}>50 - Lab Technician (50xxxx)</option>
                  <option value={60}>60 - Receptionist (60xxxx)</option>
                </select>
                <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[11px]">
                  ID Scheme Preview: <strong>{newStaff.roleCode}NNNN</strong> (Auto-assigned zero-padded sequential 4-digits)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    value={newStaff.firstName}
                    onChange={(e) => setNewStaff({ ...newStaff, firstName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newStaff.lastName}
                    onChange={(e) => setNewStaff({ ...newStaff, lastName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Account Password</label>
                  <input
                    type="password"
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono"
                    required
                  />
                </div>
              </div>

              {newStaff.roleCode === 20 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Medical Specialty</label>
                    <input type="text" value={newStaff.specialty} onChange={(e) => setNewStaff({ ...newStaff, specialty: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100" />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">License Number</label>
                    <input type="text" value={newStaff.licenseNumber} onChange={(e) => setNewStaff({ ...newStaff, licenseNumber: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono" />
                  </div>
                </div>
              )}

              {newStaff.roleCode === 30 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Shift Type</label>
                    <select value={newStaff.shiftType} onChange={(e) => setNewStaff({ ...newStaff, shiftType: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100">
                      <option value="Day">Day Shift</option>
                      <option value="Night">Night Shift</option>
                      <option value="Rotating">Rotating</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">License Number</label>
                    <input type="text" value={newStaff.licenseNumber} onChange={(e) => setNewStaff({ ...newStaff, licenseNumber: e.target.value })} placeholder="RN-10030" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono" />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowStaffModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold">Generate 6-Digit ID & Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
