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
      const events = log.email_event_history.map((event: any) => {
        let title = event.event_type;
        let icon = <CheckCircle2 size={10} className="text-neutral-500" />;
        let color = 'border-neutral-500 bg-neutral-50 dark:bg-neutral-950/30';

        const t = (event.event_type || "").toLowerCase().trim();
        if (t === 'send') {
          title = 'Sent';
          icon = <Send size={10} className="text-blue-500" />;
          color = 'border-blue-500 bg-blue-50 dark:bg-blue-950/30';
        } else if (t === 'delivery') {
          title = 'Delivered';
          icon = <CheckCircle2 size={10} className="text-emerald-500" />;
          color = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30';
        } else if (t === 'open') {
          title = 'Opened';
          icon = <Eye size={10} className="text-teal-500" />;
          color = 'border-teal-500 bg-teal-50 dark:bg-teal-950/30';
        } else if (t === 'click') {
          title = 'Link Clicked';
          icon = <Eye size={10} className="text-purple-500" />;
          color = 'border-purple-500 bg-purple-50 dark:bg-purple-950/30';
        } else if (t === 'bounce') {
          title = 'Bounced';
          icon = <AlertCircle size={10} className="text-rose-500" />;
          color = 'border-rose-500 bg-rose-50 dark:bg-rose-950/30';
        } else if (t === 'complaint') {
          title = 'Marked as Spam';
          icon = <AlertCircle size={10} className="text-orange-500" />;
          color = 'border-orange-500 bg-orange-50 dark:bg-orange-950/30';
        } else if (t === 'reject') {
          title = 'Rejected';
          icon = <AlertCircle size={10} className="text-rose-500" />;
          color = 'border-rose-500 bg-rose-50 dark:bg-rose-950/30';
        } else if (t === 'rendering failure') {
          title = 'Rendering Failure';
          icon = <AlertCircle size={10} className="text-rose-500" />;
          color = 'border-rose-500 bg-rose-50 dark:bg-rose-950/30';
        } else if (t === 'delivery delay') {
          title = 'Delivery Delay';
          icon = <Loader2 size={12} className="animate-spin text-amber-500" />;
          color = 'border-amber-500 bg-amber-50 dark:bg-amber-950/30';
        } else if (t === 'subscription') {
          title = 'Subscription Changed';
          icon = <CheckCircle2 size={10} className="text-indigo-500" />;
          color = 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30';
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

      // Prepend a queued event if queued_at is recorded
      if (log.queued_at) {
        events.unshift({
          type: 'queued',
          title: 'Queued in Mailer',
          time: formatTime(log.queued_at),
          icon: <Loader2 size={12} className="animate-spin text-amber-500" />,
          color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
        });
      }

      return events;
    }

    // Fallback: derive events from single timestamps in logs
    const events: { type: string; title: string; time: string; ip?: string; icon: React.ReactNode; color: string }[] = [];

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-200 truncate pr-4">
            {latestLog.subject || `Quick thought on ${lead.company}'s website`}
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
                  {latestLog.sent_at 
                    ? new Date(latestLog.sent_at).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' at') 
                    : "N/A"
                  }
                </span>
                
                <span className="text-neutral-400">Sender (From)</span>
                <span className="text-neutral-700 dark:text-neutral-300 truncate font-mono select-all">
                  {latestLog.sender_email || "N/A"}
                </span>
                
                <span className="text-neutral-400">Recipient (To)</span>
                <span className="text-neutral-700 dark:text-neutral-300 truncate font-mono select-all">
                  {latestLog.recipient_email}
                </span>
                
                <span className="text-neutral-400">Message ID</span>
                <span className="text-neutral-600 dark:text-neutral-400 truncate font-mono text-[10px] select-all bg-neutral-100 dark:bg-neutral-950 px-1 py-0.5 rounded border border-neutral-255 dark:border-neutral-800">
                  {latestLog.message_id || "Pending SMTP dispatch..."}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm flex flex-col">
              <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0 flex items-center justify-between bg-neutral-50/55 dark:bg-neutral-900/55">
                <span className="text-xs font-semibold text-neutral-500">Email Preview</span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                  {latestLog.email_type || "initial"}
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

            <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col min-h-0">
              {/* Summary Information Cards (Only shown if we have event history) */}
              {latestLog.email_event_history && latestLog.email_event_history.length > 0 && (() => {
                const linkCounts: Record<string, number> = {};
                latestLog.email_event_history.forEach((event: any) => {
                  if ((event.event_type || "").toLowerCase().trim() === 'click' && event.link) {
                    linkCounts[event.link] = (linkCounts[event.link] || 0) + 1;
                  }
                });
                const linkEntries = Object.entries(linkCounts);

                const formatDateNice = (isoStr: string | null) => {
                  if (!isoStr) return "";
                  return new Date(isoStr).toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                };

                return (
                  <div className="mb-5 p-4 bg-neutral-50 dark:bg-neutral-950/30 rounded-2xl border border-neutral-200/50 dark:border-neutral-800/40 text-xs shrink-0 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-0.5">
                        <span className="text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">Total Opens</span>
                        <p className="text-base font-bold text-teal-600 dark:text-teal-400">{latestLog.open_count || 0} {latestLog.open_count === 1 ? 'time' : 'times'}</p>
                        {latestLog.last_opened_at && (
                          <p className="text-[9px] text-neutral-400 truncate">
                            Last: {formatDateNice(latestLog.last_opened_at)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">Total Clicks</span>
                        <p className="text-base font-bold text-purple-600 dark:text-purple-400">{latestLog.click_count || 0} {latestLog.click_count === 1 ? 'time' : 'times'}</p>
                        {latestLog.last_clicked_at && (
                          <p className="text-[9px] text-neutral-400 truncate">
                            Last: {formatDateNice(latestLog.last_clicked_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    {linkEntries.length > 0 && (
                      <div className="pt-2 border-t border-neutral-200/50 dark:border-neutral-800/50">
                        <span className="text-neutral-400 font-semibold uppercase tracking-wider text-[10px] block mb-1.5">Links Clicked:</span>
                        <ul className="space-y-1 text-[10px] font-mono text-neutral-600 dark:text-neutral-400 max-h-24 overflow-y-auto pr-1">
                          {linkEntries.map(([link, count]) => (
                            <li key={link} className="flex justify-between gap-4 py-0.5 border-b border-dashed border-neutral-100 dark:border-neutral-800/20 last:border-0">
                              <a href={link} target="_blank" rel="noopener noreferrer" className="truncate text-indigo-600 dark:text-indigo-400 hover:underline select-all cursor-pointer" title={link}>{link}</a>
                              <span className="shrink-0 font-bold text-purple-600 dark:text-purple-400">{count} {count === 1 ? 'click' : 'clicks'}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Timeline list */}
              <div className="flex-1 overflow-y-auto pr-1">
                {getLogEvents(latestLog).length === 0 ? (
                  <p className="text-xs text-neutral-400 italic text-center p-4">No event timestamps recorded for this log.</p>
                ) : (
                  <div className="relative border-l border-neutral-200 dark:border-neutral-800 pl-6 ml-3 space-y-6">
                    {getLogEvents(latestLog).map((event: any, index: number) => (
                      <div key={index} className="relative text-left">
                        {/* Dot / Icon container */}
                        <span className={`absolute -left-[35px] top-0.5 flex items-center justify-center w-6 h-6 rounded-full border-2 bg-white dark:bg-neutral-900 ${event.color} shadow-sm`}>
                          {event.icon}
                        </span>
                        
                        {/* Event info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{event.title}</h4>
                            {event.isBot && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/20 shadow-sm">Bot</span>
                            )}
                          </div>
                          {event.link && (
                            <div className="text-[10px] text-neutral-600 dark:text-neutral-400 font-mono select-all bg-neutral-50 dark:bg-neutral-950/40 w-fit px-1.5 py-0.5 rounded border border-neutral-100 dark:border-neutral-800/40 break-all max-w-full">
                              Link: <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">{event.link}</a>
                            </div>
                          )}
                          {event.ip && (
                            <p className="text-[10px] text-neutral-500 font-mono select-all bg-neutral-50 dark:bg-neutral-950/40 w-fit px-1.5 py-0.2 rounded border border-neutral-100 dark:border-neutral-800/40">IP: {event.ip}</p>
                          )}
                          {event.userAgent && (
                            <p className="text-[9px] text-neutral-400 select-all max-w-xs md:max-w-sm truncate" title={event.userAgent}>UA: {event.userAgent}</p>
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
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 shrink-0">
          <button
            onClick={() => onDeleteLog(latestLog.id)}
            className="flex items-center gap-1.5 px-3 py-2 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shadow-sm"
          >
            <Trash2 size={14} />
            <span>Delete log</span>
          </button>
          
          <button
            onClick={() => onResendEmail(lead.id, latestLog.email_type || "initial")}
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
