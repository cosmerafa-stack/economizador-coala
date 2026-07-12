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

  const allPontos = rows.map((r) => ({
    storeId: r.store_id,
    storeName: r.store_name,
    price: Number(r.price),
    recordedAt: r.recorded_at,
  }));

  // Substring-matched live searches occasionally pull in an unrelated
  // product (e.g. a paint SKU that happens to contain "feijao"), which
  // then wrecks the min/avg/max stats. Drop points far from the median
  // before returning them.
  const median = medianOf(allPontos.map((p) => p.price));
  const pontos =
    median > 0
      ? allPontos.filter((p) => p.price >= median / 4 && p.price <= median * 4)
      : allPontos;

  return NextResponse.json({
    pontos,
    totalAmostras: allPontos.length,
    descartados: allPontos.length - pontos.length,
  });
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
