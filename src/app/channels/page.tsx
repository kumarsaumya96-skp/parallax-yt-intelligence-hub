"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { Badge, Card } from "@/components/ui";
import { channelSummary, formatMetric } from "@/lib/analytics";

export default function ChannelsPage() {
  const { brands, channels, dailyMetrics, videos, dateRange, customDateRange } = useAppContext();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Channels</h1>
          <p className="page-subtitle">
            Live, manual and clearly labeled demo YouTube channels in this workspace.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Add channel
        </Link>
      </div>
      {channels.length === 0 ? (
        <Card className="grid min-h-60 place-items-center p-8 text-center">
          <div>
            <p className="font-semibold">No channels yet</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Add a channel manually, connect Google OAuth, or load the demo workspace from setup.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {channels.map((channel) => {
            const brand = brands.find((item) => item.id === channel.brandId);
            if (!brand) return null;
            const summary = channelSummary(
              channel,
              dateRange,
              dailyMetrics,
              videos,
              customDateRange,
            );
            const hasMetrics = dailyMetrics.some((metric) => metric.channelId === channel.id);
            const isDemo = channel.source === "demo" || brand.source === "demo";
            return (
              <Link key={channel.id} href={`/channels/${channel.id}?brand=${brand.id}`}>
                <Card className="h-full p-6 transition hover:border-violet-200">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid size-12 place-items-center rounded-xl font-bold text-white"
                      style={{ background: brand.accent }}
                    >
                      {brand.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{channel.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{channel.handle}</p>
                    </div>
                    <Badge tone={isDemo ? "accent" : channel.connected ? "positive" : "warning"}>
                      {isDemo ? "Demo" : channel.connected ? "Connected" : "OAuth pending"}
                    </Badge>
                  </div>
                  {hasMetrics ? (
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-[var(--muted)]">Views</p>
                        <p className="mt-1 font-bold">{formatMetric(summary.views)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--muted)]">Net subs</p>
                        <p className="mt-1 font-bold">
                          {summary.netSubscribers >= 0 ? "+" : ""}
                          {formatMetric(summary.netSubscribers)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--muted)]">Change</p>
                        <p className="mt-1 font-bold">{summary.change.toFixed(1)}%</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-xl bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                      Analytics not synced yet.
                    </div>
                  )}
                  <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
                    <span>Last sync: {channel.lastSync}</span>
                    <ArrowRight size={16} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
