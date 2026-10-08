import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  Package,
  Wrench,
  Clock,
  Building2,
  FileText,
  Star,
  Eye,
  Zap,
  TrendingUp,
  AlertOctagon,
  Search,
  Filter,
  FileCheck,
  Activity,
  Layers,
  Camera,
  MapPin,
  Lock,
  ArrowRight,
  UserCheck,
  KeyRound,
  History,
  ChevronRight,
  ExternalLink,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { getCustomerFacingStatus, getStatusColor } from '../../utils/stateMachine';
import { getSlaRemainingInfo } from '../../utils/conflictEngine';
import { ServiceRequest, Technician, Machine, SparePart, UserAccount } from '../../types';
import { EquipmentMap } from '../map/EquipmentMap';
import { AdminPendingActions } from './AdminPendingActions';
import { AdminServiceDossierModal } from './AdminServiceDossierModal';
import { AdminCredentialsModal } from './AdminCredentialsModal';
import { InventoryView } from '../inventory/InventoryView';

export const AdminDashboardView: React.FC = () => {
  const {
    currentRole,
    accounts,
    requests,
    technicians,
    machines,
    parts,
    sparePartRequests,
    customerFeedbacks,
    auditLog,
    verifyTechnician,
    approveSparePartOrder,
    approveSparePartStocking,
    rejectSparePartRequest,
    verifyServiceCompletion,
    removeTechnicianRestriction,
    resolveCustomerComplaint,
    setSelectedRequestId,
    triggerSimulatedIotAlert,
    setIsRecoveryModalOpen,
  } = useServiceSync();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'requests' | 'technicians' | 'machines' | 'inventory' | 'feedback' | 'telemetry_map' | 'pending'
  >('overview');

  const [requestFilter, setRequestFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [techFilter, setTechFilter] = useState<string>('all');
  const [dossierRequest, setDossierRequest] = useState<ServiceRequest | null>(null);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState<boolean>(false);
  const [selectedAccountForCredentials, setSelectedAccountForCredentials] = useState<UserAccount | null>(null);

  if (currentRole !== 'Admin') {
    return (
      <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-2">
        <h3 className="text-base font-bold text-rose-700">Access Restricted</h3>
        <p className="text-xs text-slate-600">
          You must be logged in as an authorized System Administrator to view this operations console.
        </p>
      </div>
    );
  }

  // Filtered entity sets
  const unverifiedTechs = technicians.filter((t) => !t.isVerified);
  const pendingPartOrders = sparePartRequests.filter((pr) => pr.status === 'Pending Admin Approval');
  const orderedPartsAwaitingStocking = sparePartRequests.filter((pr) => pr.status === 'Approved & Ordered');
  const pendingServiceVerifications = requests.filter((r) => r.status === 'Completed');
  const completedAndVerifiedRequests = requests.filter((r) => r.status === 'Completed' || r.status === 'Verified' || r.status === 'Closed');
  const pendingRequests = requests.filter((r) => r.status === 'Draft' || r.status === 'Validated' || r.status === 'Pending Approval' || r.status === 'Exception' || r.status === 'Reassigning');
  const openRequests = requests.filter((r) => r.status !== 'Closed' && r.status !== 'Verified');
  const activeComplaints = customerFeedbacks.filter((fb) => fb.isDissatisfied && fb.status !== 'Resolved');
  const lowStockParts = parts.filter((p) => p.inStock <= p.minThreshold);
  const activeRestrictionsCount = technicians.reduce((acc, t) => acc + (t.restrictedCustomerIds?.length || 0), 0);

  const totalPendingActionCount =
    unverifiedTechs.length +
    pendingPartOrders.length +
    orderedPartsAwaitingStocking.length +
    pendingServiceVerifications.length +
    activeComplaints.length;

  // Average CSAT calculation
  const totalRatings = customerFeedbacks.length;
  const avgRating = totalRatings > 0
    ? (customerFeedbacks.reduce((acc, f) => acc + f.rating, 0) / totalRatings).toFixed(1)
    : '4.8';

  const stagesList = ['Requested', 'Assigned', 'En Route', 'In Progress', 'Testing', 'Completed', 'Verified'] as const;

  return (
    <div className="space-y-6">
      {/* 1. TOP METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Pending Actions (Primary focus) */}
        <div
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Pending Actions</span>
            <AlertOctagon className={`w-4 h-4 ${totalPendingActionCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${totalPendingActionCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {totalPendingActionCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Require Admin action</div>
        </div>

        {/* Metric 2: Active Work Orders */}
        <div
          onClick={() => setActiveTab('requests')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-blue-500/10 border-blue-400 ring-2 ring-blue-400/20 shadow-xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Active Work Orders</span>
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {openRequests.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across 3 Hubs</div>
        </div>

        {/* Metric 3: Technician Verification */}
        <div
          onClick={() => setActiveTab('technicians')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'technicians'
              ? 'bg-emerald-500/10 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Verified Techs</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {technicians.filter((t) => t.isVerified).length}/{technicians.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {unverifiedTechs.length > 0 ? `${unverifiedTechs.length} unverified` : 'All certified'}
          </div>
        </div>

        {/* Metric 4: Machines Status */}
        <div
          onClick={() => setActiveTab('machines')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'machines'
              ? 'bg-cyan-500/10 border-cyan-400 ring-2 ring-cyan-400/20 shadow-xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Machine Fleet</span>
            <Activity className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {machines.filter((m) => m.status === 'Operational').length}/{machines.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Operational assets</div>
        </div>

        {/* Metric 5: Inventory Value & Alerts */}
        <div
          onClick={() => setActiveTab('inventory')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-indigo-500/10 border-indigo-400 ring-2 ring-indigo-400/20 shadow-xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Parts Inventory</span>
            <Package className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-700 tabular-nums">
            {lowStockParts.length > 0 ? `${lowStockParts.length} Low` : 'Normal'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Valued Stocks</div>
        </div>

        {/* Metric 6: Customer CSAT */}
        <div
          onClick={() => setActiveTab('feedback')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'feedback'
              ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
              : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">CSAT Rating</span>
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {avgRating} ★
          </div>
          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
            {activeComplaints.length} open complaints
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Operations Command Center</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Wrench className="w-4 h-4 text-blue-600" />
          <span>Service Requests &amp; Progress ({requests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('technicians')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'technicians'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-600" />
          <span>Technicians &amp; Availability ({technicians.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('machines')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'machines'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Activity className="w-4 h-4 text-cyan-600" />
          <span>Machine Status &amp; Telemetry ({machines.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Package className="w-4 h-4 text-indigo-600" />
          <span>Spare Parts Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'feedback'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
          <span>Customer Ratings &amp; Complaints ({customerFeedbacks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <FileCheck className="w-4 h-4 text-amber-600" />
          <span>Pending Actions</span>
          {totalPendingActionCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold font-mono">
              {totalPendingActionCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('telemetry_map')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'telemetry_map'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-purple-600" />
          <span>GIS Map &amp; Radar</span>
        </button>
      </div>

      {/* 3. TAB PANELS */}

      {/* TAB 0: OPERATIONS COMMAND CENTER (Full centralized monitoring hierarchy) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* SECTION 1: PENDING ADMIN ACTIONS (Urgent attention banner & summary) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  totalPendingActionCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Pending Admin Actions</span>
                    {totalPendingActionCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-mono font-bold">
                        {totalPendingActionCount} Requires Attention
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    High-priority approvals, technician certifications, service verifications, and customer grievances.
                  </p>
                </div>
              </div>

              {totalPendingActionCount > 0 && (
                <button
                  onClick={() => setActiveTab('pending')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start sm:self-center cursor-pointer"
                >
                  <span>Open Full Pending Queue</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {totalPendingActionCount === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                <span className="font-semibold text-slate-800">All administrative operational queues are clear.</span>
                <span className="block text-slate-400 mt-0.5">No pending technician certifications or parts orders awaiting action.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Pending 1: Unverified Technicians */}
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-900">Technician Certifications</span>
                    <span className="font-mono font-bold text-xs bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                      {unverifiedTechs.length}
                    </span>
                  </div>
                  {unverifiedTechs.length === 0 ? (
                    <div className="text-[11px] text-slate-400">All certified.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {unverifiedTechs.slice(0, 2).map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-amber-200/60">
                          <span className="font-semibold text-slate-800 truncate max-w-[120px]">{t.name}</span>
                          <button
                            onClick={() => verifyTechnician(t.id, true)}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] cursor-pointer"
                          >
                            Verify
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending 2: Spare Part Procurement Orders */}
                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-900">Parts Orders</span>
                    <span className="font-mono font-bold text-xs bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                      {pendingPartOrders.length}
                    </span>
                  </div>
                  {pendingPartOrders.length === 0 ? (
                    <div className="text-[11px] text-slate-400">No pending requisitions.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {pendingPartOrders.slice(0, 2).map((pr) => (
                        <div key={pr.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-blue-200/60">
                          <span className="font-semibold text-slate-800 truncate max-w-[120px]">{pr.partName}</span>
                          <button
                            onClick={() => approveSparePartOrder(pr.id)}
                            className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] cursor-pointer"
                          >
                            Approve
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending 3: Completed Service Verifications */}
                <div className="p-3 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-teal-900">Completion Sign-Offs</span>
                    <span className="font-mono font-bold text-xs bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded">
                      {pendingServiceVerifications.length}
                    </span>
                  </div>
                  {pendingServiceVerifications.length === 0 ? (
                    <div className="text-[11px] text-slate-400">All sign-offs verified.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {pendingServiceVerifications.slice(0, 2).map((req) => (
                        <div key={req.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-teal-200/60">
                          <span className="font-semibold text-slate-800 truncate max-w-[120px]">{req.id} ({req.machineId})</span>
                          <button
                            onClick={() => setDossierRequest(req)}
                            className="px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[10px] cursor-pointer"
                          >
                            Inspect
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending 4: Active Customer Grievances */}
                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-900">Open Grievances</span>
                    <span className="font-mono font-bold text-xs bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                      {activeComplaints.length}
                    </span>
                  </div>
                  {activeComplaints.length === 0 ? (
                    <div className="text-[11px] text-slate-400">No unresolved complaints.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {activeComplaints.slice(0, 2).map((fb) => (
                        <div key={fb.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-rose-200/60">
                          <span className="font-semibold text-slate-800 truncate max-w-[120px]">{fb.customerName}</span>
                          <button
                            onClick={() => resolveCustomerComplaint(fb.id)}
                            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[10px] cursor-pointer"
                          >
                            Resolve
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: ACTIVE & PENDING SERVICE REQUESTS (Centralized DQBH Monitoring Table) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Active Service Requests &amp; Field Progress Lifecycle
                </h3>
                <p className="text-xs text-slate-500">
                  DQBH centralized monitoring table. Click any service request row to open the complete details drawer.
                </p>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search ID, machine, site..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <select
                  value={requestFilter}
                  onChange={(e) => setRequestFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="all">All Statuses ({requests.length})</option>
                  <option value="pending">Pending ({pendingRequests.length})</option>
                  <option value="active">Active ({openRequests.length})</option>
                  <option value="Exception">Exceptions ({requests.filter(r => r.status === 'Exception').length})</option>
                  <option value="Assigned">Assigned ({requests.filter(r => r.status === 'Assigned').length})</option>
                  <option value="In Progress">In Progress ({requests.filter(r => r.status === 'In Progress').length})</option>
                  <option value="Completed">Completed ({requests.filter(r => r.status === 'Completed').length})</option>
                  <option value="Verified">Verified ({requests.filter(r => r.status === 'Verified').length})</option>
                </select>
              </div>
            </div>

            {/* DQBH High-Density Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-3.5">ID</th>
                    <th className="py-3 px-3.5">Machine &amp; Site</th>
                    <th className="py-3 px-3.5">Priority</th>
                    <th className="py-3 px-3.5">Technician</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Progress (7-Stage)</th>
                    <th className="py-3 px-3.5">SLA Countdown</th>
                    <th className="py-3 px-3.5">Readiness</th>
                    <th className="py-3 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests
                    .filter((r) => {
                      if (requestFilter === 'pending') return r.status === 'Draft' || r.status === 'Validated' || r.status === 'Pending Approval' || r.status === 'Exception';
                      if (requestFilter === 'active') return r.status !== 'Closed' && r.status !== 'Verified';
                      if (requestFilter !== 'all') return r.status === requestFilter;
                      return true;
                    })
                    .filter((r) => !searchTerm || r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase()) || r.machineId.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((r) => {
                      const assignedTech = technicians.find((t) => t.id === r.assignedTechnicianId);
                      const offeredTech = technicians.find((t) => t.id === r.offeredTechnicianId);
                      const sla = getSlaRemainingInfo(r.slaDeadline);
                      const statusStyle = getStatusColor(r.status);
                      const curStageIdx = stagesList.indexOf(r.serviceProgressStage as any);

                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedRequestId(r.id)}
                          className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                        >
                          {/* ID */}
                          <td className="py-3 px-3.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                            {r.id}
                          </td>

                          {/* Machine & Site */}
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span className="font-mono text-slate-800">{r.machineId}</span>
                              <span className="text-slate-300">·</span>
                              <span className="truncate max-w-[160px] text-slate-600">{r.siteName}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">
                              {r.title}
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              r.priority.includes('Critical')
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {r.priority.split(' ')[0]}
                            </span>
                          </td>

                          {/* Technician */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {assignedTech ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={assignedTech.avatar}
                                  alt={assignedTech.name}
                                  className="w-6 h-6 rounded-full object-cover border border-slate-200"
                                />
                                <span className="font-medium text-slate-900">{assignedTech.name}</span>
                              </div>
                            ) : offeredTech ? (
                              <div className="flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                                <Clock className="w-3 h-3 animate-spin text-amber-600" />
                                <span>Offered ({offeredTech.name.split(' ')[0]})</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                              {getCustomerFacingStatus(r.status)}
                            </span>
                            {r.frozenWindow && (
                              <span className="block text-[10px] text-cyan-700 font-bold mt-0.5">
                                Frozen Disassembly
                              </span>
                            )}
                          </td>

                          {/* Progress (7-Stage Mini Stepper) */}
                          <td className="py-3 px-3.5 min-w-[130px]">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span className="font-semibold text-slate-700">{r.serviceProgressStage}</span>
                              <span>{curStageIdx + 1}/7</span>
                            </div>
                            <div className="grid grid-cols-7 gap-0.5">
                              {stagesList.map((st, idx) => (
                                <div
                                  key={st}
                                  className={`h-1.5 rounded-full ${
                                    r.serviceProgressStage === st
                                      ? 'bg-blue-600'
                                      : curStageIdx >= idx
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </td>

                          {/* SLA Countdown */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className={`font-mono font-bold text-xs ${
                              sla.isBreached || sla.isAtRisk ? 'text-rose-600' : 'text-slate-700'
                            }`}>
                              {sla.formatted}
                            </span>
                          </td>

                          {/* Readiness */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {r.preFlightScore ? (
                              <span className={`font-mono font-bold text-xs ${
                                r.preFlightScore.totalScore >= 80 ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                                {r.preFlightScore.totalScore}/100
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            {r.status === 'Exception' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRequestId(r.id);
                                  setIsRecoveryModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer"
                              >
                                Recovery Plan
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRequestId(r.id);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: 2-COLUMN GRID (Technician Status & Machine Fleet Status) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: Technician Roster & Status */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-sm text-slate-900">Technician Roster &amp; Availability</h4>
                </div>
                <button
                  onClick={() => setActiveTab('technicians')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Full Roster</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {technicians.slice(0, 4).map((tech) => (
                  <div key={tech.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={tech.avatar}
                        alt={tech.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="truncate">{tech.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            tech.status === 'Available'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tech.status === 'Dropped Out'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {tech.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {tech.locationName} · Shift: {tech.shift} · {tech.phone}
                        </div>
                        {tech.restrictedCustomerIds && tech.restrictedCustomerIds.length > 0 && (
                          <div className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>Restricted from {tech.restrictedCustomerIds.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs text-blue-700">
                        {tech.activeLoad}/{tech.maxCapacity} Jobs
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {tech.firstTimeFixRate}% Fix · {tech.rating} ★
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 2: Machine Fleet Health & Sensor Telemetry */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-600" />
                  <h4 className="font-bold text-sm text-slate-900">Machine Fleet Health &amp; Telemetry</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => triggerSimulatedIotAlert('M-104')}
                    className="text-[11px] bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200 font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Simulate M-104 Alarm
                  </button>
                  <button
                    onClick={() => setActiveTab('machines')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>All Fleet</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {machines.slice(0, 4).map((machine) => {
                  const machineOrders = requests.filter((r) => r.machineId === machine.id && r.status !== 'Closed' && r.status !== 'Verified');

                  return (
                    <div key={machine.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{machine.id}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            machine.status === 'Operational'
                              ? 'bg-emerald-100 text-emerald-800'
                              : machine.status === 'Critical Fault'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {machine.status}
                          </span>
                        </div>
                        <div className="font-bold text-slate-800 mt-0.5">{machine.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {machine.siteName} · {machine.model}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <div className="text-[10px] text-slate-400">Vibration</div>
                          <div className={`font-mono font-bold text-xs ${
                            machine.telemetry.vibrationRms > 4.0 ? 'text-rose-600' : 'text-slate-800'
                          }`}>
                            {machine.telemetry.vibrationRms} mm/s
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400">Bearing</div>
                          <div className={`font-mono font-bold text-xs ${
                            machine.telemetry.bearingTempC > 70 ? 'text-rose-600' : 'text-slate-800'
                          }`}>
                            {machine.telemetry.bearingTempC} °C
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400">Orders</div>
                          <div className="font-mono font-bold text-xs text-blue-700">
                            {machineOrders.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 4: 2-COLUMN GRID (Spare Parts & Complaints/Ratings) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 3: Spare Parts Inventory */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-sm text-slate-900">Spare Parts Inventory &amp; Valuation</h4>
                </div>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Manage Inventory</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {lowStockParts.length > 0 && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span><strong>{lowStockParts.length} Critical Items</strong> below warehouse safety threshold</span>
                  </div>
                  <span className="font-mono font-bold text-[11px] bg-white px-2 py-0.5 rounded border border-rose-200">
                    Reorder Required
                  </span>
                </div>
              )}

              <div className="space-y-2.5">
                {parts.slice(0, 4).map((p) => (
                  <div key={p.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {p.sku} · Hub: {p.siteName}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div>
                        <div className="text-[10px] text-slate-400">Unit Cost</div>
                        <div className="font-mono font-bold text-slate-800">₹{p.unitCost.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">In Stock</div>
                        <div className={`font-mono font-bold ${p.inStock <= p.minThreshold ? 'text-rose-600' : 'text-slate-800'}`}>
                          {p.inStock} (min: {p.minThreshold})
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 4: Customer Complaints & CSAT Ratings */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  <h4 className="font-bold text-sm text-slate-900">Customer CSAT &amp; Dissatisfaction Grievances</h4>
                </div>
                <button
                  onClick={() => setActiveTab('feedback')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Grievances Ledger</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Average Rating</span>
                  <div className="text-2xl font-bold font-mono text-slate-900 flex items-center justify-center gap-1 mt-0.5">
                    <span>{avgRating}</span>
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  </div>
                  <span className="text-[10px] text-slate-400">{customerFeedbacks.length} Verified Reviews</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Active Plant Restrictions</span>
                  <div className="text-2xl font-bold font-mono text-rose-600 mt-0.5">
                    {activeRestrictionsCount}
                  </div>
                  <span className="text-[10px] text-slate-400">Site disbarments</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {customerFeedbacks.slice(0, 2).map((fb) => (
                  <div key={fb.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-900">{fb.customerName} ({fb.requestId})</span>
                      <span className="text-amber-500 font-mono">{fb.rating} ★</span>
                    </div>
                    <p className="text-slate-600 italic text-[11px]">&ldquo;{fb.comments}&rdquo;</p>
                    {fb.restrictionCreated && (
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/80">
                        <span className="text-rose-700 font-semibold">Technician {fb.technicianName} barred from plant</span>
                        <button
                          onClick={() => removeTechnicianRestriction(fb.technicianId, fb.siteId)}
                          className="px-2 py-0.5 rounded bg-white border border-rose-300 text-rose-700 font-semibold hover:bg-rose-50 cursor-pointer"
                        >
                          Lift
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 5: SECURE SERVICE HISTORY STREAM */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Secure Service History</h4>
                  <p className="text-xs text-slate-500">A tamper-evident record of important ServiceSync activities.</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Chain Status: Verified</span>
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {auditLog.slice(0, 5).map((log) => {
                const detailText =
                  typeof log.details === 'string'
                    ? log.details
                    : log.details?.notes ||
                      log.details?.description ||
                      log.details?.summary ||
                      log.details?.message ||
                      JSON.stringify(log.details);

                return (
                  <div
                    key={log.id || log.sequenceIndex}
                    onClick={() => {
                      if (log.entityId && log.entityId.startsWith('SR-')) {
                        setSelectedRequestId(log.entityId);
                      }
                    }}
                    className={`py-3 flex items-start justify-between gap-3 text-xs transition-colors rounded-lg px-2 ${
                      log.entityId && log.entityId.startsWith('SR-') ? 'hover:bg-blue-50/50 cursor-pointer' : ''
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{log.action}</span>
                        {log.entityId && (
                          <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded text-[10px]">
                            {log.entityId}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">({log.entityType})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-lg">{detailText}</div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(log.timestamp).toLocaleTimeString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-600 font-medium">
                        by {log.actor} ({log.actorRole})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: CLEAR PENDING-ACTION SECTIONS */}
      {activeTab === 'pending' && (
        <AdminPendingActions
          unverifiedTechs={unverifiedTechs}
          pendingPartOrders={pendingPartOrders}
          orderedPartsAwaitingStocking={orderedPartsAwaitingStocking}
          pendingServiceVerifications={pendingServiceVerifications}
          activeComplaints={activeComplaints}
          technicians={technicians}
          parts={parts}
          onVerifyTechnician={verifyTechnician}
          onApprovePartOrder={approveSparePartOrder}
          onApprovePartStocking={approveSparePartStocking}
          onRejectPartRequest={rejectSparePartRequest}
          onVerifyService={verifyServiceCompletion}
          onResolveComplaint={resolveCustomerComplaint}
          onRemoveRestriction={removeTechnicianRestriction}
          onOpenDossier={(req) => setDossierRequest(req)}
          onSelectRequest={(id) => setSelectedRequestId(id)}
        />
      )}

      {/* TAB 2: SERVICE REQUESTS & SERVICE PROGRESS MONITORING */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Service Requests, Assignments &amp; Progress Lifecycle
              </h3>
              <p className="text-xs text-slate-500">
                Monitor all service requests, technician assignments, frozen servicing windows, and completion reports.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search machine, site, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <select
                value={requestFilter}
                onChange={(e) => setRequestFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="all">All Statuses ({requests.length})</option>
                <option value="pending">Pending Requests ({pendingRequests.length})</option>
                <option value="active">Active/In Progress ({openRequests.length})</option>
                <option value="completed">Completed/Verified ({completedAndVerifiedRequests.length})</option>
                <option value="Exception">Exceptions ({requests.filter(r => r.status === 'Exception').length})</option>
                <option value="Assigned">Assigned ({requests.filter(r => r.status === 'Assigned').length})</option>
                <option value="In Progress">In Progress ({requests.filter(r => r.status === 'In Progress').length})</option>
                <option value="Completed">Completed ({requests.filter(r => r.status === 'Completed').length})</option>
                <option value="Verified">Verified ({requests.filter(r => r.status === 'Verified').length})</option>
              </select>
            </div>
          </div>

          {/* Service Progress Flow Legend */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-900">7-Stage Lifecycle:</span>
            {stagesList.map((stage, idx) => (
              <span key={stage} className="flex items-center gap-1 font-mono">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px]">
                  {idx + 1}
                </span>
                <span>{stage}</span>
                {idx < stagesList.length - 1 && <span className="text-slate-300">→</span>}
              </span>
            ))}
          </div>

          <div className="divide-y divide-slate-100">
            {requests
              .filter((r) => {
                if (requestFilter === 'pending') return r.status === 'Draft' || r.status === 'Validated' || r.status === 'Pending Approval' || r.status === 'Exception';
                if (requestFilter === 'active') return r.status !== 'Closed' && r.status !== 'Verified';
                if (requestFilter === 'completed') return r.status === 'Completed' || r.status === 'Verified' || r.status === 'Closed';
                if (requestFilter !== 'all') return r.status === requestFilter;
                return true;
              })
              .filter((r) => !searchTerm || r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase()) || r.machineId.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((r) => {
                const assignedTech = technicians.find((t) => t.id === r.assignedTechnicianId);
                const offeredTech = technicians.find((t) => t.id === r.offeredTechnicianId);
                const sla = getSlaRemainingInfo(r.slaDeadline);
                const currentStageIndex = stagesList.indexOf(r.serviceProgressStage as any);

                return (
                  <div key={r.id} className="py-4 hover:bg-slate-50/50 px-2 rounded-xl transition-colors space-y-2.5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {r.id}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-semibold text-slate-800">
                            {getCustomerFacingStatus(r.status)}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className={`font-semibold ${
                            r.priority.includes('Critical') ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200'
                          }`}>
                            {r.priority}
                          </span>
                          {r.frozenWindow && (
                            <span className="text-[10px] bg-slate-900 text-white font-mono px-2 py-0.5 rounded flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Frozen Window Active
                            </span>
                          )}
                          {r.offeredTechnicianId && !r.assignedTechnicianId && (
                            <span className="text-[10px] bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded border border-rose-200">
                              5-Min Offer Countdown Active ({offeredTech?.name})
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-slate-900">{r.title}</h4>
                        <div className="text-xs text-slate-500">
                          Facility: {r.siteName} · Machine Asset: <strong className="text-slate-800">{r.machineId}</strong> · Assigned: <strong className="text-slate-800">{assignedTech ? assignedTech.name : offeredTech ? `${offeredTech.name} (Offered)` : 'Unassigned'}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <div className="text-right text-xs mr-2">
                          <span className="text-[10px] text-slate-400 block">SLA Remaining</span>
                          <span className={`font-mono font-bold ${sla.isAtRisk || sla.isBreached ? 'text-rose-600' : 'text-slate-700'}`}>
                            {sla.formatted}
                          </span>
                        </div>

                        {r.completionReport && (
                          <button
                            onClick={() => setDossierRequest(r)}
                            className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs border border-teal-200 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Service Dossier</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedRequestId(r.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Inspect Detail
                        </button>
                      </div>
                    </div>

                    {/* Progress Stepper Bar */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-slate-500">Service Stage: <strong className="text-blue-700 font-mono">{r.serviceProgressStage}</strong></span>
                        <span className="text-slate-400 text-[10px]">
                          Checklist: {r.checklist ? r.checklist.filter(c => c.completed).length : 0}/{r.checklist ? r.checklist.length : 0} Completed
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {stagesList.map((stage, sIdx) => {
                          const isComplete = currentStageIndex >= sIdx;
                          const isCurrent = r.serviceProgressStage === stage;

                          return (
                            <div
                              key={stage}
                              className={`h-2 rounded-full transition-all ${
                                isCurrent
                                  ? 'bg-blue-600 ring-2 ring-blue-300'
                                  : isComplete
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-200'
                              }`}
                              title={`${stage} ${isComplete ? '(Done)' : ''}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: TECHNICIANS, AVAILABILITY & VERIFICATION */}
      {activeTab === 'technicians' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Technician Roster, Availability &amp; Accreditation Status
              </h3>
              <p className="text-xs text-slate-500">
                Real-time tracking of technician availability, active load, customer site restrictions, and verification clearance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedAccountForCredentials(null);
                  setIsCredentialsModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Credentials Vault &amp; Passwords</span>
              </button>

              <select
                value={techFilter}
                onChange={(e) => setTechFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="all">All Technicians ({technicians.length})</option>
                <option value="unverified">Unverified ({unverifiedTechs.length})</option>
                <option value="available">Available ({technicians.filter(t => t.status === 'Available').length})</option>
                <option value="restricted">Restricted ({technicians.filter(t => t.restrictedCustomerIds?.length > 0).length})</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {technicians
              .filter((t) => {
                if (techFilter === 'unverified') return !t.isVerified;
                if (techFilter === 'available') return t.status === 'Available';
                if (techFilter === 'restricted') return t.restrictedCustomerIds && t.restrictedCustomerIds.length > 0;
                return true;
              })
              .map((tech) => (
                <div key={tech.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <img
                      src={tech.avatar}
                      alt={tech.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">{tech.name}</span>
                        <span className="font-mono text-slate-400 text-[11px]">({tech.id})</span>
                        {tech.isVerified ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold text-[10px] border border-emerald-200">
                            Verified by Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-[10px] border border-amber-200">
                            Unverified (Disbarred from Dispatch)
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          tech.status === 'Available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tech.status === 'On Site'
                            ? 'bg-blue-100 text-blue-800'
                            : tech.status === 'En Route'
                            ? 'bg-amber-100 text-amber-800'
                            : tech.status === 'Dropped Out'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          Status: {tech.status}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Hub: {tech.locationName} · Shift: {tech.shift} · Phone: {tech.phone}
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        Certifications: <span className="font-semibold">{tech.certifications.join(', ')}</span>
                      </div>
                      {tech.restrictedCustomerIds && tech.restrictedCustomerIds.length > 0 && (
                        <div className="text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200 font-medium text-[11px] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                          <span>
                            Barred from assignments to customer account ({tech.restrictedCustomerIds.join(', ')}) due to recorded dissatisfaction complaint. Fully eligible for all other customers.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">Load / Capacity</div>
                      <div className="font-mono font-bold text-xs text-blue-600">
                        {tech.activeLoad} / {tech.maxCapacity} Jobs
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">Fix Rate · Rating</div>
                      <div className="font-mono font-semibold text-slate-800 text-xs">
                        {tech.firstTimeFixRate}% · {tech.rating} ★
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const acc = accounts.find((a) => a.technicianId === tech.id || a.id === tech.id || a.name === tech.name);
                          setSelectedAccountForCredentials(acc || null);
                          setIsCredentialsModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="View or Reset technician password"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                        <span>Password</span>
                      </button>

                      <button
                        onClick={() => verifyTechnician(tech.id, !tech.isVerified)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          tech.isVerified
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                        }`}
                      >
                        {tech.isVerified ? 'Revoke Clearance' : 'Grant Verification'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: MACHINE STATUS & TELEMETRY */}
      {activeTab === 'machines' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Machine Fleet Health &amp; Real-Time IoT Telemetry
              </h3>
              <p className="text-xs text-slate-500">
                Monitored industrial machining centers, cleanroom CVD chambers, wire EDM, and hydraulic presses.
              </p>
            </div>
            <button
              onClick={() => triggerSimulatedIotAlert('M-104')}
              className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
            >
              Simulate M-104 Spindle Vibration Alarm
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {machines.map((machine) => {
              const activeMachineOrders = requests.filter((r) => r.machineId === machine.id && r.status !== 'Closed' && r.status !== 'Verified');

              return (
                <div key={machine.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{machine.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          machine.status === 'Operational'
                            ? 'bg-emerald-100 text-emerald-800'
                            : machine.status === 'Critical Fault'
                            ? 'bg-rose-100 text-rose-800'
                            : machine.status === 'Degraded'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-cyan-100 text-cyan-800'
                        }`}>
                          {machine.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-0.5">{machine.name}</h4>
                      <div className="text-xs text-slate-500">
                        {machine.model} · SN: {machine.serialNumber} · {machine.siteName}
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <span className="text-[10px] text-slate-400 block">Hours Logged</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {machine.operatingHours.toLocaleString()} hrs
                      </span>
                    </div>
                  </div>

                  {/* Telemetry Dials */}
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Vibration RMS</span>
                      <span className={`font-mono font-bold text-sm ${
                        machine.telemetry.vibrationRms > 4.0
                          ? 'text-rose-600'
                          : machine.telemetry.vibrationRms > 2.0
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}>
                        {machine.telemetry.vibrationRms} mm/s
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Bearing Temp</span>
                      <span className={`font-mono font-bold text-sm ${
                        machine.telemetry.bearingTempC > 70
                          ? 'text-rose-600'
                          : 'text-slate-800'
                      }`}>
                        {machine.telemetry.bearingTempC} °C
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Pressure</span>
                      <span className="font-mono font-bold text-sm text-slate-800">
                        {machine.telemetry.pressurePsi} psi
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    <span>Last ping: {machine.telemetry.lastPing}</span>
                    <span>Active Orders: <strong className="text-blue-700">{activeMachineOrders.length}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: SPARE PARTS INVENTORY */}
      {activeTab === 'inventory' && (
        <InventoryView />
      )}

      {/* TAB 6: CUSTOMER RATINGS & COMPLAINTS LEDGER */}
      {activeTab === 'feedback' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Customer Ratings, Reviews &amp; Remediation Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Customer satisfaction scores and technician customer site restriction management.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 font-mono">
                {activeRestrictionsCount} Restrictions Active
              </span>
            </div>
          </div>

          {/* Rating Breakdown Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs text-slate-500 font-semibold">Average Customer Rating</span>
              <div className="text-3xl font-bold font-mono text-slate-900 mt-1 flex items-center justify-center gap-1">
                <span>{avgRating}</span>
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{customerFeedbacks.length} Total verified reviews</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs text-slate-500 font-semibold">Dissatisfaction Rate</span>
              <div className="text-3xl font-bold font-mono text-rose-600 mt-1">
                {customerFeedbacks.length > 0
                  ? `${Math.round((customerFeedbacks.filter(f => f.isDissatisfied).length / customerFeedbacks.length) * 100)}%`
                  : '0%'}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Triggering facility disbarment</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs text-slate-500 font-semibold">Remediated Grievances</span>
              <div className="text-3xl font-bold font-mono text-emerald-600 mt-1">
                {customerFeedbacks.filter(f => f.status === 'Resolved').length}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Admin closed &amp; audited</span>
            </div>
          </div>

          {/* Feedbacks List */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Customer Feedback Records
            </h4>
            {customerFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                  fb.isDissatisfied ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500">Customer:</span>
                    <span className="font-bold text-slate-900">{fb.customerName}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">Technician:</span>
                    <span className="font-bold text-slate-900">{fb.technicianName}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">Work Order: <strong className="font-mono text-slate-800">{fb.requestId}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-amber-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                      <span>Rating: {fb.rating} / 5 Stars</span>
                    </div>
                    {fb.status === 'Resolved' ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                        Resolved
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                        {fb.status}
                      </span>
                    )}
                  </div>
                </div>

                {fb.complaintReason && (
                  <div className="text-xs bg-rose-100/70 text-rose-900 p-2 rounded-lg border border-rose-200 font-medium">
                    <strong>Reason:</strong> {fb.complaintReason}
                  </div>
                )}

                <div className="text-slate-800 bg-white p-3 rounded-lg border border-slate-200">
                  <strong className="text-[10px] uppercase tracking-wider text-slate-500 block mb-0.5">Complaint:</strong>
                  &ldquo;{fb.comments}&rdquo;
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
                  <div className="text-[11px] font-medium">
                    {fb.restrictionCreated ? (
                      <span className="text-rose-700 flex items-center gap-1 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Restriction Status: Active — {fb.technicianName} barred from future assignments to {fb.customerName}. Remains eligible for other customers.
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Restriction Status: Inactive / Lifted — Technician eligible for dispatch.
                      </span>
                    )}
                  </div>

                  {fb.restrictionCreated && (
                    <button
                      onClick={() => removeTechnicianRestriction(fb.technicianId, fb.siteId)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-700 font-semibold text-xs hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    >
                      Lift Restriction
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: GIS RADAR & TELEMETRY */}
      {activeTab === 'telemetry_map' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Live Operations GIS Radar &amp; Field Specialist Positioning
              </h3>
              <p className="text-xs text-slate-500">
                Real-time geospatial tracking across Bengaluru (Peenya), Pune (Chakan), and Chennai (Ambattur).
              </p>
            </div>
            <button
              onClick={() => triggerSimulatedIotAlert('M-104')}
              className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
            >
              Simulate IoT Alarm (M-104)
            </button>
          </div>

          <EquipmentMap heightClass="h-[540px]" />
        </div>
      )}

      {/* SERVICE DOSSIER MODAL (Inspects Service reports, Photographs, Documents, Completion info) */}
      <AdminServiceDossierModal
        isOpen={Boolean(dossierRequest)}
        request={dossierRequest}
        technician={technicians.find((t) => t.id === dossierRequest?.assignedTechnicianId)}
        onClose={() => setDossierRequest(null)}
        onVerifyAndSignOff={(id) => verifyServiceCompletion(id)}
      />

      {/* ADMIN CREDENTIALS VAULT MODAL (Inspect & Reset Technician/User Passwords) */}
      <AdminCredentialsModal
        isOpen={isCredentialsModalOpen}
        onClose={() => {
          setIsCredentialsModalOpen(false);
          setSelectedAccountForCredentials(null);
        }}
        initialSelectedAccount={selectedAccountForCredentials}
      />
    </div>
  );
};
