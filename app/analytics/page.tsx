import React from "react";
import { AppShell } from "../AppShell";
import { TwinEngagementChart, SkillRadarChart } from "./AnalyticsCharts";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Mock data for demonstration. In a real app, this would be computed
  // from complex queries on messages, proposals, and twin_profiles.
  
  const engagementData = [
    { name: "Mon", interactions: 12, proposals: 2 },
    { name: "Tue", interactions: 19, proposals: 3 },
    { name: "Wed", interactions: 15, proposals: 1 },
    { name: "Thu", interactions: 28, proposals: 6 },
    { name: "Fri", interactions: 22, proposals: 4 },
    { name: "Sat", interactions: 34, proposals: 8 },
    { name: "Sun", interactions: 41, proposals: 12 }
  ];

  const radarData = [
    { subject: "Negotiation", A: 85, B: 65, fullMark: 100 },
    { subject: "Technical", A: 90, B: 70, fullMark: 100 },
    { subject: "Leadership", A: 75, B: 80, fullMark: 100 },
    { subject: "Strategy", A: 88, B: 60, fullMark: 100 },
    { subject: "Communication", A: 95, B: 75, fullMark: 100 },
    { subject: "Speed", A: 80, B: 55, fullMark: 100 }
  ];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto py-8">
        
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text)]">
            Twin Analytics
          </h1>
          <p className="text-[var(--text-dim)] mt-1 text-[15px]">
            Measure the impact and performance of your AI twin.
          </p>
        </div>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="relative overflow-hidden rounded-2xl bg-[var(--panel-solid)] border border-[var(--border-bright)] p-6 shadow-xl shadow-indigo-500/5 group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="text-sm font-bold uppercase tracking-widest text-[var(--text-dim)] mb-2">Hours Saved</div>
              <div className="text-4xl font-black text-[var(--text)]">14.5<span className="text-xl text-indigo-400 ml-1">hrs</span></div>
              <div className="text-xs font-semibold text-emerald-400 mt-2">+2.4 hrs from last week</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-[var(--panel-solid)] border border-[var(--border-bright)] p-6 shadow-xl shadow-purple-500/5 group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="text-sm font-bold uppercase tracking-widest text-[var(--text-dim)] mb-2">Success Rate</div>
              <div className="text-4xl font-black text-[var(--text)]">78<span className="text-xl text-purple-400 ml-1">%</span></div>
              <div className="text-xs font-semibold text-emerald-400 mt-2">+5% from last week</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-[var(--panel-solid)] border border-[var(--border-bright)] p-6 shadow-xl shadow-amber-500/5 group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="text-sm font-bold uppercase tracking-widest text-[var(--text-dim)] mb-2">Connections Made</div>
              <div className="text-4xl font-black text-[var(--text)]">124</div>
              <div className="text-xs font-semibold text-emerald-400 mt-2">12 new this week</div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <section className="bg-[var(--panel-solid)] border border-[var(--border-bright)] rounded-2xl p-6 shadow-2xl shadow-black/10">
            <div className="mb-2">
              <h2 className="text-lg font-bold tracking-tight text-[var(--text)]">Engagement Over Time</h2>
              <p className="text-xs text-[var(--text-dim)]">Interactions & proposals handled by your twin.</p>
            </div>
            <TwinEngagementChart data={engagementData} />
          </section>

          <section className="bg-[var(--panel-solid)] border border-[var(--border-bright)] rounded-2xl p-6 shadow-2xl shadow-black/10">
            <div className="mb-2">
              <h2 className="text-lg font-bold tracking-tight text-[var(--text)]">Skill Match Radar</h2>
              <p className="text-xs text-[var(--text-dim)]">Your twin's competencies vs network average.</p>
            </div>
            <SkillRadarChart data={radarData} />
          </section>

        </div>

      </div>
    </AppShell>
  );
}
