import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface EncryptedSecret {
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
}

export function encryptSecret(value: string): EncryptedSecret {
  const source = process.env.TOKEN_ENCRYPTION_KEY;
  if (!source) throw new Error("TOKEN_ENCRYPTION_KEY is required for live OAuth token storage");
  const key = createHash("sha256").update(source).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
}

export function decryptSecret(value: EncryptedSecret) {
  const source = process.env.TOKEN_ENCRYPTION_KEY;
  if (!source) throw new Error("TOKEN_ENCRYPTION_KEY is required for live OAuth token storage");
  if (value.algorithm !== "aes-256-gcm") throw new Error("Unsupported token encryption algorithm");
  const key = createHash("sha256").update(source).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
