"use client";

import React, { useState, useEffect } from "react";
import { useDrafter } from "@/context/DrafterContext";
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  User,
  Link as LinkIcon,
  Zap,
  Lightbulb,
  X,
  Minimize2,
  Maximize2,
  ChevronLeft,
  Tv,
  Maximize,
  Sliders,
  Send,
  MessageSquare,
  Users,
  Search,
  CheckCircle2
} from "lucide-react";

interface DrafterWidgetProps {
  embedded?: boolean; // True if rendered inside the PiP window or in-page placeholder
}

const PRESETS = [
  {
    targetInput: "Nikunj, Founder & Product Lead at Asymmetric Labs",
    specialization: "UI/UX Designer",
    tone: "Direct & Punchy",
    draftType: "initial" as const,
    customHook: "Strong interest in early-stage B2B product ownership and mobile-first UX.",
  },
  {
    targetInput: "Careers Team at Predigle (SaaS & AI Product)",
    specialization: "SaaS & Dashboard Specialist",
    tone: "Direct & Punchy",
    draftType: "initial" as const,
    customHook: "Designed vorrei.io multi-organization SaaS platform at Vorreix and digital products at Denovation.",
  },
  {
    targetInput: "Sarah Jenkins, Head of Product Design at Figma",
    specialization: "Design Systems & Component Specialist",
    tone: "Direct & Punchy",
    draftType: "connection" as const,
    customHook: "Experienced with component variants, auto layout, and clean developer handoff workflows.",
  },
];

const TONE_OPTIONS = [
  { label: "Direct & Punchy", desc: "Short, clean, respects time (Default)" },
  { label: "Value-First & Professional", desc: "Highlights ROI & design impact" },
];

const SPECIALIZATION_OPTIONS = [
  "UI/UX Designer",
  "UX Engineer (UXE)",
  "Product Designer",
  "SaaS & Dashboard Specialist",
  "Design Systems & Component Specialist",
];

const DRAFT_TYPE_OPTIONS = [
  { id: "initial", label: "Initial Email/DM" },
  { id: "connection", label: "LinkedIn Note" },
  { id: "followup", label: "Follow-Up" },
] as const;

