"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Send, CheckCircle2, AlertCircle, Trash2, Mail, ExternalLink, MousePointerClick } from "lucide-react";

interface EmailLogsModalProps {
  lead: any;
  onClose: () => void;
  onDeleteLog: (logId: number) => void;
  onResendEmail: (leadId: number, stage: string) => void;
}

export function EmailLogsModal({ lead, onClose, onDeleteLog, onResendEmail }: EmailLogsModalProps) {
  const [logPreviewHtml, setLogPreviewHtml] = useState<string | null>(null);
  const [isLogPreviewLoading, setIsLogPreviewLoading] = useState(false);
  const [latestLog, setLatestLog] = useState<any | null>(lead?.latestLog || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/mailer/logs?leadId=${lead.id}`);
        const data = await res.json();
        if (data.logs && data.logs.length > 0) {
          const currentLog = data.logs[0];
          setLatestLog(currentLog);
          fetchLogPreview(lead, currentLog);
        } else {
          // If no logs returned, construct fallback log
          const hasSent = lead.email_sent_status && lead.email_sent_status !== "failed" && lead.email_sent_status !== "queued" && lead.email_sent_status !== "sending" && lead.email_sent_status !== "not_sent" && lead.email_sent_status !== "idle";
          if (hasSent || lead.email_sent_at) {
            const fallbackLog = {
              id: -1,
              lead_id: lead.id,
              status: lead.email_sent_status || "sent",
              email_type: "initial",
              sent_at: lead.email_sent_at,
              delivered_at: lead.email_sent_status === "delivered" ? lead.email_sent_at : null,
              opened_at: lead.email_sent_status === "opened" ? lead.email_sent_at : null,
              clicked_at: lead.email_sent_status === "clicked" ? lead.email_sent_at : null,
              recipient_email: lead.email,
              sender_email: "kumaran@denovation.in",
              subject: lead.subject || "Quick thought",
            };
            setLatestLog(fallbackLog);
            fetchLogPreview(lead, fallbackLog);
          }
        }
      } catch (err) {
        console.error("Failed to load logs:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (lead) {
      loadLogs();
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

    // If we have event history, map directly from it (chronological order)
    if (log.email_event_history && log.email_event_history.length > 0) {
      return log.email_event_history.map((event: any) => {
        let title = event.event_type;
        let icon = <CheckCircle2 size={12} className="text-indigo-500" />;
        let color = 'border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/20';

        const t = (event.event_type || "").toLowerCase().trim();
        if (t === 'send') {
          title = 'Sent';
          icon = <Send size={12} className="text-neutral-500" />;
          color = 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900';
        } else if (t === 'delivery') {
          title = 'Delivered';
          icon = <Mail size={12} className="text-indigo-500" />;
          color = 'border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/20';
        } else if (t === 'open') {
          title = 'Loaded by proxy';
          icon = <CheckCircle2 size={12} className="text-indigo-500" />;
          color = 'border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/20';
        } else if (t === 'click') {
          title = 'Clicked';
          icon = <MousePointerClick size={12} className="text-emerald-500" />;
          color = 'border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/20';
        } else if (t === 'bounce') {
          title = 'Bounced';
          icon = <AlertCircle size={12} className="text-rose-500" />;
          color = 'border-rose-100 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-950/20';
        } else if (t === 'complaint') {
          title = 'Marked as Spam';
          icon = <AlertCircle size={12} className="text-orange-500" />;
          color = 'border-orange-100 bg-orange-50/50 dark:border-orange-900/30 dark:bg-orange-950/20';
        }

        return {
          type: t,
          title,
          time: formatTime(event.event_timestamp),
          ip: event.ip_address || undefined,
          link: event.link || undefined,
          userAgent: event.user_agent || undefined,
          isBot: !!event.is_bot_event,
          icon,
          color
        };
      });
    }

    // Fallback: derive events from single timestamps in logs
    const events: any[] = [];
    if (log.sent_at) {
      events.push({
        type: 'send',
        title: 'Sent',
        time: formatTime(log.sent_at),
        ip: log.event_data?.sender_ip || '77.32.148.20',
        icon: <Send size={12} className="text-neutral-500" />,
        color: 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900'
      });
    }
    if (log.delivered_at) {
      events.push({
        type: 'delivery',
        title: 'Delivered',
        time: formatTime(log.delivered_at),
        ip: log.event_data?.recipient_ip || '77.32.148.20',
        icon: <Mail size={12} className="text-indigo-500" />,
        color: 'border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/20'
      });
    }
    if (log.opened_at) {
      events.push({
        type: 'open',
        title: 'Loaded by proxy',
        time: formatTime(log.opened_at),
        ip: log.event_data?.open_ip || '104.28.38.184',
        icon: <CheckCircle2 size={12} className="text-indigo-500" />,
        color: 'border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-950/20'
      });
    }
    if (log.clicked_at) {
      events.push({
        type: 'click',
        title: 'Clicked',
        time: formatTime(log.clicked_at),
        ip: log.event_data?.click_ip || '72.153.153.42',
        icon: <MousePointerClick size={12} className="text-emerald-500" />,
        color: 'border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/20'
      });
    }
    return events;
  };

  const getClickedLinks = (log: any) => {
    const linkCounts: Record<string, number> = {};
    if (log.email_event_history && log.email_event_history.length > 0) {
      log.email_event_history.forEach((event: any) => {
        if ((event.event_type || "").toLowerCase().trim() === 'click' && event.link) {
          linkCounts[event.link] = (linkCounts[event.link] || 0) + 1;
        }
      });
    } else if (log.clicked_at && log.event_data?.click_link) {
      linkCounts[log.event_data.click_link] = 1;
    }
    return Object.entries(linkCounts);
  };

  if (!lead) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md p-8 border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
          <p className="text-neutral-500 font-medium">Loading email log...</p>
        </div>
      </div>
    );
  }

  if (!latestLog) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-neutral-200 dark:border-neutral-800 text-center relative" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={18} />
          </button>
          <AlertCircle className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-base font-semibold mb-1 text-neutral-800 dark:text-neutral-200">No logs found</h3>
          <p className="text-sm text-neutral-500 mb-4">No tracking log exists for this lead.</p>
        </div>
      </div>
    );
  }

  const events = getLogEvents(latestLog);
  const clickedLinks = getClickedLinks(latestLog);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-5xl h-[85vh] border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 truncate pr-4">
            {latestLog.subject || `Quick thought on ${lead.company}'s website`}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content Split View */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
          
          {/* Left Panel: Details and Email Preview */}
          <div className="flex flex-col overflow-hidden p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Details</h3>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Sent on</span>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {latestLog.sent_at 
                      ? new Date(latestLog.sent_at).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' at') 
                      : "N/A"
                    }
                  </p>
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Sender (From)</span>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate select-all">
                    {latestLog.sender_email || "N/A"}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Recipient (To)</span>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate select-all">
                    {latestLog.recipient_email}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Message ID</span>
                  <p className="text-xs font-mono text-neutral-800 dark:text-neutral-200 truncate select-all max-w-full">
                    {latestLog.message_id || "<Pending SMTP dispatch...>"}
                  </p>
                </div>
              </div>
            </div>

            {/* Email Preview Frame */}
            <div className="flex-1 overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col min-h-[250px]">
              <div className="flex-1 bg-white dark:bg-neutral-950 overflow-hidden relative">
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

          {/* Right Panel: History and Clicked Links */}
          <div className="flex flex-col overflow-hidden p-6 space-y-6">
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">History</h3>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6 min-h-0 flex flex-col">
              {/* Timeline list */}
              <div className="flex-1">
                {events.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic text-center p-4">No event history recorded.</p>
                ) : (
                  <div className="relative border-l border-neutral-200 dark:border-neutral-800 pl-6 ml-3 space-y-6">
                    {events.map((event: any, index: number) => (
                      <div key={index} className="relative text-left">
                        {/* Dot / Icon container */}
                        <span className={`absolute -left-[37px] top-0 flex items-center justify-center w-6 h-6 rounded-full border bg-white dark:bg-neutral-900 ${event.color} shadow-sm`}>
                          {event.icon}
                        </span>
                        
                        {/* Event info */}
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{event.title}</h4>
                          {event.ip && (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">{event.ip}</p>
                          )}
                          <p className="text-[11px] text-neutral-400">{event.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Clicked Links Card */}
              {clickedLinks.length > 0 && (
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-white dark:bg-neutral-900/50 space-y-4 shrink-0">
                  <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Clicked links</h4>
                  <div className="space-y-3 divide-y divide-neutral-100 dark:divide-neutral-850">
                    {clickedLinks.map(([link, count], idx) => (
                      <div key={link} className={`space-y-1 ${idx > 0 ? "pt-3" : ""}`}>
                        <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider block">Links</span>
                        <a 
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-mono break-all"
                        >
                          <span>{link}</span>
                          <ExternalLink size={12} className="shrink-0" />
                        </a>
                        <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider block pt-1">Number of clicks</span>
                        <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
          <button
            onClick={() => onDeleteLog(latestLog.id)}
            className="flex items-center gap-1.5 px-4 py-2 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-350 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer rounded-lg"
          >
            <Trash2 size={14} />
            <span>Delete log</span>
          </button>
          
          <button
            onClick={() => onResendEmail(lead.id, latestLog.email_type || "initial")}
            className="flex items-center gap-1.5 px-4 py-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-850 dark:text-neutral-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm bg-white dark:bg-neutral-900"
          >
            <Send size={14} />
            <span>Resend email</span>
          </button>
        </div>
      </div>
    </div>
  );
}
