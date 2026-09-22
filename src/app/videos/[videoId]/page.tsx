"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Check, FilePlus2, Lightbulb, Lock, Sparkles } from "lucide-react";
import { VideoCurve } from "@/components/charts";
import { useAppContext } from "@/components/app-context";
import { Badge, Button, Card, MetricCard, SectionHeader } from "@/components/ui";
import { calculateDiagnostic } from "@/lib/scoring";
import { formatMetric } from "@/lib/analytics";
import { formatDuration } from "@/lib/utils";

function narrativeFor(label: ReturnType<typeof calculateDiagnostic>["label"]) {
  if (label === "Underperforming") return "This video reached only part of the expected first-week audience. Lower Browse exposure likely contributed, while Search remained too small to compensate. The evidence supports testing a clearer decision-led title and a tighter opening—not assuming the topic itself is weak.";
  if (label === "Resurging") return "Recent views accelerated well above the preceding period after the video had matured. Renewed discovery likely contributed. Refresh its links and metadata, then create a current follow-up while the signal remains active.";
  if (label === "Strong Search") return "YouTube Search contributes a materially higher share than the channel median. Search intent likely supports this video's durable discovery; extend the query cluster with one focused answer rather than copying the packaging blindly.";
  if (label === "Subscriber Driver") return "This video converts viewers into subscribers above the channel median. Its fit with audience expectations likely contributed; use its promise and follow-through as evidence for the next concept.";
  if (label === "Evergreen") return "The video continues to attract meaningful, stable views well after publication. Its durable topic and discovery paths likely contribute; refresh and interlink it before producing a closely related follow-up.";
  if (label === "Breakout") return "This video outpaced the recent comparable-video baseline. Strong early velocity and sustained discovery likely contributed. Extend the result with a follow-up, but do not treat one breakout as a guaranteed formula.";
  return "This video performed within the expected comparable-video range. The supplied evidence does not support a strong positive or negative diagnosis. Use its search share, engagement and audience fit as directional signals, and avoid over-interpreting normal variation.";
}

function narrativeHeading(label: ReturnType<typeof calculateDiagnostic>["label"]) {
  if (label === "Underperforming") return "What is holding it back?";
  if (label === "Typical") return "How should we interpret it?";
  return "Why did it work?";
}

