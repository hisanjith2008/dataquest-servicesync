import React, { useState } from 'react';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  ShieldCheck,
  Star,
  Building2,
  X,
  Wrench,
  MapPin,
  User,
  Check,
  FileText,
  AlertOctagon,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { getCustomerFacingStatus } from '../../utils/stateMachine';
import { ServiceRequest, ServiceProgressStage } from '../../types';
import { geocodeAddress } from '../../utils/geocoding';
import { TechnicianCustomerRouteMap } from '../map/TechnicianCustomerRouteMap';
import { LiveTechnicianCustomerTrackingMap } from '../map/LiveTechnicianCustomerTrackingMap';
import { Navigation, Compass } from 'lucide-react';
import { TechnicianIdentity, StandardAvatar } from '../common/StandardIdentity';

const PROGRESS_STAGES: { stage: ServiceProgressStage; label: string }[] = [
  { stage: 'Requested', label: 'Service Requested' },
  { stage: 'Assigned', label: 'Dispatched' },
  { stage: 'En Route', label: 'En Route' },
  { stage: 'In Progress', label: 'Servicing On Site' },
  { stage: 'Completed', label: 'Completed' },
  { stage: 'Verified', label: 'Verified & Closed' },
];

function getStageIndex(req: ServiceRequest): number {
  if (req.status === 'Verified' || req.status === 'Closed') return 5;
  if (req.status === 'Completed') return 4;
  if (
    req.status === 'In Progress' ||
    req.serviceProgressStage === 'In Progress' ||
    req.serviceProgressStage === 'Testing'
  )
    return 3;
  if (req.serviceProgressStage === 'En Route') return 2;
  if (req.assignedTechnicianId || req.serviceProgressStage === 'Assigned') return 1;
  return 0;
}

function getCustomerDisplayStatus(req: ServiceRequest): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  // Use "Service Requested" for newly submitted requests or requests awaiting technician acceptance
  if (
    !req.assignedTechnicianId &&
    (req.status === 'Draft' ||
      req.status === 'Validated' ||
      req.status === 'Pending Approval' ||
      req.status === 'Assigned' ||
      req.serviceProgressStage === 'Requested')
  ) {
    return {
      label: 'Service Requested',
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    };
  }

  switch (req.status) {
    case 'Draft':
    case 'Validated':
    case 'Pending Approval':
      return {
        label: 'Service Requested',
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
      };
    case 'Approved':
      return {
        label: 'Service Approved',
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
      };
    case 'Assigned':
      return {
        label: 'Technician Assigned & Dispatched',
        color: 'text-indigo-700',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
      };
    case 'In Progress':
      return {
        label: 'Service In Progress',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
      };
    case 'Completed':
      return {
        label: 'Service Completed (Pending Verification)',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
      };
    case 'Verified':
      return {
        label: 'Service Verified & Handed Over',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
      };
    case 'Closed':
      return {
        label: 'Service Resolved & Closed',
        color: 'text-slate-700',
        bg: 'bg-slate-100',
        border: 'border-slate-200',
      };
    case 'Exception':
      return {
        label: 'Service Review Pending',
        color: 'text-rose-700',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
      };
    default:
      return {
        label: getCustomerFacingStatus(req.status),
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
      };
  }
}

function getCompletionStatusText(req: ServiceRequest): string {
  if (req.status === 'Verified' || req.status === 'Closed') {
    return 'Service Verified & Handed Over — All quality checks approved.';
  }
  if (req.status === 'Completed') {
    return 'Work Completed by Technician — Central operational review pending.';
  }
  if (req.status === 'In Progress') {
    return 'Service In Progress — On-site inspection and repairs underway.';
  }
  if (req.serviceProgressStage === 'En Route') {
    return 'En Route — Assigned specialist is in transit to your site.';
  }
  if (req.assignedTechnicianId) {
    return 'Dispatched — Specialist assigned; preparing on-site dispatch.';
  }
  return 'Service Requested — Ticket registered; assigning qualified technician.';
}

