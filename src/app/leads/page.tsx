"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Building2, 
  Download, 
  Filter, 
  Kanban, 
  List, 
  MoreHorizontal, 
  Plus, 
  Search, 
  Tag, 
  Upload,
  X,
  Edit2,
  Trash2,
  MapPin,
  Globe,
  Link2,
  Mail,
  Copy,
  ChevronDown,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MailX,
  Eye,
  Send
} from "lucide-react";
import { supabaseLeads } from "@/lib/supabaseLeads";

const COLUMNS = ["New", "Qualified", "Contacted", "Follow Up", "Replied", "Meeting Scheduled", "Not Interested", "Unsubscribed"];

interface StageConfig {
  id: string;
  label: string;
  draftKey: string;
  sentAtKey: string;
}

const STAGES: StageConfig[] = [
  { id: "initial", label: "Initial Email", draftKey: "email_draft", sentAtKey: "email_sent_at" },
  { id: "follow_up_1", label: "Follow Up 1", draftKey: "email_follow_up_1", sentAtKey: "email_follow_up_1_sent_at" },
  { id: "follow_up_2", label: "Follow Up 2", draftKey: "email_follow_up_2", sentAtKey: "email_follow_up_2_sent_at" },
  { id: "follow_up_3", label: "Follow Up 3", draftKey: "email_follow_up_3", sentAtKey: "email_follow_up_3_sent_at" },
  { id: "follow_up_4", label: "Follow Up 4", draftKey: "email_follow_up_4", sentAtKey: "email_follow_up_4_sent_at" },
  { id: "follow_up_5", label: "Follow Up 5", draftKey: "email_follow_up_5", sentAtKey: "email_follow_up_5_sent_at" },
];

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

