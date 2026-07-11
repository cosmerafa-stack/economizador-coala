"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { formatCurrency, formatTimeAgo } from "@/lib/format";
import { PriceHistoryPoint } from "@/lib/types";

export default function HistoricoPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  const [query, setQuery] = useState("");
  const [pontos, setPontos] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role !== "revendedor") router.replace("/buscar");
  }, [hasHydrated, role, router]);

  async function handleBuscar(value: string = query) {
    if (!value.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/beta/historico?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setPontos(data.pontos ?? []);
    } finally {
      setLoading(false);
    }
  }

  const menor = pontos.length > 0 ? Math.min(...pontos.map((p) => p.price)) : 0;
  const maior = pontos.length > 0 ? Math.max(...pontos.map((p) => p.price)) : 0;
  const media =
    pontos.length > 0
      ? pontos.reduce((acc, p) => acc + p.price, 0) / pontos.length
      : 0;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="📈 Histórico de preço" showBack />

      <main className="flex flex-1 flex-col gap-4 px-4 py-5">
        <div className="animate-fade-slide-up flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            placeholder="Nome do produto ou código de barras"
            className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-ml-blue focus:ring-2 focus:ring-ml-blue/20"
          />
          <button
            onClick={() => setScannerOpen(true)}
            aria-label="Bipar código de barras"
            className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-3.5 text-base shadow-sm active:scale-95"
          >
            📷
          </button>
          <button
            onClick={() => handleBuscar()}
            className="rounded-2xl bg-ml-blue px-5 py-3 text-sm font-semibold text-white shadow-sm active:scale-95"
          >
            Ver
          </button>
        </div>

        {loading && (
          <p className="text-center text-sm text-gray-400">Carregando...</p>
        )}

        {!loading && searched && pontos.length === 0 && (
          <p className="animate-fade-slide-up text-center text-sm text-gray-400">
            Ainda não há histórico registrado para &quot;{query}&quot;. Toda
            busca feita na tela principal alimenta esse histórico.
          </p>
        )}

        {!loading && pontos.length > 0 && (
          <>
            <div className="animate-fade-slide-up grid grid-cols-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="text-center">
                <p className="text-xs text-gray-400">Menor</p>
                <p className="font-bold text-ml-green">{formatCurrency(menor)}</p>
              </div>
              <div className="border-x border-gray-100 text-center">
                <p className="text-xs text-gray-400">Média</p>
                <p className="font-bold text-gray-900">{formatCurrency(media)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Maior</p>
                <p className="font-bold text-red-500">{formatCurrency(maior)}</p>
              </div>
            </div>

            <div className="animate-fade-slide-up flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              {[...pontos].reverse().map((ponto, index) => {
                const widthPercent =
                  maior > menor
                    ? 20 + ((ponto.price - menor) / (maior - menor)) * 80
                    : 100;
                return (
                  <div key={index} className="text-xs">
                    <div className="mb-0.5 flex items-center justify-between text-gray-500">
                      <span className="truncate">{ponto.storeName}</span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(ponto.price)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-ml-blue"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      {formatTimeAgo(ponto.recordedAt)}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {scannerOpen && (
        <BarcodeScannerModal
          onClose={() => setScannerOpen(false)}
          onDetected={(code) => {
            setScannerOpen(false);
            setQuery(code);
            handleBuscar(code);
          }}
        />
      )}
    </div>
  );
}
