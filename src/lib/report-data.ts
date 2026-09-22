import {
  aggregateMetrics,
  demoRangeLabel,
  isValidCustomRange,
  metricsForRange,
} from "@/lib/analytics";
import { brands, channels, competitors, opportunities, videos } from "@/lib/demo-data";
import { readRuntimeState } from "@/lib/runtime-store";
import type { Channel, CustomDateRange, DateRangeKey, Video } from "@/lib/types";

function videosForPeriod(
  source: Video[],
  brandId: string,
  range: DateRangeKey,
  customRange?: CustomDateRange,
) {
  return source
    .filter((item) => item.brandId === brandId)
    .filter(
      (item) =>
        range !== "custom" ||
        !isValidCustomRange(customRange) ||
        (item.publishedAt >= customRange!.startDate && item.publishedAt <= customRange!.endDate),
    )
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
}

export function getReportData(
  brandId: string,
  range: DateRangeKey = "28d",
  customRange?: CustomDateRange,
) {
  const brand = brands.find((item) => item.id === brandId) ?? brands[0];
  const channel = channels.find((item) => item.brandId === brand.id)!;
  const metrics = metricsForRange(channel.id, range, undefined, customRange);
  const aggregate = aggregateMetrics(metrics);
  const topVideos = videosForPeriod(videos, brand.id, range, customRange);
  const brandOpportunities = opportunities
    .filter((item) => item.brandId === brand.id)
    .sort((a, b) => b.score - a.score);
  return {
    brand,
    channel,
    metrics,
    aggregate,
    topVideos,
    opportunities: brandOpportunities,
    competitors: competitors.filter((item) => item.brandId === brand.id),
    period: demoRangeLabel(range, customRange),
    isDemo: true,
    executiveSummary:
      "Views softened versus the previous period while YouTube Search remained resilient. The clearest next step is to restore long-form cadence and extend the strongest decision-focused topic. This commentary is deterministic demo copy and should be reviewed before client delivery.",
  };
}

export async function getWorkspaceReportData(
  brandId: string,
  range: DateRangeKey = "28d",
  customRange?: CustomDateRange,
) {
  const state = await readRuntimeState();
  const brand = state.brands.find((item) => item.id === brandId);
  if (!brand) throw new Error("Brand not found in this workspace.");
  const channel =
    state.channels.find((item) => item.brandId === brand.id) ??
    ({
      id: brand.channelId || "unconnected-" + brand.id,
      brandId: brand.id,
      name: brand.name + " YouTube",
      handle: "Not connected",
      subscribers: 0,
      connected: false,
      lastSync: "Not synced",
      source: "manual",
    } satisfies Channel);
  const metrics = metricsForRange(channel.id, range, state.dailyMetrics, customRange);
  const aggregate = aggregateMetrics(metrics);
  const topVideos = videosForPeriod(state.videos, brand.id, range, customRange);
  const brandOpportunities = state.opportunities
    .filter((item) => item.brandId === brand.id)
    .sort((a, b) => b.score - a.score);
  const lastDate = metrics.at(-1)?.date;
  const period =
    range === "custom" && isValidCustomRange(customRange)
      ? demoRangeLabel(range, customRange)
      : lastDate
        ? String(metrics.length) +
          " days ending " +
          new Intl.DateTimeFormat("en", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(lastDate + "T00:00:00Z"))
        : "No synced analytics period";
  const isDemo = brand.source === "demo";
  const executiveSummary = isDemo
    ? "Views softened versus the previous period while YouTube Search remained resilient. The clearest next step is to restore long-form cadence and extend the strongest decision-focused topic. This commentary is deterministic demo copy and should be reviewed before client delivery."
    : metrics.length > 0
      ? aggregate.views.toLocaleString() +
        " views and " +
        aggregate.netSubscribers.toLocaleString() +
        " net subscribers were recorded across " +
        metrics.length +
        " available daily rows. Source-level drivers are withheld until detailed traffic and search analytics are available."
      : "No owned-channel analytics are available for this report yet. Connect YouTube and complete a sync before adding performance commentary.";
  return {
    brand,
    channel,
    metrics,
    aggregate,
    topVideos,
    opportunities: brandOpportunities,
    competitors: state.competitors.filter((item) => item.brandId === brand.id),
    period,
    isDemo,
    executiveSummary,
  };
}
