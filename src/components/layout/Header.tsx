import React, { useState } from 'react';
import {
  Bell,
  Cpu,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  LogOut,
  Menu,
  X,
  ClipboardList,
  Factory,
  Star,
  Wrench,
  MapPin,
  LayoutDashboard,
  Users,
  Package,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { AdminCredentialsModal } from '../admin/AdminCredentialsModal';
import { StandardAvatar } from '../common/StandardIdentity';

interface HeaderProps {
  onLogoutClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogoutClick }) => {
  const {
    currentRole,
    currentUser,
    currentUserAccount,
    notifications,
    triggerSimulatedIotAlert,
    isCopilotOpen,
    setIsCopilotOpen,
    setSelectedRequestId,
    markNotificationAsRead,
    clearAllNotifications,
    activeView,
    setActiveView,
  } = useServiceSync();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSimulatingIot, setIsSimulatingIot] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSimulateIot = async () => {
    setIsSimulatingIot(true);
    try {
      await triggerSimulatedIotAlert('M-104');
    } finally {
      setTimeout(() => setIsSimulatingIot(false), 800);
    }
  };

  // Mobile navigation items based on active role
  const getMobileNavItems = () => {
    if (currentRole === 'Customer') {
      return [
        { id: 'dashboard', label: 'Service Requests', icon: ClipboardList },
      ];
    }
    if (currentRole === 'Technician') {
      return [
        { id: 'dashboard', label: 'Field Work Orders', icon: Wrench },
        { id: 'equipment', label: 'Machinery Telemetry', icon: Factory },
        { id: 'map', label: 'Site Proximity Map', icon: MapPin },
      ];
    }
    return [
      { id: 'dashboard', label: 'Operations Console', icon: LayoutDashboard },
      { id: 'requests', label: 'All Requests', icon: ClipboardList },
      { id: 'technicians', label: 'Technician Roster', icon: Users },
      { id: 'inventory', label: 'Spare Parts', icon: Package },
      { id: 'map', label: 'Live GIS Radar', icon: MapPin },
      { id: 'equipment', label: 'Connected Equipment', icon: Factory },
      { id: 'audit', label: 'Secure Service History', icon: ShieldCheck },
    ];
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Zone, Dashboard Title & Mobile Menu Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile menu toggle for < md screens */}
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Toggle Navigation Menu"
          >
            {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs font-black text-lg tracking-tight">
            S<span className="text-blue-200">S</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 tracking-tight">ServiceSync</span>
            </div>
            <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5">
              <span>Industrial Equipment Systems</span>
            </div>
          </div>

          {/* Contextual Dashboard Title */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200">
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
              {currentRole === 'Admin'
                ? 'Centralized Operations Console'
                : currentRole === 'Technician'
                ? 'Field Specialist Terminal'
                : 'Customer Service Portal'}
            </span>
          </div>
        </div>

        {/* Center: Admin Simulation Tools & Copilot */}
        {currentRole === 'Admin' ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Simulated IoT Alert button */}
            <button
              onClick={handleSimulateIot}
              disabled={isSimulatingIot}
              title="Simulate automated sensor alarm from M-104 vibration sensor"
              className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Cpu className={`w-3.5 h-3.5 text-rose-600 ${isSimulatingIot ? 'animate-spin' : ''}`} />
              <span>Simulate IoT Alert</span>
            </button>

            {/* Admin Credentials Vault Button */}
            <button
              onClick={() => setIsVaultOpen(true)}
              title="Open Technician Credentials Vault & Passwords"
              className="hidden md:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>Credentials Vault</span>
            </button>

            {/* AI Copilot Toggle */}
            <button
              onClick={() => setIsCopilotOpen(!isCopilotOpen)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                isCopilotOpen
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{currentUserAccount.organization}</span>
          </div>
        )}

        {/* Right: Authenticated User Persona & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Persona & Role Info */}
          <div className="flex items-center gap-2.5 pl-1 sm:pl-2">
            <StandardAvatar
              name={currentUser.name}
              role={currentRole}
              size="md"
            />
            <div className="text-left text-xs hidden sm:block">
              <div className="font-semibold text-slate-900 leading-tight flex items-center gap-1.5">
                <span className="truncate max-w-[120px]">{currentUser.name}</span>
                <span className="text-[10px] font-mono text-slate-400">({currentUser.id})</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                <span className="font-medium text-slate-700">{currentRole}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate max-w-[110px]">{currentUserAccount.organization}</span>
              </div>
            </div>
          </div>

          {/* Sign Out / Switch Account Button */}
          {onLogoutClick && (
            <button
              onClick={onLogoutClick}
              title="Sign out or switch employee account"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          )}

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-[60] animate-in fade-in duration-100">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="font-semibold text-xs text-slate-900">
                    System Alerts &amp; Notifications ({notifications.length})
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-xs text-slate-500 hover:text-blue-600 cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications at this time.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationAsRead(notif.id);
                          if (notif.requestId) setSelectedRequestId(notif.requestId);
                          setIsNotifOpen(false);
                        }}
                        className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors ${
                          notif.read ? 'opacity-70' : 'bg-blue-50/20'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {notif.type === 'danger' ? (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          ) : notif.type === 'warning' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-900">
                              {notif.title}
                            </div>
                            <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                              {notif.message}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 font-mono">
                              {new Date(notif.timestamp).toLocaleTimeString('en-IN')} IST
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown (< md screens) */}
      {isMobileNavOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white p-3 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            {currentRole} Workspace Navigation
          </div>
          {getMobileNavItems().map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Admin Credentials Vault Modal */}
      <AdminCredentialsModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
      />
    </header>
  );
};
