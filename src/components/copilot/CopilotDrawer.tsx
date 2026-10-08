import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Send,
  FileText,
  Package,
  UserCheck,
  CheckCircle,
  Copy,
  Check,
  Loader2,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import { useServiceSync } from '../../context/ServiceSyncContext';

interface CopilotMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  source?: string;
  suggestedAction?: {
    type: 'apply_parts' | 'apply_report';
    label: string;
    payload?: any;
  };
}

export const CopilotDrawer: React.FC = () => {
  const {
    isCopilotOpen,
    setIsCopilotOpen,
    selectedRequestId,
    requests,
    machines,
    technicians,
    transitionRequest,
  } = useServiceSync();

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedActionId, setAppliedActionId] = useState<string | null>(null);

  const request = requests.find((r) => r.id === selectedRequestId);
  const machine = machines.find((m) => m.id === request?.machineId);
  const technician = technicians.find((t) => t.id === request?.assignedTechnicianId);

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      text: `Hello! I am your **ServiceSync AI Copilot** powered by Gemini. I can analyze machine telemetry, correlate past maintenance records, explain technician readiness, and draft sign-off reports.\n\n*All recommendations cite factual equipment records and require human authorization before applying.*`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  if (!isCopilotOpen) return null;

  const handleActionChip = async (action: 'summarize' | 'suggest_parts' | 'explain_assignment' | 'draft_report') => {
    setIsLoading(true);

    const userPromptMap = {
      summarize: 'Summarize this service request and key operational risks.',
      suggest_parts: 'Analyze machine history and telemetry to suggest probable spare parts.',
      explain_assignment: 'Explain why the assigned technician was selected.',
      draft_report: 'Draft an industrial service completion and validation report.',
    };

    const userMsg: CopilotMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: userPromptMap[action],
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          requestData: request,
          machineData: machine,
          technicianData: technician,
        }),
      });

      const data = await res.json();
      const copilotMsg: CopilotMessage = {
        id: `c-${Date.now()}`,
        sender: 'copilot',
        text: data.text || 'Unable to generate response.',
        timestamp: new Date().toLocaleTimeString(),
        source: data.source,
        suggestedAction:
          action === 'suggest_parts'
            ? {
                type: 'apply_parts',
                label: 'Reserve Recommended Spindle Bearings (BRG-CERAMIC-88)',
              }
            : action === 'draft_report'
            ? {
                type: 'apply_report',
                label: 'Save Draft as Field Completion Notes',
              }
            : undefined,
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'copilot',
          text: `Error connecting to AI service: ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCustomQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userText = query.trim();
    setQuery('');
    setIsLoading(true);

    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: userText,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'general_qa',
          query: userText,
          requestData: request,
          machineData: machine,
          technicianData: technician,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `c-${Date.now()}`,
          sender: 'copilot',
          text: data.text || 'No response generated.',
          timestamp: new Date().toLocaleTimeString(),
          source: data.source,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'copilot',
          text: `Service response: ${err.message}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyAction = (msgId: string, actionType: string) => {
    setAppliedActionId(msgId);
    setTimeout(() => setAppliedActionId(null), 3000);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-200 border border-blue-500/30">
            <Sparkles className="w-4 h-4 text-blue-300" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight text-white">ServiceSync AI Copilot</h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Grounded Telemetry &amp; Field Diagnostics
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCopilotOpen(false)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Request Context Bar */}
      {request && (
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-slate-700">Context:</span>
            <span className="font-mono font-bold text-blue-700">{request.id}</span>
            <span className="text-slate-500 truncate">({machine?.name || request.machineId})</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 shrink-0">
            {request.status}
          </span>
        </div>
      )}

      {/* Quick Action Chips */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-1.5 text-[11px]">
        <button
          onClick={() => handleActionChip('summarize')}
          disabled={isLoading || !request}
          className="p-2 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-200 border border-slate-200 text-slate-700 font-medium text-left flex items-center gap-2 transition-all shadow-2xs disabled:opacity-50"
        >
          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">Summarize Request</span>
        </button>

        <button
          onClick={() => handleActionChip('suggest_parts')}
          disabled={isLoading || !request}
          className="p-2 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-200 border border-slate-200 text-slate-700 font-medium text-left flex items-center gap-2 transition-all shadow-2xs disabled:opacity-50"
        >
          <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">Suggest Parts (History)</span>
        </button>

        <button
          onClick={() => handleActionChip('explain_assignment')}
          disabled={isLoading || !request}
          className="p-2 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-200 border border-slate-200 text-slate-700 font-medium text-left flex items-center gap-2 transition-all shadow-2xs disabled:opacity-50"
        >
          <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">Why This Technician?</span>
        </button>

        <button
          onClick={() => handleActionChip('draft_report')}
          disabled={isLoading || !request}
          className="p-2 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-200 border border-slate-200 text-slate-700 font-medium text-left flex items-center gap-2 transition-all shadow-2xs disabled:opacity-50"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">Draft Completion Report</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[90%] p-3.5 rounded-2xl ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-xs'
                  : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-xs shadow-2xs'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed text-xs">
                {msg.text}
              </div>

              {/* Source attribution & Copy */}
              {msg.sender === 'copilot' && (
                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Engine: {msg.source || 'gemini-3.8-flash'}</span>
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="flex items-center gap-1 hover:text-slate-800"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Human in the loop action button */}
            {msg.suggestedAction && (
              <div className="mt-2 pl-2">
                <button
                  onClick={() => handleApplyAction(msg.id, msg.suggestedAction!.type)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
                    appliedActionId === msg.id
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white hover:bg-slate-50 text-blue-700 border-blue-300 shadow-2xs'
                  }`}
                >
                  {appliedActionId === msg.id ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Approved &amp; Queued to Request</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>{msg.suggestedAction.label}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-2xl w-fit text-slate-500 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Consulting equipment records and Gemini reasoning engine...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendCustomQuery}
        className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question (e.g. Why did vibration spike on M-104?)..."
          className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition-colors shadow-2xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
