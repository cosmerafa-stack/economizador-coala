"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { formatCurrency } from "@/lib/format";
import { Nota } from "@/lib/types";

function matchesFilters(
  nota: Nota,
  dataDe: string,
  dataAte: string,
  emitente: string,
  produto: string
): boolean {
  if (dataDe && (!nota.dataEmissao || nota.dataEmissao < dataDe)) return false;
  if (dataAte && (!nota.dataEmissao || nota.dataEmissao > dataAte)) return false;
  if (
    emitente &&
    !nota.emitente.toLowerCase().includes(emitente.toLowerCase())
  )
    return false;
  if (
    produto &&
    !nota.produtos.some((p) =>
      p.descricao.toLowerCase().includes(produto.toLowerCase())
    )
  )
    return false;
  return true;
}

export default function ConsultarNotaPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const notas = useAppStore((s) => s.notas);
  const removeNota = useAppStore((s) => s.removeNota);

  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [emitente, setEmitente] = useState("");
  const [produto, setProduto] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role !== "revendedor") router.replace("/buscar");
  }, [hasHydrated, role, router]);

  const filtered = useMemo(
    () =>
      notas.filter((n) =>
        matchesFilters(n, dataDe, dataAte, emitente, produto)
      ),
    [notas, dataDe, dataAte, emitente, produto]
  );

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Consultar Nota/Recibo" showBack />

      <div className="animate-fade-in flex flex-col gap-2 border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-md">
        <div className="flex gap-2">
          <input
            type="date"
            value={dataDe}
            onChange={(e) => setDataDe(e.target.value)}
            aria-label="Data de"
            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ml-blue/20"
          />
          <input
            type="date"
            value={dataAte}
            onChange={(e) => setDataAte(e.target.value)}
            aria-label="Data até"
            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ml-blue/20"
          />
        </div>
        <input
          value={emitente}
          onChange={(e) => setEmitente(e.target.value)}
          placeholder="Filtrar por emitente"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ml-blue/20"
        />
        <input
          value={produto}
          onChange={(e) => setProduto(e.target.value)}
          placeholder="Filtrar por produto"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ml-blue/20"
        />
      </div>

      <main className="flex flex-1 flex-col gap-3 px-4 py-4">
        {filtered.length === 0 ? (
          <div className="animate-fade-slide-up mt-10 text-center text-sm text-gray-400">
            Nenhuma nota encontrada.
          </div>
        ) : (
          filtered.map((nota, index) => {
            const expanded = expandedId === nota.id;
            return (
              <div
                key={nota.id}
                className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md"
                style={{ animationDelay: `${Math.min(index * 0.06, 0.4)}s` }}
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : nota.id)}
                  className="flex w-full items-start justify-between gap-2 text-left"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {nota.emitente || "Emitente não identificado"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {nota.dataEmissao ?? "Data não identificada"} ·{" "}
                      {nota.produtos.length} produto(s)
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-bold text-ml-green">
                    {nota.valorTotal != null
                      ? formatCurrency(nota.valorTotal)
                      : "—"}
                  </span>
                </button>

                {expanded && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    {nota.destinatario && (
                      <p className="mb-2 text-xs text-gray-500">
                        Destinatário: {nota.destinatario}
                      </p>
                    )}

                    {nota.produtos.length > 0 && (
                      <div className="mb-3 flex flex-col gap-1.5">
                        {nota.produtos.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs"
                          >
                            <span className="text-gray-700">
                              {p.descricao || "Item"} × {p.quantidade}
                            </span>
                            <span className="font-semibold text-gray-800">
                              {p.valorTotal != null
                                ? formatCurrency(p.valorTotal)
                                : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {nota.camposExtras.length > 0 && (
                      <div className="mb-3 flex flex-col gap-1.5">
                        {nota.camposExtras.map((c, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs"
                          >
                            <span className="text-gray-500">{c.rotulo}</span>
                            <span className="font-semibold text-gray-800">
                              {c.valor}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {nota.fotos.length > 0 && (
                      <div className="mb-3 flex gap-2 overflow-x-auto">
                        {nota.fotos.map((foto, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={foto}
                            alt={`Página ${i + 1}`}
                            className="h-20 w-16 shrink-0 rounded-lg border border-gray-100 object-cover"
                          />
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => removeNota(nota.id)}
                      className="text-xs font-semibold text-red-500"
                    >
                      Excluir nota
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      <BottomNav />
    </div>
  );
}
