"use client";

import React from "react";
import { Loader2, Send, CheckCircle2, Eye, AlertCircle } from "lucide-react";
import { getEffectiveOutreachStatus } from "@/lib/outreachStatus";

interface OutreachStatusBadgeProps {
  lead: any;
  onClick?: () => void;
}

export function OutreachStatusBadge({ lead, onClick }: OutreachStatusBadgeProps) {
  const status = getEffectiveOutreachStatus(lead);

  const getOutreachStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'queued':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
      case 'sent':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
      case 'opened':
        return 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 border-teal-200 dark:border-teal-500/20';
      case 'clicked':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20';
      case 'bounced':
      case 'failed':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20';
      case 'complained':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200 dark:border-orange-500/20';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20';
      default:
        return 'bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';
    }
  };

  const getOutreachStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'queued':
        return <Loader2 size={10} className="animate-spin text-amber-500 shrink-0" />;
      case 'sent':
        return <Send size={10} className="text-blue-500 shrink-0" />;
      case 'delivered':
        return <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />;
      case 'opened':
        return <Eye size={10} className="text-teal-500 shrink-0" />;
      case 'clicked':
        return <Eye size={10} className="text-purple-500 shrink-0" />;
      case 'bounced':
      case 'failed':
      case 'rejected':
        return <AlertCircle size={10} className="text-rose-500 shrink-0" />;
      case 'complained':
        return <AlertCircle size={10} className="text-orange-500 shrink-0" />;
      default:
        return null;
    }
  };

  if (!status || status === "idle" || status === "not_sent") {
    return null;
  }

  const style = getOutreachStatusStyle(status);
  const icon = getOutreachStatusIcon(status);

  const badgeContent = (
    <>
      {icon}
      <span className="capitalize select-none">{status}</span>
    </>
  );

  if (lead.latestLog && onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClick();
        }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full border hover:opacity-85 transition-all w-fit select-none outline-none ${style}`}
        style={{ cursor: "pointer" }}
      >
        {badgeContent}
      </button>
    );
  }

  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full border w-fit select-none ${style}`}
      style={{ cursor: "default" }}
    >
      {badgeContent}
    </span>
  );
}
