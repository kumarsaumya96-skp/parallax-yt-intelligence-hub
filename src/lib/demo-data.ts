import { addDays, format, subDays } from "date-fns";
import { calculateOpportunityScore } from "@/lib/scoring";
import type {
  AlertEvent,
  Brand,
  Channel,
  CommunityPost,
  Competitor,
  DailyMetric,
  Opportunity,
  OpportunitySignal,
  ReportTemplate,
  ShortExperiment,
  Video,
  VideoFormat,
} from "@/lib/types";

const DEMO_END_DATE = new Date("2026-08-31T00:00:00");

const brandSeed = [
  ["Aster Finance", "BFSI", "AF", "#6d4aff"],
  ["Nova Mobility", "Automotive", "NM", "#2563eb"],
  ["Luma Skin", "Beauty", "LS", "#db2777"],
  ["Vertex Learning", "Education", "VL", "#0891b2"],
  ["HomeHarvest", "Consumer", "HH", "#16a34a"],
  ["Orbit Telecom", "Telecom", "OT", "#7c3aed"],
  ["Northstar Health", "Healthcare", "NH", "#0d9488"],
  ["Mango Street", "Food & Beverage", "MS", "#ea580c"],
  ["TrueNest Realty", "Real Estate", "TR", "#ca8a04"],
  ["PixelForge", "Technology", "PF", "#4f46e5"],
] as const;

export const brands: Brand[] = brandSeed.map(([name, industry, initials, accent], index) => ({
  id: `brand-${index + 1}`,
  name,
  industry,
  initials,
  accountManager: ["Maya", "Rohan", "Anika", "Dev"][index % 4],
  channelId: `channel-${index + 1}`,
  accent,
}));

export const channels: Channel[] = brands.map((brand, index) => ({
  id: brand.channelId,
  brandId: brand.id,
  name: `${brand.name} India`,
  handle: `@${brand.name.toLowerCase().replaceAll(" ", "")}`,
  subscribers: 38_400 + index * 17_350,
  connected: index !== 8,
  lastSync: index === 8 ? "Connection required" : `${8 + (index % 4)} min ago`,
}));

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    return value / 4_294_967_296;
  };
}

export const dailyMetrics: DailyMetric[] = channels.flatMap((channel, channelIndex) => {
  const random = seeded(4_000 + channelIndex);
  const base = 2_900 + channelIndex * 570;
  return Array.from({ length: 90 }, (_, offset) => {
    const date = subDays(DEMO_END_DATE, 89 - offset);
    const seasonal = 1 + Math.sin(offset / 6) * 0.12;
    const momentum = channelIndex === 0 && offset > 68 ? 0.82 : 0.92 + offset / 760;
    const uploadLift = offset % (5 + (channelIndex % 3)) === 0 ? 1.32 : 1;
    const views = Math.round(base * seasonal * momentum * uploadLift * (0.86 + random() * 0.28));
    return {
      channelId: channel.id,
      date: format(date, "yyyy-MM-dd"),
      views,
      watchMinutes: Math.round(views * (2.4 + random() * 1.8)),
      subscribersGained: Math.round(views / (240 + random() * 160)),
      subscribersLost: Math.round(views / (900 + random() * 400)),
      avgViewDuration: Math.round(126 + random() * 112),
      likes: Math.round(views * (0.027 + random() * 0.018)),
      comments: Math.round(views * (0.002 + random() * 0.003)),
      shares: Math.round(views * (0.001 + random() * 0.002)),
    };
  });
});

const titleParts = [
  "A practical guide to smarter money decisions",
  "5 mistakes almost everyone makes",
  "What changed this month — explained simply",
  "The complete beginner's roadmap",
  "Behind the scenes: how it really works",
  "Quick answers to your most searched questions",
  "Before you choose: compare these options",
  "Three trends shaping what comes next",
  "A 60-second myth-busting guide",
  "How customers are getting better results",
  "The checklist nobody tells you about",
  "Expert Q&A: your top questions answered",
];

const formats: VideoFormat[] = ["Long-form", "Shorts", "Shorts", "Long-form", "Live"];
const trafficSources = ["Browse", "YouTube Search", "Suggested", "Shorts feed", "External"];

