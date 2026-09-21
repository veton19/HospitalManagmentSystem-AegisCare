import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  UserCheck, UserPlus, Calendar, Users, Clock, Search,
  CheckCircle2, AlertTriangle, ChevronRight, X, RefreshCw,
  Stethoscope, Activity, FileText, Phone, MapPin, Heart,
  ShieldAlert, ArrowRight, User
} from "lucide-react";

export const ReceptionistDashboard = () => {
  const { token, user } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("overview"); // overview, register, appointments, workload
  const [loading, setLoading] = useState(false);

  // Data states
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [staffDirectory, setStaffDirectory] = useState([]);

  // Search & Filter states
  const [patientSearch, setPatientSearch] = useState("");
  const [appointmentDoctorFilter, setAppointmentDoctorFilter] = useState("all");
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("all");
  const [appointmentDateFilter, setAppointmentDateFilter] = useState("");

  // Modals
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPatientForAssign, setSelectedPatientForAssign] = useState(null);

  // Feedback states
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  // Registration Form State
  const initialPatientForm = {
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "Male",
    bloodType: "O+",
    allergies: "None known",
    contactNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    primaryDoctorId: "",
    primaryNurseId: "",
  };
  const [patientForm, setPatientForm] = useState(initialPatientForm);
  const [registering, setRegistering] = useState(false);

  // Appointment Form State
  const initialAppointmentForm = {
    patientId: "",
    doctorId: "",
    appointmentDateTime: "",
    reason: "General Consultation",
    notes: "",
  };
  const [appointmentForm, setAppointmentForm] = useState(initialAppointmentForm);
  const [scheduling, setScheduling] = useState(false);

  // Assignment Modal Form State
  const [assignmentForm, setAssignmentForm] = useState({
    primaryDoctorId: "",
    primaryNurseId: "",
  });
  const [assigning, setAssigning] = useState(false);

  // Sync route with tab
  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith("/register")) setActiveTab("register");
    else if (path.endsWith("/appointments")) setActiveTab("appointments");
    else if (path.endsWith("/workload")) setActiveTab("workload");
    else setActiveTab("overview");
  }, [location.pathname]);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = () => {
    fetchPatients();
    fetchAppointments();
    fetchStaffDirectory();
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch("/api/patients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPatients(await res.json());
    } catch (err) {
      console.error("Failed to load patients:", err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch("/api/appointments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAppointments(await res.json());
    } catch (err) {
      console.error("Failed to load appointments:", err);
    }
  };

  const fetchStaffDirectory = async () => {
    try {
      const res = await fetch("/api/staff/directory", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStaffDirectory(await res.json());
    } catch (err) {
      console.error("Failed to load staff directory:", err);
    }
  };

  const doctorsList = staffDirectory.filter((s) => s.roleCode === 20);
  const nursesList = staffDirectory.filter((s) => s.roleCode === 30);
  const unassignedPatients = patients.filter((p) => !p.primaryDoctorId);

  // Filtered Appointments
  const filteredAppointments = appointments.filter((apt) => {
    if (appointmentDoctorFilter !== "all" && apt.doctorId !== appointmentDoctorFilter) return false;
    if (appointmentStatusFilter !== "all" && apt.status !== appointmentStatusFilter) return false;
    if (appointmentDateFilter) {
      const aptDate = new Date(apt.appointmentDateTime).toISOString().split("T")[0];
      if (aptDate !== appointmentDateFilter) return false;
    }
    return true;
  });

  // Filtered Patients
  const filteredPatients = patients.filter((p) => {
    if (!patientSearch) return true;
    const s = patientSearch.toLowerCase().trim();
    const fullName = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase();
    const mrn = (p.mrn || "").toLowerCase();
    return fullName.includes(s) || mrn.includes(s);
  });

  // Handle Patient Registration Submit
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegistering(true);
    setFeedbackError("");
    setFeedbackSuccess("");

    try {
      const payload = {
        firstName: patientForm.firstName.trim(),
        lastName: patientForm.lastName.trim(),
        dateOfBirth: patientForm.dateOfBirth,
        gender: patientForm.gender,
        bloodType: patientForm.bloodType,
        allergies: patientForm.allergies || "None known",
        contactNumber: patientForm.contactNumber,
        address: patientForm.address,
        emergencyContactName: patientForm.emergencyContactName,
        emergencyContactPhone: patientForm.emergencyContactPhone,
        primaryDoctorId: patientForm.primaryDoctorId || null,
        primaryNurseId: patientForm.primaryNurseId || null,
      };

      const res = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        setFeedbackSuccess(`Patient ${created.firstName} ${created.lastName} registered successfully with MRN ${created.mrn}!`);
        setPatientForm(initialPatientForm);
        fetchPatients();
        fetchStaffDirectory();
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedbackError(err.message || "Failed to register patient.");
      }
    } catch (err) {
      setFeedbackError("Network error. Please try again.");
    }
    setRegistering(false);
  };

  // Handle Schedule Appointment Submit
  const handleScheduleAppointment = async (e) => {
    e.preventDefault();
    if (!appointmentForm.patientId || !appointmentForm.doctorId) {
      setFeedbackError("Please select both a patient and a doctor.");
      return;
    }
    setScheduling(true);
    setFeedbackError("");
    setFeedbackSuccess("");

    try {
      const payload = {
        patientId: parseInt(appointmentForm.patientId, 10),
        doctorId: appointmentForm.doctorId,
        appointmentDateTime: appointmentForm.appointmentDateTime,
        reason: appointmentForm.reason,
        notes: appointmentForm.notes || "",
        status: "Scheduled",
      };

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setFeedbackSuccess("Appointment scheduled successfully.");
        setAppointmentForm(initialAppointmentForm);
        setShowAppointmentModal(false);
        fetchAppointments();
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedbackError(err.message || "Failed to schedule appointment.");
      }
    } catch (err) {
      setFeedbackError("Network error. Please try again.");
    }
    setScheduling(false);
  };

  // Handle Appointment Status Update
  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newStatus),
      });
      if (res.ok) {
        fetchAppointments();
      }
    } catch (err) {
      console.error("Failed to update appointment status:", err);
    }
  };

  // Open Assign Modal for a specific patient
  const openAssignModal = (patient) => {
    setSelectedPatientForAssign(patient);
    setAssignmentForm({
      primaryDoctorId: patient.primaryDoctorId || "",
      primaryNurseId: patient.primaryNurseId || "",
    });
    setFeedbackError("");
    setFeedbackSuccess("");
    setShowAssignModal(true);
  };

  // Handle Assign Submit
  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!selectedPatientForAssign) return;
    setAssigning(true);
    setFeedbackError("");
    setFeedbackSuccess("");

    try {
      const res = await fetch(`/api/patients/${selectedPatientForAssign.id}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          primaryDoctorId: assignmentForm.primaryDoctorId || null,
          primaryNurseId: assignmentForm.primaryNurseId || null,
        }),
      });

      if (res.ok) {
        setFeedbackSuccess(`Patient assignment updated for ${selectedPatientForAssign.firstName} ${selectedPatientForAssign.lastName}.`);
        setShowAssignModal(false);
        fetchPatients();
        fetchStaffDirectory();
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedbackError(err.message || "Failed to update patient assignment.");
      }
    } catch (err) {
      setFeedbackError("Network error. Please try again.");
    }
    setAssigning(false);
  };

  // Status badge styling
  const statusBadge = (status) => {
    const map = {
      Scheduled: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
      Completed: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
      Cancelled: "bg-slate-700/40 text-slate-400 border border-slate-700",
      NoShow: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
    };
    return map[status] || "bg-slate-800 text-slate-300";
  };

  // Patient count load badge helper
  const workloadBadge = (count) => {
    if (count < 5) return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
    if (count <= 10) return "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30";
    return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 border-l-4 border-pink-500 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-pink-400" />
            Reception & Patient Intake Portal
            <span className="text-xs px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 font-mono font-semibold">
              {user.staffId}
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {user.firstName} {user.lastName} — Front Desk & Patient Care Coordination
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveTab("appointments")}
            className="text-center px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-all"
          >
            <div className="text-2xl font-bold text-blue-300">{appointments.length}</div>
            <div className="text-[11px] text-slate-400 font-semibold">Appointments</div>
          </div>
          <div
            onClick={() => setActiveTab("workload")}
            className="text-center px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-all"
          >
            <div className="text-2xl font-bold text-amber-300">{unassignedPatients.length}</div>
            <div className="text-[11px] text-slate-400 font-semibold">Unassigned</div>
          </div>
          <div
            onClick={() => setActiveTab("register")}
            className="text-center px-4 py-2 rounded-xl bg-pink-500/10 border border-pink-500/20 cursor-pointer hover:bg-pink-500/20 transition-all"
          >
            <div className="text-2xl font-bold text-pink-300">{patients.length}</div>
            <div className="text-[11px] text-slate-400 font-semibold">Total Patients</div>
          </div>
          <button
            onClick={fetchAllData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Refresh All"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {feedbackSuccess && (
        <div className="p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
          <button onClick={() => setFeedbackSuccess("")} className="text-teal-400 hover:text-teal-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {feedbackError && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{feedbackError}</span>
          </div>
          <button onClick={() => setFeedbackError("")} className="text-rose-400 hover:text-rose-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === "overview"
              ? "bg-pink-500/20 text-pink-300 border border-pink-500/40"
              : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          <UserCheck className="w-4 h-4" /> Overview
        </button>
        <button
          onClick={() => setActiveTab("register")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === "register"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          <UserPlus className="w-4 h-4" /> Register Patient
        </button>
        <button
          onClick={() => setActiveTab("appointments")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === "appointments"
              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
              : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" /> Appointments
          {appointments.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-slate-950 text-[10px] font-bold">
              {appointments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("workload")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === "workload"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" /> Staff Workload & Assign
          {unassignedPatients.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
              {unassignedPatients.length} unassigned
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab("register")}
              className="glass-panel p-5 cursor-pointer hover:border-emerald-500/50 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 group-hover:scale-105 transition-all">
                  <UserPlus className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-all" />
              </div>
              <h3 className="font-bold text-slate-100 text-base">Register New Patient</h3>
              <p className="text-xs text-slate-400 mt-1">
                Intake new arrivals, collect demographics, allergies, emergency contacts, and assign primary doctor & nurse.
              </p>
            </div>

            <div
              onClick={() => {
                setShowAppointmentModal(true);
              }}
              className="glass-panel p-5 cursor-pointer hover:border-blue-500/50 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 rounded-xl bg-blue-500/20 text-blue-300 group-hover:scale-105 transition-all">
                  <Calendar className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-all" />
              </div>
              <h3 className="font-bold text-slate-100 text-base">Schedule Appointment</h3>
              <p className="text-xs text-slate-400 mt-1">
                Book patient visits with available doctors, view schedule availability, and specify reasons for visit.
              </p>
            </div>

            <div
              onClick={() => setActiveTab("workload")}
              className="glass-panel p-5 cursor-pointer hover:border-amber-500/50 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 rounded-xl bg-amber-500/20 text-amber-300 group-hover:scale-105 transition-all">
                  <Users className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-all" />
              </div>
              <h3 className="font-bold text-slate-100 text-base">Manage Staff Workloads</h3>
              <p className="text-xs text-slate-400 mt-1">
                View live patient counts for each doctor and nurse. Balance case loads and assign unassigned patients.
              </p>
            </div>
          </div>

          {/* Side by side: Upcoming Appointments & Unassigned Patients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Appointments */}
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Upcoming Scheduled Appointments
                </h3>
                <button
                  onClick={() => setActiveTab("appointments")}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                >
                  View All ({appointments.length}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {appointments.filter((a) => a.status === "Scheduled").length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No scheduled appointments pending.</p>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {appointments
                    .filter((a) => a.status === "Scheduled")
                    .slice(0, 6)
                    .map((apt) => (
                      <div
                        key={apt.id}
                        className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{apt.patientName}</span>
                            <span className="font-mono text-cyan-400 text-[10px]">({apt.patientMRN})</span>
                          </div>
                          <div className="text-slate-400 flex items-center gap-2">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                            <span>Dr. {apt.doctorName}</span>
                            <span>•</span>
                            <span className="italic">{apt.reason}</span>
                          </div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(apt.appointmentDateTime).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${statusBadge(apt.status)}`}>
                            {apt.status}
                          </span>
                          <button
                            onClick={() => handleUpdateAppointmentStatus(apt.id, "Completed")}
                            className="text-[10px] px-2 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 font-medium transition-all"
                          >
                            Mark Arrived / Done
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Unassigned Patients */}
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Patients Needing Care Team Assignment
                </h3>
                <span className="text-xs text-amber-400 font-bold">{unassignedPatients.length} unassigned</span>
              </div>

              {unassignedPatients.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-teal-500 mx-auto" />
                  <p className="text-slate-300 font-semibold text-xs">All patients assigned!</p>
                  <p className="text-[11px] text-slate-500">Every patient has an assigned primary doctor.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {unassignedPatients.slice(0, 6).map((patient) => (
                    <div
                      key={patient.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-amber-500/20 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{patient.firstName} {patient.lastName}</span>
                          <span className="font-mono text-cyan-400 text-[10px]">({patient.mrn})</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            {patient.bloodType}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Registered: {new Date(patient.createdAt).toLocaleDateString()}
                          {patient.contactNumber && ` · Phone: ${patient.contactNumber}`}
                        </div>
                        <div className="text-amber-300/80 text-[11px] flex items-center gap-1">
                          <span>Doctor: None assigned</span>
                          <span>•</span>
                          <span>Nurse: {patient.primaryNurse ? `Nurse ${patient.primaryNurse.lastName}` : "None"}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => openAssignModal(patient)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold shrink-0 transition-all flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Assign Team
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTER PATIENT */}
      {activeTab === "register" && (
        <div className="glass-panel p-6 space-y-6 max-w-3xl mx-auto">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              Patient Registration & Care Intake
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Enter patient information below. Medical Record Number (MRN) is automatically generated by the EHR.
            </p>
          </div>

          <form onSubmit={handleRegisterPatient} className="space-y-4 text-xs">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John"
                  value={patientForm.firstName}
                  onChange={(e) => setPatientForm({ ...patientForm, firstName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Doe"
                  value={patientForm.lastName}
                  onChange={(e) => setPatientForm({ ...patientForm, lastName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={patientForm.dateOfBirth}
                  onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Gender *</label>
                <select
                  value={patientForm.gender}
                  onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Blood Type</label>
                <select
                  value={patientForm.bloodType}
                  onChange={(e) => setPatientForm({ ...patientForm, bloodType: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+1-555-0199"
                  value={patientForm.contactNumber}
                  onChange={(e) => setPatientForm({ ...patientForm, contactNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Known Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Peanuts (or None known)"
                  value={patientForm.allergies}
                  onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Residential Address</label>
              <input
                type="text"
                placeholder="Street address, city, state, postal code"
                value={patientForm.address}
                onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe (Spouse)"
                  value={patientForm.emergencyContactName}
                  onChange={(e) => setPatientForm({ ...patientForm, emergencyContactName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Emergency Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+1-555-0911"
                  value={patientForm.emergencyContactPhone}
                  onChange={(e) => setPatientForm({ ...patientForm, emergencyContactPhone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Care Team Assignment Upon Registration */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="font-semibold text-slate-200 flex items-center justify-between">
                <span>Assign Initial Care Team (Optional)</span>
                <span className="text-[10px] text-slate-500 font-normal">Shows current active patient load</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Primary Attending Doctor</label>
                  <select
                    value={patientForm.primaryDoctorId}
                    onChange={(e) => setPatientForm({ ...patientForm, primaryDoctorId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
                  >
                    <option value="">-- Assign Later --</option>
                    {doctorsList.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.firstName} {doc.lastName} ({doc.specialty || "General"}) — {doc.patientCount} patients
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Primary Assigned Nurse</label>
                  <select
                    value={patientForm.primaryNurseId}
                    onChange={(e) => setPatientForm({ ...patientForm, primaryNurseId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
                  >
                    <option value="">-- Assign Later --</option>
                    {nursesList.map((nur) => (
                      <option key={nur.id} value={nur.id}>
                        Nurse {nur.firstName} {nur.lastName} ({nur.shiftType || "General"}) — {nur.patientCount} patients
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPatientForm(initialPatientForm)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all font-semibold"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={registering}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold transition-all flex items-center gap-2"
              >
                {registering ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Complete Registration
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: APPOINTMENTS */}
      {activeTab === "appointments" && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Hospital Appointments Directory
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {filteredAppointments.length} matching appointments
              </p>
            </div>

            <button
              onClick={() => {
                setAppointmentForm(initialAppointmentForm);
                setShowAppointmentModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-500/10"
            >
              <Calendar className="w-4 h-4" />
              Book New Appointment
            </button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Filter by Doctor</label>
              <select
                value={appointmentDoctorFilter}
                onChange={(e) => setAppointmentDoctorFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-100 focus:outline-none focus:border-blue-400"
              >
                <option value="all">All Doctors</option>
                {doctorsList.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.firstName} {doc.lastName} ({doc.specialty || "General"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Filter by Status</label>
              <select
                value={appointmentStatusFilter}
                onChange={(e) => setAppointmentStatusFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-100 focus:outline-none focus:border-blue-400"
              >
                <option value="all">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="NoShow">NoShow</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Filter by Date</label>
              <input
                type="date"
                value={appointmentDateFilter}
                onChange={(e) => setAppointmentDateFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-100 focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {filteredAppointments.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No appointments match your filter criteria.</p>
          ) : (
            <div className="space-y-3">
              {filteredAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100 text-sm">{apt.patientName}</span>
                      <span className="font-mono text-cyan-400 text-xs">({apt.patientMRN})</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${statusBadge(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>

                    <div className="text-slate-400 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                        Dr. {apt.doctorName}
                      </span>
                      <span>•</span>
                      <span className="text-slate-300 font-semibold">{apt.reason}</span>
                      {apt.notes && <span className="italic text-slate-500">"{apt.notes}"</span>}
                    </div>

                    <div className="text-slate-500 text-[11px] flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-blue-400" />
                      {new Date(apt.appointmentDateTime).toLocaleString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {apt.status === "Scheduled" && (
                      <>
                        <button
                          onClick={() => handleUpdateAppointmentStatus(apt.id, "Completed")}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-semibold border border-teal-500/30 transition-all"
                        >
                          Mark Completed
                        </button>
                        <button
                          onClick={() => handleUpdateAppointmentStatus(apt.id, "Cancelled")}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateAppointmentStatus(apt.id, "NoShow")}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold border border-slate-700 transition-all"
                        >
                          No Show
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STAFF WORKLOAD & PATIENT ASSIGNMENT */}
      {activeTab === "workload" && (
        <div className="space-y-6">
          {/* Workload Cards: Doctors & Nurses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Doctors Workload */}
            <div className="glass-panel p-5 space-y-4 border-t-4 border-blue-500">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-400" />
                    Doctors Workload & Patient Counts
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {doctorsList.length} active doctors on duty
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {doctorsList.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-200 text-sm">
                          Dr. {doc.firstName} {doc.lastName}
                        </div>
                        <div className="text-[11px] text-cyan-400 font-medium">{doc.specialty || "General Medicine"}</div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold font-mono ${workloadBadge(doc.patientCount)}`}>
                        {doc.patientCount} patients
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Staff ID: {doc.staffId} {doc.email && `· ${doc.email}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nurses Workload */}
            <div className="glass-panel p-5 space-y-4 border-t-4 border-emerald-500">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Nurses Workload & Patient Counts
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {nursesList.length} active nurses on duty
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nursesList.map((nur) => (
                  <div
                    key={nur.id}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-200 text-sm">
                          Nurse {nur.firstName} {nur.lastName}
                        </div>
                        <div className="text-[11px] text-emerald-400 font-medium">Shift: {nur.shiftType || "Day"}</div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold font-mono ${workloadBadge(nur.patientCount)}`}>
                        {nur.patientCount} patients
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Staff ID: {nur.staffId} {nur.phoneNumber && `· ${nur.phoneNumber}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Patient Assignment Table & Search */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-pink-400" />
                  Patient Care Team Assignments
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click Assign / Reassign to pair any patient with a doctor and nurse
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search patient name or MRN..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-400"
                />
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredPatients.map((p) => {
                const isUnassigned = !p.primaryDoctorId;

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-all ${
                      isUnassigned
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-sm">
                          {p.firstName} {p.lastName}
                        </span>
                        <span className="font-mono text-cyan-400">({p.mrn})</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {p.gender} · {p.bloodType}
                        </span>
                        {isUnassigned && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            UNASSIGNED
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 flex items-center gap-3 flex-wrap">
                        <span>DOB: {new Date(p.dateOfBirth).toLocaleDateString()}</span>
                        {p.contactNumber && <span>Phone: {p.contactNumber}</span>}
                        <span>Allergies: {p.allergies || "None"}</span>
                      </div>
                    </div>

                    {/* Current Care Team */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 min-w-[140px]">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          Assigned Doctor
                        </div>
                        <div className="font-bold text-slate-200 mt-0.5">
                          {p.primaryDoctor ? (
                            `Dr. ${p.primaryDoctor.firstName} ${p.primaryDoctor.lastName}`
                          ) : (
                            <span className="text-amber-400 font-medium italic">None</span>
                          )}
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 min-w-[140px]">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          Assigned Nurse
                        </div>
                        <div className="font-bold text-slate-200 mt-0.5">
                          {p.primaryNurse ? (
                            `Nurse ${p.primaryNurse.firstName} ${p.primaryNurse.lastName}`
                          ) : (
                            <span className="text-slate-500 italic">None</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => openAssignModal(p)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                          isUnassigned
                            ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {isUnassigned ? "Assign Team" : "Reassign"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SCHEDULE APPOINTMENT */}
      {showAppointmentModal && (
        <div className="modal-overlay">
          <div className="glass-panel p-6 w-full max-w-lg space-y-4 border border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Schedule Patient Appointment
              </h3>
              <button
                onClick={() => setShowAppointmentModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleAppointment} className="space-y-3.5 text-xs">
              {/* Patient Selection */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Patient *</label>
                <select
                  required
                  value={appointmentForm.patientId}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, patientId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-blue-400"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor Selection */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Attending Doctor *</label>
                <select
                  required
                  value={appointmentForm.doctorId}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, doctorId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-blue-400"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.firstName} {doc.lastName} ({doc.specialty || "General"}) — {doc.patientCount} current patients
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Appointment Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={appointmentForm.appointmentDateTime}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentDateTime: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Reason for Visit *</label>
                <select
                  value={appointmentForm.reason}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-blue-400"
                >
                  <option value="General Consultation">General Consultation</option>
                  <option value="Follow-up Visit">Follow-up Visit</option>
                  <option value="Cardiology Review">Cardiology Review</option>
                  <option value="Neurology Consultation">Neurology Consultation</option>
                  <option value="Emergency Triage Check">Emergency Triage Check</option>
                  <option value="Pediatric Checkup">Pediatric Checkup</option>
                  <option value="Prescription Refill / Review">Prescription Refill / Review</option>
                  <option value="Lab Results Discussion">Lab Results Discussion</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Reception Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Special instructions, patient concerns, mobility aids needed..."
                  value={appointmentForm.notes}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAppointmentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling}
                  className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-slate-950 font-bold transition-all flex items-center gap-2"
                >
                  {scheduling ? "Scheduling..." : "Confirm Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN CARE TEAM */}
      {showAssignModal && selectedPatientForAssign && (
        <div className="modal-overlay">
          <div className="glass-panel p-6 w-full max-w-md space-y-4 border border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                Assign Doctor & Nurse
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Patient Header Box */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
              <div className="font-bold text-slate-200 text-sm">
                {selectedPatientForAssign.firstName} {selectedPatientForAssign.lastName}
              </div>
              <div className="text-slate-400 font-mono">
                MRN: <span className="text-cyan-400">{selectedPatientForAssign.mrn}</span> · Gender: {selectedPatientForAssign.gender} · Blood: {selectedPatientForAssign.bloodType}
              </div>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Primary Attending Doctor
                </label>
                <select
                  value={assignmentForm.primaryDoctorId}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, primaryDoctorId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Unassigned --</option>
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.firstName} {doc.lastName} ({doc.specialty || "General"}) — {doc.patientCount} patients
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Assigning a doctor adds this patient directly into their clinical chart queue.
                </span>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Primary Assigned Nurse
                </label>
                <select
                  value={assignmentForm.primaryNurseId}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, primaryNurseId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Unassigned --</option>
                  {nursesList.map((nur) => (
                    <option key={nur.id} value={nur.id}>
                      Nurse {nur.firstName} {nur.lastName} (Shift: {nur.shiftType || "Day"}) — {nur.patientCount} patients
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Assigning a nurse delegates patient care plan management and bedside vitals.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold transition-all flex items-center gap-2"
                >
                  {assigning ? "Saving..." : "Save Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
