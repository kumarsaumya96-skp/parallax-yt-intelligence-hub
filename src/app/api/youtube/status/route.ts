import { NextResponse } from "next/server";
import { readRuntimeState } from "@/lib/runtime-store";
import {
  connectionSummary,
  YOUTUBE_SCOPES,
  YOUTUBE_SERVICES,
  youtubeApiErrorPayload,
  youtubeJson,
} from "@/lib/youtube-client";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function probe(brandId: string, name: string, endpoint: URL) {
  try {
    await youtubeJson(brandId, endpoint);
    return { name, ready: true, detail: "API request succeeded" };
  } catch (error) {
    const result = youtubeApiErrorPayload(error);
    return {
      name,
      ready: false,
      detail: result.body.error,
      reason: "reason" in result.body ? result.body.reason : undefined,
    };
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const brandId = url.searchParams.get("brandId") ?? "";
  const shouldProbe = url.searchParams.get("probe") === "true";
  const state = await readRuntimeState();
  const rawConnection = state.youtubeConnections.find((item) => item.brandId === brandId);
  const configured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.TOKEN_ENCRYPTION_KEY,
  );
  const connection = rawConnection ? connectionSummary(rawConnection) : null;
  const granted = new Set(connection?.scopes ?? []);
  const missingScopes = YOUTUBE_SCOPES.filter((scope) => !granted.has(scope));
  const result: Record<string, unknown> = {
    configured,
    connected: Boolean(connection),
    connection,
    services: YOUTUBE_SERVICES,
    requestedScopes: YOUTUBE_SCOPES,
    missingScopes,
    liveStreamingUsesDataApi: true,
  };

  if (shouldProbe && connection) {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 2);
    const dataUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    dataUrl.search = new URLSearchParams({ part: "id", mine: "true", maxResults: "1" }).toString();
    const analyticsUrl = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
    analyticsUrl.search = new URLSearchParams({
      ids: "channel==MINE",
      startDate: isoDate(yesterday),
      endDate: isoDate(yesterday),
      metrics: "views",
    }).toString();
    const liveUrl = new URL("https://www.googleapis.com/youtube/v3/liveBroadcasts");
    liveUrl.search = new URLSearchParams({
      part: "id",
      mine: "true",
      broadcastStatus: "all",
      maxResults: "1",
    }).toString();
    result.probes = [
      await probe(brandId, "YouTube Data API v3", dataUrl),
      await probe(brandId, "YouTube Analytics API", analyticsUrl),
      await probe(brandId, "YouTube Live Streaming API", liveUrl),
    ];
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
