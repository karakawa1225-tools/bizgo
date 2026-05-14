import { NextResponse } from "next/server";

import { BIZGO_CLOUD_COOKIE } from "@/lib/server/bizgo-cloud-auth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BIZGO_CLOUD_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
