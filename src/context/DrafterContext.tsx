"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface DraftedMessages {
  subjectLine: string;
  directMessage: string;
  connectionRequest: string;
  followUpMessage: string;
  valueHighlights: string[];
  tipsForSuccess: string[];
}

interface DrafterContextType {
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
  
  loading: boolean;
  error: string | null;
  setError: (v: string | null) => void;
  result: DraftedMessages | null;
  setResult: (v: DraftedMessages | null) => void;
  handleGenerate: (e?: React.FormEvent) => Promise<void>;
  
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
  const [targetInput, setTargetInput] = useState("");
  const [userPortfolio, setUserPortfolio] = useState("https://kumaraguru-dk.framer.website/");
  const [tone, setTone] = useState("Direct & Punchy");
  const [specialization, setSpecialization] = useState("UI/UX Designer");
  const [draftType, setDraftType] = useState<"initial" | "connection" | "followup">("initial");
  const [customHook, setCustomHook] = useState("");

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

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!targetInput.trim()) {
      setError("Please enter the target person, position, and company.");
      return;
    }

    setError(null);
    setLoading(true);

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
    } catch (err: any) {
      setError(err.message || "Something went wrong generating the draft.");
    } finally {
      setLoading(false);
    }
  };

  const openPiP = async () => {
    if (typeof window === "undefined" || !("documentPictureInPicture" in window)) {
      alert("Document Picture-in-Picture is not supported in this browser. Try Chrome or Edge!");
      return;
    }

    try {
      // Close existing if open
      if (pipWindow) {
        pipWindow.close();
      }

      const pip = await (window as any).documentPictureInPicture.requestWindow({
        width: 440,
        height: 720,
      });

      // Copy stylesheet links and styles to the PiP window
      const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"));
      styles.forEach((node) => {
        pip.document.head.appendChild(node.cloneNode(true));
      });

      // Add dark mode context class to the PiP window's HTML/body
      pip.document.documentElement.className = document.documentElement.className;
      pip.document.body.className = document.body.className + " bg-neutral-50 dark:bg-neutral-950 p-4 overflow-auto min-h-screen";

      // Set titles
      pip.document.title = "Outreach Drafter widget";

      setPipWindow(pip);
      setIsPiP(true);

      // Listen for when the user closes the PiP window directly
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
        loading,
        error,
        setError,
        result,
        setResult,
        handleGenerate,
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
