import React, { useState } from 'react';
import {
  X,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { Priority } from '../../types';

export const CreateRequestModal: React.FC = () => {
  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    machines,
    sites,
    parts,
    technicians,
    createRequest,
    currentRole,
  } = useServiceSync();

  const [machineId, setMachineId] = useState<string>('M-104');
  const [title, setTitle] = useState<string>('Emergency Bearing Calibration & Vibration Reduction');
  const [description, setDescription] = useState<string>(
    'Equipment telemetry exceeds operating tolerance. Immediate servicing requested.'
  );
  const [priority, setPriority] = useState<Priority>('P1 - Critical');
  const [hoursToDeadline, setHoursToDeadline] = useState<number>(4);
  const [customerAddress, setCustomerAddress] = useState<string>(
    'Plot 48/B, Phase II, Peenya Industrial Area, Bengaluru, Karnataka 560058'
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['Spindle Overhaul', 'Vibration Analysis']);
  const [selectedPartId, setSelectedPartId] = useState<string>('part-01');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isCreateModalOpen) return null;

  const selectedMachine = machines.find((m) => m.id === machineId) || machines[0];
  const selectedSite = sites.find((s) => s.id === selectedMachine?.siteId) || sites[0];

  // Available skills list
  const availableSkills = [
    'Spindle Overhaul',
    'Vibration Analysis',
    'Laser Metrology',
    'Cleanroom Protocols',
    'Hydraulics',
    'Wire EDM',
    'Vacuum Systems',
    'Robotics',
    'Motion Controllers',
  ];

  const handleToggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  // Check validation checks in real time
  const partsAtSite = parts.filter((p) => p.siteId === selectedSite.id);
  const chosenPart = parts.find((p) => p.id === selectedPartId);
  const isPartAvailable = chosenPart && (chosenPart.inStock - chosenPart.reserved) > 0;
  const eligibleTechs = technicians.filter(
    (t) =>
      t.status !== 'Dropped Out' &&
      t.status !== 'Off Duty' &&
      selectedSkills.some((s) => t.skills.includes(s))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const deadline = new Date(Date.now() + hoursToDeadline * 3600 * 1000).toISOString();
      const reqParts = chosenPart
        ? [{ partId: chosenPart.id, partName: chosenPart.name, quantity: 1 }]
        : [];

      const res = await createRequest({
        title,
        description,
        machineId: selectedMachine.id,
        siteId: selectedSite.id,
        siteName: selectedSite.name,
        customerAddress,
        priority,
        slaDeadline: deadline,
        requiredSkills: selectedSkills,
        requiredParts: reqParts,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to create request.');
      } else {
        setIsCreateModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              New Industrial Service Request
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict multi-point validation &amp; pre-flight eligibility check
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto text-xs">
            {/* Machine & Site Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Machine (Asset ID)
                </label>
                <select
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} - {m.name} ({m.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Facility Site
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedSite.name}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-slate-100 font-medium text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Request Title */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Incident Summary / Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Spindle Vibration Alarm & Bearing Swap"
                className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Service Location / Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  Customer Destination Address (Google Geocoding)
                </label>
                <span className="text-[10px] text-blue-600 font-medium">Auto-Geocoded to Lat/Lng</span>
              </div>
              <input
                type="text"
                required
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="e.g. Plot 48/B, Phase II, Peenya Industrial Area, Bengaluru"
                className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Priority & SLA Deadline */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Incident Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full p-2 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="P1 - Critical">P1 - Critical (Immediate Production Halt)</option>
                  <option value="P2 - High">P2 - High (Significant Risk / Drift)</option>
                  <option value="P3 - Medium">P3 - Medium (Scheduled Overhaul)</option>
                  <option value="P4 - Low">P4 - Low (Inspection / Minor Calibration)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contractual SLA Window
                </label>
                <select
                  value={hoursToDeadline}
                  onChange={(e) => setHoursToDeadline(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={2}>2 Hours (Emergency P1 response)</option>
                  <option value={4}>4 Hours (Standard Tier-1 SLA)</option>
                  <option value={8}>8 Hours (Single Shift completion)</option>
                  <option value={24}>24 Hours (Next Business Day)</option>
                </select>
              </div>
            </div>

            {/* Required Skills Selection */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Required Technical Certifications / Skills
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableSkills.map((sk) => {
                  const isChecked = selectedSkills.includes(sk);
                  return (
                    <button
                      type="button"
                      key={sk}
                      onClick={() => handleToggleSkill(sk)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                        isChecked
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}
                      {sk}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spare Parts Pre-flight check */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Required Spare Part &amp; Stock Availability
              </label>
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) &bull; At: {p.siteName} &bull; Stock: {p.inStock} (Reserved: {p.reserved})
                  </option>
                ))}
              </select>
            </div>

            {/* Live Pre-Validation Assessment Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Pre-Flight Validation Check:
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-white border border-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800 text-[11px]">Machine Asset</div>
                    <div className="text-[10px] text-slate-500">Verified at Site</div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-white border border-slate-100 flex items-center gap-2">
                  {eligibleTechs.length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-slate-800 text-[11px]">Skills Matched</div>
                    <div className="text-[10px] text-slate-500">
                      {eligibleTechs.length} tech(s) qualified
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-white border border-slate-100 flex items-center gap-2">
                  {isPartAvailable ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-slate-800 text-[11px]">Parts Stock</div>
                    <div className="text-[10px] text-slate-500">
                      {isPartAvailable ? 'Available' : 'Low / Transfer req.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                {formError}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Role: <strong className="text-slate-800">{currentRole}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <span>Create &amp; Validate Request</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
