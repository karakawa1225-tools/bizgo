import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "@/db/schema";

/** Turso / libSQL の接続先（公式 CLI や他ツールが出す別名も受け付ける） */
export function getTursoDatabaseUrl(): string | undefined {
  const u =
    process.env.TURSO_DATABASE_URL?.trim() ||
    process.env.LIBSQL_DATABASE_URL?.trim();
  return u || undefined;
}

export function getTursoAuthToken(): string | undefined {
  const t =
    process.env.TURSO_AUTH_TOKEN?.trim() ||
    process.env.LIBSQL_AUTH_TOKEN?.trim();
  return t || undefined;
}

export function isTursoConfigured(): boolean {
  return Boolean(getTursoDatabaseUrl() && getTursoAuthToken());
}

const REMOTE_SNAPSHOT_DDL = `
CREATE TABLE IF NOT EXISTS remote_expense_snapshot (
  slot TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
`;

let remoteSnapshotTableEnsured = false;

/** 初回 API アクセス時に Turso 側へテーブルを用意する（手動 SQL 不要） */
export async function ensureRemoteExpenseSnapshotTable(): Promise<void> {
  if (remoteSnapshotTableEnsured) return;
  const url = getTursoDatabaseUrl();
  const authToken = getTursoAuthToken();
  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN が未設定です。");
  }
  const client = createClient({ url, authToken });
  await client.execute(REMOTE_SNAPSHOT_DDL);
  remoteSnapshotTableEnsured = true;
}

export function getTursoDb() {
  const url = getTursoDatabaseUrl();
  const authToken = getTursoAuthToken();
  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN が未設定です。");
  }
  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}
