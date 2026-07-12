import { NextRequest, NextResponse } from "next/server";
import { searchPrices } from "@/lib/precoDaHora";
import { simplifySearchTerm } from "@/lib/searchTerm";
import { SortOption } from "@/lib/types";

export const dynamic = "force-dynamic";

interface OtimizarBody {
  queries: string[];
  lat: number;
  lng: number;
  radiusKm: number;
}

export async function POST(request: NextRequest) {
  const body: OtimizarBody = await request.json();
  const queries = Array.isArray(body.queries)
    ? [...new Set(body.queries.map((q) => q.trim()).filter(Boolean))]
    : [];

  if (queries.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Nenhum item no carrinho para otimizar." },
      { status: 400 }
    );
  }

  const sort: SortOption = "preco_asc";
  // Sequential on purpose — the upstream price source is a single shared
  // resource across every user of the app, and firing one request per cart
  // item in parallel (as this used to) turns a single click into a burst
  // of concurrent hits, which is exactly what trips its rate limit even
  // with just one person using the app.
  const perQuery: { query: string; results: Awaited<ReturnType<typeof searchPrices>>["results"] }[] = [];
  for (const query of queries) {
    try {
      const first = await searchPrices({
        query,
        lat: body.lat,
        lng: body.lng,
        radiusKm: body.radiusKm,
        sort,
      });
      if (first.results.length > 0) {
        perQuery.push({ query, results: first.results });
        continue;
      }

      const simplified = simplifySearchTerm(query);
      if (simplified.toLowerCase() === query.toLowerCase()) {
        perQuery.push({ query, results: first.results });
        continue;
      }
      const retry = await searchPrices({
        query: simplified,
        lat: body.lat,
        lng: body.lng,
        radiusKm: body.radiusKm,
        sort,
      });
      perQuery.push({ query, results: retry.results });
    } catch {
      perQuery.push({ query, results: [] });
    }
  }

  // How much each store would cost, and how many of the queries it covers.
  const storeTotals = new Map<string, { total: number; count: number }>();
  for (const { results } of perQuery) {
    const seenStores = new Set<string>();
    for (const item of results) {
      if (seenStores.has(item.store.name)) continue;
      seenStores.add(item.store.name);
      const current = storeTotals.get(item.store.name) ?? { total: 0, count: 0 };
      storeTotals.set(item.store.name, {
        total: current.total + item.price,
        count: current.count + 1,
      });
    }
  }

  let bestStoreName: string | null = null;
  let bestStoreTotal = 0;
  let bestStoreCoveredCount = 0;
  for (const [name, { total, count }] of storeTotals) {
    if (
      count > bestStoreCoveredCount ||
      (count === bestStoreCoveredCount && total < bestStoreTotal)
    ) {
      bestStoreName = name;
      bestStoreTotal = total;
      bestStoreCoveredCount = count;
    }
  }

  let multiStoreTotal = 0;
  const storesInvolved = new Set<string>();
  const itens = perQuery.map(({ query, results }) => {
    const cheapest = results[0];
    if (cheapest) {
      multiStoreTotal += cheapest.price;
      storesInvolved.add(cheapest.store.name);
    }
    const atBestStore = results.find((r) => r.store.name === bestStoreName);
    return {
      query,
      bestOverallPrice: cheapest ? cheapest.price : null,
      bestOverallStore: cheapest ? cheapest.store.name : null,
      priceAtBestStore: atBestStore ? atBestStore.price : null,
      availableAtBestStore: Boolean(atBestStore),
    };
  });

  return NextResponse.json({
    resultado: {
      bestStoreName,
      bestStoreTotal,
      bestStoreCoveredCount,
      multiStoreTotal,
      storesInvolved: storesInvolved.size,
      savings: Math.max(0, bestStoreTotal - multiStoreTotal),
      itens,
    },
  });
}