export const CustomerDashboardView: React.FC = () => {
  const {
    currentRole,
    currentUserAccount,
    scopedRequests,
    machines,
    technicians,
    sites,
    submitCustomerRequest,
    submitCustomerFeedback,
  } = useServiceSync();

  if (currentRole !== 'Customer') {
    return (
      <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-2">
        <h3 className="text-base font-bold text-rose-700">Access Restricted</h3>
        <p className="text-xs text-slate-600">
          You must be logged in as an authorized Customer representative to view this portal.
        </p>
      </div>
    );
  }

  // Active view tab state: 'active' | 'completed' | 'all'
  const [tab, setTab] = useState<'active' | 'completed' | 'all'>('active');

  // Modal states
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState<boolean>(false);
  const [feedbackModalReq, setFeedbackModalReq] = useState<ServiceRequest | null>(null);

  // New Request Form State
  const [selectedMachineId, setSelectedMachineId] = useState<string>('M-104');
  const [requestTitle, setRequestTitle] = useState('');
  const [requestDesc, setRequestDesc] = useState('');
  const [requestPriority, setRequestPriority] = useState<'P1 - Critical' | 'P2 - High' | 'P3 - Medium'>('P1 - Critical');
  const [requestAddress, setRequestAddress] = useState<string>(
    'Plot 48/B, Phase II, Peenya Industrial Area, Bengaluru, Karnataka 560058'
  );
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [geocodedPreview, setGeocodedPreview] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [expandedRouteReqId, setExpandedRouteReqId] = useState<string | null>(null);
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  // Feedback Form State
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackIsDissatisfied, setFeedbackIsDissatisfied] = useState<boolean>(false);
  const [feedbackReason, setFeedbackReason] = useState<string>('Delayed arrival and poor communication');
  const [feedbackComments, setFeedbackComments] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Filter requests
  const activeRequests = scopedRequests.filter(
    (r) => r.status !== 'Closed' && r.status !== 'Verified'
  );
  const completedRequests = scopedRequests.filter(
    (r) => r.status === 'Closed' || r.status === 'Verified' || r.status === 'Completed'
  );

  const displayedRequests = tab === 'active'
    ? activeRequests
    : tab === 'completed'
    ? completedRequests
    : scopedRequests;

  const userSite = sites.find((s) => s.id === (currentUserAccount.siteId || 'site-a')) || sites[0];

  const handleGeocodeCheck = async (addrToGeocode: string) => {
    if (!addrToGeocode.trim()) return;
    setIsGeocodingAddress(true);
    try {
      const res = await geocodeAddress(addrToGeocode.trim());
      setGeocodedPreview({
        lat: res.lat,
        lng: res.lng,
        address: res.formattedAddress,
      });
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTitle.trim()) return;

    setIsSubmittingReq(true);
    try {
      const res = await submitCustomerRequest({
        machineId: selectedMachineId,
        title: requestTitle.trim(),
        description: requestDesc.trim(),
        priority: requestPriority,
        customerAddress: requestAddress.trim(),
        customerCoords: geocodedPreview ? { lat: geocodedPreview.lat, lng: geocodedPreview.lng } : undefined,
      });

      if (res.success) {
        setIsRaiseModalOpen(false);
        setRequestTitle('');
        setRequestDesc('');
        setGeocodedPreview(null);
        setTab('active');
      }
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackModalReq) return;

    setIsSubmittingFeedback(true);
    try {
      const res = await submitCustomerFeedback(feedbackModalReq.id, {
        rating: feedbackRating,
        isDissatisfied: feedbackIsDissatisfied,
        complaintReason: feedbackIsDissatisfied ? feedbackReason : undefined,
        comments: feedbackComments,
      });

      if (res.restrictionCreated) {
        setFeedbackNotice(
          'Complaint recorded. System restriction applied: this technician will not be assigned to your plant for future requests.'
        );
      } else {
        setFeedbackNotice('Thank you! Your rating and feedback have been successfully submitted.');
      }

      setTimeout(() => {
        setFeedbackModalReq(null);
        setFeedbackNotice(null);
        setFeedbackIsDissatisfied(false);
        setFeedbackComments('');
        setFeedbackRating(5);
      }, 2200);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header: Clean, Simple, Focused on Service Requests */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 font-medium">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>{userSite?.name || 'Bharat Precision Works (Site A)'}</span>
              <span aria-hidden="true">·</span>
              <span>{userSite?.city || 'Bengaluru'}, {userSite?.state || 'Karnataka'}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Service Requests
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time tracking of plant machinery servicing, technician assignment, and resolution progress.
            </p>
          </div>

          <div>
            <button
              onClick={() => setIsRaiseModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Raise Service Request</span>
            </button>
          </div>
        </div>

        {/* Clean Summary Metric Bar */}
        <div className="flex flex-wrap items-center gap-6 pt-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Active Requests:</span>
            <span className="font-bold font-mono text-slate-900 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 tabular-nums">
              {activeRequests.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Completed &amp; Handed Over:</span>
            <span className="font-bold font-mono text-slate-900 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100 tabular-nums">
              {completedRequests.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Total Requests:</span>
            <span className="font-bold font-mono text-slate-700 px-2 py-0.5 rounded-md bg-slate-100 tabular-nums">
              {scopedRequests.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter Navigation: Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setTab('active')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            tab === 'active'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Active Requests ({activeRequests.length})
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            tab === 'completed'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Completed ({completedRequests.length})
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            tab === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All Requests ({scopedRequests.length})
        </button>
      </div>

      {/* 3. Requests List */}
      {displayedRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {tab === 'active' ? 'No Active Service Requests' : 'No Requests in this View'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {tab === 'active'
              ? 'All equipment is operating normally with no outstanding maintenance orders.'
              : 'No service requests found for this filter.'}
          </p>
          {tab === 'active' && (
            <button
              onClick={() => setIsRaiseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Raise New Request</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedRequests.map((req) => {
            const statusInfo = getCustomerDisplayStatus(req);
            const currentStageIdx = getStageIndex(req);
            const machine = machines.find((m) => m.id === req.machineId);
            const assignedTech = technicians.find(
              (t) => t.id === req.assignedTechnicianId
            );
            const isCompleted =
              req.status === 'Completed' ||
              req.status === 'Verified' ||
              req.status === 'Closed';

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5 transition-shadow hover:shadow-sm"
              >
                {/* Request Header: Service Requested info, Status & Priority */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Ticket ID */}
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {req.id}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      {/* Current Service Status Badge */}
                      <span
                        className={`font-semibold px-2.5 py-0.5 rounded-md border text-[11px] ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}
                      >
                        {statusInfo.label}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      {/* Priority */}
                      <span
                        className={`font-semibold text-[11px] ${
                          req.priority.includes('Critical')
                            ? 'text-rose-600'
                            : req.priority.includes('High')
                            ? 'text-amber-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {req.priority}
                      </span>
                    </div>

                    {/* Service Requested: Title & Date */}
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight pt-0.5">
                      {req.title}
                    </h2>
                    {req.description && (
                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                        {req.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Service Requested:{' '}
                        {new Date(req.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(req.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        IST
                      </span>
                    </div>
                  </div>

                  {/* Rating / Feedback action if completed */}
                  {isCompleted && (
                    <div className="shrink-0 self-start">
                      {req.customerFeedback ? (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center gap-1 font-semibold text-slate-900">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span>{req.customerFeedback.rating} of 5 Stars Rated</span>
                          </div>
                          {req.customerFeedback.isDissatisfied ? (
                            <div className="text-[11px] text-rose-700 font-medium">
                              Complaint logged: {req.customerFeedback.complaintReason}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 italic">
                              "{req.customerFeedback.comments || 'Service verified and approved.'}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setFeedbackModalReq(req)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>Rate &amp; Feedback</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Key Information Grid: Machine, Location, Assigned Tech, Completion Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* 1. Machine / Equipment */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-slate-400" />
                      <span>Machine / Equipment</span>
                    </div>
                    <div className="font-bold text-slate-900">
                      {machine?.name || req.machineId}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Unit ID: {req.machineId}
                      {machine?.model && ` · Model: ${machine.model}`}
                    </div>
                  </div>

                  {/* 2. Location */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Location</span>
                    </div>
                    <div className="font-bold text-slate-900">
                      {req.siteName || userSite?.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {userSite?.address || 'Plot 48/B, Phase II, Peenya Industrial Area, Bengaluru'}
                    </div>
                  </div>

                  {/* 3. Assigned Technician */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Assigned Technician</span>
                    </div>
                    {assignedTech ? (
                      <div className="space-y-1">
                        <TechnicianIdentity
                          name={assignedTech.name}
                          technicianId={assignedTech.id}
                        />
                        <div className="text-[11px] text-slate-600 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {assignedTech.phone}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Rating: {assignedTech.rating} ★</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 text-[11px] pt-1">
                        <span className="italic">
                          {req.offeredTechnicianId
                            ? 'Specialist offer dispatched (acceptance window active)...'
                            : 'Matching verified specialist in Bengaluru hub...'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Service Progress Visual Stepper */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Service Progress</span>
                    <span className="text-blue-600 font-mono text-[11px]">
                      Step {currentStageIdx + 1} of {PROGRESS_STAGES.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {PROGRESS_STAGES.map((ps, idx) => {
                      const isPast = idx < currentStageIdx;
                      const isCurrent = idx === currentStageIdx;
                      return (
                        <div
                          key={ps.stage}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            isCurrent
                              ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold shadow-2xs'
                              : isPast
                              ? 'bg-slate-50 border-slate-200 text-slate-700'
                              : 'bg-white border-slate-200/60 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-center mb-1">
                            {isPast ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                            ) : isCurrent ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-slate-300" />
                            )}
                          </div>
                          <div className="text-[11px] truncate">{ps.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Completion Status Note & Transit Map Toggle */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="font-semibold text-slate-800">Completion Status:</span>
                    <span className="text-slate-600 font-medium">
                      {getCompletionStatusText(req)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Route Map Toggle if technician assigned */}
                    {assignedTech && (
                      <button
                        onClick={() =>
                          setExpandedRouteReqId((prev) => (prev === req.id ? null : req.id))
                        }
                        className="text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {expandedRouteReqId === req.id
                            ? 'Hide Live Map'
                            : 'Track Technician (Live GPS & ETA)'}
                        </span>
                      </button>
                    )}

                    {/* If completed and needs feedback */}
                    {isCompleted && !req.customerFeedback && (
                      <button
                        onClick={() => setFeedbackModalReq(req)}
                        className="text-amber-600 hover:text-amber-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Submit Rating &amp; Feedback</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Technician Tracking Map with Moving Marker */}
                {expandedRouteReqId === req.id && (
                  <div className="pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                    <LiveTechnicianCustomerTrackingMap
                      request={req}
                      technician={assignedTech}
                      heightClass="h-80 sm:h-96"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Raise Service Request Modal */}
      {isRaiseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Raise Service Request</h3>
                <p className="text-xs text-slate-500">
                  {userSite?.name} · {userSite?.city}
                </p>
              </div>
              <button
                onClick={() => setIsRaiseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRaiseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Machine / Equipment Unit
                </label>
                <select
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  {machines
                    .filter((m) => m.siteId === (currentUserAccount.siteId || 'site-a'))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id}: {m.name} ({m.model})
                      </option>
                    ))}
                  {/* Fallbacks if not filtered */}
                  <option value="M-104">M-104: Matsuura 5-Axis CNC Milling Spindle</option>
                  <option value="M-202">M-202: Sodick ALC600G Precision Wire EDM</option>
                  <option value="M-305">M-305: Applied Materials Centura CVD Chamber</option>
                  <option value="M-410">M-410: Schuler 400-Ton Hydraulic Servopress</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Service Request Title
                </label>
                <input
                  type="text"
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                  placeholder="e.g. Spindle Vibration Anomaly & High Temperature Alarm"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fault Description &amp; Symptoms
                </label>
                <textarea
                  rows={3}
                  value={requestDesc}
                  onChange={(e) => setRequestDesc(e.target.value)}
                  placeholder="Describe observed vibration, noise harmonics, visual leaks, or production stoppage..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Service Address with Google Maps Geocoding */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Service Location Address (Text to Geocode)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGeocodeCheck(requestAddress)}
                    disabled={isGeocodingAddress || !requestAddress.trim()}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Compass className="w-3.5 h-3.5 text-blue-500" />
                    <span>{isGeocodingAddress ? 'Geocoding...' : 'Verify Coordinates via Google'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={requestAddress}
                  onChange={(e) => {
                    setRequestAddress(e.target.value);
                    setGeocodedPreview(null);
                  }}
                  onBlur={() => handleGeocodeCheck(requestAddress)}
                  placeholder="e.g. Plot 48/B, Phase II, Peenya Industrial Area, Bengaluru, Karnataka"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />

                {/* Geocoding confirmation status */}
                {geocodedPreview ? (
                  <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center justify-between">
                    <span className="flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Geocoded: <strong>{geocodedPreview.lat.toFixed(4)}, {geocodedPreview.lng.toFixed(4)}</strong></span>
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-white/70 px-1.5 py-0.5 rounded border border-emerald-200">
                      Google Maps Geocoding API
                    </span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Text address will be automatically geocoded to coordinates and saved with the booking.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Priority Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['P1 - Critical', 'P2 - High', 'P3 - Medium'] as const).map((pri) => (
                    <button
                      key={pri}
                      type="button"
                      onClick={() => setRequestPriority(pri)}
                      className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        requestPriority === pri
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pri.split(' - ')[1]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRaiseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReq}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingReq ? 'Submitting...' : 'Submit Service Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Customer Rating & Feedback / Complaint Modal */}
      {feedbackModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Rate Service &amp; Provide Feedback
                </h3>
                <p className="text-xs text-slate-500">
                  {feedbackModalReq.id} · {feedbackModalReq.title}
                </p>
              </div>
              <button
                onClick={() => setFeedbackModalReq(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedbackNotice ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Feedback Recorded Successfully
                </div>
                <div>{feedbackNotice}</div>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                {/* 1. Rating */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Overall Service Rating
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setFeedbackRating(star);
                          if (star <= 2) setFeedbackIsDissatisfied(true);
                        }}
                        className="p-1 transition-transform hover:scale-110 cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= feedbackRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-semibold text-slate-700 ml-2">
                      {feedbackRating} of 5 Stars
                    </span>
                  </div>
                </div>

                {/* 2. Comments / Feedback */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Feedback Comments
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackComments}
                    onChange={(e) => setFeedbackComments(e.target.value)}
                    placeholder="Share your observations regarding the repair workmanship, response time, and equipment performance..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* 3. Complaint & Dissatisfaction */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feedbackIsDissatisfied}
                      onChange={(e) => setFeedbackIsDissatisfied(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">
                        File an official service complaint / dissatisfied with technician
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Check this box if service quality, turnaround time, or technician demeanor was unsatisfactory.
                      </span>
                    </div>
                  </label>

                  {/* Complaint details if checked */}
                  {feedbackIsDissatisfied && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2 mt-2">
                      <div className="font-semibold flex items-center gap-1.5 text-rose-700">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Technician Restriction Safeguard
                      </div>
                      <p className="text-[11px] leading-relaxed text-rose-800">
                        Submitting an official complaint automatically restricts this technician from being assigned to your plant for future requests.
                      </p>

                      <div>
                        <label className="block text-[11px] font-semibold text-rose-900 mb-1">
                          Primary Reason for Complaint:
                        </label>
                        <select
                          value={feedbackReason}
                          onChange={(e) => setFeedbackReason(e.target.value)}
                          className="w-full bg-white border border-rose-300 rounded-lg p-2 text-xs text-rose-950 font-medium cursor-pointer"
                        >
                          <option value="Rough handling or scratch on precision components">
                            Rough handling or scratch on precision components
                          </option>
                          <option value="Delayed arrival and poor communication">
                            Delayed arrival &gt;2 hours without communication
                          </option>
                          <option value="Incomplete checklist verification">
                            Incomplete checklist verification or failed test run
                          </option>
                          <option value="Safety standard violation">
                            Safety standard or cleanroom protocol violation
                          </option>
                          <option value="Unprofessional field demeanor">
                            Unprofessional field demeanor
                          </option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setFeedbackModalReq(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFeedback}
                    className={`px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                      feedbackIsDissatisfied
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isSubmittingFeedback
                      ? 'Submitting...'
                      : feedbackIsDissatisfied
                      ? 'Submit Complaint & Apply Restriction'
                      : 'Submit Rating & Feedback'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
