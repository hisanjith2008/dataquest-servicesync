import React, { useState } from 'react';
import {
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit2,
  Save,
  X,
  UserCheck,
  Search,
  Lock,
  Wrench,
  Sparkles,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { UserAccount } from '../../types';
import { StandardAvatar } from '../common/StandardIdentity';

interface AdminCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedAccount?: UserAccount | null;
}

export const AdminCredentialsModal: React.FC<AdminCredentialsModalProps> = ({
  isOpen,
  onClose,
  initialSelectedAccount,
}) => {
  const { accounts, updateAccountPassword, technicians } = useServiceSync();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Technician' | 'Customer' | 'Admin'>('all');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit / Reset modal state
  const [editingAccountId, setEditingAccountId] = useState<string | null>(
    initialSelectedAccount ? initialSelectedAccount.id : null
  );
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const togglePasswordVisibility = (accountId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleStartEdit = (acc: UserAccount) => {
    setEditingAccountId(acc.id);
    setNewPasswordVal(acc.password || 'tech123');
    setEditErrorMsg(null);
    setEditSuccessMsg(null);
  };

  const handleSavePassword = async (accountId: string) => {
    if (!newPasswordVal.trim()) {
      setEditErrorMsg('Password cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    setEditErrorMsg(null);
    try {
      const res = await updateAccountPassword(accountId, newPasswordVal.trim());
      if (res.success) {
        setEditSuccessMsg(`Password successfully updated for ${accountId}!`);
        // Keep updated password visible for convenience
        setVisiblePasswords((prev) => ({ ...prev, [accountId]: true }));
        setTimeout(() => {
          setEditSuccessMsg(null);
          setEditingAccountId(null);
        }, 2000);
      } else {
        setEditErrorMsg(res.error || 'Failed to update credentials.');
      }
    } catch {
      setEditErrorMsg('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (roleFilter !== 'all' && acc.role !== roleFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      acc.name.toLowerCase().includes(term) ||
      acc.id.toLowerCase().includes(term) ||
      acc.email.toLowerCase().includes(term) ||
      (acc.phone && acc.phone.includes(term))
    );
  });

  const technicianAccounts = accounts.filter((a) => a.role === 'Technician');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-cyan-300 shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Admin Credentials Vault</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Admin Authority
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Centralized credential management: Inspect, reveal, copy, or reset technician &amp; employee passwords.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Vault"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Guidance Banner */}
        <div className="p-3.5 bg-indigo-50 border-b border-indigo-100 flex items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-900 font-medium">
            <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              If a technician forgets their password, you can look it up right here or click <strong>Reset / Edit</strong> to assign a fresh one on the fly.
            </span>
          </div>
          <div className="text-indigo-700 font-mono text-[11px] font-bold shrink-0">
            {technicianAccounts.length} Technicians Registered
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, ID, or email..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium">Filter by Role:</span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  roleFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({accounts.length})
              </button>
              <button
                onClick={() => setRoleFilter('Technician')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  roleFilter === 'Technician'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wrench className="w-3 h-3" />
                <span>Technicians ({technicianAccounts.length})</span>
              </button>
              <button
                onClick={() => setRoleFilter('Customer')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  roleFilter === 'Customer'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Customers ({accounts.filter((a) => a.role === 'Customer').length})
              </button>
              <button
                onClick={() => setRoleFilter('Admin')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  roleFilter === 'Admin'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admins ({accounts.filter((a) => a.role === 'Admin').length})
              </button>
            </div>
          </div>
        </div>

        {/* Accounts Credential Table / Cards */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {filteredAccounts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No accounts found matching your query &quot;{searchTerm}&quot;.
            </div>
          ) : (
            filteredAccounts.map((acc) => {
              const isTech = acc.role === 'Technician';
              const isEditing = editingAccountId === acc.id;
              const isPasswordVisible = Boolean(visiblePasswords[acc.id]);
              const techEntity = acc.technicianId
                ? technicians.find((t) => t.id === acc.technicianId)
                : technicians.find((t) => t.name === acc.name);

              return (
                <div
                  key={acc.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isTech
                      ? 'bg-white border-blue-200/80 shadow-2xs hover:border-blue-300'
                      : 'bg-white border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* User Profile Info */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <StandardAvatar
                        name={acc.name}
                        role={acc.role}
                        size="lg"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm truncate">{acc.name}</span>
                          <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            ID: {acc.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              acc.role === 'Admin'
                                ? 'bg-purple-100 text-purple-800'
                                : acc.role === 'Technician'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {acc.role}
                          </span>
                          {acc.isVerified && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate">
                          {acc.email} · {acc.phone}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">
                          {acc.designation || acc.organization}
                          {techEntity && ` · Hub: ${techEntity.locationName}`}
                        </div>
                      </div>
                    </div>

                    {/* Password Credentials Box */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 self-stretch sm:self-auto justify-end">
                      {isEditing ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2 rounded-xl border border-blue-200 animate-in fade-in">
                          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={newPasswordVal}
                              onChange={(e) => setNewPasswordVal(e.target.value)}
                              placeholder="Enter new password"
                              className="text-xs font-mono font-bold text-slate-900 focus:outline-none w-36"
                              autoFocus
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleSavePassword(acc.id)}
                              disabled={isSubmitting}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingAccountId(null);
                                setEditErrorMsg(null);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl p-1.5 px-3">
                          <div className="text-left mr-2">
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                              Password
                            </div>
                            <div className="font-mono text-xs font-bold text-slate-900 flex items-center gap-1">
                              {isPasswordVisible ? (
                                <span className="text-blue-700">{acc.password || 'tech123'}</span>
                              ) : (
                                <span className="text-slate-400 tracking-widest">••••••••</span>
                              )}
                            </div>
                          </div>

                          {/* Reveal/Hide Button */}
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(acc.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                            title={isPasswordVisible ? 'Hide Password' : 'Show Password'}
                          >
                            {isPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>

                          {/* Copy Password Button */}
                          <button
                            type="button"
                            onClick={() => copyToClipboard(acc.password || 'tech123', `pwd-${acc.id}`)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Copy Password"
                          >
                            {copiedId === `pwd-${acc.id}` ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit / Override Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(acc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Reset / Edit Password"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Quick 1-Click Copy Full Credentials (Login ID + Password) */}
                      <button
                        type="button"
                        onClick={() => {
                          const credentialSummary = `ServiceSync Login Credentials\nEmployee ID: ${acc.id}\nPassword: ${
                            acc.password || 'tech123'
                          }\nEmail: ${acc.email}`;
                          copyToClipboard(credentialSummary, `full-${acc.id}`);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Copy Login ID & Password combo"
                      >
                        {copiedId === `full-${acc.id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy Login Info</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Feedback feedback line if editing */}
                  {isEditing && editErrorMsg && (
                    <div className="mt-2 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                      {editErrorMsg}
                    </div>
                  )}
                  {isEditing && editSuccessMsg && (
                    <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      {editSuccessMsg}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>
              All technician passwords take effect immediately across all sessions and work order dispatches.
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
};
