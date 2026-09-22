import { NextResponse } from "next/server";
import { PARALLAX_SESSION_COOKIE } from "@/lib/parallax-session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(PARALLAX_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
