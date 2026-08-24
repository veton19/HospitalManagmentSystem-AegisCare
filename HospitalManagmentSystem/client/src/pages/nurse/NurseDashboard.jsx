import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Activity, BedDouble, Pill, ClipboardList, Plus, CheckCircle2, 
  Clock, ShieldCheck, Heart, Thermometer, UserPlus, AlertCircle, Check
} from 'lucide-react';

export const NurseDashboard = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('overview');
  const [admissions, setAdmissions] = useState([]);
  const [carePlans, setCarePlans] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(1);
  const [marData, setMarData] = useState({ prescriptions: [], marRecords: [] });

  // Modal States
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // Form States
  const [vitalInput, setVitalInput] = useState({
    bpSystolic: 120,
    bpDiastolic: 80,
    heartRate: 75,
    temperature: 36.6,
    spO2: 98
  });

  const [intakeInput, setIntakeInput] = useState({
    firstName: '',
    lastName: '',
    dob: '1990-01-01',
    gender: 'Female',
    bloodType: 'O+',
    allergies: 'None'
  });

  useEffect(() => {
    fetchAdmissions();
    fetchCarePlans();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith('/vitals')) { setActiveSection('vitals'); setShowVitalModal(true); }
    else if (path.endsWith('/mar')) setActiveSection('mar');
    else if (path.endsWith('/careplans')) setActiveSection('careplans');
    else setActiveSection('overview');
  }, [location.pathname]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchMAR(selectedPatientId);
    }
  }, [selectedPatientId]);

  const fetchAdmissions = async () => {
    try {
      const res = await fetch('/api/admissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdmissions(data);
        if (data.length > 0) setSelectedPatientId(data[0].patientId);
      }
    } catch (err) {
      console.error('Failed to load admissions:', err);
    }
  };

  const fetchCarePlans = async () => {
    try {
      const res = await fetch('/api/nurse/care-plans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCarePlans(data);
      }
    } catch (err) {
      console.error('Failed to load care plan tasks:', err);
    }
  };

  const fetchMAR = async (patientId) => {
    try {
      const res = await fetch(`/api/nurse/mar?patientId=${patientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMarData(data);
      }
    } catch (err) {
      console.error('Failed to load MAR:', err);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      const res = await fetch(`/api/nurse/care-plans/${taskId}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchCarePlans();
    } catch (err) {
      console.error('Failed to toggle care plan task:', err);
    }
  };

  const handleSaveVitals = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: selectedPatientId,
          nurseId: user.id,
          bloodPressureSystolic: parseInt(vitalInput.bpSystolic),
          bloodPressureDiastolic: parseInt(vitalInput.bpDiastolic),
          heartRate: parseInt(vitalInput.heartRate),
          temperature: parseFloat(vitalInput.temperature),
          spO2: parseInt(vitalInput.spO2)
        })
      });

      if (res.ok) {
        setShowVitalModal(false);
        fetchAdmissions();
      }
    } catch (err) {
      console.error('Failed to record vitals:', err);
    }
  };

  const handleAdministerMed = async (rxId, dosage) => {
    try {
      const res = await fetch('/api/nurse/mar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prescriptionId: rxId,
          patientId: selectedPatientId,
          nurseId: user.id,
          dosageGiven: dosage,
          notes: `Administered on shift by Nurse ${user.lastName}`
        })
      });
      if (res.ok) fetchMAR(selectedPatientId);
    } catch (err) {
      console.error('Failed to log MAR administration:', err);
    }
  };

  const handleCreateIntake = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: intakeInput.firstName,
          lastName: intakeInput.lastName,
          dateOfBirth: intakeInput.dob,
          gender: intakeInput.gender,
          bloodType: intakeInput.bloodType,
          allergies: intakeInput.allergies
        })
      });
      if (res.ok) {
        setShowIntakeModal(false);
        fetchAdmissions();
      }
    } catch (err) {
      console.error('Admission intake failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Nurse Welcome */}
      <div className="glass-panel p-6 border-l-4 border-emerald-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <span>Nursing Station — Shift Dashboard</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
              Nurse: {user.firstName} {user.lastName} ({user.staffId})
            </span>
          </h2>
          <p className="text-sm text-slate-400">
            Assigned Shift: <strong className="text-slate-200">Day Shift</strong> | Emergency & Inpatient Ward Oversight
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowVitalModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20"
          >
            <Activity className="w-4 h-4" /> Quick Vitals Entry
          </button>
          <button
            onClick={() => setShowIntakeModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Admission Intake
          </button>
        </div>
      </div>

      {/* Main Ward & Bed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Inpatient Ward Bed Roster */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-emerald-400" /> Ward Inpatient Beds
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
              {admissions.length} Occupied
            </span>
          </div>

          <div className="space-y-3">
            {admissions.map((adm) => (
              <div
                key={adm.id}
                onClick={() => setSelectedPatientId(adm.patientId)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPatientId === adm.patientId
                    ? 'bg-slate-800/90 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {adm.bedNumber}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{adm.ward}</span>
                </div>
                <div className="mt-2">
                  <div className="font-bold text-sm text-slate-100">
                    {adm.patient?.firstName} {adm.patient?.lastName}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    MRN: {adm.patient?.mrn} | Attending: Dr. {adm.attendingDoctor?.lastName || 'Fleming'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2 Columns: Care Plans & MAR Tracker */}
        <div className="lg:col-span-2 space-y-6">
          {/* MAR Tracker */}
          <div className={`glass-panel p-6 space-y-4 ${activeSection === 'careplans' ? 'order-2' : ''}`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <Pill className="w-5 h-5 text-amber-400" /> Medication Administration Record (MAR)
              </h3>
              <span className="text-xs text-slate-400">Patient ID: {selectedPatientId}</span>
            </div>

            <div className="space-y-4">
              {marData.prescriptions.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No active prescriptions for this patient.</p>
              ) : (
                marData.prescriptions.map((rx) => (
                  <div key={rx.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-slate-100">{rx.drugName} — {rx.dosage}</div>
                      <div className="text-xs text-slate-400">Frequency: {rx.frequency} | Duration: {rx.duration}</div>
                    </div>
                    <button
                      onClick={() => handleAdministerMed(rx.id, rx.dosage)}
                      className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Check className="w-4 h-4" /> Mark Administered
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* MAR Log History */}
            {marData.marRecords.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Shift Administration Log</h4>
                <div className="space-y-1">
                  {marData.marRecords.map((m) => (
                    <div key={m.id} className="text-xs text-slate-400 font-mono flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span>Given: {m.dosageGiven}</span>
                      <span>At: {new Date(m.administeredAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Care Plan Checklist */}
          <div className={`glass-panel p-6 space-y-4 ${activeSection === 'careplans' ? 'order-1 ring-1 ring-teal-500/30' : ''}`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-teal-400" /> Nursing Care Plan Checklist
              </h3>
              <span className="text-xs text-slate-400">{carePlans.length} Total Tasks</span>
            </div>

            <div className="space-y-2">
              {carePlans.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    task.isCompleted
                      ? 'bg-slate-900/40 border-slate-800/80 text-slate-500 line-through'
                      : 'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-teal-500/40'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${task.isCompleted ? 'bg-teal-500 border-teal-500 text-slate-950' : 'border-slate-600'}`}>
                      {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{task.taskDescription}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Patient: {task.patient?.firstName} {task.patient?.lastName}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Due: {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* VITALS ENTRY MODAL */}
      {showVitalModal && (
        <div className="modal-overlay">
          <div className="glass-panel p-6 w-full max-w-md space-y-4 border border-slate-700">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Activity className="w-5 h-5 text-cyan-400" /> Record Patient Vitals
            </h3>
            <form onSubmit={handleSaveVitals} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Systolic BP (mmHg)</label>
                  <input type="number" value={vitalInput.bpSystolic} onChange={(e) => setVitalInput({ ...vitalInput, bpSystolic: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono" required />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Diastolic BP (mmHg)</label>
                  <input type="number" value={vitalInput.bpDiastolic} onChange={(e) => setVitalInput({ ...vitalInput, bpDiastolic: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono" required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Heart Rate (bpm)</label>
                  <input type="number" value={vitalInput.heartRate} onChange={(e) => setVitalInput({ ...vitalInput, heartRate: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono" required />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Temp (°C)</label>
                  <input type="number" step="0.1" value={vitalInput.temperature} onChange={(e) => setVitalInput({ ...vitalInput, temperature: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono" required />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">SpO2 (%)</label>
                  <input type="number" value={vitalInput.spO2} onChange={(e) => setVitalInput({ ...vitalInput, spO2: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono" required />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowVitalModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold">Save Vitals</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMISSION INTAKE MODAL */}
      {showIntakeModal && (
        <div className="modal-overlay">
          <div className="glass-panel p-6 w-full max-w-lg space-y-4 border border-slate-700">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <UserPlus className="w-5 h-5 text-emerald-400" /> New Patient Admission Intake
            </h3>
            <form onSubmit={handleCreateIntake} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    value={intakeInput.firstName}
                    onChange={(e) => setIntakeInput({ ...intakeInput, firstName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    value={intakeInput.lastName}
                    onChange={(e) => setIntakeInput({ ...intakeInput, lastName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={intakeInput.dob}
                    onChange={(e) => setIntakeInput({ ...intakeInput, dob: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Gender</label>
                  <select
                    value={intakeInput.gender}
                    onChange={(e) => setIntakeInput({ ...intakeInput, gender: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Blood Type</label>
                  <select
                    value={intakeInput.bloodType}
                    onChange={(e) => setIntakeInput({ ...intakeInput, bloodType: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Known Allergies</label>
                  <input
                    type="text"
                    value={intakeInput.allergies}
                    onChange={(e) => setIntakeInput({ ...intakeInput, allergies: e.target.value })}
                    placeholder="None"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowIntakeModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold">Register Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
