import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildContentSuggestions,
  buildKeywordSuggestions,
  discoverKeywords,
  extractKeywordPhrases,
  inferKeywordIntent,
  opportunityScore,
  ownedCoverage,
} from "@/lib/ai-visibility";
import {
  checkGeminiGrounding,
  checkGoogleAiOverview,
  checkOpenAiWebSearch,
  checkYouTubeSearch,
} from "@/lib/ai-visibility-providers";
import { readRuntimeState, writeRuntimeState } from "@/lib/runtime-store";
import type { AiKeywordSuggestion, AiVisibilityKeywordResult, AiVisibilityRun } from "@/lib/types";

const payloadSchema = z.object({
  brandId: z.string().min(1).max(100),
  seedKeywords: z.array(z.string().trim().min(2).max(100)).max(12).default([]),
  country: z.string().trim().length(2).default("IN"),
  language: z.string().trim().min(2).max(10).default("en"),
});

export async function POST(request: Request) {
  const result = payloadSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json(
      { error: "Check the brand, keywords and market settings.", issues: result.error.issues },
      { status: 400 },
    );
  }

  const state = await readRuntimeState();
  const brand = state.brands.find((item) => item.id === result.data.brandId);
  if (!brand) return NextResponse.json({ error: "Brand not found." }, { status: 404 });
  const channel = state.channels.find((item) => item.brandId === brand.id);
  const videos = state.videos.filter((item) => item.brandId === brand.id);
  const connection = state.youtubeConnections.find((item) => item.brandId === brand.id);
  const targetChannelId = String(connection?.channelId ?? channel?.youtubeChannelId ?? "");
  const discovered = discoverKeywords(brand, videos, result.data.seedKeywords, 5);
  if (discovered.length === 0) {
    return NextResponse.json(
      { error: "Add at least one seed keyword or sync video metadata first." },
      { status: 400 },
    );
  }

  const providerStatus: AiVisibilityRun["providerStatus"] = {
    "YouTube Search": Boolean(connection && targetChannelId),
    "Google AI Overview": Boolean(process.env.SERPAPI_API_KEY),
    "OpenAI web search": Boolean(process.env.OPENAI_API_KEY),
    "Gemini grounded search": Boolean(process.env.GEMINI_API_KEY),
  };
  const liveProviderCount = Object.values(providerStatus).filter(Boolean).length;
  const keywordRows: AiVisibilityKeywordResult[] = [];
  const relatedPhrases: { value: string; source: AiKeywordSuggestion["source"] }[] = [];

  for (const candidate of discovered) {
    const context = {
      brandId: brand.id,
      keyword: candidate.keyword,
      brandName: brand.name,
      channelId: targetChannelId || undefined,
      channelHandle: channel?.handle,
      videoIds: videos.map((video) => video.id),
      country: result.data.country.toUpperCase(),
      language: result.data.language.toLowerCase(),
    };
    const checks = await Promise.all([
      checkYouTubeSearch(context),
      checkGoogleAiOverview(context),
      checkOpenAiWebSearch(context),
      checkGeminiGrounding(context),
    ]);
    const coverage = ownedCoverage(candidate.keyword, videos);
    const surfaces = checks.map((check) => check.result);
    keywordRows.push({
      keyword: candidate.keyword,
      intent: inferKeywordIntent(candidate.keyword),
      ownedCoverage: coverage,
      opportunityScore: opportunityScore(coverage, surfaces),
      surfaces,
    });
    checks.forEach((check, index) =>
      check.relatedKeywords.forEach((value) =>
        relatedPhrases.push({
          value,
          source: index === 0 ? "YouTube results" : "Google related search",
        }),
      ),
    );
  }

  const sourceMap = new Map(discovered.map((item) => [item.keyword, item.source]));
  const primarySuggestions = buildKeywordSuggestions(keywordRows, sourceMap);
  const analyzed = new Set(primarySuggestions.map((item) => item.keyword));
  const relatedSuggestions = extractKeywordPhrases(
    relatedPhrases.map((item) => item.value),
    6,
  )
    .filter((keyword) => !analyzed.has(keyword))
    .map((keyword) => ({
      keyword,
      priority: "Medium" as const,
      reason:
        "This phrase recurred in live search results and is worth validating as an adjacent query.",
      source:
        relatedPhrases.find((item) => item.value.toLowerCase().includes(keyword))?.source ??
        ("YouTube results" as const),
    }));
  const mode: AiVisibilityRun["mode"] =
    liveProviderCount === 0 ? "preview" : liveProviderCount === 4 ? "live" : "mixed";
  const run: AiVisibilityRun = {
    id: crypto.randomUUID(),
    brandId: brand.id,
    createdAt: new Date().toISOString(),
    mode,
    country: result.data.country.toUpperCase(),
    language: result.data.language.toLowerCase(),
    providerStatus,
    keywords: keywordRows.sort((left, right) => right.opportunityScore - left.opportunityScore),
    keywordSuggestions: [...primarySuggestions, ...relatedSuggestions].slice(0, 12),
    contentSuggestions: buildContentSuggestions(brand, keywordRows),
  };
  state.aiVisibilityRuns.unshift(run);
  state.aiVisibilityRuns = state.aiVisibilityRuns.slice(0, 40);
  await writeRuntimeState(state);
  return NextResponse.json({ ok: true, run }, { status: 201 });
}
