import type { Diagnostic, OpportunitySignal, Video } from "@/lib/types";

export function calculateOpportunityScore(signals: OpportunitySignal[]): number {
  const available = signals.filter((signal) => signal.value !== null);
  const availableWeight = available.reduce((sum, signal) => sum + signal.weight, 0);
  if (availableWeight === 0) return 0;

  const weighted = available.reduce(
    (sum, signal) => sum + (signal.value ?? 0) * signal.weight,
    0,
  );
  return Math.round((weighted / availableWeight) * 100);
}

export function calculateDiagnostic(video: Video): Diagnostic {
  if (video.typicalMedian < 400 || video.views < 300) {
    return {
      label: "Typical",
      score: 50,
      rule: "No label when the comparison sample or view floor is too small.",
      evidence: ["Sample below the configured confidence floor"],
      sampleSufficient: false,
    };
  }

  const firstWeekRatio = video.first7Views / video.typicalMedian;
  const resurgenceRatio = video.previous14Views > 0 ? video.last14Views / video.previous14Views : 0;
  const ageDays = Math.floor(
    (new Date("2026-08-31").getTime() - new Date(video.publishedAt).getTime()) / 86_400_000,
  );

  if (ageDays >= 90 && resurgenceRatio >= 1.5 && video.last14Views >= 750) {
    return {
      label: "Resurging",
      score: Math.min(97, Math.round(70 + resurgenceRatio * 8)),
      rule: "Age >= 90 days and last 14-day views >= 1.5x prior 14 days, with a view floor.",
      evidence: [
        `${ageDays} days since publication`,
        `${resurgenceRatio.toFixed(1)}x recent-view acceleration`,
        `${video.last14Views.toLocaleString()} views in the last 14 days`,
      ],
      sampleSufficient: true,
    };
  }

  if (firstWeekRatio >= 1.5) {
    return {
      label: "Breakout",
      score: Math.min(98, Math.round(68 + firstWeekRatio * 12)),
      rule: "First 7-day views >= 1.5x the comparable recent-video median.",
      evidence: [
        `${firstWeekRatio.toFixed(1)}x comparable median`,
        `${video.first7Views.toLocaleString()} first-week views`,
      ],
      sampleSufficient: true,
    };
  }

  if (firstWeekRatio <= 0.6) {
    return {
      label: "Underperforming",
      score: Math.max(16, Math.round(45 * firstWeekRatio)),
      rule: "First 7-day views <= 0.6x the comparable recent-video median.",
      evidence: [
        `${Math.round(firstWeekRatio * 100)}% of comparable median`,
        `${video.first7Views.toLocaleString()} first-week views`,
      ],
      sampleSufficient: true,
    };
  }

  if (video.searchShare >= 0.34) {
    return {
      label: "Strong Search",
      score: Math.round(68 + video.searchShare * 60),
      rule: "YouTube Search share materially exceeds the channel median.",
      evidence: [`${Math.round(video.searchShare * 100)}% of views from YouTube Search`],
      sampleSufficient: true,
    };
  }

  if ((video.subscribers / video.views) * 1000 >= 3.5) {
    return {
      label: "Subscriber Driver",
      score: 78,
      rule: "Subscribers gained per 1,000 views materially exceeds the channel median.",
      evidence: [`${((video.subscribers / video.views) * 1000).toFixed(1)} subscribers per 1,000 views`],
      sampleSufficient: true,
    };
  }

  if (ageDays >= 90 && resurgenceRatio >= 0.85 && resurgenceRatio <= 1.2) {
    return {
      label: "Evergreen",
      score: 72,
      rule: "Meaningful, stable viewing across recent periods after 90 days.",
      evidence: [`${Math.round(resurgenceRatio * 100)}% recent-period stability`, `${ageDays} days old`],
      sampleSufficient: true,
    };
  }

  return {
    label: "Typical",
    score: Math.max(45, Math.min(70, Math.round(50 + firstWeekRatio * 10))),
    rule: "Performance remains within the expected comparable-video range.",
    evidence: [`${firstWeekRatio.toFixed(1)}x comparable median`],
    sampleSufficient: true,
  };
}
