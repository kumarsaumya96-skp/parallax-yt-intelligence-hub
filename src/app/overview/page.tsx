"use client";

import Link from "next/link";
import { ArrowRight, BellRing, CirclePlay, FileClock, PlaySquare, UsersRound } from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { Badge, Card, MetricCard, SectionHeader } from "@/components/ui";
import { formatMetric, portfolioSummary } from "@/lib/analytics";

export default function OverviewPage() {
  const { brands, channels, dailyMetrics, videos, alertEvents, dateRange, customDateRange } =
    useAppContext();
  const portfolio = portfolioSummary(dateRange, channels, dailyMetrics, videos, customDateRange);
  const connected = channels.filter((channel) => channel.connected).length;
  const waiting = channels.length - connected;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge tone="positive">Live + optional demo</Badge>
          <h1 className="page-title mt-4">Parallax</h1>
          <p className="page-subtitle">Parallax — YouTube Intelligence Hub</p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
        >
          <PlaySquare size={16} /> Add brand or channel
        </Link>
      </div>

      <div className="grid-auto-cards">
        <MetricCard
          label="Managed brands"
          value={String(brands.length)}
          note="Live and demo workspaces"
          icon={<UsersRound size={17} />}
        />
        <MetricCard
          label="Connected channels"
          value={`${connected}/${channels.length}`}
          note={waiting ? `${waiting} awaiting OAuth` : "All added channels connected"}
          icon={<CirclePlay size={17} />}
        />
        <MetricCard
          label="Synced videos"
          value={videos.length.toLocaleString()}
          note="From connected channels"
          icon={<PlaySquare size={17} />}
        />
        <MetricCard
          label="Active alerts"
          value={String(alertEvents.filter((event) => !event.resolved).length)}
          note="Across visible brands"
          icon={<BellRing size={17} />}
        />
        <MetricCard
          label="Reports due"
          value="0"
          note="No active schedules by default"
          icon={<FileClock size={17} />}
        />
      </div>

      <section className="space-y-4">
        <SectionHeader
          title="Managed brands"
          description="Each brand and channel is isolated. Demo snapshots are labeled; live analytics require OAuth sync."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {brands.map((brand) => {
            const brandChannels = portfolio.filter(({ channel }) => channel.brandId === brand.id);
            const primary =
              brandChannels.find(({ channel }) => channel.id === brand.channelId) ??
              brandChannels[0];
            if (!primary)
              return (
                <Card key={brand.id} className="p-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid size-11 place-items-center rounded-xl text-sm font-bold text-white"
                      style={{ background: brand.accent }}
                    >
                      {brand.initials}
                    </div>
                    <div>
                      <p className="font-semibold">{brand.name}</p>
                      <p className="text-xs text-[var(--muted)]">{brand.industry}</p>
                    </div>
                  </div>
                  <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    No channel attached yet.
                  </div>
                  <Link
                    href="/onboarding"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]"
                  >
                    Add channel <ArrowRight size={15} />
                  </Link>
                </Card>
              );
            const { channel, summary } = primary;
            const hasMetrics = dailyMetrics.some((metric) => metric.channelId === channel.id);
            return (
              <Link key={brand.id} href={`/channels/${channel.id}?brand=${brand.id}`}>
                <Card className="h-full p-6 transition hover:border-violet-200">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid size-11 place-items-center rounded-xl text-sm font-bold text-white"
                      style={{ background: brand.accent }}
                    >
                      {brand.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{brand.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{channel.handle}</p>
                    </div>
                    <Badge
                      tone={
                        brand.source === "demo"
                          ? "accent"
                          : channel.connected
                            ? "positive"
                            : "warning"
                      }
                    >
                      {brand.source === "demo"
                        ? "Demo"
                        : channel.connected
                          ? "Connected"
                          : "OAuth pending"}
                    </Badge>
                  </div>
                  {hasMetrics ? (
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-[var(--muted)]">Views</p>
                        <p className="mt-1 font-bold">{formatMetric(summary.views)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--muted)]">Watch time</p>
                        <p className="mt-1 font-bold">{formatMetric(summary.watchMinutes / 60)}h</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--muted)]">Net subs</p>
                        <p className="mt-1 font-bold">
                          {summary.netSubscribers >= 0 ? "+" : ""}
                          {formatMetric(summary.netSubscribers)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-xl bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                      No private analytics have been synced.
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
      </section>
    </div>
  );
}
