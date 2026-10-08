import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Wrench,
  UserCheck,
  Shield,
  FileText,
  Camera,
  Sparkles,
  ArrowRight,
  AlertOctagon,
  ChevronRight,
  History,
  PackageCheck,
  MapPin,
  ExternalLink,
  Layers,
  Phone,
  Gauge,
  Thermometer,
  Activity,
  Calendar,
  ClipboardList,
  Building2,
  Package,
  FileCheck,
  User,
  Eye,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { getStatusColor, validateTransition, getCustomerFacingStatus } from '../../utils/stateMachine';
import { getSlaRemainingInfo } from '../../utils/conflictEngine';
import { RequestStatus, ServiceProgressStage } from '../../types';
import { LiveTechnicianCustomerTrackingMap } from '../map/LiveTechnicianCustomerTrackingMap';
import { TechnicianTrackingControls } from '../technician/TechnicianTrackingControls';
import { TechnicianIdentity, CustomerIdentity, StandardAvatar } from '../common/StandardIdentity';
import { ErrorBoundary } from '../common/ErrorBoundary';

export const RequestDetailDrawer: React.FC = () => {
  const {
    selectedRequestId,
    setSelectedRequestId,
    requests,
    machines,
    technicians,
    currentRole,
    transitionRequest,
    setIsRecoveryModalOpen,
    setIsCopilotOpen,
    updateChecklistItem,
    addDocumentToRequest,
    acceptServiceOffer,
    declineServiceOffer,
    updateBookingStatus,
    getOfferRemainingSeconds,
  } = useServiceSync();

  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadNote, setUploadNote] = useState('');
  const [offerSeconds, setOfferSeconds] = useState<number>(300);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'readiness' | 'machine' | 'tracking' | 'evidence' | 'customer' | 'history' | 'parts' | 'report'
  >('overview');
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string; caption?: string } | null>(null);

  // Close only the details view when ESC key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedRequestId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedRequestId]);

  if (!selectedRequestId) return null;

  const request = requests.find((r) => r.id === selectedRequestId);
  if (!request) return null;

  const machine = machines.find((m) => m.id === request.machineId);
  const assignedTech = technicians.find((t) => t.id === request.assignedTechnicianId);
  const offeredTech = technicians.find((t) => t.id === request.offeredTechnicianId);
  const statusStyles = getStatusColor(request.status);
  const slaInfo = getSlaRemainingInfo(request.slaDeadline);

  useEffect(() => {
    if (!request?.id || !request.offeredTechnicianId) return;
    const update = () => {
      setOfferSeconds(getOfferRemainingSeconds(request.id));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [request?.id, request?.offeredTechnicianId, getOfferRemainingSeconds]);

  const handleTransition = async (targetStatus: RequestStatus) => {
    setTransitionError(null);
    setIsSubmitting(true);
    try {
      const res = await transitionRequest(request.id, targetStatus);
      if (!res.success) {
        setTransitionError(res.error || 'Failed to transition state.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulatePhotoUpload = () => {
    addDocumentToRequest(request.id, {
      name: `Inspection_Photo_${Date.now().toString().slice(-4)}.jpg`,
      url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80',
      caption: uploadNote || 'Field verification inspection photo submitted by technician.',
    });
    setUploadNote('');
  };

  // Determine available next action buttons
  const possibleTransitions: { target: RequestStatus; label: string; icon: any; variant: string }[] = [];

  if (request.status === 'Draft') {
    possibleTransitions.push({ target: 'Validated', label: 'Validate Request', icon: CheckCircle2, variant: 'primary' });
  } else if (request.status === 'Validated') {
    possibleTransitions.push({ target: 'Pending Approval', label: 'Submit for Approval', icon: ArrowRight, variant: 'primary' });
  } else if (request.status === 'Pending Approval') {
    possibleTransitions.push({ target: 'Approved', label: 'Approve & Auto-Assign', icon: UserCheck, variant: 'emerald' });
  } else if (request.status === 'Approved') {
    possibleTransitions.push({ target: 'Assigned', label: 'Confirm Dispatch', icon: ArrowRight, variant: 'primary' });
  } else if (request.status === 'Assigned') {
    possibleTransitions.push({ target: 'In Progress', label: 'Start Servicing (Engage Frozen Window)', icon: Lock, variant: 'cyan' });
  } else if (request.status === 'In Progress') {
    possibleTransitions.push({ target: 'Completed', label: 'Submit Service Completion', icon: CheckCircle2, variant: 'emerald' });
  } else if (request.status === 'Completed') {
    possibleTransitions.push({ target: 'Verified', label: 'Admin Verification & Sign-Off', icon: Shield, variant: 'emerald' });
  } else if (request.status === 'Verified') {
    possibleTransitions.push({ target: 'Closed', label: 'Close Service Request', icon: CheckCircle2, variant: 'slate' });
  }

  const stagesList: ServiceProgressStage[] = [
    'Requested',
    'Assigned',
    'En Route',
    'In Progress',
    'Testing',
    'Completed',
    'Verified',
  ];
  const currentStageIndex = stagesList.indexOf(request.serviceProgressStage);

  return (
    <>
      {/* 1. Backdrop: strictly starts at top-16 so it never covers, blocks or intercepts the header or notification bell */}
      <div
        className="fixed top-16 inset-0 z-30 bg-slate-900/20 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-150"
        onClick={() => setSelectedRequestId(null)}
        aria-hidden="true"
      />

      {/* 2. Contextual Service Request Details Drawer: Slides in from the right over content */}
      <aside
        className="fixed top-16 right-0 bottom-0 z-40 w-full sm:w-[520px] lg:w-[580px] xl:w-[640px] max-w-full bg-white border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-drawer-title"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:px-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                {request.id}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyles.dot}`} />
                {currentRole === 'Customer' ? getCustomerFacingStatus(request.status) : request.status}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  request.priority === 'P1 - Critical'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {request.priority}
              </span>
            </div>
            <h2 id="request-drawer-title" className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
              {request.title}
            </h2>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Facility: <strong className="text-slate-800">{request.siteName}</strong></span>
              <span className="text-slate-300">·</span>
              <span>Machine: <strong className="font-mono text-blue-700">{request.machineId}</strong></span>
            </div>
          </div>

          {/* Close X Button: ONLY closes this details view. Does not logout, reset, navigate, or alter request. */}
          <button
            type="button"
            onClick={() => setSelectedRequestId(null)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            title="Close details view (ESC)"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Icons Toolbar: Each icon has a clearly defined action */}
        <div className="px-3 sm:px-5 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1 hidden sm:inline">
            Quick Actions:
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`p-1.5 px-2 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
              title="View details"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="text-[11px]">Details</span>
            </button>

            <button
              onClick={() => setActiveTab('tracking')}
              className={`p-1.5 px-2 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'tracking'
                  ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
              title="View technician"
            >
              <User className="w-3.5 h-3.5" />
              <span className="text-[11px]">Technician</span>
            </button>

            <button
              onClick={() => setActiveTab('customer')}
              className={`p-1.5 px-2 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'customer'
                  ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
              title="View customer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Customer</span>
            </button>

            <button
              onClick={() => setActiveTab('tracking')}
              className={`p-1.5 px-2 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'tracking'
                  ? 'bg-rose-600 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
              title="View location"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-[11px]">Location</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`p-1.5 px-2 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-amber-600 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
              title="View service history"
            >
              <History className="w-3.5 h-3.5" />
              <span className="text-[11px]">History</span>
            </button>

            <button
              onClick={() => setActiveTab('evidence')}
              className={`p-1.5 px-2 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'evidence'
                  ? 'bg-purple-600 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
              title="View documents"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="text-[11px]">Docs</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`p-1.5 px-2 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-teal-600 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
              title="View report"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span className="text-[11px]">Report</span>
            </button>

            <button
              onClick={() => setActiveTab('parts')}
              className={`p-1.5 px-2 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'parts'
                  ? 'bg-amber-600 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
              title="View spare parts"
            >
              <Package className="w-3.5 h-3.5" />
              <span className="text-[11px]">Parts</span>
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`p-1.5 px-2 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-cyan-600 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
              title="View status"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[11px]">Status</span>
            </button>
          </div>
        </div>

        {/* Sub-nav Tabs for Dense Scannability */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-2 pb-1 border-b border-slate-200 bg-slate-50/60 overflow-x-auto scrollbar-none text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-blue-700 shadow-2xs font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview &amp; SLA
          </button>
          <button
            onClick={() => setActiveTab('readiness')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'readiness'
                ? 'bg-white text-blue-700 shadow-2xs font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Readiness &amp; Match ({request.preFlightScore?.totalScore ?? '—'})
          </button>
          <button
            onClick={() => setActiveTab('machine')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'machine'
                ? 'bg-white text-blue-700 shadow-2xs font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Asset &amp; Telemetry
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'tracking'
                ? 'bg-white text-blue-700 shadow-2xs font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Technician &amp; Route
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'evidence'
                ? 'bg-white text-blue-700 shadow-2xs font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Checklist &amp; Docs ({request.documents.length})
          </button>
        </div>

        {/* Drawer Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {/* SLA Countdown Badge */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between shadow-2xs ${
              slaInfo.isBreached
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : slaInfo.isAtRisk
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock
                className={`w-4 h-4 ${
                  slaInfo.isBreached
                    ? 'text-rose-600 animate-spin'
                    : slaInfo.isAtRisk
                    ? 'text-amber-600'
                    : 'text-slate-500'
                }`}
              />
              <span className="font-semibold">Contractual SLA Resolution:</span>
            </div>
            <span className="font-mono font-bold tracking-tight text-sm">
              {slaInfo.formatted}
            </span>
          </div>

          {/* FROZEN WINDOW NOTICE (If status is In Progress) */}
          {request.frozenWindow && (
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-cyan-950 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-cyan-900">
                  Frozen-Window Disassembly Active
                </div>
                <div className="text-[11px] text-cyan-800 mt-0.5 leading-relaxed">
                  Equipment is actively disassembled on site. Automated reassignment is strictly locked to prevent field disruption.
                </div>
              </div>
            </div>
          )}

          {/* CONFLICT & RECOVERY PLAN BANNER (If in Exception or has conflict) */}
          {(request.status === 'Exception' || request.conflictState?.hasConflict) && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl space-y-2.5 shadow-2xs">
              <div className="flex items-start gap-2 text-rose-900">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <div className="font-bold text-xs uppercase tracking-wider text-rose-900">
                    Exception Detected &bull; Recovery Plan Ready
                  </div>
                  <div className="text-[11px] text-rose-800 mt-1 leading-normal font-medium">
                    {request.conflictState?.description ||
                      'Technician unavailable or spare parts deficit. Operational intervention required.'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsRecoveryModalOpen(true)}
                className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span>View &amp; Execute Recovery Plan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 7-STAGE PROGRESS LIFECYCLE BAR */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">
                Service Progress: <strong className="text-blue-700 font-mono">{request.serviceProgressStage}</strong>
              </span>
              <span className="text-slate-400 font-mono">
                Stage {currentStageIndex + 1} of {stagesList.length}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {stagesList.map((st, idx) => {
                const isComplete = currentStageIndex >= idx;
                const isCurrent = request.serviceProgressStage === st;
                return (
                  <div
                    key={st}
                    className={`h-2 rounded-full transition-all ${
                      isCurrent
                        ? 'bg-blue-600 ring-2 ring-blue-300'
                        : isComplete
                        ? 'bg-emerald-500'
                        : 'bg-slate-200'
                    }`}
                    title={`${st} (${idx + 1})`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Requested</span>
              <span>In Progress</span>
              <span>Verified</span>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & COMPLETION REPORT */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Description */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <span className="font-bold text-slate-800 text-xs block">Request Description</span>
                <p className="text-slate-600 leading-relaxed text-xs">
                  {request.description}
                </p>
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>Created: {new Date(request.createdAt).toLocaleDateString('en-IN')}</span>
                  <span>SLA Deadline: {new Date(request.slaDeadline).toLocaleTimeString('en-IN')}</span>
                </div>
              </div>

              {/* Completion Report (If Completed or Verified) */}
              {request.completionReport && (
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between font-bold text-xs text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Completion Report &amp; Verification Sign-Off</span>
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
                      {request.completionReport.hoursSpent} hrs logged
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200/70 text-slate-700 text-xs space-y-1">
                    <strong className="block text-[11px] text-slate-900">Work Summary:</strong>
                    <p className="text-slate-600">{request.completionReport.workSummary}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2 rounded border border-emerald-200/70">
                      <span className="text-slate-400 block text-[10px]">Parts Consumed:</span>
                      <strong className="text-slate-800">{request.completionReport.partsUsed.join(', ') || 'None'}</strong>
                    </div>
                    <div className="bg-white p-2 rounded border border-emerald-200/70">
                      <span className="text-slate-400 block text-[10px]">Final Vibration RMS:</span>
                      <strong className="text-emerald-700 font-mono">{request.completionReport.finalVibrationRms ?? '1.2'} mm/s (Nominal)</strong>
                    </div>
                  </div>

                  {request.completionReport.verifiedBy && (
                    <div className="text-[10px] text-emerald-800 font-semibold pt-1">
                      Verified &amp; Signed Off by: {request.completionReport.verifiedBy} ({request.completionReport.verifiedAt})
                    </div>
                  )}
                </div>
              )}

              {/* Customer Feedback (If Available) */}
              {request.customerFeedback && (
                <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  request.customerFeedback.isDissatisfied
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span>Customer Feedback &amp; Rating</span>
                    <span>{request.customerFeedback.rating} / 5 Stars ★</span>
                  </div>
                  {request.customerFeedback.isDissatisfied && (
                    <div className="font-semibold text-rose-800 text-[11px]">
                      Complaint Reason: {request.customerFeedback.complaintReason}
                    </div>
                  )}
                  <div className="italic text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700">
                    &ldquo;{request.customerFeedback.comments}&rdquo;
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PRE-FLIGHT READINESS SCORE (0-100) */}
          {activeTab === 'readiness' && request.preFlightScore && (
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>Pre-Flight Readiness Score</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-xl font-black font-mono ${
                      request.preFlightScore.totalScore >= 80
                        ? 'text-emerald-600'
                        : request.preFlightScore.totalScore >= 50
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {request.preFlightScore.totalScore}
                  </span>
                  <span className="text-slate-400 font-medium">/ 100</span>
                </div>
              </div>

              {/* Score Breakdown Progress Bars */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex justify-between text-slate-500 mb-1">
                    <span>Skill Match</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {request.preFlightScore.breakdown.skillMatch}/40
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{
                        width: `${(request.preFlightScore.breakdown.skillMatch / 40) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex justify-between text-slate-500 mb-1">
                    <span>Parts Stock</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {request.preFlightScore.breakdown.partsAvailability}/30
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        request.preFlightScore.breakdown.partsAvailability === 0
                          ? 'bg-rose-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${(request.preFlightScore.breakdown.partsAvailability / 30) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex justify-between text-slate-500 mb-1">
                    <span>Proximity</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {request.preFlightScore.breakdown.distanceScore}/15
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{
                        width: `${(request.preFlightScore.breakdown.distanceScore / 15) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex justify-between text-slate-500 mb-1">
                    <span>Tech Capacity</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {request.preFlightScore.breakdown.loadScore}/15
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className="bg-purple-600 h-1.5 rounded-full"
                      style={{
                        width: `${(request.preFlightScore.breakdown.loadScore / 15) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Match Rationale */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-[11px] text-blue-900 leading-relaxed">
                <span className="font-bold">Match Rationale: </span>
                {request.preFlightScore.explanation}
              </div>
            </div>
          )}

          {/* TAB 3: MACHINE & SITE CONTEXT */}
          {activeTab === 'machine' && machine && (
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Equipment Asset Profile</span>
                <span className="font-mono text-blue-600 font-bold">{machine.id}</span>
              </div>

              <div className="space-y-1.5 text-slate-600 text-xs">
                <div className="font-bold text-slate-900 text-sm">{machine.name}</div>
                <div className="text-[11px] text-slate-500">
                  Model: {machine.model} · SN: {machine.serialNumber}
                </div>
                <div className="text-[11px] flex items-center gap-1.5 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{request.siteName}</span>
                </div>

                {/* Telemetry Grid */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Vibration RMS</span>
                    <span className={`font-mono font-bold text-sm ${
                      machine.telemetry.vibrationRms > 4.5 ? 'text-rose-600' : 'text-slate-800'
                    }`}>
                      {machine.telemetry.vibrationRms} mm/s
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Bearing Temp</span>
                    <span className={`font-mono font-bold text-sm ${
                      machine.telemetry.bearingTempC > 60 ? 'text-rose-600' : 'text-slate-800'
                    }`}>
                      {machine.telemetry.bearingTempC} °C
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Operating Hours</span>
                    <span className="font-mono font-bold text-sm text-slate-800">
                      {machine.operatingHours.toLocaleString()} hrs
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-1">
                  Last Sensor Ping: {machine.telemetry.lastPing}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TECHNICIAN, ROUTE & DISPATCH */}
          {activeTab === 'tracking' && (
            <div className="space-y-3">
              {/* Assigned Specialist */}
              {assignedTech ? (
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>Assigned Field Engineer</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        assignedTech.status === 'Dropped Out'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {assignedTech.status}
                    </span>
                  </div>
                  <TechnicianIdentity
                    name={assignedTech.name}
                    technicianId={assignedTech.id}
                    status={assignedTech.status}
                  />
                  <div className="text-[11px] text-slate-500 pl-11">
                    {assignedTech.locationName} · Shift: {assignedTech.shift}
                    <div className="text-blue-600 font-medium mt-0.5">
                      {assignedTech.skills.slice(0, 3).join(' • ')}
                    </div>
                  </div>

                  {/* Route & Live Tracking Map */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <ErrorBoundary fallbackTitle="Field Specialist Live Tracking Map">
                      {currentRole === 'Technician' ? (
                        <TechnicianTrackingControls
                          request={request}
                          technician={assignedTech}
                          onStatusChange={(newStatus) => updateBookingStatus(request.id, newStatus)}
                        />
                      ) : (
                        <LiveTechnicianCustomerTrackingMap
                          request={request}
                          technician={assignedTech}
                          heightClass="h-56 sm:h-64"
                        />
                      )}
                    </ErrorBoundary>
                  </div>
                </div>
              ) : offeredTech ? (
                /* Offered Technician & 5-minute countdown */
                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between font-bold text-xs text-rose-900">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                      <span>5-Minute Offer Active</span>
                    </span>
                    <span className="font-mono text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200 tabular-nums">
                      {Math.floor(offerSeconds / 60)}:{(offerSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <TechnicianIdentity
                    name={offeredTech.name}
                    technicianId={offeredTech.id}
                  />
                  <div className="text-[11px] text-slate-500 pl-11">
                    {offeredTech.locationName} · {offeredTech.isVerified ? 'Accredited Specialist' : 'Pending Verification'}
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Offer active. Cascades to next certified specialist at 00:00.
                    </div>
                  </div>

                  {currentRole === 'Technician' && (
                    <div className="flex items-center gap-2 pt-1 border-t border-rose-200/60">
                      <button
                        onClick={() => acceptServiceOffer(request.id)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Accept Offer
                      </button>
                      <button
                        onClick={() => declineServiceOffer(request.id, 'Declined by technician via detail drawer')}
                        className="py-1.5 px-3 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-400">
                  No technician currently assigned or offered for this request.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CHECKLIST, SPARE PARTS & EVIDENCE */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {/* Required Spare Parts */}
              {request.requiredParts && request.requiredParts.length > 0 && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Required Spare Parts</span>
                    <span className="text-[11px] text-slate-400">
                      {request.requiredParts.length} items
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {request.requiredParts.map((rp) => (
                      <div
                        key={rp.partId}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">{rp.partName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Qty Required: {rp.quantity}
                          </div>
                        </div>
                        <PackageCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Field Verification Checklist */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Field Verification Checklist</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {(request.checklist || []).filter((c) => c.completed).length} / {(request.checklist || []).length} Completed
                  </span>
                </div>
                <div className="space-y-1.5">
                  {(request.checklist || []).map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border transition-colors cursor-pointer ${
                        item.completed
                          ? 'bg-emerald-50/60 border-emerald-200 text-slate-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={(e) => updateChecklistItem(request.id, item.id, e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className={`text-[11px] leading-tight ${item.completed ? 'line-through text-slate-400 font-medium' : ''}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Documents & Photo Evidence */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Photos &amp; Documents</span>
                  <span className="text-[11px] text-slate-400">{request.documents.length} files</span>
                </div>

                {request.documents.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {request.documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setPreviewDoc(doc)}
                        className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer hover:border-blue-400 transition-all"
                        title="Click to preview document"
                      >
                        <img src={doc.url} alt={doc.name} className="w-full h-20 object-cover" />
                        <div className="p-1.5 bg-white text-[10px] truncate text-slate-700 font-medium flex items-center justify-between">
                          <span className="truncate">{doc.name}</span>
                          <Eye className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick upload simulator */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Caption (e.g. Laser runout 0.8µm)"
                    value={uploadNote}
                    onChange={(e) => setUploadNote(e.target.value)}
                    className="flex-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSimulatePhotoUpload}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Attach</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CUSTOMER & SITE DETAILS */}
          {activeTab === 'customer' && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3.5">
              <div className="font-bold text-slate-800 text-xs flex items-center justify-between pb-2 border-b border-slate-100">
                <span>Customer Profile &amp; Contracted Facility</span>
                <span className="font-mono text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {request.customerId}
                </span>
              </div>

              <CustomerIdentity
                name={request.siteName}
                customerId={request.customerId}
                siteName={request.siteName}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block">Contact Person</span>
                  <strong className="text-slate-800 text-[11px]">{request.customerContactPerson || 'Arun Mehta'}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block">Phone</span>
                  <strong className="text-slate-800 text-[11px]">{request.customerContactPhone || '+91 98450 12345'}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block">Facility Address</span>
                  <span className="text-slate-700 text-[11px] block">{request.customerAddress || 'Peenya Industrial Area, Phase 1, Bengaluru'}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block">SLA Commitment</span>
                  <span className="font-bold text-emerald-700 text-[11px] block">Tier 1 Critical Guaranteed (&lt;4h)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SERVICE LIFECYCLE HISTORY */}
          {activeTab === 'history' && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
              <div className="font-bold text-slate-800 text-xs flex items-center justify-between pb-2 border-b border-slate-100">
                <span>Service Request Lifecycle History</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {request.history.length} Event(s)
                </span>
              </div>

              <div className="space-y-2">
                {request.history.map((h, hIdx) => (
                  <div
                    key={hIdx}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        <span>Status updated to <strong className="text-blue-700">{h.status}</strong></span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        By {h.changedBy} ({h.changedByRole})
                        {h.notes && <span> &bull; {h.notes}</span>}
                      </div>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: SPARE PARTS FOR REQUEST */}
          {activeTab === 'parts' && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
              <div className="font-bold text-slate-800 text-xs flex items-center justify-between pb-2 border-b border-slate-100">
                <span>Spare Parts Requirement &amp; Reservation</span>
                <span className="font-mono text-[10px] text-blue-700 font-bold">
                  {request.requiredParts ? request.requiredParts.length : 0} Item(s)
                </span>
              </div>

              {request.requiredParts && request.requiredParts.length > 0 ? (
                <div className="space-y-2">
                  {request.requiredParts.map((rp) => (
                    <div
                      key={rp.partId}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{rp.partName}</div>
                        <div className="font-mono text-[10px] text-slate-500">
                          Part ID: {rp.partId}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900">
                          Qty: {rp.quantity}
                        </span>
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          ✓ Allocated
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No dedicated spare parts specified for this service.
                </div>
              )}
            </div>
          )}

          {/* TAB 9: SERVICE COMPLETION REPORT */}
          {activeTab === 'report' && (
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
              <div className="font-bold text-slate-800 text-xs flex items-center justify-between pb-2 border-b border-slate-100">
                <span>Completion Report &amp; Dossier Sign-Off</span>
                <span className="font-mono text-[10px] text-teal-800 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {request.status}
                </span>
              </div>

              {request.completionReport ? (
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <strong className="text-slate-900 text-xs block">Work Summary:</strong>
                    <p className="text-slate-600 leading-relaxed">{request.completionReport.workSummary}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Labor Time</span>
                      <strong className="text-slate-900">{request.completionReport.hoursSpent} Hours</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Vibration RMS</span>
                      <strong className="text-emerald-700 font-mono">{request.completionReport.finalVibrationRms ?? '0.38'} mm/s</strong>
                    </div>
                  </div>

                  {request.completionReport.technicianNotes && (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700">
                      <strong className="text-slate-900">Notes:</strong> {request.completionReport.technicianNotes}
                    </div>
                  )}

                  {request.completionReport.verifiedBy && (
                    <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      ✓ Formally verified and signed off by: {request.completionReport.verifiedBy} ({request.completionReport.verifiedAt})
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Service work is still in progress. Formal completion dossier will appear here once submitted.
                </div>
              )}
            </div>
          )}

          {/* Quick Copilot AI Helper Button */}
          <button
            onClick={() => setIsCopilotOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-800 font-bold text-xs flex items-center justify-center gap-2 hover:shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Ask AI Copilot to Analyze Request</span>
          </button>

          {/* Transition Error Message */}
          {transitionError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] leading-relaxed">
              <div className="font-bold flex items-center gap-1 mb-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Action Blocked:</span>
              </div>
              {transitionError}
            </div>
          )}
        </div>

        {/* Drawer Action Bar (Strict State Machine Controls) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Lifecycle Action</span>
            <span className="text-[10px] text-slate-400 font-normal">
              Acting as: <strong className="text-slate-700">{currentRole}</strong>
            </span>
          </div>

          {possibleTransitions.length === 0 ? (
            <div className="text-center py-2 text-xs text-slate-500 italic">
              {request.status === 'Closed'
                ? 'Request is closed and archived.'
                : request.status === 'Exception'
                ? 'Request in Exception state. Use Recovery Plan above.'
                : 'No pending actions for current state.'}
            </div>
          ) : (
            <div className="space-y-2">
              {possibleTransitions.map((pt) => {
                const validation = validateTransition(request, pt.target, currentRole);
                const Icon = pt.icon;

                return (
                  <div key={pt.target}>
                    <button
                      disabled={!validation.allowed || isSubmitting}
                      onClick={() => handleTransition(pt.target)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
                        !validation.allowed
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                          : pt.variant === 'emerald'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                          : pt.variant === 'cyan'
                          ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-500/20'
                          : pt.variant === 'slate'
                          ? 'bg-slate-700 hover:bg-slate-800 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{pt.label}</span>
                    </button>

                    {!validation.allowed && (
                      <div className="text-[10px] text-slate-500 mt-1 text-center">
                        {validation.reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Safe Document & Photo Preview Modal - Explicit Close Button, background stays visible */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-w-xl w-full p-4 space-y-3 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-xs text-slate-800">{previewDoc.name}</span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                title="Close Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-100 rounded-xl overflow-hidden max-h-[60vh] flex items-center justify-center">
              <img
                src={previewDoc.url}
                alt={previewDoc.name}
                className="max-w-full max-h-[58vh] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80';
                }}
              />
            </div>
            {previewDoc.caption && (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {previewDoc.caption}
              </p>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
