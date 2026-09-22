import { NextResponse, type NextRequest } from "next/server";
import { PARALLAX_SESSION_COOKIE, verifySessionToken } from "@/lib/parallax-session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(PARALLAX_SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  const welcome = new URL("/", request.url);
  welcome.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(welcome);
}

export const config = {
  matcher: [
    "/overview/:path*",
    "/channels/:path*",
    "/videos/:path*",
    "/ai-visibility/:path*",
    "/shorts-posts/:path*",
    "/competitors/:path*",
    "/opportunities/:path*",
    "/youtube-operations/:path*",
    "/reports/:path*",
    "/alerts/:path*",
    "/data-integrations/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
