import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { remoteExpenseSnapshot } from "@/db/schema";
import {
  BIZGO_CLOUD_COOKIE,
  getCloudSessionSecret,
  verifyCloudSessionToken,
} from "@/lib/server/bizgo-cloud-auth";
import {
  ensureRemoteExpenseSnapshotTable,
  getTursoDb,
  isTursoConfigured,
} from "@/lib/server/turso-db";
import { parseExpensesJson } from "@/lib/expenses-storage";

export const runtime = "nodejs";

const SLOT = "default";

async function requireCloudCookie(): Promise<
  { error: NextResponse } | undefined
> {
  if (!isTursoConfigured()) {
    return { error: NextResponse.json({ error: "turso_not_configured" }, { status: 503 }) };
  }
  const sessionSecret = getCloudSessionSecret();
  if (!sessionSecret) {
    return {
      error: NextResponse.json({ error: "session_secret_missing" }, { status: 503 }),
    };
  }
  const jar = await cookies();
  const tok = jar.get(BIZGO_CLOUD_COOKIE)?.value;
  if (!verifyCloudSessionToken(tok, sessionSecret)) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return undefined;
}

export async function GET() {
  const auth = await requireCloudCookie();
  if (auth) return auth.error;

  try {
    await ensureRemoteExpenseSnapshotTable();
    const db = getTursoDb();
    const rows = await db
      .select()
      .from(remoteExpenseSnapshot)
      .where(eq(remoteExpenseSnapshot.slot, SLOT))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return NextResponse.json({
        expenses: [],
        updatedAtMs: 0,
      });
    }
    const list = parseExpensesJson(row.payloadJson);
    if (!list) {
      return NextResponse.json({ error: "invalid_snapshot" }, { status: 500 });
    }
    return NextResponse.json({
      expenses: list,
      updatedAtMs: row.updatedAtMs,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireCloudCookie();
  if (auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const expenses = (body as { expenses?: unknown }).expenses;
  if (!Array.isArray(expenses)) {
    return NextResponse.json({ error: "expenses_must_be_array" }, { status: 400 });
  }
  const json = JSON.stringify(expenses);
  const parsed = parseExpensesJson(json);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_expenses_shape" }, { status: 400 });
  }

  const now = Date.now();
  try {
    await ensureRemoteExpenseSnapshotTable();
    const db = getTursoDb();
    await db
      .insert(remoteExpenseSnapshot)
      .values({
        slot: SLOT,
        payloadJson: json,
        updatedAtMs: now,
      })
      .onConflictDoUpdate({
        target: remoteExpenseSnapshot.slot,
        set: { payloadJson: json, updatedAtMs: now },
      });
    return NextResponse.json({ ok: true, updatedAtMs: now });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
