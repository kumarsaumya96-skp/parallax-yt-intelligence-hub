import { NextResponse } from "next/server";
import { readRuntimeState } from "@/lib/runtime-store";
import { YOUTUBE_SCOPES } from "@/lib/youtube-client";

export async function GET(request: Request) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const brandId = new URL(request.url).searchParams.get("brandId");
  const workspace = await readRuntimeState();
  if (!brandId || !workspace.brands.some((brand) => brand.id === brandId)) {
    return NextResponse.redirect(new URL("/onboarding?youtube=select_brand", appUrl));
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${appUrl}/api/auth/youtube/callback`;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET || !process.env.TOKEN_ENCRYPTION_KEY) {
    return NextResponse.redirect(new URL("/onboarding?youtube=missing_credentials", appUrl));
  }
  const state = crypto.randomUUID();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
    scope: YOUTUBE_SCOPES.join(" "),
  }).toString();
  const response = NextResponse.redirect(url);
  response.cookies.set("youtube_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("youtube_oauth_brand", brandId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
