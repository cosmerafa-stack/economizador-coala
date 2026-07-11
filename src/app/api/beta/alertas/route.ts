import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { searchPrices } from "@/lib/precoDaHora";
import { DEFAULT_LOCATION } from "@/lib/mockData";
import { PriceAlert } from "@/lib/types";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

interface AlertRow {
  id: string;
  query: string;
  target_price: string;
  active: boolean;
  triggered_at: string | null;
  triggered_store_name: string | null;
  triggered_price: string | null;
  created_at: string;
}

function toPublic(row: AlertRow): PriceAlert {
  return {
    id: row.id,
    query: row.query,
    targetPrice: Number(row.target_price),
    active: row.active,
    triggeredAt: row.triggered_at,
    triggeredStoreName: row.triggered_store_name,
    triggeredPrice: row.triggered_price ? Number(row.triggered_price) : null,
    createdAt: row.created_at,
  };
}

// Checks every still-active alert against the current price (live or
// cached). No background cron here — checking happens whenever the user
// opens the Alerts screen, which is enough for a beta feature.
async function checkAlerts(deviceId: string): Promise<void> {
  const active = (await sql.query(
    "select id, query, target_price from price_alerts where device_id = $1 and active = true",
    [deviceId]
  )) as { id: string; query: string; target_price: string }[];

  for (const alert of active) {
    try {
      const { results } = await searchPrices({
        query: alert.query,
        lat: DEFAULT_LOCATION.lat,
        lng: DEFAULT_LOCATION.lng,
        radiusKm: 50,
        sort: "preco_asc",
      });
      const cheapest = results[0];
      if (cheapest && cheapest.price <= Number(alert.target_price)) {
        await sql.query(
          `update price_alerts
           set active = false, triggered_at = now(), triggered_store_name = $1, triggered_price = $2
           where id = $3`,
          [cheapest.store.name, cheapest.price, alert.id]
        );
      }
    } catch {
      // best-effort — one failing alert shouldn't block the others
    }
  }
}

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ alertas: [] });
  }

  await checkAlerts(deviceId).catch(() => {});

  const rows = (await sql.query(
    "select * from price_alerts where device_id = $1 order by created_at desc",
    [deviceId]
  )) as AlertRow[];

  return NextResponse.json({ alertas: rows.map(toPublic) });
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
