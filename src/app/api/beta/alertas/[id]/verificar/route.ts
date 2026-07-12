import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { checkAlerts } from "@/lib/alertasCheck.server";
import { requireRevendedorAccount } from "@/lib/revendedorAuth.server";
import { toPublicAlert, PriceAlertRow } from "@/lib/priceAlertPublic.server";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

// On-demand check for a single alert, using the caller's real location and
// search radius (not the cross-device sweep's stand-in defaults) — the
// "Verificar agora" button in the Alerts screen.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const radiusKm = Number(body?.radiusKm);
  const accountId = await requireRevendedorAccount(request);

  const owned = (await sql.query(
    "select id from price_alerts where id = $1 and (device_id = $2 or ($3::uuid is not null and account_id = $3))",
    [id, deviceId, accountId]
  )) as { id: string }[];

  if (owned.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Alerta não encontrado." },
      { status: 404 }
    );
  }

  await checkAlerts({
    alertId: id,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    radiusKm: Number.isFinite(radiusKm) ? radiusKm : undefined,
  });

  const rows = (await sql.query(
    "select * from price_alerts where id = $1",
    [id]
  )) as PriceAlertRow[];

  return NextResponse.json({ ok: true, alerta: toPublicAlert(rows[0]) });
}
