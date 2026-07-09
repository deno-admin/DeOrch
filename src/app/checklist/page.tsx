"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Users, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Building2, 
  Check,
  Trash2,
  ListTodo,
  Plus,
  AlertCircle,
  CheckSquare
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ChecklistItem {
  id: number;
  name: string;
  company: string;
  is_checked: boolean;
  created_at: string;
}

export default function ChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "checked" | "unchecked">("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Fetch checklist items from Supabase on mount
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("checklist_items")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) {
        throw error;
      }
      
      if (data) {
        setItems(data);
      }
    } catch (err: any) {
      console.error("Error fetching checklist items:", err);
      setErrorMsg("Could not fetch checklist items. Make sure you created the 'checklist_items' table in your Supabase database.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add Item to Supabase
  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const company = (formData.get("company") as string) || "N/A";
    
    if (!name.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from("checklist_items")
        .insert([{ name, company, is_checked: false }])
        .select();
        
      if (error) throw error;
      
      if (data && data[0]) {
        setItems(prev => [data[0], ...prev]);
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      console.error("Error adding checklist item:", err);
      setErrorMsg("Failed to add client. Verify table exists in Supabase.");
    }
  };

  // Toggle is_checked in Supabase
  const toggleCheck = async (id: number, currentStatus: boolean) => {
    setErrorMsg(null);
    
    // Optimistic Update
    setItems(prev => prev.map(item => item.id === id ? { ...item, is_checked: !currentStatus } : item));
    
    try {
      const { error } = await supabase
        .from("checklist_items")
        .update({ is_checked: !currentStatus })
        .eq("id", id);
        
      if (error) throw error;
    } catch (err: any) {
      console.error("Error toggling item status:", err);
      // Revert optimistic update
      setItems(prev => prev.map(item => item.id === id ? { ...item, is_checked: currentStatus } : item));
      setErrorMsg("Failed to update check status in Supabase.");
    }
  };

  // Delete Item from Supabase
  const handleDeleteItem = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click from triggering checkbox toggle
    setErrorMsg(null);
    
    // Optimistic Update
    const previousItems = [...items];
    setItems(prev => prev.filter(item => item.id !== id));
    
    try {
      const { error } = await supabase
        .from("checklist_items")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
    } catch (err: any) {
      console.error("Error deleting item:", err);
      // Revert on error
      setItems(previousItems);
      setErrorMsg("Failed to delete client from Supabase.");
    }
  };

  // Check all visible items
  const handleCheckAllVisible = async (visibleItems: ChecklistItem[]) => {
    setErrorMsg(null);
    const ids = visibleItems.map(item => item.id);
    if (ids.length === 0) return;
    
    const previousItems = [...items];
    setItems(prev => prev.map(item => ids.includes(item.id) ? { ...item, is_checked: true } : item));
    
    try {
      const { error } = await supabase
        .from("checklist_items")
        .update({ is_checked: true })
        .in("id", ids);
        
      if (error) throw error;
    } catch (err: any) {
      console.error("Error checking all visible:", err);
      setItems(previousItems);
      setErrorMsg("Failed to update status for all clients.");
    }
  };

  // Uncheck all visible items
  const handleUncheckAllVisible = async (visibleItems: ChecklistItem[]) => {
    setErrorMsg(null);
    const ids = visibleItems.map(item => item.id);
    if (ids.length === 0) return;
    
    const previousItems = [...items];
    setItems(prev => prev.map(item => ids.includes(item.id) ? { ...item, is_checked: false } : item));
    
    try {
      const { error } = await supabase
        .from("checklist_items")
        .update({ is_checked: false })
        .in("id", ids);
        
      if (error) throw error;
    } catch (err: any) {
      console.error("Error unchecking all visible:", err);
      setItems(previousItems);
      setErrorMsg("Failed to update status for all clients.");
    }
  };

  // Reset checked clients back to pending
  const handleResetChecked = async () => {
    setErrorMsg(null);
    const checkedItems = items.filter(item => item.is_checked);
    if (checkedItems.length === 0) return;
    
    if (confirm(`Are you sure you want to reset all ${checkedItems.length} checked clients to pending?`)) {
      const previousItems = [...items];
      setItems(prev => prev.map(item => item.is_checked ? { ...item, is_checked: false } : item));
      
      try {
        const { error } = await supabase
          .from("checklist_items")
          .update({ is_checked: false })
          .eq("is_checked", true);
          
        if (error) throw error;
      } catch (err: any) {
        console.error("Error resetting checked items:", err);
        setItems(previousItems);
        setErrorMsg("Failed to reset checked items.");
      }
    }
  };

  // Filter & Search computation
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.company.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesFilter = 
      filterType === "all" ||
      (filterType === "checked" && item.is_checked) ||
      (filterType === "unchecked" && !item.is_checked);
      
    return matchesSearch && matchesFilter;
  });

  // Calculate statistics
  const totalCount = items.length;
  const checkedCount = items.filter(l => l.is_checked).length;
  const uncheckedCount = totalCount - checkedCount;
  const completionRate = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListTodo className="w-7 h-7 text-indigo-500" />
            Client Checklist
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Manage your daily verification tasks and client check-ins independently.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchItems}
            className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
            title="Refresh list"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
          
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Add Client
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Database Connection Issue</p>
            <p className="mt-1 opacity-90">{errorMsg}</p>
            <p className="mt-2 text-xs font-mono bg-white/50 dark:bg-black/20 p-2 rounded border border-rose-200/50 dark:border-rose-900/50">
              CREATE TABLE IF NOT EXISTS checklist_items (id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, name TEXT NOT NULL, company TEXT DEFAULT 'N/A', is_checked BOOLEAN DEFAULT FALSE NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL, updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL);
            </p>
          </div>
        </div>
      )}

      {/* Metrics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Clients</p>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{totalCount}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Checked</p>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{checkedCount}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <CheckSquare size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Pending</p>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{uncheckedCount}</h3>
          </div>
        </div>

        {/* Completion Progress Widget */}
        <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/10 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Completion Rate</span>
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">{completionRate}%</span>
          </div>
          <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" 
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4 bg-neutral-50/50 dark:bg-neutral-900/50">
          
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search by client name or company..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex bg-neutral-100 dark:bg-neutral-950 p-1 rounded-xl border border-neutral-200/50 dark:border-neutral-800">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterType === "all" ? "bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("checked")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterType === "checked" ? "bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"}`}
              >
                Checked
              </button>
              <button
                onClick={() => setFilterType("unchecked")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterType === "unchecked" ? "bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300"}`}
              >
                Pending
              </button>
            </div>

            {/* Separator */}
            <div className="hidden md:block w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-2"></div>

            {/* Visible Bulk Actions */}
            {filteredItems.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCheckAllVisible(filteredItems)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  Check All Visible
                </button>
                <button
                  onClick={() => handleUncheckAllVisible(filteredItems)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  Uncheck All Visible
                </button>
              </div>
            )}

            {checkedCount > 0 && (
              <button
                onClick={handleResetChecked}
                className="px-2.5 py-1.5 text-xs font-medium bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors flex items-center gap-1 ml-auto md:ml-0"
                title="Reset all checked items to pending"
              >
                <Trash2 size={12} /> Reset Checked
              </button>
            )}
          </div>
        </div>

        {/* List Body */}
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 font-medium">Fetching checklist clients...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 text-neutral-400">
              <Search size={24} />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">No clients match</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {totalCount === 0 
                ? "Your checklist database is currently empty. Click '+ Add Client' at the top to add clients directly to the list." 
                : "No clients fit your current search query and filter settings. Try adjusting your filters or typing a different search."}
            </p>
            {totalCount > 0 && (
              <button
                onClick={() => { setSearchQuery(""); setFilterType("all"); }}
                className="mt-4 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/30 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="p-4 w-16 text-center">Check</th>
                  <th className="p-4">Client Name</th>
                  <th className="p-4">Company Name</th>
                  <th className="p-4 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredItems.map((item) => {
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => toggleCheck(item.id, item.is_checked)}
                      className={`group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/10 transition-colors cursor-pointer ${item.is_checked ? "bg-indigo-50/10 dark:bg-indigo-500/[0.02]" : ""}`}
                    >
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleCheck(item.id, item.is_checked)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center mx-auto transition-all ${
                            item.is_checked 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20" 
                              : "border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 bg-white dark:bg-neutral-950"
                          }`}
                        >
                          {item.is_checked && <Check size={14} strokeWidth={3} className="animate-scale-in" />}
                        </button>
                      </td>
                      <td className="p-4 font-semibold text-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border transition-colors ${
                            item.is_checked 
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50" 
                              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-transparent"
                          }`}>
                            {item.name.split(" ").filter(Boolean).map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className={`text-neutral-900 dark:text-neutral-100 ${item.is_checked ? "line-through text-neutral-400 dark:text-neutral-500" : ""}`}>
                              {item.name}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-neutral-600 dark:text-neutral-300">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-neutral-400 shrink-0" />
                          <span className={item.is_checked ? "line-through text-neutral-400 dark:text-neutral-500" : ""}>
                            {item.company}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Delete client"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Info */}
        <div className="p-4 bg-neutral-50/50 dark:bg-neutral-900/50 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 gap-2">
          <div>
            Showing {filteredItems.length} of {totalCount} clients
          </div>
          <div>
            Checklist updates sync directly to database.
          </div>
        </div>
      </div>

      {/* Add Client Dialog Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-neutral-200 dark:border-neutral-800 animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold">Add Client to Checklist</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Client Full Name</label>
                <input 
                  required 
                  name="name" 
                  type="text" 
                  placeholder="e.g. John Doe" 
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Company Name</label>
                <input 
                  name="company" 
                  type="text" 
                  placeholder="e.g. Acme Corporation" 
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Add Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
