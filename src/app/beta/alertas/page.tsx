"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, getEffectiveLocation } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { formatCurrency, formatDistance, formatTimeAgo } from "@/lib/format";
import { googleMapsUrl } from "@/lib/maps";
import { haversineDistanceKm } from "@/lib/geo";
import { PriceAlert } from "@/lib/types";

export default function AlertasPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const ensureDeviceId = useAppStore((s) => s.ensureDeviceId);
  const location = useAppStore((s) => s.location);
  const searchRadiusKm = useAppStore((s) => s.searchRadiusKm);

  const [alertas, setAlertas] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role !== "revendedor") router.replace("/buscar");
  }, [hasHydrated, role, router]);

  function goToResultados(produtoQuery: string) {
    router.push(`/resultados?q=${encodeURIComponent(produtoQuery)}`);
  }

  async function load() {
    setLoading(true);
    try {
      const deviceId = ensureDeviceId();
      const { lat, lng } = getEffectiveLocation(location);
      const res = await fetch(
        `/api/beta/alertas?deviceId=${deviceId}&lat=${lat}&lng=${lng}&radius=${searchRadiusKm}`
      );
      const data = await res.json();
      setAlertas(data.alertas ?? []);
    } finally {
      setLoading(false);
    }
  }

  function handleVerificarAgora(id: string) {
    setVerifyingIds((prev) => new Set(prev).add(id));
    const deviceId = ensureDeviceId();
    const { lat, lng } = getEffectiveLocation(location);
    fetch(`/api/beta/alertas/${id}/verificar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, lat, lng, radiusKm: searchRadiusKm }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.alerta) {
          setAlertas((prev) => prev.map((a) => (a.id === id ? data.alerta : a)));
        }
      })
      .finally(() => {
        setVerifyingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
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
            Produto ou código de barras
          </label>
          <div className="mb-3 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Nescau 400g"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ml-blue/20"
            />
            <button
              onClick={() => setScannerOpen(true)}
              aria-label="Bipar código de barras"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-base"
            >
              📷
            </button>
          </div>
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
            Verificação acontece quando você abre esta tela e também em
            segundo plano (intervalo configurável em Ajustes). Só dispara com
            nota fiscal emitida nas últimas 24h, pra evitar mostrar preço já
            ultrapassado.
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
                  <button
                    onClick={() => goToResultados(alerta.query)}
                    className="text-left"
                  >
                    <p className="text-sm font-bold text-ml-blue underline decoration-ml-blue/30 underline-offset-2">
                      {alerta.query}
                    </p>
                    <p className="text-xs text-gray-400">
                      Alvo: {formatCurrency(alerta.targetPrice)}
                    </p>
                  </button>
                  <button
                    onClick={() => handleExcluir(alerta.id)}
                    aria-label="Excluir alerta"
                    className="text-lg leading-none text-gray-300"
                  >
                    ×
                  </button>
                </div>
                {alerta.active ? (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-500">
                      Aguardando...
                    </span>
                    <button
                      onClick={() => handleVerificarAgora(alerta.id)}
                      disabled={verifyingIds.has(alerta.id)}
                      className="text-[11px] font-semibold text-ml-blue disabled:opacity-50"
                    >
                      {verifyingIds.has(alerta.id)
                        ? "Verificando..."
                        : "🔄 Verificar agora"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg bg-ml-green/10 px-3 py-2 text-xs">
                    <button
                      onClick={() => goToResultados(alerta.query)}
                      className="w-full text-left active:scale-[0.98]"
                    >
                      <p className="font-bold text-ml-green">
                        🎉 Visto por {formatCurrency(alerta.triggeredPrice ?? 0)}{" "}
                        em {alerta.triggeredStoreName}
                      </p>
                      {alerta.triggeredEmittedAt && (
                        <p className="text-gray-600">
                          Nota fiscal emitida {formatTimeAgo(alerta.triggeredEmittedAt)}
                        </p>
                      )}
                    </button>

                    {alerta.triggeredStoreAddress && (
                      <p className="mt-1.5 leading-snug text-gray-500">
                        {alerta.triggeredStoreAddress}
                      </p>
                    )}
                    {(alerta.triggeredStoreLat != null || alerta.triggeredStorePhone) && (
                      <div className="mt-1 flex items-center gap-3 text-gray-500">
                        {alerta.triggeredStoreLat != null &&
                          alerta.triggeredStoreLng != null && (
                            <span className="font-semibold text-ml-blue">
                              {formatDistance(
                                haversineDistanceKm(getEffectiveLocation(location), {
                                  lat: alerta.triggeredStoreLat,
                                  lng: alerta.triggeredStoreLng,
                                })
                              )}
                            </span>
                          )}
                        {alerta.triggeredStorePhone && <span>{alerta.triggeredStorePhone}</span>}
                      </div>
                    )}
                    {alerta.triggeredStoreLat != null && alerta.triggeredStoreLng != null && (
                      <a
                        href={googleMapsUrl(
                          { lat: alerta.triggeredStoreLat, lng: alerta.triggeredStoreLng },
                          alerta.triggeredStoreName ?? undefined
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 font-semibold text-ml-blue"
                      >
                        📍 Abrir Mapa
                      </a>
                    )}

                    <p className="mt-1.5 text-[11px] text-gray-400">
                      Preço vem de nota fiscal recente, não de estoque em tempo
                      real — confirme com a loja antes de ir.
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {scannerOpen && (
        <BarcodeScannerModal
          onClose={() => setScannerOpen(false)}
          onDetected={(code) => {
            setScannerOpen(false);
            setQuery(code);
          }}
        />
      )}
    </div>
  );
}
