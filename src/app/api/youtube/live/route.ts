import { NextResponse } from "next/server";
import { z } from "zod";
import { youtubeApiErrorPayload, youtubeJson } from "@/lib/youtube-client";

const idSchema = z.string().trim().min(3).max(160);
const brandSchema = z.string().uuid();
const dateTimeSchema = z.string().datetime({ offset: true });

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createBroadcast"),
    brandId: brandSchema,
    title: z.string().trim().min(1).max(100),
    description: z.string().max(5000).default(""),
    scheduledStartTime: dateTimeSchema,
    privacyStatus: z.enum(["private", "unlisted", "public"]).default("private"),
    latencyPreference: z.enum(["normal", "low", "ultraLow"]).default("low"),
    enableDvr: z.boolean().default(true),
    recordFromStart: z.boolean().default(true),
    enableAutoStart: z.boolean().default(false),
    enableAutoStop: z.boolean().default(false),
  }),
  z.object({
    action: z.literal("updateBroadcast"),
    brandId: brandSchema,
    broadcastId: idSchema,
    title: z.string().trim().min(1).max(100),
    description: z.string().max(5000).default(""),
    scheduledStartTime: dateTimeSchema,
  }),
  z.object({
    action: z.literal("createStream"),
    brandId: brandSchema,
    title: z.string().trim().min(1).max(128),
    description: z.string().max(1000).default(""),
    ingestionType: z.enum(["rtmp", "hls"]).default("rtmp"),
    resolution: z
      .enum(["240p", "360p", "480p", "720p", "1080p", "1440p", "2160p", "variable"])
      .default("1080p"),
    frameRate: z.enum(["30fps", "60fps", "variable"]).default("30fps"),
  }),
  z.object({
    action: z.literal("updateStream"),
    brandId: brandSchema,
    streamId: idSchema,
    title: z.string().trim().min(1).max(128),
    description: z.string().max(1000).default(""),
  }),
  z.object({
    action: z.literal("bind"),
    brandId: brandSchema,
    broadcastId: idSchema,
    streamId: idSchema,
  }),
  z.object({
    action: z.literal("transition"),
    brandId: brandSchema,
    broadcastId: idSchema,
    broadcastStatus: z.enum(["testing", "live", "complete"]),
  }),
  z.object({
    action: z.literal("cuepoint"),
    brandId: brandSchema,
    broadcastId: idSchema,
    durationSecs: z.number().int().min(30).max(180).default(30),
  }),
]);

function errorResponse(error: unknown) {
  const result = youtubeApiErrorPayload(error);
  return NextResponse.json(result.body, { status: result.status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const brand = brandSchema.safeParse(url.searchParams.get("brandId"));
  if (!brand.success)
    return NextResponse.json({ error: "A valid brand is required." }, { status: 400 });
  const action = url.searchParams.get("action");

  try {
    if (action === "broadcasts") {
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/liveBroadcasts");
      endpoint.search = new URLSearchParams({
        part: "id,snippet,status,contentDetails",
        mine: "true",
        broadcastStatus: "all",
        maxResults: "50",
      }).toString();
      return NextResponse.json(await youtubeJson(brand.data, endpoint));
    }
    if (action === "streams") {
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/liveStreams");
      endpoint.search = new URLSearchParams({
        part: "id,snippet,status,cdn,contentDetails",
        mine: "true",
        maxResults: "50",
      }).toString();
      return NextResponse.json(await youtubeJson(brand.data, endpoint));
    }
    return NextResponse.json({ error: "Unsupported YouTube Live API action." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid YouTube Live API request.", issues: parsed.error.issues },
      { status: 400 },
    );
  const payload = parsed.data;

  try {
    if (payload.action === "createBroadcast") {
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/liveBroadcasts");
      endpoint.searchParams.set("part", "snippet,status,contentDetails");
      const response = await youtubeJson(payload.brandId, endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snippet: {
            title: payload.title,
            description: payload.description,
            scheduledStartTime: payload.scheduledStartTime,
          },
          status: { privacyStatus: payload.privacyStatus },
          contentDetails: {
            enableDvr: payload.enableDvr,
            recordFromStart: payload.recordFromStart,
            enableAutoStart: payload.enableAutoStart,
            enableAutoStop: payload.enableAutoStop,
            latencyPreference: payload.latencyPreference,
          },
        }),
      });
      return NextResponse.json(response, { status: 201 });
    }

    if (payload.action === "updateBroadcast") {
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/liveBroadcasts");
      endpoint.searchParams.set("part", "snippet");
      const response = await youtubeJson(payload.brandId, endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payload.broadcastId,
          snippet: {
            title: payload.title,
            description: payload.description,
            scheduledStartTime: payload.scheduledStartTime,
          },
        }),
      });
      return NextResponse.json(response);
    }

    if (payload.action === "createStream") {
      if ((payload.resolution === "variable") !== (payload.frameRate === "variable")) {
        return NextResponse.json(
          { error: "Variable resolution and variable frame rate must be selected together." },
          { status: 400 },
        );
      }
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/liveStreams");
      endpoint.searchParams.set("part", "snippet,cdn,contentDetails,status");
      const response = await youtubeJson(payload.brandId, endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snippet: { title: payload.title, description: payload.description },
          cdn: {
            ingestionType: payload.ingestionType,
            resolution: payload.resolution,
            frameRate: payload.frameRate,
          },
          contentDetails: { isReusable: true },
        }),
      });
      return NextResponse.json(response, { status: 201 });
    }

    if (payload.action === "updateStream") {
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/liveStreams");
      endpoint.searchParams.set("part", "snippet");
      const response = await youtubeJson(payload.brandId, endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payload.streamId,
          snippet: { title: payload.title, description: payload.description },
        }),
      });
      return NextResponse.json(response);
    }

    if (payload.action === "bind") {
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/liveBroadcasts/bind");
      endpoint.search = new URLSearchParams({
        part: "id,snippet,status,contentDetails",
        id: payload.broadcastId,
        streamId: payload.streamId,
      }).toString();
      return NextResponse.json(await youtubeJson(payload.brandId, endpoint, { method: "POST" }));
    }

    if (payload.action === "transition") {
      const endpoint = new URL("https://www.googleapis.com/youtube/v3/liveBroadcasts/transition");
      endpoint.search = new URLSearchParams({
        part: "id,snippet,status,contentDetails",
        id: payload.broadcastId,
        broadcastStatus: payload.broadcastStatus,
      }).toString();
      return NextResponse.json(await youtubeJson(payload.brandId, endpoint, { method: "POST" }));
    }

    const endpoint = new URL("https://www.googleapis.com/youtube/v3/liveBroadcasts/cuepoint");
    endpoint.searchParams.set("id", payload.broadcastId);
    return NextResponse.json(
      await youtubeJson(payload.brandId, endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cueType: "cueTypeAd",
          durationSecs: payload.durationSecs,
          insertionOffsetTimeMs: 0,
        }),
      }),
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
