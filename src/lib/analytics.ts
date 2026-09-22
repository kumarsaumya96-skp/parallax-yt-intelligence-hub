import { subDays } from "date-fns";
import { channels, dailyMetrics, videos } from "@/lib/demo-data";
import type {
  Channel,
  ComparisonKey,
  CustomDateRange,
  DailyMetric,
  DateRangeKey,
} from "@/lib/types";

export const rangeDays: Record<DateRangeKey, number> = {
  today: 1,
  yesterday: 1,
  "7d": 7,
  "28d": 28,
  "this-month": 31,
  "last-month": 31,
  quarter: 90,
  year: 244,
  "365d": 365,
  custom: 28,
};

export function isValidCustomRange(range?: CustomDateRange) {
  return Boolean(
    range &&
    /^\d{4}-\d{2}-\d{2}$/.test(range.startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(range.endDate) &&
    range.startDate <= range.endDate,
  );
}

export function metricsForRange(
  channelId: string,
  range: DateRangeKey,
  source: DailyMetric[] = dailyMetrics,
  customRange?: CustomDateRange,
): DailyMetric[] {
  const rows = source.filter((metric) => metric.channelId === channelId);
  if (range === "custom" && isValidCustomRange(customRange)) {
    return rows.filter(
      (metric) => metric.date >= customRange!.startDate && metric.date <= customRange!.endDate,
    );
  }
  return rows.slice(-Math.min(rangeDays[range], rows.length));
}

export function previousMetricsForRange(
  channelId: string,
  range: DateRangeKey,
  source: DailyMetric[] = dailyMetrics,
  customRange?: CustomDateRange,
): DailyMetric[] {
  const rows = source.filter((metric) => metric.channelId === channelId);
  if (range === "custom" && isValidCustomRange(customRange)) {
    const start = new Date(customRange!.startDate + "T00:00:00Z");
    const end = new Date(customRange!.endDate + "T00:00:00Z");
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const previousEnd = new Date(start);
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setUTCDate(previousStart.getUTCDate() - days + 1);
    const previousStartDate = previousStart.toISOString().slice(0, 10);
    const previousEndDate = previousEnd.toISOString().slice(0, 10);
    return rows.filter(
      (metric) => metric.date >= previousStartDate && metric.date <= previousEndDate,
    );
  }
  const days = Math.min(rangeDays[range], Math.floor(rows.length / 2));
  return rows.slice(-(days * 2), -days);
}

export function aggregateMetrics(rows: DailyMetric[]) {
  const totals = rows.reduce(
    (sum, row) => ({
      views: sum.views + row.views,
      watchMinutes: sum.watchMinutes + row.watchMinutes,
      gained: sum.gained + row.subscribersGained,
      lost: sum.lost + row.subscribersLost,
      likes: sum.likes + row.likes,
      comments: sum.comments + row.comments,
      shares: sum.shares + row.shares,
      avgViewDuration: sum.avgViewDuration + row.avgViewDuration,
    }),
    {
      views: 0,
      watchMinutes: 0,
      gained: 0,
      lost: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      avgViewDuration: 0,
    },
  );
  return {
    ...totals,
    netSubscribers: totals.gained - totals.lost,
    engagement: totals.views ? (totals.likes + totals.comments + totals.shares) / totals.views : 0,
    avgViewDuration: rows.length ? totals.avgViewDuration / rows.length : 0,
  };
}

export function percentChange(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export function channelSummary(
  channel: Channel,
  range: DateRangeKey,
  metricSource: DailyMetric[] = dailyMetrics,
  videoSource = videos,
  customRange?: CustomDateRange,
) {
  const current = aggregateMetrics(metricsForRange(channel.id, range, metricSource, customRange));
  const previous = aggregateMetrics(
    previousMetricsForRange(channel.id, range, metricSource, customRange),
  );
  const topVideo = videoSource
    .filter((video) => video.channelId === channel.id)
    .sort((a, b) => b.views - a.views)[0];
  return {
    ...current,
    change: percentChange(current.views, previous.views),
    topVideo,
  };
}

export function comparisonLabel(comparison: ComparisonKey) {
  return {
    previous: "vs previous period",
    "previous-month": "vs previous month",
    "previous-year": "vs previous year",
    custom: "vs custom period",
    none: "comparison off",
  }[comparison];
}

export function portfolioSummary(
  range: DateRangeKey,
  channelSource = channels,
  metricSource: DailyMetric[] = dailyMetrics,
  videoSource = videos,
  customRange?: CustomDateRange,
) {
  return channelSource.map((channel) => ({
    channel,
    summary: channelSummary(channel, range, metricSource, videoSource, customRange),
  }));
}

export function formatMetric(value: number, compact = true) {
  if (compact && Math.abs(value) >= 1_000) {
    return new Intl.NumberFormat("en-IN", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
}

export function demoRangeLabel(range: DateRangeKey, customRange?: CustomDateRange) {
  if (range === "custom" && isValidCustomRange(customRange)) {
    const formatter = new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    return (
      formatter.format(new Date(customRange!.startDate + "T00:00:00Z")) +
      " – " +
      formatter.format(new Date(customRange!.endDate + "T00:00:00Z"))
    );
  }
  return String(rangeDays[range]) + " days ending 31 Aug 2026";
}

export function dateSeries(
  channelId: string,
  range: DateRangeKey,
  source: DailyMetric[] = dailyMetrics,
  customRange?: CustomDateRange,
) {
  return metricsForRange(channelId, range, source, customRange).map((row) => ({
    ...row,
    label: new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(
      new Date(row.date),
    ),
  }));
}

export function seededToday() {
  return subDays(new Date("2026-09-01"), 1);
}
