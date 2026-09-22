"use client";

import { useState } from "react";
import { BellRing, Check, Play, Plus } from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { Badge, Button, Card, inputClass } from "@/components/ui";
import type { AlertEvent } from "@/lib/types";

export default function AlertsPage() {
  const { brandId, brands, alertEvents } = useAppContext();
  const [localEvents, setLocalEvents] = useState<AlertEvent[]>([]);
  const [resolved, setResolved] = useState<string[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [metric, setMetric] = useState("Views");
  const [condition, setCondition] = useState("decrease");
  const [threshold, setThreshold] = useState("15");
  const [message, setMessage] = useState("");
  const brand = brands.find((item) => item.id === brandId);
  const isDemo = brand?.source === "demo";
  const events = [...localEvents.filter((event) => event.brandId === brandId), ...alertEvents.filter((event) => event.brandId === brandId)].map((event) => resolved.includes(event.id) ? { ...event, resolved: true } : event);

  async function saveRule() {
    const response = await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "alertRules", item: { brandId, metric, condition, threshold: Number(threshold), window: "7d", comparison: "previous", channels: ["in-app", "email"], active: true } }) });
    setMessage(response.ok ? "Rule saved and ready for evaluation." : "The rule could not be saved.");
    if (response.ok) setShowBuilder(false);
  }

  function evaluate() {
    if (!isDemo) {
      setMessage("Evaluation queued. An event appears only when synced data crosses a saved threshold.");
      return;
    }
    const id = `${brandId}-evaluated-${Date.now()}`;
    setLocalEvents((current) => [{ id, brandId, severity: "warning", title: `${metric} ${condition} triggered`, detail: `Demo analytics crossed the configured ${threshold}% threshold for the 7-day window.`, createdAt: "2026-09-01", resolved: false, source: "demo" }, ...current]);
    setMessage("Demo evaluation complete: one sample event triggered.");
  }

  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex gap-2"><Badge tone={isDemo ? "accent" : "positive"}>{isDemo ? "Demo events" : "Live rules"}</Badge></div><h1 className="page-title mt-4">Alerts</h1><p className="page-subtitle">Plain-language rules for {brand?.name ?? "the selected brand"}, evaluated after sync and by the local worker.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={evaluate}><Play size={16} /> Evaluate now</Button><Button onClick={() => setShowBuilder((value) => !value)}><Plus size={16} /> Create alert</Button></div></div>{message && <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><Check size={16} /> {message}</div>}{showBuilder && <Card className="p-6"><h2 className="text-lg font-bold">Create alert rule</h2><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><label className="text-sm font-semibold">Metric<select value={metric} onChange={(event) => setMetric(event.target.value)} className={`${inputClass} mt-2 w-full`}><option>Views</option><option>Watch time</option><option>Subscriber growth</option><option>Engagement</option><option>Search traffic</option><option>Upload inactivity</option></select></label><label className="text-sm font-semibold">Condition<select value={condition} onChange={(event) => setCondition(event.target.value)} className={`${inputClass} mt-2 w-full`}><option value="decrease">Decreases by</option><option value="increase">Increases by</option><option value="above">Above</option><option value="below">Below</option><option value="crosses">Crosses threshold</option></select></label><label className="text-sm font-semibold">Value / percentage<input value={threshold} onChange={(event) => setThreshold(event.target.value)} type="number" min="0" className={`${inputClass} mt-2 w-full`} /></label><label className="text-sm font-semibold">Evaluation window<select className={`${inputClass} mt-2 w-full`}><option>Last 7 days</option><option>Last 28 days</option><option>Since publication</option></select></label></div><div className="mt-4 flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked className="size-4 accent-violet-600" /> In-app</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked className="size-4 accent-violet-600" /> Email</label><Button className="ml-auto" onClick={saveRule}>Save rule</Button></div></Card>}<div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><Card className="overflow-hidden"><div className="border-b border-[var(--border)] p-5"><div className="flex items-center gap-2"><BellRing size={18} className="text-[var(--accent)]" /><h2 className="font-bold">Notification center</h2></div></div>{events.length === 0 ? <div className="p-8 text-center text-sm text-[var(--muted)]">No alert events for this brand.</div> : <div className="divide-y divide-[var(--border)]">{events.map((event) => <div key={event.id} className="flex items-start gap-4 p-5"><div className={`mt-1.5 size-2.5 rounded-full ${event.severity === "critical" ? "bg-red-500" : event.severity === "warning" ? "bg-amber-500" : "bg-blue-500"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><p className="font-semibold">{event.title}</p><Badge tone={event.resolved ? "neutral" : event.severity === "critical" ? "critical" : event.severity === "warning" ? "warning" : "accent"}>{event.resolved ? "Resolved" : event.severity}</Badge>{event.source === "demo" && <Badge tone="accent">Demo</Badge>}</div><p className="mt-1 text-sm text-[var(--muted)]">{event.detail}</p><p className="mt-2 text-xs text-[var(--muted)]">{event.createdAt}</p></div>{!event.resolved && <Button variant="ghost" className="h-8" onClick={() => setResolved((current) => [...current, event.id])}>Resolve</Button>}</div>)}</div>}</Card><Card className="p-5"><h2 className="font-bold">Recommended rules</h2><div className="mt-4 space-y-3">{[["Views decline", "Below previous 7 days by 15%"], ["Video acceleration", "Last 48h exceeds baseline by 50%"], ["Upload inactivity", "No upload for 10 days"], ["Scheduled report failure", "Any failed delivery"]].map(([title, detail]) => <div key={title} className="rounded-xl bg-[var(--surface)] p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p><button onClick={() => setShowBuilder(true)} className="mt-3 text-xs font-bold text-[var(--accent)]">Use this rule</button></div>)}</div></Card></div></div>;
}
