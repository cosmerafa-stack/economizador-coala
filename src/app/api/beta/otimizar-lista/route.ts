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
  const perQuery = await Promise.all(
    queries.map(async (query) => {
      try {
        const first = await searchPrices({
          query,
          lat: body.lat,
          lng: body.lng,
          radiusKm: body.radiusKm,
          sort,
        });
        if (first.results.length > 0) return { query, results: first.results };

        const simplified = simplifySearchTerm(query);
        if (simplified.toLowerCase() === query.toLowerCase()) {
          return { query, results: first.results };
        }
        const retry = await searchPrices({
          query: simplified,
          lat: body.lat,
          lng: body.lng,
          radiusKm: body.radiusKm,
          sort,
        });
        return { query, results: retry.results };
      } catch {
        return { query, results: [] as Awaited<ReturnType<typeof searchPrices>>["results"] };
      }
    })
  );

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
