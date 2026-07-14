import "server-only";
import { NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL as string);

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/** Fixed-window counter backed by Postgres (Workers isolates don't share
 * in-memory state). `key` should already include the route + whatever
 * identity you're limiting by (IP, email, etc.) — this function doesn't
 * know or care what it means. */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();

  const rows = (await sql.query(
    "select count, reset_at from rate_limit_buckets where key = $1",
    [key]
  )) as { count: number; reset_at: string }[];
  const row = rows[0];

  if (!row || new Date(row.reset_at).getTime() < now) {
    const resetAt = new Date(now + windowMs);
    await sql.query(
      `insert into rate_limit_buckets (key, count, reset_at) values ($1, 1, $2)
       on conflict (key) do update set count = 1, reset_at = $2`,
      [key, resetAt.toISOString()]
    );
    return { allowed: true };
  }

  if (row.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - now) / 1000)),
    };
  }

  await sql.query("update rate_limit_buckets set count = count + 1 where key = $1", [key]);
  return { allowed: true };
}

/** Best-effort real client IP behind Cloudflare. */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
