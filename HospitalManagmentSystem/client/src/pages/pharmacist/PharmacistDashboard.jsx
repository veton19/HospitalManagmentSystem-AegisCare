import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Pill, Package, ClipboardCheck, Clock, AlertTriangle, Check, User, Plus,
  Search, RefreshCw, XCircle, ChevronDown, ChevronUp, Layers, Activity
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   Shift badge helper
───────────────────────────────────────────────────────────────── */
const ShiftBadge = ({ shiftType }) => {
  const config = {
    Night:    { icon: '🌙', label: 'Night Shift',    cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    Day:      { icon: '☀️', label: 'Day Shift',      cls: 'bg-amber-500/20  text-amber-300  border-amber-500/30'  },
    Rotating: { icon: '🔄', label: 'Rotation Shift', cls: 'bg-teal-500/20   text-teal-300   border-teal-500/30'   },
  };
  const c = config[shiftType] ?? config.Day;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${c.cls}`}>
      <span>{c.icon}</span>{c.label}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Stock level badge
───────────────────────────────────────────────────────────────── */
const StockBadge = ({ qty, reorder }) => {
  if (qty === 0)
    return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-600/25 text-rose-300 border border-rose-600/30">OUT</span>;
  if (qty <= reorder)
    return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">LOW</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">OK</span>;
};

/* ─────────────────────────────────────────────────────────────────
   Request status badge
───────────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    Pending:        'bg-amber-500/20 text-amber-300',
    Verified:       'bg-cyan-500/20 text-cyan-300',
    ReleasedToNurse:'bg-emerald-500/20 text-emerald-300',
    Rejected:       'bg-rose-500/20 text-rose-300',
  };
  const label = status === 'ReleasedToNurse' ? 'Given to Nurse' : status;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${map[status] ?? 'bg-slate-700 text-slate-300'}`}>
      {label}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────── */
export const PharmacistDashboard = () => {
  const { token, user } = useAuth();
  const location = useLocation();

  /* ── State ── */
  const [tab, setTab] = useState('requests');
  const [stats, setStats] = useState(null);
  const [medications, setMedications] = useState([]);
  const [requests, setRequests] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [selectedNurse, setSelectedNurse] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [medSearch, setMedSearch] = useState('');
  const [medCategory, setMedCategory] = useState('All');
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [restock, setRestock] = useState({ name: '', strength: '', form: 'Tablet', unit: 'units', addQuantity: 20, reorderLevel: 20, category: 'General' });
  const [stockQuery, setStockQuery] = useState({ drugName: '', quantity: 1 });
  const [stockResult, setStockResult] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  /* ── Route → tab sync ── */
  useEffect(() => {
    if (location.pathname.endsWith('/inventory'))   setTab('inventory');
    else if (location.pathname.endsWith('/stock-check')) setTab('stock');
    else setTab('requests');
  }, [location.pathname]);

  /* ── Data fetchers ── */
  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/pharmacy/stats', { headers: h });
    if (res.ok) setStats(await res.json());
  }, [token]);

  const fetchMedications = useCallback(async () => {
    const qs = new URLSearchParams();
    if (medSearch) qs.set('search', medSearch);
    if (medCategory && medCategory !== 'All') qs.set('category', medCategory);
    const res = await fetch(`/api/pharmacy/medications?${qs}`, { headers: h });
    if (res.ok) setMedications(await res.json());
  }, [token, medSearch, medCategory]);

  const fetchRequests = useCallback(async () => {
    const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    const res = await fetch(`/api/pharmacy/requests${qs}`, { headers: h });
    if (res.ok) setRequests(await res.json());
  }, [token, statusFilter]);

  const fetchNurses = useCallback(async () => {
    const res = await fetch('/api/pharmacy/nurses', { headers: h });
    if (res.ok) {
      const data = await res.json();
      setNurses(data);
      if (data.length > 0) setSelectedNurse(data[0].id);
    }
  }, [token]);

  const refreshAll = useCallback(() => {
    fetchStats();
    fetchRequests();
    fetchMedications();
    fetchNurses();
  }, [fetchStats, fetchRequests, fetchMedications, fetchNurses]);

  useEffect(() => { refreshAll(); }, []);
  useEffect(() => { fetchRequests(); }, [statusFilter]);
  useEffect(() => { fetchMedications(); }, [medSearch, medCategory]);

  /* ── Flash message helpers ── */
  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); }
  };

  /* ── Request actions ── */
  const handleVerify = async (id) => {
    const res = await fetch(`/api/pharmacy/requests/${id}/verify`, { method: 'POST', headers: h });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { flash(data.message || 'Could not verify request.', true); return; }
    flash('✅ 1st approval done — stock reserved.');
    refreshAll();
  };

  const handleRelease = async (id) => {
    if (!selectedNurse) { flash('Select a nurse before the 2nd approval.', true); return; }
    const res = await fetch(`/api/pharmacy/requests/${id}/release-to-nurse`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ receivingNurseId: selectedNurse, notes: 'Dispensed to ward nurse' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { flash(data.message || 'Could not release medication.', true); return; }
    flash('✅ Medication released to nurse.');
    refreshAll();
  };

  const handleReject = async (id) => {
    const res = await fetch(`/api/pharmacy/requests/${id}/reject`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ notes: rejectReason || 'Rejected by pharmacy' })
    });
    if (res.ok) {
      setRejectId(null); setRejectReason('');
      flash('Request rejected.', false);
      refreshAll();
    }
  };

  /* ── Inventory actions ── */
  const handleRestock = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/pharmacy/medications', {
      method: 'POST', headers: h,
      body: JSON.stringify({
        name: restock.name,
        strength: restock.strength,
        form: restock.form,
        unit: restock.unit,
        category: restock.category,
        reorderLevel: parseInt(restock.reorderLevel, 10) || 20,
        addQuantity: parseInt(restock.addQuantity, 10) || 0
      })
    });
    if (res.ok) {
      setRestock({ name: '', strength: '', form: 'Tablet', unit: 'units', addQuantity: 20, reorderLevel: 20, category: 'General' });
      flash('✅ Medication inventory updated.');
      fetchMedications();
      fetchStats();
    } else {
      const d = await res.json().catch(() => ({}));
      flash(d.message || 'Failed to update inventory.', true);
    }
  };

  const handleToggleActive = async (med) => {
    const res = await fetch(`/api/pharmacy/medications/${med.id}`, {
      method: 'PUT', headers: h,
      body: JSON.stringify({ isActive: !med.isActive })
    });
    if (res.ok) { flash(`'${med.name}' ${med.isActive ? 'deactivated' : 'reactivated'}.`); fetchMedications(); fetchStats(); }
  };

  /* ── Stock check ── */
  const handleStockCheck = async (e) => {
    e.preventDefault();
    setStockLoading(true); setStockResult(null);
    const res = await fetch(`/api/pharmacy/stock?drugName=${encodeURIComponent(stockQuery.drugName)}&quantity=${stockQuery.quantity}`, { headers: h });
    if (res.ok) setStockResult(await res.json());
    setStockLoading(false);
  };

  /* ── Derived ── */
  const shiftType = user?.shiftType || 'Day';
  const categories = ['All', 'General', 'Antibiotic', 'Analgesic', 'Cardiac', 'Diabetic', 'Psychiatric', 'Oncology', 'Respiratory', 'Gastrointestinal'];

  return (
    <div className="space-y-6">

      {/* ─── Header ─── */}
      <div className="glass-panel p-5 border-l-4 border-violet-400 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Pill className="w-6 h-6 text-violet-400" />
            Pharmacy Dispensary
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <ShiftBadge shiftType={shiftType} />
            <span className="text-slate-600">|</span>
            <span className="font-mono text-slate-300">{user?.firstName} {user?.lastName}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">ID {user?.staffId}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">Lic. {user?.licenseNumber || 'PHARM'}</span>
          </div>
        </div>

        {/* KPI chips */}
        {stats && (
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <div className="px-3 py-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />{stats.pendingCount} awaiting 1st approval
            </div>
            <div className="px-3 py-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />{stats.verifiedCount} awaiting nurse handover
            </div>
            <div className="px-3 py-2 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />{stats.lowStockCount} low stock
            </div>
            {stats.outOfStockCount > 0 && (
              <div className="px-3 py-2 rounded-xl bg-rose-700/20 text-rose-200 border border-rose-700/30 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />{stats.outOfStockCount} out of stock
              </div>
            )}
            <div className="px-3 py-2 rounded-xl bg-slate-700/40 text-slate-300 border border-slate-700/50 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />{stats.totalMeds} total meds
            </div>
          </div>
        )}
      </div>

      {/* ─── Flash messages ─── */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" /> {successMsg}
        </div>
      )}

      {/* ─── Tab strip ─── */}
      <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
        {[
          { id: 'requests',  icon: <ClipboardCheck className="w-4 h-4" />, label: 'Doctor Requests' },
          { id: 'inventory', icon: <Package className="w-4 h-4" />,        label: 'Medication Inventory' },
          { id: 'stock',     icon: <Search className="w-4 h-4" />,         label: 'Stock Check' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
        <button
          onClick={refreshAll}
          className="ml-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TAB 1 — REQUESTS
      ═══════════════════════════════════════════════════════ */}
      {tab === 'requests' && (
        <div className="space-y-4">
          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Filter:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="">All statuses</option>
                <option value="Pending">Pending (1st approval)</option>
                <option value="Verified">Verified (hand to nurse)</option>
                <option value="ReleasedToNurse">Released to nurse</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Receiving nurse (2nd approval):</span>
              <select
                value={selectedNurse}
                onChange={e => setSelectedNurse(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {nurses.length === 0 && <option value="">No nurses available</option>}
                {nurses.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.firstName} {n.lastName} ({n.staffId}) — {n.shiftType}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Request cards */}
          {requests.length === 0 ? (
            <div className="glass-panel p-12 text-center text-slate-500 text-sm">
              No medication requests{statusFilter ? ` with status "${statusFilter}"` : ''}.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="glass-panel p-4 space-y-3 border-l-2 border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-base">{req.drugName}</span>
                        <span className="text-slate-400 text-sm">× {req.quantityRequested} {req.unit}</span>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>Patient: <strong className="text-slate-200">{req.patient?.firstName} {req.patient?.lastName}</strong> ({req.patient?.mrn})</span>
                        <span>Dr. {req.doctor?.lastName} ({req.doctor?.staffId})</span>
                        <span className="text-slate-500">{new Date(req.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3">
                        {req.dosage && <span>Dosage: {req.dosage}</span>}
                        {req.frequency && <span>Freq: {req.frequency}</span>}
                        {req.duration && <span>Duration: {req.duration}</span>}
                        {req.remainingStock != null && (
                          <span className={req.remainingStock === 0 ? 'text-rose-400 font-semibold' : 'text-slate-500'}>
                            Stock after reserve: {req.remainingStock} {req.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Approval trail */}
                  {req.verifiedBy && (
                    <div className="text-[11px] text-cyan-300 flex items-center gap-1">
                      <Check className="w-3 h-3" /> 1st approved by {req.verifiedBy.firstName} {req.verifiedBy.lastName}
                      {req.verifiedAt && <span className="text-slate-500 ml-1">· {new Date(req.verifiedAt).toLocaleTimeString()}</span>}
                    </div>
                  )}
                  {req.receivingNurse && (
                    <div className="text-[11px] text-emerald-300 flex items-center gap-1">
                      <Check className="w-3 h-3" /><Check className="w-3 h-3 -ml-2" /> 2nd approved — given to Nurse {req.receivingNurse.firstName} {req.receivingNurse.lastName} ({req.receivingNurse.staffId})
                      {req.releasedAt && <span className="text-slate-500 ml-1">· {new Date(req.releasedAt).toLocaleTimeString()}</span>}
                    </div>
                  )}
                  {req.notes && req.status === 'Rejected' && (
                    <div className="text-[11px] text-rose-300">Rejection reason: {req.notes}</div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {req.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleVerify(req.id)}
                          className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-200 border border-violet-500/40 text-xs font-bold flex items-center gap-1 hover:bg-violet-500/30 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> 1st Approve (verify stock)
                        </button>
                        <button
                          onClick={() => setRejectId(rejectId === req.id ? null : req.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/25 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {req.status === 'Verified' && (
                      <>
                        <button
                          onClick={() => handleRelease(req.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 hover:bg-emerald-500/30 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /><Check className="w-3.5 h-3.5 -ml-2" /> 2nd Approve (release to nurse)
                        </button>
                        <button
                          onClick={() => setRejectId(rejectId === req.id ? null : req.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/25 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>

                  {/* Reject reason inline form */}
                  {rejectId === req.id && (
                    <div className="flex gap-2 items-center mt-1">
                      <input
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Rejection reason (optional)…"
                        className="flex-1 bg-slate-900 border border-rose-500/40 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600/25 text-rose-200 border border-rose-600/40 text-xs font-bold hover:bg-rose-600/40 transition-colors"
                      >
                        Confirm Reject
                      </button>
                      <button
                        onClick={() => { setRejectId(null); setRejectReason(''); }}
                        className="px-2 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 2 — INVENTORY
      ═══════════════════════════════════════════════════════ */}
      {tab === 'inventory' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left — full medication list */}
          <div className="xl:col-span-2 glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" /> Medication Inventory
                <span className="text-xs text-slate-500 font-normal">{medications.length} listed</span>
              </h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    value={medSearch}
                    onChange={e => setMedSearch(e.target.value)}
                    placeholder="Search medications…"
                    className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 w-44 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <select
                  value={medCategory}
                  onChange={e => setMedCategory(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2 max-h-[36rem] overflow-y-auto pr-1">
              {medications.length === 0 && (
                <p className="text-xs text-slate-500 py-8 text-center">No medications found.</p>
              )}
              {medications.map(m => (
                <div key={m.id} className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${m.isActive ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-900/30 border-slate-800/50 opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-100 flex items-center gap-2 flex-wrap">
                      {m.name}
                      {m.strength && <span className="text-slate-400 font-normal text-xs">{m.strength}</span>}
                      <StockBadge qty={m.quantityOnHand} reorder={m.reorderLevel} />
                      {!m.isActive && <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-700 text-slate-400">INACTIVE</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {m.form} · {m.category} · Reorder at {m.reorderLevel} {m.unit}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-mono font-bold text-sm ${m.isOutOfStock ? 'text-rose-400' : m.isLowStock ? 'text-amber-400' : 'text-emerald-300'}`}>
                      {m.quantityOnHand} <span className="text-slate-500 font-normal text-xs">{m.unit}</span>
                    </div>
                    <button
                      onClick={() => handleToggleActive(m)}
                      className={`text-[10px] mt-0.5 px-2 py-0.5 rounded border transition-colors ${
                        m.isActive
                          ? 'text-slate-500 border-slate-700 hover:text-rose-300 hover:border-rose-500/40'
                          : 'text-emerald-500 border-emerald-700/50 hover:text-emerald-300'
                      }`}
                    >
                      {m.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — add/restock form + legend */}
          <div className="space-y-4">
            <div className="glass-panel p-5 space-y-3">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Plus className="w-4 h-4 text-amber-400" /> Add / Restock Medication
              </h3>
              <form onSubmit={handleRestock} className="space-y-2 text-xs">
                <input
                  value={restock.name}
                  onChange={e => setRestock({ ...restock, name: e.target.value })}
                  placeholder="Medication name *"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={restock.strength}
                    onChange={e => setRestock({ ...restock, strength: e.target.value })}
                    placeholder="Strength (e.g. 500mg)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <select
                    value={restock.form}
                    onChange={e => setRestock({ ...restock, form: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Infusion', 'Inhaler', 'Cream', 'Drops'].map(f => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 mb-1">Add Quantity</label>
                    <input
                      type="number" min="1"
                      value={restock.addQuantity}
                      onChange={e => setRestock({ ...restock, addQuantity: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Reorder Level</label>
                    <input
                      type="number" min="0"
                      value={restock.reorderLevel}
                      onChange={e => setRestock({ ...restock, reorderLevel: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>
                <select
                  value={restock.category}
                  onChange={e => setRestock({ ...restock, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                </select>
                <button type="submit" className="w-full py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-slate-950 font-bold transition-colors">
                  Update Stock
                </button>
              </form>
            </div>

            {/* Legend */}
            <div className="glass-panel p-4 space-y-2 text-xs text-slate-500">
              <p className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-violet-400" /> Stock is reserved on 1st approval. Nurses receive it only after 2nd approval.</p>
              <p className="flex items-center gap-1.5"><Pill className="w-3 h-3 text-amber-400" /> Doctors cannot prescribe a drug that is out of stock or missing from the formulary.</p>
              <p className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-rose-400" /> Deactivated medications are hidden from the formulary and cannot be prescribed.</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 3 — STOCK CHECK
      ═══════════════════════════════════════════════════════ */}
      {tab === 'stock' && (
        <div className="max-w-xl space-y-5">
          <div className="glass-panel p-5 space-y-4">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Search className="w-4 h-4 text-violet-400" /> Quick Stock Check
            </h3>
            <p className="text-xs text-slate-400">
              Verify medication availability for a given quantity. Useful during shift handover or before dispensing.
            </p>
            <form onSubmit={handleStockCheck} className="space-y-3">
              <input
                value={stockQuery.drugName}
                onChange={e => setStockQuery({ ...stockQuery, drugName: e.target.value })}
                placeholder="Drug name (e.g. Amoxicillin)"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 block mb-1">Quantity to check</label>
                  <input
                    type="number" min="1"
                    value={stockQuery.quantity}
                    onChange={e => setStockQuery({ ...stockQuery, quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={stockLoading}
                    className="px-6 py-3 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition-colors"
                  >
                    {stockLoading ? 'Checking…' : 'Check Stock'}
                  </button>
                </div>
              </div>
            </form>

            {/* Result */}
            {stockResult && (
              <div className={`p-4 rounded-xl border mt-2 ${
                !stockResult.inStock
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                  : stockResult.available <= stockResult.requested * 2
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
              }`}>
                <div className="font-bold text-base flex items-center gap-2 mb-1">
                  {stockResult.inStock ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  {stockResult.message}
                </div>
                {stockResult.inStock && (
                  <div className="text-xs text-slate-400 space-y-0.5 mt-2">
                    <div><span className="text-slate-300 font-medium">Medication:</span> {stockResult.name}</div>
                    <div><span className="text-slate-300 font-medium">Available:</span> {stockResult.available} {stockResult.unit}</div>
                    <div><span className="text-slate-300 font-medium">Requested:</span> {stockResult.requested} {stockResult.unit}</div>
                    <div><span className="text-slate-300 font-medium">Remaining after dispense:</span> {stockResult.available - stockResult.requested} {stockResult.unit}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Low stock alert list */}
          {stats && stats.lowStockCount > 0 && (
            <div className="glass-panel p-5 space-y-3">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Low / Out-of-Stock Alert
              </h3>
              <p className="text-xs text-slate-400">{stats.lowStockCount} medications are at or below their reorder level.</p>
              <button
                onClick={() => { setTab('inventory'); setMedSearch(''); }}
                className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2"
              >
                → Go to Inventory to restock
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
