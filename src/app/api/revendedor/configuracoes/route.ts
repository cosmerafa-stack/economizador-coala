import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireRevendedorAccount } from "@/lib/revendedorAuth.server";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

export async function GET(request: NextRequest) {
  const accountId = await requireRevendedorAccount(request);
  if (!accountId) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const rows = (await sql.query(
    "select default_profit_percent, search_radius_km from revendedor_settings where account_id = $1",
    [accountId]
  )) as { default_profit_percent: string; search_radius_km: number }[];

  const row = rows[0];
  return NextResponse.json({
    found: Boolean(row),
    defaultProfitPercent: row ? Number(row.default_profit_percent) : null,
    searchRadiusKm: row ? row.search_radius_km : null,
  });
}

export async function PUT(request: NextRequest) {
  const accountId = await requireRevendedorAccount(request);
  if (!accountId) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const defaultProfitPercent = Number(body?.defaultProfitPercent);
  const searchRadiusKm = Number(body?.searchRadiusKm);

  if (!Number.isFinite(defaultProfitPercent) || !Number.isFinite(searchRadiusKm)) {
    return NextResponse.json({ message: "Valores inválidos." }, { status: 400 });
  }

  await sql.query(
    `insert into revendedor_settings (account_id, default_profit_percent, search_radius_km)
     values ($1, $2, $3)
     on conflict (account_id) do update
       set default_profit_percent = $2, search_radius_km = $3, updated_at = now()`,
    [accountId, defaultProfitPercent, searchRadiusKm]
  );

  return NextResponse.json({ ok: true });
}
