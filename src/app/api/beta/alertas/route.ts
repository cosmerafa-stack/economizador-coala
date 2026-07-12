import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { checkAlerts } from "@/lib/alertasCheck.server";
import { toPublicAlert, PriceAlertRow } from "@/lib/priceAlertPublic.server";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const deviceId = params.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ alertas: [] });
  }

  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const radiusKm = Number(params.get("radius"));

  await checkAlerts({
    deviceId,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    radiusKm: Number.isFinite(radiusKm) ? radiusKm : undefined,
  }).catch(() => {});

  const rows = (await sql.query(
    "select * from price_alerts where device_id = $1 order by created_at desc",
    [deviceId]
  )) as PriceAlertRow[];

  return NextResponse.json({ alertas: rows.map(toPublicAlert) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { deviceId, query, targetPrice } = body ?? {};

  if (!deviceId || !query || !Number.isFinite(Number(targetPrice))) {
    return NextResponse.json(
      { ok: false, message: "Preencha o produto e o preço-alvo." },
      { status: 400 }
    );
  }

  await sql.query(
    "insert into price_alerts (device_id, query, target_price) values ($1, $2, $3)",
    [deviceId, String(query).trim(), Number(targetPrice)]
  );

  return NextResponse.json({ ok: true });
}
