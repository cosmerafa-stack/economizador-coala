import "server-only";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL as string);

export interface ErrorLogEntry {
  id: string;
  createdAt: string;
  route: string;
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
}

// Never throws — logging a failure must not itself become a new failure.
export async function logError(
  route: string,
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? (error.stack ?? null) : null;
    await sql.query(
      `insert into error_log (route, message, stack, context) values ($1, $2, $3, $4)`,
      [route, message, stack, context ? JSON.stringify(context) : null]
    );
  } catch {
    // best-effort only
  }
}

export async function listErrorLog(limit = 100): Promise<ErrorLogEntry[]> {
  const rows = (await sql.query(
    "select id, created_at, route, message, stack, context from error_log order by created_at desc limit $1",
    [limit]
  )) as {
    id: string;
    created_at: string;
    route: string;
    message: string;
    stack: string | null;
    context: Record<string, unknown> | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    route: r.route,
    message: r.message,
    stack: r.stack,
    context: r.context,
  }));
}

export async function clearErrorLog(): Promise<void> {
  await sql.query("delete from error_log");
}
