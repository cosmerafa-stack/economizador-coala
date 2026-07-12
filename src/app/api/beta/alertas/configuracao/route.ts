import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  DEFAULT_ALERT_CHECK_INTERVAL_MINUTES,
  MIN_ALERT_CHECK_INTERVAL_MINUTES,
  MAX_ALERT_CHECK_INTERVAL_MINUTES,
} from "@/lib/alertasCheck.server";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({
      intervalMinutes: DEFAULT_ALERT_CHECK_INTERVAL_MINUTES,
    });
  }

  const rows = (await sql.query(
    "select alert_check_interval_minutes from device_settings where device_id = $1",
    [deviceId]
  )) as { alert_check_interval_minutes: number }[];

  return NextResponse.json({
    intervalMinutes: rows[0]?.alert_check_interval_minutes ?? DEFAULT_ALERT_CHECK_INTERVAL_MINUTES,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
  const intervalMinutes = Number(body?.intervalMinutes);

  if (!deviceId) {
    return NextResponse.json(
      { ok: false, message: "Dispositivo não identificado." },
      { status: 400 }
    );
  }
  if (
    !Number.isFinite(intervalMinutes) ||
    intervalMinutes < MIN_ALERT_CHECK_INTERVAL_MINUTES ||
    intervalMinutes > MAX_ALERT_CHECK_INTERVAL_MINUTES
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: `Intervalo deve ser entre ${MIN_ALERT_CHECK_INTERVAL_MINUTES} e ${MAX_ALERT_CHECK_INTERVAL_MINUTES} minutos.`,
      },
      { status: 400 }
    );
  }

  await sql.query(
    `insert into device_settings (device_id, alert_check_interval_minutes)
     values ($1, $2)
     on conflict (device_id) do update set alert_check_interval_minutes = $2, updated_at = now()`,
    [deviceId, Math.round(intervalMinutes)]
  );

  return NextResponse.json({ ok: true });
}
