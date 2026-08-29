"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { parseSingleTargetInput, parseCandidatesFromText, ParsedCandidate } from "@/lib/scraper/candidateScraper";

export interface DraftedMessages {
  subjectLine: string;
  directMessage: string;
  connectionRequest: string;
  followUpMessage: string;
  valueHighlights: string[];
  tipsForSuccess: string[];
}

interface DrafterContextType {
  aiMode: "off" | "on";
  setAiMode: (v: "off" | "on") => void;

  targetInput: string;
  setTargetInput: (v: string) => void;
  userPortfolio: string;
  setUserPortfolio: (v: string) => void;
  tone: string;
  setTone: (v: string) => void;
  specialization: string;
  setSpecialization: (v: string) => void;
  draftType: "initial" | "connection" | "followup";
  setDraftType: (v: "initial" | "connection" | "followup") => void;
  customHook: string;
  setCustomHook: (v: string) => void;

  parsedCandidates: ParsedCandidate[];
  setParsedCandidates: (v: ParsedCandidate[]) => void;
  selectedCandidateId: string | null;
  selectCandidate: (candidate: ParsedCandidate) => void;
  parseScreenContent: (rawText: string) => ParsedCandidate[];
  parseScreenContentWithAI: (rawText: string) => Promise<ParsedCandidate[]>;
  parsingLoading: boolean;

  loading: boolean;
  error: string | null;
  setError: (v: string | null) => void;
  result: DraftedMessages | null;
  setResult: (v: DraftedMessages | null) => void;
  handleGenerate: (e?: React.FormEvent, overrideInput?: string) => Promise<void>;
  copyToClipboard: (text: string, targetDoc?: Document) => Promise<boolean>;

  isFloating: boolean;
  setIsFloating: (v: boolean) => void;
  isPiP: boolean;
  setIsPiP: (v: boolean) => void;
  isMinimized: boolean;
  setIsMinimized: (v: boolean) => void;

  openPiP: () => Promise<void>;
  closePiP: () => void;
  pipWindow: Window | null;
}

const DrafterContext = createContext<DrafterContextType | undefined>(undefined);

