import React, { useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  PlusCircle,
  MinusCircle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRightLeft,
  X,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { SparePart, SparePartRequest } from '../../types';
import { StandardAvatar } from '../common/StandardIdentity';

export const InventoryView: React.FC = () => {
  const {
    parts,
    sites,
    sparePartRequests,
    transferPartBetweenSites,
    addSparePart,
    updateSparePart,
    deleteSparePart,
    adjustSparePartStock,
    approveTechnicianPartRequest,
    rejectSparePartRequest,
    currentRole,
  } = useServiceSync();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [partToDelete, setPartToDelete] = useState<SparePart | null>(null);
  const [transferPartSku, setTransferPartSku] = useState<string | null>(null);
  const [fromSiteId, setFromSiteId] = useState('site-b');
  const [toSiteId, setToSiteId] = useState('site-a');
  const [transferQty, setTransferQty] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form state for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Bearings',
    inStock: 10,
    minThreshold: 5,
    unitCost: 5000,
    siteId: 'site-a',
    description: '',
  });

  const categories = [
    'Bearings',
    'Electrical',
    'Sensors',
    'Seals & Gaskets',
    'Hydraulics',
    'Filtration',
    'Lubrication',
    'Mechanical',
  ];

  const openAddModal = () => {
    setFormData({
      name: '',
      sku: '',
      category: 'Bearings',
      inStock: 10,
      minThreshold: 5,
      unitCost: 5000,
      siteId: sites[0]?.id || 'site-a',
      description: '',
    });
    setActionError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (part: SparePart) => {
    setEditingPart(part);
    setFormData({
      name: part.name,
      sku: part.sku,
      category: part.category || 'Mechanical',
      inStock: part.inStock,
      minThreshold: part.minThreshold,
      unitCost: part.unitCost,
      siteId: part.siteId,
      description: part.description || '',
    });
    setActionError(null);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) {
      setActionError('Please provide both Part Name and Part ID/SKU.');
      return;
    }

    const siteObj = sites.find((s) => s.id === formData.siteId) || sites[0];

    await addSparePart({
      name: formData.name.trim(),
      sku: formData.sku.trim().toUpperCase(),
      category: formData.category,
      inStock: Math.max(0, Number(formData.inStock)),
      reserved: 0,
      minThreshold: Math.max(0, Number(formData.minThreshold)),
      unitCost: Math.max(0, Number(formData.unitCost)),
      siteId: siteObj.id,
      siteName: siteObj.name,
      description: formData.description.trim(),
      leadTimeDays: 2,
    });

    setIsAddModalOpen(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;

    const siteObj = sites.find((s) => s.id === formData.siteId) || sites[0];

    await updateSparePart(editingPart.id, {
      name: formData.name.trim(),
      sku: formData.sku.trim().toUpperCase(),
      category: formData.category,
      inStock: Math.max(0, Number(formData.inStock)),
      minThreshold: Math.max(0, Number(formData.minThreshold)),
      unitCost: Math.max(0, Number(formData.unitCost)),
      siteId: siteObj.id,
      siteName: siteObj.name,
      description: formData.description.trim(),
    });

    setEditingPart(null);
  };

  const handleConfirmDelete = async () => {
    if (!partToDelete) return;
    await deleteSparePart(partToDelete.id);
    setPartToDelete(null);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferPartSku) return;
    await transferPartBetweenSites(transferPartSku, fromSiteId, toSiteId, transferQty);
    setTransferPartSku(null);
  };

  // Filter parts
  const filteredParts = parts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSite = selectedSiteFilter === 'all' || p.siteId === selectedSiteFilter;
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;

    const available = p.inStock - p.reserved;
    let matchesStatus = true;
    if (statusFilter === 'out') {
      matchesStatus = available <= 0;
    } else if (statusFilter === 'low') {
      matchesStatus = available > 0 && available <= p.minThreshold;
    } else if (statusFilter === 'in_stock') {
      matchesStatus = available > p.minThreshold;
    }

    return matchesSearch && matchesSite && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header with Title and Add Spare Part CTA */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <Package className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Spare Part Inventory Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Centralized spare parts registry across all regional warehouse sites with real-time stock adjustments, reorder thresholds, and technician requisition approvals.
          </p>
        </div>

        {currentRole === 'Admin' && (
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Spare Part</span>
          </button>
        )}
      </div>

      {/* 2. Technicians' Pending Spare Part Requests Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Technician Spare Part Requests</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                {sparePartRequests.filter((r) => r.status === 'Pending Admin Approval').length} Pending
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, approve, or reject field parts requested by technicians for active service work orders.
            </p>
          </div>
        </div>

        {sparePartRequests.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No spare part requests recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Technician</th>
                  <th className="py-2.5 px-3">Service Request</th>
                  <th className="py-2.5 px-3">Part Requested</th>
                  <th className="py-2.5 px-3 text-center">Qty Requested</th>
                  <th className="py-2.5 px-3 text-center">Available Stock</th>
                  <th className="py-2.5 px-3">Request Time</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sparePartRequests.map((req) => {
                  const matchingPart = parts.find(
                    (p) => p.id === req.partId || p.sku === req.partSku
                  );
                  const availableStock = matchingPart
                    ? Math.max(0, matchingPart.inStock - matchingPart.reserved)
                    : 0;
                  const hasInsufficientStock = availableStock < req.quantity;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <StandardAvatar name={req.technicianName} role="Technician" size="sm" />
                          <div>
                            <div className="font-bold text-slate-900">{req.technicianName}</div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {req.technicianId.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono font-semibold text-blue-700">
                        {req.requestId || 'General Warehouse'}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{req.partName}</div>
                        <div className="font-mono text-[10px] text-slate-500">{req.partSku}</div>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {req.quantity}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            hasInsufficientStock
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {availableStock}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {new Date(req.requestedAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            req.status === 'Pending Admin Approval'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : req.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {req.status === 'Pending Admin Approval' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {hasInsufficientStock ? (
                              <span
                                className="px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold"
                                title="Cannot approve: available inventory is lower than requested quantity"
                              >
                                Insufficient Stock
                              </span>
                            ) : (
                              <button
                                onClick={async () => {
                                  const res = await approveTechnicianPartRequest(req.id);
                                  if (!res.success && res.error) {
                                    alert(res.error);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                            )}

                            <button
                              onClick={() => rejectSparePartRequest(req.id, 'Declined by Admin')}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Search and Filter Controls for Inventory */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search parts by name, Part ID, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={selectedSiteFilter}
          onChange={(e) => setSelectedSiteFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer"
        >
          <option value="all">All Locations</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer"
        >
          <option value="all">All Stock Statuses</option>
          <option value="in_stock">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      {/* 4. Spare Part Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Part</th>
                <th className="py-3 px-4">Part ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Available Quantity</th>
                <th className="py-3 px-4 text-center">Minimum</th>
                <th className="py-3 px-4">Unit Price (₹)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No spare parts found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredParts.map((part) => {
                  const available = Math.max(0, part.inStock - part.reserved);
                  const isOutOfStock = available <= 0;
                  const isLowStock = available > 0 && available <= part.minThreshold;

                  return (
                    <tr key={`${part.sku}-${part.id}`} className="hover:bg-slate-50/70 transition-colors">
                      {/* Part Name & Location */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{part.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {part.siteName}
                        </div>
                      </td>

                      {/* Part ID / SKU */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {part.sku}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {part.category || 'Mechanical'}
                        </span>
                      </td>

                      {/* Available Quantity Management */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {currentRole === 'Admin' && (
                            <button
                              onClick={() => adjustSparePartStock(part.id, -1)}
                              disabled={part.inStock <= 0}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              title="− Remove Stock (Reduce quantity by 1)"
                            >
                              <MinusCircle className="w-4 h-4" />
                            </button>
                          )}

                          <span className="font-mono font-bold text-slate-900 text-sm tabular-nums min-w-[24px] text-center">
                            {available}
                          </span>

                          {currentRole === 'Admin' && (
                            <button
                              onClick={() => adjustSparePartStock(part.id, 1)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                              title="+ Add Stock (Increase quantity by 1)"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Minimum Threshold */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                        {part.minThreshold}
                      </td>

                      {/* Unit Price in ₹ */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        ₹{part.unitCost.toLocaleString('en-IN')}
                      </td>

                      {/* Stock Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>Out of Stock</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>In Stock</span>
                          </span>
                        )}
                      </td>

                      {/* Actions: Edit & Remove */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {currentRole === 'Admin' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(part)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50 text-slate-700 transition-colors cursor-pointer"
                              title="Edit Part Details"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                            </button>

                            <button
                              onClick={() => {
                                setTransferPartSku(part.sku);
                                setFromSiteId(part.siteId === 'site-a' ? 'site-b' : 'site-a');
                                setToSiteId(part.siteId);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                              title="Inter-Site Warehouse Transfer"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
                            </button>

                            <button
                              onClick={() => setPartToDelete(part)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:border-rose-400 bg-white hover:bg-rose-50 text-slate-700 transition-colors cursor-pointer"
                              title="Remove Spare Part"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
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

      {/* 5. ADD SPARE PART MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Add Spare Part</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSaveAdd} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Part Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ceramic Bearing"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Part ID / Part Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BRG-88"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Storage / Site Location</label>
                  <select
                    value={formData.siteId}
                    onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.inStock}
                    onChange={(e) => setFormData({ ...formData, inStock: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Minimum Stock</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.minThreshold}
                    onChange={(e) => setFormData({ ...formData, minThreshold: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Specification details, manufacturer, or compatible machinery..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Save Spare Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. EDIT SPARE PART MODAL */}
      {editingPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>Edit Spare Part ({editingPart.sku})</span>
              </h3>
              <button
                onClick={() => setEditingPart(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Part Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.inStock}
                    onChange={(e) => setFormData({ ...formData, inStock: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Minimum Stock</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.minThreshold}
                    onChange={(e) => setFormData({ ...formData, minThreshold: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Storage Location</label>
                <select
                  value={formData.siteId}
                  onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs cursor-pointer"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPart(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. REMOVE SPARE PART CONFIRMATION MODAL */}
      {partToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Remove Spare Part?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove this spare part from inventory?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>
                <strong>Part:</strong> {partToDelete.name}
              </div>
              <div className="font-mono text-slate-500">
                <strong>Part ID:</strong> {partToDelete.sku}
              </div>
              <div className="text-slate-500">
                <strong>Available Stock:</strong> {Math.max(0, partToDelete.inStock - partToDelete.reserved)} units
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPartToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-700 font-semibold hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer text-xs"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Inter-Site Transfer Modal */}
      {transferPartSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              <span>Inter-Site Stock Transfer</span>
            </h3>
            <p className="text-xs text-slate-500">
              Transfer SKU <strong className="font-mono text-blue-700">{transferPartSku}</strong> across facilities.
            </p>

            <form onSubmit={handleExecuteTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">From Facility</label>
                <select
                  value={fromSiteId}
                  onChange={(e) => setFromSiteId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium cursor-pointer"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">To Facility</label>
                <select
                  value={toSiteId}
                  onChange={(e) => setToSiteId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium cursor-pointer"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferPartSku(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fromSiteId === toSiteId}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 transition-all cursor-pointer"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
