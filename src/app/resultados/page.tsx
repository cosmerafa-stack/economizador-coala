"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore, getEffectiveLocation } from "@/lib/store";
import { SORT_LABELS } from "@/lib/sort";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { ProductResultCard } from "@/components/ProductResultCard";
import { AddToCartModal } from "@/components/AddToCartModal";
import { PriceResult, SortOption } from "@/lib/types";

function ResultadosContent() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q") ?? "";

  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const location = useAppStore((s) => s.location);
  const searchRadiusKm = useAppStore((s) => s.searchRadiusKm);
  const defaultProfitPercent = useAppStore((s) => s.defaultProfitPercent);
  const addToCart = useAppStore((s) => s.addToCart);
  const setLastSearchQuery = useAppStore((s) => s.setLastSearchQuery);
  const addRecentSearch = useAppStore((s) => s.addRecentSearch);

  const [sort, setSort] = useState<SortOption>("preco_asc");
  const [cartTarget, setCartTarget] = useState<PriceResult | null>(null);
  const [results, setResults] = useState<PriceResult[]>([]);
  const [loading, setLoading] = useState(Boolean(query));
  const [errored, setErrored] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [resultsQuery, setResultsQuery] = useState<string | null>(null);
  const isSearching = loading || resultsQuery !== query;

  useEffect(() => {
    if (hasHydrated && !role) router.replace("/");
  }, [hasHydrated, role, router]);

  useEffect(() => {
    if (!query) return;
    setLastSearchQuery(query);
    addRecentSearch(query);

    const effectiveLocation = getEffectiveLocation(location);
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting loading/error state when the fetch key (query/location/sort) changes is the standard data-fetching effect pattern
    setLoading(true);
    setErrored(false);
    setUnavailable(false);

    const searchParams = new URLSearchParams({
      q: query,
      lat: String(effectiveLocation.lat),
      lng: String(effectiveLocation.lng),
      radius: String(searchRadiusKm),
      sort,
    });

    fetch(`/api/search?${searchParams.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results ?? []);
        setUnavailable(data.source === "unavailable");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setErrored(true);
      })
      .finally(() => {
        setLoading(false);
        setResultsQuery(query);
      });

    return () => controller.abort();
  }, [query, location, sort, searchRadiusKm, setLastSearchQuery, addRecentSearch]);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={`Resultados: "${query}"`} showBack />

      <div className="animate-fade-in sticky top-[52px] z-10 flex items-center gap-2 border-b border-gray-100 bg-white/80 px-4 py-2.5 backdrop-blur-md">
        <label className="text-xs font-medium text-gray-500">Ordenar:</label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-sm outline-none transition focus:ring-2 focus:ring-ml-blue/20"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <main className="flex flex-1 flex-col gap-3 px-4 py-4">
        {isSearching ? (
          <div className="animate-fade-in mt-10 flex flex-col items-center gap-4 text-center">
            <span className="animate-spin-slow inline-block h-9 w-9 rounded-full border-[3px] border-ml-blue/25 border-t-ml-blue" />
            <p className="text-sm font-medium text-gray-500">
              Buscando preços em até {searchRadiusKm} km...
            </p>
          </div>
        ) : errored || unavailable ? (
          <div className="animate-fade-slide-up mt-10 text-center text-sm text-amber-600">
            Não conseguimos consultar os preços agora.
            <br />
            Tente novamente em alguns instantes.
          </div>
        ) : results.length === 0 ? (
          <div className="animate-fade-slide-up mt-10 text-center text-sm text-gray-400">
            Nenhum resultado em um raio de {searchRadiusKm}km para &quot;{query}
            &quot;.
            <br />
            Tente o nome completo ou o código de barras.
          </div>
        ) : (
          <>
            <p className="animate-fade-in text-xs text-gray-400">
              {results.length} resultado(s) encontrado(s) em até {searchRadiusKm}{" "}
              km
            </p>
            {results.map((result, index) => (
              <div
                key={result.id}
                className="animate-fade-slide-up"
                style={{ animationDelay: `${Math.min(index * 0.06, 0.4)}s` }}
              >
                <ProductResultCard
                  result={result}
                  showAddToCart={role === "revendedor" || role === "consumidor"}
                  onAddToCart={() => setCartTarget(result)}
                />
              </div>
            ))}
          </>
        )}
      </main>

      {cartTarget && (
        <AddToCartModal
          result={cartTarget}
          defaultProfitPercent={defaultProfitPercent}
          allowProfit={role === "revendedor"}
          onClose={() => setCartTarget(null)}
          onConfirm={(percent, quantity) => {
            const resalePrice = cartTarget.price * (1 + percent / 100);
            addToCart({
              id: `${cartTarget.id}-${Date.now()}`,
              priceResult: cartTarget,
              profitPercent: percent,
              resalePrice,
              grossProfit: resalePrice - cartTarget.price,
              quantity,
              addedAt: new Date().toISOString(),
            });
            setCartTarget(null);
            router.push("/carrinho");
          }}
        />
      )}

      <BottomNav />
    </div>
  );
}

export default function ResultadosPage() {
  return (
    <Suspense fallback={null}>
      <ResultadosContent />
    </Suspense>
  );
}
