/**
 * Prints character counts for selected keys in .env (values never printed).
 * Usage: node scripts/check-env-lengths.mjs
 */
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  console.log("No .env file at project root.");
  process.exit(1);
}

const want = new Set([
  "BIZGO_CLOUD_PASSWORD",
  "BIZGO_CLOUD_SESSION_SECRET",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "LIBSQL_DATABASE_URL",
  "LIBSQL_AUTH_TOKEN",
]);

const found = new Map();
const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
for (const line of lines) {
  const t = line.replace(/^\uFEFF/, "").trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i <= 0) continue;
  const key = t.slice(0, i).trim();
  if (!want.has(key)) continue;
  let val = t.slice(i + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  found.set(key, val.length);
}

for (const k of want) {
  if (!found.has(k)) continue;
  console.log(`${k}: ${found.get(k)} chars`);
}

const pw = found.get("BIZGO_CLOUD_PASSWORD");
const sec = found.get("BIZGO_CLOUD_SESSION_SECRET");
if (pw === undefined)
  console.log("\nMissing: BIZGO_CLOUD_PASSWORD (need key exactly, value >= 8 chars)");
else if (pw < 8)
  console.log("\nBIZGO_CLOUD_PASSWORD is shorter than 8 characters after trim.");

if (sec === undefined)
  console.log("Missing: BIZGO_CLOUD_SESSION_SECRET (need key exactly, value >= 16 chars)");
else if (sec < 16)
  console.log("BIZGO_CLOUD_SESSION_SECRET is shorter than 16 characters after trim.");
