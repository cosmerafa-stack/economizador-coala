"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, FontSizeLevel } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { NotificationSettings } from "@/components/NotificationSettings";

const FONT_SIZE_LABELS: Record<FontSizeLevel, string> = {
  pequena: "Pequena",
  media: "Média",
  padrao: "Padrão",
  grande: "Grande",
  gigante: "Gigante",
};

export default function ConfiguracoesPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const defaultProfitPercent = useAppStore((s) => s.defaultProfitPercent);
  const setDefaultProfitPercent = useAppStore((s) => s.setDefaultProfitPercent);
  const searchRadiusKm = useAppStore((s) => s.searchRadiusKm);
  const setSearchRadiusKm = useAppStore((s) => s.setSearchRadiusKm);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);
  const revendedorAuth = useAppStore((s) => s.revendedorAuth);
  const setRevendedorAuth = useAppStore((s) => s.setRevendedorAuth);
  const ensureDeviceId = useAppStore((s) => s.ensureDeviceId);
  const showProductImage = useAppStore((s) => s.showProductImage);
  const setShowProductImage = useAppStore((s) => s.setShowProductImage);
  const fontSizeLevel = useAppStore((s) => s.fontSizeLevel);
  const setFontSizeLevel = useAppStore((s) => s.setFontSizeLevel);
  const priceRangeMin = useAppStore((s) => s.priceRangeMin);
  const priceRangeMax = useAppStore((s) => s.priceRangeMax);
  const setPriceRange = useAppStore((s) => s.setPriceRange);
  const [percent, setPercent] = useState(defaultProfitPercent);
  const [radius, setRadius] = useState(searchRadiusKm);
  const [alertInterval, setAlertInterval] = useState(15);
  const [priceMinInput, setPriceMinInput] = useState(
    priceRangeMin != null ? String(priceRangeMin) : ""
  );
  const [priceMaxInput, setPriceMaxInput] = useState(
    priceRangeMax != null ? String(priceRangeMax) : ""
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role === "gestor") router.replace("/gestor");
  }, [hasHydrated, role, router]);

  useEffect(() => {
    if (!hasHydrated || role !== "revendedor") return;
    const deviceId = ensureDeviceId();
    fetch(`/api/beta/alertas/configuracao?deviceId=${deviceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Number.isFinite(data.intervalMinutes)) setAlertInterval(data.intervalMinutes);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, role]);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Configurações" />

      <main className="flex flex-1 flex-col gap-4 px-4 py-5">
        <div
          className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          style={{ animationDelay: "0.05s" }}
        >
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Raio de pesquisa
          </label>
          <p className="mb-3 text-xs text-gray-400">
            Distância máxima da sua localização para buscar preços. Padrão de
            25 km.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="flex-1 accent-ml-blue"
            />
            <input
              type="number"
              min={1}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
            />
            <span className="text-sm text-gray-500">km</span>
          </div>
        </div>

        {role === "revendedor" && (
          <div
            className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            style={{ animationDelay: "0.15s" }}
          >
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Percentual de lucro padrão para revenda
            </label>
            <p className="mb-3 text-xs text-gray-400">
              Usado como sugestão ao adicionar produtos ao carrinho. Você pode
              sempre alterar por item.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={200}
                step={1}
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="flex-1 accent-ml-blue"
              />
              <input
                type="number"
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        )}

        {role === "revendedor" && (
          <div
            className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            style={{ animationDelay: "0.2s" }}
          >
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Verificar alertas de preço a cada
            </label>
            <p className="mb-3 text-xs text-gray-400">
              De quanto em quanto tempo o app confere se algum alerta ativo
              já atingiu o preço-alvo, em segundo plano. Padrão de 15 min.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={alertInterval}
                onChange={(e) => setAlertInterval(Number(e.target.value))}
                className="flex-1 accent-ml-blue"
              />
              <input
                type="number"
                min={5}
                max={1440}
                value={alertInterval}
                onChange={(e) => setAlertInterval(Number(e.target.value))}
                className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
              />
              <span className="text-sm text-gray-500">min</span>
            </div>
          </div>
        )}

        {role === "revendedor" && (
          <div
            className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            style={{ animationDelay: "0.22s" }}
          >
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-medium text-gray-700">
                  Mostrar imagem do produto
                </span>
                <span className="mt-0.5 block text-xs text-gray-400">
                  Exibe uma miniatura ao lado de cada resultado da busca.
                </span>
              </span>
              <input
                type="checkbox"
                checked={showProductImage}
                onChange={(e) => setShowProductImage(e.target.checked)}
                className="h-5 w-5 flex-shrink-0 accent-ml-blue"
              />
            </label>
          </div>
        )}

        <div
          className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          style={{ animationDelay: "0.24s" }}
        >
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Tamanho da letra
          </label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FONT_SIZE_LABELS) as FontSizeLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setFontSizeLevel(level)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  fontSizeLevel === level
                    ? "bg-ml-blue text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {FONT_SIZE_LABELS[level]}
              </button>
            ))}
          </div>
        </div>

        <NotificationSettings />

        <div
          className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          style={{ animationDelay: "0.26s" }}
        >
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Faixa de preço na busca
          </label>
          <p className="mb-3 text-xs text-gray-400">
            Mostra só resultados dentro desse intervalo. Deixe em branco para
            não limitar.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1">
              <span className="text-sm text-gray-500">R$</span>
              <input
                type="number"
                min={0}
                placeholder="Mín."
                value={priceMinInput}
                onChange={(e) => setPriceMinInput(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            <span className="text-gray-300">–</span>
            <div className="flex flex-1 items-center gap-1">
              <span className="text-sm text-gray-500">R$</span>
              <input
                type="number"
                min={0}
                placeholder="Máx."
                value={priceMaxInput}
                onChange={(e) => setPriceMaxInput(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setDefaultProfitPercent(percent);
            setSearchRadiusKm(radius);
            const parsedMin = priceMinInput.trim() === "" ? null : Number(priceMinInput);
            const parsedMax = priceMaxInput.trim() === "" ? null : Number(priceMaxInput);
            setPriceRange(
              parsedMin != null && Number.isFinite(parsedMin) ? parsedMin : null,
              parsedMax != null && Number.isFinite(parsedMax) ? parsedMax : null
            );
            if (role === "revendedor") {
              const deviceId = ensureDeviceId();
              fetch("/api/beta/alertas/configuracao", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deviceId, intervalMinutes: alertInterval }),
              }).catch(() => {});
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          className={`animate-fade-slide-up w-full rounded-2xl py-3 text-sm font-bold text-white shadow-sm transition-all active:scale-[0.98] ${
            saved ? "bg-ml-green" : "bg-ml-blue active:bg-ml-blue-dark"
          }`}
          style={{ animationDelay: "0.25s" }}
        >
          {saved ? "✓ Salvo!" : "Salvar"}
        </button>

        <button
          onClick={() => {
            if (revendedorAuth) {
              fetch("/api/auth/logout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: revendedorAuth.token }),
              }).catch(() => {});
              setRevendedorAuth(null);
            }
            resetOnboarding();
            router.replace("/");
          }}
          className="animate-fade-slide-up w-full rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 active:scale-[0.98]"
          style={{ animationDelay: "0.35s" }}
        >
          Trocar perfil (Consumidor/Revendedor)
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
