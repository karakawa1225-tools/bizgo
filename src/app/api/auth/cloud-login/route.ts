import { NextResponse } from "next/server";

import {
  BIZGO_CLOUD_COOKIE,
  getCloudMasterPassword,
  getCloudSessionSecret,
  mintCloudSessionToken,
  timingSafePasswordEqual,
} from "@/lib/server/bizgo-cloud-auth";
import { isTursoConfigured } from "@/lib/server/turso-db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isTursoConfigured()) {
    return NextResponse.json(
      { ok: false, error: "turso_not_configured" },
      { status: 503 },
    );
  }
  const sessionSecret = getCloudSessionSecret();
  const master = getCloudMasterPassword();
  if (!sessionSecret || !master) {
    return NextResponse.json(
      { ok: false, error: "server_auth_not_configured" },
      { status: 503 },
    );
  }

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const pw = typeof body.password === "string" ? body.password : "";
  if (!timingSafePasswordEqual(pw, master)) {
    return NextResponse.json({ ok: false, error: "bad_password" }, { status: 401 });
  }

  const token = mintCloudSessionToken(sessionSecret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BIZGO_CLOUD_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 45 * 24 * 60 * 60,
  });
  return res;
}
