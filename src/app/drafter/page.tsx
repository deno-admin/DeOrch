"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Copy, 
  Check, 
  Send, 
  RefreshCw, 
  User, 
  Building2, 
  Briefcase, 
  Link as LinkIcon, 
  Wand2, 
  MessageSquare, 
  Info, 
  Zap, 
  ChevronRight, 
  Lightbulb, 
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle
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
    personName: "Sarah Jenkins",
    position: "Head of Product Design",
    companyName: "Figma",
    specialization: "Design Systems & Component Libraries",
    userPortfolio: "https://dribbble.com/designer-portfolio",
    tone: "Value-First & Professional",
    customHook: "Admire Figma's auto-layout updates and component variants workflow.",
  },
  {
    personName: "Marcus Vance",
    position: "Design Recruiting Manager",
    companyName: "Stripe",
    specialization: "SaaS & Complex Dashboards",
    userPortfolio: "https://myportfolio.design",
    tone: "Direct & Punchy",
    customHook: "Built fintech dashboard interfaces that increased task speed by 40%.",
  },
  {
    personName: "Elena Rostova",
    position: "VP of Product & Experience",
    companyName: "Linear",
    specialization: "UI/UX & Product Design",
    userPortfolio: "https://alexux.design",
    tone: "Creative & Passionate",
    customHook: "Focused on micro-interactions and dark mode UI design.",
  },
];

const TONE_OPTIONS = [
  { label: "Value-First & Professional", desc: "Focuses on ROI & design impact" },
  { label: "Direct & Punchy", desc: "Short, clean, respects recipient's time" },
  { label: "Creative & Passionate", desc: "Highlights product enthusiasm & visual craft" },
  { label: "Warm & Conversational", desc: "Friendly approach for peer networking" },
];

const SPECIALIZATION_OPTIONS = [
  "UI/UX & Product Design",
  "Design Systems & Component Libraries",
  "Mobile App Design (iOS/Android)",
  "SaaS & Complex Dashboards",
  "Web & Brand UX Experience",
];

export default function DrafterPage() {
  const [personName, setPersonName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [userPortfolio, setUserPortfolio] = useState("");
  const [tone, setTone] = useState("Value-First & Professional");
  const [specialization, setSpecialization] = useState("UI/UX & Product Design");
  const [customHook, setCustomHook] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DraftedMessages | null>(null);
  const [aiMetadata, setAiMetadata] = useState<{ provider?: string; model?: string }>({});
  
  const [activeTab, setActiveTab] = useState<"dm" | "connection" | "followup">("dm");
  const [editedText, setEditedText] = useState("");
  const [copied, setCopied] = useState(false);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setPersonName(preset.personName);
    setPosition(preset.position);
    setCompanyName(preset.companyName);
    setSpecialization(preset.specialization);
    setUserPortfolio(preset.userPortfolio);
    setTone(preset.tone);
    setCustomHook(preset.customHook);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!personName.trim() || !companyName.trim() || !position.trim()) {
      setError("Please fill in Person Name, Company Name, and Position.");
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
          personName,
          companyName,
          position,
          userPortfolio,
          tone,
          specialization,
          customHook,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate LinkedIn message draft.");
      }

      setResult(data.data);
      setAiMetadata({ provider: data.provider, model: data.model });
      setEditedText(data.data.directMessage);
      setActiveTab("dm");
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
    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 border border-white/10">
              <Sparkles size={14} className="text-amber-400" />
              CareerOS AI Center • Powered by NVIDIA API
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              LinkedIn UI/UX Outreach Drafter
            </h1>
            <p className="text-indigo-200 text-sm sm:text-base max-w-2xl">
              Turn target contacts & roles into personalized, high-converting LinkedIn messages seeking UI/UX Designer opportunities.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center font-bold text-white shadow-inner">
              NV
            </div>
            <div className="text-xs">
              <div className="font-semibold text-white">NVIDIA LLM Engine</div>
              <div className="text-indigo-200">{aiMetadata.model || "meta/llama-3.1-70b"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Preset Fill Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm scrollbar-none">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 shrink-0 flex items-center gap-1.5">
          <Wand2 size={14} className="text-indigo-500" /> Quick Samples:
        </span>
        {PRESETS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => applyPreset(preset)}
            className="shrink-0 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-xs font-medium flex items-center gap-1.5 shadow-sm"
          >
            <span>{preset.personName}</span>
            <span className="text-neutral-400">•</span>
            <span className="text-neutral-500">{preset.companyName}</span>
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
              Opportunity Parameters
            </h2>
            <span className="text-xs text-neutral-400">All fields tailored for UI/UX</span>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Person Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Target Contact Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Contact&apos;s Role / Position *
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Head of Product Design / Talent Recruiter"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Target Company */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Target Company *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Figma / Stripe / Airbnb"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Design Specialization */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Your Design Specialization Focus
              </label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {SPECIALIZATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Portfolio Link */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Your Portfolio URL (Optional)
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="url"
                  placeholder="https://yourportfolio.design"
                  value={userPortfolio}
                  onChange={(e) => setUserPortfolio(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
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

            {/* Custom Hook / Personal Note */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Custom Hook or Product Observation (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Loved your recent team post on redesigning the mobile checkout flow..."
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
                  <span>Drafting via NVIDIA AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform" />
                  <span>Generate UI/UX Outreach Drafts</span>
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
                  Ready to Draft Your LinkedIn Pitch
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Fill in the target contact details on the left or choose one of the quick sample presets to generate tailored connection requests and InMail drafts.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap justify-center gap-4 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-emerald-500" /> LinkedIn Character Limits Compliant
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Value-First Design Framing
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-emerald-500" /> Instant Copy & Edit
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
                  Crafting LinkedIn UI/UX Outreach Message...
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  NVIDIA AI is analyzing role context for {personName || "prospect"} at {companyName || "company"}...
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
                      InMail / DM Draft
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
                      Connection Note (&lt;300 chars)
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

                {/* Subject line (if InMail DM tab) */}
                {activeTab === "dm" && result.subjectLine && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      LinkedIn InMail Subject Line
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
                          editedText.length <= 300 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        }`}>
                          {editedText.length}/300
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
                      {personName.charAt(0) || "P"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <span>{personName || "Target Contact"}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online on LinkedIn" />
                      </div>
                      <div className="text-xs text-neutral-400 line-clamp-1">
                        {position} at {companyName}
                      </div>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-medium flex items-center gap-1">
                    <MessageSquare size={12} />
                    LinkedIn Messenger Preview
                  </div>
                </div>

                {/* Message Bubble Container */}
                <div className="bg-neutral-950 p-4 sm:p-5 rounded-2xl border border-neutral-800/80 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Sent via LinkedIn Direct Message</span>
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
                    <Zap size={14} /> Key Value Hooks Included
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
                    <Lightbulb size={14} /> Tips for Maximum Reply
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
