import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, KeyRound, AlertCircle, Activity, User } from 'lucide-react';

export const Login = () => {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, loading, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate(getDashboardPath(user.role), { replace: true });
    }
  }, [user, loading, navigate, getDashboardPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(staffId.trim())) {
      setError('Staff ID must be exactly 6 digits (RR NNNN format, e.g. 200001, 300001, 100001).');
      return;
    }

    setIsSubmitting(true);
    try {
      const staff = await login(staffId.trim(), password);
      navigate(getDashboardPath(staff.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check Staff ID and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (id, pass) => {
    setStaffId(id);
    setPassword(pass);
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-teal-400">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-teal-500 via-cyan-500 to-blue-600 text-slate-950 shadow-xl shadow-cyan-500/20">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-300 via-cyan-100 to-white bg-clip-text text-transparent">
            AegisCare EHR
          </h1>
          <p className="text-sm text-slate-400">
            Enterprise Medical Record System & Staff Auth Gateway
          </p>
        </div>

        <div className="glass-panel p-8 space-y-6 border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" /> 6-Digit Staff ID Authentication
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">RR NNNN</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Staff ID (6 Digits)
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="e.g. 200001"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono tracking-widest text-lg font-bold transition-all"
                  required
                />
                <User className="w-5 h-5 absolute right-3 top-3.5 text-slate-500" />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                10xxxx = Admin | 20xxxx = Doctor | 30xxxx = Nurse | 40xxxx = Pharmacist | 50xxxx = LabTech | 60xxxx = Receptionist
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Account Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  required
                />
                <KeyRound className="w-5 h-5 absolute right-3 top-3.5 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/25 transition-all duration-200 disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying Credentials...' : 'Authenticate & Sign In'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block text-center">
              Quick One-Click Demo Staff Accounts
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('100001', 'Admin123!')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-amber-500/30 text-left transition-all"
              >
                <div className="text-xs font-bold text-amber-400">Admin</div>
                <div className="text-[10px] text-slate-400 font-mono">100001</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('200001', 'Doctor123!')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-blue-500/30 text-left transition-all"
              >
                <div className="text-xs font-bold text-blue-400">Doctor</div>
                <div className="text-[10px] text-slate-400 font-mono">200001</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('300001', 'Nurse123!')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-emerald-500/30 text-left transition-all"
              >
                <div className="text-xs font-bold text-emerald-400">Nurse</div>
                <div className="text-[10px] text-slate-400 font-mono">300001</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('400001', 'Pharmacist123!')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-violet-500/40 text-left transition-all ring-1 ring-violet-500/20"
              >
                <div className="text-xs font-bold text-violet-400">Pharmacist</div>
                <div className="text-[10px] text-slate-400 font-mono">400001</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('500001', 'LabTech123!')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-amber-500/30 text-left transition-all"
              >
                <div className="text-xs font-bold text-amber-400">LabTech</div>
                <div className="text-[10px] text-slate-400 font-mono">500001</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('600001', 'Receptionist123!')}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-pink-500/30 text-left transition-all"
              >
                <div className="text-xs font-bold text-pink-400">Receptionist</div>
                <div className="text-[10px] text-slate-400 font-mono">600001</div>
              </button>
            </div>
            <div className="flex justify-center gap-2 pt-1 text-[11px] text-slate-500">
              <span>Other shifts:</span>
              <button
                type="button"
                onClick={() => handleQuickFill('400002', 'Pharmacist123!')}
                className="text-violet-400 hover:underline font-mono"
              >
                400002 (Night)
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => handleQuickFill('400003', 'Pharmacist123!')}
                className="text-violet-400 hover:underline font-mono"
              >
                400003 (Rotation)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
