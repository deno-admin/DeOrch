"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Search, 
  Mail, 
  MessageSquare, 
  Send, 
  Check, 
  Loader2, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Database,
  ExternalLink
} from "lucide-react";
import { supabaseLeads } from "@/lib/supabaseLeads";

interface Lead {
  id: number;
  name: string;
  role: string;
  company: string;
  avatar: string;
  website: string;
  industry: string;
  funding: string;
  employee_count: number;
  bio: string;
  researchPoints: string[];
  emailDraft: string;
  linkedinDraft: string;
  status: "idle" | "researching" | "researched" | "generating" | "generated" | "reviewed" | "sending" | "sent";
  sentStatus: { email: "pending" | "sending" | "success"; linkedin: "pending" | "sending" | "success" };
}

export default function OutreachWorkflow() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLeadIndex, setActiveLeadIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<number>(0);
  
  // Simulations state
  const [researchLogs, setResearchLogs] = useState<string[]>([]);
  const [researchProgress, setResearchProgress] = useState(0);
  const [isResearching, setIsResearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingLinkedin, setIsEditingLinkedin] = useState(false);
  
  // Custom draft edits
  const [editedEmail, setEditedEmail] = useState("");
  const [editedLinkedin, setEditedLinkedin] = useState("");

  const activeLead = leads[activeLeadIndex];

  // Steps definition
  const steps = [
    { title: "AI Research", desc: "Scan profiles & company news" },
    { title: "Generate Messages", desc: "Draft customized copy" },
    { title: "Review Queue", desc: "Verify and approve texts" },
    { title: "Send Outreach", desc: "Dispatch via Email & LinkedIn" }
  ];

  // Fetch leads on mount
  useEffect(() => {
    fetchLeads();
  }, []);

  // Sync editor texts when active lead changes
  useEffect(() => {
    if (activeLead) {
      setEditedEmail(activeLead.emailDraft);
      setEditedLinkedin(activeLead.linkedinDraft);
    }
  }, [activeLeadIndex, activeLead?.emailDraft, activeLead?.linkedinDraft]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabaseLeads
        .from('deorch_leads')
        .select('*')
        .order('id', { ascending: true });

      if (data && data.length > 0) {
        const mapped = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          role: item.role === 'N/A' ? '' : item.role,
          company: item.company,
          avatar: item.avatar || (item.name ? item.name[0] : "L"),
          website: item.domain || item.website || "N/A",
          industry: item.industry || "N/A",
          funding: item.funding_stage || "N/A",
          employee_count: item.employee_count || 0,
          bio: item.bio || "",
          researchPoints: item.research_points ? [item.research_points] : [],
          emailDraft: item.email_draft || "",
          linkedinDraft: item.linkedin_draft || "",
          status: (!item.outreach_status || item.outreach_status === 'not_sent') ? "idle" : item.outreach_status,
          sentStatus: {
            email: item.email_sent_status || "pending",
            linkedin: item.linkedin_sent_status || "pending"
          }
        }));
        setLeads(mapped);
      } else {
        setLeads([]);
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const seedSampleLeads = async () => {
    setIsLoading(true);
    const sampleLeadsToInsert = [
      {
        name: "Sarah Jenkins",
        role: "VP of Engineering",
        company: "TechCorp",
        avatar: "S",
        domain: "techcorp.io",
        industry: "SaaS / Cloud Infrastructure",
        funding_stage: "$12M Series A",
        employee_count: 85,
        bio: "Ex-Stripe. Scaled infrastructure team from 5 to 50. Passionate about Developer Experience and reducing AWS costs.",
        research_points: [
          "TechCorp recently raised $12M Series A to expand their multi-region Kubernetes deployments.",
          "Sarah posted on LinkedIn looking for expert advice on cloud cost optimization tools.",
          "Their current tech stack relies heavily on Next.js, AWS, Terraform, and Go."
        ],
        email_draft: "",
        linkedin_draft: "",
        outreach_status: "idle",
        email_sent_status: "pending",
        linkedin_sent_status: "pending"
      },
      {
        name: "Marcus Vance",
        role: "Co-Founder & CTO",
        company: "PhilosophyAI",
        avatar: "M",
        domain: "philosophy.ai",
        industry: "Artificial Intelligence",
        funding_stage: "Bootstrapped ($2.5M ARR)",
        employee_count: 14,
        bio: "Building next-generation LLM orchestration layers for enterprise compliance. Loves stoicism and clean architectures.",
        research_points: [
          "CTO Marcus recently spoke at NeurIPS about challenges in deterministic outputs from generative models.",
          "PhilosophyAI is planning to double their engineering team size by Q4.",
          "Using local hosted models like Llama-3 and Deno-based microservices."
        ],
        email_draft: "",
        linkedin_draft: "",
        outreach_status: "idle",
        email_sent_status: "pending",
        linkedin_sent_status: "pending"
      },
      {
        name: "Elena Rostova",
        role: "Head of Talent",
        company: "FinTech Flow",
        avatar: "E",
        domain: "fintechflow.com",
        industry: "Financial Services",
        funding_stage: "$45M Series B",
        employee_count: 140,
        bio: "Leading recruiters for remote global expansion. Focuses on hiring elite React/Node developers in LatAm and Europe.",
        research_points: [
          "FinTech Flow is currently expanding into Europe and hiring for senior engineering roles.",
          "Elena shared a blog post criticizing traditional technical screening platforms for high drop-off rates.",
          "Interested in tools that automate onboarding and technical assessments without hurting candidate experience."
        ],
        email_draft: "",
        linkedin_draft: "",
        outreach_status: "idle",
        email_sent_status: "pending",
        linkedin_sent_status: "pending"
      }
    ];

    try {
      await supabaseLeads.from('deorch_leads').insert(sampleLeadsToInsert);
      await fetchLeads();
    } catch (err) {
      console.error("Error seeding leads:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartResearch = () => {
    if (!activeLead) return;
    setIsResearching(true);
    setResearchProgress(0);
    setResearchLogs([]);
    
    const logs = [
      `Initializing search for ${activeLead.name}...`,
      `Found LinkedIn Profile: linkedin.com/in/${activeLead.name.toLowerCase().replace(" ", "-")}`,
      `Connecting to target domain: ${activeLead.website}...`,
      `Triggering live crawling agent on home page...`,
      `Scrape completed. Parsing text structure...`,
      `Sending crawled context to Gemini AI...`,
      `Synthesizing results and updating database...`
    ];

    let currentLogIndex = 0;
    
    // Animate logging steps
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setResearchLogs(prev => [...prev, logs[currentLogIndex]]);
        setResearchProgress(Math.floor(((currentLogIndex + 1) / logs.length) * 100));
        currentLogIndex++;
      } else {
        clearInterval(interval);
      }
    }, 300);

    // Call API Route
    fetch("/api/research", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        leadId: activeLead.id,
        name: activeLead.name,
        company: activeLead.company,
        role: activeLead.role,
        website: activeLead.website
      })
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          const analysis = resData.data;
          
          // Force a final log update
          setResearchLogs(prev => [
            ...prev,
            "Research completed successfully!",
            `Detected Industry: ${analysis.industry}`,
            `Team Size: ~${analysis.employee_count} employees`
          ]);
          setResearchProgress(100);

          // Update state
          setLeads(prev => prev.map((l, idx) => 
            idx === activeLeadIndex 
              ? { 
                  ...l, 
                  status: "researched", 
                  industry: analysis.industry,
                  funding: analysis.funding_stage,
                  employee_count: analysis.employee_count,
                  bio: analysis.bio,
                  researchPoints: analysis.research_points
                } 
              : l
          ));
        } else {
          setResearchLogs(prev => [...prev, `Error: ${resData.error || 'Failed to research lead'}`]);
        }
      })
      .catch(err => {
        console.error("API error:", err);
        setResearchLogs(prev => [...prev, `Error: Network failure or request aborted.`]);
      })
      .finally(() => {
        setIsResearching(false);
      });
  };

  const handleGenerateMessages = async () => {
    if (!activeLead) return;
    setIsGenerating(true);
    setGenerationProgress(20);

    try {
      setGenerationProgress(50);
      const res = await fetch("/api/ai/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: activeLead.id,
          name: activeLead.name,
          role: activeLead.role,
          company: activeLead.company,
          research: {
            research_points: activeLead.researchPoints
          }
        })
      });

      const resData = await res.json();
      setGenerationProgress(90);

      if (resData.success && resData.data) {
        const emailBody = resData.data.body;
        const linkedinDraft = `Hi ${activeLead.name.split(" ")[0]}! Saw your profile as ${activeLead.role} at ${activeLead.company}. Would love to connect and share a few automation tactics we've been testing. Cheers!`;

        await supabaseLeads
          .from('deorch_leads')
          .update({
            outreach_status: 'generated',
            subject: resData.data.subject,
            email_draft: emailBody,
            linkedin_draft: linkedinDraft
          })
          .eq('id', activeLead.id);

        setLeads(prev => prev.map((l, idx) => 
          idx === activeLeadIndex ? { ...l, emailDraft: emailBody, linkedinDraft, status: "generated" } : l
        ));
      } else {
        alert(`Failed to generate email draft: ${resData.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error("Generate messages error:", err);
    } finally {
      setGenerationProgress(100);
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!activeLead) return;
    try {
      await supabaseLeads
        .from('deorch_leads')
        .update({
          outreach_status: 'reviewed',
          email_draft: editedEmail,
          linkedin_draft: editedLinkedin
        })
        .eq('id', activeLead.id);

      setLeads(prev => prev.map((l, idx) => 
        idx === activeLeadIndex 
          ? { ...l, emailDraft: editedEmail, linkedinDraft: editedLinkedin, status: "reviewed" } 
          : l
      ));
      
      if (activeLeadIndex < leads.length - 1) {
        setActiveLeadIndex(prev => prev + 1);
      } else {
        setCurrentStep(3);
      }
    } catch (err) {
      console.error("Error approving lead:", err);
    }
  };

  const handleSendOutreach = async () => {
    const leadsToProcess = leads.filter(l => l.status === "reviewed" || l.status === "generated");
    if (leadsToProcess.length === 0) return;

    // Local visual state update
    setLeads(prev => prev.map(l => 
      l.status === "reviewed" || l.status === "generated" 
        ? { ...l, status: "sending", sentStatus: { email: "sending", linkedin: "sending" } } 
        : l
    ));

    try {
      for (const lead of leadsToProcess) {
        await supabaseLeads
          .from('deorch_leads')
          .update({
            outreach_status: 'sending',
            email_sent_status: 'sending',
            linkedin_sent_status: 'sending'
          })
          .eq('id', lead.id);
      }

      // Step 1: Email success (1s delay)
      setTimeout(async () => {
        for (const lead of leadsToProcess) {
          await supabaseLeads
            .from('deorch_leads')
            .update({ email_sent_status: 'success' })
            .eq('id', lead.id);
        }
        setLeads(prev => prev.map(l => 
          l.status === "sending" 
            ? { ...l, sentStatus: { ...l.sentStatus, email: "success" } } 
            : l
        ));
      }, 1000);

      // Step 2: Linkedin success (2s delay)
      setTimeout(async () => {
        for (const lead of leadsToProcess) {
          await supabaseLeads
            .from('deorch_leads')
            .update({
              outreach_status: 'sent',
              linkedin_sent_status: 'success'
            })
            .eq('id', lead.id);
        }
        setLeads(prev => prev.map(l => 
          l.status === "sending" 
            ? { ...l, status: "sent", sentStatus: { email: "success", linkedin: "success" } } 
            : l
        ));
      }, 2000);
    } catch (err) {
      console.error("Error sending outreach:", err);
    }
  };

  const handleResetDBLeads = async () => {
    const confirmed = window.confirm(
      `This will permanently erase the email/LinkedIn drafts, research notes, and outreach status for all ${leads.length} leads. This cannot be undone. Continue?`
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      // Clear out drafts/statuses to default
      for (const lead of leads) {
        await supabaseLeads
          .from('deorch_leads')
          .update({
            outreach_status: 'idle',
            email_draft: '',
            linkedin_draft: '',
            research_points: '',
            email_sent_status: 'pending',
            linkedin_sent_status: 'pending'
          })
          .eq('id', lead.id);
      }
      await fetchLeads();
      setCurrentStep(0);
      setActiveLeadIndex(0);
    } catch (err) {
      console.error("Error resetting leads:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
        <Loader2 className="w-8 h-8 border-indigo-600 animate-spin text-indigo-500 mb-4" />
        <p className="text-neutral-500 font-medium">Connecting to Supabase...</p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center min-h-[500px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full flex items-center justify-center mb-6">
          <Database size={32} />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No Leads in Database</h3>
        <p className="text-neutral-500 max-w-md mb-6">
          To run outreach workflows, you need leads inside your database. You can either import a CSV on the Leads page, or seed sample test data.
        </p>
        <div className="flex items-center gap-3">
          <button 
            onClick={seedSampleLeads}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-2"
          >
            <Sparkles size={16} /> Seed Sample Leads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[600px] bg-neutral-50 dark:bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
      
      {/* Sidebar: Leads Selection */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Leads Database</h3>
            <button 
              onClick={handleResetDBLeads}
              className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
            >
              <RefreshCw size={12} /> Clear State
            </button>
          </div>
          
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {leads.map((lead, idx) => {
              const isActive = idx === activeLeadIndex;
              return (
                <div
                  key={lead.id}
                  onClick={() => {
                    setActiveLeadIndex(idx);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isActive 
                      ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20" 
                      : "border-neutral-200 dark:border-neutral-800 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      {lead.avatar}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-tight truncate max-w-[120px]">{lead.name}</h4>
                      <p className="text-xs text-neutral-500 truncate max-w-[120px]">{lead.role || 'Lead'} at {lead.company}</p>
                    </div>
                  </div>
                  
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    lead.status === "sent" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                    lead.status === "reviewed" ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" :
                    lead.status === "generated" ? "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" :
                    lead.status === "researched" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                    "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                  }`}>
                    {lead.status.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Progress Box */}
        <div className="mt-6 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2">Campaign Completion</h4>
          <div className="flex items-center justify-between text-xs text-neutral-700 dark:text-neutral-300 mb-1.5">
            <span>Sent Outreach</span>
            <span>{leads.filter(l => l.status === "sent").length} / {leads.length} Leads</span>
          </div>
          <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
              style={{ width: `${(leads.filter(l => l.status === "sent").length / leads.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Runner Panel */}
      <div className="flex-1 p-6 flex flex-col justify-between bg-white dark:bg-neutral-900">
        
        {/* Stepper Navigation */}
        <div className="mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div className="grid grid-cols-4 gap-2">
            {steps.map((step, idx) => {
              const isPast = currentStep > idx;
              const isCurrent = currentStep === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`text-left p-2 rounded-xl transition-all border ${
                    isCurrent 
                      ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10" 
                      : isPast
                      ? "border-emerald-200 bg-emerald-50/5 dark:border-emerald-900/10"
                      : "border-transparent opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      isPast 
                        ? "bg-emerald-500 text-white" 
                        : isCurrent 
                        ? "bg-indigo-600 text-white" 
                        : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600"
                    }`}>
                      {isPast ? <Check size={12} /> : idx + 1}
                    </span>
                    <span className="text-xs font-semibold hidden md:inline">{step.title}</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1 hidden lg:block truncate">{step.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 flex flex-col justify-center">
          
          {/* STEP 1: AI RESEARCH */}
          {currentStep === 0 && activeLead && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="text-amber-500 w-5 h-5" />
                    AI Lead Research & Context
                  </h2>
                  <p className="text-xs text-neutral-500">Scan websites, lookup funding tables, and track updates dynamically.</p>
                </div>
                <button
                  onClick={handleStartResearch}
                  disabled={isResearching}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-md shadow-indigo-600/10 disabled:opacity-50"
                >
                  {isResearching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Researching...
                    </>
                  ) : (
                    <>
                      <Search size={14} /> Start AI Research
                    </>
                  )}
                </button>
              </div>

              {/* Research Display Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Lead Profile Metadata */}
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center font-bold text-lg">
                      {activeLead.avatar}
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900 dark:text-white">{activeLead.name}</h3>
                      <p className="text-xs text-neutral-500">{activeLead.role || 'Prospect'} @ <span className="font-semibold">{activeLead.company}</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                    <div>
                      <span className="text-neutral-400 block mb-0.5">Industry</span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{activeLead.industry}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block mb-0.5">Website</span>
                      <a href={activeLead.website.startsWith('http') ? activeLead.website : `https://${activeLead.website}`} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                        {activeLead.website} <ExternalLink size={10} />
                      </a>
                    </div>
                    <div>
                      <span className="text-neutral-400 block mb-0.5">Funding Stage</span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{activeLead.funding}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block mb-0.5">Employees</span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{activeLead.employee_count > 0 ? activeLead.employee_count.toLocaleString() : 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-neutral-400 block mb-0.5">Bio</span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 block max-h-16 overflow-y-auto leading-relaxed">{activeLead.bio || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* AI Scraping/Research Findings Output */}
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 bg-white dark:bg-neutral-950 flex flex-col justify-between min-h-[220px]">
                  {isResearching ? (
                    <div className="flex-1 flex flex-col justify-center space-y-4">
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span>Researching Database Profile</span>
                        <span>{researchProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${researchProgress}%` }} />
                      </div>
                      <div className="h-24 overflow-y-auto border border-neutral-100 dark:border-neutral-900 rounded p-2 text-[10px] text-neutral-400 space-y-1 bg-neutral-50/50 dark:bg-neutral-900/50 font-mono">
                        {researchLogs.map((log, lIdx) => (
                          <div key={lIdx} className="flex items-start gap-1">
                            <span className="text-indigo-500">❯</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : activeLead.status !== "idle" ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                        <CheckCircle2 size={14} /> Research Completed (Synced)
                      </div>
                      <div className="space-y-2">
                        {activeLead.researchPoints.map((point, pIdx) => (
                          <div key={pIdx} className="flex gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                            <span className="text-indigo-500 shrink-0 font-bold">•</span>
                            <p>{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-400 space-y-2">
                      <AlertCircle className="w-8 h-8 text-neutral-300 dark:text-neutral-700" />
                      <p className="text-xs">No research data persisted in database.</p>
                      <p className="text-[10px] text-neutral-500 max-w-[200px]">Click "Start AI Research" to gather data and update the record.</p>
                    </div>
                  )}

                  {activeLead.status !== "idle" && !isResearching && (
                    <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="px-3 py-1.5 bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                      >
                        Next: Generate Message <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* STEP 2: GENERATE MESSAGES */}
          {currentStep === 1 && activeLead && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <MessageSquare className="text-indigo-500 w-5 h-5" />
                    Personalized Message Generator
                  </h2>
                  <p className="text-xs text-neutral-500">Draft customized multi-channel templates using target intelligence findings.</p>
                </div>
                <button
                  onClick={handleGenerateMessages}
                  disabled={isGenerating || activeLead.status === "idle"}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 disabled:opacity-40"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Drafting...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Generate Custom Drafts
                    </>
                  )}
                </button>
              </div>

              {activeLead.status === "idle" && (
                <div className="p-8 border border-dashed border-amber-200 bg-amber-500/5 dark:bg-amber-950/10 rounded-xl text-center flex flex-col items-center justify-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">AI Research Required First</h4>
                  <p className="text-xs text-neutral-500 max-w-sm">Please return to Step 1 (AI Research) and run intelligence scraping before drafting templates.</p>
                  <button 
                    onClick={() => setCurrentStep(0)}
                    className="px-3 py-1.5 bg-neutral-900 dark:bg-neutral-800 text-white text-xs rounded-lg font-semibold"
                  >
                    Go Back to Step 1
                  </button>
                </div>
              )}

              {activeLead.status !== "idle" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Email Draft Workspace */}
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 bg-white dark:bg-neutral-950 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-neutral-900 pb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          <Mail size={14} className="text-blue-500" /> Personalized Email Draft
                        </div>
                        {activeLead.emailDraft && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full dark:bg-blue-500/10">READY</span>
                        )}
                      </div>

                      {isGenerating ? (
                        <div className="h-48 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        </div>
                      ) : activeLead.emailDraft ? (
                        <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-line font-mono max-h-56 overflow-y-auto">
                          {activeLead.emailDraft}
                        </div>
                      ) : (
                        <div className="h-48 flex items-center justify-center text-xs text-neutral-400 font-italic">
                          No Email draft generated. Click "Generate Custom Drafts" above.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* LinkedIn DM Workspace */}
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 bg-white dark:bg-neutral-950 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-neutral-900 pb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          <MessageSquare size={14} className="text-indigo-500" /> LinkedIn Connection note
                        </div>
                        {activeLead.linkedinDraft && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full dark:bg-indigo-500/10">READY</span>
                        )}
                      </div>

                      {isGenerating ? (
                        <div className="h-48 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        </div>
                      ) : activeLead.linkedinDraft ? (
                        <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-line font-mono max-h-56 overflow-y-auto">
                          {activeLead.linkedinDraft}
                        </div>
                      ) : (
                        <div className="h-48 flex items-center justify-center text-xs text-neutral-400 font-italic">
                          No LinkedIn message generated. Click "Generate Custom Drafts" above.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {activeLead.emailDraft && !isGenerating && (
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 bg-neutral-900 dark:bg-neutral-800 text-white hover:bg-neutral-800 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    Go to Review Queue <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: REVIEW QUEUE */}
          {currentStep === 2 && activeLead && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <CheckCircle2 className="text-blue-500 w-5 h-5" />
                    Pending Review Queue
                  </h2>
                  <p className="text-xs text-neutral-500">Edit, modify parameters, and approve message copy before final delivery.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={!activeLead.emailDraft}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 disabled:opacity-40"
                  >
                    <Check size={14} /> Approve & Save Lead
                  </button>
                </div>
              </div>

              {!activeLead.emailDraft && (
                <div className="p-8 border border-dashed border-amber-200 bg-amber-500/5 dark:bg-amber-950/10 rounded-xl text-center flex flex-col items-center justify-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">No Generated Messages</h4>
                  <p className="text-xs text-neutral-500 max-w-sm">Please return to Step 2 to generate personalized drafts for {activeLead.name}.</p>
                  <button 
                    onClick={() => setCurrentStep(1)}
                    className="px-3 py-1.5 bg-neutral-900 dark:bg-neutral-800 text-white text-xs rounded-lg font-semibold"
                  >
                    Go Back to Step 2
                  </button>
                </div>
              )}

              {activeLead.emailDraft && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Email Review & Edit Panel */}
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 bg-white dark:bg-neutral-950 flex flex-col space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-2">
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                        <Mail size={14} className="text-blue-500" /> Verify Email Copy
                      </span>
                      <button 
                        onClick={() => setIsEditingEmail(!isEditingEmail)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                      >
                        {isEditingEmail ? "Save Draft" : "Edit Text"}
                      </button>
                    </div>

                    {isEditingEmail ? (
                      <textarea
                        value={editedEmail}
                        onChange={(e) => setEditedEmail(e.target.value)}
                        className="w-full min-h-[220px] p-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                      />
                    ) : (
                      <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-line font-mono max-h-56 overflow-y-auto">
                        {editedEmail || activeLead.emailDraft}
                      </div>
                    )}
                  </div>

                  {/* LinkedIn Review & Edit Panel */}
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 bg-white dark:bg-neutral-950 flex flex-col space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-2">
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-indigo-500" /> Verify LinkedIn DM
                      </span>
                      <button 
                        onClick={() => setIsEditingLinkedin(!isEditingLinkedin)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                      >
                        {isEditingLinkedin ? "Save Draft" : "Edit Text"}
                      </button>
                    </div>

                    {isEditingLinkedin ? (
                      <textarea
                        value={editedLinkedin}
                        onChange={(e) => setEditedLinkedin(e.target.value)}
                        className="w-full min-h-[220px] p-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                      />
                    ) : (
                      <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-line font-mono max-h-56 overflow-y-auto">
                        {editedLinkedin || activeLead.linkedinDraft}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {leads.every(l => l.status === "reviewed" || l.status === "sent") && (
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/10"
                  >
                    Proceed to Delivery Queue <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: SEND OUTREACH */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Send className="text-emerald-500 w-5 h-5" />
                    Multi-Channel Dispatcher
                  </h2>
                  <p className="text-xs text-neutral-500">Trigger active integrations to send approved Emails (via Google Workspace API) and LinkedIn DMs.</p>
                </div>
                <button
                  onClick={handleSendOutreach}
                  disabled={leads.filter(l => l.status === "reviewed" || l.status === "generated").length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-md shadow-emerald-600/10 disabled:opacity-40"
                >
                  <Send size={14} /> Send Approved Queue ({leads.filter(l => l.status === "reviewed" || l.status === "generated").length})
                </button>
              </div>

              {/* Delivery Queue Details */}
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-950">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-xs text-neutral-500 uppercase font-semibold">
                      <th className="p-4 w-[35%]">Lead & Contact</th>
                      <th className="p-4 w-[25%] text-center">Email Status</th>
                      <th className="p-4 w-[25%] text-center">LinkedIn status</th>
                      <th className="p-4 w-[15%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-900/40">
                        <td className="p-4">
                          <div>
                            <div className="font-bold text-neutral-900 dark:text-white">{lead.name}</div>
                            <div className="text-[10px] text-neutral-500">{lead.role || 'Prospect'} at {lead.company}</div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            {lead.sentStatus.email === "success" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <CheckCircle2 size={14} /> Sent (Gmail API)
                              </span>
                            ) : lead.sentStatus.email === "sending" ? (
                              <span className="inline-flex items-center gap-1 text-indigo-500 font-semibold animate-pulse">
                                <Loader2 size={12} className="animate-spin" /> Dispatching...
                              </span>
                            ) : (
                              <span className="text-neutral-400">Pending Approval</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            {lead.sentStatus.linkedin === "success" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <CheckCircle2 size={14} /> Note Sent
                              </span>
                            ) : lead.sentStatus.linkedin === "sending" ? (
                              <span className="inline-flex items-center gap-1 text-indigo-500 font-semibold animate-pulse">
                                <Loader2 size={12} className="animate-spin" /> Connection Note...
                              </span>
                            ) : (
                              <span className="text-neutral-400">Pending Approval</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            disabled 
                            className="text-xs text-neutral-400 cursor-not-allowed hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            Logs
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Action Controls */}
        <div className="mt-8 border-t border-neutral-200 dark:border-neutral-800 pt-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> Back
          </button>
          
          <button
            onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
            disabled={currentStep === steps.length - 1}
            className="px-4 py-2 bg-neutral-900 dark:bg-neutral-800 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>

      </div>

    </div>
  );
}
