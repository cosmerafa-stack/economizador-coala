import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

// Scans the shared price_history for products where the cheapest recent
// offer is notably below the typical (average) price seen for the same
// term — a proxy for "buy here, resell there" opportunities.
export async function GET() {
  const rows = (await sql.query(`
    with recent as (
      select query, store_name, price, recorded_at
      from price_history
      where recorded_at > now() - interval '14 days'
    ),
    medians as (
      select query, percentile_cont(0.5) within group (order by price) as median_price
      from recent
      group by query
    ),
    -- Substring-matched live searches occasionally pull in an unrelated
    -- product (e.g. a paint SKU matching "feijao"), which then wrecks the
    -- typical/cheapest spread. Drop points far from the per-query median.
    filtered as (
      select r.query, r.store_name, r.price, r.recorded_at
      from recent r
      join medians m on m.query = r.query
      where m.median_price > 0
        and r.price between m.median_price / 4 and m.median_price * 4
    ),
    stats as (
      select
        query,
        min(price) as cheapest_price,
        avg(price) as typical_price,
        count(distinct store_name) as store_count,
        count(*) as sample_count,
        max(recorded_at) as recorded_at
      from filtered
      group by query
      having count(distinct store_name) >= 2 and avg(price) > 0
    )
    select
      s.query,
      s.cheapest_price,
      s.typical_price,
      s.sample_count,
      s.recorded_at,
      (select f.store_name from filtered f where f.query = s.query and f.price = s.cheapest_price limit 1) as cheapest_store_name
    from stats s
    where (s.typical_price - s.cheapest_price) / s.typical_price >= 0.15
    order by (s.typical_price - s.cheapest_price) / s.typical_price desc
    limit 20
  `)) as {
    query: string;
    cheapest_price: string;
    typical_price: string;
    sample_count: string;
    recorded_at: string;
    cheapest_store_name: string;
  }[];

  const oportunidades = rows.map((r) => {
    const cheapest = Number(r.cheapest_price);
    const typical = Number(r.typical_price);
    return {
      query: r.query,
      cheapestPrice: cheapest,
      cheapestStoreName: r.cheapest_store_name,
      typicalPrice: typical,
      spreadPercent: Math.round(((typical - cheapest) / typical) * 100),
      sampleCount: Number(r.sample_count),
      recordedAt: r.recorded_at,
    };
  });

  return NextResponse.json({ oportunidades });
}
