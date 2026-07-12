import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { checkAlerts } from "@/lib/alertasCheck.server";
import { requireRevendedorAccount } from "@/lib/revendedorAuth.server";
import { toPublicAlert, PriceAlertRow } from "@/lib/priceAlertPublic.server";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const deviceId = params.get("deviceId");
  const accountId = await requireRevendedorAccount(request);

  if (!deviceId && !accountId) {
    return NextResponse.json({ alertas: [] });
  }

  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const radiusKm = Number(params.get("radius"));

  await checkAlerts({
    deviceId: accountId ? undefined : deviceId ?? undefined,
    accountId: accountId ?? undefined,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    radiusKm: Number.isFinite(radiusKm) ? radiusKm : undefined,
  }).catch(() => {});

  // Prefer the account's alerts (survive a device switch); fall back to
  // this device's own alerts when there's no logged-in account — plus any
  // legacy device-only rows created before this account got linked, so
  // nothing "disappears" right after this change ships.
  const rows = (
    accountId
      ? await sql.query(
          "select * from price_alerts where account_id = $1 or device_id = $2 order by created_at desc",
          [accountId, deviceId ?? ""]
        )
      : await sql.query(
          "select * from price_alerts where device_id = $1 order by created_at desc",
          [deviceId]
        )
  ) as PriceAlertRow[];

  return NextResponse.json({ alertas: rows.map(toPublicAlert) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { deviceId, query, targetPrice } = body ?? {};
  const accountId = await requireRevendedorAccount(request);

  if (!deviceId || !query || !Number.isFinite(Number(targetPrice))) {
    return NextResponse.json(
      { ok: false, message: "Preencha o produto e o preço-alvo." },
      { status: 400 }
    );
  }

  await sql.query(
    "insert into price_alerts (device_id, account_id, query, target_price) values ($1, $2, $3, $4)",
    [deviceId, accountId, String(query).trim(), Number(targetPrice)]
  );

  return NextResponse.json({ ok: true });
}
