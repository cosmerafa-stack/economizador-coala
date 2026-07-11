"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { formatCurrency } from "@/lib/format";

export default function RelatorioPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const notas = useAppStore((s) => s.notas);
  const cart = useAppStore((s) => s.cart);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role !== "revendedor") router.replace("/buscar");
  }, [hasHydrated, role, router]);

  const stats = useMemo(() => {
    const totalGastoNotas = notas.reduce((acc, n) => acc + (n.valorTotal ?? 0), 0);
    const lucroPotencialCarrinho = cart.reduce(
      (acc, item) => acc + item.grossProfit * item.quantity,
      0
    );
    const custoCarrinho = cart.reduce(
      (acc, item) => acc + item.priceResult.price * item.quantity,
      0
    );
    return {
      totalGastoNotas,
      lucroPotencialCarrinho,
      custoCarrinho,
      qtdNotas: notas.length,
      qtdItensCarrinho: cart.reduce((acc, i) => acc + i.quantity, 0),
    };
  }, [notas, cart]);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="💰 Relatório de economia" showBack />

      <main className="flex flex-1 flex-col gap-4 px-4 py-5">
        <div className="animate-fade-slide-up rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Resumo do que já está registrado no app (notas salvas e carrinho
          atual) — ainda não é um histórico completo de compras.
        </div>

        <div className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Lucro potencial no carrinho atual
          </p>
          <p className="mt-1 text-3xl font-extrabold text-ml-green">
            {formatCurrency(stats.lucroPotencialCarrinho)}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {stats.qtdItensCarrinho} item(ns) · custo de{" "}
            {formatCurrency(stats.custoCarrinho)}
          </p>
        </div>

        <div className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Total registrado em notas salvas
          </p>
          <p className="mt-1 text-2xl font-extrabold text-gray-900">
            {formatCurrency(stats.totalGastoNotas)}
          </p>
          <p className="mt-1 text-xs text-gray-400">{stats.qtdNotas} nota(s)</p>
        </div>
      </main>
    </div>
  );
}
