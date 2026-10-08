import React, { useState } from 'react';
import {
  Factory,
  Cpu,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Calendar,
  DollarSign,
  Activity,
  Plus,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { Machine } from '../../types';

export const MachinesView: React.FC = () => {
  const { machines, sites, triggerSimulatedIotAlert, setIsCreateModalOpen } = useServiceSync();
  const [selectedMachineId, setSelectedMachineId] = useState<string>('M-104');

  const selectedMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];
  const machineSite = sites.find((s) => s.id === selectedMachine.siteId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Industrial Equipment &amp; Customer Site Registry
          </h2>
          <p className="text-xs text-slate-500">
            Real-time sensory telemetry meters and historical maintenance logs
          </p>
        </div>

        <button
          onClick={() => triggerSimulatedIotAlert(selectedMachine.id)}
          className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors"
        >
          <Cpu className="w-4 h-4 text-rose-600" />
          <span>Trigger IoT Sensor Incident on {selectedMachine.id}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Equipment Asset Selector List */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Registered Assets ({machines.length})
          </div>

          <div className="space-y-2">
            {machines.map((m) => {
              const isSelected = selectedMachine.id === m.id;
              const isCritical = m.status === 'Critical Fault';

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMachineId(m.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 shadow-xs ring-1 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {m.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        isCritical
                          ? 'bg-rose-100 text-rose-800'
                          : m.status === 'Operational'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <div className="font-semibold text-xs text-slate-800 line-clamp-1">
                    {m.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {m.siteName}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Vib: {m.telemetry.vibrationRms} mm/s</span>
                    <span>Temp: {m.telemetry.bearingTempC}°C</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Selected Machine Deep Dive */}
        <div className="lg:col-span-2 space-y-6">
          {/* Machine Profile & Telemetry Dash */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-blue-700">
                    {selectedMachine.id}
                  </span>
                  <span className="font-bold text-slate-900 text-base">
                    {selectedMachine.name}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>Model: <strong>{selectedMachine.model}</strong></span>
                  <span>&bull;</span>
                  <span>SN: <strong>{selectedMachine.serialNumber}</strong></span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    selectedMachine.status === 'Critical Fault'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedMachine.status}
                </span>
                <div className="text-[11px] text-slate-400 mt-1">
                  Operating Hours: {selectedMachine.operatingHours.toLocaleString()}h
                </div>
              </div>
            </div>

            {/* Site location info */}
            {machineSite && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800">{machineSite.name}</div>
                    <div className="text-[11px] text-slate-500">{machineSite.address}</div>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <div>Contact: {machineSite.contactPerson}</div>
                  <div className="font-mono">{machineSite.contactPhone}</div>
                </div>
              </div>
            )}

            {/* Sensory Gauges */}
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Live Edge Sensor Telemetry
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">
                    Vibration RMS
                  </div>
                  <div
                    className={`text-xl font-black font-mono mt-1 ${
                      selectedMachine.telemetry.vibrationRms > 4.5
                        ? 'text-rose-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {selectedMachine.telemetry.vibrationRms}{' '}
                    <span className="text-xs font-normal text-slate-500">mm/s</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Threshold: 4.5 mm/s (ISO 10816)
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">
                    Bearing Casing Temp
                  </div>
                  <div
                    className={`text-xl font-black font-mono mt-1 ${
                      selectedMachine.telemetry.bearingTempC > 60
                        ? 'text-rose-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {selectedMachine.telemetry.bearingTempC}{' '}
                    <span className="text-xs font-normal text-slate-500">°C</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Thermal alarm at &gt;75°C
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">
                    Lube Pressure
                  </div>
                  <div className="text-xl font-black font-mono mt-1 text-slate-900">
                    {selectedMachine.telemetry.pressurePsi}{' '}
                    <span className="text-xs font-normal text-slate-500">PSI</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Last Sensor Ping: {selectedMachine.telemetry.lastPing}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Service Logs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Machine Historical Service Logs ({selectedMachine.serviceHistory.length})
              </h3>
              <span className="text-xs text-slate-400">
                Referenced by Gemini AI for failure correlation
              </span>
            </div>

            <div className="space-y-3">
              {selectedMachine.serviceHistory.length === 0 ? (
                <div className="text-xs text-slate-400 italic">No past maintenance entries recorded.</div>
              ) : (
                selectedMachine.serviceHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      <div className="text-[11px] font-mono text-slate-500">{item.date}</div>
                    </div>

                    <p className="text-slate-600 leading-relaxed font-normal">
                      {item.findings}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <div>
                        Engineer: <strong className="text-slate-800">{item.technicianName}</strong>
                      </div>
                      <div>
                        Cost: <strong className="text-slate-800">₹{item.cost.toLocaleString('en-IN')}</strong>
                      </div>
                      {item.partsReplaced.length > 0 && (
                        <div>
                          Parts Replaced:{' '}
                          <span className="font-mono font-bold text-blue-700">
                            {item.partsReplaced.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
