import "server-only";
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL as string);

function extractToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

/** Resolves the revendedor's account id from their session token — the
 * same token already used for heartbeat/logout. Returns null when the
 * token is missing/invalid, so callers can respond 401. */
export async function requireRevendedorAccount(request: NextRequest): Promise<string | null> {
  const token = extractToken(request);
  if (!token) return null;

  const rows = (await sql.query(
    "select account_id from revendedor_sessions where token = $1",
    [token]
  )) as { account_id: string }[];

  return rows[0]?.account_id ?? null;
}
