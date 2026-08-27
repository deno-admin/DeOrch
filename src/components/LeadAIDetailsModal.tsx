"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Search,
  Globe,
  Mail,
  MessageSquare,
  Activity,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bot,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Eye,
  BrainCircuit,
  TrendingUp
} from "lucide-react";

interface LeadAIDetailsModalProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
  onRefreshLead?: () => void;
}

export function LeadAIDetailsModal({ lead, isOpen, onClose, onRefreshLead }: LeadAIDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"research" | "audit" | "email" | "followups" | "reply" | "activity">("research");
  
  // State for AI execution
  const [isLoading, setIsLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  
  // Data states
  const [researchData, setResearchData] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [emailData, setEmailData] = useState<any>(null);
  
  // Follow-ups state (stages 1 to 5)
  const [selectedFollowUpStage, setSelectedFollowUpStage] = useState<string>("follow_up_1");
  const [generatedFollowUps, setGeneratedFollowUps] = useState<Record<string, any>>({});
  
  // Reply Intelligence state
  const [replyInput, setReplyInput] = useState("");
  const [replyResult, setReplyResult] = useState<any>(null);
  
  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  useEffect(() => {
    if (lead && isOpen) {
      fetchActivityLogs();
      // Initialize existing follow-up drafts from lead object if present
      const initialFollowUps: Record<string, any> = {};
      if (lead.email_follow_up_1) initialFollowUps["follow_up_1"] = { body: lead.email_follow_up_1, subject: `Re: ${lead.subject || "Outreach"}` };
      if (lead.email_follow_up_2) initialFollowUps["follow_up_2"] = { body: lead.email_follow_up_2, subject: `Re: ${lead.subject || "Outreach"}` };
      if (lead.email_follow_up_3) initialFollowUps["follow_up_3"] = { body: lead.email_follow_up_3, subject: `Re: ${lead.subject || "Outreach"}` };
      if (lead.email_follow_up_4) initialFollowUps["follow_up_4"] = { body: lead.email_follow_up_4, subject: `Re: ${lead.subject || "Outreach"}` };
      if (lead.email_follow_up_5) initialFollowUps["follow_up_5"] = { body: lead.email_follow_up_5, subject: `Re: ${lead.subject || "Outreach"}` };
      setGeneratedFollowUps(initialFollowUps);
    }
  }, [lead, isOpen]);

  const fetchActivityLogs = async () => {
    if (!lead?.id) return;
    try {
      const res = await fetch(`/api/ai/activity?leadId=${lead.id}`);
      const json = await res.json();
      if (json.activity) {
        setActivityLogs(json.activity);
      }
    } catch (err) {
      console.error("Error fetching activity logs:", err);
    }
  };

  if (!isOpen || !lead) return null;

  // 1. RUN EVIDENCE-BASED RESEARCH AGENT
  const handleRunResearch = async () => {
    setIsLoading(true);
    setActiveTask("research");
    try {
      const res = await fetch("/api/ai/research", {
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
      const data = await res.json();
      if (data.success) {
        setResearchData(data.data);
        if (onRefreshLead) onRefreshLead();
      } else {
        alert(`Evidence Research failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setActiveTask(null);
      fetchActivityLogs();
    }
  };

  // 2. RUN WEBSITE AUDIT
  const handleRunAudit = async () => {
    setIsLoading(true);
    setActiveTask("audit");
    try {
      const res = await fetch("/api/ai/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          company: lead.company,
          website: lead.domain || lead.website
        })
      });
      const data = await res.json();
      if (data.success) {
        setAuditData(data.data);
        if (onRefreshLead) onRefreshLead();
      } else {
        alert(`Website Audit failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setActiveTask(null);
      fetchActivityLogs();
    }
  };

  // 3. GENERATE INITIAL PERSONALIZED COPY
  const handleRunEmail = async () => {
    setIsLoading(true);
    setActiveTask("email");
    try {
      const res = await fetch("/api/ai/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          name: lead.name,
          role: lead.role,
          company: lead.company,
          research: researchData || { research_points: lead.research_points ? [lead.research_points] : [] },
          audit: auditData
        })
      });
      const data = await res.json();
      if (data.success) {
        setEmailData(data.data);
        if (onRefreshLead) onRefreshLead();
      } else {
        alert(`Email generation failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setActiveTask(null);
      fetchActivityLogs();
    }
  };

  // 4. GENERATE INDIVIDUAL FOLLOW-UP (ON-DEMAND BASED ON PREVIOUS DRAFT & RESEARCH)
  const handleGenerateSingleFollowUp = async (stage: string) => {
    setIsLoading(true);
    setActiveTask(`followup_${stage}`);

    let previousDraft = emailData?.body || lead.email_draft || "";
    if (stage === "follow_up_2") {
      previousDraft = generatedFollowUps["follow_up_1"]?.body || previousDraft;
    } else if (stage === "follow_up_3") {
      previousDraft = generatedFollowUps["follow_up_2"]?.body || generatedFollowUps["follow_up_1"]?.body || previousDraft;
    } else if (stage === "follow_up_4") {
      previousDraft = generatedFollowUps["follow_up_3"]?.body || generatedFollowUps["follow_up_2"]?.body || previousDraft;
    } else if (stage === "follow_up_5") {
      previousDraft = generatedFollowUps["follow_up_4"]?.body || generatedFollowUps["follow_up_3"]?.body || previousDraft;
    }

    const researchPoints = researchData?.research_points || (lead.research_points ? [lead.research_points] : []);

    try {
      const res = await fetch("/api/ai/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          name: lead.name,
          role: lead.role,
          company: lead.company,
          stage: stage,
          initialSubject: emailData?.subject || lead.subject || "Outreach",
          previousDraft: previousDraft,
          researchPoints: researchPoints,
          auditOpportunities: auditData?.opportunities || []
        })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedFollowUps(prev => ({
          ...prev,
          [stage]: data.data
        }));
        if (onRefreshLead) onRefreshLead();
      } else {
        alert(`Follow-up generation failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setActiveTask(null);
      fetchActivityLogs();
    }
  };

  // 5. REPLY INTELLIGENCE
  const handleAnalyzeReply = async () => {
    if (!replyInput.trim()) return;
    setIsLoading(true);
    setActiveTask("reply");
    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          name: lead.name,
          role: lead.role,
          company: lead.company,
          replyText: replyInput,
          originalSubject: lead.subject,
          originalBody: lead.email_draft
        })
      });
      const data = await res.json();
      if (data.success) {
        setReplyResult(data.data);
        if (onRefreshLead) onRefreshLead();
      } else {
        alert(`Reply analysis failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setActiveTask(null);
      fetchActivityLogs();
    }
  };

  const followUpStagesList = [
    { id: "follow_up_1", label: "Follow Up 1", delay: "3 days after initial" },
    { id: "follow_up_2", label: "Follow Up 2", delay: "7 days after initial" },
    { id: "follow_up_3", label: "Follow Up 3", delay: "12 days after initial" },
    { id: "follow_up_4", label: "Follow Up 4", delay: "16 days after initial" },
    { id: "follow_up_5", label: "Follow Up 5 (Breakup)", delay: "21 days after initial" },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20">
              {lead.name ? lead.name[0] : "L"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{lead.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  AI Outbound OS
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {lead.role || "Prospect"} at <span className="font-semibold">{lead.company}</span> • {lead.domain || lead.website || "No website"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-950 px-6 gap-1 overflow-x-auto">
          {[
            { id: "research", label: "Evidence Research", icon: Search },
            { id: "audit", label: "Website Audit", icon: Globe },
            { id: "email", label: "Personalized Copy", icon: Mail },
            { id: "followups", label: "Follow-ups (1 to 5)", icon: Layers },
            { id: "reply", label: "Reply Intelligence", icon: MessageSquare },
            { id: "activity", label: "AI Observability", icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-neutral-900 rounded-t-lg shadow-sm"
                    : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto">

          {/* 1. EVIDENCE-BASED RESEARCH AGENT TAB */}
          {activeTab === "research" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <ShieldCheck className="text-emerald-500 w-5 h-5" /> Evidence-Based Research Engine
                  </h3>
                  <p className="text-xs text-neutral-500">Separates verified Facts, website Observations, AI Inferences, and Commercial Opportunities.</p>
                </div>
                <button
                  onClick={handleRunResearch}
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {isLoading && activeTask === "research" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Run Evidence Research
                </button>
              </div>

              {researchData ? (
                <div className="space-y-5 text-xs">

                  {/* Company Summary Banner */}
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 font-bold uppercase text-[10px]">Company Summary</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40">
                        {researchData.company_research?.industry || lead.industry || "Software & Services"}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-neutral-800 dark:text-neutral-200">
                      {researchData.company_research?.summary || lead.bio}
                    </p>
                  </div>

                  {/* 1. VERIFIED FACTS SECTION */}
                  <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-200/50 dark:border-emerald-900/30 pb-2">
                      <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 uppercase flex items-center gap-1.5">
                        <ShieldCheck size={14} /> Facts (Verified Claims)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50">
                        {researchData.facts?.length || 0} Verified
                      </span>
                    </div>

                    <div className="space-y-2">
                      {researchData.facts && researchData.facts.length > 0 ? (
                        researchData.facts.map((fact: any, idx: number) => (
                          <div key={idx} className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-emerald-100 dark:border-emerald-900/30 flex flex-col gap-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-neutral-800 dark:text-neutral-200">✓ {fact.claim}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950">
                                Verified
                              </span>
                            </div>
                            {fact.source_url && (
                              <a href={fact.source_url} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1">
                                <ExternalLink size={10} /> Source: {fact.source_title || fact.source_url}
                              </a>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-neutral-400 italic text-[11px]">No external verified facts extracted.</p>
                      )}
                    </div>
                  </div>

                  {/* 2. DIRECT WEBSITE OBSERVATIONS SECTION */}
                  <div className="p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-blue-200/50 dark:border-blue-900/30 pb-2">
                      <span className="font-bold text-xs text-blue-800 dark:text-blue-300 uppercase flex items-center gap-1.5">
                        <Eye size={14} /> Website Observations (Observable Content)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/50">
                        {researchData.observations?.length || 0} Observed
                      </span>
                    </div>

                    <div className="space-y-2">
                      {researchData.observations && researchData.observations.length > 0 ? (
                        researchData.observations.map((obs: any, idx: number) => (
                          <div key={idx} className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-blue-100 dark:border-blue-900/30 flex flex-col gap-1">
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">◉ {obs.claim}</span>
                            {obs.page_url && (
                              <span className="text-[10px] text-neutral-500 font-mono">Page: {obs.page_url}</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-neutral-400 italic text-[11px]">No direct website observations recorded.</p>
                      )}
                    </div>
                  </div>

                  {/* 3. REASONING INFERENCES SECTION */}
                  <div className="p-4 rounded-xl border border-purple-200/80 dark:border-purple-900/40 bg-purple-50/20 dark:bg-purple-950/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-purple-200/50 dark:border-purple-900/30 pb-2">
                      <span className="font-bold text-xs text-purple-800 dark:text-purple-300 uppercase flex items-center gap-1.5">
                        <BrainCircuit size={14} /> AI Inferences (Reasoned Conclusions)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/50">
                        {researchData.inferences?.length || 0} Inferences
                      </span>
                    </div>

                    <div className="space-y-2">
                      {researchData.inferences && researchData.inferences.length > 0 ? (
                        researchData.inferences.map((inf: any, idx: number) => (
                          <div key={idx} className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-purple-100 dark:border-purple-900/30 flex flex-col gap-1">
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">→ {inf.claim}</span>
                            {inf.supporting_evidence_ids && inf.supporting_evidence_ids.length > 0 && (
                              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                Supporting Evidence: {inf.supporting_evidence_ids.join(", ")}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-neutral-400 italic text-[11px]">No AI inferences generated.</p>
                      )}
                    </div>
                  </div>

                  {/* 4. COMMERCIAL OPPORTUNITIES SECTION */}
                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/30 pb-2">
                      <span className="font-bold text-xs text-amber-800 dark:text-amber-300 uppercase flex items-center gap-1.5">
                        <TrendingUp size={14} /> Commercial Outreach Opportunities
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 uppercase">
                        Primary Hook
                      </span>
                    </div>

                    <div className="space-y-3">
                      {researchData.commercial_opportunities && researchData.commercial_opportunities.length > 0 ? (
                        researchData.commercial_opportunities.map((opp: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-amber-200/50 dark:border-amber-900/30 space-y-1">
                            <h4 className="font-bold text-sm text-neutral-900 dark:text-white">{opp.opportunity}</h4>
                            <p className="text-neutral-600 dark:text-neutral-300 text-xs">{opp.why_it_matters}</p>
                            {opp.supporting_evidence_ids && opp.supporting_evidence_ids.length > 0 && (
                              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold block">
                                Linked Evidence: {opp.supporting_evidence_ids.join(", ")}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-neutral-400 italic text-[11px]">No commercial opportunities generated.</p>
                      )}
                    </div>
                  </div>

                </div>
              ) : lead.research_points ? (
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3 text-xs">
                  <span className="text-neutral-400 font-bold uppercase text-[10px]">Legacy Research Connection Points</span>
                  <ul className="space-y-1.5 list-disc pl-4 font-medium text-neutral-700 dark:text-neutral-300">
                    {lead.research_points.split("\n\n").map((pt: string, idx: number) => (
                      <li key={idx}>{pt}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl text-center space-y-3">
                  <Bot className="w-10 h-10 text-indigo-500 mx-auto" />
                  <h4 className="text-sm font-bold">No Evidence Research Generated Yet</h4>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">Click "Run Evidence Research" to extract verified facts, website observations, and commercial opportunities.</p>
                  <button onClick={handleRunResearch} disabled={isLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold">
                    Start Evidence Research
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. WEBSITE AUDIT TAB */}
          {activeTab === "audit" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Globe className="text-blue-500 w-4 h-4" /> Commercial Website Audit
                  </h3>
                  <p className="text-xs text-neutral-500">Evaluates site content for UX, messaging clarity, CTAs, and outreach opportunities.</p>
                </div>
                <button
                  onClick={handleRunAudit}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {isLoading && activeTask === "audit" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Audit Website
                </button>
              </div>

              {auditData ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between">
                    <div>
                      <span className="text-neutral-400 font-bold uppercase text-[10px]">Commercial Website Score</span>
                      <h4 className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{auditData.overall_score} / 100</h4>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40">
                      Priority: {auditData.priority || "Medium"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">
                      <span className="text-neutral-400 font-bold uppercase text-[10px] text-rose-500">Identified Issues</span>
                      <div className="space-y-2">
                        {auditData.issues?.map((iss: any, idx: number) => (
                          <div key={idx} className="p-2 bg-rose-50/50 dark:bg-rose-950/10 rounded border border-rose-100 dark:border-rose-900/30">
                            <span className="font-bold text-rose-700 dark:text-rose-400">{iss.category}: </span>
                            <span className="text-neutral-700 dark:text-neutral-300">{iss.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">
                      <span className="text-neutral-400 font-bold uppercase text-[10px] text-emerald-500">Outreach Opportunities</span>
                      <ul className="space-y-1.5 list-disc pl-4 font-medium text-neutral-700 dark:text-neutral-300">
                        {auditData.opportunities?.map((opp: string, idx: number) => (
                          <li key={idx}>{opp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl text-center space-y-3">
                  <Globe className="w-10 h-10 text-blue-500 mx-auto" />
                  <h4 className="text-sm font-bold">No Website Audit Conducted</h4>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">Click "Audit Website" to crawl the prospect's site pages and evaluate UX and conversion potential.</p>
                  <button onClick={handleRunAudit} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold">
                    Start Website Audit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. PERSONALIZED COPY TAB */}
          {activeTab === "email" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Mail className="text-emerald-500 w-4 h-4" /> Initial Cold Email Generation
                  </h3>
                  <p className="text-xs text-neutral-500">Generates concise, human initial outreach copy based on research & audit points.</p>
                </div>
                <button
                  onClick={handleRunEmail}
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {isLoading && activeTask === "email" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Generate Initial Draft
                </button>
              </div>

              <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                  <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 uppercase">Initial Outreach Draft</span>
                  <span className="text-[10px] text-neutral-400">Generates draft with human review</span>
                </div>
                <div className="text-xs space-y-2">
                  <p className="font-bold text-neutral-800 dark:text-neutral-200">
                    Subject: {emailData?.subject || lead.subject || "Quick question"}
                  </p>
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800 font-mono whitespace-pre-line text-neutral-700 dark:text-neutral-300 min-h-[120px]">
                    {emailData?.body || lead.email_draft || "No initial draft generated yet. Click 'Generate Initial Draft' above."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. ON-DEMAND SEQUENTIAL FOLLOW-UPS TAB (1 to 5) */}
          {activeTab === "followups" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Layers className="text-purple-500 w-4 h-4" /> Sequential On-Demand Follow-ups (1 to 5)
                </h3>
                <p className="text-xs text-neutral-500">
                  Select a specific follow-up stage below to generate copy based on research points AND the previous draft.
                </p>
              </div>

              {/* Stage selector pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {followUpStagesList.map((stg) => {
                  const isSelected = selectedFollowUpStage === stg.id;
                  const isGenerated = !!generatedFollowUps[stg.id]?.body;
                  return (
                    <button
                      key={stg.id}
                      onClick={() => setSelectedFollowUpStage(stg.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        isSelected
                          ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-sm"
                          : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50"
                      }`}
                    >
                      {isGenerated && <CheckCircle2 size={12} className="text-emerald-500" />}
                      {stg.label}
                    </button>
                  );
                })}
              </div>

              {/* Selected Stage Workspace */}
              {(() => {
                const currentStageObj = followUpStagesList.find(s => s.id === selectedFollowUpStage) || followUpStagesList[0];
                const stageData = generatedFollowUps[selectedFollowUpStage];
                const isTaskRunning = isLoading && activeTask === `followup_${selectedFollowUpStage}`;

                return (
                  <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                      <div>
                        <h4 className="font-bold text-sm text-neutral-900 dark:text-white">{currentStageObj.label}</h4>
                        <p className="text-xs text-neutral-500">{currentStageObj.delay}</p>
                      </div>
                      <button
                        onClick={() => handleGenerateSingleFollowUp(selectedFollowUpStage)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {isTaskRunning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {stageData ? `Regenerate ${currentStageObj.label}` : `Generate ${currentStageObj.label}`}
                      </button>
                    </div>

                    {stageData?.body ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          Subject: {stageData.subject || `Re: ${emailData?.subject || lead.subject || "Outreach"}`}
                        </p>
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800 font-mono text-xs whitespace-pre-line text-neutral-700 dark:text-neutral-300 min-h-[100px]">
                          {stageData.body}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-neutral-400 space-y-2">
                        <p>No draft generated for {currentStageObj.label} yet.</p>
                        <p className="text-[11px] text-neutral-500">Click "Generate {currentStageObj.label}" to craft a contextual follow-up based on research and previous copy.</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* 5. REPLY INTELLIGENCE TAB */}
          {activeTab === "reply" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <MessageSquare className="text-amber-500 w-4 h-4" /> AI Reply Intelligence
                </h3>
                <p className="text-xs text-neutral-500">Paste incoming prospect email responses to classify intent and draft human replies.</p>
              </div>

              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder="Paste received prospect email reply here..."
                  className="w-full p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
                <button
                  onClick={handleAnalyzeReply}
                  disabled={isLoading || !replyInput.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {isLoading && activeTask === "reply" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Analyze Reply Intent
                </button>
              </div>

              {replyResult && (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/30 pb-2">
                    <span className="font-bold text-amber-800 dark:text-amber-300 uppercase">Category: {replyResult.category}</span>
                    <span className="text-[10px] text-neutral-500">Confidence: {Math.round((replyResult.confidence || 0.9) * 100)}%</span>
                  </div>

                  <div>
                    <span className="font-bold block text-neutral-700 dark:text-neutral-300 mb-1">Recommended Next Action:</span>
                    <p className="p-2 bg-white dark:bg-neutral-900 rounded border border-amber-200/50 dark:border-amber-900/30 font-medium">
                      {replyResult.recommended_next_action}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold block text-neutral-700 dark:text-neutral-300 mb-1">Suggested Human Response:</span>
                    <p className="p-3 bg-white dark:bg-neutral-900 rounded border border-amber-200/50 dark:border-amber-900/30 font-mono whitespace-pre-line">
                      {replyResult.suggested_response}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. AI OBSERVABILITY TAB */}
          {activeTab === "activity" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Activity className="text-indigo-500 w-4 h-4" /> AI Execution & Observability Logs
                </h3>
                <p className="text-xs text-neutral-500">Audit trail of model usage, tokens consumed, latency, and status.</p>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-950 text-[10px] uppercase font-bold text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                      <th className="p-3">Task</th>
                      <th className="p-3">Provider</th>
                      <th className="p-3">Model</th>
                      <th className="p-3">Tokens (P / C)</th>
                      <th className="p-3">Latency</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {activityLogs.length > 0 ? (
                      activityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-950/50">
                          <td className="p-3 font-semibold uppercase">{log.task}</td>
                          <td className="p-3 font-mono">{log.provider}</td>
                          <td className="p-3 font-mono text-[11px] truncate max-w-[150px]">{log.model}</td>
                          <td className="p-3 font-mono">{log.prompt_tokens} / {log.completion_tokens}</td>
                          <td className="p-3 font-mono">{log.latency_ms}ms</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === "success" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40" : "bg-rose-100 text-rose-700 dark:bg-rose-950/40"
                            }`}>
                              {log.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-neutral-400">No AI execution logs recorded yet for this lead.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
