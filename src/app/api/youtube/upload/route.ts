import { NextResponse } from "next/server";
import { z } from "zod";
import { youtubeApiErrorPayload, youtubeRequest } from "@/lib/youtube-client";

export const runtime = "nodejs";
export const maxDuration = 900;

const metadataSchema = z.object({
  brandId: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
  description: z.string().max(5000).default(""),
  privacyStatus: z.enum(["private", "unlisted", "public"]).default("private"),
  categoryId: z.string().regex(/^\d+$/).default("22"),
  tags: z.string().max(500).default(""),
  madeForKids: z.enum(["true", "false"]).default("false"),
  notifySubscribers: z.enum(["true", "false"]).default("true"),
});

export async function POST(request: Request) {
  const url = new URL(request.url);
  const parsed = metadataSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid video upload metadata.", issues: parsed.error.issues },
      { status: 400 },
    );
  if (!request.body)
    return NextResponse.json({ error: "Choose a video file to upload." }, { status: 400 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength <= 0)
    return NextResponse.json(
      { error: "The upload must include a non-empty Content-Length header." },
      { status: 411 },
    );
  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const payload = parsed.data;
  const tags = payload.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 30);

  try {
    const sessionEndpoint = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
    sessionEndpoint.search = new URLSearchParams({
      uploadType: "resumable",
      part: "snippet,status",
      notifySubscribers: payload.notifySubscribers,
    }).toString();
    const session = await youtubeRequest(payload.brandId, sessionEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(contentLength),
        "X-Upload-Content-Type": contentType,
      },
      body: JSON.stringify({
        snippet: {
          title: payload.title,
          description: payload.description,
          categoryId: payload.categoryId,
          ...(tags.length ? { tags } : {}),
        },
        status: {
          privacyStatus: payload.privacyStatus,
          selfDeclaredMadeForKids: payload.madeForKids === "true",
        },
      }),
    });
    const uploadUrl = session.headers.get("location");
    if (!uploadUrl)
      return NextResponse.json(
        { error: "YouTube did not return a resumable upload URL." },
        { status: 502 },
      );

    const upload = await youtubeRequest(payload.brandId, uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType, "Content-Length": String(contentLength) },
      body: request.body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    return NextResponse.json(await upload.json(), { status: 201 });
  } catch (error) {
    const result = youtubeApiErrorPayload(error);
    return NextResponse.json(result.body, { status: result.status });
  }
}
