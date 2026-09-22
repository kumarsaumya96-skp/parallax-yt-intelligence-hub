import "server-only";

import type {
  AiVisibilityCitation,
  AiVisibilitySurface,
  AiVisibilitySurfaceResult,
} from "@/lib/types";
import { youtubeJson } from "@/lib/youtube-client";

interface ProviderContext {
  brandId: string;
  keyword: string;
  brandName: string;
  channelId?: string;
  channelHandle?: string;
  videoIds: string[];
  country: string;
  language: string;
}

interface ProviderCheck {
  result: AiVisibilitySurfaceResult;
  relatedKeywords: string[];
}

function safeUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function isOwnedUrl(url: string, context: ProviderContext) {
  const normalized = url.toLowerCase();
  return (
    context.videoIds.some(
      (id) =>
        normalized.includes(`watch?v=${id.toLowerCase()}`) ||
        normalized.includes(`youtu.be/${id.toLowerCase()}`),
    ) ||
    Boolean(context.channelId && normalized.includes(context.channelId.toLowerCase())) ||
    Boolean(context.channelHandle && normalized.includes(context.channelHandle.toLowerCase()))
  );
}

function normalizeCitations(
  rows: { title?: unknown; url?: unknown; link?: unknown }[],
  context: ProviderContext,
) {
  const seen = new Set<string>();
  const citations: AiVisibilityCitation[] = [];
  for (const row of rows) {
    const url = safeUrl(row.url ?? row.link);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    citations.push({
      title: typeof row.title === "string" && row.title.trim() ? row.title : new URL(url).hostname,
      url,
      owned: isOwnedUrl(url, context),
    });
  }
  return citations;
}

function unavailable(surface: AiVisibilitySurface, detail: string): ProviderCheck {
  return { result: { surface, status: "unavailable", detail, citations: [] }, relatedKeywords: [] };
}

export async function checkYouTubeSearch(context: ProviderContext): Promise<ProviderCheck> {
  if (!context.channelId)
    return unavailable(
      "YouTube Search",
      "Connect this brand's YouTube channel to run a live ranking check.",
    );
  try {
    const endpoint = new URL("https://www.googleapis.com/youtube/v3/search");
    endpoint.search = new URLSearchParams({
      part: "snippet",
      q: context.keyword,
      type: "video",
      order: "relevance",
      maxResults: "15",
      safeSearch: "moderate",
      regionCode: context.country,
      relevanceLanguage: context.language,
    }).toString();
    const payload = await youtubeJson<{
      items?: {
        id?: { videoId?: string };
        snippet?: { title?: string; channelId?: string; channelTitle?: string };
      }[];
    }>(context.brandId, endpoint);
    const items = payload.items ?? [];
    const citations: AiVisibilityCitation[] = items.flatMap((item) => {
      const videoId = item.id?.videoId;
      if (!videoId) return [];
      return [
        {
          title: item.snippet?.title?.trim() || "YouTube video",
          url: `https://www.youtube.com/watch?v=${videoId}`,
          owned:
            item.snippet?.channelId === context.channelId || context.videoIds.includes(videoId),
        },
      ];
    });
    const rankIndex = items.findIndex(
      (item) =>
        item.snippet?.channelId === context.channelId ||
        Boolean(item.id?.videoId && context.videoIds.includes(item.id.videoId)),
    );
    return {
      result: {
        surface: "YouTube Search",
        status: rankIndex >= 0 ? "cited" : "not-cited",
        detail:
          rankIndex >= 0
            ? `Owned video found at position ${rankIndex + 1} of ${items.length}.`
            : `No owned video found in the first ${items.length} YouTube results.`,
        citations: citations.slice(0, 5),
        rank: rankIndex >= 0 ? rankIndex + 1 : null,
      },
      relatedKeywords: items
        .map((item) => item.snippet?.title ?? "")
        .filter(Boolean)
        .slice(0, 8),
    };
  } catch (error) {
    return unavailable(
      "YouTube Search",
      error instanceof Error ? error.message : "The YouTube ranking check failed.",
    );
  }
}

interface SerpPayload {
  error?: string;
  page_token?: string;
  references?: { title?: unknown; link?: unknown }[];
  text_blocks?: unknown[];
  ai_overview?: {
    page_token?: string;
    references?: { title?: unknown; link?: unknown }[];
    text_blocks?: unknown[];
  };
  related_searches?: { query?: string }[];
}

async function serpRequest(parameters: Record<string, string>) {
  const endpoint = new URL("https://serpapi.com/search.json");
  endpoint.search = new URLSearchParams(parameters).toString();
  const response = await fetch(endpoint, { cache: "no-store" });
  const payload = (await response.json()) as SerpPayload;
  if (!response.ok || payload.error)
    throw new Error(payload.error ?? `SerpApi failed (${response.status}).`);
  return payload;
}

