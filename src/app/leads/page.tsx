"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Building2, 
  Download, 
  Filter, 
  Kanban, 
  List, 
  MoreHorizontal, 
  Plus, 
  Search, 
  Tag, 
  Upload,
  X,
  Edit2,
  Trash2,
  MapPin,
  Globe,
  Link2,
  Mail,
  Copy,
  ChevronDown,
  Check
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const COLUMNS = ["New", "Qualified", "Contacted", "Follow Up", "Meeting Scheduled"];

export default function LeadsPage() {
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('id', { ascending: false });
      
    if (data) setLeads(data);
    setIsLoading(false);
  };
  
  // States for search and filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const [editingLead, setEditingLead] = useState<any>(null);
  const [initialStatusForAdd, setInitialStatusForAdd] = useState("New");

  // Global Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // Global Status Dropdown state
  const [openStatusId, setOpenStatusId] = useState<number | null>(null);
  const [statusPos, setStatusPos] = useState({ top: 0, left: 0, width: 0 });

  // File Input Ref for Upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns when scrolling or clicking outside
  useEffect(() => {
    const handleClose = () => {
      setOpenDropdownId(null);
      setOpenStatusId(null);
      setIsFilterModalOpen(false);
    };
    window.addEventListener("scroll", handleClose, true);
    return () => window.removeEventListener("scroll", handleClose, true);
  }, []);

  // Listen for global Add Lead event
  useEffect(() => {
    const handleGlobalAddLead = () => {
      setEditingLead(null);
      setInitialStatusForAdd("New");
      setIsAddModalOpen(true);
    };
    window.addEventListener('openAddLeadModal', handleGlobalAddLead);
    return () => window.removeEventListener('openAddLeadModal', handleGlobalAddLead);
  }, []);

  // Derived filtered leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.role.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === "All" || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleExport = () => {
    const headers = ["ID", "Name", "Company", "Role", "Email", "Status", "Score", "Website Score", "Added Date"];
    const csvData = [
      headers.join(","),
      ...filteredLeads.map(l => 
        [l.id, `"${l.name}"`, `"${l.company}"`, `"${l.role}"`, `"${l.email}"`, l.status, l.score, l.websiteScore, `"${l.created_at}"`].join(",")
      )
    ].join("\n");
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "deorch_leads_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
            if (name === 'N/A') continue; // Skip invalid rows

            const statusVal = getCol(['status']);
            const scoreStr = getCol(['score']);
            const webScoreStr = getCol(['website score', 'websitescore']);

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
              websiteScore: webScoreStr !== 'N/A' ? parseInt(webScoreStr, 10) || 0 : 0,
            });
          }
          
          if (newLeadsData.length > 0) {
            const { data, error } = await supabase.from('leads').insert(newLeadsData).select();
            if (error) {
              console.error("Error inserting leads:", error);
            }
            if (data) {
              setLeads(prev => [...data, ...prev]);
            }
          }
        }
      };
      reader.readAsText(file);
      
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploadModalOpen(false);
    }
  };

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
  };

  const handleScoreChange = async (leadId: number, type: 'score' | 'websiteScore', value: number) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, [type]: value } : l));
    await supabase.from('leads').update({ [type]: value }).eq('id', leadId);
  };

  const handleDeleteLead = async (leadId: number) => {
    setLeads(leads.filter(l => l.id !== leadId));
    setOpenDropdownId(null);
    await supabase.from('leads').delete().eq('id', leadId);
  };

  const openAddModal = (status = "New") => {
    setEditingLead(null);
    setInitialStatusForAdd(status);
    setIsAddModalOpen(true);
  };

  const openEditModal = (lead: any) => {
    setEditingLead(lead);
    setIsAddModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleAddOrEditLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const getFormStr = (name: string) => {
      const val = formData.get(name) as string;
      return val && val.trim() !== '' ? val.trim() : 'N/A';
    };

    const newLeadData = {
      name: getFormStr("name"),
      company: getFormStr("company"),
      role: getFormStr("role"),
      email: getFormStr("email"),
      location: getFormStr("location"),
      domain: getFormStr("domain"),
      linkedin: getFormStr("linkedin"),
      status: formData.get("status") as string,
      score: parseInt((formData.get("score") as string) || "5", 10),
      websiteScore: parseInt((formData.get("websiteScore") as string) || "5", 10),
    };

    if (editingLead) {
      setLeads(leads.map(l => l.id === editingLead.id ? { ...l, ...newLeadData } : l));
      await supabase.from('leads').update(newLeadData).eq('id', editingLead.id);
    } else {
      const tempId = Date.now();
      setLeads([{ id: tempId, ...newLeadData }, ...leads]);
      const { data, error } = await supabase.from('leads').insert([newLeadData]).select();
      if (data && data[0]) {
        setLeads(prev => prev.map(l => l.id === tempId ? data[0] : l));
      }
    }
    setIsAddModalOpen(false);
  };

  const toggleDropdown = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.right - 144 });
    setOpenDropdownId(openDropdownId === id ? null : id);
    setOpenStatusId(null);
  };

  const toggleStatusDropdown = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setStatusPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(160, rect.width) });
    setOpenStatusId(openStatusId === id ? null : id);
    setOpenDropdownId(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col relative" onClick={() => setIsFilterModalOpen(false)}>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Manage and track your prospective clients.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1">
            <button 
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${view === 'table' ? 'bg-white dark:bg-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}`}
              onClick={() => setView('table')}
            >
              <List size={16} /> Table
            </button>
            <button 
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${view === 'kanban' ? 'bg-white dark:bg-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}`}
              onClick={() => setView('kanban')}
            >
              <Kanban size={16} /> Pipeline
            </button>
          </div>
          
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
            title="Import Leads"
          >
            <Upload size={18} />
          </button>

          <button 
            onClick={() => openAddModal("New")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Add Lead
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto relative">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search leads by name, company..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
            />
          </div>
          
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsFilterModalOpen(!isFilterModalOpen); }}
              className={`px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${statusFilter !== 'All' ? 'text-indigo-600 border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
            >
              <Filter size={16} />
              Filters {statusFilter !== 'All' && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
            </button>
            
            {/* Filter Dropdown */}
            {isFilterModalOpen && (
              <div 
                className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-20 p-2 flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-xs font-semibold text-neutral-500 px-3 py-2 uppercase tracking-wider">Status</p>
                {['All', ...COLUMNS].map(status => (
                  <button
                    key={status}
                    onClick={() => { setStatusFilter(status); setIsFilterModalOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between ${statusFilter === status ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  >
                    {status}
                    {statusFilter === status && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-500">Showing {filteredLeads.length} leads</span>
          <button 
            onClick={handleExport}
            className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm flex flex-col relative">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <p className="text-neutral-500 font-medium">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No leads found</h3>
            <p className="text-neutral-500 max-w-sm">We couldn't find any leads matching your current search and filter criteria.</p>
            <button 
              onClick={() => { setSearchQuery(""); setStatusFilter("All"); }}
              className="mt-4 text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-sm"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          view === 'table' ? (
            <TableView leads={filteredLeads} toggleDropdown={toggleDropdown} toggleStatusDropdown={toggleStatusDropdown} onScoreChange={handleScoreChange} />
          ) : (
            <KanbanView leads={filteredLeads} toggleDropdown={toggleDropdown} onStatusChange={handleStatusChange} onAddLead={openAddModal} onScoreChange={handleScoreChange} />
          )
        )}
      </div>

      {/* Global Fixed Dropdown for Actions */}
      {openDropdownId && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }}
            onWheel={() => setOpenDropdownId(null)}
            onTouchMove={() => setOpenDropdownId(null)}
          />
          <div 
            className="fixed bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-[9999] p-1 flex flex-col"
            style={{ top: dropdownPos.top, left: dropdownPos.left, width: '9rem' }}
          >
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                const lead = leads.find(l => l.id === openDropdownId);
                if (lead) openEditModal(lead); 
              }} 
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 transition-colors text-neutral-700 dark:text-neutral-300"
            >
              <Edit2 size={14} /> Edit Lead
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                handleDeleteLead(openDropdownId); 
              }} 
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center gap-2 transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}

      {/* Global Fixed Dropdown for Status Change */}
      {openStatusId && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={(e) => { e.stopPropagation(); setOpenStatusId(null); }}
            onWheel={() => setOpenStatusId(null)}
            onTouchMove={() => setOpenStatusId(null)}
          />
          <div 
            className="fixed bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-[9999] p-1 flex flex-col"
            style={{ top: statusPos.top, left: statusPos.left, width: `${statusPos.width}px`, minWidth: '160px' }}
          >
            <p className="text-[10px] font-semibold text-neutral-500 px-3 py-1.5 uppercase tracking-wider mb-1">Set Status</p>
            {COLUMNS.map(status => (
              <button
                key={status}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleStatusChange(openStatusId, status);
                  setOpenStatusId(null);
                }}
                className={`w-full text-left px-2 py-1.5 text-sm rounded-lg transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800`}
              >
                <StatusBadge status={status} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Upload/Import Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold">Import Leads</h2>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div 
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors ${
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
                    handleFileChange({ target: { files: e.dataTransfer.files } } as any);
                  }
                }}
              >
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                  <Upload size={24} />
                </div>
                <h3 className="text-sm font-semibold mb-1">Click or drag CSV to upload</h3>
                <p className="text-xs text-neutral-500 text-center max-w-[200px] mb-6">
                  Upload a standard CSV file containing lead information to add them to your pipeline.
                </p>
                <button 
                  onClick={handleUploadClick}
                  className="px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  Browse Files
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xlsx"
                  className="hidden" 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold">{editingLead ? "Edit Lead" : "Add New Lead"}</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddOrEditLead} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name</label>
                  <input required name="name" defaultValue={editingLead?.name} type="text" placeholder="John Doe" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email</label>
                  <input name="email" defaultValue={editingLead?.email !== 'N/A' ? editingLead?.email : ''} type="email" placeholder="john@company.com" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Company Name</label>
                  <input required name="company" defaultValue={editingLead?.company} type="text" placeholder="Company Inc." className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Job Title</label>
                  <input required name="role" defaultValue={editingLead?.role} type="text" placeholder="Director of Sales" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Location</label>
                  <input name="location" defaultValue={editingLead?.location !== 'N/A' ? editingLead?.location : ''} type="text" placeholder="City, State" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Company Domain</label>
                  <input name="domain" defaultValue={editingLead?.domain !== 'N/A' ? editingLead?.domain : ''} type="text" placeholder="company.com" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">LinkedIn Profile URL</label>
                  <input name="linkedin" defaultValue={editingLead?.linkedin !== 'N/A' ? editingLead?.linkedin : ''} type="text" placeholder="https://linkedin.com/in/..." className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Status</label>
                  <select name="status" defaultValue={editingLead?.status || initialStatusForAdd} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    {COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex justify-between">
                    <span>Lead Score</span>
                    <span className="text-neutral-500 font-normal text-xs">(0-10)</span>
                  </label>
                  <input required name="score" defaultValue={editingLead?.score || 5} type="number" min="0" max="10" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex justify-between">
                    <span>Website Score</span>
                    <span className="text-neutral-500 font-normal text-xs">(0-10)</span>
                  </label>
                  <input required name="websiteScore" defaultValue={editingLead?.websiteScore || 5} type="number" min="0" max="10" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                  {editingLead ? "Save Changes" : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Table View Component
function TableView({ 
  leads, toggleDropdown, toggleStatusDropdown, onScoreChange
}: { 
  leads: any[], toggleDropdown: (e: React.MouseEvent, id: number) => void, toggleStatusDropdown: (e: React.MouseEvent, id: number) => void, onScoreChange: (id: number, type: 'score' | 'websiteScore', value: number) => void
}) {
  
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (text === 'N/A') return;
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const statusStyles: Record<string, string> = {
    'New': 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    'Qualified': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    'Contacted': 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
    'Follow Up': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    'Meeting Scheduled': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
  };

  return (
    <div className="overflow-x-auto min-h-[400px]">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-xs uppercase tracking-wider text-neutral-500 sticky top-0 z-10 backdrop-blur-md">
            <th className="p-4 font-semibold w-12 text-center">
              <input type="checkbox" className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
            </th>
            <th className="p-4 font-semibold w-[20%]">Lead Info</th>
            <th className="p-4 font-semibold w-[15%]">Role & Company</th>
            <th className="p-4 font-semibold w-[15%]">Location</th>
            <th className="p-4 font-semibold w-[15%]">Links</th>
            <th className="p-4 font-semibold w-[17%]">Scores</th>
            <th className="p-4 font-semibold w-[10%]">Status</th>
            <th className="p-4 font-semibold w-[10%] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors group">
              <td className="p-4 text-center">
                <input type="checkbox" className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
              </td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 shrink-0">
                    {lead.name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm line-clamp-1">{lead.name}</h4>
                    {lead.email !== 'N/A' ? (
                      <div 
                        className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5 group/mail cursor-pointer hover:text-neutral-900 dark:hover:text-white transition-colors"
                        onClick={(e) => copyToClipboard(e, lead.email)}
                        title="Copy Email"
                      >
                        <Mail size={10} className="text-neutral-400 group-hover/mail:text-indigo-500" />
                        <span className="line-clamp-1">{lead.email}</span>
                        {copiedEmail === lead.email ? (
                          <Check size={10} className="text-emerald-500" />
                        ) : (
                          <Copy size={10} className="opacity-0 group-hover/mail:opacity-100 text-indigo-500 transition-opacity" />
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400">N/A</span>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-4">
                <div>
                  <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-200 line-clamp-1" title={lead.company}>{lead.company}</h4>
                  <p className="text-xs text-neutral-500 line-clamp-1" title={lead.role}>{lead.role}</p>
                </div>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  <MapPin size={12} className="shrink-0 text-neutral-400" />
                  <span className="line-clamp-2" title={lead.location}>{lead.location || 'N/A'}</span>
                </div>
              </td>
              <td className="p-4">
                <div className="flex flex-col gap-2">
                  {lead.domain !== 'N/A' && lead.domain ? (
                    <a href={`https://${lead.domain}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline w-fit">
                      <Globe size={12} className="shrink-0" />
                      <span className="line-clamp-1" title={lead.domain}>{lead.domain}</span>
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-400 flex items-center gap-1.5"><Globe size={12} /> N/A</span>
                  )}
                  {lead.linkedin !== 'N/A' && lead.linkedin ? (
                    <a href={lead.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline w-fit">
                      <Link2 size={12} className="shrink-0" />
                      <span className="line-clamp-1">LinkedIn</span>
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-400 flex items-center gap-1.5"><Link2 size={12} /> N/A</span>
                  )}
                </div>
              </td>
              <td className="p-4 pr-16">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 relative">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 w-7">Lead</span>
                    <div className="relative flex-1 h-1.5 flex items-center">
                      <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden pointer-events-none">
                        <div className={`h-full rounded-full transition-all duration-75 ${lead.score >= 8 ? 'bg-emerald-500' : lead.score >= 5 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.max(0, (lead.score/10)*100))}%` }} />
                      </div>
                      <input 
                        type="range" min="0" max="10" 
                        value={lead.score} 
                        onChange={(e) => onScoreChange(lead.id, 'score', parseInt(e.target.value))}
                        className="absolute inset-y-[-4px] inset-x-0 w-full h-[calc(100%+8px)] cursor-ew-resize m-0 p-0 appearance-none bg-transparent focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-neutral-200 dark:[&::-webkit-slider-thumb]:border-neutral-700 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-neutral-200 dark:[&::-moz-range-thumb]:border-neutral-700 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent"
                      />
                    </div>
                    <span className="text-xs font-semibold w-5 text-right">{lead.score}</span>
                  </div>
                  <div className="flex items-center gap-2 relative">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 w-7">Web</span>
                    <div className="relative flex-1 h-1.5 flex items-center">
                      <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden pointer-events-none">
                        <div className={`h-full rounded-full transition-all duration-75 ${lead.websiteScore >= 8 ? 'bg-blue-500' : lead.websiteScore >= 5 ? 'bg-indigo-400' : 'bg-slate-400'}`} style={{ width: `${Math.min(100, Math.max(0, (lead.websiteScore/10)*100))}%` }} />
                      </div>
                      <input 
                        type="range" min="0" max="10" 
                        value={lead.websiteScore} 
                        onChange={(e) => onScoreChange(lead.id, 'websiteScore', parseInt(e.target.value))}
                        className="absolute inset-y-[-4px] inset-x-0 w-full h-[calc(100%+8px)] cursor-ew-resize m-0 p-0 appearance-none bg-transparent focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-neutral-200 dark:[&::-webkit-slider-thumb]:border-neutral-700 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-neutral-200 dark:[&::-moz-range-thumb]:border-neutral-700 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent"
                      />
                    </div>
                    <span className="text-xs font-semibold w-5 text-right">{lead.websiteScore}</span>
                  </div>
                </div>
              </td>
              <td className="p-4">
                <button 
                  onClick={(e) => toggleStatusDropdown(e, lead.id)}
                  className={`inline-flex items-center justify-between gap-2 px-3 py-1.5 w-[100%] text-xs font-semibold rounded-full border transition-colors ${statusStyles[lead.status] || 'bg-neutral-50 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'}`}
                >
                  <span className="truncate">{lead.status}</span>
                  <ChevronDown size={12} className="shrink-0 opacity-60" />
                </button>
              </td>
              <td className="p-4 text-right">
                <button 
                  onClick={(e) => toggleDropdown(e, lead.id)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:opacity-100"
                >
                  <MoreHorizontal size={18} className="pointer-events-none" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Kanban View Component
function KanbanView({ 
  leads, toggleDropdown, onStatusChange, onAddLead, onScoreChange
}: { 
  leads: any[], toggleDropdown: (e: React.MouseEvent, id: number) => void,
  onStatusChange: (id: number, status: string) => void,
  onAddLead: (status: string) => void,
  onScoreChange: (id: number, type: 'score' | 'websiteScore', value: number) => void
}) {
  
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("leadId", id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = parseInt(e.dataTransfer.getData("leadId"));
    if (leadId) {
      onStatusChange(leadId, newStatus);
    }
  };

  return (
    <div className="flex h-full overflow-x-auto p-4 gap-4 bg-neutral-50/30 dark:bg-neutral-950/30 min-h-[500px]">
      {COLUMNS.map(col => {
        const colLeads = leads.filter(l => l.status === col);
        return (
          <div 
            key={col} 
            className="w-80 shrink-0 flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col)}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <StatusDot status={col} />
                {col}
              </h3>
              <span className="text-xs font-medium bg-white dark:bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-sm">
                {colLeads.length}
              </span>
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto pb-4 pr-1">
              {colLeads.map(lead => (
                <div 
                  key={lead.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-500 shrink-0">
                        {lead.name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm line-clamp-1">{lead.name}</h4>
                        <p className="text-xs text-neutral-500 line-clamp-1">{lead.role}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => toggleDropdown(e, lead.id)}
                      className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-opacity"
                    >
                      <MoreHorizontal size={16} className="pointer-events-none" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} className="shrink-0" />
                      <span className="line-clamp-1">{lead.company}</span>
                    </div>
                    {lead.location !== 'N/A' && (
                      <div className="flex items-center gap-1.5 text-neutral-500">
                        <MapPin size={12} className="shrink-0" />
                        <span className="line-clamp-1">{lead.location}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1" title="Lead Score">
                        <Tag size={12} className="text-neutral-400" />
                        <span className="text-xs font-medium text-neutral-500">{lead.score}/10</span>
                      </div>
                      <div className="flex items-center gap-1" title="Website Score">
                        <Globe size={12} className="text-neutral-400" />
                        <span className="text-xs font-medium text-neutral-500">{lead.websiteScore}/10</span>
                      </div>
                    </div>
                    {lead.score >= 8 && (
                      <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                        Hot
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Add card button */}
              <button 
                onClick={() => onAddLead(col)}
                className="w-full py-3 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-white dark:hover:bg-neutral-900 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Lead
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helpers
function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'New': 'bg-blue-500',
    'Qualified': 'bg-emerald-500',
    'Contacted': 'bg-purple-500',
    'Follow Up': 'bg-amber-500',
    'Meeting Scheduled': 'bg-indigo-500',
  };
  return <div className={`w-2 h-2 rounded-full shrink-0 ${colors[status] || 'bg-neutral-500'}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'New': 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    'Qualified': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    'Contacted': 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
    'Follow Up': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    'Meeting Scheduled': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
  };
  
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${styles[status] || 'bg-neutral-50 text-neutral-700 dark:bg-neutral-500/10 dark:text-neutral-400 border-neutral-200'}`}>
      {status}
    </span>
  );
}
