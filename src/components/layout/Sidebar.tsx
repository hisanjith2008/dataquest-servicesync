import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  MapPin,
  Factory,
  Package,
  Users,
  ShieldCheck,
  PlusCircle,
  Star,
  Wrench,
  KeyRound,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { AdminCredentialsModal } from '../admin/AdminCredentialsModal';

export const Sidebar: React.FC = () => {
  const [isVaultOpen, setIsVaultOpen] = React.useState(false);
  const {
    activeView,
    setActiveView,
    requests,
    parts,
    technicians,
    customerFeedbacks,
    sparePartRequests,
    setIsCreateModalOpen,
    currentRole,
  } = useServiceSync();

  const openRequestsCount = requests.filter(
    (r) => r.status !== 'Closed' && r.status !== 'Verified'
  ).length;

  const lowStockCount = parts.filter((p) => p.inStock <= p.minThreshold).length;
  const unverifiedTechsCount = technicians.filter((t) => !t.isVerified).length;
  const pendingCompletionVerifications = requests.filter((r) => r.status === 'Completed').length;

  // Role-specific navigation items
  let navItems: {
    id: string;
    label: string;
    icon: any;
    count?: number | string;
  }[] = [];

  if (currentRole === 'Customer') {
    navItems = [
      {
        id: 'dashboard',
        label: 'Service Requests',
        icon: ClipboardList,
        count: openRequestsCount > 0 ? `${openRequestsCount}` : undefined,
      },
    ];
  } else if (currentRole === 'Technician') {
    navItems = [
      {
        id: 'dashboard',
        label: 'Field Work Orders',
        icon: Wrench,
      },
      {
        id: 'equipment',
        label: 'Machinery Telemetry',
        icon: Factory,
      },
      {
        id: 'map',
        label: 'Site Proximity Map',
        icon: MapPin,
      },
    ];
  } else {
    // Admin navigation
    navItems = [
      {
        id: 'dashboard',
        label: 'Operations Console',
        icon: LayoutDashboard,
        count: pendingCompletionVerifications > 0 ? `${pendingCompletionVerifications}` : undefined,
      },
      {
        id: 'requests',
        label: 'All Service Requests',
        icon: ClipboardList,
        count: `${openRequestsCount}`,
      },
      {
        id: 'technicians',
        label: 'Technician Roster',
        icon: Users,
        count: unverifiedTechsCount > 0 ? `${unverifiedTechsCount}` : undefined,
      },
      {
        id: 'inventory',
        label: 'Spare Parts',
        icon: Package,
        count: lowStockCount > 0 ? `${lowStockCount}` : undefined,
      },
      {
        id: 'map',
        label: 'Live GIS Radar',
        icon: MapPin,
      },
      {
        id: 'equipment',
        label: 'Connected Equipment',
        icon: Factory,
      },
      {
        id: 'audit',
        label: 'Secure Service History',
        icon: ShieldCheck,
      },
    ];
  }

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col justify-between shrink-0 h-[calc(100vh-4rem)]">
      {/* Navigation List */}
      <div className="p-4 space-y-4 overflow-y-auto">
        {/* Role Workspace Context */}
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-left">
          <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between mb-0.5">
            <span>{currentRole} Workspace</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            {currentRole === 'Admin' && 'Central dispatch, technician verification & parts approvals.'}
            {currentRole === 'Technician' && '5-minute dispatch offers & digital inspection uploads.'}
            {currentRole === 'Customer' && 'Real-time service tracking & satisfaction feedback.'}
          </p>
        </div>

        {/* Primary CTA for Customer */}
        {currentRole === 'Customer' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Raise Service Request</span>
          </button>
        )}

        {/* Navigation Items */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-800 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span className="text-[11px] font-mono font-medium text-slate-500 tabular-nums">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Status Panel */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50/60 text-xs">
        <div className="flex items-center justify-between text-slate-500 mb-0.5">
          <span className="font-medium text-slate-700">Indian Industrial Hub</span>
          <span className="text-emerald-700 font-medium text-[11px]">System Online</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Bengaluru · Pune · Chennai
        </div>
      </div>
    </aside>
  );
};
