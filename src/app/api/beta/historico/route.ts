import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ pontos: [] });
  }

  const rows = (await sql.query(
    `select store_id, store_name, price, recorded_at
     from price_history
     where lower(query) = $1
     order by recorded_at asc
     limit 200`,
    [normalizeQuery(query)]
  )) as {
    store_id: string;
    store_name: string;
    price: string;
    recorded_at: string;
  }[];

  const pontos = rows.map((r) => ({
    storeId: r.store_id,
    storeName: r.store_name,
    price: Number(r.price),
    recordedAt: r.recorded_at,
  }));

  return NextResponse.json({ pontos });
}
