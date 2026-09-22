import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";
import { YOUTUBE_SCOPES, YOUTUBE_SERVICES } from "@/lib/youtube-client";

const originalKey = process.env.TOKEN_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
  else process.env.TOKEN_ENCRYPTION_KEY = originalKey;
});

describe("encrypted YouTube token storage", () => {
  it("round-trips token material without storing plaintext", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "test-only-key-with-enough-entropy";
    const source = JSON.stringify({
      access_token: "access-secret",
      refresh_token: "refresh-secret",
    });
    const encrypted = encryptSecret(source);

    expect(encrypted.ciphertext).not.toContain("access-secret");
    expect(decryptSecret(encrypted)).toBe(source);
  });

  it("requests management, upload, read and analytics permissions", () => {
    expect(YOUTUBE_SCOPES).toEqual(
      expect.arrayContaining([
        "https://www.googleapis.com/auth/youtube",
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/yt-analytics.readonly",
      ]),
    );
    expect(YOUTUBE_SERVICES.map((service) => service.id)).toEqual([
      "youtube.googleapis.com",
      "youtubeanalytics.googleapis.com",
    ]);
  });
});