export const videos: Video[] = brands.flatMap((brand, brandIndex) => {
  const random = seeded(12_000 + brandIndex);
  return Array.from({ length: 28 }, (_, index) => {
    const formatType = formats[(index + brandIndex) % formats.length];
    const age = 4 + index * 6 + brandIndex;
    const typicalMedian = 3_100 + brandIndex * 380;
    const breakoutFactor = index % 11 === 0 ? 1.85 : index % 13 === 0 ? 0.48 : 0.78 + random() * 0.58;
    const first7Views = Math.round(typicalMedian * breakoutFactor);
    const views = Math.round(first7Views * (1.25 + age / 110) * (0.9 + random() * 0.3));
    const isResurging = index === 22;
    const engagedViews = formatType === "Shorts" ? Math.round(views * (0.62 + random() * 0.2)) : undefined;
    const averageViewPercentage = formatType === "Shorts" ? Math.round(68 + random() * 38) : undefined;
    const shownInFeed = formatType === "Shorts" ? Math.round(views / (0.63 + random() * 0.19)) : undefined;
    return {
      id: `${brand.id}-video-${index + 1}`,
      brandId: brand.id,
      channelId: brand.channelId,
      title: `${titleParts[index % titleParts.length]}${index > 11 ? ` · ${Math.floor(index / 12) + 1}` : ""}`,
      publishedAt: format(subDays(DEMO_END_DATE, age), "yyyy-MM-dd"),
      format: formatType,
      durationSeconds: formatType === "Shorts" ? 38 + (index % 18) : formatType === "Live" ? 2_400 : 310 + index * 19,
      views,
      watchMinutes: Math.round(views * (formatType === "Shorts" ? 0.45 : 3.8)),
      subscribers: Math.round(views * (0.0018 + random() * 0.003)),
      engagementRate: 0.031 + random() * 0.045,
      trafficSource: trafficSources[(index + brandIndex) % trafficSources.length],
      searchShare: index % 9 === 0 ? 0.42 : 0.08 + random() * 0.23,
      first7Views,
      typicalMedian,
      last14Views: isResurging ? 2_250 : Math.round(views * (0.08 + random() * 0.05)),
      previous14Views: isResurging ? 1_020 : Math.round(views * (0.08 + random() * 0.05)),
      tags: [brand.industry, formatType, index % 2 ? "Educational" : "Awareness"],
      thumbnailColor: ["#342266", "#12374a", "#533441", "#164335"][index % 4],
      engagedViews,
      averageViewPercentage,
      shownInFeed,
      choseToViewRate: shownInFeed && engagedViews ? (engagedViews / shownInFeed) * 100 : undefined,
    };
  });
});

const opportunityTitles = [
  "The hidden cost questions audiences are searching",
  "Competitor breakout: a simpler three-step explainer",
  "Content gap around first-time buyer decisions",
  "Resurface the evergreen fundamentals series",
  "Extend the strongest comparison format",
  "Seasonal planning checklist for the next quarter",
];

export const opportunities: Opportunity[] = brands.flatMap((brand, brandIndex) =>
  opportunityTitles.map((title, index) => {
    const signals: OpportunitySignal[] = [
      { label: "Search momentum", value: index === 1 ? null : 0.62 + ((index + brandIndex) % 4) * 0.08, weight: 30, evidence: "Owned search queries increased across the last two periods." },
      { label: "Competitor signal", value: 0.48 + ((index * 2 + brandIndex) % 5) * 0.1, weight: 25, evidence: "Two monitored competitors published above-baseline videos on this theme." },
      { label: "Coverage deficit", value: 0.55 + ((index + 2) % 4) * 0.11, weight: 20, evidence: "No owned video provides a current, dedicated answer." },
      { label: "Channel affinity", value: 0.58 + ((index + brandIndex) % 3) * 0.13, weight: 15, evidence: "Related owned videos outperform the channel topic median." },
      { label: "Freshness", value: 0.7 + (index % 3) * 0.08, weight: 10, evidence: "Signal is present in the most recent 28-day window." },
    ];
    const score = calculateOpportunityScore(signals);
    return {
      id: `${brand.id}-opportunity-${index + 1}`,
      brandId: brand.id,
      title,
      type: ["Search", "Competitor", "Content Gap", "Resurging", "High Performer", "Seasonal"][index] as Opportunity["type"],
      priority: score >= 75 ? "High" : score >= 64 ? "Medium" : "Low",
      format: formats[(index + 1) % formats.length],
      summary: "A timely, evidence-backed topic that closes an owned-channel coverage gap without treating the score as a performance guarantee.",
      concepts: ["A concise myth-vs-reality Short", "A practical long-form walkthrough", "An expert Q&A follow-up"],
      signals,
      score,
    };
  }),
);

