"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  User, 
  Link as LinkIcon, 
  Wand2, 
  MessageSquare, 
  Zap, 
  Lightbulb, 
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Send
} from "lucide-react";

interface DraftedMessages {
  subjectLine: string;
  directMessage: string;
  connectionRequest: string;
  followUpMessage: string;
  valueHighlights: string[];
  tipsForSuccess: string[];
}

const PRESETS = [
  {
    targetInput: "Nikunj, Founder & Product Lead at Asymmetric Labs",
    specialization: "UI/UX Designer",
    userPortfolio: "https://kumaraguru-dk.framer.website/",
    tone: "Direct & Punchy",
    draftType: "initial" as const,
    customHook: "Strong interest in early-stage B2B product ownership and mobile-first UX.",
  },
  {
    targetInput: "Careers Team at Predigle (SaaS & AI Product)",
    specialization: "SaaS & Dashboard Specialist",
    userPortfolio: "https://kumaraguru-dk.framer.website/",
    tone: "Direct & Punchy",
    draftType: "initial" as const,
    customHook: "Designed vorrei.io multi-organization SaaS platform at Vorreix and digital products at Denovation.",
  },
  {
    targetInput: "Hiring Manager at Aiva Technology (UI/UX + React Interface)",
    specialization: "UX Engineer (UXE)",
    userPortfolio: "https://kumaraguru-dk.framer.website/",
    tone: "Direct & Punchy",
    draftType: "initial" as const,
    customHook: "B.E. Computer Science background bridging Figma UI/UX design with HTML/CSS/React frontend implementation.",
  },
  {
    targetInput: "Sarah Jenkins, Head of Product Design at Figma",
    specialization: "Design Systems & Component Specialist",
    userPortfolio: "https://kumaraguru-dk.framer.website/",
    tone: "Direct & Punchy",
    draftType: "connection" as const,
    customHook: "Experienced with component variants, auto layout, and clean developer handoff workflows.",
  },
];

const TONE_OPTIONS = [
  { label: "Direct & Punchy", desc: "Short, clean, respects recipient's time (Default)" },
  { label: "Value-First & Professional", desc: "Highlights SaaS workflow ROI & design impact" },
  { label: "Creative & Passionate", desc: "Emphasizes product craft & visual execution" },
  { label: "Warm & Conversational", desc: "Friendly approach for peer networking" },
];

const SPECIALIZATION_OPTIONS = [
  "UI/UX Designer",
  "UX Engineer (UXE)",
  "Product Designer",
  "SaaS & Dashboard Specialist",
  "Design Systems & Component Specialist",
];

const DRAFT_TYPE_OPTIONS = [
  { id: "initial", label: "Initial Application / Email", desc: "Full 80-120 word pitch email or InMail DM" },
  { id: "connection", label: "LinkedIn Connection Note", desc: "Short note strictly under 220 characters" },
  { id: "followup", label: "Follow-Up Message", desc: "Polished follow-up for 3-5 days after applying" },
] as const;

