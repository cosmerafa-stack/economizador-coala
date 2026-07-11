"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, getEffectiveLocation } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { formatCurrency } from "@/lib/format";
import { ListaOtimizadaResult } from "@/lib/types";

export default function OtimizadorPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const cart = useAppStore((s) => s.cart);
  const location = useAppStore((s) => s.location);
  const searchRadiusKm = useAppStore((s) => s.searchRadiusKm);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ListaOtimizadaResult | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role !== "revendedor") router.replace("/buscar");
  }, [hasHydrated, role, router]);

  const queries = [...new Set(cart.map((item) => item.priceResult.productName))];

  async function handleOtimizar() {
    setLoading(true);
    setError(null);
    setResultado(null);
    try {
      const effectiveLocation = getEffectiveLocation(location);
      const res = await fetch("/api/beta/otimizar-lista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries,
          lat: effectiveLocation.lat,
          lng: effectiveLocation.lng,
          radiusKm: searchRadiusKm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Não foi possível otimizar a lista.");
        return;
      }
      setResultado(data.resultado);
    } catch {
      setError("Não foi possível otimizar a lista agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="🧮 Otimizador de lista" showBack />

      <main className="flex flex-1 flex-col gap-4 px-4 py-5">
        <div className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-bold text-gray-900">
            Itens do seu carrinho ({queries.length})
          </p>
          {queries.length === 0 ? (
            <p className="text-xs text-gray-400">
              Adicione produtos ao carrinho para comparar as opções de compra.
            </p>
          ) : (
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {queries.map((q) => (
                <li
                  key={q}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600"
                >
                  {q}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={handleOtimizar}
            disabled={queries.length === 0 || loading}
            className="w-full rounded-xl bg-ml-blue py-2.5 text-sm font-bold text-white active:scale-[0.98] disabled:opacity-40"
          >
            {loading ? "Comparando lojas..." : "Comparar opções"}
          </button>
        </div>

        {error && (
          <p className="animate-fade-slide-up text-center text-sm text-amber-600">
            {error}
          </p>
        )}

        {resultado && (
          <div className="animate-fade-slide-up flex flex-col gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Opção A · Tudo numa loja só
              </p>
              <p className="mt-1 text-sm font-bold text-gray-900">
                {resultado.bestStoreName ?? "Nenhuma loja cobre os itens"}
              </p>
              <p className="text-xs text-gray-500">
                Cobre {resultado.bestStoreCoveredCount} de {queries.length} itens
              </p>
              <p className="mt-1 text-xl font-extrabold text-gray-900">
                {formatCurrency(resultado.bestStoreTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-ml-green/30 bg-ml-green/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ml-green">
                Opção B · Cada item na loja mais barata
              </p>
              <p className="text-xs text-gray-500">
                Dividido entre {resultado.storesInvolved} loja(s)
              </p>
              <p className="mt-1 text-xl font-extrabold text-ml-green">
                {formatCurrency(resultado.multiStoreTotal)}
              </p>
              {resultado.savings > 0 && (
                <p className="text-xs font-semibold text-ml-green">
                  Economia de {formatCurrency(resultado.savings)} vs. loja única
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm font-bold text-gray-900">
                Detalhe por item
              </p>
              <div className="flex flex-col gap-2">
                {resultado.itens.map((item) => (
                  <div
                    key={item.query}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-gray-700">
                      {item.query}
                    </span>
                    <span className="text-right">
                      <span className="block font-bold text-ml-blue">
                        {item.bestOverallPrice != null
                          ? formatCurrency(item.bestOverallPrice)
                          : "—"}
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        {item.bestOverallStore ?? "não encontrado"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