export default function DrafterWidget({ embedded = false }: DrafterWidgetProps) {
  const {
    aiMode,
    setAiMode,
    targetInput,
    setTargetInput,
    userPortfolio,
    setUserPortfolio,
    tone,
    setTone,
    specialization,
    setSpecialization,
    draftType,
    setDraftType,
    customHook,
    setCustomHook,
    parsedCandidates,
    selectedCandidateId,
    selectCandidate,
    parseScreenContent,
    loading,
    error,
    result,
    handleGenerate,
    copyToClipboard,
    isFloating,
    setIsFloating,
    isPiP,
    openPiP,
    closePiP,
    isMinimized,
    setIsMinimized,
  } = useDrafter();

  const [widgetTab, setWidgetTab] = useState<"edit" | "result">("edit");
  const [inputMode, setInputMode] = useState<"single" | "scraper">("single");
  const [screenText, setScreenText] = useState("");

  const [activeResultTab, setActiveResultTab] = useState<"dm" | "connection" | "followup">("dm");
  const [copied, setCopied] = useState(false);
  const [editedText, setEditedText] = useState("");

  // Position coordinates for in-app floating widget dragging
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [posStart, setPosStart] = useState({ x: 0, y: 0 });

  // Draggable handle ref
  const handleMouseDown = (e: React.MouseEvent) => {
    if (embedded) return; // Disable dragging in PiP or embedded views
    if (e.button !== 0) return; // Only left-click drag

    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("textarea") || target.closest("select")) {
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPosStart({ x: position.x, y: position.y });
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - dragStart.x;
      const dy = moveEvent.clientY - dragStart.y;
      setPosition({
        x: Math.max(12, Math.min(window.innerWidth - 380, posStart.x - dx)),
        y: Math.max(12, Math.min(window.innerHeight - 500, posStart.y - dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, posStart]);

  // Update local edited text when result changes or tab switches
  useEffect(() => {
    if (!result) return;
    if (activeResultTab === "dm") setEditedText(result.directMessage);
    else if (activeResultTab === "connection") setEditedText(result.connectionRequest);
    else if (activeResultTab === "followup") setEditedText(result.followUpMessage);
  }, [result, activeResultTab]);

  // Auto switch to results tab when generation finishes
  useEffect(() => {
    if (result && !loading) {
      setWidgetTab("result");
      if (draftType === "connection") {
        setActiveResultTab("connection");
      } else if (draftType === "followup") {
        setActiveResultTab("followup");
      } else {
        setActiveResultTab("dm");
      }
    }
  }, [result, loading, draftType]);

  const handleCopy = async () => {
    if (!editedText) return;
    const success = await copyToClipboard(editedText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleGenerate();
  };

  const handleParseScreenText = () => {
    if (!screenText.trim()) return;
    parseScreenContent(screenText);
  };

  // If floating is active and we are NOT in PiP, render floating panel
  const isWidgetVisible = isFloating && !isPiP && !embedded;

  const widgetStyles: React.CSSProperties = isWidgetVisible
    ? {
        position: "fixed",
        right: `${position.x}px`,
        bottom: `${position.y}px`,
        zIndex: 9999,
        width: "360px",
      }
    : {};

  if (!isWidgetVisible && !embedded && !isPiP) {
    return null;
  }

  // Header render
  const renderHeader = () => (
    <div
      onMouseDown={handleMouseDown}
      className={`px-4 py-3 bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-900 text-white rounded-t-2xl flex items-center justify-between border-b border-indigo-500/20 select-none ${
        !embedded ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-amber-400 animate-pulse" />
        <span className="text-xs font-bold tracking-wide">Outreach Drafter Widget</span>
        {aiMode === "off" && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[9px] text-amber-300 font-semibold border border-amber-500/30">
            Template (0ms)
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {!embedded && (
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-white/10 text-slate-300 transition-colors"
            title={isMinimized ? "Expand Drafter" : "Minimize Drafter"}
          >
            {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
        )}

        {typeof window !== "undefined" && "documentPictureInPicture" in window && !isPiP && (
          <button
            type="button"
            onClick={openPiP}
            className="p-1 rounded hover:bg-white/10 text-slate-300 transition-colors"
            title="Pop-out to always-on-top window (Google Meet style)"
          >
            <Tv size={13} />
          </button>
        )}

        {(isFloating || isPiP) && (
          <button
            type="button"
            onClick={() => {
              if (isPiP) {
                closePiP();
              }
              setIsFloating(false);
            }}
            className="p-1 rounded hover:bg-rose-500/20 text-rose-300 transition-colors"
            title="Dock back to page"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );

  if (isMinimized && !embedded && !isPiP) {
    return (
      <div
        style={{
          position: "fixed",
          right: `${position.x}px`,
          bottom: `${position.y}px`,
          zIndex: 9999,
        }}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl p-2.5 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all border border-indigo-400/30"
        onClick={() => setIsMinimized(false)}
      >
        <Sparkles size={18} className="text-amber-300" />
        <span className="text-xs font-semibold pr-2">Outreach Drafter</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsFloating(false);
          }}
          className="p-0.5 rounded-full hover:bg-black/20 text-white transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={widgetStyles}
      className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all max-h-[640px] ${
        embedded ? "w-full h-full border-none shadow-none" : ""
      }`}
    >
      {renderHeader()}

      <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* AI ON / OFF Mode Toggle Switch */}
        <div className="flex items-center justify-between bg-neutral-100 dark:bg-neutral-800/80 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700/60 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <Zap size={14} className={aiMode === "on" ? "text-amber-400 animate-pulse" : "text-neutral-400"} />
            <span className="text-[11px]">AI Generation Mode</span>
          </div>
          <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => setAiMode("off")}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                aiMode === "off"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              OFF (Fast)
            </button>
            <button
              type="button"
              onClick={() => setAiMode("on")}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                aiMode === "on"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              ON (LLM)
            </button>
          </div>
        </div>

        {/* Tab selection inside widget if result exists */}
        {result && (
          <div className="flex bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl w-full">
            <button
              type="button"
              onClick={() => setWidgetTab("edit")}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                widgetTab === "edit"
                  ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              Configure
            </button>
            <button
              type="button"
              onClick={() => setWidgetTab("result")}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                widgetTab === "result"
                  ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              Draft Result
            </button>
          </div>
        )}

        {widgetTab === "edit" ? (
          <div className="space-y-3">
            {/* Input Mode Selector: Single Target vs Screen Reader Scraper */}
            <div className="flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700/60">
              <button
                type="button"
                onClick={() => setInputMode("single")}
                className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  inputMode === "single"
                    ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-neutral-500"
                }`}
              >
                <User size={12} />
                <span>Single Target</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode("scraper")}
                className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all flex items-center justify-center gap-1 ${
                  inputMode === "scraper"
                    ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-neutral-500"
                }`}
              >
                <Users size={12} />
                <span>Screen Reader (Max 10)</span>
              </button>
            </div>

            {inputMode === "scraper" ? (
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    Paste LinkedIn Search Page / Screen Text
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Paste copied text from LinkedIn search results or candidate cards here..."
                    value={screenText}
                    onChange={(e) => setScreenText(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={handleParseScreenText}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Search size={13} />
                    <span>Parse Candidates (Up to 10)</span>
                  </button>
                </div>

                {parsedCandidates.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block flex items-center justify-between">
                      <span>Parsed Candidates ({parsedCandidates.length}/10):</span>
                      <span className="text-[9px] text-indigo-400">Click candidate to draft</span>
                    </span>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1 select-none">
                      {parsedCandidates.map((cand) => (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() => selectCandidate(cand)}
                          className={`w-full p-2 rounded-lg border text-left transition-all flex items-start justify-between ${
                            selectedCandidateId === cand.id
                              ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200"
                              : "bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
                          }`}
                        >
                          <div className="space-y-0.5 truncate">
                            <div className="text-xs font-bold truncate">{cand.name}</div>
                            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                              {cand.role} @ {cand.company}
                            </div>
                          </div>
                          {selectedCandidateId === cand.id && (
                            <CheckCircle2 size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-3">
                {/* Quick Presets */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Quick Presets:
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 select-none scrollbar-none">
                    {PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTargetInput(preset.targetInput);
                          setSpecialization(preset.specialization);
                          setTone(preset.tone);
                          setDraftType(preset.draftType);
                          setCustomHook(preset.customHook);
                        }}
                        className="shrink-0 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-indigo-500 rounded-lg text-[10px] transition-colors"
                      >
                        {preset.targetInput.split(",")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Field */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                    Target Contact / Company *
                  </label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. Karan Mukkarji, UI/UX Designer at Xtech Code"
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                </div>

                {/* Draft Type */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                    Preferred Format
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {DRAFT_TYPE_OPTIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDraftType(item.id)}
                        className={`py-1.5 px-1 rounded-lg border text-center transition-all text-[11px] font-medium capitalize ${
                          draftType === item.id
                            ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-semibold"
                            : "bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-400"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specialization */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                    Position Specialization
                  </label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-2 py-1.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
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
                  <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                    Portfolio Website
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                    <input
                      type="url"
                      placeholder="https://kumaraguru-dk.framer.website/"
                      value={userPortfolio}
                      onChange={(e) => setUserPortfolio(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-md flex items-center justify-center gap-1.5 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>{aiMode === "off" ? "Formatting..." : "Drafting via AI..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                      <span>
                        {aiMode === "off" ? "Generate Template (0ms)" : `Generate Outreach (${draftType})`}
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Inner Subtabs for Draft Formats */}
            {result && (
              <div className="flex bg-neutral-50 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50">
                <button
                  type="button"
                  onClick={() => setActiveResultTab("dm")}
                  className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-all ${
                    activeResultTab === "dm"
                      ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm border border-neutral-200/20"
                      : "text-neutral-500"
                  }`}
                >
                  Email/DM
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultTab("connection")}
                  className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-all ${
                    activeResultTab === "connection"
                      ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm border border-neutral-200/20"
                      : "text-neutral-500"
                  }`}
                >
                  LinkedIn Note
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResultTab("followup")}
                  className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-all ${
                    activeResultTab === "followup"
                      ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm border border-neutral-200/20"
                      : "text-neutral-500"
                  }`}
                >
                  Follow-Up
                </button>
              </div>
            )}

            {/* Subject Line for Email */}
            {activeResultTab === "dm" && result?.subjectLine && (
              <div className="space-y-1 bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block">
                  Subject Line
                </span>
                <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                  {result.subjectLine}
                </span>
              </div>
            )}

            {/* Text Editor Box */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-neutral-400">
                <span className="font-semibold uppercase tracking-wider">Draft Output</span>
                <span className="flex items-center gap-1.5">
                  <span>{editedText.length} chars</span>
                  {activeResultTab === "connection" && (
                    <span className={`px-1 rounded font-bold ${
                      editedText.length <= 220 
                        ? "bg-emerald-500/20 text-emerald-500"
                        : "bg-rose-500/20 text-rose-500"
                    }`}>
                      {editedText.length}/220
                    </span>
                  )}
                </span>
              </div>
              <textarea
                rows={7}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full p-3 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-sans leading-relaxed text-neutral-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Copy Button */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWidgetTab("edit")}
                className="flex-1 py-2 rounded-xl text-xs font-semibold border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1"
              >
                <ChevronLeft size={14} />
                <span>Edit Parameters</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? "Copied!" : "Copy Draft"}</span>
              </button>
            </div>

            {/* Value highlights bullet points */}
            {result?.valueHighlights && result.valueHighlights.length > 0 && (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block flex items-center gap-1">
                  <Zap size={10} /> Profile Highlights Used
                </span>
                <ul className="space-y-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                  {result.valueHighlights.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="w-1 h-1 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

