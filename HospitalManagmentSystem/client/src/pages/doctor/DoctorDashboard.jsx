import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, Clock, User, FileText, Pill, FlaskConical, BedDouble, 
  Search, Plus, CheckCircle2, AlertTriangle, Activity, Check, Heart, Thermometer, ShieldCheck
} from 'lucide-react';

export const DoctorDashboard = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedPatientChart, setSelectedPatientChart] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, chart, soap, rx, labs, adt

  // Modal States
  const [showSoapModal, setShowSoapModal] = useState(false);
  const [showRxModal, setShowRxModal] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [showAdtModal, setShowAdtModal] = useState(false);

  // Form Inputs
  const [soapData, setSoapData] = useState({ subjective: '', objective: '', assessment: '', plan: '', icd10: 'I10' });
  const [rxData, setRxData] = useState({ drugName: '', dosage: '500mg', frequency: 'Twice daily', duration: '7 Days' });
  const [rxCheckAlert, setRxCheckAlert] = useState(null);
  const [labData, setLabData] = useState({ testName: 'Complete Blood Count (CBC)', category: 'Hematology' });
  const [adtData, setAdtData] = useState({ ward: 'Cardiology Ward A', bedNumber: 'Bed-105', notes: '' });

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith('/charts')) setActiveTab('chart');
    else if (path.endsWith('/soap')) { setActiveTab('soap'); if (selectedPatientChart) setShowSoapModal(true); }
    else if (path.endsWith('/prescriptions')) { setActiveTab('rx'); if (selectedPatientChart) setShowRxModal(true); }
    else if (path.endsWith('/labs')) { setActiveTab('labs'); if (selectedPatientChart) setShowLabModal(true); }
    else if (path.endsWith('/adt')) { setActiveTab('adt'); if (selectedPatientChart) setShowAdtModal(true); }
    else setActiveTab('overview');
  }, [location.pathname]);

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch(`/api/patients?search=${search}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.error('Failed to load patients:', err);
    }
  };

  const loadPatientChart = async (patientId) => {
    try {
      const res = await fetch(`/api/patients/${patientId}/chart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedPatientChart(data);
        setActiveTab('chart');
      }
    } catch (err) {
      console.error('Failed to load patient chart:', err);
    }
  };

  // Submit SOAP Note with Digital Signature
  const handleSaveSoapNote = async (e) => {
    e.preventDefault();
    if (!selectedPatientChart) return;

    try {
      const encounterId = selectedPatientChart.encounters?.[0]?.id || 0;
      const res = await fetch('/api/soapnotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: selectedPatientChart.patient.id,
          doctorId: user.id,
          encounterId,
          subjective: soapData.subjective,
          objective: soapData.objective,
          assessment: soapData.assessment,
          plan: soapData.plan,
          icd10Codes: soapData.icd10,
          isDigitallySigned: true
        })
      });

      if (res.ok) {
        setShowSoapModal(false);
        setSoapData({ subjective: '', objective: '', assessment: '', plan: '', icd10: 'I10' });
        loadPatientChart(selectedPatientChart.patient.id);
      }
    } catch (err) {
      console.error('Failed to save SOAP note:', err);
    }
  };

  // Drug Interaction & Allergy Check
  const handleCheckInteraction = async () => {
    if (!selectedPatientChart || !rxData.drugName) return;
    try {
      const res = await fetch(`/api/prescriptions/check-interactions?patientId=${selectedPatientChart.patient.id}&drugName=${encodeURIComponent(rxData.drugName)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRxCheckAlert(data);
      }
    } catch (err) {
      console.error('Interaction check failed:', err);
    }
  };

  // Submit e-Prescription
  const handleSavePrescription = async (e) => {
    e.preventDefault();
    if (!selectedPatientChart) return;

    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: selectedPatientChart.patient.id,
          doctorId: user.id,
          drugName: rxData.drugName,
          dosage: rxData.dosage,
          frequency: rxData.frequency,
          duration: rxData.duration
        })
      });

      if (res.ok) {
        setShowRxModal(false);
        setRxData({ drugName: '', dosage: '500mg', frequency: 'Twice daily', duration: '7 Days' });
        setRxCheckAlert(null);
        loadPatientChart(selectedPatientChart.patient.id);
      }
    } catch (err) {
      console.error('Failed to issue prescription:', err);
    }
  };

  // Submit Lab Order
  const handleSaveLabOrder = async (e) => {
    e.preventDefault();
    if (!selectedPatientChart) return;

    try {
      const res = await fetch('/api/labs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: selectedPatientChart.patient.id,
          doctorId: user.id,
          testName: labData.testName,
          category: labData.category
        })
      });

      if (res.ok) {
        setShowLabModal(false);
        loadPatientChart(selectedPatientChart.patient.id);
      }
    } catch (err) {
      console.error('Failed to create lab order:', err);
    }
  };

  // Submit Inpatient Admission
  const handleSaveAdmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientChart) return;

    try {
      const res = await fetch('/api/admissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: selectedPatientChart.patient.id,
          attendingDoctorId: user.id,
          ward: adtData.ward,
          bedNumber: adtData.bedNumber,
          admissionNotes: adtData.notes
        })
      });

      if (res.ok) {
        setShowAdtModal(false);
        loadPatientChart(selectedPatientChart.patient.id);
      }
    } catch (err) {
      console.error('Failed to admit patient:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Doctor Welcome */}
      <div className="glass-panel p-6 border-l-4 border-cyan-400 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <span>Welcome back, Dr. {user.lastName}</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-semibold">
              License: {user.licenseNumber || 'DOC-99482'}
            </span>
          </h2>
          <p className="text-sm text-slate-400">
            Specialty: <strong className="text-slate-200">{user.specialty || 'Cardiology'}</strong> | Attending Physician
          </p>
        </div>

        {/* Quick Patient Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search Patient Name or MRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPatients()}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* Main Grid: Schedule & Active Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Appointments & Search Results */}
        <div className="space-y-6">
          {/* Appointments Widget */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" /> Today's Schedule
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {appointments.length} Appointments
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {appointments.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No appointments scheduled for today.</p>
              ) : (
                appointments.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => loadPatientChart(apt.patientId)}
                    className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm text-slate-200">{apt.patientName}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="font-mono text-cyan-400">{apt.patientMRN}</span>
                        <span>•</span>
                        <span>{apt.reason}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-semibold text-slate-300 block">
                        {new Date(apt.appointmentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-semibold">
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Patients Directory */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <User className="w-4 h-4 text-teal-400" /> My Patients
              </h3>
              <span className="text-xs text-slate-400">{patients.length} Assigned</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {patients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => loadPatientChart(p.id)}
                  className="p-3 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/60 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-sm text-slate-200">{p.firstName} {p.lastName}</div>
                    <div className="text-xs text-slate-400 font-mono">{p.mrn} | {p.gender}, {p.bloodType}</div>
                  </div>
                  <span className="text-xs text-cyan-400 font-medium hover:underline">Open Chart →</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Patient Chart & Clinical Workflows */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPatientChart ? (
            <div className="glass-panel p-6 space-y-6">
              {/* Patient Demographics Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-slate-100">
                      {selectedPatientChart.patient.firstName} {selectedPatientChart.patient.lastName}
                    </h3>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      {selectedPatientChart.patient.mrn}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 space-x-3">
                    <span>Blood Type: <strong className="text-slate-200">{selectedPatientChart.patient.bloodType}</strong></span>
                    <span>•</span>
                    <span className="text-rose-400 font-semibold">Allergies: {selectedPatientChart.patient.allergies}</span>
                  </div>
                </div>

                {/* Clinical Action Trigger Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowSoapModal(true)}
                    className="px-3 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <FileText className="w-4 h-4" /> SOAP Note
                  </button>
                  <button
                    onClick={() => setShowRxModal(true)}
                    className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Pill className="w-4 h-4" /> e-Prescribe
                  </button>
                  <button
                    onClick={() => setShowLabModal(true)}
                    className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <FlaskConical className="w-4 h-4" /> Order Lab
                  </button>
                  <button
                    onClick={() => setShowAdtModal(true)}
                    className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <BedDouble className="w-4 h-4" /> Admit / ADT
                  </button>
                </div>
              </div>

              {/* Latest Vitals Summary */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> Recent Vitals & Physical Signs
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedPatientChart.vitals.length > 0 ? (
                    <>
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                        <div className="text-[11px] text-slate-500">Blood Pressure</div>
                        <div className="text-lg font-bold text-slate-100 font-mono">
                          {selectedPatientChart.vitals[0].bloodPressureSystolic}/{selectedPatientChart.vitals[0].bloodPressureDiastolic}
                        </div>
                        <div className="text-[10px] text-slate-400">mmHg</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                        <div className="text-[11px] text-slate-500">Heart Rate</div>
                        <div className="text-lg font-bold text-rose-400 font-mono">
                          {selectedPatientChart.vitals[0].heartRate} <span className="text-xs">bpm</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                        <div className="text-[11px] text-slate-500">Temperature</div>
                        <div className="text-lg font-bold text-amber-400 font-mono">
                          {selectedPatientChart.vitals[0].temperature} <span className="text-xs">°C</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                        <div className="text-[11px] text-slate-500">SpO2 (Oxygen)</div>
                        <div className="text-lg font-bold text-teal-400 font-mono">
                          {selectedPatientChart.vitals[0].spO2}%
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 col-span-4 py-2">No vitals recorded yet for this patient.</p>
                  )}
                </div>
              </div>

              {/* Patient History Sections (SOAP Notes, Prescriptions, Labs) */}
              <div className="space-y-6">
                {/* SOAP Clinical Notes Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" /> Clinical Notes & SOAP Entries
                    </span>
                    <span className="text-xs text-slate-400">{selectedPatientChart.clinicalNotes.length} Notes</span>
                  </h4>

                  <div className="space-y-3">
                    {selectedPatientChart.clinicalNotes.length === 0 ? (
                      <p className="text-xs text-slate-500 py-3">No SOAP notes recorded.</p>
                    ) : (
                      selectedPatientChart.clinicalNotes.map((note) => (
                        <div key={note.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                            <span className="font-semibold text-cyan-300">
                              Dr. {note.doctor?.lastName || 'Fleming'} ({note.doctor?.staffId})
                            </span>
                            <div className="flex items-center gap-2 text-slate-400 font-mono">
                              <span>ICD-10: <strong className="text-indigo-400">{note.icd10Codes}</strong></span>
                              <span>•</span>
                              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div><strong className="text-slate-400 block">S (Subjective):</strong> {note.subjective}</div>
                            <div><strong className="text-slate-400 block">O (Objective):</strong> {note.objective}</div>
                            <div><strong className="text-slate-400 block">A (Assessment):</strong> {note.assessment}</div>
                            <div><strong className="text-slate-400 block">P (Plan):</strong> {note.plan}</div>
                          </div>
                          {note.isDigitallySigned && (
                            <div className="pt-2 text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                              <ShieldCheck className="w-3.5 h-3.5" /> Digitally Signed: {note.digitalSignatureHash}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Prescriptions & Lab Results */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Active Prescriptions */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
                      <Pill className="w-4 h-4 text-emerald-400" /> Active Prescriptions
                    </h4>
                    <div className="space-y-2">
                      {selectedPatientChart.prescriptions.map((rx) => (
                        <div key={rx.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-100">{rx.drugName} ({rx.dosage})</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">{rx.status}</span>
                          </div>
                          <div className="text-slate-400">{rx.frequency} — Duration: {rx.duration}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lab Results with Abnormal Flags */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-amber-400" /> Lab Results & Abnormal Flags
                    </h4>
                    <div className="space-y-2">
                      {selectedPatientChart.labOrders.map((lab) => (
                        <div key={lab.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{lab.testName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${lab.status === 'Completed' ? 'bg-teal-500/20 text-teal-300' : 'bg-amber-500/20 text-amber-300'}`}>
                              {lab.status}
                            </span>
                          </div>
                          {lab.result ? (
                            <div className="flex items-center justify-between pt-1 font-mono">
                              <span className="text-slate-300">{lab.result.value} {lab.result.unit}</span>
                              {lab.result.isAbnormal && (
                                <span className="badge-abnormal text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> ABNORMAL (Ref: {lab.result.referenceRange})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-slate-500 italic">Result pending lab tech analysis...</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 text-center space-y-3 border border-slate-800">
              <User className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-semibold text-slate-300">No Patient Chart Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select an appointment from your schedule on the left or search your assigned patients to open a chart.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SOAP NOTE MODAL */}
      {showSoapModal && (
        <div className="modal-overlay">
          <div className="glass-panel p-6 w-full max-w-xl space-y-4 border border-slate-700">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="w-5 h-5 text-indigo-400" /> Create Clinical SOAP Note
            </h3>
            <form onSubmit={handleSaveSoapNote} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Subjective (Symptoms & Complaints)</label>
                <textarea
                  rows={2}
                  value={soapData.subjective}
                  onChange={(e) => setSoapData({ ...soapData, subjective: e.target.value })}
                  placeholder="Patient reports dyspnea, chest discomfort..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-400"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Objective (Vitals & Physical Exam)</label>
                <textarea
                  rows={2}
                  value={soapData.objective}
                  onChange={(e) => setSoapData({ ...soapData, objective: e.target.value })}
                  placeholder="BP 142/90, HR 88bpm, S1 S2 normal..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-400"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Assessment / Diagnosis</label>
                  <input
                    type="text"
                    value={soapData.assessment}
                    onChange={(e) => setSoapData({ ...soapData, assessment: e.target.value })}
                    placeholder="Essential Hypertension"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ICD-10 Code</label>
                  <input
                    type="text"
                    value={soapData.icd10}
                    onChange={(e) => setSoapData({ ...soapData, icd10: e.target.value })}
                    placeholder="I10, R06.02"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Plan & Interventions</label>
                <textarea
                  rows={2}
                  value={soapData.plan}
                  onChange={(e) => setSoapData({ ...soapData, plan: e.target.value })}
                  placeholder="Prescribe Lisinopril 10mg, order ECG..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-400"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1 font-mono"><ShieldCheck className="w-4 h-4" /> Digital Signature Lock</span>
                <span>Dr. {user.lastName} ({user.staffId})</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowSoapModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-500 text-slate-950 font-bold">Sign & Save Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRESCRIPTION MODAL */}
      {showRxModal && (
        <div className="modal-overlay">
          <div className="glass-panel p-6 w-full max-w-md space-y-4 border border-slate-700">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Pill className="w-5 h-5 text-emerald-400" /> e-Prescribe Medication
            </h3>
            <form onSubmit={handleSavePrescription} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Drug Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rxData.drugName}
                    onChange={(e) => setRxData({ ...rxData, drugName: e.target.value })}
                    placeholder="e.g. Lisinopril, Penicillin"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleCheckInteraction}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold shrink-0"
                  >
                    Check Allergy
                  </button>
                </div>
              </div>

              {rxCheckAlert && (
                <div className={`p-3 rounded-xl text-xs border ${rxCheckAlert.passed ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'}`}>
                  {rxCheckAlert.message}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Dosage</label>
                  <input type="text" value={rxData.dosage} onChange={(e) => setRxData({ ...rxData, dosage: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Frequency</label>
                  <input type="text" value={rxData.frequency} onChange={(e) => setRxData({ ...rxData, frequency: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100" />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Duration</label>
                  <input type="text" value={rxData.duration} onChange={(e) => setRxData({ ...rxData, duration: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowRxModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold">Issue e-Rx</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LAB ORDER MODAL */}
      {showLabModal && (
        <div className="modal-overlay">
          <div className="glass-panel p-6 w-full max-w-md space-y-4 border border-slate-700">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <FlaskConical className="w-5 h-5 text-amber-400" /> Order Lab Test
            </h3>
            <form onSubmit={handleSaveLabOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Test Name</label>
                <input
                  type="text"
                  value={labData.testName}
                  onChange={(e) => setLabData({ ...labData, testName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Category</label>
                <select
                  value={labData.category}
                  onChange={(e) => setLabData({ ...labData, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="Hematology">Hematology</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Radiology">Radiology</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowLabModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold">Submit Lab Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADT ADMISSION MODAL */}
      {showAdtModal && (
        <div className="modal-overlay">
          <div className="glass-panel p-6 w-full max-w-md space-y-4 border border-slate-700">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <BedDouble className="w-5 h-5 text-rose-400" /> Admit Patient (ADT)
            </h3>
            <form onSubmit={handleSaveAdmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Ward</label>
                <input
                  type="text"
                  value={adtData.ward}
                  onChange={(e) => setAdtData({ ...adtData, ward: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-rose-400"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Bed Number</label>
                <input
                  type="text"
                  value={adtData.bedNumber}
                  onChange={(e) => setAdtData({ ...adtData, bedNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none focus:border-rose-400"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Admission Notes</label>
                <textarea
                  rows={3}
                  value={adtData.notes}
                  onChange={(e) => setAdtData({ ...adtData, notes: e.target.value })}
                  placeholder="Reason for admission, initial assessment..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-rose-400"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdtModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-rose-500 text-slate-950 font-bold">Admit Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
