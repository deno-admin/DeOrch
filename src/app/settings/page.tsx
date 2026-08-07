"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
  Plus,
  Trash2,
  Edit,
  Check,
  Globe,
  Mail,
  Shield,
  ShieldAlert,
  X,
  RefreshCw,
} from "lucide-react";

interface SMTPConfig {
  id: number;
  host: string;
  port: number;
  username: string;
  from_name: string | null;
  from_email: string;
  secure: boolean;
  isActive: boolean;
  hasPassword: boolean;
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [configs, setConfigs] = useState<SMTPConfig[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SMTPConfig | null>(null);

  // Form State
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [secure, setSecure] = useState(false);

  // Action Status States
  const [isSaving, setIsSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testingUnsaved, setTestingUnsaved] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [testResult, setTestResult] = useState<{ id: number | 'unsaved'; verified?: boolean; sent?: boolean; error?: string } | null>(null);

  const fetchConfigs = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/settings/smtp");
      if (!res.ok) throw new Error("Failed to fetch SMTP configurations");
      const data = await res.json();
      setConfigs(data);
    } catch (err) {
      console.error("Failed to load SMTP settings:", err);
      setErrorMsg("Failed to load SMTP configurations. Please check database connectivity.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const openAddModal = () => {
    setEditingConfig(null);
    setHost("");
    setPort(587);
    setUsername("");
    setPassword("");
    setFromName("");
    setFromEmail("");
    setSecure(false);
    setTestResult(null);
    setIsModalOpen(true);
  };

  const openEditModal = (config: SMTPConfig) => {
    setEditingConfig(config);
    setHost(config.host);
    setPort(config.port);
    setUsername(config.username);
    setPassword(""); // Keep blank to keep current
    setFromName(config.from_name || "");
    setFromEmail(config.from_email);
    setSecure(config.secure);
    setTestResult(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/settings/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingConfig?.id,
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
        throw new Error(data.error);
      }

      setIsModalOpen(false);
      await fetchConfigs();
    } catch (err: any) {
      console.error("Failed to save SMTP settings:", err);
      setErrorMsg(err.message || "Failed to save configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this SMTP configuration?")) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/settings/smtp?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      await fetchConfigs();
    } catch (err: any) {
      console.error("Failed to delete SMTP config:", err);
      setErrorMsg(err.message || "Failed to delete configuration.");
    }
  };

  const handleSelectActive = async (id: number) => {
    setErrorMsg(null);
    try {
      // Optimistic update
      setConfigs(prev => prev.map(c => ({ ...c, isActive: c.id === id })));

      const res = await fetch("/api/settings/smtp/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      await fetchConfigs();
    } catch (err: any) {
      console.error("Failed to set active SMTP:", err);
      setErrorMsg(err.message || "Failed to set active connection.");
      await fetchConfigs(); // Revert on failure
    }
  };

  const handleTestConnection = async (id: number) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, sendTestTo: testRecipient || undefined }),
      });
      const data = await res.json();
      setTestResult({ id, ...data });
    } catch (err) {
      console.error("SMTP test connection failed:", err);
      setTestResult({ id, verified: false, error: "Test request failed." });
    } finally {
      setTestingId(null);
    }
  };

  const handleTestUnsaved = async () => {
    setTestingUnsaved(true);
    setTestResult(null);
    try {
      // Send raw payload to test API directly (simulated using test route or check params)
      // Since our test API is structured to load from DB, let's notify users they must save before testing,
      // or we can test the saved config if it already has an ID.
      if (!editingConfig) {
        setTestResult({ id: 'unsaved', verified: false, error: "Please save the configuration before testing." });
        setTestingUnsaved(false);
        return;
      }
      const res = await fetch("/api/settings/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingConfig.id, sendTestTo: testRecipient || undefined }),
      });
      const data = await res.json();
      setTestResult({ id: 'unsaved', ...data });
    } catch (err) {
      console.error("SMTP test failed:", err);
      setTestResult({ id: 'unsaved', verified: false, error: "Test request failed." });
    } finally {
      setTestingUnsaved(false);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Configure outreach connections and active services.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-2"
        >
          <Plus size={18} />
          Add Connection
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Error</p>
            <p className="mt-0.5 opacity-90">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Connection Manager Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/30 dark:bg-neutral-900/30">
          <div className="flex items-center gap-2">
            <SettingsIcon size={20} className="text-indigo-500" />
            <h2 className="text-lg font-bold">Mailer / SMTP Connections</h2>
          </div>
          <button 
            onClick={fetchConfigs}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 dark:text-neutral-400"
            title="Reload configs"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {configs.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 text-neutral-400">
              <Mail size={24} />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">No SMTP configuration</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              Add an SMTP configuration to start sending outreach emails. Works with Brevo, Mailgun, AWS SES, or any custom SMTP server.
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all"
            >
              Add Your First SMTP
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {configs.map((config) => {
              const isTesting = testingId === config.id;
              const hasTestResult = testResult && testResult.id === config.id;

              return (
                <div
                  key={config.id}
                  className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
                    config.isActive
                      ? "bg-indigo-500/[0.02] border-l-4 border-l-indigo-600"
                      : "border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-neutral-950 dark:text-white text-sm">
                        {config.from_name || "SMTP Connection"}
                      </h3>
                      {config.isActive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400 animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <Globe size={13} className="text-neutral-400 shrink-0" />
                        <span className="truncate">{config.host}:{config.port}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail size={13} className="text-neutral-400 shrink-0" />
                        <span className="truncate">{config.username}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Shield size={13} className="text-neutral-400 shrink-0" />
                        <span>{config.secure ? "SSL/TLS (Port 465)" : "STARTTLS / Plain"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Make Active Button */}
                    {!config.isActive && (
                      <button
                        onClick={() => handleSelectActive(config.id)}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-indigo-600 dark:bg-neutral-800 dark:hover:bg-indigo-600 text-neutral-700 dark:text-neutral-300 hover:text-white dark:hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Check size={13} />
                        Select Active
                      </button>
                    )}

                    {/* Test Connection Button */}
                    <button
                      onClick={() => handleTestConnection(config.id)}
                      disabled={isTesting}
                      className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isTesting ? (
                        <Loader2 size={13} className="animate-spin text-neutral-400" />
                      ) : (
                        <Send size={13} />
                      )}
                      Test
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(config)}
                      className="p-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-lg text-neutral-500 hover:text-neutral-855 dark:text-neutral-400 dark:hover:text-white transition-colors"
                      title="Edit Connection"
                    >
                      <Edit size={13} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="p-2 border border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-950/20 rounded-lg text-rose-600 dark:text-rose-400 transition-colors"
                      title="Delete Connection"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Inline Test Result */}
                  {hasTestResult && testResult && (
                    <div className="w-full mt-3 p-3 rounded-lg text-xs border animate-in fade-in slide-in-from-top-1 duration-200 flex items-start gap-2.5 bg-neutral-50/50 dark:bg-neutral-900/50 border-neutral-200/50 dark:border-neutral-850">
                      {testResult.verified ? (
                        <>
                          <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Connection Successful!</span>
                            {testResult.sent ? (
                              <p className="mt-0.5 text-neutral-500">Test verification email sent successfully.</p>
                            ) : testResult.error ? (
                              <p className="mt-0.5 text-rose-600 dark:text-rose-400">Connection succeeded, but send failed: {testResult.error}</p>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={14} className="text-rose-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-rose-700 dark:text-rose-400">Connection Failed</span>
                            <p className="mt-0.5 text-neutral-500">{testResult.error}</p>
                          </div>
                        </>
                      )}
                      <button
                        onClick={() => setTestResult(null)}
                        className="ml-auto p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Global test recipient configuration footer */}
        {configs.length > 0 && (
          <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <div className="space-y-0.5">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Test Recipient Address</span>
              <p>Configure a destination email to send actual outreach tests when clicking Verify.</p>
            </div>
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="e.g. you@example.com"
              className="px-3 py-1.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
            />
          </div>
        )}
      </div>

      {/* Add / Edit Connection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <SettingsIcon size={18} className="text-indigo-500" />
                {editingConfig ? "Edit SMTP Connection" : "Add SMTP Connection"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Host</label>
                  <input
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="e.g. smtp-relay.brevo.com"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Port</label>
                  <input
                    required
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value, 10) || 587)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Username</label>
                  <input
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. account@brevo.com"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex justify-between">
                    <span>Password</span>
                    {editingConfig?.hasPassword && (
                      <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-normal">Saved ✓</span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingConfig?.hasPassword ? "Leave blank to keep current" : "Required"}
                    required={!editingConfig?.hasPassword}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">From Name</label>
                  <input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="e.g. Kumaran, Denovation"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">From Email</label>
                  <input
                    required
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="e.g. outreach@denovation.in"
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium py-1 text-neutral-600 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                />
                Use TLS/SSL on connect (port 465). Leave unchecked for STARTTLS (port 587).
              </label>

              {/* Modal level test result */}
              {testResult && testResult.id === 'unsaved' && (
                <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                  testResult.verified 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-emerald-900/30" 
                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-450 dark:border-rose-900/30"
                }`}>
                  {testResult.verified ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <div>
                    {testResult.verified 
                      ? (testResult.sent ? "Connection verified and test email sent successfully." : "Connection verified successfully.")
                      : `Connection failed: ${testResult.error}`}
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3 border-t border-neutral-100 dark:border-neutral-800">
                {editingConfig && (
                  <button
                    type="button"
                    onClick={handleTestUnsaved}
                    disabled={testingUnsaved}
                    className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {testingUnsaved ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Verify Config
                  </button>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
