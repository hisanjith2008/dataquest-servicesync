import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  Package,
  Wrench,
  Clock,
  Star,
  Eye,
  FileCheck,
  Camera,
  FileText,
  AlertOctagon,
  ChevronRight,
  UserCheck,
  XCircle,
  Truck,
  ArrowRight,
} from 'lucide-react';
import {
  Technician,
  SparePartRequest,
  ServiceRequest,
  CustomerFeedback,
  SparePart,
} from '../../types';
import { StandardAvatar } from '../common/StandardIdentity';

interface AdminPendingActionsProps {
  unverifiedTechs: Technician[];
  pendingPartOrders: SparePartRequest[];
  orderedPartsAwaitingStocking: SparePartRequest[];
  pendingServiceVerifications: ServiceRequest[];
  activeComplaints: CustomerFeedback[];
  technicians: Technician[];
  parts: SparePart[];
  onVerifyTechnician: (techId: string, verified: boolean) => Promise<void>;
  onApprovePartOrder: (id: string) => Promise<void>;
  onApprovePartStocking: (id: string) => Promise<void>;
  onRejectPartRequest: (id: string, reason?: string) => Promise<void>;
  onVerifyService: (id: string) => Promise<{ success: boolean; error?: string }>;
  onResolveComplaint: (id: string) => Promise<void>;
  onRemoveRestriction: (techId: string, siteId: string) => Promise<void>;
  onOpenDossier: (request: ServiceRequest) => void;
  onSelectRequest: (id: string) => void;
}

