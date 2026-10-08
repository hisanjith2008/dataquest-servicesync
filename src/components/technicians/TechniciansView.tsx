import React, { useState } from 'react';
import {
  Users,
  Award,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  UserX,
  TrendingUp,
  ShieldCheck,
  Phone,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { AdminCredentialsModal } from '../admin/AdminCredentialsModal';
import { UserAccount } from '../../types';
import { StandardAvatar } from '../common/StandardIdentity';

export const TechniciansView: React.FC = () => {
  const { technicians, simulateTechnicianDropout, verifyTechnician, currentRole, accounts } = useServiceSync();
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<UserAccount | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Certified Indian Field Engineering Roster
          </h2>
          <p className="text-xs text-slate-500">
            Technician accreditation, Admin verification, customer restriction safeguards, and real-time active load
          </p>
        </div>

        {currentRole === 'Admin' && (
          <button
            onClick={() => {
              setSelectedAccount(null);
              setIsCredentialsModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <KeyRound className="w-4 h-4" />
            <span>Credentials Vault &amp; Passwords</span>
          </button>
        )}
      </div>

      {/* Grid of Technicians */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {technicians.map((tech) => {
          const isDropped = tech.status === 'Dropped Out';
          const isAvailable = tech.status === 'Available';

          return (
            <div
              key={tech.id}
              className={`bg-white rounded-3xl border p-5 shadow-2xs space-y-4 transition-all ${
                isDropped
                  ? 'border-rose-300 ring-2 ring-rose-500/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <StandardAvatar
                      name={tech.name}
                      role="Technician"
                      size="lg"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        isDropped
                          ? 'bg-rose-600'
                          : isAvailable
                          ? 'bg-emerald-500'
                          : 'bg-indigo-500'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-slate-900 text-sm">{tech.name}</h3>
                      {tech.isVerified ? (
                        <span title="Admin Verified"><ShieldCheck className="w-4 h-4 text-emerald-600" /></span>
                      ) : (
                        <span title="Unverified"><ShieldAlert className="w-4 h-4 text-amber-500" /></span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{tech.phone}</div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isDropped
                      ? 'bg-rose-100 text-rose-800'
                      : isAvailable
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {tech.status}
                </span>
              </div>

              {/* Verification & Restrictions Banner */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Accreditation:</span>
                  {tech.isVerified ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Verified for Dispatch
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Pending Verification
                    </span>
                  )}
                </div>

                {tech.restrictedCustomerIds && tech.restrictedCustomerIds.length > 0 && (
                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Restricted: Cannot be assigned to Bharat Precision Works (Site A)</span>
                  </div>
                )}
              </div>

              {/* Location & Shift */}
              <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{tech.locationName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{tech.shift}</span>
                </div>
              </div>

              {/* Workload Capacity Bar */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Current Workload</span>
                  <span className="font-mono font-bold text-slate-800">
                    {tech.activeLoad} / {tech.maxCapacity} active jobs
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      tech.activeLoad >= tech.maxCapacity
                        ? 'bg-rose-500'
                        : 'bg-blue-600'
                    }`}
                    style={{
                      width: `${(tech.activeLoad / tech.maxCapacity) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Skills & Certifications */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Core Skills
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tech.skills.map((sk) => (
                      <span
                        key={sk}
                        className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                {tech.certifications.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-500" />
                      <span>Certifications</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tech.certifications.map((c) => (
                        <span
                          key={c}
                          className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions: Admin Verify Toggle & Dropout Simulator */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-2">
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{tech.firstTimeFixRate}% Fix</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {currentRole === 'Admin' && (
                    <>
                      <button
                        onClick={() => {
                          const acc = accounts.find((a) => a.technicianId === tech.id || a.id === tech.id || a.name === tech.name);
                          setSelectedAccount(acc || null);
                          setIsCredentialsModalOpen(true);
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="View or Reset technician password"
                      >
                        <KeyRound className="w-3 h-3 text-blue-600" />
                        <span>Password</span>
                      </button>

                      <button
                        onClick={() => verifyTechnician(tech.id, !tech.isVerified)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                          tech.isVerified
                            ? 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}
                      >
                        {tech.isVerified ? 'Unverify' : 'Verify'}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => simulateTechnicianDropout(tech.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                      isDropped
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {isDropped ? 'Restore' : 'Dropout'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Credentials Vault Modal */}
      <AdminCredentialsModal
        isOpen={isCredentialsModalOpen}
        onClose={() => {
          setIsCredentialsModalOpen(false);
          setSelectedAccount(null);
        }}
        initialSelectedAccount={selectedAccount}
      />
    </div>
  );
};
