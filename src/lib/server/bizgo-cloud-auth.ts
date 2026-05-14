import { createHmac, timingSafeEqual } from "node:crypto";

export const BIZGO_CLOUD_COOKIE = "bizgo_cloud";

const MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function mintCloudSessionToken(sessionSecret: string): string {
  const exp = Date.now() + MAX_AGE_MS;
  const body = JSON.stringify({ v: 1, exp });
  const sig = sign(body, sessionSecret);
  return `${Buffer.from(body, "utf8").toString("base64url")}.${sig}`;
}

export function verifyCloudSessionToken(
  token: string | undefined,
  sessionSecret: string,
): boolean {
  if (!token || !sessionSecret) return false;
  const i = token.lastIndexOf(".");
  if (i <= 0) return false;
  const b64 = token.slice(0, i);
  const sig = token.slice(i + 1);
  let body: string;
  try {
    body = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return false;
  }
  const expected = sign(body, sessionSecret);
  try {
    if (sig.length !== expected.length) return false;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch {
    return false;
  }
  try {
    const parsed = JSON.parse(body) as { exp?: number };
    return typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function timingSafePasswordEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

export function getCloudSessionSecret(): string | null {
  const s = process.env.BIZGO_CLOUD_SESSION_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

export function getCloudMasterPassword(): string | null {
  const s = process.env.BIZGO_CLOUD_PASSWORD?.trim();
  return s && s.length >= 8 ? s : null;
}
