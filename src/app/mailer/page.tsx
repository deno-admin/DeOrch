"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Settings,
  Search,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Edit2,
  MailX,
  ChevronDown,
  Tag,
  Eye
} from "lucide-react";
import Link from "next/link";
import { supabaseLeads } from "@/lib/supabaseLeads";

interface MailerLead {
  id: number;
  name: string;
  company: string;
  email: string | null;
  subject: string | null;
  email_draft: string | null;
  research_points: string | null;
  email_sent_status: string | null;
  email_sent_at: string | null;
  email_follow_up_1: string | null;
  email_follow_up_2: string | null;
  email_follow_up_3: string | null;
  email_follow_up_4: string | null;
  email_follow_up_5: string | null;
  email_follow_up_1_sent_at: string | null;
  email_follow_up_2_sent_at: string | null;
  email_follow_up_3_sent_at: string | null;
  email_follow_up_4_sent_at: string | null;
  email_follow_up_5_sent_at: string | null;
  created_at: string | null;
  status: string | null;
}

const CRM_STATUSES = ["New", "Qualified", "Contacted", "Follow Up", "Replied", "Meeting Scheduled", "Not Interested", "Unsubscribed"];

interface StageConfig {
  id: string;
  label: string;
  draftKey: keyof MailerLead;
  sentAtKey: keyof MailerLead;
}

const STAGES: StageConfig[] = [
  { id: "initial", label: "Initial Email", draftKey: "email_draft", sentAtKey: "email_sent_at" },
  { id: "follow_up_1", label: "Follow Up 1", draftKey: "email_follow_up_1", sentAtKey: "email_follow_up_1_sent_at" },
  { id: "follow_up_2", label: "Follow Up 2", draftKey: "email_follow_up_2", sentAtKey: "email_follow_up_2_sent_at" },
  { id: "follow_up_3", label: "Follow Up 3", draftKey: "email_follow_up_3", sentAtKey: "email_follow_up_3_sent_at" },
  { id: "follow_up_4", label: "Follow Up 4", draftKey: "email_follow_up_4", sentAtKey: "email_follow_up_4_sent_at" },
  { id: "follow_up_5", label: "Follow Up 5", draftKey: "email_follow_up_5", sentAtKey: "email_follow_up_5_sent_at" },
];

