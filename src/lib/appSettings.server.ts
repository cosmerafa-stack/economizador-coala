import "server-only";
import { neon } from "@neondatabase/serverless";
import { logActivity } from "./activityLog.server";

const sql = neon(process.env.DATABASE_URL as string);

const DEFAULT_TRIAL_HOURS_KEY = "default_trial_hours";
const DEFAULT_TRIAL_HOURS_FALLBACK = 72; // 3 dias

export async function getDefaultTrialHours(): Promise<number> {
  const rows = (await sql.query(
    "select value from app_settings where key = $1",
    [DEFAULT_TRIAL_HOURS_KEY]
  )) as { value: string }[];
  const value = rows[0] ? Number(rows[0].value) : NaN;
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TRIAL_HOURS_FALLBACK;
}

export async function setDefaultTrialHours(hours: number): Promise<void> {
  const value = Math.max(1, Math.floor(hours));
  await sql.query(
    `insert into app_settings (key, value) values ($1, $2)
     on conflict (key) do update set value = $2`,
    [DEFAULT_TRIAL_HOURS_KEY, String(value)]
  );
  logActivity("alterar_trial_padrao", { hours: value }).catch(() => {});
}
