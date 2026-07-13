import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { checkAlerts } from "@/lib/alertasCheck.server";
import { requireRevendedorAccount } from "@/lib/revendedorAuth.server";
import { toPublicAlert, PriceAlertRow } from "@/lib/priceAlertPublic.server";
import { searchPrices } from "@/lib/precoDaHora";
import { DEFAULT_LOCATION } from "@/lib/mockData";

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

function isBarcodeLike(value: string): boolean {
  return /^\d{8,14}$/.test(value);
}

// When the alert was created by scanning/typing a barcode, look the
// product up once so the list can show a real name next to the code
// instead of just digits. Best-effort — a lookup failure shouldn't block
// creating the alert.
//
// The upstream price source's own search only matches free text against
// product descriptions — searching by the bare barcode itself typically
// returns nothing, even though the same product shows up fine under its
// name. So we resolve the name from our own accumulated price_history
// (which stores the barcode per row) instead of a live search, and only
// fall back to a live lookup as a last resort.
async function resolveProductName(
  barcode: string,
  lat: number,
  lng: number,
  radiusKm: number
): Promise<string | null> {
  const historyRows = (await sql
    .query(
      "select product_name from price_history where barcode = $1 order by recorded_at desc limit 1",
      [barcode]
    )
    .catch(() => [])) as { product_name: string }[];
  if (historyRows[0]?.product_name) return historyRows[0].product_name;

  try {
    const { results } = await searchPrices({
      query: barcode,
      lat,
      lng,
      radiusKm,
      sort: "preco_asc",
    });
    return results[0]?.productName ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { deviceId, query, targetPrice, lat, lng, radiusKm } = body ?? {};
  const accountId = await requireRevendedorAccount(request);

  if (!deviceId || !query || !Number.isFinite(Number(targetPrice))) {
    return NextResponse.json(
      { ok: false, message: "Preencha o produto e o preço-alvo." },
      { status: 400 }
    );
  }

  const trimmedQuery = String(query).trim();
  const productName = isBarcodeLike(trimmedQuery)
    ? await resolveProductName(
        trimmedQuery,
        Number.isFinite(Number(lat)) ? Number(lat) : DEFAULT_LOCATION.lat,
        Number.isFinite(Number(lng)) ? Number(lng) : DEFAULT_LOCATION.lng,
        Number.isFinite(Number(radiusKm)) ? Number(radiusKm) : 50
      )
    : null;

  await sql.query(
    "insert into price_alerts (device_id, account_id, query, product_name, target_price) values ($1, $2, $3, $4, $5)",
    [deviceId, accountId, trimmedQuery, productName, Number(targetPrice)]
  );

  return NextResponse.json({ ok: true });
}
