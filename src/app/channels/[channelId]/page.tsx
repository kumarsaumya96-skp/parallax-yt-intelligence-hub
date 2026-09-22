"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CalendarPlus, Check, CircleAlert, FileBarChart, Search, Sparkles } from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { PerformanceChart } from "@/components/charts";
import { Badge, Button, Card, MetricCard, SectionHeader } from "@/components/ui";
import {
  channelSummary,
  comparisonLabel,
  dateSeries,
  formatMetric,
  previousMetricsForRange,
} from "@/lib/analytics";

export default function ChannelDashboardPage() {
  const params = useParams<{ channelId: string }>();
  const {
    brands,
    channels,
    dailyMetrics,
    videos,
    dateRange,
    customDateRange,
    comparison,
    youtubeConfigured,
  } = useAppContext();
  const [metric, setMetric] = useState<"views" | "watchMinutes">("views");
  const [approved, setApproved] = useState(false);
  const channel = channels.find((item) => item.id === params.channelId);
  const brand = brands.find((item) => item.id === channel?.brandId);

  if (!channel || !brand)
    return (
      <Card className="grid min-h-64 place-items-center p-8 text-center">
        <div>
          <h1 className="text-xl font-bold">Channel not found</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This channel is not attached to the live workspace.
          </p>
          <Link
            href="/channels"
            className="mt-5 inline-flex text-sm font-semibold text-[var(--accent)]"
          >
            Return to channels
          </Link>
        </div>
      </Card>
    );

  const channelMetrics = dailyMetrics.filter((item) => item.channelId === channel.id);
  const channelVideos = videos.filter((video) => video.channelId === channel.id);
  const isDemo = channel.source === "demo" || brand.source === "demo";
  if (channelMetrics.length === 0)
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={channel.connected ? "positive" : "warning"}>
              {channel.connected ? "Google connected" : "OAuth required"}
            </Badge>
            <span className="text-xs text-[var(--muted)]">{channel.lastSync}</span>
          </div>
          <h1 className="page-title mt-4">{brand.name}</h1>
          <p className="page-subtitle">No private YouTube Analytics rows are available yet.</p>
        </div>
        <Card className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <CircleAlert size={28} className="text-amber-600" />
          <h2 className="mt-4 text-lg font-bold">Analytics sync required</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">
            {channel.connected
              ? "The channel connection succeeded, but YouTube returned no daily analytics rows or the initial analytics request failed. Reconnect after checking API access and channel permissions."
              : "Manual channel records do not grant access to private analytics. Connect the brand through Google OAuth to import real performance data."}
          </p>
          <Link
            href={`/api/auth/youtube/start?brandId=${brand.id}`}
            className={`mt-6 inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold ${youtubeConfigured ? "bg-[var(--accent)] text-white" : "pointer-events-none bg-slate-200 text-slate-500"}`}
          >
            {youtubeConfigured ? "Connect YouTube" : "Add Google credentials first"}
          </Link>
        </Card>
      </div>
    );

  const summary = channelSummary(channel, dateRange, dailyMetrics, videos, customDateRange);
  const previousRows = previousMetricsForRange(
    channel.id,
    dateRange,
    dailyMetrics,
    customDateRange,
  );
  const series = dateSeries(channel.id, dateRange, dailyMetrics, customDateRange).map(
    (row, index) => ({
      ...row,
      previous: previousRows[index]?.[metric] ?? 0,
    }),
  );
  const formatSummary = ["Long-form", "Shorts", "Live"].map((format) => ({
    format,
    views: channelVideos
      .filter((video) => video.format === format)
      .reduce((sum, video) => sum + video.views, 0),
    videos: channelVideos.filter((video) => video.format === format).length,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={isDemo ? "accent" : "positive"}>
              {isDemo ? "Demo data" : "Live data"}
            </Badge>
            <span className="text-xs text-[var(--muted)]">Last sync {channel.lastSync}</span>
          </div>
          <h1 className="page-title mt-4">{brand.name}</h1>
          <p className="page-subtitle">
            What happened, what the available evidence supports, and where more data is required.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <CalendarPlus size={16} /> Add annotation
          </Button>
          <Link
            href={`/reports/new?brand=${brand.id}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
          >
            <FileBarChart size={16} /> Generate report
          </Link>
        </div>
      </div>

      <div className="grid-auto-cards">
        <MetricCard
          label="Views"
          value={formatMetric(summary.views)}
          change={summary.change}
          note={comparisonLabel(comparison)}
        />
        <MetricCard
          label="Watch time"
          value={`${formatMetric(summary.watchMinutes / 60)}h`}
          note="YouTube Analytics"
        />
        <MetricCard
          label="Net subscribers"
          value={`${summary.netSubscribers >= 0 ? "+" : ""}${formatMetric(summary.netSubscribers)}`}
          note="Gained minus lost"
        />
        <MetricCard
          label="Avg. view duration"
          value={`${Math.floor(summary.avgViewDuration / 60)}:${String(Math.round(summary.avgViewDuration % 60)).padStart(2, "0")}`}
        />
        <MetricCard
          label="Engagement"
          value={`${(summary.engagement * 100).toFixed(1)}%`}
          note="Likes, comments and shares"
        />
      </div>

      <Card className="p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Performance trend</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {isDemo
                ? "Seeded daily rows for feature demonstration."
                : "Daily rows returned by YouTube Analytics."}
            </p>
          </div>
          <div className="flex rounded-xl border border-[var(--border)] p-1">
            <button
              onClick={() => setMetric("views")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${metric === "views" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted)]"}`}
            >
              Views
            </button>
            <button
              onClick={() => setMetric("watchMinutes")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${metric === "watchMinutes" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted)]"}`}
            >
              Watch time
            </button>
          </div>
        </div>
        <PerformanceChart data={series} metric={metric} showComparison={comparison !== "none"} />
      </Card>

      <section className="space-y-4">
        <SectionHeader
          eyebrow="Why"
          title="What drove performance?"
          description="Traffic-source and search-query detail are not inferred from totals."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <Badge tone={summary.change < 0 ? "critical" : "positive"}>Observed change</Badge>
            <p className="mt-4 text-2xl font-bold">
              {summary.change >= 0 ? "+" : ""}
              {summary.change.toFixed(1)}%
            </p>
            <p className="mt-2 font-semibold">Views vs previous period</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              This is a measured change. A causal driver cannot be assigned until source and
              content-level analytics are synced.
            </p>
          </Card>
          <Card className="p-5">
            <Badge tone="accent">Publishing context</Badge>
            <p className="mt-4 text-2xl font-bold">{channelVideos.length}</p>
            <p className="mt-2 font-semibold">Recent videos imported</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Public video metadata provides context without fabricating retention or traffic-source
              data.
            </p>
          </Card>
          <Card className="p-5">
            <Badge tone="warning">Data gap</Badge>
            <p className="mt-4 text-2xl font-bold">Pending</p>
            <p className="mt-2 font-semibold">Traffic-source detail</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Run the detailed analytics sync before diagnosing Browse, Search, Suggested or
              Shorts-feed contribution.
            </p>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Content formats"
          description="Formats are derived from available public video metadata; unavailable values remain zero."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {formatSummary.map((item) => (
            <Card className="p-5" key={item.format}>
              <p className="text-sm text-[var(--muted)]">{item.format}</p>
              <p className="mt-2 text-2xl font-bold">{formatMetric(item.views)} views</p>
              <p className="mt-2 text-xs text-[var(--muted)]">{item.videos} imported videos</p>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Search size={17} className="text-[var(--accent)]" />
            <h3 className="font-bold">Top YouTube search queries</h3>
          </div>
          <div className="mt-5 rounded-xl bg-[var(--surface)] p-5 text-sm leading-6 text-[var(--muted)]">
            Unavailable in the initial connection sync. No search queries are estimated or
            substituted.
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-[var(--accent)]" />
            <h3 className="font-bold">Performance summary</h3>
            <Badge tone="neutral">Evidence only</Badge>
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Views changed {summary.change >= 0 ? "up" : "down"}{" "}
            {Math.abs(summary.change).toFixed(1)}% against the available previous-period rows.
            Source-level causality is not available yet, so the system is withholding a driver
            claim.
          </p>
          <div className="mt-5 flex gap-2">
            <Button onClick={() => setApproved((value) => !value)}>
              {approved ? (
                <>
                  <Check size={16} /> Approved
                </>
              ) : (
                "Approve insight"
              )}
            </Button>
            <Button variant="secondary">Edit</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
