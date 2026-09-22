export const PARALLAX_SESSION_COOKIE = "parallax_session";

interface SessionPayload {
  sub: string;
  exp: number;
}

const encoder = new TextEncoder();

function getSessionSecret() {
  if (process.env.PARALLAX_SESSION_SECRET) return process.env.PARALLAX_SESSION_SECRET;
  if (process.env.NODE_ENV !== "production") return "parallax-local-preview-session-key";
  return "";
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getSigningKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(identity: string, maxAgeSeconds: number) {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Parallax login is not configured.");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(identity.toLowerCase()));
  const payload: SessionPayload = {
    sub: encodeBase64Url(new Uint8Array(digest)),
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encodedPayload = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getSigningKey(secret),
    encoder.encode(encodedPayload),
  );
  return `${encodedPayload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token?: string) {
  const secret = getSessionSecret();
  if (!token || !secret) return false;
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return false;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(secret),
      decodeBase64Url(encodedSignature),
      encoder.encode(encodedPayload),
    );
    if (!valid) return false;
    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(encodedPayload)),
    ) as SessionPayload;
    return Boolean(payload.sub) && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
