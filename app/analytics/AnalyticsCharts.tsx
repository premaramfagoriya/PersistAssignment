"use client";

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

// A sleek custom tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--panel-solid)] border border-[var(--border-bright)] p-3 rounded-xl shadow-xl shadow-black/30 backdrop-blur-md">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)] mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function TwinEngagementChart({ data }: { data: any[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-64 w-full animate-pulse bg-indigo-500/5 rounded-2xl"></div>;

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorProposals" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="var(--text-dim)" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="var(--text-dim)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="interactions" 
            name="Interactions"
            stroke="#818cf8" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorInteractions)" 
            animationDuration={1500}
          />
          <Area 
            type="monotone" 
            dataKey="proposals" 
            name="Proposals"
            stroke="#34d399" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorProposals)" 
            animationDuration={1500}
            animationBegin={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SkillRadarChart({ data }: { data: any[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-64 w-full animate-pulse bg-purple-500/5 rounded-2xl"></div>;

  return (
    <div className="h-[300px] w-full mt-4 flex justify-center items-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'var(--text)', fontSize: 11, fontWeight: 600 }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Radar 
            name="Your Twin" 
            dataKey="A" 
            stroke="#c084fc" 
            fill="#c084fc" 
            fillOpacity={0.4} 
            strokeWidth={2}
            animationDuration={2000}
          />
          <Radar 
            name="Network Avg" 
            dataKey="B" 
            stroke="#94a3b8" 
            fill="#94a3b8" 
            fillOpacity={0.2} 
            strokeWidth={2}
            animationDuration={2000}
            animationBegin={500}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
