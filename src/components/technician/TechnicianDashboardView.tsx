import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Camera,
  UploadCloud,
  FileText,
  Package,
  Wrench,
  Send,
  ShieldCheck,
  MapPin,
  Phone,
  CheckSquare,
  AlertOctagon,
  Image as ImageIcon,
  User,
  Info,
  Layers,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { getSlaRemainingInfo } from '../../utils/conflictEngine';
import { getCustomerFacingStatus } from '../../utils/stateMachine';
import { ServiceProgressStage } from '../../types';
import { TechnicianCustomerRouteMap } from '../map/TechnicianCustomerRouteMap';
import { TechnicianTrackingControls } from './TechnicianTrackingControls';
import { Navigation } from 'lucide-react';

export const TechnicianDashboardView: React.FC = () => {
  const {
    currentRole,
    currentUser,
    currentUserAccount,
    requests,
    machines,
    parts,
    technicians,
    sparePartRequests,
    acceptServiceOffer,
    declineServiceOffer,
    updateBookingStatus,
    updateServiceProgress,
    raiseSparePartRequest,
    uploadServiceDocument,
    submitCompletionReport,
    updateChecklistItem,
    getOfferRemainingSeconds,
    setSelectedRequestId,
  } = useServiceSync();

  if (currentRole !== 'Technician') {
    return (
      <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-2">
        <h3 className="text-base font-bold text-rose-700">Access Restricted</h3>
        <p className="text-xs text-slate-600">
          You must be logged in as an authorized Field Service Technician to view this work order workspace.
        </p>
      </div>
    );
  }

  // Find technician object matching current user
  const currentTech = technicians.find(
    (t) => t.id === currentUserAccount.technicianId || t.name.toLowerCase().includes(currentUser.name.toLowerCase())
  ) || technicians[1]; // default Priya Patel

  // Check for any urgent incoming offer for this technician (or active demo offer)
  const incomingOffer = requests.find(
    (r) =>
      (r.offeredTechnicianId === currentTech.id || (!r.assignedTechnicianId && r.offeredTechnicianId)) &&
      r.status !== 'In Progress' &&
      r.status !== 'Completed' &&
      r.status !== 'Verified' &&
      r.status !== 'Closed'
  );

  // Active assigned job
  const activeJob = requests.find(
    (r) =>
      r.assignedTechnicianId === currentTech.id &&
      r.status !== 'Closed' &&
      r.status !== 'Verified'
  ) || requests.find((r) => r.id === 'SR-1040');

  // Accordion state: clean collapsible sections
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    'work-order': true,
    'telemetry': false,
    'uploads': false,
    'parts': false,
    'completion': false,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Real-time Countdown Timer for incoming offer
  const [countdownSeconds, setCountdownSeconds] = useState<number>(300);
  const [showOfferDetails, setShowOfferDetails] = useState<boolean>(false);

  useEffect(() => {
    if (!incomingOffer) return;
    const interval = setInterval(() => {
      const remaining = getOfferRemainingSeconds(incomingOffer.id);
      setCountdownSeconds(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingOffer, getOfferRemainingSeconds]);

  // Document Upload Form State
  const [docType, setDocType] = useState<'photo' | 'report' | 'compliance'>('photo');
  const [docName, setDocName] = useState('');
  const [docCaption, setDocCaption] = useState('');
  const [docSampleUrl] = useState(
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
  );
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Spare Part Request Form State
  const [reqPartId, setReqPartId] = useState<string>('part-01');
  const [reqPartQty, setReqPartQty] = useState<number>(1);
  const [reqPartUrgency, setReqPartUrgency] = useState<'Routine' | 'Urgent' | 'Emergency'>('Emergency');
  const [reqPartReason, setReqPartReason] = useState<string>('Bearing defect on machine spindle; local stock zero.');
  const [partReqSuccessMsg, setPartReqSuccessMsg] = useState<string | null>(null);

  // Completion Form State
  const [compHours, setCompHours] = useState<number>(3.5);
  const [compWorkSummary, setCompWorkSummary] = useState<string>(
    'Replaced Spindle Ceramic Hybrid Bearing, calibrated runout to 0.8µm, verified LOTO and tested for 30 mins.'
  );
  const [compPartsUsed, setCompPartsUsed] = useState<string>('BRG-CERAMIC-88, SEAL-VTN-55');
  const [compVib, setCompVib] = useState<number>(0.82);
  const [compTemp, setCompTemp] = useState<number>(38.4);
  const [compNotes, setCompNotes] = useState<string>('Vibration harmonic returned within ISO 18436 Class 1 tolerance.');
  const [compSuccessMsg, setCompSuccessMsg] = useState<string | null>(null);

  const activeMachine = machines.find((m) => m.id === activeJob?.machineId);

  const handleAcceptOffer = async () => {
    if (!incomingOffer) return;
    await acceptServiceOffer(incomingOffer.id);
  };

  const handleDeclineOffer = async () => {
    if (!incomingOffer) return;
    await declineServiceOffer(incomingOffer.id, 'Technician busy with prior cleanroom calibration.');
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;

    uploadServiceDocument(activeJob.id, {
      name: docName || `${docType.toUpperCase()}_Verification_${Date.now().toString().slice(-4)}.jpg`,
      url: docSampleUrl,
      type: docType,
      caption: docCaption || 'Field inspection artifact captured on site.',
      fileSize: '2.1 MB',
    });

    setUploadSuccessMsg('Document uploaded and appended to audit ledger.');
    setDocName('');
    setDocCaption('');
    setTimeout(() => setUploadSuccessMsg(null), 3000);
  };

  const handleSparePartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;

    const res = await raiseSparePartRequest({
      requestId: activeJob.id,
      partId: reqPartId,
      siteId: activeJob.siteId,
      quantity: reqPartQty,
      urgency: reqPartUrgency,
      reason: reqPartReason,
    });

    if (res.success) {
      setPartReqSuccessMsg('Part requisition forwarded to Admin. Awaiting order confirmation.');
      setTimeout(() => setPartReqSuccessMsg(null), 3500);
    }
  };

  const handleCompletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;

    const res = await submitCompletionReport(activeJob.id, {
      hoursSpent: Number(compHours),
      workSummary: compWorkSummary,
      partsUsed: compPartsUsed.split(',').map((p) => p.trim()),
      finalVibrationRms: Number(compVib),
      finalTempC: Number(compTemp),
      technicianNotes: compNotes,
    });

    if (res.success) {
      setCompSuccessMsg('Completion dossier submitted to Central Admin. Ready for engineering sign-off.');
      setTimeout(() => setCompSuccessMsg(null), 4000);
    }
  };

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const completedChecklistCount = activeJob?.checklist.filter((c) => c.completed).length || 0;
  const totalChecklistCount = activeJob?.checklist.length || 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. URGENT SERVICE OFFER BANNER (With 5-Minute Countdown Timer & Accordion Details) */}
      {incomingOffer && (
        <div className="bg-slate-900 text-white rounded-2xl border-2 border-rose-500/90 shadow-md relative overflow-hidden transition-all">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
              <div className="space-y-2.5 max-w-xl">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <span className="font-semibold text-rose-300">
                    New Service Dispatch Offer
                  </span>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="font-mono text-slate-300">{incomingOffer.id}</span>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="text-amber-300 font-semibold">{incomingOffer.priority}</span>
                </div>

                <h2 className="text-xl font-bold tracking-tight text-white">
                  {incomingOffer.title}
                </h2>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="flex items-center gap-1 font-medium text-white">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    {incomingOffer.siteName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Machine: <strong className="text-white">{incomingOffer.machineId}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Customer: <strong className="text-white">{incomingOffer.customerContactPerson || 'Facility Manager'}</strong></span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2">
                  {incomingOffer.description}
                </p>

                {/* Secondary details accordion toggle */}
                <button
                  type="button"
                  onClick={() => setShowOfferDetails(!showOfferDetails)}
                  className="flex items-center gap-1.5 text-xs text-rose-300 hover:text-white transition-colors cursor-pointer pt-1 font-medium"
                >
                  <span>{showOfferDetails ? 'Hide Offer Specifications' : 'View Full Specifications (Skills, Parts & Location)'}</span>
                  {showOfferDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Countdown Box & Actions */}
              <div className="bg-slate-800/95 border border-slate-700/80 rounded-xl p-4 text-center min-w-[240px] shrink-0 space-y-2.5 shadow-sm">
                <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-center gap-1">
                  <span>5-Min Acceptance Timer</span>
                </div>

                {/* Countdown Digits */}
                <div className="text-3xl font-bold font-mono text-rose-400 flex items-center justify-center gap-2 tabular-nums">
                  <Clock className="w-5 h-5 text-rose-500" />
                  <span>{formatCountdown(countdownSeconds)}</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-rose-500 h-1.5 transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, (countdownSeconds / 300) * 100))}%` }}
                  />
                </div>

                <div className="text-[10px] text-slate-400">
                  {countdownSeconds > 0
                    ? 'Auto-cascades to next technician at 00:00'
                    : 'Window expired. Auto-routing...'}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleAcceptOffer}
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Accept Work Order
                  </button>
                  <button
                    onClick={handleDeclineOffer}
                    className="py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-rose-300 hover:text-rose-200 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Secondary Offer Details Drawer */}
          {showOfferDetails && (
            <div className="border-t border-slate-800 bg-slate-950/70 p-5 text-xs text-slate-300 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Required Skills */}
                <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Required Technical Skills</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {incomingOffer.requiredSkills && incomingOffer.requiredSkills.length > 0 ? (
                      incomingOffer.requiredSkills.map((sk) => (
                        <span key={sk} className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800 text-[11px]">
                          {sk}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-[11px]">General electro-mechanical service</span>
                    )}
                  </div>
                </div>

                {/* Spare Parts Provision */}
                <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    <span>Identified Spare Parts</span>
                  </div>
                  <div className="space-y-1 pt-1 text-[11px]">
                    {incomingOffer.requiredParts && incomingOffer.requiredParts.length > 0 ? (
                      incomingOffer.requiredParts.map((rp) => (
                        <div key={rp.partId} className="flex justify-between text-slate-300">
                          <span>{rp.quantity}x {rp.partName}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400">No pre-requisitioned parts required</span>
                    )}
                  </div>
                </div>

                {/* Customer Contact & Site */}
                <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>On-Site Point of Contact</span>
                  </div>
                  <div className="pt-1 text-[11px] space-y-0.5">
                    <div className="text-white font-medium">{incomingOffer.customerContactPerson || 'Facility Engineering Desk'}</div>
                    <div className="text-slate-400">{incomingOffer.customerContactPhone || '+91 98450 12345'}</div>
                    <div className="text-slate-400 text-[10px] mt-1">{incomingOffer.siteName}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Technician Header & Verification Status */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src={currentTech.avatar}
            alt={currentTech.name}
            className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-2xs"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{currentTech.name}</h2>
              {currentTech.isVerified ? (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Admin Verified Engineer
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Pending Admin Verification
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {currentTech.locationName} · Shift: {currentTech.shift} · Phone: {currentTech.phone}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs sm:border-l sm:border-slate-200 sm:pl-6">
          <div>
            <div className="text-slate-400">First-Time Fix</div>
            <div className="font-bold text-slate-900 text-sm font-mono mt-0.5 tabular-nums">
              {currentTech.firstTimeFixRate}%
            </div>
          </div>
          <div>
            <div className="text-slate-400">Rating</div>
            <div className="font-bold text-amber-600 text-sm font-mono mt-0.5 tabular-nums">
              {currentTech.rating} ★
            </div>
          </div>
          <div>
            <div className="text-slate-400">Active Load</div>
            <div className="font-bold text-blue-600 text-sm font-mono mt-0.5 tabular-nums">
              {currentTech.activeLoad} / {currentTech.maxCapacity}
            </div>
          </div>
        </div>
      </div>

      {/* 3. ACCORDION SECTIONS */}
      <div className="space-y-3.5">
        {/* Accordion 1: Active Work Order & Progress Controls */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('work-order')}
            className="w-full p-4 sm:p-5 text-left flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  1. Active Work Order &amp; Progress Updates
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {activeJob ? `${activeJob.id}: ${activeJob.title}` : 'No active work order'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {activeJob && (
                <span className="text-xs font-semibold text-blue-700">
                  {activeJob.serviceProgressStage || activeJob.status}
                </span>
              )}
              {openAccordions['work-order'] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {openAccordions['work-order'] && activeJob && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] text-slate-400">Customer Facility</div>
                  <div className="font-semibold text-xs text-slate-900">{activeJob.siteName}</div>
                  <div className="text-xs text-slate-600 mt-0.5">Machine Unit: {activeJob.machineId} ({activeMachine?.name})</div>
                </div>

                {/* Progress Transition Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => updateServiceProgress(activeJob.id, 'En Route')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeJob.serviceProgressStage === 'En Route'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    En Route
                  </button>
                  <button
                    onClick={() => updateServiceProgress(activeJob.id, 'In Progress')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeJob.serviceProgressStage === 'In Progress'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    On-Site Servicing
                  </button>
                  <button
                    onClick={() => updateServiceProgress(activeJob.id, 'Testing')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeJob.serviceProgressStage === 'Testing'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Calibration &amp; Test
                  </button>
                  <button
                    onClick={() => updateServiceProgress(activeJob.id, 'Completed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeJob.serviceProgressStage === 'Completed'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Complete Service
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed bg-blue-50/40 p-3 rounded-xl border border-blue-100">
                <strong className="text-blue-900 block mb-0.5">Scope of Work:</strong>
                {activeJob.description}
              </div>

              {/* Turn-by-Turn Navigation & Real-time Live Tracking */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    <span>Turn-by-Turn Driving Route &amp; Customer Live GPS Broadcast</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Google Maps Routes API + Firebase Realtime GPS
                  </span>
                </div>
                <TechnicianTrackingControls
                  request={activeJob}
                  technician={currentTech}
                  onStatusChange={(newStatus) => updateBookingStatus(activeJob.id, newStatus)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Accordion 2: Service Checklist & Machine Telemetry */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('telemetry')}
            className="w-full p-4 sm:p-5 text-left flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  2. Service Checklist &amp; Machine Telemetry
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  Physical sign-off steps ({completedChecklistCount}/{totalChecklistCount} verified)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-medium text-slate-500">
                {completedChecklistCount === totalChecklistCount ? 'All Verified' : `${totalChecklistCount - completedChecklistCount} Pending`}
              </span>
              {openAccordions['telemetry'] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {openAccordions['telemetry'] && activeJob && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
              {/* Telemetry row */}
              {activeMachine && (
                <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Vibration (RMS)</div>
                    <div className="text-xs font-bold font-mono text-rose-600 mt-0.5 tabular-nums">
                      {activeMachine.telemetry.vibrationRms} mm/s
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Bearing Temp</div>
                    <div className="text-xs font-bold font-mono text-amber-600 mt-0.5 tabular-nums">
                      {activeMachine.telemetry.bearingTempC} °C
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Air Pressure</div>
                    <div className="text-xs font-bold font-mono text-slate-800 mt-0.5 tabular-nums">
                      {activeMachine.telemetry.pressurePsi} PSI
                    </div>
                  </div>
                </div>
              )}

              {/* Checklist items */}
              <div className="space-y-2">
                {activeJob.checklist.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) => updateChecklistItem(activeJob.id, item.id, e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span className={`text-xs ${item.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Accordion 3: Digital File & Photograph Uploads */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('uploads')}
            className="w-full p-4 sm:p-5 text-left flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  3. Field Uploads: Reports &amp; Photographs
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  Attach verification photos and signed service documents for Admin review
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-medium text-slate-500">
                {activeJob?.documents.length || 0} Files
              </span>
              {openAccordions['uploads'] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {openAccordions['uploads'] && activeJob && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
              {uploadSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{uploadSuccessMsg}</span>
                </div>
              )}

              {/* Upload Form */}
              <form onSubmit={handleUploadSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Document Category</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="photo">Photographic Evidence (Before/After)</option>
                      <option value="report">Signed Service Report (PDF)</option>
                      <option value="compliance">Calibration &amp; Warranty Certificate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Document Name / Title</label>
                    <input
                      type="text"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      placeholder="e.g. Spindle_Bearing_Replacement_Signed.pdf"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Observation Caption</label>
                  <input
                    type="text"
                    value={docCaption}
                    onChange={(e) => setDocCaption(e.target.value)}
                    placeholder="e.g. Laser runout 0.8 µm verified after bearing alignment."
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload &amp; Attach Document</span>
                  </button>
                </div>
              </form>

              {/* Uploaded Documents List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">Associated Documents:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeJob.documents.map((doc) => (
                    <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-start gap-3 shadow-2xs">
                      {doc.type === 'photo' ? (
                        <img
                          src={doc.url}
                          alt={doc.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="font-semibold text-slate-900 truncate">{doc.name}</div>
                        <div className="text-slate-500 text-[11px] truncate">{doc.caption || doc.type}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          {new Date(doc.uploadedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST · {doc.uploadedBy}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 4: Raise Spare Parts & Issues to Admin */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('parts')}
            className="w-full p-4 sm:p-5 text-left flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  4. Raise Spare Parts &amp; Issues to Admin
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  Requisition parts from central stock; final ordering requires Admin confirmation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {openAccordions['parts'] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {openAccordions['parts'] && activeJob && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
              {partReqSuccessMsg && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{partReqSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSparePartSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Spare Part</label>
                    <select
                      value={reqPartId}
                      onChange={(e) => setReqPartId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {parts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) · ₹{p.unitCost.toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={reqPartQty}
                      onChange={(e) => setReqPartQty(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Urgency</label>
                    <select
                      value={reqPartUrgency}
                      onChange={(e) => setReqPartUrgency(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="Routine">Routine</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Requisition</label>
                  <input
                    type="text"
                    value={reqPartReason}
                    onChange={(e) => setReqPartReason(e.target.value)}
                    placeholder="e.g. Critical wear observed during spindle disassembly."
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Part Requisition</span>
                  </button>
                </div>
              </form>

              {/* Pending Part Requests Table */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">Requisitions on File:</div>
                <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200">
                  {sparePartRequests.map((pr) => (
                    <div key={pr.id} className="p-3 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900">{pr.quantity}x {pr.partName}</span>
                        <span className="text-slate-400 font-mono text-[11px] ml-2">({pr.partSku})</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">{pr.reason}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                        pr.status.includes('Approved') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        pr.status === 'Stocked' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                        'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {pr.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 5: Submit Service Completion */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAccordion('completion')}
            className="w-full p-4 sm:p-5 text-left flex items-center justify-between hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  5. Submit Service Completion Information
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  Final sign-off dossier with work summary, calibrated readings &amp; replaced parts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {openAccordions['completion'] ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {openAccordions['completion'] && activeJob && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
              {compSuccessMsg && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>{compSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleCompletionSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hours Spent on Site</label>
                    <input
                      type="number"
                      step={0.5}
                      value={compHours}
                      onChange={(e) => setCompHours(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Final Vibration (mm/s)</label>
                    <input
                      type="number"
                      step={0.01}
                      value={compVib}
                      onChange={(e) => setCompVib(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Final Bearing Temp (°C)</label>
                    <input
                      type="number"
                      step={0.1}
                      value={compTemp}
                      onChange={(e) => setCompTemp(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parts Replaced (SKUs)</label>
                  <input
                    type="text"
                    value={compPartsUsed}
                    onChange={(e) => setCompPartsUsed(e.target.value)}
                    placeholder="e.g. BRG-CERAMIC-88, SEAL-VTN-55"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Technical Work Summary</label>
                  <textarea
                    rows={2}
                    value={compWorkSummary}
                    onChange={(e) => setCompWorkSummary(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Final Handover Notes</label>
                  <input
                    type="text"
                    value={compNotes}
                    onChange={(e) => setCompNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Completion Dossier</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
