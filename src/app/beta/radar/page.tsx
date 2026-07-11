"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { formatCurrency, formatTimeAgo } from "@/lib/format";
import { OpportunityRadarItem } from "@/lib/types";

export default function RadarPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  const [oportunidades, setOportunidades] = useState<OpportunityRadarItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role !== "revendedor") router.replace("/buscar");
  }, [hasHydrated, role, router]);

  useEffect(() => {
    if (!hasHydrated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard data-fetching effect
    setLoading(true);
    fetch("/api/beta/radar")
      .then((res) => res.json())
      .then((data) => setOportunidades(data.oportunidades ?? []))
      .finally(() => setLoading(false));
  }, [hasHydrated]);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="🎯 Radar de oportunidade" showBack />

      <main className="flex flex-1 flex-col gap-3 px-4 py-5">
        <div className="animate-fade-slide-up rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Baseado nas buscas feitas por todos os usuários do app nos últimos
          14 dias — cobertura cresce conforme mais gente busca preços.
        </div>

        {loading ? (
          <p className="text-center text-sm text-gray-400">Carregando...</p>
        ) : oportunidades.length === 0 ? (
          <p className="animate-fade-slide-up text-center text-sm text-gray-400">
            Nenhuma oportunidade clara encontrada ainda. Volte depois de mais
            buscas serem feitas no app.
          </p>
        ) : (
          oportunidades.map((op, index) => (
            <div
              key={op.query}
              className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-gray-900">{op.query}</p>
                <span className="shrink-0 rounded-full bg-ml-green/10 px-2 py-1 text-[11px] font-bold text-ml-green">
                  −{op.spreadPercent}%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Mais barato em{" "}
                  <span className="font-semibold text-gray-800">
                    {op.cheapestStoreName}
                  </span>
                </span>
                <span className="font-bold text-ml-green">
                  {formatCurrency(op.cheapestPrice)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-gray-400">Preço típico</span>
                <span className="text-gray-500 line-through">
                  {formatCurrency(op.typicalPrice)}
                </span>
              </div>
              <p className="mt-2 text-[10px] text-gray-400">
                {formatTimeAgo(op.recordedAt)}
              </p>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
