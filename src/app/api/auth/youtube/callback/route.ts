import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/secret-crypto";
import { readRuntimeState, writeRuntimeState } from "@/lib/runtime-store";
import type { DailyMetric, Video, VideoFormat } from "@/lib/types";

interface GoogleChannel {
  id: string;
  snippet?: { title?: string; customUrl?: string };
  statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
}

interface OwnedVideoAnalytics {
  format?: VideoFormat;
  views: number;
  engagedViews: number;
  watchMinutes: number;
  averageViewDuration: number;
  averageViewPercentage: number;
  subscribers: number;
  engagementRate: number;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function durationSeconds(value = "PT0S") {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return match
    ? Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
    : 0;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchDailyAnalytics(accessToken: string, channelId: string): Promise<DailyMetric[]> {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 89);
  const reportUrl = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  reportUrl.search = new URLSearchParams({
    ids: "channel==MINE",
    startDate: isoDate(start),
    endDate: isoDate(end),
    metrics:
      "views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes,comments,shares",
    dimensions: "day",
    sort: "day",
  }).toString();
  const response = await fetch(reportUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`YouTube Analytics sync failed (${response.status})`);
  const payload = (await response.json()) as {
    columnHeaders?: { name: string }[];
    rows?: unknown[][];
  };
  const names = payload.columnHeaders?.map((header) => header.name) ?? [];
  const index = (name: string) => names.indexOf(name);
  const cell = (row: unknown[], name: string) => row[index(name)];
  return (payload.rows ?? []).map((row) => ({
    channelId,
    date: String(cell(row, "day")),
    views: numberValue(cell(row, "views")),
    watchMinutes: numberValue(cell(row, "estimatedMinutesWatched")),
    subscribersGained: numberValue(cell(row, "subscribersGained")),
    subscribersLost: numberValue(cell(row, "subscribersLost")),
    avgViewDuration: numberValue(cell(row, "averageViewDuration")),
    likes: numberValue(cell(row, "likes")),
    comments: numberValue(cell(row, "comments")),
    shares: numberValue(cell(row, "shares")),
  }));
}

async function fetchRecentVideos(
  accessToken: string,
  channel: GoogleChannel,
  localChannelId: string,
  brandId: string,
): Promise<Video[]> {
  const uploadsPlaylist = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylist) return [];
  const videoIds: string[] = [];
  let pageToken = "";
  do {
    const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    playlistUrl.search = new URLSearchParams({
      part: "contentDetails",
      playlistId: uploadsPlaylist,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    }).toString();
    const response = await fetch(playlistUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`YouTube uploads sync failed (${response.status})`);
    const payload = (await response.json()) as {
      items?: { contentDetails?: { videoId?: string } }[];
      nextPageToken?: string;
    };
    videoIds.push(
      ...(payload.items ?? [])
        .map((item) => item.contentDetails?.videoId)
        .filter((id): id is string => Boolean(id)),
    );
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken && videoIds.length < 100);

  const videos: Video[] = [];
  for (let offset = 0; offset < videoIds.length; offset += 50) {
    const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailsUrl.search = new URLSearchParams({
      part: "snippet,statistics,contentDetails",
      id: videoIds.slice(offset, offset + 50).join(","),
    }).toString();
    const response = await fetch(detailsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`YouTube video detail sync failed (${response.status})`);
    const payload = (await response.json()) as {
      items?: {
        id: string;
        snippet?: {
          title?: string;
          publishedAt?: string;
          tags?: string[];
          liveBroadcastContent?: string;
        };
        statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
        contentDetails?: { duration?: string };
      }[];
    };
    for (const item of payload.items ?? []) {
      const views = numberValue(item.statistics?.viewCount);
      const likes = numberValue(item.statistics?.likeCount);
      const comments = numberValue(item.statistics?.commentCount);
      const seconds = durationSeconds(item.contentDetails?.duration);
      const format: VideoFormat =
        item.snippet?.liveBroadcastContent === "live"
          ? "Live"
          : seconds > 0 && seconds <= 60
            ? "Shorts"
            : "Long-form";
      videos.push({
        id: item.id,
        brandId,
        channelId: localChannelId,
        title: item.snippet?.title ?? "Untitled video",
        publishedAt: item.snippet?.publishedAt?.slice(0, 10) ?? "",
        format,
        durationSeconds: seconds,
        views,
        watchMinutes: 0,
        subscribers: 0,
        engagementRate: views ? (likes + comments) / views : 0,
        trafficSource: "Unavailable until video analytics sync",
        searchShare: 0,
        first7Views: 0,
        typicalMedian: 0,
        last14Views: 0,
        previous14Views: 0,
        tags: item.snippet?.tags?.slice(0, 8) ?? [],
        thumbnailColor: "#172033",
      });
    }
  }
  return videos;
}