export default function VideoDiagnosticPage() {
  const params = useParams<{ videoId: string }>();
  const { brands, videos } = useAppContext();
  const video = videos.find((item) => item.id === params.videoId);
  const brand = brands.find((item) => item.id === video?.brandId);
  const diagnostic = video ? calculateDiagnostic(video) : null;
  const [approved, setApproved] = useState(false);
  const [explanation, setExplanation] = useState("");

  if (!video || !brand || !diagnostic) return <Card className="grid min-h-64 place-items-center p-8 text-center"><div><h1 className="text-xl font-bold">Video not found</h1><p className="mt-2 text-sm text-[var(--muted)]">This video is not available in the selected workspace.</p><Link href="/videos" className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)]">Return to videos</Link></div></Card>;

  const displayedExplanation = explanation || narrativeFor(diagnostic.label);

  const actual = [1, 3, 7, 14, 28].map((day) => ({ day, views: Math.round(video.first7Views * Math.min(1.9, 0.22 + day / 12)) }));
  const baseline = [1, 3, 7, 14, 28].map((day) => ({ day, views: Math.round(video.typicalMedian * Math.min(1.8, 0.2 + day / 13)) }));
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start gap-5"><div className="grid h-28 w-48 shrink-0 place-items-center rounded-2xl text-sm font-black tracking-wider text-white" style={{ background: video.thumbnailColor }}>{video.format.toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Badge tone="accent">{brand.name}</Badge><Badge>{video.format}</Badge>{video.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div><h1 className="mt-4 max-w-4xl text-2xl font-bold tracking-tight lg:text-3xl">{video.title}</h1><p className="mt-2 text-sm text-[var(--muted)]">Published {video.publishedAt} · {formatDuration(video.durationSeconds)} · {brand.source === "demo" ? "Demo provider" : "YouTube sync"}</p></div><div className="flex gap-2"><Button variant="secondary"><FilePlus2 size={16} /> Add to report</Button><Button><Lightbulb size={16} /> Add opportunity</Button></div></div>

      <div className="grid-auto-cards"><Card className="p-5"><p className="text-sm text-[var(--muted)]">Performance score</p><div className="mt-3 flex items-end gap-3"><p className="text-4xl font-black text-[var(--accent)]">{diagnostic.score}</p><span className="mb-1 text-sm text-[var(--muted)]">/ 100</span></div><Badge tone={diagnostic.label === "Underperforming" ? "critical" : diagnostic.label === "Breakout" || diagnostic.label === "Resurging" ? "positive" : "accent"} className="mt-4">{diagnostic.label}</Badge></Card><MetricCard label="Views" value={formatMetric(video.views)} note={`${(video.first7Views / video.typicalMedian).toFixed(1)}x first-week baseline`} /><MetricCard label="Watch time" value={`${formatMetric(video.watchMinutes / 60)}h`} /><MetricCard label="Subscribers" value={`+${video.subscribers}`} note={`${((video.subscribers / video.views) * 1000).toFixed(1)} per 1K views`} /><MetricCard label="Engagement" value={`${(video.engagementRate * 100).toFixed(1)}%`} note={`Primary source: ${video.trafficSource}`} /></div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]"><Card className="p-5"><h2 className="text-lg font-bold">Views since publication</h2><p className="mt-1 text-sm text-[var(--muted)]">Compared with a deterministic median of similar recent channel videos.</p><VideoCurve actual={actual} baseline={baseline} /></Card><Card className="p-5"><SectionHeader eyebrow="Evidence" title={diagnostic.label} description={diagnostic.rule} /><div className="mt-5 space-y-3">{diagnostic.evidence.map((item) => <div key={item} className="flex gap-3 rounded-xl bg-[var(--surface)] p-3 text-sm"><Check size={16} className="mt-0.5 shrink-0 text-[var(--positive)]" /><span>{item}</span></div>)}</div><p className="mt-5 text-xs leading-5 text-[var(--muted)]">Rules are configurable in Settings. This label is withheld when the sample is below the confidence floor.</p></Card></div>

      <Card className="p-5 lg:p-6"><div className="flex flex-wrap items-center gap-2"><Sparkles size={18} className="text-[var(--accent)]" /><h2 className="text-lg font-bold">{narrativeHeading(diagnostic.label)}</h2><Badge tone="neutral">Evidence-grounded {brand.source === "demo" ? "demo" : "insight"}</Badge>{approved && <Badge tone="positive"><Lock size={12} /> Approved</Badge>}</div><textarea value={displayedExplanation} onChange={(event) => setExplanation(event.target.value)} className="mt-5 min-h-32 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-7 outline-none focus:border-[var(--accent)]" /><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => setApproved((value) => !value)}>{approved ? "Unlock insight" : "Approve & lock"}</Button><Button variant="secondary">Regenerate</Button><Button variant="ghost">Delete</Button></div></Card>

      <div className="grid gap-4 lg:grid-cols-2"><Card className="overflow-hidden"><div className="border-b border-[var(--border)] p-5"><h3 className="font-bold">Search queries for this video</h3><p className="mt-1 text-xs text-[var(--muted)]">Available from authorized traffic-source detail in this seeded scenario.</p></div>{["best option explained", "beginner guide 2026", "common mistakes to avoid", "simple comparison"].map((query, index) => <div key={query} className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3 text-sm last:border-0"><span>{query}</span><span className="font-semibold">{32 - index * 6}%</span></div>)}</Card><Card className="p-5"><h3 className="font-bold">Recommended follow-ups</h3><div className="mt-4 space-y-3">{["Answer the highest-intent follow-up question in a 45-second Short", "Create a refreshed comparison with one strong decision framework", "Link the evergreen explainer from the next two relevant uploads"].map((idea) => <div key={idea} className="rounded-xl border border-[var(--border)] p-4 text-sm leading-6">{idea}</div>)}</div><Link href={`/opportunities?brand=${brand.id}`} className="mt-5 inline-flex text-sm font-semibold text-[var(--accent)]">Open Strategy Opportunities →</Link></Card></div>
    </div>
  );
}
