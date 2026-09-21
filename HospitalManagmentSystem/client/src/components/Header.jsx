import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut, ShieldCheck, User, Activity, AlertTriangle } from 'lucide-react';

export const Header = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const getRoleBadgeClass = (role) => {
    if (role === 'Admin') return 'badge-admin';
    if (role === 'Doctor') return 'badge-doctor';
    if (role === 'Nurse') return 'badge-nurse';
    if (role === 'Pharmacist') return 'badge-pharmacist';
    return 'bg-slate-700 text-slate-200';
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between">
      {/* Brand & System Mode */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-slate-950 font-bold">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-300 via-cyan-200 to-white bg-clip-text text-transparent">
              AegisCare Clinical
            </h1>
            <p className="text-xs text-slate-400 font-medium">Enterprise EHR & Hospital Ops</p>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Live Security Boundary: JWT Claims Active</span>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center space-x-4">
        {/* Notifications Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-700/50"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel p-4 z-50 shadow-2xl border border-slate-700">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <h4 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-cyan-400" /> Clinical Notifications
                </h4>
                <span className="text-xs text-slate-400">{notifications.length} alerts</span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No unread notifications.</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200 flex items-center gap-1">
                          {n.type === 'CriticalLab' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-500">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Staff Profile Badge */}
        {user && (
          <div className="flex items-center space-x-3 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center font-bold text-cyan-400 border border-slate-700">
              {user.firstName ? user.firstName[0] : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-slate-200">{user.firstName} {user.lastName}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getRoleBadgeClass(user.role)}`}>
                  {user.role}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>ID: {user.staffId}</span>
              </div>
            </div>

            <button
              onClick={() => { logout(); navigate('/login', { replace: true }); }}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ml-2"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
