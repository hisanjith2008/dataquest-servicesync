import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { ServiceSyncProvider, useServiceSync } from './context/ServiceSyncContext';
import { ALLOWED_VIEWS_BY_ROLE } from './types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { CustomerDashboardView } from './components/customer/CustomerDashboardView';
import { TechnicianDashboardView } from './components/technician/TechnicianDashboardView';
import { RequestsListView } from './components/requests/RequestsListView';
import { RequestDetailDrawer } from './components/requests/RequestDetailDrawer';
import { CreateRequestModal } from './components/requests/CreateRequestModal';
import { RecoveryPlanModal } from './components/conflict/RecoveryPlanModal';
import { CopilotDrawer } from './components/copilot/CopilotDrawer';
import { AuditChainView } from './components/audit/AuditChainView';
import { ArchitectureView } from './components/architecture/ArchitectureView';
import { MachinesView } from './components/machines/MachinesView';
import { InventoryView } from './components/inventory/InventoryView';
import { TechniciansView } from './components/technicians/TechniciansView';
import { EquipmentMap } from './components/map/EquipmentMap';
import { DemoScenarioBar } from './components/demo/DemoScenarioBar';
import { LoginView } from './components/auth/LoginView';

const AppContent: React.FC = () => {
  const { activeView, setActiveView, currentRole } = useServiceSync();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // The first screen users see must be the clean, polished professional login page
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const allowedViews = ALLOWED_VIEWS_BY_ROLE[currentRole] || ['dashboard'];
  const isViewAuthorized = allowedViews.includes(activeView);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* 1. Header with Account details & Switch User action */}
      <Header onLogoutClick={() => setIsAuthenticated(false)} />

      {/* 2. Interactive Guided Scenario Walkthrough Bar for M-104 Indian Crisis Demo (Admin Only) */}
      {currentRole === 'Admin' && <DemoScenarioBar />}

      {/* 3. Main 3-Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Sidebar Navigation (Filtered strictly by role) */}
        <Sidebar />

        {/* Main Workspace View */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Fallback Guard: If activeView is unauthorized for currentRole */}
            {!isViewAuthorized && (
              <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-4 max-w-lg mx-auto shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Restricted Workspace Section</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Your authenticated role (<strong className="text-slate-900">{currentRole}</strong>) does not have access permissions for this section.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('dashboard')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Return to {currentRole} Dashboard
                </button>
              </div>
            )}

            {/* Customer Role View: Dedicated to Service Requests */}
            {isViewAuthorized && currentRole === 'Customer' && (
              <CustomerDashboardView />
            )}

            {/* Technician Role View */}
            {isViewAuthorized && currentRole === 'Technician' && (
              <>
                {activeView === 'dashboard' && <TechnicianDashboardView />}
                {activeView === 'equipment' && <MachinesView />}
                {activeView === 'map' && (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
                    <h2 className="text-base font-bold text-slate-900">Site Proximity Radar</h2>
                    <EquipmentMap heightClass="h-[640px]" />
                  </div>
                )}
              </>
            )}

            {/* Admin Role View */}
            {isViewAuthorized && currentRole === 'Admin' && (
              <>
                {activeView === 'dashboard' && <AdminDashboardView />}
                {activeView === 'requests' && <RequestsListView />}
                {activeView === 'technicians' && <TechniciansView />}
                {activeView === 'inventory' && <InventoryView />}
                {activeView === 'equipment' && <MachinesView />}
                {activeView === 'map' && (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Live Operations GIS Map &amp; Indian Industrial Hub Radar
                      </h2>
                      <p className="text-xs text-slate-500">
                        Interactive GIS monitoring of cleanroom sites in Bengaluru (Peenya), Pune (Chakan), and Chennai (Ambattur).
                      </p>
                    </div>
                    <EquipmentMap heightClass="h-[640px]" />
                  </div>
                )}
                {activeView === 'audit' && <AuditChainView />}
                {activeView === 'architecture' && <ArchitectureView />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Contextual Service Request Details Drawer & Global Modals */}
      <RequestDetailDrawer />
      <CreateRequestModal />
      <RecoveryPlanModal />
      <CopilotDrawer />
    </div>
  );
};

export default function App() {
  return (
    <ServiceSyncProvider>
      <AppContent />
    </ServiceSyncProvider>
  );
}
