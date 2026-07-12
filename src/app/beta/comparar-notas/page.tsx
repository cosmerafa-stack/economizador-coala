"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, getEffectiveLocation } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { formatCurrency } from "@/lib/format";
import { PriceResult } from "@/lib/types";

interface ComparacaoItem {
  descricao: string;
  valorPago: number | null;
  menorPrecoHoje: number | null;
  lojaHoje: string | null;
  diferenca: number | null;
}

export default function CompararNotasPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const notas = useAppStore((s) => s.notas);
  const location = useAppStore((s) => s.location);
  const searchRadiusKm = useAppStore((s) => s.searchRadiusKm);

  const [selectedNotaId, setSelectedNotaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparacao, setComparacao] = useState<ComparacaoItem[]>([]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role !== "revendedor") router.replace("/buscar");
  }, [hasHydrated, role, router]);

  async function handleComparar(notaId: string) {
    const nota = notas.find((n) => n.id === notaId);
    if (!nota) return;
    setSelectedNotaId(notaId);
    setLoading(true);
    setComparacao([]);

    try {
      const effectiveLocation = getEffectiveLocation(location);
      // Sequential on purpose — the price source is shared across every
      // user of the app, and firing one request per note item in parallel
      // turns a single tap into a burst of concurrent hits, which is
      // exactly what trips its rate limit even with just one person using
      // the app.
      const itens: ComparacaoItem[] = [];
      for (const produto of nota.produtos) {
        try {
          const searchParams = new URLSearchParams({
            q: produto.descricao,
            lat: String(effectiveLocation.lat),
            lng: String(effectiveLocation.lng),
            radius: String(searchRadiusKm),
            sort: "preco_asc",
            retryShort: "1",
          });
          const res = await fetch(`/api/search?${searchParams.toString()}`);
          const data = await res.json();
          const results: PriceResult[] = data.results ?? [];
          const cheapest = results[0];
          itens.push({
            descricao: produto.descricao,
            valorPago: produto.valorUnitario,
            menorPrecoHoje: cheapest ? cheapest.price : null,
            lojaHoje: cheapest ? cheapest.store.name : null,
            diferenca:
              cheapest && produto.valorUnitario != null
                ? produto.valorUnitario - cheapest.price
                : null,
          });
        } catch {
          itens.push({
            descricao: produto.descricao,
            valorPago: produto.valorUnitario,
            menorPrecoHoje: null,
            lojaHoje: null,
            diferenca: null,
          });
        }
      }
      setComparacao(itens);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="🧾 Comparar suas notas" showBack />

      <main className="flex flex-1 flex-col gap-4 px-4 py-5">
        {notas.length === 0 ? (
          <p className="text-center text-sm text-gray-400">
            Você ainda não salvou nenhuma nota. Adicione uma em Notas para
            poder comparar.
          </p>
        ) : (
          notas.map((nota) => (
            <div
              key={nota.id}
              className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {nota.emitente || "Nota sem nome"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {nota.produtos.length} produto(s)
                  </p>
                </div>
                <button
                  onClick={() => handleComparar(nota.id)}
                  disabled={loading && selectedNotaId === nota.id}
                  className="rounded-xl bg-ml-blue px-3 py-2 text-xs font-bold text-white active:scale-95 disabled:opacity-40"
                >
                  {loading && selectedNotaId === nota.id
                    ? "Comparando..."
                    : "Comparar"}
                </button>
              </div>

              {selectedNotaId === nota.id && comparacao.length > 0 && (
                <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
                  {comparacao.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-lg bg-gray-50 p-2.5 text-xs"
                    >
                      <p className="mb-1 font-semibold text-gray-800">
                        {item.descricao}
                      </p>
                      <div className="flex items-center justify-between text-gray-500">
                        <span>
                          Você pagou{" "}
                          {item.valorPago != null
                            ? formatCurrency(item.valorPago)
                            : "—"}
                        </span>
                        <span>
                          Hoje:{" "}
                          {item.menorPrecoHoje != null ? (
                            <span className="font-bold text-ml-blue">
                              {formatCurrency(item.menorPrecoHoje)}
                            </span>
                          ) : (
                            "não encontrado"
                          )}
                        </span>
                      </div>
                      {item.lojaHoje && (
                        <p className="text-[10px] text-gray-400">
                          em {item.lojaHoje}
                        </p>
                      )}
                      {item.diferenca != null && (
                        <p
                          className={`mt-1 font-bold ${
                            item.diferenca > 0 ? "text-ml-green" : "text-gray-400"
                          }`}
                        >
                          {item.diferenca > 0
                            ? `Economizaria ${formatCurrency(item.diferenca)} comprando hoje`
                            : "Preço igual ou melhor na hora da compra"}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
