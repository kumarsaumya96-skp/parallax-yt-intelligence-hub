import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/parallax-session";

describe("Parallax sessions", () => {
  it("accepts a signed, unexpired session", async () => {
    const token = await createSessionToken("user@example.com", 60);
    await expect(verifySessionToken(token)).resolves.toBe(true);
  });

  it("rejects expired and modified sessions", async () => {
    const expired = await createSessionToken("user@example.com", -1);
    const valid = await createSessionToken("user@example.com", 60);
    await expect(verifySessionToken(expired)).resolves.toBe(false);
    await expect(verifySessionToken(valid + "changed")).resolves.toBe(false);
  });
});
