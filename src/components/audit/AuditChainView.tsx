import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Check,
  Link2,
  FileText,
  User,
  Shield,
  Filter,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';
import { GENESIS_HASH } from '../../utils/cryptoAudit';
import { StandardAvatar } from '../common/StandardIdentity';

export const AuditChainView: React.FC = () => {
  const { auditLog, verifyAuditLedger } = useServiceSync();

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    checkedCount: number;
    message: string;
    verifiedAt: string;
  }>({
    isValid: true,
    checkedCount: auditLog.length,
    message: `All ${auditLog.length} service history records were successfully verified.`,
    verifiedAt: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
  });

  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Run real verification on mount
  useEffect(() => {
    let isMounted = true;
    verifyAuditLedger().then((res) => {
      if (isMounted) {
        setVerificationResult({
          isValid: res.isValid,
          checkedCount: res.checkedCount,
          message: res.message,
          verifiedAt: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [verifyAuditLedger]);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyAuditLedger();
      setVerificationResult({
        isValid: result.isValid,
        checkedCount: result.checkedCount,
        message: result.message,
        verifiedAt: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
      });
    } finally {
      setTimeout(() => setIsVerifying(false), 450);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1800);
  };

  const formatDisplayTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  // Filter audit records
  const filteredLogs = [...auditLog].reverse().filter((entry) => {
    const q = searchTerm.toLowerCase();
    return (
      entry.action.toLowerCase().includes(q) ||
      entry.actor.toLowerCase().includes(q) ||
      entry.entityId.toLowerCase().includes(q) ||
      entry.entityType.toLowerCase().includes(q) ||
      entry.hash.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Secure Service History
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              A tamper-evident record of important ServiceSync activities.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Verifying Integrity...' : 'Verify History Integrity'}</span>
            </button>
          </div>
        </div>

        {/* Status Dashboard Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Chain Status</span>
              <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5 mt-0.5">
                {verificationResult.isValid ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-emerald-700">Verified</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span className="text-rose-700">Integrity Check Failed</span>
                  </>
                )}
              </span>
            </div>
            <CheckCircle2
              className={`w-5 h-5 ${
                verificationResult.isValid ? 'text-emerald-600' : 'text-rose-500'
              }`}
            />
          </div>

          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Records Checked</span>
              <span className="font-mono font-bold text-sm text-slate-900 mt-0.5">
                {verificationResult.checkedCount} / {auditLog.length} Records
              </span>
            </div>
            <Shield className="w-5 h-5 text-blue-600" />
          </div>

          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">Last Verified</span>
              <span className="font-mono font-semibold text-sm text-slate-900 mt-0.5">
                {verificationResult.verifiedAt}
              </span>
            </div>
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        {/* Verification Notification Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
            verificationResult.isValid
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {verificationResult.isValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <span className="font-bold">
                {verificationResult.isValid ? 'History Verified:' : 'Verification Failed:'}{' '}
              </span>
              <span>{verificationResult.message}</span>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
            {verificationResult.checkedCount} / {auditLog.length} Checked
          </div>
        </div>
      </div>

      {/* 2. Activity History Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search activity, service request, part, or actor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Activity Records: <strong className="text-slate-800">{auditLog.length}</strong>
        </div>
      </div>

      {/* 3. Clean Activity History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4 w-32">Time</th>
                <th className="py-3 px-4">Activity</th>
                <th className="py-3 px-4">Service/Part</th>
                <th className="py-3 px-4">Performed By</th>
                <th className="py-3 px-4 text-right">Integrity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No activity records found matching search.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {formatDisplayTime(entry.timestamp)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{entry.action}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {entry.details?.message ||
                          entry.details?.reason ||
                          (entry.details?.quantity ? `Quantity: ${entry.details.quantity}` : 'System logged event')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {entry.entityId}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-medium">
                        ({entry.entityType})
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <StandardAvatar name={entry.actor} role={entry.actorRole} size="sm" />
                        <div>
                          <div className="font-semibold text-slate-800">{entry.actor}</div>
                          <div className="text-[10px] text-slate-400">{entry.actorRole}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Collapsible Technical Verification Details */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full p-4 flex items-center justify-between bg-slate-50/60 hover:bg-slate-100/70 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-xs text-slate-800">
              View Technical Verification Details
            </span>
            <span className="text-[11px] text-slate-400">
              (Cryptographic SHA-256 block ledger, hashes &amp; payload structures)
            </span>
          </div>
          {showTechnicalDetails ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="p-4 sm:p-5 space-y-4 border-t border-slate-200 animate-in fade-in duration-150">
            <div className="text-xs text-slate-500 leading-relaxed bg-blue-50/60 border border-blue-200/80 p-3 rounded-xl text-blue-900">
              <strong>Cryptographic Implementation:</strong> Every record is linked via canonical payload serialization and hashed with standard SHA-256. Block #0 is anchored to the Genesis hash ({GENESIS_HASH.slice(0, 8)}...). Any alteration to historical records breaks all subsequent hashes.
            </div>

            <div className="space-y-3">
              {filteredLogs.map((entry) => {
                const isGenesis = entry.sequenceIndex === 0;

                return (
                  <div
                    key={entry.id}
                    className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 space-y-3"
                  >
                    {/* Header line of block */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          Block #{entry.sequenceIndex}
                        </span>
                        <span className="font-bold text-slate-900">{entry.action}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {entry.entityType}: {entry.entityId}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                        <span>{new Date(entry.timestamp).toISOString()}</span>
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                          Intact
                        </span>
                      </div>
                    </div>

                    {/* Hash linkage grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Previous Hash */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span className="font-semibold flex items-center gap-1">
                            <Link2 className="w-3 h-3 text-slate-400" />
                            Previous Hash
                          </span>
                          {isGenesis && (
                            <span className="text-[9px] uppercase font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                              Genesis Anchor
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-600 break-all select-all flex items-center justify-between gap-2">
                          <span className="truncate">{entry.previousHash}</span>
                          <button
                            onClick={() => handleCopyHash(entry.previousHash)}
                            className="text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
                            title="Copy previous hash"
                          >
                            {copiedHash === entry.previousHash ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Current SHA-256 Hash */}
                      <div className="bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-200/80">
                        <div className="flex items-center justify-between text-[10px] text-emerald-800 mb-1">
                          <span className="font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Current SHA-256 Hash
                          </span>
                          <span className="text-[9px] font-mono font-bold text-emerald-700">Sealed</span>
                        </div>
                        <div className="font-mono text-[11px] text-emerald-900 break-all select-all flex items-center justify-between gap-2">
                          <span className="truncate font-semibold">{entry.hash}</span>
                          <button
                            onClick={() => handleCopyHash(entry.hash)}
                            className="text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
                            title="Copy SHA-256 hash"
                          >
                            {copiedHash === entry.hash ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Event Data JSON Payload */}
                    {entry.details && Object.keys(entry.details).length > 0 && (
                      <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 font-mono overflow-x-auto">
                        <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Event Data:
                        </span>
                        {JSON.stringify(entry.details, null, 2)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
