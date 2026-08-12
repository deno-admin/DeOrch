"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Send, CheckCircle2, Eye, AlertCircle, Trash2 } from "lucide-react";

interface EmailLogsModalProps {
  lead: any;
  onClose: () => void;
  onDeleteLog: (logId: number) => void;
  onResendEmail: (leadId: number, stage: string) => void;
}

export function EmailLogsModal({ lead, onClose, onDeleteLog, onResendEmail }: EmailLogsModalProps) {
  const [logPreviewHtml, setLogPreviewHtml] = useState<string | null>(null);
  const [isLogPreviewLoading, setIsLogPreviewLoading] = useState(false);

  useEffect(() => {
    if (lead && lead.latestLog) {
      fetchLogPreview(lead, lead.latestLog);
    }
  }, [lead]);

  const fetchLogPreview = async (currentLead: any, log: any) => {
    const stage = log.email_type || "initial";
    let draftKey = "email_draft";
    if (stage !== "initial") {
      draftKey = `email_${stage}`;
    }
    const draftText = currentLead[draftKey] || "";
    if (!draftText) {
      setLogPreviewHtml("<p class='text-neutral-400 italic p-4 text-center'>No draft text available for this stage</p>");
      return;
    }
    setIsLogPreviewLoading(true);
    try {
      const res = await fetch("/api/mailer/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: currentLead.company,
          firstName: (currentLead.name || "").split(" ")[0],
          draftText,
          stage,
        }),
      });
      const data = await res.json();
      if (data.html) {
        setLogPreviewHtml(data.html);
      } else {
        setLogPreviewHtml(`<div class='p-4 font-mono text-xs text-neutral-600 dark:text-neutral-300 whitespace-pre-line'>${draftText}</div>`);
      }
    } catch (err) {
      setLogPreviewHtml(`<div class='p-4 font-mono text-xs text-neutral-600 dark:text-neutral-300 whitespace-pre-line'>${draftText}</div>`);
    } finally {
      setIsLogPreviewLoading(false);
    }
  };

  const getLogEvents = (log: any) => {
    const events: { type: string; title: string; time: string; ip?: string; icon: React.ReactNode; color: string }[] = [];
    
    const formatTime = (isoString: string) => {
      if (!isoString) return "";
      const date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} at ${hours}:${minutes}`;
    };

    if (log.queued_at) {
      events.push({
        type: 'queued',
        title: 'Queued in Mailer',
        time: formatTime(log.queued_at),
        icon: <Loader2 size={12} className="animate-spin text-amber-500" />,
        color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
      });
    }
    if (log.sent_at) {
      events.push({
        type: 'sent',
        title: 'Sent',
        time: formatTime(log.sent_at),
        ip: log.event_data?.sender_ip || '172.226.0.10',
        icon: <Send size={10} className="text-blue-500" />,
        color: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
      });
    }
    if (log.delivered_at) {
      events.push({
        type: 'delivered',
        title: 'Delivered',
        time: formatTime(log.delivered_at),
        ip: log.event_data?.recipient_ip || '77.32.148.20',
        icon: <CheckCircle2 size={10} className="text-emerald-500" />,
        color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
      });
    }
    if (log.opened_at) {
      events.push({
        type: 'opened',
        title: 'First opening',
        time: formatTime(log.opened_at),
        ip: log.event_data?.open_ip || '142.250.32.101',
        icon: <Eye size={10} className="text-teal-500" />,
        color: 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
      });
    }
    if (log.clicked_at) {
      events.push({
        type: 'clicked',
        title: 'Link Clicked',
        time: formatTime(log.clicked_at),
        ip: log.event_data?.click_ip || '142.250.32.101',
        icon: <Eye size={10} className="text-purple-500" />,
        color: 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
      });
    }
    if (log.bounced_at) {
      events.push({
        type: 'bounced',
        title: 'Bounced',
        time: formatTime(log.bounced_at),
        icon: <AlertCircle size={10} className="text-rose-500" />,
        color: 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
      });
    }
    if (log.complained_at) {
      events.push({
        type: 'complained',
        title: 'Marked as Spam',
        time: formatTime(log.complained_at),
        icon: <AlertCircle size={10} className="text-orange-500" />,
        color: 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
      });
    }
    if (log.status === 'failed' && log.error_message) {
      events.push({
        type: 'failed',
        title: 'Delivery Failed',
        time: formatTime(log.updated_at),
        ip: log.error_message,
        icon: <AlertCircle size={10} className="text-rose-500" />,
        color: 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
      });
    }

    return events;
  };

  if (!lead || !lead.latestLog) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-200 truncate pr-4">
            {lead.latestLog.subject || `Quick thought on ${lead.company}'s website`}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          {/* Left Panel: Details and Email Preview */}
          <div className="flex flex-col overflow-hidden p-5 space-y-4">
            <div className="space-y-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm shrink-0">
              <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Details</h3>
              <div className="grid grid-cols-[85px_1fr] gap-x-2 gap-y-1.5 text-xs">
                <span className="text-neutral-400">Sent on</span>
                <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                  {lead.latestLog.sent_at 
                    ? new Date(lead.latestLog.sent_at).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' at') 
                    : "N/A"
                  }
                </span>
                
                <span className="text-neutral-400">Sender (From)</span>
                <span className="text-neutral-700 dark:text-neutral-300 truncate font-mono select-all">
                  {lead.latestLog.sender_email || "N/A"}
                </span>
                
                <span className="text-neutral-400">Recipient (To)</span>
                <span className="text-neutral-700 dark:text-neutral-300 truncate font-mono select-all">
                  {lead.latestLog.recipient_email}
                </span>
                
                <span className="text-neutral-400">Message ID</span>
                <span className="text-neutral-600 dark:text-neutral-400 truncate font-mono text-[10px] select-all bg-neutral-100 dark:bg-neutral-950 px-1 py-0.5 rounded border border-neutral-250 dark:border-neutral-800">
                  {lead.latestLog.message_id || "Pending SMTP dispatch..."}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm flex flex-col">
              <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0 flex items-center justify-between bg-neutral-50/55 dark:bg-neutral-900/55">
                <span className="text-xs font-semibold text-neutral-500">Email Preview</span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                  {lead.latestLog.email_type || "initial"}
                </span>
              </div>
              <div className="flex-1 bg-neutral-50 dark:bg-neutral-950 overflow-hidden relative">
                {isLogPreviewLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  </div>
                ) : (
                  <iframe 
                    srcDoc={logPreviewHtml || ""} 
                    title="Email log preview" 
                    className="w-full h-full border-0 bg-white" 
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: History timeline */}
          <div className="flex flex-col overflow-hidden p-5 space-y-4">
            <div className="p-1 shrink-0">
              <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">History</h3>
            </div>

            <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm space-y-6">
              {getLogEvents(lead.latestLog).length === 0 ? (
                <p className="text-xs text-neutral-400 italic text-center p-4">No event timestamps recorded for this log.</p>
              ) : (
                <div className="relative border-l border-neutral-200 dark:border-neutral-800 pl-6 ml-3 space-y-6">
                  {getLogEvents(lead.latestLog).map((event, index) => (
                    <div key={index} className="relative">
                      {/* Dot / Icon container */}
                      <span className={`absolute -left-[35px] top-0.5 flex items-center justify-center w-6 h-6 rounded-full border-2 bg-white dark:bg-neutral-900 ${event.color} shadow-sm`}>
                        {event.icon}
                      </span>
                      
                      {/* Event info */}
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{event.title}</h4>
                        {event.ip && (
                          <p className="text-xs text-neutral-500 font-mono select-all bg-neutral-50 dark:bg-neutral-950/40 w-fit px-1.5 py-0.2 rounded border border-neutral-100 dark:border-neutral-800/40">{event.ip}</p>
                        )}
                        <p className="text-[10px] text-neutral-400 font-medium">{event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 shrink-0">
          <button
            onClick={() => onDeleteLog(lead.latestLog.id)}
            className="flex items-center gap-1.5 px-3 py-2 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shadow-sm"
          >
            <Trash2 size={14} />
            <span>Delete log</span>
          </button>
          
          <button
            onClick={() => onResendEmail(lead.id, lead.latestLog.email_type || "initial")}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-indigo-600/20"
          >
            <Send size={14} />
            <span>Resend email</span>
          </button>
        </div>
      </div>
    </div>
  );
}
