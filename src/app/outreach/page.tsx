"use client";

import React, { useState, useEffect } from "react";
import { 
  Send, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Play, 
  Pause, 
  Edit2, 
  Trash2,
  TrendingUp,
  BarChart2,
  Users,
  Target,
  CheckCircle2,
  AlertCircle,
  Database,
  Loader2,
  Sparkles,
  Layers,
  Search as SearchIcon,
  Globe,
  ChevronRight,
  RefreshCw,
  Eye,
  Bot
} from "lucide-react";
import { supabaseLeads } from "@/lib/supabaseLeads";
import { LeadAIDetailsModal } from "@/components/LeadAIDetailsModal";

interface LeadItem {
  id: number;
  name: string;
  role: string;
  company: string;
  email: string | null;
  domain?: string | null;
  website?: string | null;
  batch: string | null;
  industry: string | null;
  bio: string | null;
  research_points: string | null;
  subject: string | null;
  email_draft: string | null;
  email_follow_up_1: string | null;
  email_follow_up_2: string | null;
  email_follow_up_3: string | null;
  email_follow_up_4: string | null;
  email_follow_up_5: string | null;
  outreach_status: string | null;
  email_sent_status: string | null;
  status: string | null;
  created_at: string | null;
}

interface BatchCampaign {
  name: string;
  totalLeads: number;
  researchedCount: number;
  draftedCount: number;
  sentCount: number;
  status: "Active" | "Draft" | "Completed";
}