export const AdminPendingActions: React.FC<AdminPendingActionsProps> = ({
  unverifiedTechs,
  pendingPartOrders,
  orderedPartsAwaitingStocking,
  pendingServiceVerifications,
  activeComplaints,
  technicians,
  parts,
  onVerifyTechnician,
  onApprovePartOrder,
  onApprovePartStocking,
  onRejectPartRequest,
  onVerifyService,
  onResolveComplaint,
  onRemoveRestriction,
  onOpenDossier,
  onSelectRequest,
}) => {
  const [rejectingPartId, setRejectingPartId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const totalPending =
    unverifiedTechs.length +
    pendingPartOrders.length +
    orderedPartsAwaitingStocking.length +
    pendingServiceVerifications.length +
    activeComplaints.length;

  return (
    <div className="space-y-6">
      {/* Overview Status Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold tracking-wider uppercase font-mono">
              Central Authority
            </span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-300 font-mono">
              Role: System Administrator
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold mt-1 text-white">
            Admin Pending Actions &amp; Verification Center
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Sole authorization checkpoint for technician field eligibility, spare-part procurement &amp; stocking, service report sign-offs, and customer complaint remediation.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Pending</span>
            <span className={`font-mono font-bold text-2xl ${totalPending > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {totalPending}
            </span>
          </div>
          <div className="h-10 w-px bg-slate-700" />
          <div className="text-xs space-y-0.5 text-slate-300 font-mono text-[11px]">
            <div>• Techs: <span className="text-white font-bold">{unverifiedTechs.length}</span></div>
            <div>• Parts: <span className="text-white font-bold">{pendingPartOrders.length + orderedPartsAwaitingStocking.length}</span></div>
            <div>• Reports: <span className="text-white font-bold">{pendingServiceVerifications.length}</span></div>
            <div>• Complaints: <span className="text-white font-bold">{activeComplaints.length}</span></div>
          </div>
        </div>
      </div>

      {/* 4 CLEAR PENDING-ACTION SECTIONS */}
      <div className="grid grid-cols-1 gap-6">

        {/* SECTION 1: TECHNICIAN VERIFICATION */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    1. Technician Verification &amp; Dispatch Eligibility
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    unverifiedTechs.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {unverifiedTechs.length} Awaiting Verification
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Technicians must be officially vetted and verified by Admin before they become eligible for automated job matching or the 5-minute dispatch cascade.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {unverifiedTechs.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-slate-700">All registered field technicians are verified</span>
                <span>No pending accreditations. All active specialists are eligible for automated dispatch.</span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {unverifiedTechs.map((tech) => (
                  <div
                    key={tech.id}
                    className="p-4 rounded-xl bg-amber-50/30 border border-amber-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs transition-colors hover:bg-amber-50/50"
                  >
                    <div className="flex items-start gap-3.5">
                      <StandardAvatar
                        name={tech.name}
                        role="Technician"
                        size="lg"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{tech.name}</span>
                          <span className="font-mono text-slate-500 text-[11px]">({tech.id})</span>
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px] border border-amber-200">
                            Disbarred From Dispatch (Unverified)
                          </span>
                        </div>
                        <div className="text-slate-600">
                          Hub: <strong>{tech.locationName}</strong> · Shift: {tech.shift} · Contact: {tech.phone}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[11px] pt-0.5">
                          <span className="text-slate-400">Skills:</span>
                          {tech.skills.map((s, idx) => (
                            <span key={idx} className="px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200 text-[10px]">
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Certifications: <span className="font-semibold text-slate-700">{tech.certifications.join(', ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => onVerifyTechnician(tech.id, true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify &amp; Authorize for Dispatch</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: SPARE-PART APPROVALS */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    2. Spare-Part Approvals &amp; Inventory Gatekeeper
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    pendingPartOrders.length + orderedPartsAwaitingStocking.length > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {pendingPartOrders.length + orderedPartsAwaitingStocking.length} Total Part Actions
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Technicians can raise spare-part requests from field sites. Only Admin can confirm purchase orders and warehouse stocking updates.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-6">
            {/* Subsection 2A: Orders Requiring Admin Purchase Approval */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  Stage 1: Requisitions Awaiting Purchase Order Confirmation ({pendingPartOrders.length})
                </h4>
                <span className="text-[11px] text-slate-400">Technician requests awaiting PO approval</span>
              </div>

              {pendingPartOrders.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                  No purchase orders awaiting Admin confirmation.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {pendingPartOrders.map((pr) => {
                    const catalogPart = parts.find((p) => p.sku === pr.partSku || p.id === pr.partId);
                    const costINR = catalogPart ? catalogPart.unitCost * pr.quantity : 0;

                    return (
                      <div
                        key={pr.id}
                        className="p-4 bg-white hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-700">{pr.id}</span>
                            <span className="text-slate-300">·</span>
                            <span className="font-semibold text-slate-900 text-sm">
                              {pr.quantity}x {pr.partName}
                            </span>
                            <span className="font-mono text-slate-400 text-[11px]">({pr.partSku})</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                pr.urgency === 'Emergency'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : pr.urgency === 'Urgent'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {pr.urgency}
                            </span>
                            {costINR > 0 && (
                              <span className="font-mono text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                                ₹{costINR.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500">
                            Requested by: <strong>{pr.technicianName}</strong> · For Facility: <strong>{pr.siteName}</strong>
                            {pr.requestId && (
                              <> · Work Order: <strong className="text-blue-600 cursor-pointer" onClick={() => onSelectRequest(pr.requestId!)}>{pr.requestId}</strong></>
                            )}
                          </div>
                          <div className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <strong>Reason:</strong> {pr.reason}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <button
                            onClick={() => onApprovePartOrder(pr.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Confirm &amp; Approve Order</span>
                          </button>
                          <button
                            onClick={() => {
                              if (rejectingPartId === pr.id) {
                                onRejectPartRequest(pr.id, rejectReason || 'Part alternative available');
                                setRejectingPartId(null);
                                setRejectReason('');
                              } else {
                                setRejectingPartId(pr.id);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            {rejectingPartId === pr.id ? 'Confirm Reject' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Subsection 2B: Stocking & Inventory Updates Requiring Admin Confirmation */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  Stage 2: Warehouse Stocking &amp; Inventory Updates ({orderedPartsAwaitingStocking.length})
                </h4>
                <span className="text-[11px] text-slate-400">Received orders awaiting inventory ledger update</span>
              </div>

              {orderedPartsAwaitingStocking.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                  No ordered shipments currently awaiting Admin stocking confirmation.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {orderedPartsAwaitingStocking.map((pr) => (
                    <div
                      key={pr.id}
                      className="p-4 bg-emerald-50/20 hover:bg-emerald-50/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-700">{pr.id}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-semibold text-slate-900 text-sm">
                            {pr.quantity}x {pr.partName}
                          </span>
                          <span className="font-mono text-slate-400 text-[11px]">({pr.partSku})</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Approved &amp; Ordered
                          </span>
                        </div>
                        <div className="text-slate-500">
                          Destination Warehouse: <strong>{pr.siteName}</strong> · Approved by: {pr.approvedBy || 'Admin'}
                        </div>
                        <div className="text-slate-600 text-[11px]">
                          Note: Confirming this action updates physical inStock quantities in the warehouse catalog.
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => onApprovePartStocking(pr.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Stocked &amp; Update Inventory</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 3: SERVICE REPORT VERIFICATION */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    3. Service Report Verification &amp; Technical Sign-Off
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    pendingServiceVerifications.length > 0 ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {pendingServiceVerifications.length} Awaiting Audit
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Technicians have marked servicing as completed. Admin must inspect service reports, physical photographs, attached documents, and telemetry before returning machinery to active production.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {pendingServiceVerifications.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                <span className="font-semibold text-slate-700">All completed services have been verified and sealed</span>
                <span>No jobs pending technical inspection. Machinery records are up to date.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingServiceVerifications.map((req) => {
                  const tech = technicians.find((t) => t.id === req.assignedTechnicianId);
                  const photosCount = (req.documents || []).filter((d) => d.type === 'photo').length;
                  const docsCount = (req.documents || []).filter((d) => d.type !== 'photo').length;

                  return (
                    <div
                      key={req.id}
                      className="p-4 sm:p-5 rounded-xl bg-slate-50/60 border border-slate-200 space-y-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="font-mono font-bold text-blue-700">{req.id}</span>
                            <span className="text-slate-300">·</span>
                            <span className="font-semibold text-slate-900">{req.machineId}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-500">{req.siteName}</span>
                            <span className="text-slate-300">·</span>
                            <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              Completed by {tech?.name || 'Specialist'}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">{req.title}</h4>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onOpenDossier(req)}
                            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Inspect Dossier, Photos &amp; Docs</span>
                          </button>
                          <button
                            onClick={() => onVerifyService(req.id)}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve &amp; Sign Off</span>
                          </button>
                        </div>
                      </div>

                      {/* Dossier Preview Snippet */}
                      {req.completionReport && (
                        <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2">
                          <div>
                            <strong className="text-slate-900">Summary:</strong> {req.completionReport.workSummary}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <span>Labor: <strong className="text-slate-800">{req.completionReport.hoursSpent} hrs</strong></span>
                            <span>Parts: <strong className="text-slate-800">{req.completionReport.partsUsed.join(', ') || 'None'}</strong></span>
                            {req.completionReport.finalVibrationRms !== undefined && (
                              <span>Final Vibration: <strong className="text-emerald-600">{req.completionReport.finalVibrationRms} mm/s</strong></span>
                            )}
                            {req.completionReport.finalTempC !== undefined && (
                              <span>Final Temp: <strong className="text-emerald-600">{req.completionReport.finalTempC} °C</strong></span>
                            )}
                            <span className="flex items-center gap-1 text-indigo-600 font-semibold">
                              <Camera className="w-3 h-3" /> {photosCount} Photographs
                            </span>
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                              <FileText className="w-3 h-3" /> {docsCount} Documents
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 4: CUSTOMER COMPLAINTS */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    4. Customer Complaints &amp; Dissatisfaction Remediations
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    activeComplaints.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {activeComplaints.length} Open Complaints
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Dissatisfaction complaints automatically enforce technician bans from that customer facility. Admin investigates root causes and decides whether to resolve complaints or lift restrictions.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {activeComplaints.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-slate-700">No active customer complaints</span>
                <span>All past customer grievances have been resolved and audited.</span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {activeComplaints.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 rounded-xl bg-rose-50/40 border border-rose-200 text-xs space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500">Customer:</span>
                        <span className="font-bold text-slate-900 text-sm">{fb.customerName}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500">Technician:</span>
                        <span className="font-bold text-slate-900">{fb.technicianName}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">Work Order: <strong className="font-mono text-slate-800">{fb.requestId}</strong></span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-rose-600 font-bold bg-white px-2.5 py-1 rounded-md border border-rose-200">
                          <Star className="w-3.5 h-3.5 fill-rose-500 text-rose-500 mr-1" />
                          <span>Rating: {fb.rating} / 5 Stars</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          fb.restrictionCreated
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {fb.restrictionCreated ? 'Restriction Confirmed' : 'No Restriction'}
                        </span>
                      </div>
                    </div>

                    {fb.complaintReason && (
                      <div className="text-xs bg-rose-100/70 text-rose-900 p-2 rounded-lg border border-rose-200">
                        <strong>Reason:</strong> {fb.complaintReason}
                      </div>
                    )}

                    <div className="text-slate-800 bg-white p-3 rounded-lg border border-slate-200">
                      <strong className="text-[10px] uppercase tracking-wider text-slate-500 block mb-0.5">Customer Complaint:</strong>
                      &ldquo;{fb.comments}&rdquo;
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-rose-200/60">
                      <div className="text-[11px] font-medium">
                        {fb.restrictionCreated ? (
                          <span className="text-rose-700 flex items-center gap-1 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Restriction Status: Active — {fb.technicianName} cannot be assigned to {fb.customerName}. Remains eligible for other customers.
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            Restriction Status: Inactive / Lifted — Technician eligible for dispatch.
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {fb.restrictionCreated && (
                          <button
                            onClick={() => onRemoveRestriction(fb.technicianId, fb.siteId)}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 font-semibold text-xs hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            Lift Site Restriction
                          </button>
                        )}
                        <button
                          onClick={() => onResolveComplaint(fb.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                        >
                          Mark Resolved
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};
