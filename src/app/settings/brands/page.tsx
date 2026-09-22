"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { Badge, Card, EmptyState } from "@/components/ui";

export default function BrandSettingsPage() {
  const { brands, channels } = useAppContext();

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="page-title">Brands & channels</h1><p className="page-subtitle">Manage live accounts alongside clearly labeled presentation data.</p></div><Link href="/onboarding" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"><Plus size={16} /> Add brand or channel</Link></div>
    {brands.length === 0 ? <EmptyState title="No brands yet" description="Open workspace setup to create a live account or load the five-brand demo pack." /> : <div className="grid gap-3">{brands.map((brand) => {
      const brandChannels = channels.filter((item) => item.brandId === brand.id);
      return <Card key={brand.id} className="flex flex-wrap items-center gap-4 p-4"><div className="grid size-11 place-items-center rounded-xl font-bold text-white" style={{ background: brand.accent }}>{brand.initials}</div><div className="min-w-48 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{brand.name}</p><Badge tone={brand.source === "demo" ? "accent" : "positive"}>{brand.source === "demo" ? "Demo" : "Live workspace"}</Badge></div><p className="mt-1 text-xs text-[var(--muted)]">{brand.industry} · Manager: {brand.accountManager}</p></div><div className="min-w-52">{brandChannels.length === 0 ? <p className="text-sm text-[var(--muted)]">No channel attached</p> : brandChannels.map((channel) => <div key={channel.id}><p className="text-sm font-semibold">{channel.name}</p><p className="text-xs text-[var(--muted)]">{channel.handle}</p></div>)}</div><Link href={`/onboarding?brand=${brand.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold hover:bg-[var(--surface)]">Manage</Link></Card>;
    })}</div>}
  </div>;
}