export const competitors: Competitor[] = brands.flatMap((brand, brandIndex) =>
  Array.from({ length: 4 }, (_, index) => ({
    id: `${brand.id}-competitor-${index + 1}`,
    brandId: brand.id,
    name: `${["Bright", "Daily", "Next", "Open"][index]} ${brand.industry}`,
    subscribers: 42_000 + brandIndex * 8_000 + index * 21_500,
    recentUploads: 3 + ((brandIndex + index) % 7),
    medianViews: 3_800 + brandIndex * 460 + index * 1_120,
    shortsShare: 0.18 + index * 0.12,
    breakoutTitle: titleParts[(brandIndex + index + 2) % titleParts.length],
  })),
);

export const alerts: AlertEvent[] = brands.flatMap((brand, index) => [
  {
    id: `${brand.id}-alert-views`,
    brandId: brand.id,
    severity: index === 0 ? "critical" : index % 3 === 0 ? "warning" : "info",
    title: index === 0 ? "Views declined beyond threshold" : index % 3 === 0 ? "Upload cadence slowed" : "Video crossed 10K views",
    detail: index === 0 ? "Last 7 days are 18.4% below the previous period." : index % 3 === 0 ? "No upload detected in the last 10 days." : "A recent video passed its configured milestone.",
    createdAt: format(addDays(DEMO_END_DATE, index % 2), "yyyy-MM-dd"),
    resolved: index > 5,
  },
]);

export const reportTemplates: ReportTemplate[] = brands.map((brand, index) => ({
  id: `${brand.id}-monthly-report`,
  brandId: brand.id,
  name: "Monthly YouTube Performance",
  frequency: "Monthly",
  formats: ["Excel", "PDF"],
  sections: ["Executive Summary", "Channel Overview", "Top Videos", "Traffic Sources", "Strategy Opportunities", "Recommendations"],
  nextRun: format(addDays(DEMO_END_DATE, 2 + index), "yyyy-MM-dd"),
}));

export const shortExperiments: ShortExperiment[] = brands.flatMap((brand, index) => [
  {
    id: `${brand.id}-short-test-hook`,
    brandId: brand.id,
    title: "Direct question vs surprising fact",
    hypothesis: "Opening with the audience's exact question will increase engaged views.",
    variable: "Hook",
    variantA: "Start with a direct audience question",
    variantB: "Start with a counter-intuitive fact",
    primaryMetric: "Engaged views",
    status: index % 2 === 0 ? "Running" : "Planned",
    createdAt: "2026-08-28T09:00:00.000Z",
    source: "demo",
  },
  {
    id: `${brand.id}-short-test-cta`,
    brandId: brand.id,
    title: "Mid-story CTA vs end-card CTA",
    hypothesis: "A contextual mid-story CTA will improve subscriber conversion without reducing completion.",
    variable: "CTA",
    variantA: "Contextual CTA after the proof point",
    variantB: "CTA in the final three seconds",
    primaryMetric: "Subscribers per 1K",
    status: "Completed",
    winner: index % 3 === 0 ? "B" : "A",
    createdAt: "2026-08-12T09:00:00.000Z",
    source: "demo",
  },
]);

const postCopies = [
  "Which question should our next 60-second explainer answer?",
  "Save this three-point checklist before making your next decision.",
  "True or false: the most common advice is not always the best starting point.",
  "What is the one topic you wish someone explained without jargon?",
];

export const communityPosts: CommunityPost[] = brands.flatMap((brand, brandIndex) =>
  postCopies.map((copy, index) => ({
    id: `${brand.id}-post-${index + 1}`,
    brandId: brand.id,
    format: (["Poll", "Image", "Quiz", "Text"] as CommunityPost["format"][])[index],
    objective: (["Research", "Awareness", "Conversation", "Research"] as CommunityPost["objective"][])[index],
    copy,
    cta: index % 2 === 0 ? "Vote and explain why in the comments" : "Reply with the topic you want next",
    plannedAt: format(addDays(DEMO_END_DATE, index - 2 + brandIndex), "yyyy-MM-dd'T'HH:mm"),
    status: index < 2 ? "Published" : index === 2 ? "Scheduled" : "Draft",
    likes: index < 2 ? 180 + brandIndex * 31 + index * 54 : undefined,
    comments: index < 2 ? 32 + brandIndex * 7 + index * 11 : undefined,
    votes: index === 0 ? 740 + brandIndex * 83 : undefined,
    clicks: index < 2 ? 48 + brandIndex * 9 + index * 13 : undefined,
    createdAt: "2026-08-20T09:00:00.000Z",
    source: "demo",
  })),
);
