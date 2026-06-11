"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  Briefcase, 
  Calendar, 
  ChevronRight, 
  Compass, 
  CreditCard, 
  Inbox, 
  LayoutDashboard, 
  MessageSquare, 
  Search, 
  Settings, 
  Sparkles, 
  Target, 
  Users, 
  Zap,
  Menu,
  Bell,
  Plus,
  Upload,
  Building2,
  CheckSquare
} from "lucide-react";

function NavItem({ icon, label, href, badge, isSubItem }: { icon: React.ReactNode, label: string, href: string, badge?: string, isSubItem?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link href={href} className={`w-full flex items-center justify-between py-2.5 rounded-xl transition-all ${
      active 
        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium" 
        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-100"
    } ${isSubItem ? 'pl-11 pr-3 mt-1' : 'px-3'}`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className={isSubItem ? "text-sm text-neutral-500 dark:text-neutral-400" : "text-sm"}>{label}</span>
      </div>
      {badge && (
        <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-50 overflow-hidden w-full">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white/80 dark:bg-black/80 backdrop-blur-xl border-r border-neutral-200 dark:border-neutral-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-neutral-200 dark:border-neutral-800">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              DeOrch
            </span>
          </Link>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-4rem)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <div className="space-y-1">
            <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" href="/" />
            <NavItem icon={<Sparkles size={18} />} label="AI Center" href="/ai" badge="New" />
          </div>

          <div>
            <h3 className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">LeadOS</h3>
            <div className="space-y-1">
              <NavItem icon={<Users size={18} />} label="Leads" href="/leads" />
              <NavItem icon={<Upload size={16} />} label="Lead Import" href="/leads/import" isSubItem={true} />
              <NavItem icon={<Building2 size={18} />} label="Companies" href="/companies" />
              <NavItem icon={<Target size={18} />} label="Outreach" href="/outreach" />
              <NavItem icon={<Calendar size={18} />} label="Meetings" href="/meetings" />
              <NavItem icon={<CheckSquare size={18} />} label="Tasks" href="/tasks" />
            </div>
          </div>

          <div>
            <h3 className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">CareerOS</h3>
            <div className="space-y-1">
              <NavItem icon={<Briefcase size={18} />} label="Job Board" href="/jobs" />
              <NavItem icon={<Inbox size={18} />} label="Applications" href="/applications" />
              <NavItem icon={<Calendar size={18} />} label="Interviews" href="/interviews" />
            </div>
          </div>

          <div>
            <h3 className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Platform</h3>
            <div className="space-y-1">
              <NavItem icon={<BarChart3 size={18} />} label="Analytics" href="/analytics" />
              <NavItem icon={<Compass size={18} />} label="Integrations" href="/integrations" />
              <NavItem icon={<Settings size={18} />} label="Settings" href="/settings" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-black/50 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={20} />
            </button>
            
            <div className="hidden sm:flex items-center relative">
              <Search className="absolute left-3 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Search across LeadOS & CareerOS..." 
                className="pl-9 pr-4 py-2 w-80 bg-neutral-100 dark:bg-neutral-900 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 relative">
              <Bell size={20} className="text-neutral-600 dark:text-neutral-300" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 border-2 border-white dark:border-neutral-900 shadow-sm"></div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
