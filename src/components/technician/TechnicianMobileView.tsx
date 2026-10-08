import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Clock,
  MapPin,
  Lock,
  Camera,
  AlertTriangle,
  Send,
  FileCheck,
  UserX,
  ExternalLink,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { getSlaRemainingInfo } from '../../utils/conflictEngine';
import { getStatusColor } from '../../utils/stateMachine';
import { TechnicianCustomerRouteMap } from '../map/TechnicianCustomerRouteMap';
import { TechnicianTrackingControls } from './TechnicianTrackingControls';
import { Navigation } from 'lucide-react';

export const TechnicianMobileView: React.FC = () => {
  const {
    currentUser,
    requests,
    machines,
    updateBookingStatus,
    transitionRequest,
    updateChecklistItem,
    addDocumentToRequest,
    simulateTechnicianDropout,
    setSelectedRequestId,
    technicians,
  } = useServiceSync();

  const [notes, setNotes] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Find tech object for current user
  const techUser = technicians.find((t) => t.name.includes(currentUser.name)) || technicians[1]; // default Sarah Chen

  // Active assigned job for this technician
  const assignedJobs = requests.filter(
    (r) =>
      r.assignedTechnicianId === techUser.id &&
      r.status !== 'Closed' &&
      r.status !== 'Verified'
  );

  const activeJob = assignedJobs.find((j) => j.status === 'In Progress') || assignedJobs[0];
  const targetMachine = machines.find((m) => m.id === activeJob?.machineId);
  const slaInfo = activeJob ? getSlaRemainingInfo(activeJob.slaDeadline) : null;
  const statusStyles = activeJob ? getStatusColor(activeJob.status) : null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStartWork = async () => {
    if (!activeJob) return;
    const res = await transitionRequest(activeJob.id, 'In Progress');
    if (res.success) {
      showToast('Started servicing. Frozen window engaged!');
    } else {
      showToast(res.error || 'Failed to start.');
    }
  };

  const handleCompleteService = async () => {
    if (!activeJob) return;
    const res = await transitionRequest(activeJob.id, 'Completed', notes || 'All checklist tasks completed successfully.');
    if (res.success) {
      showToast('Service completed! Submitted to Admin for verification and sign-off.');
    } else {
      showToast(res.error || 'Failed to complete.');
    }
  };

  const handleAddPhoto = () => {
    if (!activeJob) return;
    addDocumentToRequest(activeJob.id, {
      name: `Field_Verification_${Date.now().toString().slice(-4)}.jpg`,
      url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      caption: photoCaption || 'Inspection verification image.',
    });
    setPhotoCaption('');
    showToast('Photo uploaded.');
  };

  const handleDropout = async () => {
    await simulateTechnicianDropout(techUser.id);
    showToast(`Reported dropout emergency for ${techUser.name}.`);
  };

  return (
    <div className="max-w-md mx-auto py-4 space-y-4">
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Device Frame Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={techUser.avatar}
            alt={techUser.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500"
          />
          <div>
            <div className="font-bold text-slate-900 text-sm leading-tight">
              {techUser.name}
            </div>
            <div className="text-[11px] text-slate-500">
              Shift: {techUser.shift} &bull; Status:{' '}
              <strong className={techUser.status === 'Dropped Out' ? 'text-rose-600' : 'text-emerald-600'}>
                {techUser.status}
              </strong>
            </div>
          </div>
        </div>

        <button
          onClick={handleDropout}
          title="Simulate sudden vehicle failure or emergency"
          className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-bold flex items-center gap-1 hover:bg-rose-100"
        >
          <UserX className="w-3.5 h-3.5" />
          <span>Simulate Dropout</span>
        </button>
      </div>

      {!activeJob ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
          <FileCheck className="w-10 h-10 mx-auto text-slate-300" />
          <div className="font-bold text-slate-700 text-sm">No Active Tasks Assigned</div>
          <p className="text-xs text-slate-500">
            You currently have no open dispatches in queue. Relax or check the general request board.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {/* Card Top: Urgent Job Alert */}
          <div className="p-4 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                {activeJob.id}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusStyles?.bg} ${statusStyles?.text} ${statusStyles?.border}`}
              >
                {activeJob.status}
              </span>
            </div>

            <h3 className="font-bold text-slate-900 text-base leading-snug">
              {activeJob.title}
            </h3>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium">{activeJob.siteName}</span>
              </div>
              <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{slaInfo?.formatted}</span>
              </div>
            </div>
          </div>

          {/* Frozen Window indicator */}
          {activeJob.frozenWindow && (
            <div className="p-3 bg-cyan-50 text-cyan-900 flex items-center gap-2 text-xs font-semibold">
              <Lock className="w-4 h-4 text-cyan-700 shrink-0" />
              <span>Frozen Window Active: Protected from reassignment</span>
            </div>
          )}

          {/* Machine Telemetry Snapshot */}
          {targetMachine && (
            <div className="p-4 space-y-2">
              <div className="font-bold text-slate-800 text-xs">
                Asset: {targetMachine.id} &bull; {targetMachine.name}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Vibration RMS</div>
                  <div className={`font-mono font-bold text-sm ${targetMachine.telemetry.vibrationRms > 4.5 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {targetMachine.telemetry.vibrationRms} mm/s
                  </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Bearing Temp</div>
                  <div className={`font-mono font-bold text-sm ${targetMachine.telemetry.bearingTempC > 60 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {targetMachine.telemetry.bearingTempC} °C
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Route to Customer Map & Live GPS Navigation */}
          <div className="p-4 space-y-2 bg-slate-50/60">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <div className="flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-blue-600" />
                <span>Navigate &amp; Live Location Broadcast</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">Google Routes + Firestore</span>
            </div>
            <TechnicianTrackingControls
              request={activeJob}
              technician={techUser}
              onStatusChange={(st) => updateBookingStatus(activeJob.id, st)}
            />
          </div>

          {/* Action Button: Start Servicing */}
          {activeJob.status === 'Assigned' && (
            <div className="p-4 bg-white">
              <button
                onClick={handleStartWork}
                className="w-full py-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Lock className="w-5 h-5" />
                <span>Mark Arrived &amp; Start Servicing</span>
              </button>
              <div className="text-[11px] text-slate-400 text-center mt-1.5">
                Locks task into the Frozen Window to prevent automated replanning
              </div>
            </div>
          )}

          {/* Step-by-Step Checklist with Big Buttons */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between font-bold text-slate-800 text-xs">
              <span>Field Verification Checklist</span>
              <span className="font-mono text-slate-500">
                {activeJob.checklist.filter((c) => c.completed).length} / {activeJob.checklist.length}
              </span>
            </div>

            <div className="space-y-2">
              {activeJob.checklist.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => updateChecklistItem(activeJob.id, item.id, !item.completed)}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                    item.completed
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                      item.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {item.completed && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-semibold leading-snug ${item.completed ? 'line-through text-slate-400' : ''}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Capture & Upload Simulator */}
          <div className="p-4 space-y-3">
            <div className="font-bold text-slate-800 text-xs">
              Attach Inspection Proof Photo
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Caption (e.g. Laser runout <0.8µm)..."
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-slate-200"
              />
              <button
                onClick={handleAddPhoto}
                className="px-3.5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1 shrink-0"
              >
                <Camera className="w-4 h-4" />
                <span>Snap</span>
              </button>
            </div>
          </div>

          {/* Completion Notes */}
          <div className="p-4 space-y-2">
            <div className="font-bold text-slate-800 text-xs">
              Technician Completion Notes
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detail parts replaced, runout measurements, dynamic test results..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Completion Sign-Off CTA Button */}
          {activeJob.status === 'In Progress' && (
            <div className="p-4 bg-slate-50">
              <button
                disabled={activeJob.checklist.some((c) => !c.completed)}
                onClick={handleCompleteService}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Submit Service For Manager Approval</span>
              </button>
              {activeJob.checklist.some((c) => !c.completed) && (
                <div className="text-[11px] text-amber-700 text-center mt-1.5 font-medium">
                  Complete all checklist items before submitting
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
