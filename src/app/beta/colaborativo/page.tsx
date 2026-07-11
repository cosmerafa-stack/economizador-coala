"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { formatCurrency, formatTimeAgo } from "@/lib/format";
import { CommunityPrice } from "@/lib/types";

export default function ColaborativoPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const ensureDeviceId = useAppStore((s) => s.ensureDeviceId);

  const [precos, setPrecos] = useState<CommunityPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [storeName, setStoreName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role !== "revendedor") router.replace("/buscar");
  }, [hasHydrated, role, router]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/beta/colaborativo");
      const data = await res.json();
      setPrecos(data.precos ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasHydrated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard data-fetching effect
    load();
  }, [hasHydrated]);

  async function handleEnviar() {
    if (!productName.trim() || !price || !storeName.trim()) return;
    setSaving(true);
    try {
      const deviceId = ensureDeviceId();
      await fetch("/api/beta/colaborativo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          productName,
          price: Number(price),
          storeName,
        }),
      });
      setProductName("");
      setPrice("");
      setStoreName("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="🤝 Preço colaborativo" showBack />

      <main className="flex flex-1 flex-col gap-4 px-4 py-5">
        <div className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-bold text-gray-900">
            Viu um preço? Compartilhe
          </p>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Produto"
            className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ml-blue/20"
          />
          <div className="mb-2 flex gap-2">
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Preço (R$)"
              className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ml-blue/20"
            />
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Loja"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ml-blue/20"
            />
          </div>
          <button
            onClick={handleEnviar}
            disabled={saving || !productName.trim() || !price || !storeName.trim()}
            className="w-full rounded-xl bg-ml-blue py-2.5 text-sm font-bold text-white active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? "Enviando..." : "Enviar"}
          </button>
          <p className="mt-2 text-[11px] text-gray-400">
            Ainda não entra na busca oficial — é um feed separado, só dentro
            do Beta.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {loading ? (
            <p className="text-center text-sm text-gray-400">Carregando...</p>
          ) : precos.length === 0 ? (
            <p className="text-center text-sm text-gray-400">
              Nenhum preço reportado ainda. Seja o primeiro!
            </p>
          ) : (
            precos.map((p) => (
              <div
                key={p.id}
                className="animate-fade-slide-up flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {p.productName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {p.storeName} · {formatTimeAgo(p.createdAt)}
                  </p>
                </div>
                <span className="font-bold text-ml-blue">
                  {formatCurrency(p.price)}
                </span>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
