"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { formatCurrency, formatTimeAgo } from "@/lib/format";
import { PriceAlert } from "@/lib/types";

export default function AlertasPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const ensureDeviceId = useAppStore((s) => s.ensureDeviceId);

  const [alertas, setAlertas] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role !== "revendedor") router.replace("/buscar");
  }, [hasHydrated, role, router]);

  async function load() {
    setLoading(true);
    try {
      const deviceId = ensureDeviceId();
      const res = await fetch(`/api/beta/alertas?deviceId=${deviceId}`);
      const data = await res.json();
      setAlertas(data.alertas ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasHydrated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard data-fetching effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  async function handleCriar() {
    if (!query.trim() || !targetPrice) return;
    setSaving(true);
    try {
      const deviceId = ensureDeviceId();
      await fetch("/api/beta/alertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, query, targetPrice: Number(targetPrice) }),
      });
      setQuery("");
      setTargetPrice("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleExcluir(id: string) {
    await fetch(`/api/beta/alertas/${id}`, { method: "DELETE" });
    setAlertas((a) => a.filter((x) => x.id !== id));
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="🔔 Alerta de preço-alvo" showBack />

      <main className="flex flex-1 flex-col gap-4 px-4 py-5">
        <div className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Produto
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Nescau 400g"
            className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ml-blue/20"
          />
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Avisar quando o preço chegar a
          </label>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-gray-500">R$</span>
            <input
              type="number"
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ml-blue/20"
            />
          </div>
          <button
            onClick={handleCriar}
            disabled={saving || !query.trim() || !targetPrice}
            className="w-full rounded-xl bg-ml-blue py-2.5 text-sm font-bold text-white active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? "Criando..." : "Criar alerta"}
          </button>
          <p className="mt-2 text-[11px] text-gray-400">
            Verificação acontece quando você abre esta tela — ainda não avisa
            enquanto o app está fechado.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="text-center text-sm text-gray-400">Carregando...</p>
          ) : alertas.length === 0 ? (
            <p className="text-center text-sm text-gray-400">
              Nenhum alerta criado ainda.
            </p>
          ) : (
            alertas.map((alerta) => (
              <div
                key={alerta.id}
                className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {alerta.query}
                    </p>
                    <p className="text-xs text-gray-400">
                      Alvo: {formatCurrency(alerta.targetPrice)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleExcluir(alerta.id)}
                    aria-label="Excluir alerta"
                    className="text-lg leading-none text-gray-300"
                  >
                    ×
                  </button>
                </div>
                {alerta.active ? (
                  <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-500">
                    Aguardando...
                  </span>
                ) : (
                  <div className="mt-2 rounded-lg bg-ml-green/10 px-3 py-2 text-xs">
                    <p className="font-bold text-ml-green">
                      🎉 Encontrado por {formatCurrency(alerta.triggeredPrice ?? 0)}{" "}
                      em {alerta.triggeredStoreName}
                    </p>
                    {alerta.triggeredAt && (
                      <p className="text-gray-500">
                        {formatTimeAgo(alerta.triggeredAt)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
