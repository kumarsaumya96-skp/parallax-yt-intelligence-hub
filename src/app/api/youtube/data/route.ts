import { NextResponse } from "next/server";
import { z } from "zod";
import { youtubeApiErrorPayload, youtubeJson } from "@/lib/youtube-client";

const brandSchema = z.string().uuid();
const idSchema = z.string().trim().min(3).max(160);

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createPlaylist"),
    brandId: brandSchema,
    title: z.string().trim().min(1).max(150),
    description: z.string().max(5000).default(""),
    privacyStatus: z.enum(["private", "unlisted", "public"]).default("private"),
  }),
  z.object({
    action: z.literal("addPlaylistItem"),
    brandId: brandSchema,
    playlistId: idSchema,
    videoId: idSchema,
  }),
  z.object({
    action: z.literal("updateChannel"),
    brandId: brandSchema,
    description: z.string().max(1000).optional(),
    keywords: z.string().max(500).optional(),
    country: z.string().trim().length(2).optional(),
    defaultLanguage: z.string().trim().max(20).optional(),
  }),
]);

function errorResponse(error: unknown) {
  const result = youtubeApiErrorPayload(error);
  return NextResponse.json(result.body, { status: result.status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const brandResult = brandSchema.safeParse(url.searchParams.get("brandId"));
  if (!brandResult.success)
    return NextResponse.json({ error: "A valid brand is required." }, { status: 400 });
  const brandId = brandResult.data;
  const action = url.searchParams.get("action");

  try {
    if (action === "search") {
      const query = z.string().trim().min(2).max(200).parse(url.searchParams.get("q"));
      const type = z
        .enum(["video", "channel", "playlist"])
        .catch("video")
        .parse(url.searchParams.get("type"));
      const maxResults = z.coerce
        .number()
        .int()
        .min(1)
        .max(25)
        .catch(12)
        .parse(url.searchParams.get("maxResults"));
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/search");
      endpoint.search = new URLSearchParams({
        part: "snippet",
        q: query,
        type,
        maxResults: String(maxResults),
        safeSearch: "moderate",
      }).toString();
      return NextResponse.json(await youtubeJson(brandId, endpoint));
    }

    if (action === "playlists") {
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/playlists");
      endpoint.search = new URLSearchParams({
        part: "id,snippet,status,contentDetails",
        mine: "true",
        maxResults: "50",
      }).toString();
      return NextResponse.json(await youtubeJson(brandId, endpoint));
    }

    if (action === "comments") {
      const videoId = idSchema.parse(url.searchParams.get("videoId"));
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
      endpoint.search = new URLSearchParams({
        part: "snippet,replies",
        videoId,
        maxResults: "50",
        order: "relevance",
        textFormat: "plainText",
      }).toString();
      return NextResponse.json(await youtubeJson(brandId, endpoint));
    }

    if (action === "videos") {
      const ids = z.string().trim().min(3).max(2000).parse(url.searchParams.get("ids"));
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
      endpoint.search = new URLSearchParams({
        part: "id,snippet,statistics,contentDetails,status",
        id: ids,
      }).toString();
      return NextResponse.json(await youtubeJson(brandId, endpoint));
    }

    if (action === "channel") {
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/channels");
      endpoint.search = new URLSearchParams({
        part: "id,snippet,statistics,brandingSettings,status,contentDetails",
        mine: "true",
      }).toString();
      return NextResponse.json(await youtubeJson(brandId, endpoint));
    }

    return NextResponse.json({ error: "Unsupported YouTube Data API action." }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: "Invalid request parameters.", issues: error.issues },
        { status: 400 },
      );
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const result = actionSchema.safeParse(await request.json());
  if (!result.success)
    return NextResponse.json(
      { error: "Invalid YouTube Data API request.", issues: result.error.issues },
      { status: 400 },
    );
  const payload = result.data;

  try {
    if (payload.action === "createPlaylist") {
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/playlists");
      endpoint.searchParams.set("part", "snippet,status");
      const response = await youtubeJson(payload.brandId, endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snippet: { title: payload.title, description: payload.description },
          status: { privacyStatus: payload.privacyStatus },
        }),
      });
      return NextResponse.json(response, { status: 201 });
    }

    if (payload.action === "addPlaylistItem") {
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      endpoint.searchParams.set("part", "snippet");
      const response = await youtubeJson(payload.brandId, endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snippet: {
            playlistId: payload.playlistId,
            resourceId: { kind: "youtube#video", videoId: payload.videoId },
          },
        }),
      });
      return NextResponse.json(response, { status: 201 });
    }

    const currentEndpoint = new URL("https://www.googleapis.com/youtube/v3/channels");
    currentEndpoint.search = new URLSearchParams({
      part: "id,brandingSettings",
      mine: "true",
    }).toString();
    const current = await youtubeJson<{
      items?: { id: string; brandingSettings?: { channel?: Record<string, unknown> } }[];
    }>(payload.brandId, currentEndpoint);
    const channel = current.items?.[0];
    if (!channel)
      return NextResponse.json({ error: "No managed YouTube channel was found." }, { status: 404 });
    const allowed = channel.brandingSettings?.channel ?? {};
    const settings = {
      country: typeof allowed.country === "string" ? allowed.country : undefined,
      description: typeof allowed.description === "string" ? allowed.description : undefined,
      defaultLanguage:
        typeof allowed.defaultLanguage === "string" ? allowed.defaultLanguage : undefined,
      keywords: typeof allowed.keywords === "string" ? allowed.keywords : undefined,
      trackingAnalyticsAccountId:
        typeof allowed.trackingAnalyticsAccountId === "string"
          ? allowed.trackingAnalyticsAccountId
          : undefined,
      unsubscribedTrailer:
        typeof allowed.unsubscribedTrailer === "string" ? allowed.unsubscribedTrailer : undefined,
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.keywords !== undefined ? { keywords: payload.keywords } : {}),
      ...(payload.country !== undefined ? { country: payload.country.toUpperCase() } : {}),
      ...(payload.defaultLanguage !== undefined
        ? { defaultLanguage: payload.defaultLanguage }
        : {}),
    };
    const endpoint = new URL("https://www.googleapis.com/youtube/v3/channels");
    endpoint.searchParams.set("part", "brandingSettings");
    const response = await youtubeJson(payload.brandId, endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: channel.id, brandingSettings: { channel: settings } }),
    });
    return NextResponse.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
