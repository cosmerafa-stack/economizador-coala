"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";

const PRAZOS = [7, 30, 90];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default function GarantiaPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const notas = useAppStore((s) => s.notas);
  const [prazoDias, setPrazoDias] = useState(30);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role !== "revendedor") router.replace("/buscar");
  }, [hasHydrated, role, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- capturing "now" once on mount to avoid an impure Date.now() call during render
    setNow(Date.now());
  }, []);

  const notasComPrazo =
    now === null
      ? []
      : notas
          .filter((n) => n.dataEmissao)
          .map((nota) => {
            const emissao = new Date(nota.dataEmissao as string).getTime();
            const prazoFinal = emissao + prazoDias * MS_PER_DAY;
            const diasRestantes = Math.ceil((prazoFinal - now) / MS_PER_DAY);
            return { nota, diasRestantes };
          })
          .sort((a, b) => a.diasRestantes - b.diasRestantes);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="⏳ Prazo de troca/garantia" showBack />

      <main className="flex flex-1 flex-col gap-4 px-4 py-5">
        <div className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Prazo de troca considerado
          </p>
          <div className="flex gap-2">
            {PRAZOS.map((p) => (
              <button
                key={p}
                onClick={() => setPrazoDias(p)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                  prazoDias === p
                    ? "bg-ml-blue text-white"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                {p} dias
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Aplicado a todas as notas com data de emissão identificada — ajuste
            conforme a política de troca de cada loja.
          </p>
        </div>

        {notasComPrazo.length === 0 ? (
          <p className="text-center text-sm text-gray-400">
            Nenhuma nota com data de emissão identificada.
          </p>
        ) : (
          notasComPrazo.map(({ nota, diasRestantes }) => (
            <div
              key={nota.id}
              className="animate-fade-slide-up flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {nota.emitente || "Nota sem nome"}
                </p>
                <p className="text-xs text-gray-400">
                  Emitida em{" "}
                  {new Date(nota.dataEmissao as string).toLocaleDateString(
                    "pt-BR"
                  )}
                </p>
              </div>
              {diasRestantes >= 0 ? (
                <span
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                    diasRestantes <= 3
                      ? "bg-red-50 text-red-500"
                      : "bg-ml-green/10 text-ml-green"
                  }`}
                >
                  {diasRestantes === 0
                    ? "Vence hoje"
                    : `${diasRestantes} dia(s)`}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-400">
                  Encerrado
                </span>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