export function DrafterProvider({ children }: { children: React.ReactNode }) {
  const [aiMode, setAiMode] = useState<"off" | "on">("off"); // Default OFF per requirement

  const [targetInput, setTargetInput] = useState("");
  const [userPortfolio, setUserPortfolio] = useState("https://kumaraguru-dk.framer.website/");
  const [tone, setTone] = useState("Direct & Punchy");
  const [specialization, setSpecialization] = useState("UI/UX Designer");
  const [draftType, setDraftType] = useState<"initial" | "connection" | "followup">("initial");
  const [customHook, setCustomHook] = useState("");

  const [parsedCandidates, setParsedCandidates] = useState<ParsedCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [parsingLoading, setParsingLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DraftedMessages | null>(null);

  const [isFloating, setIsFloating] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  // Sync isFloating if PiP is opened
  useEffect(() => {
    if (isPiP) {
      setIsFloating(false);
    }
  }, [isPiP]);

  // Clean up PiP on unmount
  useEffect(() => {
    return () => {
      if (pipWindow) {
        pipWindow.close();
      }
    };
  }, [pipWindow]);

  const generateTemplateDraft = (parsed: { name: string; role: string; company: string }) => {
    const portfolioUrl = userPortfolio.trim() || "https://kumaraguru-dk.framer.website/";
    const phone = "+91 8925161453";

    // Direct user-specified exact template output
    const directMessage = `Hi ${parsed.name},

I'm Kumaragurubaran, a User Experience Designer currently exploring new opportunities. I noticed your work at ${parsed.company} and wanted to reach out.

I currently work at Denovation across digital products and brand experiences, taking projects from requirements through visual design and implementation. Previously, I was the founding UI/UX designer for vorrei.io, a multi-organization SaaS platform at Vorreix, where I built out user flows, design systems, and high-fidelity UI.

I'm interested in ${parsed.role} roles and would appreciate knowing if ${parsed.company} has any current or upcoming openings. If my profile aligns, I'd be grateful for any guidance or a referral.

Portfolio: ${portfolioUrl}
Phone: ${phone}

Best regards,
Kumaragurubaran`;

    const subjectLine = `UI/UX Designer Application - ${parsed.company} | Kumaragurubaran`;

    // LinkedIn Connection Note strictly under 220 characters
    const connectionRequest = `Hi ${parsed.name}, I noticed your work at ${parsed.company} & wanted to reach out! Currently UX Designer at Denovation ex-Vorreix (vorrei.io SaaS). Portfolio: ${portfolioUrl}`;

    const followUpMessage = `Hi ${parsed.name}, following up on my previous message regarding ${parsed.role} opportunities at ${parsed.company}. I'd love to connect if you're open to it. Portfolio: ${portfolioUrl}`;

    const draftedData: DraftedMessages = {
      subjectLine,
      directMessage,
      connectionRequest,
      followUpMessage,
      valueHighlights: [
        `Target Parsed: ${parsed.name} (${parsed.role} @ ${parsed.company})`,
        `Factual Integrity: Includes Denovation & Vorreix proof points`,
        `No AI Touch: Deterministic human output template`,
      ],
      tipsForSuccess: [
        `Review name and company replacements before sending`,
        `Use LinkedIn note for quick 1-click connection requests`,
      ],
    };

    setResult(draftedData);
    setLoading(false);
  };

  const selectCandidate = (candidate: ParsedCandidate) => {
    setSelectedCandidateId(candidate.id);
    setTargetInput(candidate.formattedTarget);
    if (aiMode === "off") {
      generateTemplateDraft({
        name: candidate.name,
        role: candidate.role,
        company: candidate.company,
      });
    }
  };

  const parseScreenContent = (rawText: string) => {
    const list = parseCandidatesFromText(rawText);
    setParsedCandidates(list);
    if (list.length > 0) {
      selectCandidate(list[0]);
    }
    return list;
  };

  const parseScreenContentWithAI = async (rawText: string): Promise<ParsedCandidate[]> => {
    setParsingLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scraper/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });

      const data = await res.json();
      if (!res.ok || !data.candidates) {
        throw new Error(data.error || "Failed to parse candidates with AI.");
      }

      const list: ParsedCandidate[] = data.candidates;
      setParsedCandidates(list);
      if (list.length > 0) {
        selectCandidate(list[0]);
      }
      return list;
    } catch (err: any) {
      console.warn("AI candidate parsing failed, falling back to local regex:", err);
      const fallbackList = parseScreenContent(rawText);
      return fallbackList;
    } finally {
      setParsingLoading(false);
    }
  };

  const handleGenerate = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();

    const textToUse = overrideInput || targetInput;

    if (!textToUse.trim()) {
      setError("Please enter the target person, position, and company.");
      return;
    }

    setError(null);
    setLoading(true);

    if (aiMode === "off") {
      // Find candidate if selected, or parse single target input
      const matched = parsedCandidates.find((c) => c.id === selectedCandidateId);
      if (matched) {
        generateTemplateDraft({
          name: matched.name,
          role: matched.role,
          company: matched.company,
        });
      } else {
        const parsed = parseSingleTargetInput(textToUse);
        generateTemplateDraft(parsed);
      }
      return;
    }

    // AI ON Mode: Call NVIDIA LLM API endpoint for custom AI generation
    try {
      const res = await fetch("/api/drafter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetInput: textToUse,
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
    } catch (err: any) {
      setError(err.message || "Something went wrong generating the draft.");
    } finally {
      setLoading(false);
    }
  };

  // Cross-document clipboard copy helper for main document and PiP window
  const copyToClipboard = async (text: string, targetDoc?: Document): Promise<boolean> => {
    const doc = targetDoc || (pipWindow ? pipWindow.document : document);

    try {
      if (doc.defaultView && doc.defaultView.navigator && doc.defaultView.navigator.clipboard) {
        await doc.defaultView.navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      console.warn("navigator.clipboard failed, attempting execCommand fallback:", e);
    }

    // Fallback using temporary textarea in target document context
    try {
      const textarea = doc.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      doc.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = doc.execCommand("copy");
      doc.body.removeChild(textarea);
      return success;
    } catch (err) {
      console.error("ExecCommand copy failed:", err);
      return false;
    }
  };

  const openPiP = async () => {
    if (typeof window === "undefined" || !("documentPictureInPicture" in window)) {
      alert("Document Picture-in-Picture is not supported in this browser. Try Chrome or Edge!");
      return;
    }

    try {
      if (pipWindow) {
        pipWindow.close();
      }

      const pip = await (window as any).documentPictureInPicture.requestWindow({
        width: 440,
        height: 720,
      });

      const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"));
      styles.forEach((node) => {
        pip.document.head.appendChild(node.cloneNode(true));
      });

      pip.document.documentElement.className = document.documentElement.className;
      pip.document.body.className = document.body.className + " bg-neutral-50 dark:bg-neutral-950 p-4 overflow-auto min-h-screen";
      pip.document.title = "Outreach Drafter widget";

      setPipWindow(pip);
      setIsPiP(true);

      pip.addEventListener("pagehide", () => {
        setIsPiP(false);
        setPipWindow(null);
      });
    } catch (err) {
      console.error("Failed to open PiP window:", err);
      setError("Failed to open floating Picture-in-Picture window.");
    }
  };

  const closePiP = () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
    }
    setIsPiP(false);
  };

  return (
    <DrafterContext.Provider
      value={{
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
        setParsedCandidates,
        selectedCandidateId,
        selectCandidate,
        parseScreenContent,
        parseScreenContentWithAI,
        parsingLoading,
        loading,
        error,
        setError,
        result,
        setResult,
        handleGenerate,
        copyToClipboard,
        isFloating,
        setIsFloating,
        isPiP,
        setIsPiP,
        isMinimized,
        setIsMinimized,
        openPiP,
        closePiP,
        pipWindow,
      }}
    >
      {children}
    </DrafterContext.Provider>
  );
}

export function useDrafter() {
  const context = useContext(DrafterContext);
  if (context === undefined) {
    throw new Error("useDrafter must be used within a DrafterProvider");
  }
  return context;
}

