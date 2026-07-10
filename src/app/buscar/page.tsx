"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";

export default function BuscarPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const recentSearches = useAppStore((s) => s.recentSearches);
  const clearRecentSearches = useAppStore((s) => s.clearRecentSearches);
  const [query, setQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (hasHydrated && !role) router.replace("/");
  }, [hasHydrated, role, router]);

  function goSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/resultados?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />

      <main className="flex flex-1 flex-col gap-4 px-4 py-5">
        <div className="animate-fade-slide-up" style={{ animationDelay: "0.05s" }}>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nome do produto ou código de barras
          </label>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goSearch(query)}
              placeholder="Ex: Creme de Leite"
              className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-all focus:border-ml-blue focus:ring-2 focus:ring-ml-blue/20"
            />
            <button
              onClick={() => goSearch(query)}
              className="rounded-2xl bg-ml-blue px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95 active:bg-ml-blue-dark"
            >
              Buscar
            </button>
          </div>
        </div>

        <button
          onClick={() => setScannerOpen(true)}
          className="animate-fade-slide-up flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ml-blue/40 bg-ml-blue/5 py-4 text-sm font-semibold text-ml-blue transition-all hover:border-ml-blue/60 hover:bg-ml-blue/10 active:scale-[0.98]"
          style={{ animationDelay: "0.15s" }}
        >
          📷 Bipar código de barras
        </button>

        <div className="animate-fade-slide-up" style={{ animationDelay: "0.25s" }}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Buscas recentes
            </p>
            {recentSearches.length > 0 && (
              <button
                onClick={clearRecentSearches}
                className="text-xs font-semibold text-ml-blue"
              >
                Limpar
              </button>
            )}
          </div>

          {recentSearches.length === 0 ? (
            <p className="text-xs text-gray-400">
              Suas buscas mais recentes vão aparecer aqui.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onClick={() => goSearch(s)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {scannerOpen && (
        <BarcodeScannerModal
          onClose={() => setScannerOpen(false)}
          onDetected={(code) => {
            setScannerOpen(false);
            goSearch(code);
          }}
        />
      )}

      <BottomNav />
    </div>
  );
}
