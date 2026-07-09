"use client";

import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Loader2, CheckCircle2, AlertCircle, Send } from "lucide-react";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [testResult, setTestResult] = useState<{ verified?: boolean; sent?: boolean; error?: string } | null>(null);

  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [secure, setSecure] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/smtp");
      const data = await res.json();
      if (data.host) setHost(data.host);
      if (data.port) setPort(data.port);
      if (data.username) setUsername(data.username);
      if (data.from_name) setFromName(data.from_name);
      if (data.from_email) setFromEmail(data.from_email);
      setSecure(!!data.secure);
      setHasPassword(!!data.hasPassword);
    } catch (err) {
      console.error("Failed to load SMTP settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/settings/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host,
          port,
          username,
          password: password || undefined,
          from_name: fromName,
          from_email: fromEmail,
          secure,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setSaveResult({ success: false, message: data.error });
      } else {
        setSaveResult({ success: true, message: "Saved." });
        setPassword("");
        await fetchSettings();
      }
    } catch (err) {
      console.error("Failed to save SMTP settings:", err);
      setSaveResult({ success: false, message: "Failed to save settings." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testRecipient ? { sendTestTo: testRecipient } : {}),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      console.error("SMTP test request failed:", err);
      setTestResult({ verified: false, error: "Test request failed." });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-neutral-500 font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Configure how DeOrch connects to external services.</p>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <SettingsIcon size={18} className="text-indigo-500" />
          <h2 className="text-lg font-bold">Mailer / SMTP Connection</h2>
        </div>
        <p className="text-sm text-neutral-500 mb-6">
          Used by the Mailer page to send your AI-drafted outreach emails. Works with any SMTP provider (Brevo, SES, Mailgun, SMTP2GO, etc).
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Host</label>
              <input required value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp-relay.brevo.com" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Port</label>
              <input required type="number" value={port} onChange={(e) => setPort(parseInt(e.target.value, 10) || 587)} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Username</label>
              <input required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex justify-between">
                <span>Password</span>
                {hasPassword && <span className="text-emerald-600 dark:text-emerald-400 text-xs font-normal">Saved ✓</span>}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={hasPassword ? "Leave blank to keep current" : "Required"}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">From Name</label>
              <input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Kumaran, Denovation" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">From Email</label>
              <input required type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="kumaran@denovation.in" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
            Use TLS/SSL on connect (port 465). Leave unchecked for STARTTLS (port 587).
          </label>

          {saveResult && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${saveResult.success ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"}`}>
              {saveResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {saveResult.message}
            </div>
          )}

          <button type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
            {isSaving && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
          <h3 className="text-sm font-semibold">Test Connection</h3>
          <div className="flex items-center gap-3">
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="Optional: send a real test email to..."
              className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button onClick={handleTest} disabled={isTesting} className="px-4 py-2 bg-neutral-900 dark:bg-neutral-800 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0">
              {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {testRecipient ? "Verify + Send Test" : "Verify Connection"}
            </button>
          </div>
          {testResult && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${testResult.verified ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"}`}>
              {testResult.verified ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {testResult.verified
                ? (testRecipient ? (testResult.sent ? "Connection verified and test email sent." : `Connection verified, but sending the test email failed: ${testResult.error}`) : "Connection verified.")
                : `Connection failed: ${testResult.error}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