type EmailFilter = "all" | "with" | "without";
type ResearchFilter = "all" | "with" | "without";
type StatusFilter = "all" | "not_sent" | "sent" | "failed" | "no_draft";

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
        active
          ? "bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
          : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'New': 'bg-blue-500',
    'Qualified': 'bg-emerald-500',
    'Contacted': 'bg-purple-500',
    'Follow Up': 'bg-amber-500',
    'Replied': 'bg-teal-500',
    'Meeting Scheduled': 'bg-indigo-500',
    'Not Interested': 'bg-rose-500',
    'Unsubscribed': 'bg-neutral-400',
  };
  return <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors[status] || 'bg-neutral-500'}`} />;
}

export default function MailerPage() {
  const [leads, setLeads] = useState<MailerLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [emailFilter, setEmailFilter] = useState<EmailFilter>("with");
  const [researchFilter, setResearchFilter] = useState<ResearchFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sendingIds, setSendingIds] = useState<number[]>([]);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);

  const [editingLead, setEditingLead] = useState<MailerLead | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [activeStage, setActiveStage] = useState<string>("initial");
  const currentStageConfig = STAGES.find(s => s.id === activeStage) || STAGES[0];

  const [dateFilter, setDateFilter] = useState<string>("");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("All");
  const [openStatusId, setOpenStatusId] = useState<number | null>(null);
  const [statusPos, setStatusPos] = useState({ top: 0, left: 0, width: 0 });

  const PAGE_SIZE = 200;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setSelectedIds([]);
    setDateFilter("");
  }, [activeStage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeStage, emailFilter, researchFilter, statusFilter, searchQuery, dateFilter, leadStatusFilter]);

  useEffect(() => {
    const handleClose = () => {
      setOpenStatusId(null);
    };
    window.addEventListener("scroll", handleClose, true);
    return () => window.removeEventListener("scroll", handleClose, true);
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);

    // Supabase/PostgREST caps each request at its configured max-rows (1000 by
    // default), so a single unbounded query silently truncates the result once
    // the table grows past that. Page through in chunks until a short page
    // comes back so every row is loaded regardless of table size.
    const CHUNK_SIZE = 1000;
    const allData: MailerLead[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabaseLeads
        .from("clay_outreach_leads")
        .select(`
          id, name, company, email, subject, email_draft, research_points, email_sent_status, email_sent_at,
          email_follow_up_1, email_follow_up_2, email_follow_up_3, email_follow_up_4, email_follow_up_5,
          email_follow_up_1_sent_at, email_follow_up_2_sent_at, email_follow_up_3_sent_at, email_follow_up_4_sent_at, email_follow_up_5_sent_at,
          created_at,
          status
        `)
        .order("id", { ascending: false })
        .range(from, from + CHUNK_SIZE - 1);

      if (error) {
        console.error("Error fetching mailer leads:", error);
        break;
      }
      if (!data || data.length === 0) break;
      allData.push(...(data as MailerLead[]));
      if (data.length < CHUNK_SIZE) break;
      from += CHUNK_SIZE;
    }

    const normalizedData = allData.map((l: MailerLead) => ({
      ...l,
      status: l.status ? (CRM_STATUSES.find(s => s.toLowerCase() === l.status!.toLowerCase()) || l.status) : 'New'
    }));
    setLeads(normalizedData);
    setIsLoading(false);
  };

  const checkSmtpConfigured = async () => {
    try {
      const res = await fetch("/api/settings/smtp");
      const data = await res.json();
      setSmtpConfigured(!!data.hasPassword);
    } catch {
      setSmtpConfigured(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    checkSmtpConfigured();
  }, []);

  const withEmailCount = leads.filter(l => !!l.email).length;
  const withoutEmailCount = leads.length - withEmailCount;
  
  const withResearchCount = leads.filter(l => !!l.research_points && l.research_points.trim().length > 0).length;
  const withoutResearchCount = leads.length - withResearchCount;

  const sentCount = leads.filter(l => {
    if (activeStage === "initial") return l.email_sent_status === "success";
    return !!l[currentStageConfig.sentAtKey];
  }).length;

  const failedCount = leads.filter(l => l.email_sent_status === "failed").length;

  const notSentCount = leads.filter(l => {
    const hasDraft = !!l[currentStageConfig.draftKey];
    if (activeStage === "initial") return l.email_sent_status !== "success" && l.email_sent_status !== "failed" && hasDraft;
    const leadStatus = (l.status || "").toLowerCase().trim();
    const isExcludedStatus = leadStatus === "unsubscribed" || leadStatus === "not interested";
    return !l[currentStageConfig.sentAtKey] && hasDraft && !isExcludedStatus;
  }).length;

  const noDraftCount = leads.filter(l => !l[currentStageConfig.draftKey]).length;

  const matchesEmailFilter = (lead: MailerLead) => {
    if (emailFilter === "with") return !!lead.email;
    if (emailFilter === "without") return !lead.email;
    return true;
  };

  const matchesResearchFilter = (lead: MailerLead) => {
    const hasResearch = !!lead.research_points && lead.research_points.trim().length > 0;
    if (researchFilter === "with") return hasResearch;
    if (researchFilter === "without") return !hasResearch;
    return true;
  };

  const matchesStatusFilter = (lead: MailerLead) => {
    const hasDraft = !!lead[currentStageConfig.draftKey];
    const isSent = !!lead[currentStageConfig.sentAtKey];

    if (activeStage === "initial") {
      if (statusFilter === "sent") return lead.email_sent_status === "success";
      if (statusFilter === "failed") return lead.email_sent_status === "failed";
      if (statusFilter === "not_sent") return lead.email_sent_status !== "success" && lead.email_sent_status !== "failed" && hasDraft;
      if (statusFilter === "no_draft") return !hasDraft;
    } else {
      const leadStatus = (lead.status || "").toLowerCase().trim();
      const isExcludedStatus = leadStatus === "unsubscribed" || leadStatus === "not interested";

      if (statusFilter === "sent") return isSent;
      if (statusFilter === "not_sent") return !isSent && hasDraft && !isExcludedStatus;
      if (statusFilter === "no_draft") return !hasDraft;
      if (statusFilter === "failed") return false;
    }
    return true;
  };

  const getDateValue = (lead: MailerLead) => {
    if (activeStage === "initial") {
      return lead.email_sent_at;
    }
    const prevStage = STAGES[STAGES.findIndex(s => s.id === activeStage) - 1];
    return lead[prevStage.sentAtKey] as string | null;
  };

  const formatDateString = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const availableDates = React.useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(lead => {
      const val = getDateValue(lead);
      if (val) {
        const dateStr = val.substring(0, 10); // YYYY-MM-DD
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [leads, activeStage]);

  const filteredLeads = leads.filter(lead => {
    const matchesEmail = matchesEmailFilter(lead);
    const matchesResearch = matchesResearchFilter(lead);
    const matchesStatus = matchesStatusFilter(lead);
    const matchesSearch = (lead.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (lead.company || "").toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (dateFilter) {
      const dateValue = getDateValue(lead);
      if (dateValue) {
        matchesDate = dateValue.substring(0, 10) === dateFilter;
      } else {
        matchesDate = false;
      }
    }

    const currentLeadStatus = lead.status ? (lead.status.toLowerCase() === 'new' ? 'New' : lead.status) : 'New';
    const matchesLeadStatus = leadStatusFilter === "All" || currentLeadStatus === leadStatusFilter;

    return matchesEmail && matchesResearch && matchesStatus && matchesSearch && matchesDate && matchesLeadStatus;
  });

  const selectableLeads = filteredLeads;

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedLeads = filteredLeads.slice(pageStart, pageStart + PAGE_SIZE);

  const eligibleSelectedIds = selectedIds.filter(id => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return false;
    const hasEmail = !!lead.email;
    const hasDraft = !!lead[currentStageConfig.draftKey];
    const isSent = activeStage === "initial" 
      ? lead.email_sent_status === "success" 
      : !!lead[currentStageConfig.sentAtKey];

    if (activeStage !== "initial") {
      const leadStatus = (lead.status || "").toLowerCase().trim();
      if (leadStatus === "unsubscribed" || leadStatus === "not interested") {
        return false;
      }
    }

    return hasEmail && hasDraft && !isSent;
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const allSelectableIds = selectableLeads.map(l => l.id);
    const allSelected = allSelectableIds.length > 0 && allSelectableIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !allSelectableIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const uniqueNew = allSelectableIds.filter(id => !prev.includes(id));
        return [...prev, ...uniqueNew];
      });
    }
  };

  const previewEmail = async (companyName: string, firstName: string, draftText: string, leadId?: number) => {
    if (!draftText) return;
    setIsPreviewLoading(true);
    try {
      const res = await fetch("/api/mailer/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, firstName, draftText, leadId }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setPreviewHtml(data.html);
    } catch (err) {
      console.error("Preview error:", err);
      alert("Failed to generate preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const sendToLeads = async (leadIds: number[]) => {
    if (leadIds.length === 0) return;
    setSendingIds(prev => [...prev, ...leadIds]);
    try {
      const res = await fetch("/api/mailer/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds, stage: activeStage }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        await fetchLeads();
        setSelectedIds(prev => prev.filter(id => !leadIds.includes(id)));
      }
    } catch (err) {
      console.error("Send error:", err);
      alert("Failed to send. Check the console for details.");
    } finally {
      setSendingIds(prev => prev.filter(id => !leadIds.includes(id)));
    }
  };

  const updateBulkStatus = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    setIsLoading(true);
    const { error } = await supabaseLeads
      .from("clay_outreach_leads")
      .update({ status: newStatus })
      .in("id", selectedIds);

    if (error) {
      console.error("Error updating bulk status:", error);
      alert("Failed to update status. See console.");
    } else {
      setLeads(prev => prev.map(l => selectedIds.includes(l.id) ? { ...l, status: newStatus } : l));
      setSelectedIds([]);
    }
  };

  const handleSingleStatusChange = async (leadId: number, newStatus: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    const { error } = await supabaseLeads
      .from("clay_outreach_leads")
      .update({ status: newStatus })
      .eq("id", leadId);

    if (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. See console.");
      fetchLeads();
    }
  };

  const toggleStatusDropdown = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setStatusPos({ 
      top: rect.bottom + 4, 
      left: rect.left, 
      width: Math.max(160, rect.width) 
    });
    setOpenStatusId(openStatusId === id ? null : id);
  };

  const openEditModal = (lead: MailerLead) => {
    setEditingLead(lead);
    setEditedSubject(lead.subject || "");
    setEditedBody((lead[currentStageConfig.draftKey] as string) || "");
  };

  const saveEdit = async () => {
    if (!editingLead) return;
    setIsSavingEdit(true);

    const updatePayload: Record<string, string> = {
      subject: editedSubject,
      [currentStageConfig.draftKey]: editedBody
    };

    const { error } = await supabaseLeads
      .from("clay_outreach_leads")
      .update(updatePayload)
      .eq("id", editingLead.id);

    if (error) {
      console.error("Error updating draft:", error);
      alert("Failed to save draft. See console.");
    } else {
      setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...l, subject: editedSubject, [currentStageConfig.draftKey]: editedBody } : l));
    }
    setIsSavingEdit(false);
    setEditingLead(null);
  };

  const formatSentDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const getLeadStatusStyle = (status: string | null) => {
    const s = status ? (status.toLowerCase() === 'new' ? 'New' : status) : 'New';
    switch (s) {
      case 'New':
      case 'new':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
      case 'Qualified':
      case 'qualified':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
      case 'Contacted':
      case 'contacted':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20';
      case 'Follow Up':
      case 'follow up':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
      case 'Replied':
      case 'replied':
        return 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 border-teal-200 dark:border-teal-500/20';
      case 'Meeting Scheduled':
      case 'meeting scheduled':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20';
      case 'Not Interested':
      case 'not interested':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20';
      case 'Unsubscribed':
      case 'unsubscribed':
        return 'bg-neutral-50 text-neutral-600 dark:bg-neutral-500/10 dark:text-neutral-400 border-neutral-200 dark:border-neutral-500/20';
      default:
        return 'bg-neutral-50 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';
    }
  };

  const statusBadge = (lead: MailerLead) => {
    const isSent = !!lead[currentStageConfig.sentAtKey];
    const sentAt = lead[currentStageConfig.sentAtKey] as string | null;
    const hasDraft = !!lead[currentStageConfig.draftKey];

    if (activeStage === "initial") {
      if (lead.email_sent_status === "success") {
        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 w-fit"><CheckCircle2 size={10} /> Sent</span>
            {sentAt && <span className="text-[10px] text-neutral-400">{formatSentDate(sentAt)}</span>}
          </div>
        );
      }
      if (lead.email_sent_status === "failed") {
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"><AlertCircle size={10} /> Failed</span>;
      }
    } else {
      if (isSent) {
        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 w-fit"><CheckCircle2 size={10} /> Sent</span>
            {sentAt && <span className="text-[10px] text-neutral-400">{formatSentDate(sentAt)}</span>}
          </div>
        );
      }
    }

    const leadStatus = (lead.status || "").toLowerCase().trim();
    if (activeStage !== "initial" && (leadStatus === "unsubscribed" || leadStatus === "not interested")) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800">
          Skipped ({lead.status})
        </span>
      );
    }

    if (hasDraft) {
      return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">Ready to send</span>;
    }

    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800">No draft</span>;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mailer</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Send your AI-drafted outreach emails via SMTP.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1.5 animate-in fade-in slide-in-from-right-4 duration-200">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 px-2.5">
                {selectedIds.length} selected
              </span>
              
              <button
                onClick={() => sendToLeads(eligibleSelectedIds)}
                disabled={smtpConfigured === false || eligibleSelectedIds.length === 0}
                title={
                  smtpConfigured === false
                    ? "SMTP is not configured"
                    : eligibleSelectedIds.length === 0
                      ? "None of the selected leads are ready to send (need email, draft, and not already sent)"
                      : undefined
                }
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send size={12} />
                Send active stage ({eligibleSelectedIds.length})
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className={`px-3 py-1.5 bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all text-neutral-700 dark:text-neutral-300 cursor-pointer shadow-sm ${
                    isStatusDropdownOpen ? "ring-2 ring-indigo-500 border-indigo-500" : ""
                  }`}
                >
                  <Tag size={12} className="text-neutral-400 dark:text-neutral-500" />
                  <span>Update Status</span>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {isStatusDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-50 cursor-default" 
                      onClick={() => setIsStatusDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-1.5 flex flex-col z-[60] animate-in fade-in slide-in-from-top-2 duration-150">
                      <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 px-2 py-1 uppercase tracking-wider">
                        Set Lead Status
                      </p>
                      <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />
                      {CRM_STATUSES.map((status) => {
                        const style = getLeadStatusStyle(status);
                        return (
                          <button
                            key={status}
                            onClick={() => {
                              updateBulkStatus(status);
                              setIsStatusDropdownOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-between group/item"
                          >
                            <div className="flex items-center gap-2">
                              <StatusDot status={status} />
                              <span>{status}</span>
                            </div>
                            <span className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full border opacity-0 group-hover/item:opacity-100 transition-opacity ${style}`}>
                              Apply
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setSelectedIds([])}
                className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors flex items-center justify-center cursor-pointer"
                title="Clear selection"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <Link
            href="/settings"
            className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2 text-neutral-700 dark:text-neutral-300"
          >
            <Settings size={16} /> SMTP Settings
          </Link>
        </div>
      </div>

      {smtpConfigured === false && (
        <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/20 flex items-center gap-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle size={18} className="shrink-0" />
          SMTP isn&apos;t configured yet. <Link href="/settings" className="font-semibold underline">Set it up in Settings</Link> before sending.
        </div>
      )}

      {/* Horizontal Sequence Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {STAGES.map((s) => {
          const isStageActive = activeStage === s.id;
          const stageSentCount = leads.filter(l => !!l[s.sentAtKey]).length;
          const stageReadyCount = leads.filter(l => !!l[s.draftKey] && !l[s.sentAtKey]).length;

          return (
            <button
              key={s.id}
              onClick={() => setActiveStage(s.id)}
              className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                isStageActive
                  ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-sm ring-1 ring-indigo-500"
                  : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                isStageActive ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 dark:text-neutral-500"
              }`}>
                {s.label}
              </span>
              <div className="flex items-baseline justify-between mt-2 gap-1">
                <span className="text-lg font-bold text-neutral-800 dark:text-neutral-200 truncate">
                  {stageSentCount} <span className="text-xs font-normal text-neutral-500">sent</span>
                </span>
                {stageReadyCount > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    {stageReadyCount} ready
                  </span>
                )}
              </div>
              <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${leads.length ? (stageSentCount / leads.length) * 100 : 0}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex space-x-1 bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-lg w-fit overflow-x-auto">
            <TabButton active={emailFilter === "all"} onClick={() => setEmailFilter("all")}>All Emails ({leads.length})</TabButton>
            <TabButton active={emailFilter === "with"} onClick={() => setEmailFilter("with")}>With Email ({withEmailCount})</TabButton>
            <TabButton active={emailFilter === "without"} onClick={() => setEmailFilter("without")}>Without Email ({withoutEmailCount})</TabButton>
          </div>
          <div className="flex space-x-1 bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-lg w-fit overflow-x-auto">
            <TabButton active={researchFilter === "all"} onClick={() => setResearchFilter("all")}>All Research</TabButton>
            <TabButton active={researchFilter === "with"} onClick={() => setResearchFilter("with")}>With Research ({withResearchCount})</TabButton>
            <TabButton active={researchFilter === "without"} onClick={() => setResearchFilter("without")}>Without Research ({withoutResearchCount})</TabButton>
          </div>
        </div>
        <div className="flex space-x-1 bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-lg w-fit overflow-x-auto">
          <TabButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All Statuses</TabButton>
          <TabButton active={statusFilter === "not_sent"} onClick={() => setStatusFilter("not_sent")}>Ready ({notSentCount})</TabButton>
          <TabButton active={statusFilter === "sent"} onClick={() => setStatusFilter("sent")}>Sent ({sentCount})</TabButton>
          {activeStage === "initial" && (
            <TabButton active={statusFilter === "failed"} onClick={() => setStatusFilter("failed")}>Failed ({failedCount})</TabButton>
          )}
          <TabButton active={statusFilter === "no_draft"} onClick={() => setStatusFilter("no_draft")}>No Draft ({noDraftCount})</TabButton>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
          />
        </div>

        <div className="relative w-full sm:w-80 flex items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
          <span className="text-xs font-medium text-neutral-500 mr-2 shrink-0">
            {activeStage === "initial" ? "Sent Date:" : "Prev Sent Date:"}
          </span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-transparent text-sm outline-none border-none text-neutral-700 dark:text-neutral-300 cursor-pointer pr-6 appearance-none"
          >
            <option value="" className="bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">All Dates</option>
            {availableDates.map(({ date, count }) => (
              <option key={date} value={date} className="bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
                {formatDateString(date)} ({count} {count === 1 ? "lead" : "leads"})
              </option>
            ))}
          </select>
          {dateFilter ? (
            <button
              onClick={() => setDateFilter("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer z-10"
              title="Clear date filter"
            >
              <X size={14} />
            </button>
          ) : (
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          )}
        </div>

        <div className="relative w-full sm:w-60 flex items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
          <span className="text-xs font-medium text-neutral-500 mr-2 shrink-0">
            Lead Status:
          </span>
          <select
            value={leadStatusFilter}
            onChange={(e) => setLeadStatusFilter(e.target.value)}
            className="w-full bg-transparent text-sm outline-none border-none text-neutral-700 dark:text-neutral-300 cursor-pointer pr-6 appearance-none"
          >
            <option value="All" className="bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">All Statuses</option>
            {CRM_STATUSES.map((status) => (
              <option key={status} value={status} className="bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
                {status}
              </option>
            ))}
          </select>
          {leadStatusFilter !== "All" ? (
            <button
              onClick={() => setLeadStatusFilter("All")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer z-10"
              title="Clear status filter"
            >
              <X size={14} />
            </button>
          ) : (
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          )}
        </div>

        <span className="text-sm text-neutral-500 sm:ml-auto">
          {filteredLeads.length === 0
            ? "0 leads"
            : `Showing ${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, filteredLeads.length)} of ${filteredLeads.length} leads`}
        </span>
      </div>

      <div className="flex-1 overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
            <p className="text-neutral-500 font-medium">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Mail className="w-10 h-10 text-neutral-400 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No leads match this view</h3>
            <p className="text-neutral-500 max-w-sm">Try a different tab or clear your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-xs uppercase tracking-wider text-neutral-500 sticky top-0 z-10 backdrop-blur-md">
                  <th className="p-4 w-12 text-center">
                    <input type="checkbox" checked={selectableLeads.length > 0 && selectableLeads.every(l => selectedIds.includes(l.id))} onChange={toggleSelectAll} className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
                  </th>
                  <th className="p-4 font-semibold w-[18%]">Lead</th>
                  <th className="p-4 font-semibold w-[22%]">Research Points</th>
                  <th className="p-4 font-semibold w-[25%]">Draft Preview</th>
                  <th className="p-4 font-semibold w-[12%]">Lead Status</th>
                  <th className="p-4 font-semibold w-[13%]">Outreach Status</th>
                  <th className="p-4 font-semibold w-[10%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {paginatedLeads.map((lead) => {
                  const hasEmail = !!lead.email;
                  const hasDraft = !!lead[currentStageConfig.draftKey];
                  const isSent = activeStage === "initial" 
                    ? lead.email_sent_status === "success" 
                    : !!lead[currentStageConfig.sentAtKey];

                  const leadStatus = (lead.status || "").toLowerCase().trim();
                  const isExcludedStatus = activeStage !== "initial" && (leadStatus === "unsubscribed" || leadStatus === "not interested");

                  return (
                    <tr key={lead.id} className={`hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors ${!hasEmail ? "opacity-60" : ""}`}>
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          disabled={sendingIds.includes(lead.id) || isExcludedStatus}
                          className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="p-4">
                        <h4 className="font-semibold text-sm">{lead.name}</h4>
                        <p className="text-xs text-neutral-500">{lead.company}</p>
                        {hasEmail ? (
                          <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5"><Mail size={10} /> {lead.email}</p>
                        ) : (
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5"><MailX size={10} /> No email on file</p>
                        )}
                      </td>
                      <td className="p-4">
                        {lead.research_points ? (
                          <div className="text-xs text-neutral-600 dark:text-neutral-300 space-y-1 max-h-24 overflow-y-auto pr-1">
                            {lead.research_points.split("\n\n").map((pt, i) => (
                              <p key={i} className="line-clamp-2 text-[11px] leading-tight">
                                <span className="text-indigo-500 font-bold mr-1">•</span>
                                {pt}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">No research points</span>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 truncate">
                          {lead.subject 
                            ? (activeStage === "initial" || lead.subject.toLowerCase().startsWith("re:") ? lead.subject : `Re: ${lead.subject}`) 
                            : `Quick thought on ${lead.company}'s website`
                          }
                        </p>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          {lead[currentStageConfig.draftKey] || <span className="text-neutral-400 italic">No draft generated for this stage</span>}
                        </p>
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={(e) => toggleStatusDropdown(e, lead.id)}
                          className={`inline-flex items-center justify-between gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full border transition-all cursor-pointer hover:opacity-85 ${getLeadStatusStyle(lead.status)}`}
                        >
                          <span>{lead.status ? (lead.status.toLowerCase() === 'new' ? 'New' : lead.status) : 'New'}</span>
                          <ChevronDown size={10} className="shrink-0 opacity-60" />
                        </button>
                      </td>
                      <td className="p-4">{statusBadge(lead)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => previewEmail(lead.company, (lead.name || "").split(" ")[0], (lead[currentStageConfig.draftKey] as string) || "", lead.id)}
                            disabled={!hasDraft || isPreviewLoading}
                            className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={hasDraft ? "Preview email" : "No draft to preview"}
                          >
                            {isPreviewLoading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                          </button>
                          <button onClick={() => openEditModal(lead)} className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-md transition-colors" title="Edit draft">
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => sendToLeads([lead.id])}
                            disabled={!hasEmail || !hasDraft || isSent || isExcludedStatus || sendingIds.includes(lead.id) || smtpConfigured === false}
                            title={
                              !hasEmail 
                                ? "No email on file" 
                                : !hasDraft 
                                  ? "No draft generated for this stage" 
                                  : isSent 
                                    ? "Already sent for this stage" 
                                    : isExcludedStatus
                                      ? `Lead is ${lead.status}`
                                      : undefined
                            }
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40"
                          >
                            {sendingIds.includes(lead.id) ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            Send
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && filteredLeads.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 mt-4 shrink-0">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safeCurrentPage <= 1}
            className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={safeCurrentPage}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!Number.isFinite(val)) return;
                setCurrentPage(Math.min(Math.max(1, Math.round(val)), totalPages));
              }}
              className="w-14 px-2 py-1 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span>of {totalPages}</span>
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage >= totalPages}
            className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {editingLead && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold">Edit Draft ({currentStageConfig.label}) — {editingLead.name}</h2>
              <button onClick={() => setEditingLead(null)} className="p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Subject</label>
                <input
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  placeholder={`Quick thought on ${editingLead.company}'s website`}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              {editingLead.research_points && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Research Points Reference</label>
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs space-y-1 max-h-32 overflow-y-auto">
                    {editingLead.research_points.split("\n\n").map((pt, i) => (
                      <p key={i} className="text-neutral-700 dark:text-neutral-300">
                        <span className="text-indigo-500 font-bold mr-1">•</span>
                        {pt}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Body</label>
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full min-h-[200px] p-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => previewEmail(editingLead.company, (editingLead.name || "").split(" ")[0], editedBody, editingLead.id)}
                  disabled={!editedBody || isPreviewLoading}
                  className="px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPreviewLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Preview
                </button>
                <button onClick={() => setEditingLead(null)} className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={isSavingEdit} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSavingEdit && <Loader2 size={14} className="animate-spin" />} Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewHtml && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-2xl h-[85vh] overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2"><Eye size={18} /> Email Preview</h2>
              <button onClick={() => setPreviewHtml(null)} className="p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-neutral-100 dark:bg-neutral-950">
              <iframe srcDoc={previewHtml} title="Email preview" className="w-full h-full border-0 bg-white" />
            </div>
          </div>
        </div>
      )}

      {openStatusId && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={(e) => { e.stopPropagation(); setOpenStatusId(null); }}
            onWheel={() => setOpenStatusId(null)}
            onTouchMove={() => setOpenStatusId(null)}
          />
          <div 
            className="fixed bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-[9999] p-1 flex flex-col animate-in fade-in slide-in-from-top-2 duration-100"
            style={{ top: statusPos.top, left: statusPos.left, width: `${statusPos.width}px`, minWidth: '160px' }}
          >
            <p className="text-[10px] font-semibold text-neutral-500 px-3 py-1.5 uppercase tracking-wider mb-1">Set Lead Status</p>
            <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1 mx-2" />
            {CRM_STATUSES.map(status => (
              <button
                key={status}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleSingleStatusChange(openStatusId, status);
                  setOpenStatusId(null);
                }}
                className="w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-700 dark:text-neutral-300 cursor-pointer"
              >
                <StatusDot status={status} />
                <span>{status}</span>
              </button>
            ))}
          </div>
        </>
      )}

    </div>
  );
}
