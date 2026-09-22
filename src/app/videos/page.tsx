"use client";

import Link from "next/link";
import { Download, GitCompareArrows, Search, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppContext } from "@/components/app-context";
import { Badge, Button, Card, EmptyState, inputClass } from "@/components/ui";
import { calculateDiagnostic } from "@/lib/scoring";
import { formatMetric } from "@/lib/analytics";
import { formatDuration } from "@/lib/utils";

const tabs = ["All", "Breakout", "Underperforming", "Evergreen", "Resurging", "Strong Search", "Subscriber Driver"];

export default function VideosPage() {
  const { brandId, brands, videos } = useAppContext();
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState("All");
  const [tab, setTab] = useState("All");
  const [selected, setSelected] = useState<string[]>([]);
  const brand = brands.find((item) => item.id === brandId);
  const rows = useMemo(() => videos.filter((video) => video.brandId === brandId).filter((video) => format === "All" || video.format === format).filter((video) => !search || video.title.toLowerCase().includes(search.toLowerCase()) || video.id.includes(search)).map((video) => ({ video, diagnostic: calculateDiagnostic(video) })).filter((row) => tab === "All" || row.diagnostic.label === tab), [brandId, format, search, tab, videos]);

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">Videos</h1><p className="page-subtitle">Search, segment and diagnose {brand?.name ?? "the selected brand"} content using transparent rules and comparable-video evidence.</p></div>
      <Card className="p-4"><div className="flex flex-wrap gap-3"><label className="relative min-w-64 flex-1"><Search size={16} className="absolute left-3 top-3 text-[var(--muted)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, keyword or video ID" className={`${inputClass} w-full pl-9`} /></label><select value={format} onChange={(event) => setFormat(event.target.value)} className={inputClass} aria-label="Video format"><option>All</option><option>Long-form</option><option>Shorts</option><option>Live</option></select><Button variant="secondary"><Download size={16} /> Export</Button></div><div className="scrollbar-thin mt-4 flex gap-1 overflow-x-auto border-t border-[var(--border)] pt-3">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${tab === item ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--surface)]"}`}>{item}</button>)}</div></Card>
      {selected.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-900 p-3 text-white"><span className="mr-2 text-sm font-semibold">{selected.length} selected</span><Button variant="secondary" className="h-8 border-white/20 bg-white/10 text-white"><Tag size={14} /> Add tag</Button><Button variant="secondary" className="h-8 border-white/20 bg-white/10 text-white"><GitCompareArrows size={14} /> Compare</Button></div>}
      {rows.length === 0 ? <EmptyState title="No videos available" description={brand?.source === "demo" ? "Change the search, format or diagnostic filter to see more demo content." : "Connect YouTube and complete a video sync to populate this view."} /> : <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left"><thead className="bg-[var(--surface)] text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"><tr><th className="px-4 py-3"><span className="sr-only">Select</span></th><th className="px-4 py-3">Video</th><th className="px-4 py-3">Published</th><th className="px-4 py-3">Views</th><th className="px-4 py-3">Watch time</th><th className="px-4 py-3">Subscribers</th><th className="px-4 py-3">Diagnostic</th><th className="px-4 py-3"><span className="sr-only">Action</span></th></tr></thead><tbody className="divide-y divide-[var(--border)]">{rows.map(({ video, diagnostic }) => <tr key={video.id} className="hover:bg-slate-50/70"><td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${video.title}`} checked={selected.includes(video.id)} onChange={() => setSelected((current) => current.includes(video.id) ? current.filter((id) => id !== video.id) : [...current, video.id])} className="size-4 accent-violet-600" /></td><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="grid h-12 w-20 shrink-0 place-items-center rounded-lg text-[10px] font-bold text-white" style={{ background: video.thumbnailColor }}>{video.format === "Shorts" ? "SHORT" : formatDuration(video.durationSeconds)}</div><div className="max-w-sm"><p className="line-clamp-2 text-sm font-semibold">{video.title}</p><p className="mt-1 text-xs text-[var(--muted)]">{video.format} · {video.trafficSource}</p></div></div></td><td className="px-4 py-3 text-sm text-[var(--muted)]">{video.publishedAt}</td><td className="px-4 py-3 text-sm font-semibold">{formatMetric(video.views)}</td><td className="px-4 py-3 text-sm">{formatMetric(video.watchMinutes / 60)}h</td><td className="px-4 py-3 text-sm">+{video.subscribers}</td><td className="px-4 py-3"><Badge tone={diagnostic.label === "Underperforming" ? "critical" : diagnostic.label === "Breakout" || diagnostic.label === "Resurging" ? "positive" : "neutral"}>{diagnostic.label}</Badge></td><td className="px-4 py-3"><Link href={`/videos/${video.id}?brand=${brandId}`} className="text-sm font-semibold text-[var(--accent)]">Diagnose</Link></td></tr>)}</tbody></table></div></Card>}
    </div>
  );
}
