import { NextResponse } from "next/server";
import { z } from "zod";
import { youtubeApiErrorPayload, youtubeJson } from "@/lib/youtube-client";

const presets = {
  overview: {
    dimensions: "day",
    metrics:
      "views,engagedViews,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments,shares",
    sort: "day",
  },
  videos: {
    dimensions: "video",
    metrics:
      "views,engagedViews,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares",
    sort: "-views",
    maxResults: "50",
  },
  demographics: {
    dimensions: "ageGroup,gender",
    metrics: "viewerPercentage",
    sort: "-viewerPercentage",
  },
  geography: {
    dimensions: "country",
    metrics: "views,estimatedMinutesWatched,averageViewDuration",
    sort: "-views",
    maxResults: "50",
  },
  traffic: {
    dimensions: "insightTrafficSourceType",
    metrics: "views,estimatedMinutesWatched",
    sort: "-views",
  },
  devices: {
    dimensions: "deviceType,operatingSystem",
    metrics: "views,estimatedMinutesWatched",
    sort: "-views",
  },
} as const;

const querySchema = z.object({
  brandId: z.string().uuid(),
  preset: z
    .enum(["overview", "videos", "demographics", "geography", "traffic", "devices"])
    .default("overview"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  videoId: z.string().trim().min(3).max(160).optional(),
});

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid analytics request.", issues: parsed.error.issues },
      { status: 400 },
    );
  const payload = parsed.data;
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  const startDate = payload.startDate ?? isoDate(start);
  const endDate = payload.endDate ?? isoDate(end);
  if (startDate > endDate)
    return NextResponse.json(
      { error: "The analytics start date must be before the end date." },
      { status: 400 },
    );

  const preset = presets[payload.preset];
  const endpoint = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  const params = new URLSearchParams({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: preset.metrics,
    dimensions: preset.dimensions,
    sort: preset.sort,
    ...("maxResults" in preset ? { maxResults: preset.maxResults } : {}),
    ...(payload.videoId ? { filters: "video==" + payload.videoId } : {}),
  });
  endpoint.search = params.toString();

  try {
    const report = await youtubeJson(payload.brandId, endpoint);
    return NextResponse.json(
      { preset: payload.preset, startDate, endDate, report },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const result = youtubeApiErrorPayload(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
