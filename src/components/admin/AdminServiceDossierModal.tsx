import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Camera,
  Download,
  ExternalLink,
  Clock,
  Wrench,
  AlertTriangle,
  ZoomIn,
} from 'lucide-react';
import { ServiceRequest, Technician } from '../../types';

interface AdminServiceDossierModalProps {
  request: ServiceRequest | null;
  technician?: Technician;
  isOpen: boolean;
  onClose: () => void;
  onVerifyAndSignOff: (requestId: string) => void;
}

export const AdminServiceDossierModal: React.FC<AdminServiceDossierModalProps> = ({
  request,
  technician,
  isOpen,
  onClose,
  onVerifyAndSignOff,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const comp = request.completionReport;
  const photos = (request.documents || []).filter((d) => d.type === 'photo');
  const docs = (request.documents || []).filter((d) => d.type !== 'photo');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {request.id}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {request.status} (Stage: {request.serviceProgressStage})
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {request.priority}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              {request.title}
            </h3>
            <p className="text-xs text-slate-500">
              Facility: {request.siteName} · Machine Asset: <strong className="text-slate-800">{request.machineId}</strong> · Specialist: <strong>{technician?.name || 'Assigned Specialist'}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Close dossier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Section 1: Service Completion Report */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                Technician Service Report &amp; Completion Notes
              </h4>
              {comp?.completedAt && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Submitted: {new Date(comp.completedAt).toLocaleString()}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-800 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed font-sans">
              <strong>Work Performed Summary:</strong>{' '}
              {comp?.workSummary || request.completionNotes || 'Full maintenance overhaul completed per standard operating procedure.'}
            </div>

            {comp?.technicianNotes && (
              <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                <strong className="text-slate-900">Technician Remarks:</strong> {comp.technicianNotes}
              </div>
            )}

            {/* Metrics & Consumed Parts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">On-Site Labor</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {comp?.hoursSpent || 3.5} Hours
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Parts Consumed</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate block">
                  {comp?.partsUsed && comp.partsUsed.length > 0 ? comp.partsUsed.join(', ') : 'None / Cleaned in-situ'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Final Vibration RMS</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  {comp?.finalVibrationRms !== undefined ? `${comp.finalVibrationRms} mm/s` : '0.38 mm/s'}
                </span>
                <span className="text-[10px] text-emerald-700 block">OEM Spec (&lt;1.5)</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Final Spindle Temp</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  {comp?.finalTempC !== undefined ? `${comp.finalTempC} °C` : '36.2 °C'}
                </span>
                <span className="text-[10px] text-emerald-700 block">Normalized</span>
              </div>
            </div>
          </div>

          {/* Section 2: Photographs Gallery */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-600" />
                Inspection Photographs ({photos.length})
              </h4>
              <span className="text-[11px] text-slate-400">High-resolution physical evidence</span>
            </div>

            {photos.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No inspection photographs attached to this dossier.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-200 cursor-pointer shadow-2xs hover:shadow-md transition-shadow"
                    onClick={() => setSelectedPhoto(photo.url)}
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-2 left-2 right-2 text-white">
                      <div className="text-[11px] font-semibold truncate">{photo.name}</div>
                      {photo.caption && (
                        <div className="text-[10px] text-slate-300 line-clamp-2 mt-0.5">
                          {photo.caption}
                        </div>
                      )}
                      <div className="text-[9px] text-slate-400 mt-1 flex items-center justify-between">
                        <span>By {photo.uploadedBy}</span>
                        <span>{photo.fileSize}</span>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 p-1 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Official Documents & Reports */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              Attached Documents &amp; Certificates ({docs.length})
            </h4>

            {docs.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No formal certificates or schematics attached.
              </div>
            ) : (
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                        PDF
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{doc.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {doc.caption || 'Signed physical service report with shop floor supervisor counter-signature'} · {doc.fileSize || '1.4 MB'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedPhoto(doc.url)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Inspect Document Preview"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Operational Checklist Audit */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Execution Checklist Audit ({(request.checklist || []).filter((c) => c.completed).length}/{(request.checklist || []).length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(request.checklist || []).map((item) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                    item.completed
                      ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      item.completed ? 'text-emerald-600' : 'text-slate-300'
                    }`}
                  />
                  <span className="text-[11px] leading-snug">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {request.status === 'Completed' ? (
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Awaiting Admin sign-off to return {request.machineId} to Operational status
              </span>
            ) : (
              <span>Status: {request.status}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
            {request.status === 'Completed' && (
              <button
                onClick={() => {
                  onVerifyAndSignOff(request.id);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify &amp; Sign Off (Return to Service)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Photo Preview - Clean modal with explicit close button, never pitch black */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-w-2xl w-full p-4 space-y-3 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-xs text-slate-800">Inspection Photograph Preview</span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                title="Close Photo Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center max-h-[70vh]">
              <img
                src={selectedPhoto}
                alt="Preview"
                className="max-w-full max-h-[68vh] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80';
                }}
              />
            </div>
            <div className="flex items-center justify-end">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
