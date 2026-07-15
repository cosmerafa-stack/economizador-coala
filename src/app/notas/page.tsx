"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

export default function NotasPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const notasCount = useAppStore((s) => s.notas.length);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role !== "revendedor") router.replace("/buscar");
  }, [hasHydrated, role, router]);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Notas e Recibos" dataTutorial="notas-nav" />

      <main className="flex flex-1 flex-col gap-3 px-4 py-5">
        <button
          onClick={() => router.push("/notas/adicionar")}
          className="animate-fade-slide-up group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
          style={{ animationDelay: "0.05s" }}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ml-blue/10 text-2xl transition-transform group-hover:scale-110">
            📷
          </span>
          <span>
            <span className="block text-base font-bold text-gray-900">
              Adicionar Nota/Recibo
            </span>
            <span className="block text-sm text-gray-500">
              Fotografe e deixe a IA organizar os dados
            </span>
          </span>
        </button>

        <button
          onClick={() => router.push("/notas/consultar")}
          className="animate-fade-slide-up group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
          style={{ animationDelay: "0.15s" }}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ml-green/10 text-2xl transition-transform group-hover:scale-110">
            🔍
          </span>
          <span>
            <span className="block text-base font-bold text-gray-900">
              Consultar Nota/Recibo
            </span>
            <span className="block text-sm text-gray-500">
              {notasCount > 0
                ? `${notasCount} nota(s) guardada(s) — buscar por data, emitente ou produto`
                : "Nenhuma nota guardada ainda"}
            </span>
          </span>
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