export default function DrafterPage() {
  const [targetInput, setTargetInput] = useState("");
  const [userPortfolio, setUserPortfolio] = useState("https://kumaraguru-dk.framer.website/");
  const [tone, setTone] = useState("Direct & Punchy");
  const [specialization, setSpecialization] = useState("UI/UX Designer");
  const [draftType, setDraftType] = useState<"initial" | "connection" | "followup">("initial");
  const [customHook, setCustomHook] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DraftedMessages | null>(null);
  
  const [activeTab, setActiveTab] = useState<"dm" | "connection" | "followup">("dm");
  const [editedText, setEditedText] = useState("");
  const [copied, setCopied] = useState(false);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setTargetInput(preset.targetInput);
    setSpecialization(preset.specialization);
    setUserPortfolio(preset.userPortfolio);
    setTone(preset.tone);
    setDraftType(preset.draftType);
    setCustomHook(preset.customHook);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!targetInput.trim()) {
      setError("Please enter the target person, position, and company.");
      return;
    }

    setError(null);
    setLoading(true);
    setCopied(false);

    try {
      const res = await fetch("/api/drafter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetInput,
          userPortfolio,
          tone,
          specialization,
          draftType,
          customHook,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate outreach draft.");
      }

      setResult(data.data);
      
      // Auto switch active output tab matching requested draftType
      if (draftType === "connection") {
        setActiveTab("connection");
        setEditedText(data.data.connectionRequest);
      } else if (draftType === "followup") {
        setActiveTab("followup");
        setEditedText(data.data.followUpMessage);
      } else {
        setActiveTab("dm");
        setEditedText(data.data.directMessage);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong generating the draft.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: "dm" | "connection" | "followup") => {
    setActiveTab(tab);
    if (!result) return;
    if (tab === "dm") setEditedText(result.directMessage);
    else if (tab === "connection") setEditedText(result.connectionRequest);
    else if (tab === "followup") setEditedText(result.followUpMessage);
  };

  const handleCopy = () => {
    if (!editedText) return;
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Profile Header Bar */}
      <div className="bg-gradient-to-r from-indigo-900/90 via-slate-900 to-purple-900/90 text-white rounded-2xl p-4 sm:p-5 border border-indigo-500/20 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-lg text-white shadow-inner shrink-0">
            K
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-white">Kumaragurubaran Karthikeyan</h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-semibold text-indigo-300">
                User Experience Designer
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Denovation (UX Designer)</span>
              <span>•</span>
              <span>Ex-Vorreix (founding UI/UX for vorrei.io)</span>
              <span>•</span>
              <span className="text-indigo-300 font-medium">+91 8925161453</span>
            </p>
          </div>
        </div>

        <a
          href={userPortfolio}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-medium text-white transition-all self-start sm:self-auto shrink-0"
        >
          <span>Portfolio Website</span>
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Quick Preset Fill Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm scrollbar-none">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 shrink-0 flex items-center gap-1.5">
          <Wand2 size={14} className="text-indigo-500" /> Target Presets:
        </span>
        {PRESETS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => applyPreset(preset)}
            className="shrink-0 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-xs font-medium flex items-center gap-1.5 shadow-sm"
          >
            <span>{preset.targetInput}</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Input Form & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
              <Sliders size={18} className="text-indigo-500" />
              Outreach Drafter Parameters
            </h2>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50">
              Fast Mode (&lt;2s)
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Single Combined Target Field */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Target Contact, Role & Company *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Nikunj, Founder & Product Lead at Asymmetric Labs"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Enter target person, role, and company name or paste candidate context.
              </p>
            </div>

            {/* Draft Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Draft Message Type (Default: Initial)</span>
                <span className="text-[10px] text-indigo-500 lowercase font-mono">default initial</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DRAFT_TYPE_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDraftType(item.id)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                      draftType === item.id
                        ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm"
                        : "bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
                    }`}
                  >
                    <div className="text-xs font-medium capitalize">{item.id}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Outreach Positioning Focus Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Outreach Positioning Focus
              </label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              >
                {SPECIALIZATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Tone Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Outreach Tone & Angle
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TONE_OPTIONS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setTone(item.label)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      tone === item.label
                        ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-medium"
                        : "bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Portfolio Link */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Portfolio Website URL
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="url"
                  placeholder="https://kumaraguru-dk.framer.website/"
                  value={userPortfolio}
                  onChange={(e) => setUserPortfolio(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Custom Hook / Personal Note */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Company Observation or Custom Hook (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Impressed by your focus on simplifying complex B2B operational workflows..."
                value={customHook}
                onChange={(e) => setCustomHook(e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-white" />
                  <span>Drafting fast via NVIDIA AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform" />
                  <span>Generate Outreach ({draftType})</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Generated Message Output & Preview */}
        <div className="lg:col-span-7 space-y-6">
          {!result && !loading && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-12 text-center space-y-4 shadow-sm flex flex-col items-center justify-center min-h-[480px]">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <FileText size={32} />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Ready to Draft Your Pitch
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Enter target prospect details on the left to generate concise, human outreach drafts.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap justify-center gap-4 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Human Copywriting Rules
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Denovation & Vorreix Proof
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Ultra-Fast Generation
                </span>
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-12 text-center space-y-6 shadow-sm flex flex-col items-center justify-center min-h-[480px]">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-200 dark:border-indigo-950 border-t-indigo-600 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-amber-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Drafting {draftType === "initial" ? "Initial Application" : draftType === "connection" ? "Connection Note" : "Follow-Up Message"}...
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  NVIDIA AI is executing fast generation...
                </p>
              </div>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Tabs header & Copy Controls */}
              <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                  {/* Tabs */}
                  <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleTabChange("dm")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === "dm"
                          ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                      }`}
                    >
                      Initial Email / DM
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange("connection")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === "connection"
                          ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                      }`}
                    >
                      Connection Note (&lt;220 chars)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange("followup")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === "followup"
                          ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                      }`}
                    >
                      Follow-up Draft
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerate()}
                      title="Regenerate draft"
                      className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium flex items-center gap-1.5 transition-all"
                    >
                      <RefreshCw size={14} />
                      <span className="hidden sm:inline">Regenerate</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                        copied
                          ? "bg-emerald-600 text-white"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      }`}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? "Copied!" : "Copy Text"}</span>
                    </button>
                  </div>
                </div>

                {/* Subject line (if Initial DM tab) */}
                {activeTab === "dm" && result.subjectLine && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Subject Line
                    </label>
                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl font-medium text-sm text-indigo-950 dark:text-indigo-200">
                      {result.subjectLine}
                    </div>
                  </div>
                )}

                {/* Text Editor Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="font-semibold uppercase tracking-wider">Editable Draft Content</span>
                    <span className="flex items-center gap-2">
                      <span>{editedText.length} characters</span>
                      <span>•</span>
                      <span>{editedText.trim().split(/\s+/).filter(Boolean).length} words</span>
                      {activeTab === "connection" && (
                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                          editedText.length <= 220 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        }`}>
                          {editedText.length}/220
                        </span>
                      )}
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full p-4 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm font-sans leading-relaxed text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-y"
                  />
                </div>
              </div>

              {/* LinkedIn Live Chat Visual Preview Component */}
              <div className="bg-neutral-900 text-white rounded-3xl p-6 shadow-xl border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                      {targetInput.charAt(0) || "P"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <span>{targetInput.split(",")[0] || "Target Prospect"}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
                      </div>
                      <div className="text-xs text-neutral-400 line-clamp-1">
                        {targetInput || "Prospect Details"}
                      </div>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-medium flex items-center gap-1">
                    <MessageSquare size={12} />
                    LinkedIn / Email Preview
                  </div>
                </div>

                {/* Message Bubble Container */}
                <div className="bg-neutral-950 p-4 sm:p-5 rounded-2xl border border-neutral-800/80 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Sent by Kumaragurubaran Karthikeyan</span>
                    <span>Just now</span>
                  </div>
                  <div className="text-xs sm:text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed">
                    {editedText}
                  </div>
                </div>
              </div>

              {/* Highlights & Tips Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Core Hooks Used */}
                <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Zap size={14} /> Profile Hooks Highlighted
                  </h4>
                  <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
                    {result.valueHighlights?.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sending Tips */}
                <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Lightbulb size={14} /> Recommended Action Steps
                  </h4>
                  <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
                    {result.tipsForSuccess?.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