export default function OutreachPage() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'sequences' | 'templates'>('campaigns');
  const [searchQuery, setSearchQuery] = useState("");
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string>("All");

  // AI Sequence Engine State
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [activeSequenceStep, setActiveSequenceStep] = useState<number>(0);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [aiStatusLog, setAiStatusLog] = useState<string[]>([]);
  
  // Follow-up generation stage state (1 to 5)
  const [selectedFollowUpStage, setSelectedFollowUpStage] = useState<string>("follow_up_1");

  // Modal State
  const [aiModalLead, setAiModalLead] = useState<LeadItem | null>(null);

  // Pagination State
  const PAGE_SIZE = 200;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBatch, searchQuery, activeTab]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const CHUNK_SIZE = 1000;
      const allData: LeadItem[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabaseLeads
          .from('deorch_leads')
          .select('*')
          .order('id', { ascending: false })
          .range(from, from + CHUNK_SIZE - 1);

        if (error) {
          console.error("Error fetching leads for outreach:", error);
          break;
        }
        if (!data || data.length === 0) break;
        allData.push(...(data as LeadItem[]));
        if (data.length < CHUNK_SIZE) break;
        from += CHUNK_SIZE;
      }
      setLeads(allData);
    } catch (err) {
      console.error("Error fetching leads for outreach:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Derive Batch Campaigns from leads table
  const batchCampaigns: BatchCampaign[] = React.useMemo(() => {
    const map: Record<string, LeadItem[]> = {};
    leads.forEach(l => {
      const bName = l.batch && l.batch.trim() !== "" ? l.batch : "Default Batch";
      if (!map[bName]) map[bName] = [];
      map[bName].push(l);
    });

    return Object.entries(map).map(([name, bLeads]) => {
      const researched = bLeads.filter(l => !!l.research_points && l.research_points.trim().length > 0).length;
      const drafted = bLeads.filter(l => !!l.email_draft && l.email_draft.trim().length > 0).length;
      const sent = bLeads.filter(l => l.outreach_status === "sent" || l.email_sent_status === "success").length;
      
      let status: "Active" | "Draft" | "Completed" = "Draft";
      if (sent > 0) status = "Active";
      else if (researched > 0 || drafted > 0) status = "Active";

      return {
        name,
        totalLeads: bLeads.length,
        researchedCount: researched,
        draftedCount: drafted,
        sentCount: sent,
        status
      };
    });
  }, [leads]);

  // Filter leads based on selected Batch and search query
  const filteredLeads = leads.filter(l => {
    const leadBatch = l.batch && l.batch.trim() !== "" ? l.batch : "Default Batch";
    const matchesBatch = selectedBatch === "All" || leadBatch === selectedBatch;
    const matchesSearch = searchQuery === "" || 
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBatch && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedLeads = filteredLeads.slice(pageStart, pageStart + PAGE_SIZE);

  // Action 1: Run AI Research & Audit for Selected Batch / Leads
  const handleRunBatchResearch = async () => {
    const leadsToProcess = filteredLeads.filter(l => selectedLeadIds.length === 0 || selectedLeadIds.includes(l.id));
    if (leadsToProcess.length === 0) return;

    setIsProcessingAI(true);
    setProcessingProgress(0);
    setAiStatusLog([`Starting AI Research & Audit for ${leadsToProcess.length} lead(s)...`]);

    let completed = 0;
    for (const lead of leadsToProcess) {
      setAiStatusLog(prev => [...prev, `Researching & Auditing website for ${lead.name} (${lead.company})...`]);
      try {
        await fetch("/api/ai/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            name: lead.name,
            company: lead.company,
            role: lead.role,
            website: lead.domain || lead.website
          })
        });

        await fetch("/api/ai/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            company: lead.company,
            website: lead.domain || lead.website
          })
        });

        setAiStatusLog(prev => [...prev, `✓ Completed research & audit for ${lead.company}`]);
      } catch (err) {
        setAiStatusLog(prev => [...prev, `✗ Error processing ${lead.company}`]);
      }
      completed++;
      setProcessingProgress(Math.floor((completed / leadsToProcess.length) * 100));
    }

    setAiStatusLog(prev => [...prev, "✓ Batch Research & Audit finished!"]);
    setIsProcessingAI(false);
    await fetchLeads();
    setActiveSequenceStep(2);
  };

  // Action 2: Generate Batch Initial Drafts
  const handleRunBatchEmail = async () => {
    const leadsToProcess = filteredLeads.filter(l => selectedLeadIds.length === 0 || selectedLeadIds.includes(l.id));
    if (leadsToProcess.length === 0) return;

    setIsProcessingAI(true);
    setProcessingProgress(0);
    setAiStatusLog([`Generating personalized initial emails for ${leadsToProcess.length} lead(s)...`]);

    let completed = 0;
    for (const lead of leadsToProcess) {
      setAiStatusLog(prev => [...prev, `Drafting personalized copy for ${lead.name}...`]);
      try {
        await fetch("/api/ai/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            name: lead.name,
            role: lead.role,
            company: lead.company,
            research: { research_points: lead.research_points ? [lead.research_points] : [] }
          })
        });
        setAiStatusLog(prev => [...prev, `✓ Draft created for ${lead.name}`]);
      } catch (err) {
        setAiStatusLog(prev => [...prev, `✗ Error drafting for ${lead.name}`]);
      }
      completed++;
      setProcessingProgress(Math.floor((completed / leadsToProcess.length) * 100));
    }

    setAiStatusLog(prev => [...prev, "✓ Initial Email Copy generation completed!"]);
    setIsProcessingAI(false);
    await fetchLeads();
    setActiveSequenceStep(3);
  };

  // Action 3: Generate Batch Single Follow-up Stage On-Demand (1 to 5)
  const handleRunBatchFollowUp = async (stage: string) => {
    const leadsToProcess = filteredLeads.filter(l => selectedLeadIds.length === 0 || selectedLeadIds.includes(l.id));
    if (leadsToProcess.length === 0) return;

    setIsProcessingAI(true);
    setProcessingProgress(0);
    setAiStatusLog([`Generating ${stage.replace("_", " ").toUpperCase()} for ${leadsToProcess.length} lead(s)...`]);

    let completed = 0;
    for (const lead of leadsToProcess) {
      let previousDraft = lead.email_draft || "";
      if (stage === "follow_up_2") previousDraft = lead.email_follow_up_1 || previousDraft;
      else if (stage === "follow_up_3") previousDraft = lead.email_follow_up_2 || lead.email_follow_up_1 || previousDraft;
      else if (stage === "follow_up_4") previousDraft = lead.email_follow_up_3 || lead.email_follow_up_2 || previousDraft;
      else if (stage === "follow_up_5") previousDraft = lead.email_follow_up_4 || lead.email_follow_up_3 || previousDraft;

      setAiStatusLog(prev => [...prev, `Drafting ${stage} for ${lead.name} based on research & previous draft...`]);
      try {
        await fetch("/api/ai/followup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            name: lead.name,
            role: lead.role,
            company: lead.company,
            stage: stage,
            initialSubject: lead.subject || "Outreach",
            previousDraft: previousDraft,
            researchPoints: lead.research_points ? [lead.research_points] : []
          })
        });
        setAiStatusLog(prev => [...prev, `✓ ${stage} generated for ${lead.name}`]);
      } catch (err) {
        setAiStatusLog(prev => [...prev, `✗ Error generating ${stage} for ${lead.name}`]);
      }
      completed++;
      setProcessingProgress(Math.floor((completed / leadsToProcess.length) * 100));
    }

    setAiStatusLog(prev => [...prev, `✓ ${stage} generation completed!`]);
    setIsProcessingAI(false);
    await fetchLeads();
  };

  const totalLeads = leads.length;
  const researchedCount = leads.filter(l => !!l.research_points && l.research_points.trim().length > 0).length;
  const draftedCount = leads.filter(l => !!l.email_draft && l.email_draft.trim().length > 0).length;
  const followUpsCount = leads.filter(l => !!l.email_follow_up_1 || !!l.email_follow_up_2).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Outreach Operating System
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Batch campaign management, AI research engines, initial copy, and on-demand sequential follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (leads[0]) setAiModalLead(leads[0]);
              else alert("No leads found to launch AI OS modal.");
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles size={14} /> AI Outbound OS
          </button>
        </div>
      </div>

      {/* Dynamic Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard title="Total Batch Leads" value={totalLeads.toLocaleString()} trend={`${batchCampaigns.length} Batches`} icon={Users} colorClass="bg-blue-500 text-blue-600 dark:text-blue-400" />
        <MetricCard title="Researched Engine" value={`${researchedCount.toLocaleString()} Leads`} trend={`${totalLeads > 0 ? Math.round((researchedCount/totalLeads)*100) : 0}%`} icon={SearchIcon} colorClass="bg-indigo-500 text-indigo-600 dark:text-indigo-400" />
        <MetricCard title="Initial Copy Ready" value={`${draftedCount.toLocaleString()} Drafts`} trend={`${totalLeads > 0 ? Math.round((draftedCount/totalLeads)*100) : 0}%`} icon={Mail} colorClass="bg-emerald-500 text-emerald-600 dark:text-emerald-400" />
        <MetricCard title="Follow-up Sequences" value={`${followUpsCount.toLocaleString()} Active`} trend="Stages 1-5" icon={Layers} colorClass="bg-purple-500 text-purple-600 dark:text-purple-400" />
      </div>

      {/* Main Content Workspace Container (Natural Page Flow) */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex space-x-1 bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-xl w-fit">
            <TabButton active={activeTab === 'campaigns'} onClick={() => setActiveTab('campaigns')}>
              Campaigns (Batches)
            </TabButton>
            <TabButton active={activeTab === 'sequences'} onClick={() => setActiveTab('sequences')}>
              AI Sequence Engine
            </TabButton>
            <TabButton active={activeTab === 'templates'} onClick={() => setActiveTab('templates')}>
              Templates
            </TabButton>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Search leads or batches..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button onClick={fetchLeads} className="p-1.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Tab 1: CAMPAIGNS (BATCHES) */}
        {activeTab === 'campaigns' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Campaign Batches Overview</h3>
              <span className="text-xs text-neutral-400">{batchCampaigns.length} Batches • {totalLeads.toLocaleString()} Total Leads</span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : batchCampaigns.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 space-y-2">
                <Database className="w-10 h-10 mx-auto" />
                <h4 className="font-bold text-sm">No Batches Found</h4>
                <p className="text-xs max-w-sm mx-auto">Upload leads with a batch column to create automated outreach campaign batches.</p>
              </div>
            ) : (
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-950 uppercase font-bold text-neutral-500 text-[10px] border-b border-neutral-200 dark:border-neutral-800">
                      <th className="p-3">Batch / Campaign Name</th>
                      <th className="p-3">Total Leads</th>
                      <th className="p-3">Research Engine</th>
                      <th className="p-3">Initial Drafts</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {batchCampaigns.map((batch) => {
                      const resPct = Math.round((batch.researchedCount / (batch.totalLeads || 1)) * 100);
                      const draftPct = Math.round((batch.draftedCount / (batch.totalLeads || 1)) * 100);
                      return (
                        <tr key={batch.name} className="hover:bg-neutral-50 dark:hover:bg-neutral-950/50">
                          <td className="p-3">
                            <div className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-2">
                              <Layers size={14} className="text-indigo-500 shrink-0" />
                              {batch.name}
                            </div>
                          </td>
                          <td className="p-3 font-semibold text-neutral-700 dark:text-neutral-300">
                            {batch.totalLeads.toLocaleString()} Leads
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1 w-32">
                              <span className="font-semibold text-neutral-700 dark:text-neutral-300">{batch.researchedCount.toLocaleString()} / {batch.totalLeads.toLocaleString()} ({resPct}%)</span>
                              <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${resPct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1 w-32">
                              <span className="font-semibold text-neutral-700 dark:text-neutral-300">{batch.draftedCount.toLocaleString()} / {batch.totalLeads.toLocaleString()} ({draftPct}%)</span>
                              <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${draftPct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full font-bold text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border border-emerald-200">
                              {batch.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedBatch(batch.name);
                                setActiveTab('sequences');
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1 mx-auto text-[11px] cursor-pointer"
                            >
                              <Play size={10} /> Run Sequence
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: AI SEQUENCE ENGINE (BATCH SELECTION -> RESEARCH -> EMAIL -> FOLLOWUPS) */}
        {activeTab === 'sequences' && (
          <div className="p-4 space-y-4">
            
            {/* Batch Selector Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
              <div className="flex items-center gap-2.5">
                <Layers className="text-indigo-500 w-4 h-4" />
                <div>
                  <h3 className="font-bold text-xs">Target Batch Campaign</h3>
                  <p className="text-[11px] text-neutral-500">Select batch to execute AI Research, Initial Email, and On-Demand Follow-ups.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500">Batch:</span>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="px-3 py-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="All">All Batches ({totalLeads.toLocaleString()} Leads)</option>
                  {batchCampaigns.map(b => (
                    <option key={b.name} value={b.name}>{b.name} ({b.totalLeads.toLocaleString()} Leads)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sequence Stepper */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { step: 1, title: "1. Select Batch", desc: `${filteredLeads.length.toLocaleString()} leads in batch` },
                { step: 2, title: "2. Research Engine", desc: "Company + Website + Audit synthesis" },
                { step: 3, title: "3. Initial Copy", desc: "Human personalized draft" },
                { step: 4, title: "4. Follow-ups 1-5", desc: "On-demand sequential generation" },
              ].map((s) => {
                const isActive = activeSequenceStep === s.step || (activeSequenceStep === 0 && s.step === 1);
                return (
                  <div
                    key={s.step}
                    onClick={() => setActiveSequenceStep(s.step)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? "border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm"
                        : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5">{s.title}</span>
                    <span className="text-[10px] text-neutral-500">{s.desc}</span>
                  </div>
                );
              })}
            </div>

            {/* AI Progress / Log Banner */}
            {isProcessingAI && (
              <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Processing AI Sequence Engine...
                  </span>
                  <span>{processingProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${processingProgress}%` }} />
                </div>
                <div className="h-16 overflow-y-auto p-2 bg-black/80 rounded font-mono text-[10px] text-indigo-300 space-y-1">
                  {aiStatusLog.map((log, idx) => (
                    <div key={idx}>❯ {log}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Sequence Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-500 uppercase">Batch Target:</span>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {selectedLeadIds.length > 0 ? `${selectedLeadIds.length} checked` : `All ${filteredLeads.length.toLocaleString()} in batch`}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleRunBatchResearch}
                  disabled={isProcessingAI || filteredLeads.length === 0}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <SearchIcon size={13} /> Run Research & Audit
                </button>

                <button
                  onClick={handleRunBatchEmail}
                  disabled={isProcessingAI || filteredLeads.length === 0}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Mail size={13} /> Generate Initial Email
                </button>

                {/* Follow-up Stage Selector */}
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <select
                    value={selectedFollowUpStage}
                    onChange={(e) => setSelectedFollowUpStage(e.target.value)}
                    className="bg-transparent text-xs font-semibold outline-none px-2 py-0.5"
                  >
                    <option value="follow_up_1">Follow Up 1</option>
                    <option value="follow_up_2">Follow Up 2</option>
                    <option value="follow_up_3">Follow Up 3</option>
                    <option value="follow_up_4">Follow Up 4</option>
                    <option value="follow_up_5">Follow Up 5</option>
                  </select>
                  <button
                    onClick={() => handleRunBatchFollowUp(selectedFollowUpStage)}
                    disabled={isProcessingAI || filteredLeads.length === 0}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-semibold flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles size={11} /> Generate {selectedFollowUpStage.replace("_", " ").toUpperCase()}
                  </button>
                </div>
              </div>
            </div>

            {/* Natural Fit-to-Content Leads Table Workspace */}
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-950 uppercase font-bold text-neutral-500 text-[10px] border-b border-neutral-200 dark:border-neutral-800">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeadIds.includes(l.id))}
                        onChange={() => {
                          const pageIds = paginatedLeads.map(l => l.id);
                          const allSelected = pageIds.every(id => selectedLeadIds.includes(id));
                          if (allSelected) {
                            setSelectedLeadIds(prev => prev.filter(id => !pageIds.includes(id)));
                          } else {
                            setSelectedLeadIds(prev => Array.from(new Set([...prev, ...pageIds])));
                          }
                        }}
                        className="rounded border-neutral-300"
                      />
                    </th>
                    <th className="p-3">Lead & Company</th>
                    <th className="p-3">Research Points</th>
                    <th className="p-3">Initial Copy Draft</th>
                    <th className="p-3">Follow-ups Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Loading all leads from database...
                      </td>
                    </tr>
                  ) : paginatedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-400">
                        No leads fit the current search query or selected batch filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedLeads.map((lead) => {
                      const hasResearch = !!lead.research_points && lead.research_points.trim().length > 0;
                      const hasEmail = !!lead.email_draft && lead.email_draft.trim().length > 0;
                      const followUpCount = [lead.email_follow_up_1, lead.email_follow_up_2, lead.email_follow_up_3, lead.email_follow_up_4, lead.email_follow_up_5].filter(Boolean).length;

                      return (
                        <tr key={lead.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-950/50">
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead.id)}
                              onChange={() => {
                                setSelectedLeadIds(prev => prev.includes(lead.id) ? prev.filter(x => x !== lead.id) : [...prev, lead.id]);
                              }}
                              className="rounded border-neutral-300"
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-neutral-900 dark:text-white text-xs">{lead.name}</div>
                            <div className="text-[11px] text-neutral-500">{lead.role || "Prospect"} @ <span className="font-semibold">{lead.company}</span></div>
                          </td>
                          <td className="p-3 max-w-[200px]">
                            {hasResearch ? (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 size={12} /> Synthesized Research
                              </span>
                            ) : (
                              <span className="text-[11px] text-neutral-400 italic">No research run</span>
                            )}
                          </td>
                          <td className="p-3 max-w-[220px]">
                            {hasEmail ? (
                              <div className="text-[11px] font-mono line-clamp-2 text-neutral-700 dark:text-neutral-300">
                                {lead.email_draft}
                              </div>
                            ) : (
                              <span className="text-[11px] text-neutral-400 italic">No initial draft</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 border border-purple-200">
                              {followUpCount} / 5 Stages Ready
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setAiModalLead(lead)}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles size={12} /> AI OS
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Table Footer Pagination Controls */}
              <div className="p-3.5 bg-neutral-50/50 dark:bg-neutral-900/50 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
                <div>
                  Showing {filteredLeads.length > 0 ? pageStart + 1 : 0} to {Math.min(pageStart + PAGE_SIZE, filteredLeads.length)} of {filteredLeads.length.toLocaleString()} leads
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span>Page {safeCurrentPage} of {totalPages}</span>
                  <button
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-3 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 3: TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full flex items-center justify-center mb-3">
              <Mail size={28} />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">
              Template Library
            </h3>
            <p className="text-xs text-neutral-500 max-w-md mb-4">
              Manage your high-performing email and message templates to ensure consistent messaging across your team.
            </p>
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center gap-2">
              <Plus size={16} />
              New Template
            </button>
          </div>
        )}

      </div>

      {/* AI OS Details Modal */}
      {aiModalLead && (
        <LeadAIDetailsModal
          lead={aiModalLead}
          isOpen={!!aiModalLead}
          onClose={() => setAiModalLead(null)}
          onRefreshLead={fetchLeads}
        />
      )}

    </div>
  );
}

function MetricCard({ title, value, trend, icon: Icon, colorClass }: any) {
  return (
    <div className="p-4 rounded-2xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:scale-150 transition-transform duration-500 ${colorClass.split(' ')[0]}`}></div>
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className={`p-2 rounded-xl ${colorClass.split(' ')[0]} bg-opacity-10 dark:bg-opacity-20`}>
          <Icon className={`w-4 h-4 ${colorClass.split(' ').slice(1).join(' ')}`} />
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          {trend}
        </span>
      </div>
      <div className="relative z-10">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-0.5">{title}</p>
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{value}</h3>
      </div>
    </div>
  );
}

function TabButton({ active, children, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
        active 
          ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold' 
          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800'
      }`}
    >
      {children}
    </button>
  );
}
