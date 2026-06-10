"use client";

import React from "react";
import { 
  Briefcase, 
  ChevronRight, 
  Sparkles, 
  Users
} from "lucide-react";

export default function Dashboard() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back, Alex</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">Here is what is happening across your workspace today.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm">
              Generate Report
            </button>
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-2">
              <Sparkles size={16} />
              Ask AI
            </button>
          </div>
        </div>

        {/* AI Recommendations */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold">AI Insights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AIWidget 
              title="Best Lead Match" 
              content="Sarah Jenkins at TechCorp has high intent based on recent funding."
              action="Draft Outreach"
              type="lead"
            />
            <AIWidget 
              title="Hot Prospect" 
              content="Your sequence to Acme Inc has a 45% open rate. Follow up now."
              action="View Sequence"
              type="outreach"
            />
            <AIWidget 
              title="High Match Job" 
              content="Senior Product Designer at Figma (92% match). Closes in 2 days."
              action="Auto Apply"
              type="job"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LeadOS Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                LeadOS Overview
              </h2>
              <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center">
                View Pipeline <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <MetricCard title="Total Leads" value="1,284" trend="+12% this week" />
              <MetricCard title="New Leads" value="48" trend="+4 today" />
              <MetricCard title="Qualified Leads" value="156" trend="12% conversion" />
              <MetricCard title="Active Conv." value="24" trend="Needs attention" highlight />
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-medium text-neutral-500 mb-4">Outreach Performance</h3>
              <div className="space-y-4">
                <ProgressBar label="Emails Sent" value={75} max={100} color="bg-blue-500" text="750 / 1000" />
                <ProgressBar label="LinkedIn DMs" value={45} max={100} color="bg-indigo-500" text="450 / 1000" />
                <ProgressBar label="Replies Received" value={15} max={100} color="bg-emerald-500" text="150" />
                <ProgressBar label="Meetings Booked" value={8} max={100} color="bg-purple-500" text="8" />
              </div>
            </div>
          </section>

          {/* CareerOS Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-500" />
                CareerOS Overview
              </h2>
              <button className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center">
                View Jobs <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <MetricCard title="Applications" value="142" trend="+12 this week" />
              <MetricCard title="Interviews" value="6" trend="2 upcoming" highlight />
              <MetricCard title="Offers" value="1" trend="Review pending" />
              <MetricCard title="Rejections" value="38" trend="26% rate" />
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-medium text-neutral-500 mb-4">Upcoming Interviews</h3>
              <div className="space-y-3">
                <InterviewItem company="Stripe" role="Frontend Engineer" time="Today, 2:00 PM" type="Technical" />
                <InterviewItem company="Vercel" role="Design Engineer" time="Tomorrow, 10:00 AM" type="Cultural" />
                <InterviewItem company="Linear" role="Product Designer" time="Thu, 4:30 PM" type="Portfolio Review" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// Subcomponents

function AIWidget({ title, content, action, type }: { title: string, content: string, action: string, type: 'lead' | 'outreach' | 'job' }) {
  const gradients = {
    lead: "from-blue-500/10 to-blue-500/5 border-blue-200 dark:border-blue-900/50",
    outreach: "from-purple-500/10 to-purple-500/5 border-purple-200 dark:border-purple-900/50",
    job: "from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-900/50"
  };

  const textColors = {
    lead: "text-blue-700 dark:text-blue-400",
    outreach: "text-purple-700 dark:text-purple-400",
    job: "text-emerald-700 dark:text-emerald-400"
  };

  return (
    <div className={`p-5 rounded-2xl border bg-gradient-to-br ${gradients[type]} backdrop-blur-sm relative overflow-hidden group hover:shadow-md transition-shadow`}>
      <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/20 dark:bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
      <h3 className={`text-sm font-bold mb-2 ${textColors[type]}`}>{title}</h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4 leading-relaxed">{content}</p>
      <button className="text-sm font-medium text-neutral-900 dark:text-white flex items-center gap-1 hover:gap-2 transition-all">
        {action} <ChevronRight size={14} />
      </button>
    </div>
  );
}

function MetricCard({ title, value, trend, highlight }: { title: string, value: string, trend: string, highlight?: boolean }) {
  return (
    <div className={`p-5 rounded-2xl border ${
      highlight 
        ? "bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/20" 
        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
    } shadow-sm`}>
      <p className="text-sm font-medium text-neutral-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">{value}</h3>
      <p className={`text-xs font-medium ${
        trend.includes('+') ? 'text-emerald-600 dark:text-emerald-400' : 
        trend.includes('Needs') ? 'text-rose-500' : 'text-neutral-500'
      }`}>{trend}</p>
    </div>
  );
}

function ProgressBar({ label, value, max, color, text }: { label: string, value: number, max: number, color: string, text: string }) {
  const percentage = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
        <span className="text-neutral-500">{text}</span>
      </div>
      <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

function InterviewItem({ company, role, time, type }: { company: string, role: string, time: string, type: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-500">
          {company[0]}
        </div>
        <div>
          <h4 className="text-sm font-semibold">{company}</h4>
          <p className="text-xs text-neutral-500">{role} • {type}</p>
        </div>
      </div>
      <div className="text-right">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md">
          {time}
        </span>
      </div>
    </div>
  );
}
