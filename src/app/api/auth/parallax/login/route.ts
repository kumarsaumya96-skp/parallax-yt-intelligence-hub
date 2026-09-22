import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, PARALLAX_SESSION_COOKIE } from "@/lib/parallax-session";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
  remember: z.boolean().default(false),
});

function secureEqual(value: string, expected: string) {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const result = loginSchema.safeParse(await request.json());
  if (!result.success) {
    return NextResponse.json(
      { error: "Enter a valid work email and a password with at least 8 characters." },
      { status: 400 },
    );
  }

  const configuredEmail = process.env.PARALLAX_LOGIN_EMAIL;
  const configuredPassword = process.env.PARALLAX_LOGIN_PASSWORD;
  const productionReady = Boolean(
    configuredEmail && configuredPassword && process.env.PARALLAX_SESSION_SECRET,
  );
  if (process.env.NODE_ENV === "production" && !productionReady) {
    return NextResponse.json(
      { error: "Parallax login has not been configured by an administrator." },
      { status: 503 },
    );
  }

  if (
    configuredEmail &&
    configuredPassword &&
    (!secureEqual(result.data.email.toLowerCase(), configuredEmail.toLowerCase()) ||
      !secureEqual(result.data.password, configuredPassword))
  ) {
    return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
  }

  const maxAge = result.data.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  const token = await createSessionToken(result.data.email, maxAge);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PARALLAX_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return response;
}
