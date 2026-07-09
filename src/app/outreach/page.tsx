"use client";

import React, { useState, useEffect } from "react";
import OutreachWorkflow from "@/components/OutreachWorkflow";
import { supabase } from "@/lib/supabase";
import { 
  Send, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Play, 
  Pause, 
  Edit2, 
  Trash2,
  TrendingUp,
  BarChart2,
  Users,
  Target,
  CheckCircle2,
  AlertCircle,
  Database,
  Loader2
} from "lucide-react";

export default function OutreachPage() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'sequences' | 'templates'>('campaigns');
  const [searchQuery, setSearchQuery] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('id', { ascending: true });
      if (data && data.length > 0) {
        setCampaigns(data);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const seedCampaigns = async () => {
    setIsLoading(true);
    const sampleCampaigns = [
      { name: "Q3 Enterprise Outreach", type: "Email + LinkedIn", status: "Active", sent: 1240, open_rate: 45.2, reply_rate: 12.8, booked: 8, last_active: "2 mins ago" },
      { name: "Startup Founders NY", type: "Email", status: "Active", sent: 850, open_rate: 52.1, reply_rate: 18.4, booked: 14, last_active: "1 hour ago" },
      { name: "Lost Deals Revival", type: "LinkedIn", status: "Draft", sent: 0, open_rate: 0, reply_rate: 0, booked: 0, last_active: "-" },
      { name: "Product Launch Announce", type: "Email", status: "Completed", sent: 5000, open_rate: 38.4, reply_rate: 4.2, booked: 2, last_active: "2 days ago" },
      { name: "SaaS VP Engineering", type: "Email + Call", status: "Paused", sent: 320, open_rate: 41.0, reply_rate: 8.1, booked: 1, last_active: "5 days ago" },
    ];
    try {
      await supabase.from('campaigns').insert(sampleCampaigns);
      await fetchCampaigns();
    } catch (err) {
      console.error("Error seeding campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (campaignId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Paused' : 'Active';
    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: newStatus } : c));
    try {
      await supabase.from('campaigns').update({ status: newStatus }).eq('id', campaignId);
    } catch (err) {
      console.error("Error updating campaign status:", err);
    }
  };

  const filteredCampaigns = campaigns.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Dynamic calculations or fallback mock values for totals
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent || 0), 0);
  const meetingsBooked = campaigns.reduce((acc, c) => acc + (c.booked || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outreach</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">Manage your campaigns, sequences, and templates.</p>
        </div>
        <div className="flex items-center gap-3">
          {campaigns.length === 0 && !isLoading && (
            <button 
              onClick={seedCampaigns}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <Database size={18} />
              Seed Campaigns
            </button>
          )}
          <button className="px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
            <BarChart2 size={18} />
            Analytics
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-2">
            <Plus size={18} />
            New Campaign
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Total Sent" value={totalSent > 0 ? totalSent.toLocaleString() : "7,410"} trend="+12.5%" icon={Send} colorClass="bg-blue-500 text-blue-600 dark:text-blue-400" />
        <MetricCard title="Avg Open Rate" value="44.2%" trend="+2.4%" icon={Mail} colorClass="bg-amber-500 text-amber-600 dark:text-amber-400" />
        <MetricCard title="Avg Reply Rate" value="11.8%" trend="+1.2%" icon={MessageSquare} colorClass="bg-emerald-500 text-emerald-600 dark:text-emerald-400" />
        <MetricCard title="Meetings Booked" value={meetingsBooked > 0 ? meetingsBooked.toString() : "25"} trend="+5" icon={Calendar} colorClass="bg-purple-500 text-purple-600 dark:text-purple-400" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Tabs & Toolbar */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex space-x-1 bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-lg w-fit">
            <TabButton active={activeTab === 'campaigns'} onClick={() => setActiveTab('campaigns')}>
              Campaigns
            </TabButton>
            <TabButton active={activeTab === 'sequences'} onClick={() => setActiveTab('sequences')}>
              Sequences
            </TabButton>
            <TabButton active={activeTab === 'templates'} onClick={() => setActiveTab('templates')}>
              Templates
            </TabButton>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Search campaigns..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
              />
            </div>
            <button className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2">
              <Filter size={16} />
              Filter
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'campaigns' && (
            isLoading ? (
              <div className="flex items-center justify-center p-12 min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 min-h-[300px] text-center space-y-3">
                <Database className="w-10 h-10 text-neutral-400" />
                <h4 className="text-sm font-semibold">No Campaigns Found in Supabase</h4>
                <p className="text-xs text-neutral-500 max-w-sm">You haven't added any campaigns yet. Click "Seed Campaigns" to load mock templates into your database.</p>
                <button
                  onClick={seedCampaigns}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
                >
                  Seed Campaigns
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-xs uppercase tracking-wider text-neutral-500 sticky top-0 z-10 backdrop-blur-md">
                    <th className="p-4 font-semibold w-[30%]">Campaign</th>
                    <th className="p-4 font-semibold w-[15%]">Status</th>
                    <th className="p-4 font-semibold w-[15%] text-right">Sent</th>
                    <th className="p-4 font-semibold w-[15%] text-right">Open Rate</th>
                    <th className="p-4 font-semibold w-[15%] text-right">Reply Rate</th>
                    <th className="p-4 font-semibold w-[10%] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {filteredCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors group">
                      <td className="p-4">
                        <div>
                          <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-1">{campaign.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <span className="flex items-center gap-1"><Target size={12}/> {campaign.type}</span>
                            <span>•</span>
                            <span>Last active: {campaign.last_active || campaign.lastActive || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-medium text-neutral-900 dark:text-neutral-200">{(campaign.sent || 0).toLocaleString()}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-medium text-neutral-900 dark:text-neutral-200">{campaign.open_rate ?? campaign.openRate ?? 0}%</span>
                          <div className="w-24 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${campaign.open_rate ?? campaign.openRate ?? 0}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-medium text-neutral-900 dark:text-neutral-200">{campaign.reply_rate ?? campaign.replyRate ?? 0}%</span>
                          <div className="w-24 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${campaign.reply_rate ?? campaign.replyRate ?? 0}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {campaign.status === 'Active' ? (
                            <button 
                              onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                              className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-md transition-colors" title="Pause"
                            >
                              <Pause size={16} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                              className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-md transition-colors" title="Start"
                            >
                              <Play size={16} />
                            </button>
                          )}
                          <button className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-md transition-colors" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors" title="More">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeTab === 'sequences' && (
            <OutreachWorkflow />
          )}

          {activeTab === 'templates' && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center min-h-[400px]">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                <Mail size={32} />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Template Library
              </h3>
              <p className="text-neutral-500 max-w-md mb-6">
                Manage your high-performing email and message templates to ensure consistent messaging across your team.
              </p>
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
                <Plus size={18} />
                New Template
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, icon: Icon, colorClass }: any) {
  const isPositive = trend.startsWith('+');
  return (
    <div className="p-5 rounded-2xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:scale-150 transition-transform duration-500 ${colorClass.split(' ')[0]}`}></div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`p-2.5 rounded-xl ${colorClass.split(' ')[0]} bg-opacity-10 dark:bg-opacity-20`}>
          <Icon className={`w-5 h-5 ${colorClass.split(' ').slice(1).join(' ')}`} />
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
        }`}>
          {trend}
        </span>
      </div>
      <div className="relative z-10">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</h3>
      </div>
    </div>
  );
}

function TabButton({ active, children, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
        active 
          ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800'
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  let styles = "";
  let Icon = CheckCircle2;
  
  switch (status) {
    case 'Active':
      styles = "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20";
      Icon = Play;
      break;
    case 'Draft':
      styles = "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700";
      Icon = Edit2;
      break;
    case 'Paused':
      styles = "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20";
      Icon = Pause;
      break;
    case 'Completed':
      styles = "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20";
      Icon = CheckCircle2;
      break;
    default:
      styles = "bg-neutral-50 text-neutral-700 border-neutral-200";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${styles}`}>
      <Icon size={12} className="shrink-0" />
      {status}
    </span>
  );
}
