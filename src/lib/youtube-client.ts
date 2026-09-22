import { decryptSecret, encryptSecret, type EncryptedSecret } from "@/lib/secret-crypto";
import { readRuntimeState, writeRuntimeState } from "@/lib/runtime-store";

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
] as const;

export const YOUTUBE_SERVICES = [
  {
    id: "youtube.googleapis.com",
    name: "YouTube Data API v3",
    capability: "Data, uploads, playlists, channel settings and Live Streaming",
  },
  {
    id: "youtubeanalytics.googleapis.com",
    name: "YouTube Analytics API",
    capability: "Performance, watch time, audience and traffic reports",
  },
] as const;

interface GoogleTokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  scope?: string;
  token_type?: string;
}

interface StoredYouTubeConnection extends Record<string, unknown> {
  id: string;
  brandId: string;
  localChannelId: string;
  channelId: string;
  channelTitle: string;
  tokenMaterial: EncryptedSecret;
  scopes: string;
  connectedAt: string;
}

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly reason?: string,
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

function isEncryptedSecret(value: unknown): value is EncryptedSecret {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.algorithm === "aes-256-gcm" &&
    typeof candidate.iv === "string" &&
    typeof candidate.tag === "string" &&
    typeof candidate.ciphertext === "string"
  );
}

function parseConnection(
  value: Record<string, unknown> | undefined,
): StoredYouTubeConnection | null {
  if (
    !value ||
    typeof value.id !== "string" ||
    typeof value.brandId !== "string" ||
    typeof value.localChannelId !== "string" ||
    typeof value.channelId !== "string" ||
    typeof value.channelTitle !== "string" ||
    !isEncryptedSecret(value.tokenMaterial)
  )
    return null;
  return value as StoredYouTubeConnection;
}

async function googleError(response: Response) {
  let message = `YouTube API request failed (${response.status})`;
  let reason: string | undefined;
  try {
    const payload = (await response.json()) as {
      error?: { message?: string; errors?: { reason?: string }[] };
    };
    message = payload.error?.message ?? message;
    reason = payload.error?.errors?.[0]?.reason;
  } catch {
    // Keep the status-based fallback when Google does not return JSON.
  }
  return new YouTubeApiError(message, response.status, reason);
}

export async function getYouTubeConnection(brandId: string) {
  const state = await readRuntimeState();
  const index = state.youtubeConnections.findIndex((item) => item.brandId === brandId);
  const connection = parseConnection(index >= 0 ? state.youtubeConnections[index] : undefined);
  if (!connection)
    throw new YouTubeApiError(
      "Connect this brand to YouTube before using its APIs.",
      409,
      "notConnected",
    );
  return { state, index, connection };
}

const tokenRefreshes = new Map<string, Promise<string>>();

async function resolveYouTubeAccessToken(brandId: string) {
  const { state, index, connection } = await getYouTubeConnection(brandId);
  let tokens: GoogleTokenSet;
  try {
    tokens = JSON.parse(decryptSecret(connection.tokenMaterial)) as GoogleTokenSet;
  } catch {
    throw new YouTubeApiError(
      "The saved YouTube connection could not be decrypted. Reconnect the channel.",
      401,
      "invalidTokenStorage",
    );
  }

  if (tokens.access_token && tokens.expires_at && tokens.expires_at > Date.now() + 60_000)
    return tokens.access_token;
  if (!tokens.refresh_token) {
    if (tokens.access_token && !tokens.expires_at) return tokens.access_token;
    throw new YouTubeApiError(
      "The YouTube session has expired. Reconnect the channel to grant offline access.",
      401,
      "missingRefreshToken",
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new YouTubeApiError(
      "Google OAuth credentials are not configured.",
      503,
      "missingCredentials",
    );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw await googleError(response);
  const refreshed = (await response.json()) as GoogleTokenSet;
  tokens = {
    ...tokens,
    ...refreshed,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + Number(refreshed.expires_in ?? 3600) * 1000,
  };
  const updated = {
    ...connection,
    tokenMaterial: encryptSecret(JSON.stringify(tokens)),
    scopes: tokens.scope ?? connection.scopes,
    tokenExpiresAt: tokens.expires_at,
    lastTokenRefresh: new Date().toISOString(),
  };
  state.youtubeConnections[index] = updated;
  await writeRuntimeState(state);
  return tokens.access_token;
}

export async function getYouTubeAccessToken(brandId: string) {
  const activeRefresh = tokenRefreshes.get(brandId);
  if (activeRefresh) return activeRefresh;
  const refresh = resolveYouTubeAccessToken(brandId);
  tokenRefreshes.set(brandId, refresh);
  try {
    return await refresh;
  } finally {
    if (tokenRefreshes.get(brandId) === refresh) tokenRefreshes.delete(brandId);
  }
}

export async function youtubeRequest(
  brandId: string,
  endpoint: string | URL,
  init: RequestInit = {},
) {
  const accessToken = await getYouTubeAccessToken(brandId);
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  if (!response.ok) throw await googleError(response);
  return response;
}

export async function youtubeJson<T>(
  brandId: string,
  endpoint: string | URL,
  init: RequestInit = {},
) {
  return (await (await youtubeRequest(brandId, endpoint, init)).json()) as T;
}

export function youtubeApiErrorPayload(error: unknown) {
  if (error instanceof YouTubeApiError)
    return { status: error.status, body: { error: error.message, reason: error.reason } };
  return {
    status: 500,
    body: { error: error instanceof Error ? error.message : "YouTube API request failed" },
  };
}

export function connectionSummary(connection: Record<string, unknown>) {
  const scopes = String(connection.scopes ?? "")
    .split(/\s+/)
    .filter(Boolean);
  return {
    id: String(connection.id ?? ""),
    brandId: String(connection.brandId ?? ""),
    localChannelId: String(connection.localChannelId ?? ""),
    channelId: String(connection.channelId ?? ""),
    channelTitle: String(connection.channelTitle ?? ""),
    connectedAt: String(connection.connectedAt ?? ""),
    lastTokenRefresh: String(connection.lastTokenRefresh ?? ""),
    scopes,
    syncErrors: Array.isArray(connection.syncErrors) ? connection.syncErrors.map(String) : [],
  };
}