async function fetchTopVideoAnalytics(accessToken: string) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364);
  const reportUrl = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  reportUrl.search = new URLSearchParams({
    ids: "channel==MINE",
    startDate: isoDate(start),
    endDate: isoDate(end),
    dimensions: "video,creatorContentType",
    metrics:
      "engagedViews,views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares",
    sort: "-views",
    maxResults: "200",
  }).toString();
  const response = await fetch(reportUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`YouTube video analytics sync failed (${response.status})`);
  const payload = (await response.json()) as {
    columnHeaders?: { name: string }[];
    rows?: unknown[][];
  };
  const names = payload.columnHeaders?.map((header) => header.name) ?? [];
  const index = (name: string) => names.indexOf(name);
  const cell = (row: unknown[], name: string) => row[index(name)];
  const result = new Map<string, OwnedVideoAnalytics>();
  for (const row of payload.rows ?? []) {
    const id = String(cell(row, "video") ?? "");
    if (!id) continue;
    const views = numberValue(cell(row, "views"));
    const likes = numberValue(cell(row, "likes"));
    const comments = numberValue(cell(row, "comments"));
    const shares = numberValue(cell(row, "shares"));
    result.set(id, {
      format: String(cell(row, "creatorContentType")) === "SHORTS" ? "Shorts" : undefined,
      views,
      engagedViews: numberValue(cell(row, "engagedViews")),
      watchMinutes: numberValue(cell(row, "estimatedMinutesWatched")),
      averageViewDuration: numberValue(cell(row, "averageViewDuration")),
      averageViewPercentage: numberValue(cell(row, "averageViewPercentage")),
      subscribers: numberValue(cell(row, "subscribersGained")),
      engagementRate: views ? (likes + comments + shares) / views : 0,
    });
  }
  return result;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authorizationError = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("youtube_oauth_state")?.value;
  const brandId = cookieStore.get("youtube_oauth_brand")?.value;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (authorizationError) {
    const destination =
      state && expectedState && state === expectedState
        ? authorizationError === "access_denied"
          ? "access_denied"
          : "connection_failed"
        : "invalid_state";
    const response = NextResponse.redirect(new URL("/onboarding?youtube=" + destination, appUrl));
    response.cookies.delete("youtube_oauth_state");
    response.cookies.delete("youtube_oauth_brand");
    return response;
  }
  if (!state || !code || !expectedState || state !== expectedState || !brandId)
    return NextResponse.redirect(new URL("/onboarding?youtube=invalid_state", appUrl));

  try {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${appUrl}/api/auth/youtube/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) throw new Error(`Token exchange failed (${tokenResponse.status})`);
    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      token_type: string;
      expires_at?: number;
    };
    tokens.expires_at = Date.now() + Number(tokens.expires_in ?? 3600) * 1000;

    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=id,snippet,statistics,contentDetails&mine=true",
      { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" },
    );
    if (!channelResponse.ok) throw new Error(`Channel lookup failed (${channelResponse.status})`);
    const channelPayload = (await channelResponse.json()) as { items?: GoogleChannel[] };
    const googleChannel = channelPayload.items?.[0];
    if (!googleChannel) throw new Error("No YouTube channel is available for this Google account");

    const workspace = await readRuntimeState();
    const brand = workspace.brands.find((item) => item.id === brandId);
    if (!brand) throw new Error("The selected brand no longer exists");
    const normalizedGoogleHandle = googleChannel.snippet?.customUrl
      ? `@${googleChannel.snippet.customUrl.replace(/^@/, "")}`.toLowerCase()
      : "";
    const existing = workspace.channels.find(
      (item) =>
        item.brandId === brandId &&
        (item.youtubeChannelId === googleChannel.id ||
          (normalizedGoogleHandle && item.handle.toLowerCase() === normalizedGoogleHandle)),
    );
    const localChannelId = existing?.id ?? crypto.randomUUID();
    const connectedAt = new Date().toISOString();
    const connectedChannel = {
      id: localChannelId,
      brandId,
      name: googleChannel.snippet?.title ?? "Connected YouTube channel",
      handle: googleChannel.snippet?.customUrl
        ? `@${googleChannel.snippet.customUrl.replace(/^@/, "")}`
        : `channel:${googleChannel.id}`,
      subscribers: googleChannel.statistics?.hiddenSubscriberCount
        ? 0
        : numberValue(googleChannel.statistics?.subscriberCount),
      connected: true,
      lastSync: connectedAt,
      youtubeChannelId: googleChannel.id,
      source: "google-youtube" as const,
    };
    const channelIndex = workspace.channels.findIndex((item) => item.id === localChannelId);
    if (channelIndex >= 0) workspace.channels[channelIndex] = connectedChannel;
    else workspace.channels.push(connectedChannel);
    brand.channelId = localChannelId;

    let dailyMetrics: DailyMetric[] = [];
    let recentVideos: Video[] = [];
    const syncErrors: string[] = [];
    try {
      dailyMetrics = await fetchDailyAnalytics(tokens.access_token, localChannelId);
    } catch (error) {
      syncErrors.push(error instanceof Error ? error.message : String(error));
    }
    try {
      recentVideos = await fetchRecentVideos(
        tokens.access_token,
        googleChannel,
        localChannelId,
        brandId,
      );
    } catch (error) {
      syncErrors.push(error instanceof Error ? error.message : String(error));
    }
    try {
      const analyticsByVideo = await fetchTopVideoAnalytics(tokens.access_token);
      recentVideos = recentVideos.map((video) => {
        const analytics = analyticsByVideo.get(video.id);
        if (!analytics) return video;
        return {
          ...video,
          format: analytics.format ?? video.format,
          watchMinutes: analytics.watchMinutes,
          subscribers: analytics.subscribers,
          engagementRate: analytics.engagementRate,
          engagedViews: analytics.engagedViews,
          averageViewPercentage: analytics.averageViewPercentage,
        };
      });
    } catch (error) {
      syncErrors.push(error instanceof Error ? error.message : String(error));
    }
    workspace.dailyMetrics = [
      ...workspace.dailyMetrics.filter((item) => item.channelId !== localChannelId),
      ...dailyMetrics,
    ];
    workspace.videos = [
      ...workspace.videos.filter((item) => item.channelId !== localChannelId),
      ...recentVideos,
    ];
    workspace.youtubeConnections = workspace.youtubeConnections.filter(
      (item) => item.brandId !== brandId,
    );
    workspace.youtubeConnections.push({
      id: crypto.randomUUID(),
      brandId,
      localChannelId,
      channelId: googleChannel.id,
      channelTitle: connectedChannel.name,
      tokenMaterial: encryptSecret(JSON.stringify(tokens)),
      scopes: tokens.scope,
      connectedAt,
      tokenExpiresAt: tokens.expires_at,
      provider: "google-youtube",
      syncErrors,
    });
    await writeRuntimeState(workspace);

    const response = NextResponse.redirect(
      new URL(`/overview?brand=${brandId}&youtube=connected`, appUrl),
    );
    response.cookies.delete("youtube_oauth_state");
    response.cookies.delete("youtube_oauth_brand");
    return response;
  } catch (error) {
    console.error("YouTube OAuth callback failed", error);
    return NextResponse.redirect(new URL("/onboarding?youtube=connection_failed", appUrl));
  }
}
