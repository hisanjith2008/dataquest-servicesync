import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Truck,
  UserCheck,
  Check,
  Zap,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { getSlaRemainingInfo } from '../../utils/conflictEngine';
import { StandardAvatar } from '../common/StandardIdentity';

export const RecoveryPlanModal: React.FC = () => {
  const {
    isRecoveryModalOpen,
    setIsRecoveryModalOpen,
    selectedRequestId,
    requests,
    executeRecoveryPlan,
    technicians,
  } = useServiceSync();

  const [selectedTechId, setSelectedTechId] = useState<string>('tech-02'); // Priya Patel
  const [includePartTransfer, setIncludePartTransfer] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  if (!isRecoveryModalOpen || !selectedRequestId) return null;

  const request = requests.find((r) => r.id === selectedRequestId);
  if (!request) return null;

  const conflict = request.conflictState;
  const slaInfo = getSlaRemainingInfo(request.slaDeadline);

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await executeRecoveryPlan(
        request.id,
        selectedTechId,
        includePartTransfer ? 'BRG-CERAMIC-88' : undefined
      );
      setIsRecoveryModalOpen(false);
    } finally {
      setIsExecuting(false);
    }
  };

  const topReplacements = conflict?.topReplacements || [
    {
      technicianId: 'tech-02',
      technicianName: 'Priya Patel',
      etaMinutes: 18,
      skillFitPercent: 100,
      slaImpact: 'On-Time' as const,
      distanceKm: 2.4,
      recommendedAction: 'Optimal Verified Match (Fast ETA & ISO-18436 Cat-III Certified)',
    },
    {
      technicianId: 'tech-03',
      technicianName: 'Amit Verma',
      etaMinutes: 32,
      skillFitPercent: 85,
      slaImpact: 'At-Risk' as const,
      distanceKm: 18.5,
      recommendedAction: 'Secondary Backup (High General Mechanical Experience)',
    },
    {
      technicianId: 'tech-04',
      technicianName: 'Vikram Rao',
      etaMinutes: 48,
      skillFitPercent: 75,
      slaImpact: 'Late' as const,
      distanceKm: 38.2,
      recommendedAction: 'Cleanroom Certified Specialist',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 bg-rose-50/70 border-b border-rose-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Automated Conflict Recovery Plan
                </h3>
                <span className="text-[11px] font-mono font-bold bg-rose-200/70 text-rose-800 px-2 py-0.5 rounded-full">
                  {request.id}
                </span>
              </div>
              <p className="text-xs text-rose-700 font-medium mt-0.5">
                Resolution workflow for technician dropout and inventory deficit
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsRecoveryModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Conflict Root Cause Alert */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-rose-900">
            <div className="font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Root Cause Diagnosis</span>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed font-normal">
              {conflict?.description ||
                'Suresh Kumar reported emergency vehicle dropout. Part BRG-CERAMIC-88 is out of stock at Bharat Precision Works (Site A Peenya).'}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-rose-700 font-semibold pt-1 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>SLA Target: {slaInfo.formatted}</span>
            </div>
          </div>

          {/* Action 1: Spare Parts Transfer */}
          <div className="space-y-2">
            <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                1
              </span>
              <span>Inventory Stock Recovery (Inter-Site Hot-Shot Transfer)</span>
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={includePartTransfer}
                onChange={(e) => setIncludePartTransfer(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    Dispatch 1x Ceramic Bearing (BRG-CERAMIC-88) from Tata AutoComp Pune (Site B)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Hot-shot Courier &bull; ₹18,500
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Tata AutoComp Systems (Site B) warehouse has 3 units in stock. Courier will route directly to Peenya Site A cleanroom airlock.
                </p>
              </div>
            </label>
          </div>

          {/* Action 2: Top 3 Replacement Technicians */}
          <div className="space-y-2">
            <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                <span>Select Optimal Replacement Technician (Verified Candidates)</span>
              </div>
              <span className="text-[11px] text-slate-400 font-normal">
                Strict check: Only verified, unrestricted engineers
              </span>
            </div>

            <div className="space-y-2.5">
              {topReplacements.map((cand, idx) => {
                const isSelected = selectedTechId === cand.technicianId;
                const techObj = technicians.find((t) => t.id === cand.technicianId);

                return (
                  <div
                    key={cand.technicianId}
                    onClick={() => setSelectedTechId(cand.technicianId)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <StandardAvatar
                            name={cand.technicianName}
                            role="Technician"
                            size="md"
                          />
                          {idx === 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-white flex items-center justify-center text-[9px] font-bold">
                              ★
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {cand.technicianName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                cand.slaImpact === 'On-Time'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : cand.slaImpact === 'At-Risk'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              SLA: {cand.slaImpact}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {cand.recommendedAction}
                          </div>
                        </div>
                      </div>

                      {/* Right stats */}
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-800 text-xs">
                          {cand.etaMinutes} min ETA
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {cand.distanceKm} km &bull; {cand.skillFitPercent}% skill fit
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Admin authorization required &bull; Audit logged to SHA-256 ledger
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRecoveryModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={isExecuting}
              onClick={handleExecute}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-blue-200" />
              <span>Execute Recovery Plan Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