export default function LeadsPage() {
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    const CHUNK_SIZE = 1000;
    const allData: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabaseLeads
        .from('deorch_leads')
        .select('*')
        .order('id', { ascending: false })
        .range(from, from + CHUNK_SIZE - 1);

      if (error) {
        console.error("Error fetching leads:", error);
        break;
      }
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < CHUNK_SIZE) break;
      from += CHUNK_SIZE;
    }

    if (allData.length > 0) {
      const leadIds = allData.map(l => l.id);
      const { data: logsData, error: logsError } = await supabaseLeads
        .from("email_logs")
        .select("*")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false });

      if (!logsError && logsData) {
        const logsMap: Record<number, any[]> = {};
        logsData.forEach((log: any) => {
          if (!logsMap[log.lead_id]) {
            logsMap[log.lead_id] = [];
          }
          logsMap[log.lead_id].push(log);
        });

        allData.forEach((lead: any) => {
          const leadLogs = logsMap[lead.id] || [];
          lead.latestLog = leadLogs[0] || null;
        });
      }
    }

    setLeads(allData.map((row: any) => ({
      ...row,
      websiteScore: row.website_score,
      status: row.status ? (COLUMNS.find(c => c.toLowerCase() === row.status.toLowerCase()) || row.status) : 'New',
    })));
    setIsLoading(false);
  };
  
  // States for search and filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [emailFilter, setEmailFilter] = useState<"all" | "with" | "without">("all");
  const [researchFilter, setResearchFilter] = useState<"all" | "with" | "without">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "not_sent" | "sent" | "failed" | "no_draft">("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("All");
  const [batchFilter, setBatchFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [activeStage, setActiveStage] = useState<string>("initial");
  const currentStageConfig = STAGES.find(s => s.id === activeStage) || STAGES[0];
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  
  const [editingLead, setEditingLead] = useState<any>(null);
  const [initialStatusForAdd, setInitialStatusForAdd] = useState("New");

  // Global Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // Global Status Dropdown state
  const [openStatusId, setOpenStatusId] = useState<number | null>(null);
  const [statusPos, setStatusPos] = useState({ top: 0, left: 0, width: 0 });

  // Bulk dropdown/actions state
  const [isBulkStatusDropdownOpen, setIsBulkStatusDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Pagination state
  const PAGE_SIZE = 200;
  const [currentPage, setCurrentPage] = useState(1);

  // File Input Ref for Upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns when scrolling or clicking outside
  useEffect(() => {
    const handleClose = () => {
      setOpenDropdownId(null);
      setOpenStatusId(null);
      setIsFilterModalOpen(false);
    };
    window.addEventListener("scroll", handleClose, true);
    return () => window.removeEventListener("scroll", handleClose, true);
  }, []);

  // Listen for global Add Lead event
  useEffect(() => {
    const handleGlobalAddLead = () => {
      setEditingLead(null);
      setInitialStatusForAdd("New");
      setIsAddModalOpen(true);
    };
    window.addEventListener('openAddLeadModal', handleGlobalAddLead);
    return () => window.removeEventListener('openAddLeadModal', handleGlobalAddLead);
  }, []);

  useEffect(() => {
    setSelectedIds([]);
    setDateFilter("");
  }, [activeStage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeStage, emailFilter, researchFilter, statusFilter, searchQuery, dateFilter, leadStatusFilter, batchFilter]);

  const withEmailCount = leads.filter(l => !!l.email && l.email !== 'N/A').length;
  const withoutEmailCount = leads.length - withEmailCount;
  
  const withResearchCount = leads.filter(l => !!l.research_points && l.research_points.trim().length > 0 && l.research_points !== 'N/A').length;
  const withoutResearchCount = leads.length - withResearchCount;

  const sentCount = leads.filter(l => {
    if (activeStage === "initial") return l.email_sent_status === "success";
    return !!l[currentStageConfig.sentAtKey];
  }).length;

  const failedCount = leads.filter(l => l.email_sent_status === "failed").length;

  const notSentCount = leads.filter(l => {
    const hasDraft = !!l[currentStageConfig.draftKey] && l[currentStageConfig.draftKey] !== 'N/A';
    if (activeStage === "initial") return l.email_sent_status !== "success" && l.email_sent_status !== "failed" && hasDraft;
    const leadStatus = (l.status || "").toLowerCase().trim();
    const isExcludedStatus = leadStatus === "unsubscribed" || leadStatus === "not interested";
    return !l[currentStageConfig.sentAtKey] && hasDraft && !isExcludedStatus;
  }).length;

  const noDraftCount = leads.filter(l => !l[currentStageConfig.draftKey] || l[currentStageConfig.draftKey] === 'N/A').length;

  const matchesEmailFilter = (lead: any) => {
    const hasEmail = !!lead.email && lead.email !== "N/A";
    if (emailFilter === "with") return hasEmail;
    if (emailFilter === "without") return !hasEmail;
    return true;
  };

  const matchesResearchFilter = (lead: any) => {
    const hasResearch = !!lead.research_points && lead.research_points.trim().length > 0 && lead.research_points !== "N/A";
    if (researchFilter === "with") return hasResearch;
    if (researchFilter === "without") return !hasResearch;
    return true;
  };

  const matchesStatusFilter = (lead: any) => {
    const hasDraft = !!lead[currentStageConfig.draftKey] && lead[currentStageConfig.draftKey] !== "N/A";
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

  const getDateValue = (lead: any) => {
    if (activeStage === "initial") {
      return lead.email_sent_at;
    }
    const prevStage = STAGES[STAGES.findIndex(s => s.id === activeStage) - 1];
    return lead[prevStage?.sentAtKey || 'email_sent_at'] as string | null;
  };

  const formatDateString = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const statusBadge = (lead: any) => {
    const isSent = !!lead[currentStageConfig.sentAtKey];
    const sentAt = lead[currentStageConfig.sentAtKey] as string | null;
    const hasDraft = !!lead[currentStageConfig.draftKey] && lead[currentStageConfig.draftKey] !== 'N/A';

    const formatSentDate = (iso: string | null) => {
      if (!iso) return null;
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    };

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

    const checkIsRecent = (l: any) => {
      const cutoffDate = new Date("2026-08-12T00:00:00Z");
      const dateFields = [
        l.email_sent_at,
        l.linkedin_sent_at,
        l.email_follow_up_1_sent_at,
        l.email_follow_up_2_sent_at,
        l.email_follow_up_3_sent_at,
        l.email_follow_up_4_sent_at,
        l.email_follow_up_5_sent_at,
        l.updated_at
      ];
      return dateFields.some(dateStr => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return !isNaN(d.getTime()) && d >= cutoffDate;
      });
    };

    let status = null;
    if (checkIsRecent(lead)) {
      status = lead.latestLog?.status || lead.outreach_status;
    } else {
      status = lead.outreach_status;
    }

    if (status && status !== "idle" && status !== "not_sent") {
      const style = getOutreachStatusStyle(status);
      const icon = getOutreachStatusIcon(status);
      return (
        <div className="flex flex-col gap-0.5 animate-in fade-in duration-200">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border w-fit ${style}`}>
            {icon}
            <span className="capitalize">{status}</span>
          </span>
          {sentAt && <span className="text-[10px] text-neutral-400">{formatSentDate(sentAt)}</span>}
        </div>
      );
    }

    if (activeStage === "initial") {
      if (lead.email_sent_status === "success") {
        return (
          <div className="flex flex-col gap-0.5 animate-in fade-in duration-200">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 w-fit"><CheckCircle2 size={10} /> Sent</span>
            {sentAt && <span className="text-[10px] text-neutral-400">{formatSentDate(sentAt)}</span>}
          </div>
        );
      }
      if (lead.email_sent_status === "failed") {
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 animate-in fade-in duration-200"><AlertCircle size={10} /> Failed</span>;
      }
    } else {
      if (isSent) {
        return (
          <div className="flex flex-col gap-0.5 animate-in fade-in duration-200">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 w-fit"><CheckCircle2 size={10} /> Sent</span>
            {sentAt && <span className="text-[10px] text-neutral-400">{formatSentDate(sentAt)}</span>}
          </div>
        );
      }
    }

    const leadStatus = (lead.status || "").toLowerCase().trim();
    if (activeStage !== "initial" && (leadStatus === "unsubscribed" || leadStatus === "not interested")) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 animate-in fade-in duration-200">
          Skipped ({lead.status})
        </span>
      );
    }

    if (hasDraft) {
      return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 animate-in fade-in duration-200">Ready</span>;
    }

    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 animate-in fade-in duration-200">No draft</span>;
  };

  const availableBatches = React.useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(lead => {
      if (lead.batch && lead.batch !== 'N/A') {
        counts[lead.batch] = (counts[lead.batch] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([batch, count]) => ({ batch, count }))
      .sort((a, b) => a.batch.localeCompare(b.batch));
  }, [leads]);

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
  }, [leads, activeStage]);

  const activeFiltersCount = [
    emailFilter !== "all" ? 1 : 0,
    researchFilter !== "all" ? 1 : 0,
    statusFilter !== "all" ? 1 : 0,
    leadStatusFilter !== "All" ? 1 : 0,
    batchFilter !== "All" ? 1 : 0,
    dateFilter !== "" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Derived filtered leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      (lead.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.role || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCRMStatus = leadStatusFilter === "All" || lead.status === leadStatusFilter;
    const matchesBatch = batchFilter === "All" || lead.batch === batchFilter;
    const matchesEmail = matchesEmailFilter(lead);
    const matchesResearch = matchesResearchFilter(lead);
    const matchesStatus = matchesStatusFilter(lead);

    let matchesDate = true;
    if (dateFilter) {
      const dateValue = getDateValue(lead);
      if (dateValue) {
        matchesDate = dateValue.substring(0, 10) === dateFilter;
      } else {
        matchesDate = false;
      }
    }
    
    return matchesSearch && matchesCRMStatus && matchesBatch && matchesEmail && matchesResearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedLeads = filteredLeads.slice(pageStart, pageStart + PAGE_SIZE);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const allSelectableIds = paginatedLeads.map(l => l.id);
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

  // Handlers
  const handleExport = () => {
    const headers = ["ID", "Name", "Company", "Role", "Email", "Status", "Score", "Website Score", "Added Date"];
    const csvData = [
      headers.join(","),
      ...filteredLeads.map(l => 
        [l.id, `"${l.name}"`, `"${l.company}"`, `"${l.role}"`, `"${l.email}"`, l.status, l.score, l.websiteScore, `"${l.created_at}"`].join(",")
      )
    ].join("\n");
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "deorch_leads_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const parseCsvRow = (rowStr: string) => {
    const cols = [];
    let inQuotes = false;
    let currentStr = '';
    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(currentStr.trim());
        currentStr = '';
      } else {
        currentStr += char;
      }
    }
    cols.push(currentStr.trim());
    return cols.map(c => c.replace(/^"|"$/g, '').trim());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n');
        if (rows.length > 1) {
          const headers = parseCsvRow(rows[0]).map(h => h.toLowerCase().trim());
          
          const newLeadsData: any[] = [];
          for (let i = 1; i < rows.length; i++) {
            if (!rows[i].trim()) continue;
            const cols = parseCsvRow(rows[i]);
            
            const getCol = (possibleNames: string[]) => {
              const idx = headers.findIndex(h => possibleNames.includes(h));
              const val = idx >= 0 && cols[idx] ? cols[idx] : '';
              return val ? val : 'N/A';
            };

            const name = getCol(['name', 'full name', 'fullname']);
            if (name === 'N/A') continue; // Skip invalid rows

            const statusVal = getCol(['status']);
            const scoreStr = getCol(['score']);
            const webScoreStr = getCol(['website score', 'websitescore', 'website_score']);
            const batchVal = getCol(['batch']);

            newLeadsData.push({
              name: name,
              company: getCol(['company', 'company name']),
              role: getCol(['role', 'job title', 'title']),
              email: getCol(['email', 'email address']),
              location: getCol(['location', 'address']),
              domain: getCol(['domain', 'company domain', 'website']),
              linkedin: getCol(['linkedin', 'linkedin profile', 'linkedin url']),
              status: statusVal !== 'N/A' ? statusVal : "New",
              score: scoreStr !== 'N/A' ? parseInt(scoreStr, 10) || 0 : 0,
              website_score: webScoreStr !== 'N/A' ? parseInt(webScoreStr, 10) || 0 : 0,
              batch: batchVal !== 'N/A' ? batchVal : null,
            });
          }

          if (newLeadsData.length > 0) {
            const { data, error } = await supabaseLeads.from('deorch_leads').insert(newLeadsData).select();
            if (error) {
              console.error("Error inserting leads:", error);
            }
            if (data) {
              setLeads(prev => [...data.map((row: any) => ({ ...row, websiteScore: row.website_score })), ...prev]);
            }
          }
        }
      };
      reader.readAsText(file);
      
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploadModalOpen(false);
    }
  };

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    await supabaseLeads.from('deorch_leads').update({ status: newStatus }).eq('id', leadId);
  };

  const handleSingleStatusChange = async (leadId: number, newStatus: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    const { error } = await supabaseLeads
      .from("deorch_leads")
      .update({ status: newStatus })
      .eq("id", leadId);

    if (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. See console.");
      fetchLeads();
    }
  };

  const handleScoreChange = async (leadId: number, type: 'score' | 'websiteScore', value: number) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, [type]: value } : l));
    const dbField = type === 'websiteScore' ? 'website_score' : type;
    await supabaseLeads.from('deorch_leads').update({ [dbField]: value }).eq('id', leadId);
  };

  const handleDeleteLead = async (leadId: number) => {
    setLeads(leads.filter(l => l.id !== leadId));
    setOpenDropdownId(null);
    await supabaseLeads.from('deorch_leads').delete().eq('id', leadId);
  };

  const updateBulkCRMStatus = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    setIsLoading(true);
    const { error } = await supabaseLeads
      .from("deorch_leads")
      .update({ status: newStatus })
      .in("id", selectedIds);

    if (error) {
      console.error("Error updating bulk status:", error);
      alert("Failed to update status. See console.");
    } else {
      setLeads(prev => prev.map(l => selectedIds.includes(l.id) ? { ...l, status: newStatus } : l));
      setSelectedIds([]);
    }
    setIsLoading(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} lead(s)?`)) return;
    setIsLoading(true);
    const { error } = await supabaseLeads
      .from("deorch_leads")
      .delete()
      .in("id", selectedIds);

    if (error) {
      console.error("Error deleting bulk leads:", error);
      alert("Failed to delete leads. See console.");
    } else {
      setLeads(prev => prev.filter(l => !selectedIds.includes(l.id)));
      setSelectedIds([]);
    }
    setIsLoading(false);
  };

  const openAddModal = (status = "New") => {
    setEditingLead(null);
    setInitialStatusForAdd(status);
    setIsAddModalOpen(true);
  };

  const openEditModal = (lead: any) => {
    setEditingLead(lead);
    setIsAddModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleAddOrEditLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const getFormStr = (name: string) => {
      const val = formData.get(name) as string;
      return val && val.trim() !== '' ? val.trim() : 'N/A';
    };

    const newLeadData = {
      name: getFormStr("name"),
      company: getFormStr("company"),
      role: getFormStr("role"),
      email: getFormStr("email"),
      location: getFormStr("location"),
      domain: getFormStr("domain"),
      linkedin: getFormStr("linkedin"),
      status: formData.get("status") as string,
      score: parseInt((formData.get("score") as string) || "50", 10),
      websiteScore: parseInt((formData.get("websiteScore") as string) || "5", 10),
      research_points: getFormStr("research_points"),
      subject: getFormStr("subject"),
      email_draft: getFormStr("email_draft"),
      batch: formData.get("batch") as string || null,
    };

    const { websiteScore, ...rest } = newLeadData;
    const dbPayload = { ...rest, website_score: websiteScore };

    if (editingLead) {
      const originalLeads = [...leads];
      setLeads(leads.map(l => l.id === editingLead.id ? { ...l, ...newLeadData } : l));
      const { error } = await supabaseLeads.from('deorch_leads').update(dbPayload).eq('id', editingLead.id);
      if (error) {
        console.error("Error updating lead in database:", error);
        alert(`Failed to update lead in database:\n${error.message}`);
        setLeads(originalLeads);
        return;
      }
    } else {
      const tempId = Date.now();
      setLeads([{ id: tempId, ...newLeadData }, ...leads]);
      const { data, error } = await supabaseLeads.from('deorch_leads').insert([dbPayload]).select();
      if (error) {
        console.error("Error creating lead in database:", error);
        alert(`Failed to add lead to database:\n${error.message}\n\nTip: If you recently created the deorch_leads table, make sure the "id" column is set to autoincrement (GENERATED BY DEFAULT AS IDENTITY) in Supabase.`);
        setLeads(prev => prev.filter(l => l.id !== tempId));
        return;
      }
      if (data && data[0]) {
        setLeads(prev => prev.map(l => l.id === tempId ? { ...data[0], websiteScore: data[0].website_score } : l));
      }
    }
    setIsAddModalOpen(false);
  };

  const toggleDropdown = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.right - 144 });
    setOpenDropdownId(openDropdownId === id ? null : id);
    setOpenStatusId(null);
  };

  const toggleStatusDropdown = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setStatusPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(160, rect.width) });
    setOpenStatusId(openStatusId === id ? null : id);
    setOpenDropdownId(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col relative" onClick={() => setIsFilterModalOpen(false)}>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Manage and track your prospective clients.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1.5 animate-in fade-in slide-in-from-right-4 duration-200">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 px-2.5">
                {selectedIds.length} selected
              </span>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsBulkStatusDropdownOpen(!isBulkStatusDropdownOpen); }}
                  className={`px-3 py-1.5 bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all text-neutral-700 dark:text-neutral-300 cursor-pointer shadow-sm ${
                    isBulkStatusDropdownOpen ? "ring-2 ring-indigo-500 border-indigo-500" : ""
                  }`}
                >
                  <Tag size={12} className="text-neutral-400 dark:text-neutral-500" />
                  <span>Update Status</span>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${isBulkStatusDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {isBulkStatusDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-50 cursor-default" 
                      onClick={() => setIsBulkStatusDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-1.5 flex flex-col z-[60] animate-in fade-in slide-in-from-top-2 duration-150">
                      <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 px-2 py-1 uppercase tracking-wider">
                        Set Lead Status
                      </p>
                      <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />
                      {COLUMNS.map((status) => {
                        return (
                          <button
                            key={status}
                            onClick={() => {
                              updateBulkCRMStatus(status);
                              setIsBulkStatusDropdownOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <StatusDot status={status} />
                            <span>{status}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={12} />
                Delete
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors flex items-center justify-center cursor-pointer"
                title="Clear selection"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1">
            <button 
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${view === 'table' ? 'bg-white dark:bg-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}`}
              onClick={() => setView('table')}
            >
              <List size={16} /> Table
            </button>
            <button 
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${view === 'kanban' ? 'bg-white dark:bg-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}`}
              onClick={() => setView('kanban')}
            >
              <Kanban size={16} /> Pipeline
            </button>
          </div>
          
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
            title="Import Leads"
          >
            <Upload size={18} />
          </button>

          <button 
            onClick={() => openAddModal("New")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            Add Lead
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto lg:grid lg:grid-cols-6 gap-3 pb-3 lg:pb-0 mb-6 snap-x scrollbar-none [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden">
        {STAGES.map((s) => {
          const isStageActive = activeStage === s.id;
          const stageSentCount = leads.filter(l => !!l[s.sentAtKey]).length;
          const stageReadyCount = leads.filter(l => !!l[s.draftKey] && !l[s.sentAtKey]).length;

          return (
            <button
              key={s.id}
              onClick={() => setActiveStage(s.id)}
              className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer snap-align-start shrink-0 w-[160px] sm:w-[180px] lg:w-auto ${
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

      {/* Mobile Search & Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6 lg:hidden w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search leads..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileFiltersOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm relative cursor-pointer"
          >
            <Filter size={16} className="text-neutral-500" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-scale-in">
                {activeFiltersCount}
              </span>
            )}
          </button>
          
          <button 
            onClick={handleExport}
            className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Desktop Filter tab bars */}
      <div className="hidden lg:flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4">
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

      {/* Desktop Toolbar */}
      <div className="hidden lg:flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search leads by name, company..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow animate-in fade-in duration-200"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer z-10 animate-in fade-in"
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
            CRM Status:
          </span>
          <select
            value={leadStatusFilter}
            onChange={(e) => setLeadStatusFilter(e.target.value)}
            className="w-full bg-transparent text-sm outline-none border-none text-neutral-700 dark:text-neutral-300 cursor-pointer pr-6 appearance-none"
          >
            <option value="All" className="bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">All Statuses</option>
            {COLUMNS.map((status) => (
              <option key={status} value={status} className="bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
                {status}
              </option>
            ))}
          </select>
          {leadStatusFilter !== "All" ? (
            <button
              onClick={() => setLeadStatusFilter("All")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer z-10 animate-in fade-in"
              title="Clear status filter"
            >
              <X size={14} />
            </button>
          ) : (
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          )}
        </div>

        <div className="relative w-full sm:w-60 flex items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
          <span className="text-xs font-medium text-neutral-500 mr-2 shrink-0">
            Batch:
          </span>
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="w-full bg-transparent text-sm outline-none border-none text-neutral-700 dark:text-neutral-300 cursor-pointer pr-6 appearance-none"
          >
            <option value="All" className="bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">All Batches</option>
            {availableBatches.map(({ batch, count }) => (
              <option key={batch} value={batch} className="bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
                {batch} ({count})
              </option>
            ))}
          </select>
          {batchFilter !== "All" ? (
            <button
              onClick={() => setBatchFilter("All")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer z-10 animate-in fade-in"
              title="Clear batch filter"
            >
              <X size={14} />
            </button>
          ) : (
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          )}
        </div>

        <div className="flex items-center gap-4 sm:ml-auto">
          <span className="text-sm text-neutral-500">
            {filteredLeads.length === 0
              ? "0 leads"
              : `Showing ${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, filteredLeads.length)} of ${filteredLeads.length} leads`}
          </span>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200 lg:hidden" onClick={() => setIsMobileFiltersOpen(false)}>
          <div 
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2"><Filter size={18} className="text-indigo-500" /> Filters</h2>
              <button 
                onClick={() => setIsMobileFiltersOpen(false)}
                className="p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Tab Filters */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Email Status</label>
                  <div className="flex flex-wrap gap-1.5 bg-neutral-100 dark:bg-neutral-950 p-1.5 rounded-xl">
                    <button onClick={() => setEmailFilter("all")} className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${emailFilter === 'all' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500'}`}>All</button>
                    <button onClick={() => setEmailFilter("with")} className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${emailFilter === 'with' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500'}`}>With Email</button>
                    <button onClick={() => setEmailFilter("without")} className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${emailFilter === 'without' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500'}`}>Without</button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Research Points</label>
                  <div className="flex flex-wrap gap-1.5 bg-neutral-100 dark:bg-neutral-950 p-1.5 rounded-xl">
                    <button onClick={() => setResearchFilter("all")} className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${researchFilter === 'all' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500'}`}>All</button>
                    <button onClick={() => setResearchFilter("with")} className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${researchFilter === 'with' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500'}`}>With Research</button>
                    <button onClick={() => setResearchFilter("without")} className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${researchFilter === 'without' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500'}`}>Without</button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Outreach Status</label>
                  <div className="flex flex-wrap gap-1.5 bg-neutral-100 dark:bg-neutral-950 p-1.5 rounded-xl">
                    <button onClick={() => setStatusFilter("all")} className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${statusFilter === 'all' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500'}`}>All</button>
                    <button onClick={() => setStatusFilter("not_sent")} className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${statusFilter === 'not_sent' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500'}`}>Ready</button>
                    <button onClick={() => setStatusFilter("sent")} className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${statusFilter === 'sent' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500'}`}>Sent</button>
                    {activeStage === "initial" && (
                      <button onClick={() => setStatusFilter("failed")} className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${statusFilter === 'failed' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500'}`}>Failed</button>
                    )}
                    <button onClick={() => setStatusFilter("no_draft")} className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${statusFilter === 'no_draft' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500'}`}>No Draft</button>
                  </div>
                </div>
              </div>

              {/* Select Dropdowns */}
              <div className="space-y-4 border-t border-neutral-100 dark:border-neutral-850 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500">{activeStage === "initial" ? "Sent Date" : "Prev Sent Date"}</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm outline-none text-neutral-700 dark:text-neutral-300"
                  >
                    <option value="">All Dates</option>
                    {availableDates.map(({ date, count }) => (
                      <option key={date} value={date}>
                        {formatDateString(date)} ({count} {count === 1 ? "lead" : "leads"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500">CRM Status</label>
                  <select
                    value={leadStatusFilter}
                    onChange={(e) => setLeadStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm outline-none text-neutral-700 dark:text-neutral-300"
                  >
                    <option value="All">All Statuses</option>
                    {COLUMNS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500">Batch</label>
                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm outline-none text-neutral-700 dark:text-neutral-300"
                  >
                    <option value="All">All Batches</option>
                    {availableBatches.map(({ batch, count }) => (
                      <option key={batch} value={batch}>
                        {batch} ({count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-55 dark:bg-neutral-900/50 flex gap-3 shrink-0">
              <button 
                onClick={() => {
                  setEmailFilter("all");
                  setResearchFilter("all");
                  setStatusFilter("all");
                  setLeadStatusFilter("All");
                  setBatchFilter("All");
                  setDateFilter("");
                  setIsMobileFiltersOpen(false);
                }}
                className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-750 transition-colors"
              >
                Clear All
              </button>
              <button 
                onClick={() => setIsMobileFiltersOpen(false)}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm flex flex-col relative">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
            <p className="text-neutral-500 font-medium animate-bounce">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <Search className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No leads found</h3>
            <p className="text-neutral-500 max-w-sm">We couldn't find any leads matching your current search and filter criteria.</p>
            <button 
              onClick={() => { 
                setSearchQuery(""); 
                setEmailFilter("all");
                setResearchFilter("all");
                setStatusFilter("all");
                setLeadStatusFilter("All");
                setBatchFilter("All");
                setDateFilter("");
              }}
              className="mt-4 text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-sm cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          view === 'table' ? (
            <TableView 
              leads={paginatedLeads} 
              selectedIds={selectedIds}
              toggleSelect={toggleSelect}
              toggleSelectAll={toggleSelectAll}
              toggleDropdown={toggleDropdown} 
              toggleStatusDropdown={toggleStatusDropdown} 
              onScoreChange={handleScoreChange}
              statusBadge={statusBadge}
            />
          ) : (
            <KanbanView 
              leads={paginatedLeads} 
              toggleDropdown={toggleDropdown} 
              onStatusChange={handleStatusChange} 
              onAddLead={openAddModal} 
              onScoreChange={handleScoreChange} 
              statusBadge={statusBadge}
            />
          )
        )}
      </div>

      {/* Pagination Controls */}
      {!isLoading && filteredLeads.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 mt-4 shrink-0 animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safeCurrentPage <= 1}
            className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
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
              className="w-14 px-2 py-1 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <span>of {totalPages}</span>
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage >= totalPages}
            className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
          >
            Next
          </button>
        </div>
      )}

      {/* Global Fixed Dropdown for Actions */}
      {openDropdownId && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }}
            onWheel={() => setOpenDropdownId(null)}
            onTouchMove={() => setOpenDropdownId(null)}
          />
          <div 
            className="fixed bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-[9999] p-1 flex flex-col animate-in fade-in slide-in-from-top-2 duration-150"
            style={{ top: dropdownPos.top, left: dropdownPos.left, width: '9rem' }}
          >
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                const lead = leads.find(l => l.id === openDropdownId);
                if (lead) openEditModal(lead); 
              }} 
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 transition-colors text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              <Edit2 size={14} /> Edit Lead
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                handleDeleteLead(openDropdownId); 
              }} 
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}

      {/* Global Fixed Dropdown for Status Change */}
      {openStatusId && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={(e) => { e.stopPropagation(); setOpenStatusId(null); }}
            onWheel={() => setOpenStatusId(null)}
            onTouchMove={() => setOpenStatusId(null)}
          />
          <div 
            className="fixed bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-[9999] p-1 flex flex-col animate-in fade-in slide-in-from-top-2 duration-150"
            style={{ top: statusPos.top, left: statusPos.left, width: `${statusPos.width}px`, minWidth: '160px' }}
          >
            <p className="text-[10px] font-semibold text-neutral-500 px-3 py-1.5 uppercase tracking-wider mb-1">Set Lead Status</p>
            <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1 mx-2" />
            {COLUMNS.map(status => (
              <button
                key={status}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleSingleStatusChange(openStatusId, status);
                  setOpenStatusId(null);
                }}
                className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-700 dark:text-neutral-300 cursor-pointer`}
              >
                <StatusDot status={status} />
                <span>{status}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Upload/Import Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold">Import Leads</h2>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div 
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' 
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange({ target: { files: e.dataTransfer.files } } as any);
                  }
                }}
              >
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <Upload size={24} />
                </div>
                <h3 className="text-sm font-semibold mb-1">Click or drag CSV to upload</h3>
                <p className="text-xs text-neutral-500 text-center max-w-[200px] mb-6">
                  Upload a standard CSV file containing lead information to add them to your pipeline.
                </p>
                <button 
                  onClick={handleUploadClick}
                  className="px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  Browse Files
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xlsx"
                  className="hidden" 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh] border border-neutral-200 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold">{editingLead ? "Edit Lead" : "Add New Lead"}</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddOrEditLead} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name</label>
                  <input required name="name" defaultValue={editingLead?.name} type="text" placeholder="John Doe" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email</label>
                  <input name="email" defaultValue={editingLead?.email !== 'N/A' ? editingLead?.email : ''} type="email" placeholder="john@company.com" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Company Name</label>
                  <input required name="company" defaultValue={editingLead?.company} type="text" placeholder="Company Inc." className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Job Title</label>
                  <input required name="role" defaultValue={editingLead?.role} type="text" placeholder="Director of Sales" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Location</label>
                  <input name="location" defaultValue={editingLead?.location !== 'N/A' ? editingLead?.location : ''} type="text" placeholder="City, State" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Company Domain</label>
                  <input name="domain" defaultValue={editingLead?.domain !== 'N/A' ? editingLead?.domain : ''} type="text" placeholder="company.com" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">LinkedIn Profile URL</label>
                  <input name="linkedin" defaultValue={editingLead?.linkedin !== 'N/A' ? editingLead?.linkedin : ''} type="text" placeholder="https://linkedin.com/in/..." className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Status</label>
                  <select name="status" defaultValue={editingLead?.status || initialStatusForAdd} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    {COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Batch</label>
                <input name="batch" defaultValue={editingLead?.batch !== 'N/A' ? (editingLead?.batch || "") : ""} type="text" placeholder="e.g. finance_us_190" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex justify-between">
                    <span>Lead Score</span>
                    <span className="text-neutral-500 font-normal text-xs">(0-100)</span>
                  </label>
                  <input required name="score" defaultValue={editingLead?.score || 50} type="number" min="0" max="100" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex justify-between">
                    <span>Website Score</span>
                    <span className="text-neutral-500 font-normal text-xs">(0-10)</span>
                  </label>
                  <input required name="websiteScore" defaultValue={editingLead?.websiteScore || 5} type="number" min="0" max="10" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              {/* Mailer Specific Fields */}
              <div className="space-y-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-4 animate-in fade-in duration-300">
                <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Outreach Attributes</label>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Research Points</label>
                <textarea 
                  name="research_points" 
                  defaultValue={editingLead?.research_points && editingLead?.research_points !== 'N/A' ? editingLead?.research_points : ''} 
                  placeholder="Key research points..." 
                  rows={3} 
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all duration-200" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email Subject</label>
                <input 
                  name="subject" 
                  defaultValue={editingLead?.subject && editingLead?.subject !== 'N/A' ? editingLead?.subject : ''} 
                  type="text" 
                  placeholder="Subject line..." 
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all duration-200" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email Draft (Initial)</label>
                <textarea 
                  name="email_draft" 
                  defaultValue={editingLead?.email_draft && editingLead?.email_draft !== 'N/A' ? editingLead?.email_draft : ''} 
                  placeholder="Initial email draft..." 
                  rows={4} 
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs transition-all duration-200" 
                />
              </div>
              
              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white dark:bg-neutral-900 py-2 border-t border-neutral-100 dark:border-neutral-800">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer">
                  {editingLead ? "Save Changes" : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Table View Component
function TableView({ 
  leads, selectedIds, toggleSelect, toggleSelectAll, toggleDropdown, toggleStatusDropdown, onScoreChange, statusBadge
}: { 
  leads: any[], selectedIds: number[], toggleSelect: (id: number) => void, toggleSelectAll: () => void, toggleDropdown: (e: React.MouseEvent, id: number) => void, toggleStatusDropdown: (e: React.MouseEvent, id: number) => void, onScoreChange: (id: number, type: 'score' | 'websiteScore', value: number) => void, statusBadge: (lead: any) => React.ReactNode
}) {
  
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (text === 'N/A') return;
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const statusStyles: Record<string, string> = {
    'New': 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    'Qualified': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    'Contacted': 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
    'Follow Up': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    'Replied': 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 border-teal-200 dark:border-teal-500/20',
    'Meeting Scheduled': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
    'Not Interested': 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
    'Unsubscribed': 'bg-neutral-50 text-neutral-600 dark:bg-neutral-500/10 dark:text-neutral-400 border-neutral-200 dark:border-neutral-500/20',
  };

  return (
    <div className="overflow-x-auto min-h-[400px]">
      <table className="w-full text-left border-collapse min-w-[1200px]">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-xs uppercase tracking-wider text-neutral-500 sticky top-0 z-10 backdrop-blur-md">
            <th className="p-4 w-12 text-center">
              <input 
                type="checkbox" 
                checked={leads.length > 0 && leads.every(l => selectedIds.includes(l.id))}
                onChange={toggleSelectAll}
                className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
              />
            </th>
            <th className="p-4 font-semibold w-[15%]">Lead Info</th>
            <th className="p-4 font-semibold w-[15%]">Role & Company</th>
            <th className="p-4 font-semibold w-[10%]">Location</th>
            <th className="p-4 font-semibold w-[10%]">Links</th>
            <th className="p-4 font-semibold w-[15%]">Scores</th>
            <th className="p-4 font-semibold w-[20%]">Research Points</th>
            <th className="p-4 font-semibold w-[10%]">CRM Status</th>
            <th className="p-4 font-semibold w-[10%]">Outreach Status</th>
            <th className="p-4 font-semibold w-[5%] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors group">
              <td className="p-4 text-center">
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(lead.id)}
                  onChange={() => toggleSelect(lead.id)}
                  className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                />
              </td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 shrink-0">
                    {(lead.name || '?').split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm line-clamp-1">{lead.name}</h4>
                    {lead.email !== 'N/A' && lead.email ? (
                      <div 
                        className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5 group/mail cursor-pointer hover:text-neutral-900 dark:hover:text-white transition-colors"
                        onClick={(e) => copyToClipboard(e, lead.email)}
                        title="Copy Email"
                      >
                        <Mail size={10} className="text-neutral-400 group-hover/mail:text-indigo-500" />
                        <span className="line-clamp-1">{lead.email}</span>
                        {copiedEmail === lead.email ? (
                          <Check size={10} className="text-emerald-500" />
                        ) : (
                          <Copy size={10} className="opacity-0 group-hover/mail:opacity-100 text-indigo-500 transition-opacity" />
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400">N/A</span>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-4">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-200 line-clamp-1" title={lead.company}>{lead.company}</h4>
                    {lead.batch && lead.batch !== 'N/A' && (
                      <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700/50">
                        {lead.batch}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-1" title={lead.role}>{lead.role}</p>
                </div>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  <MapPin size={12} className="shrink-0 text-neutral-400" />
                  <span className="line-clamp-2" title={lead.location}>{lead.location || 'N/A'}</span>
                </div>
              </td>
              <td className="p-4">
                <div className="flex flex-col gap-2">
                  {lead.domain !== 'N/A' && lead.domain ? (
                    <a href={`https://${lead.domain}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline w-fit">
                      <Globe size={12} className="shrink-0" />
                      <span className="line-clamp-1" title={lead.domain}>{lead.domain}</span>
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-400 flex items-center gap-1.5"><Globe size={12} /> N/A</span>
                  )}
                  {lead.linkedin !== 'N/A' && lead.linkedin ? (
                    <a href={lead.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline w-fit">
                      <Link2 size={12} className="shrink-0" />
                      <span className="line-clamp-1">LinkedIn</span>
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-400 flex items-center gap-1.5"><Link2 size={12} /> N/A</span>
                  )}
                </div>
              </td>
              <td className="p-4 pr-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 relative">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 w-7">Lead</span>
                    <div className="relative flex-1 h-1.5 flex items-center">
                      <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden pointer-events-none">
                        <div className={`h-full rounded-full transition-all duration-75 ${lead.score >= 80 ? 'bg-emerald-500' : lead.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.max(0, lead.score))}%` }} />
                      </div>
                      <input
                        type="range" min="0" max="100"
                        value={lead.score}
                        onChange={(e) => onScoreChange(lead.id, 'score', parseInt(e.target.value))}
                        className="absolute inset-y-[-4px] inset-x-0 w-full h-[calc(100%+8px)] cursor-ew-resize m-0 p-0 appearance-none bg-transparent focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-neutral-200 dark:[&::-webkit-slider-thumb]:border-neutral-700 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-neutral-200 dark:[&::-moz-range-thumb]:border-neutral-700 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent"
                      />
                    </div>
                    <span className="text-xs font-semibold w-5 text-right">{lead.score}</span>
                  </div>
                  <div className="flex items-center gap-2 relative">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 w-7">Web</span>
                    <div className="relative flex-1 h-1.5 flex items-center">
                      <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden pointer-events-none">
                        <div className={`h-full rounded-full transition-all duration-75 ${lead.websiteScore >= 8 ? 'bg-blue-500' : lead.websiteScore >= 5 ? 'bg-indigo-400' : 'bg-slate-400'}`} style={{ width: `${Math.min(100, Math.max(0, (lead.websiteScore/10)*100))}%` }} />
                      </div>
                      <input 
                        type="range" min="0" max="10" 
                        value={lead.websiteScore} 
                        onChange={(e) => onScoreChange(lead.id, 'websiteScore', parseInt(e.target.value))}
                        className="absolute inset-y-[-4px] inset-x-0 w-full h-[calc(100%+8px)] cursor-ew-resize m-0 p-0 appearance-none bg-transparent focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-neutral-200 dark:[&::-webkit-slider-thumb]:border-neutral-700 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-neutral-200 dark:[&::-moz-range-thumb]:border-neutral-700 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent"
                      />
                    </div>
                    <span className="text-xs font-semibold w-5 text-right">{lead.websiteScore}</span>
                  </div>
                </div>
              </td>
              <td className="p-4 text-xs">
                {lead.research_points && lead.research_points !== 'N/A' ? (
                  <div className="text-xs text-neutral-600 dark:text-neutral-300 space-y-1 max-h-20 overflow-y-auto pr-1">
                    {lead.research_points.split("\n\n").map((pt: string, i: number) => (
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
                <button 
                  onClick={(e) => toggleStatusDropdown(e, lead.id)}
                  className={`inline-flex items-center justify-between gap-2 px-3 py-1.5 w-[100%] text-xs font-semibold rounded-full border transition-colors cursor-pointer ${statusStyles[lead.status] || 'bg-neutral-50 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'}`}
                >
                  <span className="truncate">{lead.status}</span>
                  <ChevronDown size={12} className="shrink-0 opacity-60" />
                </button>
              </td>
              <td className="p-4">
                {statusBadge(lead)}
              </td>
              <td className="p-4 text-right">
                <button 
                  onClick={(e) => toggleDropdown(e, lead.id)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:opacity-100 cursor-pointer"
                >
                  <MoreHorizontal size={18} className="pointer-events-none" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Kanban View Component
function KanbanView({ 
  leads, toggleDropdown, onStatusChange, onAddLead, onScoreChange, statusBadge
}: { 
  leads: any[], toggleDropdown: (e: React.MouseEvent, id: number) => void,
  onStatusChange: (id: number, status: string) => void,
  onAddLead: (status: string) => void,
  onScoreChange: (id: number, type: 'score' | 'websiteScore', value: number) => void,
  statusBadge: (lead: any) => React.ReactNode
}) {
  
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("leadId", id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = parseInt(e.dataTransfer.getData("leadId"));
    if (leadId) {
      onStatusChange(leadId, newStatus);
    }
  };

  return (
    <div className="flex h-full overflow-x-auto p-4 gap-4 bg-neutral-50/30 dark:bg-neutral-950/30 min-h-[500px]">
      {COLUMNS.map(col => {
        const colLeads = leads.filter(l => l.status === col);
        return (
          <div 
            key={col} 
            className="w-80 shrink-0 flex flex-col animate-in fade-in duration-200"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col)}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <StatusDot status={col} />
                {col}
              </h3>
              <span className="text-xs font-medium bg-white dark:bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-sm">
                {colLeads.length}
              </span>
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto pb-4 pr-1">
              {colLeads.map(lead => (
                <div 
                  key={lead.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-500 shrink-0 shadow-sm">
                        {(lead.name || '?').split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-semibold text-sm line-clamp-1">{lead.name}</h4>
                          {lead.batch && lead.batch !== 'N/A' && (
                            <span className="inline-flex items-center text-[8px] font-semibold px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700/50">
                              {lead.batch}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-1">{lead.role}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => toggleDropdown(e, lead.id)}
                      className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-opacity cursor-pointer"
                    >
                      <MoreHorizontal size={16} className="pointer-events-none" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} className="shrink-0 text-neutral-400" />
                      <span className="line-clamp-1">{lead.company}</span>
                    </div>
                    {lead.location !== 'N/A' && lead.location && (
                      <div className="flex items-center gap-1.5 text-neutral-500">
                        <MapPin size={12} className="shrink-0 text-neutral-400" />
                        <span className="line-clamp-1">{lead.location}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1" title="Lead Score">
                        <Tag size={12} className="text-neutral-400" />
                        <span className="text-xs font-medium text-neutral-500">{lead.score}/100</span>
                      </div>
                      <div className="flex items-center gap-1" title="Website Score">
                        <Globe size={12} className="text-neutral-400" />
                        <span className="text-xs font-medium text-neutral-500">{lead.websiteScore}/10</span>
                      </div>
                    </div>
                    {statusBadge(lead)}
                  </div>
                </div>
              ))}
              
              {/* Add card button */}
              <button 
                onClick={() => onAddLead(col)}
                className="w-full py-3 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-white dark:hover:bg-neutral-900 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={16} /> Add Lead
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helpers
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
  return <div className={`w-2 h-2 rounded-full shrink-0 ${colors[status] || 'bg-neutral-500'}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'New': 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    'Qualified': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    'Contacted': 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
    'Follow Up': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    'Replied': 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 border-teal-200 dark:border-teal-500/20',
    'Meeting Scheduled': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
    'Not Interested': 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
    'Unsubscribed': 'bg-neutral-50 text-neutral-600 dark:bg-neutral-500/10 dark:text-neutral-400 border-neutral-200 dark:border-neutral-500/20',
  };
  
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${styles[status] || 'bg-neutral-50 text-neutral-700 dark:bg-neutral-500/10 dark:text-neutral-400 border-neutral-200'}`}>
      {status}
    </span>
  );
}
