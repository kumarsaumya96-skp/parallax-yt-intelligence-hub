import type {
  AiContentSuggestion,
  AiKeywordSuggestion,
  AiVisibilityKeywordResult,
  AiVisibilitySurfaceResult,
  Brand,
  Video,
} from "@/lib/types";

const stopWords = new Set([
  "about",
  "after",
  "almost",
  "also",
  "and",
  "are",
  "before",
  "behind",
  "best",
  "better",
  "complete",
  "every",
  "explained",
  "from",
  "getting",
  "guide",
  "have",
  "how",
  "into",
  "makes",
  "most",
  "next",
  "our",
  "roadmap",
  "should",
  "smarter",
  "that",
  "the",
  "their",
  "these",
  "this",
  "three",
  "what",
  "when",
  "with",
  "your",
]);

function normalizeKeyword(value: string) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return normalizeKeyword(value)
    .split(" ")
    .filter((token) => token.length > 2 && !stopWords.has(token) && !/^\d+$/.test(token));
}

export function extractKeywordPhrases(phrases: string[], limit = 8) {
  const counts = new Map<string, number>();
  for (const phrase of phrases) {
    const words = tokens(phrase);
    for (let size = 2; size <= 3; size += 1) {
      for (let index = 0; index <= words.length - size; index += 1) {
        const candidate = words.slice(index, index + size).join(" ");
        counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([keyword]) => keyword);
}

export function inferKeywordIntent(keyword: string): AiVisibilityKeywordResult["intent"] {
  const normalized = normalizeKeyword(keyword);
  if (/\b(how to|guide|steps|checklist|tutorial)\b/.test(normalized)) return "How-to";
  if (/^(how|why|when|where|can|does|is|should)\b/.test(normalized)) return "Question";
  if (/\b(vs|versus|compare|comparison|best|top)\b/.test(normalized)) return "Comparison";
  if (/\b(meaning|definition|what is|explained)\b/.test(normalized)) return "Definition";
  return "Exploration";
}

export function discoverKeywords(brand: Brand, videos: Video[], seeds: string[], limit = 8) {
  const scored = new Map<string, { score: number; source: AiKeywordSuggestion["source"] }>();
  const add = (keyword: string, score: number, source: AiKeywordSuggestion["source"]) => {
    const normalized = normalizeKeyword(keyword);
    if (normalized.length < 3 || normalized.length > 90) return;
    const current = scored.get(normalized);
    if (!current || current.score < score) scored.set(normalized, { score, source });
  };

  seeds.forEach((seed, index) => add(seed, 120 - index, "Seed"));
  for (const video of videos) {
    const words = tokens(video.title);
    const performanceWeight = Math.min(24, Math.log10(Math.max(10, video.views)) * 5);
    for (let size = 2; size <= 3; size += 1) {
      for (let index = 0; index <= words.length - size; index += 1) {
        add(words.slice(index, index + size).join(" "), 20 + performanceWeight, "Owned metadata");
      }
    }
    video.tags.forEach((tag) => add(tag, 18 + performanceWeight / 2, "Owned metadata"));
  }

  add(`${brand.industry} explained`, 31, "Owned metadata");
  add(`${brand.industry} questions`, 28, "Owned metadata");
  return [...scored.entries()]
    .sort((left, right) => right[1].score - left[1].score || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([keyword, data]) => ({ keyword, source: data.source }));
}

export function ownedCoverage(keyword: string, videos: Video[]) {
  const parts = tokens(keyword);
  if (parts.length === 0) return 0;
  return videos.filter((video) => {
    const haystack = normalizeKeyword(`${video.title} ${video.tags.join(" ")}`);
    return parts.every((part) => haystack.includes(part));
  }).length;
}

export function buildKeywordSuggestions(
  keywordRows: AiVisibilityKeywordResult[],
  sources: Map<string, AiKeywordSuggestion["source"]>,
): AiKeywordSuggestion[] {
  return keywordRows.map((row) => ({
    keyword: row.keyword,
    priority: row.opportunityScore >= 72 ? "High" : row.opportunityScore >= 48 ? "Medium" : "Low",
    reason:
      row.ownedCoverage === 0
        ? "No owned video directly covers this query."
        : row.surfaces.some((surface) => surface.status === "cited")
          ? "The channel is visible; strengthen the cited format and adjacent questions."
          : "Owned coverage exists, but no configured AI surface cited it in this check.",
    source: sources.get(row.keyword) ?? "Owned metadata",
  }));
}

export function buildContentSuggestions(
  brand: Brand,
  keywords: AiVisibilityKeywordResult[],
): AiContentSuggestion[] {
  const year = new Date().getFullYear();
  return [...keywords]
    .sort((left, right) => right.opportunityScore - left.opportunityScore)
    .slice(0, 4)
    .map((row, index) => ({
      title:
        row.intent === "Comparison"
          ? `${titleCase(row.keyword)}: the evidence-led comparison for ${year}`
          : `${titleCase(row.keyword)}: a clear answer from ${brand.name}`,
      format: index % 3 === 1 ? "Shorts" : "Long-form",
      primaryKeyword: row.keyword,
      angle:
        row.ownedCoverage === 0
          ? "Close the coverage gap with a direct, self-contained answer."
          : "Refresh the strongest owned answer with clearer entities, evidence and structure.",
      llmReadiness: [
        "State the direct answer in the opening 30 seconds",
        "Use descriptive chapters and a question-led transcript",
        "Add named sources, dates and definitions in the description",
        "End with a concise FAQ covering adjacent queries",
      ],
    }));
}

export function opportunityScore(coverage: number, surfaces: AiVisibilitySurfaceResult[]) {
  const configured = surfaces.filter((surface) => surface.status !== "unavailable");
  const cited = configured.filter((surface) => surface.status === "cited").length;
  const liveGap = configured.length ? 1 - cited / configured.length : 0.55;
  const coverageGap = coverage === 0 ? 1 : coverage === 1 ? 0.65 : 0.3;
  return Math.round((liveGap * 0.68 + coverageGap * 0.32) * 100);
}

export function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
