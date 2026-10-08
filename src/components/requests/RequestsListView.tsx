import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ChevronRight,
  LayoutGrid,
  List,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { getStatusColor, getCustomerFacingStatus } from '../../utils/stateMachine';
import { getSlaRemainingInfo } from '../../utils/conflictEngine';
import { RequestStatus, Priority } from '../../types';
import { StandardAvatar } from '../common/StandardIdentity';

export const RequestsListView: React.FC = () => {
  const {
    scopedRequests,
    selectedRequestId,
    setSelectedRequestId,
    setIsCreateModalOpen,
    setIsRecoveryModalOpen,
    technicians,
    currentRole,
  } = useServiceSync();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  const filteredRequests = scopedRequests.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.machineId.toLowerCase().includes(search.toLowerCase()) ||
      r.siteName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || r.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const kanbanStages: RequestStatus[] = [
    'Draft',
    'Pending Approval',
    'Approved',
    'Assigned',
    'In Progress',
    'Completed',
    'Verified',
    'Closed',
  ];

  return (
    <div className="space-y-4">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Industrial Equipment Service Requests
          </h2>
          <p className="text-xs text-slate-500">
            Lifecycle monitoring with SLA breach countdowns &amp; pre-flight readiness
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Kanban</span>
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {currentRole === 'Customer' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center justify-between">
          <span className="font-semibold">
            Customer Site-Level Scoping Active: Viewing requests contracted to Silicon Valley MicroFab (Site A) only.
          </span>
          <span className="text-[10px] uppercase font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
            RBAC Enforced
          </span>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, title, machine (e.g. M-104), or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs"
        >
          <option value="all">All Lifecycle States</option>
          <option value="Draft">Draft</option>
          <option value="Validated">Validated</option>
          <option value="Pending Approval">Pending Approval</option>
          <option value="Approved">Approved</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress (Frozen)</option>
          <option value="Completed">Completed</option>
          <option value="Verified">Verified</option>
          <option value="Exception">Exception (Conflicts)</option>
          <option value="Closed">Closed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs"
        >
          <option value="all">All Priorities</option>
          <option value="P1 - Critical">P1 - Critical</option>
          <option value="P2 - High">P2 - High</option>
          <option value="P3 - Medium">P3 - Medium</option>
          <option value="P4 - Low">P4 - Low</option>
        </select>
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Request &amp; Priority</th>
                  <th className="py-3 px-4">Machine &amp; Site</th>
                  <th className="py-3 px-4">Lifecycle Status</th>
                  <th className="py-3 px-4">Assigned Tech</th>
                  <th className="py-3 px-4">Readiness</th>
                  <th className="py-3 px-4">Contractual SLA</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No service requests match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const statusStyle = getStatusColor(req.status);
                    const slaInfo = getSlaRemainingInfo(req.slaDeadline);
                    const isSelected = selectedRequestId === req.id;
                    const assignedTech = technicians.find(
                      (t) => t.id === req.assignedTechnicianId
                    );

                    return (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedRequestId(req.id)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/40 ring-1 ring-blue-500/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800">
                              {req.id}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                req.priority === 'P1 - Critical'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {req.priority.split(' ')[0]}
                            </span>
                          </div>
                          <div className="font-medium text-slate-900 line-clamp-1 mt-0.5 max-w-xs">
                            {req.title}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-blue-700">
                            {req.machineId}
                          </span>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {req.siteName}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            {currentRole === 'Customer' ? getCustomerFacingStatus(req.status) : req.status}
                          </span>
                          {req.offeredTechnicianId && !req.assignedTechnicianId && (
                            <span className="block text-[10px] text-rose-600 font-bold font-mono mt-0.5">
                              5m Timer Active
                            </span>
                          )}
                          {req.frozenWindow && (
                            <div className="flex items-center gap-1 text-[10px] text-cyan-700 font-semibold mt-1">
                              <Lock className="w-3 h-3 text-cyan-600" />
                              <span>Frozen Window</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {assignedTech ? (
                            <div className="flex items-center gap-2">
                              <StandardAvatar
                                name={assignedTech.name}
                                role="Technician"
                                size="sm"
                              />
                              <span className="font-medium text-slate-800 text-xs">
                                {assignedTech.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {req.preFlightScore ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono font-bold text-xs ${
                                  req.preFlightScore.totalScore >= 80
                                    ? 'text-emerald-600'
                                    : req.preFlightScore.totalScore >= 50
                                    ? 'text-amber-600'
                                    : 'text-rose-600'
                                }`}
                              >
                                {req.preFlightScore.totalScore}
                              </span>
                              <span className="text-slate-400 text-[10px]">/ 100</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div
                            className={`font-mono font-bold text-[11px] ${
                              slaInfo.isBreached
                                ? 'text-rose-600'
                                : slaInfo.isAtRisk
                                ? 'text-amber-600'
                                : 'text-slate-700'
                            }`}
                          >
                            {slaInfo.formatted}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {req.status === 'Exception' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequestId(req.id);
                                setIsRecoveryModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-2xs"
                            >
                              Recovery Plan
                            </button>
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanStages.map((stage) => {
            const stageRequests = filteredRequests.filter((r) => r.status === stage);
            const style = getStatusColor(stage);

            return (
              <div
                key={stage}
                className="w-72 shrink-0 bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 space-y-3"
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <span className="font-bold text-xs text-slate-800">{stage}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-white text-slate-600 border border-slate-200">
                    {stageRequests.length}
                  </span>
                </div>

                <div className="space-y-2.5 min-h-[300px]">
                  {stageRequests.map((req) => {
                    const sla = getSlaRemainingInfo(req.slaDeadline);
                    return (
                      <div
                        key={req.id}
                        onClick={() => setSelectedRequestId(req.id)}
                        className={`bg-white p-3 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2 ${
                          selectedRequestId === req.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[11px] text-slate-700">
                            {req.id}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              req.priority === 'P1 - Critical'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.priority.split(' ')[0]}
                          </span>
                        </div>

                        <div className="font-semibold text-xs text-slate-900 line-clamp-2">
                          {req.title}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <span className="font-mono text-blue-600 font-bold">{req.machineId}</span>
                          <span className={`font-mono ${sla.isAtRisk ? 'text-amber-600 font-bold' : ''}`}>
                            {sla.formatted.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
