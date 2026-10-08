import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';

export const DemoScenarioBar: React.FC = () => {
  const { demoStep, runDemoStep, setSelectedRequestId } = useServiceSync();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const steps = [
    {
      num: 1,
      title: '1. Incident',
      desc: 'M-104 Vibration Spike (>7.8 mm/s) at Peenya Site A',
    },
    {
      num: 2,
      title: '2. Readiness',
      desc: 'Pre-flight evaluated (42/100: Bearing 0 stock)',
    },
    {
      num: 3,
      title: '3. Dispatch',
      desc: 'Approved, auto-assigned to Suresh Kumar',
    },
    {
      num: 4,
      title: '4. Crisis & 5m Cascade',
      desc: 'Technician dropout + 5-min cascade timer to Priya Patel',
      highlight: true,
    },
    {
      num: 5,
      title: '5. Recovery & Close',
      desc: 'Inter-site Pune transfer & Priya Patel dispatched & verified',
    },
  ];

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        {/* Left Label & Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-600 font-semibold text-[10px] uppercase tracking-wider text-white">
            <Sparkles className="w-3 h-3 text-blue-200" />
            <span>Scenario</span>
          </div>
          <span className="font-medium text-slate-300 text-xs hidden sm:inline">
            Machine M-104 Cascade Walkthrough
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white text-[11px] flex items-center gap-0.5 ml-1 cursor-pointer"
            title={isExpanded ? 'Collapse scenario bar' : 'Expand scenario bar'}
          >
            {isExpanded ? <span>Hide</span> : <span>Show</span>}
            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Center: 5 Interactive Steps (when expanded) */}
        {isExpanded && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
            {steps.map((st) => {
              const isActive = demoStep === st.num;
              return (
                <button
                  key={st.num}
                  onClick={() => {
                    runDemoStep(st.num);
                    setSelectedRequestId('SR-1040');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                    isActive
                      ? st.highlight
                        ? 'bg-rose-600 border-rose-500 text-white font-semibold'
                        : 'bg-blue-600 border-blue-500 text-white font-semibold'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={st.desc}
                >
                  <span>{st.title}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Right: Next / Reset Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              const next = demoStep < 5 ? demoStep + 1 : 1;
              runDemoStep(next);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-colors cursor-pointer"
          >
            <span>Next Step</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
