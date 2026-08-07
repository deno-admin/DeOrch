"use client";

import React, { useState, useRef } from "react";
import { 
  UploadCloud, 
  FileText, 
  Database, 
  Link2, 
  Target, 
  UserPlus,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  X,
  Zap
} from "lucide-react";
import Link from "next/link";
import { supabaseLeads } from "@/lib/supabaseLeads";
import { useRouter } from "next/navigation";

export default function LeadsImportPage() {
  const router = useRouter();
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{success?: boolean, message?: string} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sources = [
    { id: 'csv', name: 'CSV Upload', icon: FileText, desc: 'Import a standard CSV file', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { id: 'clay', name: 'Clay Integration', icon: Database, desc: 'Sync leads directly from Clay', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { id: 'apollo', name: 'Apollo Integration', icon: Target, desc: 'Import contacts from Apollo', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { id: 'linkedin', name: 'LinkedIn Scraper', icon: Link2, desc: 'Extract leads from LinkedIn URLs', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { id: 'manual', name: 'Manual Entry', icon: UserPlus, desc: 'Add leads one by one manually', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  ];

  const parseCsvRow = (rowStr: string) => {
    const cols = [];
    let inQuotes = false;
    let currentStr = '';
    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(currentStr.trim());
        currentStr = '';
      } else {
        currentStr += char;
      }
    }
    cols.push(currentStr.trim());
    return cols.map(c => c.replace(/^"|"$/g, '').trim());
  };

  const handleFileProcess = async (file: File) => {
    setIsUploading(true);
    setUploadStatus(null);
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n');
        if (rows.length > 1) {
          const headers = parseCsvRow(rows[0]).map(h => h.toLowerCase().trim());
          const newLeadsData: any[] = [];
          
          for (let i = 1; i < rows.length; i++) {
            if (!rows[i].trim()) continue;
            const cols = parseCsvRow(rows[i]);
            
            const getCol = (possibleNames: string[]) => {
              const idx = headers.findIndex(h => possibleNames.includes(h));
              const val = idx >= 0 && cols[idx] ? cols[idx] : '';
              return val ? val : 'N/A';
            };

            const name = getCol(['name', 'full name', 'fullname']);
            if (name === 'N/A') continue;

            const statusVal = getCol(['status']);
            const scoreStr = getCol(['score']);
            const webScoreStr = getCol(['website score', 'websitescore', 'website_score']);
            const batchVal = getCol(['batch']);

            newLeadsData.push({
              name: name,
              company: getCol(['company', 'company name']),
              role: getCol(['role', 'job title', 'title']),
              email: getCol(['email', 'email address']),
              location: getCol(['location', 'address']),
              domain: getCol(['domain', 'company domain', 'website']),
              linkedin: getCol(['linkedin', 'linkedin profile', 'linkedin url']),
              status: statusVal !== 'N/A' ? statusVal : "New",
              score: scoreStr !== 'N/A' ? parseInt(scoreStr, 10) || 0 : 0,
              website_score: webScoreStr !== 'N/A' ? parseInt(webScoreStr, 10) || 0 : 0,
              batch: batchVal !== 'N/A' ? batchVal : null,
            });
          }

          if (newLeadsData.length > 0) {
            const { error } = await supabaseLeads.from('deorch_leads').insert(newLeadsData);
            if (error) throw error;
            setUploadStatus({ success: true, message: `Successfully imported ${newLeadsData.length} leads.` });
            setTimeout(() => router.push('/leads'), 2000);
          } else {
            setUploadStatus({ success: false, message: "No valid lead data found in the CSV." });
          }
        }
        setIsUploading(false);
      };
      reader.readAsText(file);
    } catch (err: any) {
      console.error(err);
      setUploadStatus({ success: false, message: err.message || "An error occurred during import." });
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <Link href="/leads" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Leads
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Import Leads</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Add new prospects to your pipeline from various sources or files.</p>
      </div>

      {!activeSource ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source) => (
            <div 
              key={source.id}
              onClick={() => setActiveSource(source.id)}
              className="p-5 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
            >
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${source.bg}`}>
                  <source.icon className={`w-6 h-6 ${source.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">{source.name}</h3>
                  {source.id !== 'csv' && source.id !== 'manual' && (
                    <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
                      <Zap size={10} /> Auto-Sync
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 relative z-10">{source.desc}</p>
              <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all text-indigo-500 z-10">
                <ChevronRight size={20} />
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity bg-indigo-500 pointer-events-none"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sources.find(s => s.id === activeSource)?.bg}`}>
                {React.createElement(sources.find(s => s.id === activeSource)?.icon || FileText, { className: `w-5 h-5 ${sources.find(s => s.id === activeSource)?.color}` })}
              </div>
              <h2 className="text-xl font-bold">{sources.find(s => s.id === activeSource)?.name}</h2>
            </div>
            <button 
              onClick={() => { setActiveSource(null); setUploadStatus(null); }}
              className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {activeSource === 'csv' && (
            <div className="max-w-2xl mx-auto">
              {!uploadStatus ? (
                <div 
                  className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-colors ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' 
                      : 'border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileProcess(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                    <UploadCloud size={32} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Click or drag CSV file to upload</h3>
                  <p className="text-sm text-neutral-500 max-w-sm mb-8">
                    Make sure your CSV includes columns for Name, Company, Email, and Status.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Browse Files"
                    )}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv"
                    className="hidden" 
                  />
                </div>
              ) : (
                <div className={`p-8 rounded-2xl text-center border ${
                  uploadStatus.success 
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' 
                    : 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20'
                }`}>
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    uploadStatus.success ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400'
                  }`}>
                    {uploadStatus.success ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                  </div>
                  <h3 className={`text-lg font-bold mb-2 ${uploadStatus.success ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                    {uploadStatus.success ? 'Import Successful' : 'Import Failed'}
                  </h3>
                  <p className={uploadStatus.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {uploadStatus.message}
                  </p>
                  {!uploadStatus.success && (
                    <button 
                      onClick={() => setUploadStatus(null)}
                      className="mt-6 px-4 py-2 bg-white dark:bg-neutral-800 border shadow-sm rounded-lg text-sm font-medium"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSource !== 'csv' && (
            <div className="max-w-md mx-auto text-center py-12">
              <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-12">
                {React.createElement(sources.find(s => s.id === activeSource)?.icon || Target, { size: 40 })}
              </div>
              <h3 className="text-xl font-bold mb-2">Connect to {sources.find(s => s.id === activeSource)?.name.split(' ')[0]}</h3>
              <p className="text-neutral-500 mb-8">
                Authenticate with your {sources.find(s => s.id === activeSource)?.name.split(' ')[0]} account to automatically sync leads directly into your pipeline.
              </p>
              <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 rounded-xl text-sm font-semibold transition-all w-full flex justify-center items-center gap-2">
                Connect Account
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
