import type { Video } from "@/lib/types";

export interface ShortSignal {
  label: "Hook" | "Hold" | "Engaged views" | "Engagement" | "Conversion";
  value: number | null;
  weight: number;
  display: string;
}

export interface ShortAnalysis {
  video: Video;
  score: number;
  focus: ShortSignal["label"];
  signals: ShortSignal[];
}

export function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function analyzeShorts(source: Video[]): ShortAnalysis[] {
  const shorts = source.filter((video) => video.format === "Shorts");
  const engagedMedian = median(shorts.map((video) => video.engagedViews ?? video.views));
  const engagementMedian = median(shorts.map((video) => video.engagementRate));
  const conversionMedian = median(shorts.map((video) => video.views > 0 ? (video.subscribers / video.views) * 1000 : 0));

  return shorts.map((video) => {
    const engaged = video.engagedViews ?? video.views;
    const conversion = video.views > 0 ? (video.subscribers / video.views) * 1000 : 0;
    const signals: ShortSignal[] = [
      { label: "Hook", value: video.choseToViewRate === undefined ? null : clamp(video.choseToViewRate / 70), weight: 25, display: video.choseToViewRate === undefined ? "Unavailable" : `${video.choseToViewRate.toFixed(1)}% chose to view` },
      { label: "Hold", value: video.averageViewPercentage === undefined ? null : clamp(video.averageViewPercentage / 100), weight: 25, display: video.averageViewPercentage === undefined ? "Unavailable" : `${video.averageViewPercentage.toFixed(0)}% viewed` },
      { label: "Engaged views", value: engagedMedian > 0 ? clamp(engaged / (engagedMedian * 1.5)) : null, weight: 20, display: `${engaged.toLocaleString()} engaged views` },
      { label: "Engagement", value: engagementMedian > 0 ? clamp(video.engagementRate / (engagementMedian * 1.4)) : null, weight: 15, display: `${(video.engagementRate * 100).toFixed(1)}% engagement` },
      { label: "Conversion", value: conversionMedian > 0 ? clamp(conversion / (conversionMedian * 1.5)) : null, weight: 15, display: `${conversion.toFixed(1)} subscribers / 1K` },
    ];
    const available = signals.filter((signal): signal is ShortSignal & { value: number } => signal.value !== null);
    const availableWeight = available.reduce((sum, signal) => sum + signal.weight, 0);
    const score = availableWeight ? Math.round(available.reduce((sum, signal) => sum + signal.value * signal.weight, 0) / availableWeight * 100) : 0;
    const focus = [...available].sort((a, b) => a.value - b.value)[0]?.label ?? "Engaged views";
    return { video, score, focus, signals };
  }).sort((a, b) => b.score - a.score);
}

export function shortsSummary(source: Video[]) {
  const shorts = source.filter((video) => video.format === "Shorts");
  const completionRows = shorts.map((video) => video.averageViewPercentage).filter((value): value is number => value !== undefined);
  const choseRows = shorts.map((video) => video.choseToViewRate).filter((value): value is number => value !== undefined);
  const conversions = shorts.map((video) => video.views > 0 ? (video.subscribers / video.views) * 1000 : 0);
  return {
    count: shorts.length,
    medianEngagedViews: median(shorts.map((video) => video.engagedViews ?? video.views)),
    averageViewPercentage: completionRows.length ? completionRows.reduce((sum, value) => sum + value, 0) / completionRows.length : null,
    choseToViewRate: choseRows.length ? choseRows.reduce((sum, value) => sum + value, 0) / choseRows.length : null,
    subscribersPerThousand: conversions.length ? conversions.reduce((sum, value) => sum + value, 0) / conversions.length : 0,
  };
}

export function durationPerformance(source: Video[]) {
  const buckets = [
    { label: "Under 30s", matches: (seconds: number) => seconds < 30 },
    { label: "30–45s", matches: (seconds: number) => seconds >= 30 && seconds <= 45 },
    { label: "46–60s", matches: (seconds: number) => seconds > 45 && seconds <= 60 },
    { label: "Over 60s", matches: (seconds: number) => seconds > 60 },
  ];
  const shorts = source.filter((video) => video.format === "Shorts");
  return buckets.map((bucket) => {
    const rows = shorts.filter((video) => bucket.matches(video.durationSeconds));
    const completion = rows.map((video) => video.averageViewPercentage).filter((value): value is number => value !== undefined);
    return {
      label: bucket.label,
      videos: rows.length,
      medianEngagedViews: median(rows.map((video) => video.engagedViews ?? video.views)),
      averageViewPercentage: completion.length ? completion.reduce((sum, value) => sum + value, 0) / completion.length : null,
      engagementRate: rows.length ? rows.reduce((sum, video) => sum + video.engagementRate, 0) / rows.length : 0,
    };
  }).filter((bucket) => bucket.videos > 0);
}
