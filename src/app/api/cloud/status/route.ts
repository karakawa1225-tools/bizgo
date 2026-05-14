import { NextResponse } from "next/server";

import {
  getCloudMasterPassword,
  getCloudSessionSecret,
} from "@/lib/server/bizgo-cloud-auth";
import { isTursoConfigured } from "@/lib/server/turso-db";

export const runtime = "nodejs";

export async function GET() {
  const turso = isTursoConfigured();
  const sessionSecret = Boolean(getCloudSessionSecret());
  const masterPassword = Boolean(getCloudMasterPassword());
  return NextResponse.json({
    turso,
    sessionSecret,
    masterPassword,
    authReady: Boolean(turso && sessionSecret && masterPassword),
  });
}
