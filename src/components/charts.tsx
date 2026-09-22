"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltipStyle = { border: "1px solid #e8eaf0", borderRadius: 12, boxShadow: "0 12px 30px rgba(20, 25, 40, .08)", fontSize: 12 };

export function PerformanceChart({ data, metric = "views", showComparison = true }: { data: Record<string, string | number>[]; metric?: "views" | "watchMinutes"; showComparison?: boolean }) {
  return (
    <div className="h-[310px] w-full" aria-label={`${metric} performance chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
          <defs><linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6d4aff" stopOpacity={0.2} /><stop offset="95%" stopColor="#6d4aff" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#eef0f4" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#7a8190", fontSize: 11 }} minTickGap={28} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#7a8190", fontSize: 11 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}K`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => Number(value).toLocaleString()} />
          <Area type="monotone" dataKey={metric} stroke="#6d4aff" strokeWidth={2.5} fill="url(#viewsGradient)" name={metric === "views" ? "Views" : "Watch minutes"} />
          {showComparison && <Line type="monotone" dataKey="previous" stroke="#aeb4c0" strokeDasharray="5 5" strokeWidth={1.5} dot={false} name="Previous period" />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HorizontalBars({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-[250px] w-full" aria-label="Traffic source chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ left: 10, right: 16 }}>
          <CartesianGrid horizontal={false} stroke="#eef0f4" />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={92} axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${value}%`} />
          <Bar dataKey="value" radius={[0, 7, 7, 0]} barSize={18}>
            {data.map((_, index) => <Cell key={index} fill={index === 0 ? "#6d4aff" : index === 1 ? "#8b72ff" : "#c8bcff"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VideoCurve({ actual, baseline }: { actual: { day: number; views: number }[]; baseline: { day: number; views: number }[] }) {
  const data = actual.map((point, index) => ({ day: `Day ${point.day}`, actual: point.views, baseline: baseline[index]?.views ?? 0 }));
  return (
    <div className="h-[285px] w-full" aria-label="Views since publication chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12 }}>
          <CartesianGrid vertical={false} stroke="#eef0f4" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#7a8190" }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#7a8190" }} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => Number(value).toLocaleString()} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area dataKey="actual" name="This video" stroke="#6d4aff" fill="#eee9ff" strokeWidth={2.4} />
          <Line dataKey="baseline" name="Typical video" stroke="#9299a7" strokeDasharray="5 5" dot={false} strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
