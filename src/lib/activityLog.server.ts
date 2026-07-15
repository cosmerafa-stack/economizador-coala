import "server-only";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL as string);

export interface ActivityLogEntry {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  details: Record<string, unknown> | null;
}

// Never throws — logging an action must not block the action itself.
export async function logActivity(
  action: string,
  details?: Record<string, unknown>,
  actor = "gestor"
): Promise<void> {
  try {
    await sql.query(
      `insert into activity_log (actor, action, details) values ($1, $2, $3)`,
      [actor, action, details ? JSON.stringify(details) : null]
    );
  } catch {
    // best-effort only
  }
}

export async function listActivityLog(limit = 100): Promise<ActivityLogEntry[]> {
  const rows = (await sql.query(
    "select id, created_at, actor, action, details from activity_log order by created_at desc limit $1",
    [limit]
  )) as {
    id: string;
    created_at: string;
    actor: string;
    action: string;
    details: Record<string, unknown> | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    actor: r.actor,
    action: r.action,
    details: r.details,
  }));
}
