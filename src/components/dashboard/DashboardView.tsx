import React from 'react';
import {
  AlertTriangle,
  Clock,
  Users,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  Cpu,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { EquipmentMap } from '../map/EquipmentMap';
import { getSlaRemainingInfo } from '../../utils/conflictEngine';
import { getStatusColor } from '../../utils/stateMachine';

export const DashboardView: React.FC = () => {
  const {
    requests,
    technicians,
    machines,
    setSelectedRequestId,
    setIsRecoveryModalOpen,
    setActiveView,
    triggerSimulatedIotAlert,
  } = useServiceSync();

  // KPIs
  const openRequests = requests.filter(
    (r) => r.status !== 'Closed' && r.status !== 'Verified'
  );
  const p1Count = requests.filter((r) => r.priority === 'P1 - Critical').length;

  const slaAtRiskCount = requests.filter((r) => {
    if (r.status === 'Closed' || r.status === 'Verified') return false;
    const sla = getSlaRemainingInfo(r.slaDeadline);
    return sla.isAtRisk || sla.isBreached;
  }).length;

  const totalCapacity = technicians.reduce((acc, t) => acc + t.maxCapacity, 0);
  const totalLoad = technicians.reduce((acc, t) => acc + t.activeLoad, 0);
  const utilizationRate = Math.round((totalLoad / (totalCapacity || 1)) * 100);

  const avgFirstTimeFix = Math.round(
    technicians.reduce((acc, t) => acc + t.firstTimeFixRate, 0) / (technicians.length || 1)
  );

  const exceptionRequests = requests.filter((r) => r.status === 'Exception');

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Active Service Requests</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900">
              {openRequests.length}
            </span>
            <span className="text-xs font-semibold text-rose-600">
              ({p1Count} P1 Critical)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across 3 customer manufacturing sites</div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">SLA Breach Risk</span>
            <div className={`p-2 rounded-xl ${slaAtRiskCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${slaAtRiskCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {slaAtRiskCount}
            </span>
            <span className="text-xs text-slate-500">jobs &lt; 90m SLA window</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Contractual response threshold</div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Field Tech Utilization</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900">
              {utilizationRate}%
            </span>
            <span className="text-xs text-slate-500">
              ({totalLoad}/{totalCapacity} active slots)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Optimal workload buffer maintained</div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">First-Time-Fix Rate</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-600">
              {avgFirstTimeFix}%
            </span>
            <span className="text-xs text-emerald-700 font-medium">+2.1% this month</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Verified via post-repair checklist</div>
        </div>
      </div>

      {/* Exception & Conflict Alert Feed (If any exist, especially M-104 demo) */}
      {exceptionRequests.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-3 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs shrink-0">
                <AlertOctagon className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-rose-950 text-sm">
                  Active Operational Exception: {exceptionRequests[0].id} ({exceptionRequests[0].machineId})
                </h3>
                <p className="text-xs text-rose-800 mt-0.5 max-w-3xl leading-relaxed">
                  {exceptionRequests[0].conflictState?.description ||
                    'Technician Suresh Kumar reported vehicle dropout. Ceramic Bearing BRG-CERAMIC-88 is low at Peenya Site A warehouse.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedRequestId(exceptionRequests[0].id);
                setIsRecoveryModalOpen(true);
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
            >
              <span>Launch Recovery Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Live Operations GIS Map Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Live Field Ops &amp; Equipment Telemetry Map
            </h3>
            <p className="text-xs text-slate-500">
              Real-time GPS positioning of technicians, customer cleanrooms, and machine alert statuses
            </p>
          </div>
          <button
            onClick={() => setActiveView('map')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Full Map View</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <EquipmentMap heightClass="h-80" />
      </div>

      {/* Two-Column Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Actions / Priority Requests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              Critical Actions Requiring Attention
            </h3>
            <button
              onClick={() => setActiveView('requests')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              View all ({requests.length})
            </button>
          </div>

          <div className="space-y-2.5">
            {openRequests.slice(0, 4).map((req) => {
              const statusStyle = getStatusColor(req.status);
              const sla = getSlaRemainingInfo(req.slaDeadline);

              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequestId(req.id)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-slate-800">{req.id}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900 truncate">{req.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {req.machineId} &bull; {req.siteName}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`font-mono font-bold text-[11px] ${sla.isAtRisk ? 'text-amber-600' : 'text-slate-700'}`}>
                      {sla.formatted}
                    </div>
                    <span className="text-[10px] text-slate-400">SLA Window</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Machine Status & Telemetry Grid */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              Connected Equipment Health
            </h3>
            <button
              onClick={() => setActiveView('equipment')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Registry ({machines.length})
            </button>
          </div>

          <div className="space-y-2.5">
            {machines.map((m) => {
              const isCritical = m.status === 'Critical Fault';
              return (
                <div
                  key={m.id}
                  className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700">{m.id}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : m.status === 'Operational'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <div className="font-medium text-slate-900 mt-0.5">{m.name}</div>
                    <div className="text-[11px] text-slate-500">{m.siteName}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`font-mono font-bold text-xs ${m.telemetry.vibrationRms > 4.5 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {m.telemetry.vibrationRms} mm/s
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {m.telemetry.bearingTempC}°C Temp
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
