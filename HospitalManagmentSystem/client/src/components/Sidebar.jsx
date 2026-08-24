import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, UserCheck, Stethoscope, FileText, Pill, FlaskConical, 
  BedDouble, Activity, ClipboardList, ShieldAlert, BarChart3, Users
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return null;

  const portal = location.pathname.startsWith('/doctor') ? 'doctor'
    : location.pathname.startsWith('/nurse') ? 'nurse'
    : location.pathname.startsWith('/admin') ? 'admin'
    : user.role === 'Doctor' ? 'doctor'
    : user.role === 'Nurse' ? 'nurse'
    : 'admin';

  const linkClass = ({ isActive }) =>
    `flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/10 text-cyan-300 border border-teal-500/30 shadow-lg shadow-teal-500/5'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
    }`;

  const portalLabel = portal === 'doctor' ? 'Doctor' : portal === 'nurse' ? 'Nurse' : 'Admin';

  return (
    <aside className="w-64 bg-slate-900/60 backdrop-blur-md border-r border-slate-800 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-61px)]">
      <div className="space-y-6">
        {user.role === 'Admin' && (
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 block mb-2">
              Portal Switcher
            </span>
            <NavLink to="/admin" className={linkClass}>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Admin Panel</span>
            </NavLink>
            <NavLink to="/doctor" className={linkClass}>
              <Stethoscope className="w-4 h-4 text-cyan-400" />
              <span>Doctor View</span>
            </NavLink>
            <NavLink to="/nurse" className={linkClass}>
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Nurse View</span>
            </NavLink>
          </div>
        )}

        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 block mb-2">
            {portalLabel} Portal Navigation
          </span>

          <nav className="space-y-1">
            {portal === 'doctor' && (
              <>
                <NavLink to="/doctor" end className={linkClass}>
                  <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                  <span>Doctor Dashboard</span>
                </NavLink>
                <NavLink to="/doctor/charts" className={linkClass}>
                  <UserCheck className="w-4 h-4 text-teal-400" />
                  <span>Patient Charts & History</span>
                </NavLink>
                <NavLink to="/doctor/soap" className={linkClass}>
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>SOAP Clinical Notes</span>
                </NavLink>
                <NavLink to="/doctor/prescriptions" className={linkClass}>
                  <Pill className="w-4 h-4 text-emerald-400" />
                  <span>e-Prescribing & Alerts</span>
                </NavLink>
                <NavLink to="/doctor/labs" className={linkClass}>
                  <FlaskConical className="w-4 h-4 text-amber-400" />
                  <span>Lab Orders & Results</span>
                </NavLink>
                <NavLink to="/doctor/adt" className={linkClass}>
                  <BedDouble className="w-4 h-4 text-rose-400" />
                  <span>Inpatient ADT & Beds</span>
                </NavLink>
              </>
            )}

            {portal === 'nurse' && (
              <>
                <NavLink to="/nurse" end className={linkClass}>
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  <span>Ward Overview</span>
                </NavLink>
                <NavLink to="/nurse/vitals" className={linkClass}>
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Vitals Entry & Trends</span>
                </NavLink>
                <NavLink to="/nurse/mar" className={linkClass}>
                  <Pill className="w-4 h-4 text-amber-400" />
                  <span>MAR Admin Tracker</span>
                </NavLink>
                <NavLink to="/nurse/careplans" className={linkClass}>
                  <ClipboardList className="w-4 h-4 text-teal-400" />
                  <span>Care Plan Tasks</span>
                </NavLink>
              </>
            )}

            {portal === 'admin' && (
              <>
                <NavLink to="/admin" end className={linkClass}>
                  <LayoutDashboard className="w-4 h-4 text-amber-400" />
                  <span>Admin Dashboard</span>
                </NavLink>
                <NavLink to="/admin/staff" className={linkClass}>
                  <Users className="w-4 h-4 text-teal-400" />
                  <span>Staff & 6-Digit IDs</span>
                </NavLink>
                <NavLink to="/admin/audit" className={linkClass}>
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>System Audit Logs</span>
                </NavLink>
                <NavLink to="/admin/analytics" className={linkClass}>
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>Occupancy Analytics</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </div>

      <div className="glass-panel p-3 border border-slate-800 text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <span>Active Role Code</span>
          <span className="font-mono text-cyan-400 font-bold">{user.roleCode} ({user.role})</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Staff ID Scheme</span>
          <span className="font-mono text-emerald-400 font-bold">RR NNNN</span>
        </div>
      </div>
    </aside>
  );
};
