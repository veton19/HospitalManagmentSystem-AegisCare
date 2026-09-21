import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FlaskConical, AlertTriangle, CheckCircle2, Clock, Activity,
  ChevronRight, X, Microscope, ClipboardList, RefreshCw, Search,
  Edit3, Calendar, User, FileText
} from "lucide-react";

export const LabTechDashboard = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const [pendingOrders, setPendingOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [completedSearch, setCompletedSearch] = useState("");
  const [viewHistoryPatientId, setViewHistoryPatientId] = useState(null);

  const [resultForm, setResultForm] = useState({
    value: "",
    unit: "",
    referenceRange: "",
    isAbnormal: false,
    isCritical: false,
    notes: "",
  });

  useEffect(() => {
    fetchPending();
    fetchCompleted();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith("/completed")) {
      setActiveTab("completed");
    } else if (path.endsWith("/queue")) {
      setActiveTab("pending");
    }
  }, [location.pathname]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/labs/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPendingOrders(await res.json());
    } catch (err) {
      console.error("Failed to load pending lab orders:", err);
    }
    setLoading(false);
  };

  const fetchCompleted = async () => {
    try {
      const res = await fetch("/api/labs/completed", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCompletedOrders(await res.json());
      } else {
        const fallback = await fetch("/api/labs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fallback.ok) {
          const all = await fallback.json();
          setCompletedOrders(all.filter((l) => l.status === "Completed" || l.result != null));
        }
      }
    } catch (err) {
      console.error("Failed to load completed labs:", err);
    }
  };

  const markInProgress = async (orderId) => {
    try {
      await fetch(`/api/labs/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify("InProgress"),
      });
      fetchPending();
    } catch (err) {
      console.error("Failed to update order status:", err);
    }
  };

  const openResultModal = (order) => {
    setSelectedOrder(order);
    setResultForm({
      value: order.result?.value || "",
      unit: order.result?.unit || "",
      referenceRange: order.result?.referenceRange || "",
      isAbnormal: order.result?.isAbnormal || false,
      isCritical: order.result?.isCritical || false,
      notes: order.result?.notes || "",
    });
    setSubmitError("");
    setSubmitSuccess("");
    setShowResultModal(true);
    if (order.status === "Ordered") markInProgress(order.id);
  };

  const handleSubmitResult = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const res = await fetch("/api/labs/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          labOrderId: selectedOrder.id,
          patientId: selectedOrder.patientId,
          testName: selectedOrder.testName,
          value: resultForm.value,
          unit: resultForm.unit,
          referenceRange: resultForm.referenceRange,
          isAbnormal: resultForm.isAbnormal,
          isCritical: resultForm.isCritical,
          notes: resultForm.notes,
        }),
      });

      if (res.ok) {
        setSubmitSuccess("Result saved successfully. Doctor has been notified.");
        setTimeout(() => {
          setShowResultModal(false);
          fetchPending();
          fetchCompleted();
          setActiveTab("completed");
        }, 1200);
      } else {
        const err = await res.json().catch(() => ({}));
        setSubmitError(err.message || "Failed to submit result.");
      }
    } catch (err) {
      setSubmitError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  const statusBadge = (status) => {
    const map = {
      Ordered: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
      InProgress: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
      Completed: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
      Cancelled: "bg-slate-600/30 text-slate-400",
    };
    return map[status] || "bg-slate-700 text-slate-300";
  };

  const categoryColor = (cat) => {
    const map = {
      Hematology: "text-rose-400",
      Biochemistry: "text-cyan-400",
      Microbiology: "text-green-400",
      Radiology: "text-violet-400",
    };
    return map[cat] || "text-slate-400";
  };

  const filteredCompletedOrders = completedOrders.filter((order) => {
    if (!completedSearch) return true;
    const s = completedSearch.toLowerCase().trim();
    const patientName = `${order.patient?.firstName || ""} ${order.patient?.lastName || ""}`.toLowerCase();
    const mrn = (order.patient?.mrn || "").toLowerCase();
    const test = (order.testName || "").toLowerCase();
    const doc = (order.doctor?.lastName || "").toLowerCase();
    return patientName.includes(s) || mrn.includes(s) || test.includes(s) || doc.includes(s);
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 border-l-4 border-amber-400 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Microscope className="w-6 h-6 text-amber-400" />
            Lab Technician Portal
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono font-semibold">
              {user.staffId}
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {user.firstName} {user.lastName} — Clinical Laboratory Services
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveTab("pending")}
            className="text-center px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-all"
          >
            <div className="text-2xl font-bold text-amber-300">{pendingOrders.length}</div>
            <div className="text-[11px] text-slate-400 font-semibold">Pending</div>
          </div>
          <div
            onClick={() => setActiveTab("completed")}
            className="text-center px-4 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 cursor-pointer hover:bg-teal-500/20 transition-all"
          >
            <div className="text-2xl font-bold text-teal-300">{completedOrders.length}</div>
            <div className="text-[11px] text-slate-400 font-semibold">Completed</div>
          </div>
          <button
            onClick={() => { fetchPending(); fetchCompleted(); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Refresh All"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === "pending"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="w-4 h-4" /> Pending Queue
          {pendingOrders.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
              {pendingOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === "completed"
              ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
              : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" /> Completed Results
          {completedOrders.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-teal-500 text-slate-950 text-[10px] font-bold">
              {completedOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Pending Orders Tab */}
      {activeTab === "pending" && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-400" />
              Pending Lab Orders
            </h3>
            <span className="text-xs text-slate-400">{pendingOrders.length} unresolved</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto" />
              <p className="text-slate-300 font-semibold">All caught up!</p>
              <p className="text-xs text-slate-500">No pending lab orders at this time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => {
                const prevLabs = completedOrders.filter((c) => c.patientId === order.patientId);
                const isShowingPrev = viewHistoryPatientId === order.patientId;

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/30 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-100">{order.testName}</span>
                          <span className={`text-xs font-semibold ${categoryColor(order.category)}`}>
                            [{order.category}]
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${statusBadge(order.status)}`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          <span>
                            Patient:{" "}
                            <strong className="text-slate-200">
                              {order.patient?.firstName} {order.patient?.lastName}
                            </strong>
                            {order.patient?.mrn && (
                              <span className="ml-1 font-mono text-cyan-400">({order.patient.mrn})</span>
                            )}
                          </span>
                          <span>•</span>
                          <span>
                            Dr. {order.doctor?.lastName || "—"} ({order.doctor?.staffId})
                          </span>
                          <span>•</span>
                          <span>Ordered: {new Date(order.orderDate).toLocaleString()}</span>
                        </div>

                        {prevLabs.length > 0 && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setViewHistoryPatientId(isShowingPrev ? null : order.patientId)}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium underline"
                            >
                              <FlaskConical className="w-3.5 h-3.5" />
                              {isShowingPrev ? "Hide" : "View"} {prevLabs.length} Previous Lab Result{prevLabs.length > 1 ? "s" : ""} for this Patient
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => openResultModal(order)}
                        className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/5"
                      >
                        <FlaskConical className="w-4 h-4" />
                        Enter Result
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Expandable Previous Labs History */}
                    {isShowingPrev && (
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                        <div className="font-bold text-slate-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          Previous Labs History for {order.patient?.firstName} {order.patient?.lastName}
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {prevLabs.map((pl) => (
                            <div
                              key={pl.id}
                              className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-semibold text-slate-200">{pl.testName}</span>
                                <span className="text-slate-500 text-[10px] ml-2">
                                  {pl.result ? new Date(pl.result.resultDate).toLocaleDateString() : new Date(pl.orderDate).toLocaleDateString()}
                                </span>
                              </div>
                              {pl.result ? (
                                <div className="flex items-center gap-2 font-mono">
                                  <span className="font-bold text-slate-100">
                                    {pl.result.value} {pl.result.unit}
                                  </span>
                                  {pl.result.isCritical ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 font-bold">
                                      CRITICAL
                                    </span>
                                  ) : pl.result.isAbnormal ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                                      ABNORMAL
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">
                                      NORMAL
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">No result recorded</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Completed Results Tab */}
      {activeTab === "completed" && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                Completed Lab Results & History
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {completedOrders.length} total finalized tests in the system
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search patient, MRN, test..."
                value={completedSearch}
                onChange={(e) => setCompletedSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            </div>
          </div>

          {filteredCompletedOrders.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Microscope className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-semibold">
                {completedSearch ? "No matching completed labs found." : "No completed lab results recorded yet."}
              </p>
              <p className="text-xs text-slate-500">
                {completedSearch ? "Try a different search query." : "When you finish an order in the Pending Queue, the result will appear right here."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCompletedOrders.map((order) => (
                <div
                  key={order.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    order.result?.isCritical
                      ? "bg-rose-500/10 border-rose-500/40"
                      : order.result?.isAbnormal
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100 text-base">{order.testName}</span>
                      <span className={`text-xs font-semibold ${categoryColor(order.category)}`}>
                        [{order.category}]
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${statusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.result?.isCritical && (
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-500/30 text-rose-300 font-bold animate-pulse border border-rose-500/40 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> CRITICAL
                        </span>
                      )}
                      {order.result?.isAbnormal && !order.result?.isCritical && (
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> ABNORMAL
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => openResultModal(order)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 border border-slate-700 transition-all"
                        title="Edit or correct result"
                      >
                        <Edit3 className="w-3 h-3 text-cyan-400" />
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="text-slate-400">
                        Patient:{" "}
                        <strong className="text-slate-100">
                          {order.patient?.firstName} {order.patient?.lastName}
                        </strong>
                        {order.patient?.mrn && (
                          <span className="ml-1 font-mono text-cyan-400">({order.patient.mrn})</span>
                        )}
                      </div>
                      <div className="text-slate-400">
                        Ordering Physician: Dr. {order.doctor?.lastName || "—"}{" "}
                        <span className="font-mono text-slate-500">({order.doctor?.staffId})</span>
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-2">
                        <span>Ordered: {new Date(order.orderDate).toLocaleDateString()}</span>
                        {order.result && (
                          <>
                            <span>•</span>
                            <span>Resulted: {new Date(order.result.resultDate).toLocaleString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Result Value Box */}
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Final Laboratory Result
                      </div>
                      {order.result ? (
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-extrabold font-mono text-teal-300">
                              {order.result.value}
                            </span>
                            <span className="text-xs font-mono text-slate-300 font-bold">
                              {order.result.unit}
                            </span>
                            {order.result.referenceRange && (
                              <span className="text-[11px] text-slate-400 ml-auto font-mono">
                                Ref Range: <strong className="text-slate-300">{order.result.referenceRange}</strong>
                              </span>
                            )}
                          </div>
                          {order.result.notes && (
                            <p className="text-xs text-slate-400 italic mt-1 border-t border-slate-800/60 pt-1">
                              "{order.result.notes}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic">No result details available.</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Result Entry Modal */}
      {showResultModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="glass-panel p-6 w-full max-w-lg space-y-4 border border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-amber-400" />
                {selectedOrder.result ? "Update / Edit Lab Result" : "Enter Lab Result"}
              </h3>
              <button
                onClick={() => setShowResultModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300">{selectedOrder.testName}</span>
                <span className={`font-semibold ${categoryColor(selectedOrder.category)}`}>
                  [{selectedOrder.category}]
                </span>
              </div>
              <div className="text-slate-400">
                Patient:{" "}
                <strong className="text-slate-200">
                  {selectedOrder.patient?.firstName} {selectedOrder.patient?.lastName}
                </strong>{" "}
                <span className="font-mono text-cyan-400">({selectedOrder.patient?.mrn})</span>
              </div>
              <div className="text-slate-500">
                Ordered by Dr. {selectedOrder.doctor?.lastName} · {new Date(selectedOrder.orderDate).toLocaleString()}
              </div>
            </div>

            {submitSuccess && (
              <div className="p-3 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {submitSuccess}
              </div>
            )}
            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitResult} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Result Value</label>
                  <input
                    type="text"
                    value={resultForm.value}
                    onChange={(e) => setResultForm({ ...resultForm, value: e.target.value })}
                    placeholder="e.g. 14.2"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    value={resultForm.unit}
                    onChange={(e) => setResultForm({ ...resultForm, unit: e.target.value })}
                    placeholder="e.g. g/dL"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Reference Range</label>
                  <input
                    type="text"
                    value={resultForm.referenceRange}
                    onChange={(e) => setResultForm({ ...resultForm, referenceRange: e.target.value })}
                    placeholder="e.g. 12.0–16.0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={resultForm.notes}
                  onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })}
                  placeholder="Additional observations or comments..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                    resultForm.isAbnormal
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                      : "bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={resultForm.isAbnormal}
                    onChange={(e) => setResultForm({ ...resultForm, isAbnormal: e.target.checked })}
                    className="accent-amber-400"
                  />
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-semibold">Mark Abnormal</span>
                </label>
                <label
                  className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                    resultForm.isCritical
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                      : "bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={resultForm.isCritical}
                    onChange={(e) =>
                      setResultForm({
                        ...resultForm,
                        isCritical: e.target.checked,
                        isAbnormal: e.target.checked ? true : resultForm.isAbnormal,
                      })
                    }
                    className="accent-rose-400"
                  />
                  <Activity className="w-4 h-4" />
                  <span className="font-semibold">Mark Critical</span>
                </label>
              </div>

              {resultForm.isCritical && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Critical values will trigger an immediate high-priority alert to the ordering physician.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="w-4 h-4" />
                      {selectedOrder.result ? "Update Result" : "Submit Result"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