export async function checkGoogleAiOverview(context: ProviderContext): Promise<ProviderCheck> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey)
    return unavailable(
      "Google AI Overview",
      "Add SERPAPI_API_KEY to check live AI Overview citations.",
    );
  try {
    const initial = await serpRequest({
      engine: "google",
      q: context.keyword,
      api_key: apiKey,
      gl: context.country.toLowerCase(),
      hl: context.language,
      no_cache: "true",
    });
    let overview = initial.ai_overview;
    if (overview?.page_token) {
      const expanded = await serpRequest({
        engine: "google_ai_overview",
        page_token: overview.page_token,
        api_key: apiKey,
        no_cache: "true",
      });
      overview =
        expanded.ai_overview ??
        ({
          page_token: expanded.page_token,
          references: expanded.references,
          text_blocks: expanded.text_blocks,
        } satisfies NonNullable<SerpPayload["ai_overview"]>);
    }
    const citations = normalizeCitations(overview?.references ?? [], context);
    const owned = citations.filter((citation) => citation.owned);
    return {
      result: {
        surface: "Google AI Overview",
        status: owned.length ? "cited" : "not-cited",
        detail: overview
          ? owned.length
            ? `${owned.length} owned video citation${owned.length === 1 ? "" : "s"} found in the AI Overview.`
            : "An AI Overview appeared, but it did not cite an owned video."
          : "No AI Overview appeared for this query in the selected market.",
        citations: citations.slice(0, 6),
      },
      relatedKeywords: (initial.related_searches ?? [])
        .map((item) => item.query?.trim() ?? "")
        .filter(Boolean),
    };
  } catch (error) {
    return unavailable(
      "Google AI Overview",
      error instanceof Error ? error.message : "The AI Overview check failed.",
    );
  }
}

function collectCitations(value: unknown, rows: { title?: unknown; url?: unknown }[] = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectCitations(item, rows));
    return rows;
  }
  if (!value || typeof value !== "object") return rows;
  const record = value as Record<string, unknown>;
  if (record.type === "url_citation" && typeof record.url === "string") {
    rows.push({ title: record.title, url: record.url });
  }
  Object.values(record).forEach((item) => collectCitations(item, rows));
  return rows;
}

function collectText(value: unknown, rows: string[] = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, rows));
    return rows;
  }
  if (!value || typeof value !== "object") return rows;
  const record = value as Record<string, unknown>;
  if (
    (record.type === "output_text" || record.type === "text") &&
    typeof record.text === "string"
  ) {
    rows.push(record.text);
  }
  Object.values(record).forEach((item) => collectText(item, rows));
  return rows;
}

function visibilityPrompt(context: ProviderContext) {
  return [
    `A user is researching: ${context.keyword}`,
    "Find and recommend the most useful YouTube videos that directly answer this query.",
    "Prefer clear, evidence-based videos. Return a concise answer and cite the exact video or channel URLs used.",
  ].join("\n");
}

export async function checkOpenAiWebSearch(context: ProviderContext): Promise<ProviderCheck> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return unavailable("OpenAI web search", "Add OPENAI_API_KEY to check web-search citations.");
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        tools: [{ type: "web_search" }],
        include: ["web_search_call.action.sources"],
        input: visibilityPrompt(context),
        store: false,
      }),
      cache: "no-store",
    });
    const payload = (await response.json()) as Record<string, unknown> & {
      error?: { message?: string };
    };
    if (!response.ok)
      throw new Error(payload.error?.message ?? `OpenAI request failed (${response.status}).`);
    const citations = normalizeCitations(collectCitations(payload), context);
    const answer = collectText(payload).join(" ");
    const owned = citations.filter((citation) => citation.owned);
    return {
      result: {
        surface: "OpenAI web search",
        status: owned.length ? "cited" : "not-cited",
        detail: owned.length
          ? `${owned.length} owned YouTube citation${owned.length === 1 ? "" : "s"} found.`
          : answer.toLowerCase().includes(context.brandName.toLowerCase())
            ? "The brand was mentioned, but no owned video URL was cited."
            : "No owned video citation appeared in this grounded response.",
        citations: citations.slice(0, 6),
      },
      relatedKeywords: [],
    };
  } catch (error) {
    return unavailable(
      "OpenAI web search",
      error instanceof Error ? error.message : "The OpenAI visibility check failed.",
    );
  }
}

export async function checkGeminiGrounding(context: ProviderContext): Promise<ProviderCheck> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return unavailable(
      "Gemini grounded search",
      "Add GEMINI_API_KEY to check grounded-search citations.",
    );
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
        input: visibilityPrompt(context),
        tools: [{ type: "google_search" }],
        store: false,
      }),
      cache: "no-store",
    });
    const payload = (await response.json()) as Record<string, unknown> & {
      error?: { message?: string };
    };
    if (!response.ok)
      throw new Error(payload.error?.message ?? `Gemini request failed (${response.status}).`);
    const citations = normalizeCitations(collectCitations(payload), context);
    const answer = collectText(payload).join(" ");
    const owned = citations.filter((citation) => citation.owned);
    return {
      result: {
        surface: "Gemini grounded search",
        status: owned.length ? "cited" : "not-cited",
        detail: owned.length
          ? `${owned.length} owned YouTube citation${owned.length === 1 ? "" : "s"} found.`
          : answer.toLowerCase().includes(context.brandName.toLowerCase())
            ? "The brand was mentioned, but no owned video URL was cited."
            : "No owned video citation appeared in this grounded response.",
        citations: citations.slice(0, 6),
      },
      relatedKeywords: [],
    };
  } catch (error) {
    return unavailable(
      "Gemini grounded search",
      error instanceof Error ? error.message : "The Gemini visibility check failed.",
    );
  }
}
