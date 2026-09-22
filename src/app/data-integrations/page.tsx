"use client";

import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  CircleAlert,
  CirclePlay,
  Database,
  KeyRound,
  Mail,
  Radio,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { Badge, Card } from "@/components/ui";

export default function DataIntegrationsPage() {
  const {
    brandId,
    brands,
    channels,
    dailyMetrics,
    videos,
    competitors,
    youtubeConnections,
    youtubeConfigured,
  } = useAppContext();
  const brand = brands.find((item) => item.id === brandId);
  const brandChannels = channels.filter((item) => item.brandId === brandId);
  const isDemo = brand?.source === "demo";
  const analyticsRows = dailyMetrics.filter((row) =>
    brandChannels.some((channel) => channel.id === row.channelId),
  ).length;
  const videoRows = videos.filter((video) => video.brandId === brandId).length;
  const competitorRows = competitors.filter((item) => item.brandId === brandId).length;
  const connection = youtubeConnections.find((item) => String(item.brandId) === brandId);
  const hasConnection = Boolean(connection);
  const scopes = String(connection?.scopes ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const writeAuthorized = scopes.includes("https://www.googleapis.com/auth/youtube");
  const status = isDemo ? "Demo snapshot" : hasConnection ? "Connected" : "Not connected";
  const tone = isDemo
    ? ("accent" as const)
    : hasConnection
      ? ("positive" as const)
      : ("warning" as const);
  const integrations = [
    {
      name: "YouTube Data API v3",
      detail:
        "Search, channel and video statistics, comments, playlists, channel settings and uploads",
      icon: CirclePlay,
      status,
      tone,
      sync: videoRows.toLocaleString() + " videos",
    },
    {
      name: "YouTube Analytics API",
      detail:
        "Performance, watch time, audience demographics, geography, traffic and device reports",
      icon: BarChart3,
      status,
      tone,
      sync: analyticsRows.toLocaleString() + " daily rows",
    },
    {
      name: "YouTube Live Streaming API",
      detail: "Broadcasts, streams, binding, status transitions and cuepoints through the Data API",
      icon: Radio,
      status,
      tone,
      sync: hasConnection
        ? writeAuthorized
          ? "Management authorized"
          : "Re-authorization required"
        : "Not connected",
    },
    {
      name: "Local workspace",
      detail: "Persistent brands, channels, rules and reporting settings",
      icon: Database,
      status: "Active",
      tone: "positive" as const,
      sync: brandChannels.length + " channel" + (brandChannels.length === 1 ? "" : "s"),
    },
    {
      name: "AI",
      detail: "Structured, evidence-grounded insights",
      icon: Sparkles,
      status: isDemo ? "Demo narratives" : "Evidence gated",
      tone: "accent" as const,
      sync: "Ready",
    },
    {
      name: "Email",
      detail: "Report delivery through configured SMTP",
      icon: Mail,
      status: "Optional",
      tone: "neutral" as const,
      sync: "Configure in environment",
    },
    {
      name: "Trends",
      detail: "Optional external trend momentum",
      icon: TrendingUp,
      status: "Optional",
      tone: "neutral" as const,
      sync: "Not blocking",
    },
  ];

  return (
    <div className="space-y-7">
      <div>
        <Badge tone={isDemo ? "accent" : hasConnection ? "positive" : "warning"}>
          {isDemo ? (
            <>
              <Sparkles size={12} /> Demo workspace
            </>
          ) : hasConnection ? (
            <>
              <CheckCircle2 size={12} /> YouTube connected
            </>
          ) : (
            <>
              <CircleAlert size={12} /> Setup required
            </>
          )}
        </Badge>
        <h1 className="page-title mt-4">Data &amp; integrations</h1>
        <p className="page-subtitle">
          API health, permissions and setup for {brand?.name ?? "the selected brand"}.
        </p>
      </div>

      <Card className="flex flex-wrap items-center gap-4 border-violet-200 bg-violet-50/40 p-5">
        <KeyRound className="text-[var(--accent)]" />
        <div className="min-w-64 flex-1">
          <p className="font-semibold">
            {isDemo
              ? "Demo data is isolated from live connections"
              : hasConnection
                ? writeAuthorized
                  ? "YouTube APIs are authorized"
                  : "Reconnect to grant publishing and live permissions"
                : "Connect a managed YouTube channel"}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            {isDemo
              ? "Switch to a live brand before connecting a real channel."
              : "OAuth tokens stay server-side and are encrypted in local storage. Every publishing or management action is initiated manually."}
          </p>
        </div>
        {brand && !isDemo && (
          <div className="flex gap-2">
            <Link
              href={
                youtubeConfigured ? "/api/auth/youtube/start?brandId=" + brand.id : "/onboarding"
              }
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
            >
              {youtubeConfigured
                ? hasConnection
                  ? "Re-authorize APIs"
                  : "Connect YouTube"
                : "Configure OAuth"}
            </Link>
            {hasConnection && (
              <Link
                href={"/youtube-operations?brand=" + brand.id}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-white px-4 text-sm font-semibold"
              >
                Open API console
              </Link>
            )}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map(
          ({ name, detail, icon: Icon, status: itemStatus, tone: itemTone, sync }) => (
            <Card key={name} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-[var(--surface)]">
                  <Icon size={19} />
                </div>
                <Badge tone={itemTone}>{itemStatus}</Badge>
              </div>
              <p className="mt-5 font-semibold">{name}</p>
              <p className="mt-1 min-h-12 text-sm leading-6 text-[var(--muted)]">{detail}</p>
              <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
                {sync}
              </p>
            </Card>
          ),
        )}
      </div>

      <Card className="p-5 lg:p-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Search size={18} />
          </div>
          <div>
            <h2 className="font-bold">Google Cloud setup</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Complete these once for the Google Cloud project that owns your OAuth client.
            </p>
          </div>
        </div>
        <ol className="mt-5 grid gap-3 text-sm leading-6 text-[var(--muted)] lg:grid-cols-2">
          <li className="rounded-xl bg-[var(--surface)] p-4">
            <span className="font-bold text-[var(--ink)]">1. Enable YouTube Data API v3.</span>
            <br />
            This also enables the Live Streaming resources.{" "}
            <a
              className="font-semibold text-[var(--accent)] underline"
              href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
              target="_blank"
              rel="noreferrer"
            >
              Open API Library
            </a>
          </li>
          <li className="rounded-xl bg-[var(--surface)] p-4">
            <span className="font-bold text-[var(--ink)]">2. Enable YouTube Analytics API.</span>
            <br />
            Required for private watch-time and audience reports.{" "}
            <a
              className="font-semibold text-[var(--accent)] underline"
              href="https://console.cloud.google.com/apis/library/youtubeanalytics.googleapis.com"
              target="_blank"
              rel="noreferrer"
            >
              Open API Library
            </a>
          </li>
          <li className="rounded-xl bg-[var(--surface)] p-4">
            <span className="font-bold text-[var(--ink)]">3. Configure OAuth consent.</span>
            <br />
            Add the YouTube scopes and test users while the app remains in testing.{" "}
            <a
              className="font-semibold text-[var(--accent)] underline"
              href="https://console.cloud.google.com/auth/overview"
              target="_blank"
              rel="noreferrer"
            >
              Open Google Auth Platform
            </a>
          </li>
          <li className="rounded-xl bg-[var(--surface)] p-4">
            <span className="font-bold text-[var(--ink)]">4. Create a Web application client.</span>
            <br />
            Use <code>http://localhost:3000/api/auth/youtube/callback</code> as an authorized
            redirect URI.{" "}
            <a
              className="font-semibold text-[var(--accent)] underline"
              href="https://console.cloud.google.com/auth/clients"
              target="_blank"
              rel="noreferrer"
            >
              Open OAuth clients
            </a>
          </li>
        </ol>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
          Save the client ID, client secret and a strong token encryption key in{" "}
          <code>.env.local</code>, restart the local server, then connect or re-authorize the
          selected brand.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] p-5">
          <h2 className="font-bold">Available workspace records</h2>
        </div>
        <div className="grid gap-px bg-[var(--border)] sm:grid-cols-4">
          {[
            ["Daily analytics", analyticsRows],
            ["Videos", videoRows],
            ["Competitors", competitorRows],
            ["Channels", brandChannels.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="bg-white p-5">
              <p className="text-xs text-[var(--muted)]">{label}</p>
              <p className="mt-2 text-2xl font-bold">{Number(value).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
