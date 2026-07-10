"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { CameraCapture } from "@/components/CameraCapture";
import { ExtractedNotaFields, NotaCampoExtra, NotaProduto } from "@/lib/types";

type Stage = "capture" | "analyzing" | "review";

const EMPTY_FIELDS: ExtractedNotaFields = {
  emitente: "",
  destinatario: "",
  dataEmissao: null,
  valorTotal: null,
  produtos: [],
  camposExtras: [],
};

export default function AdicionarNotaPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const addNota = useAppStore((s) => s.addNota);

  const [photos, setPhotos] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>("capture");
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [fields, setFields] = useState<ExtractedNotaFields>(EMPTY_FIELDS);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role !== "revendedor") router.replace("/buscar");
  }, [hasHydrated, role, router]);

  async function handleConcluir() {
    setStage("analyzing");
    try {
      const res = await fetch("/api/notas/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos }),
      });
      const data = await res.json();
      setFields(data.fields ?? EMPTY_FIELDS);
      setAiMessage(data.message);
    } catch {
      setFields(EMPTY_FIELDS);
      setAiMessage("Não foi possível ler a nota automaticamente. Preencha os campos manualmente.");
    } finally {
      setStage("review");
    }
  }

  function updateProduto(index: number, patch: Partial<NotaProduto>) {
    setFields((f) => ({
      ...f,
      produtos: f.produtos.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  }

  function removeProduto(index: number) {
    setFields((f) => ({
      ...f,
      produtos: f.produtos.filter((_, i) => i !== index),
    }));
  }

  function addProduto() {
    setFields((f) => ({
      ...f,
      produtos: [
        ...f.produtos,
        { descricao: "", quantidade: 1, valorUnitario: null, valorTotal: null },
      ],
    }));
  }

  function updateCampoExtra(index: number, patch: Partial<NotaCampoExtra>) {
    setFields((f) => ({
      ...f,
      camposExtras: f.camposExtras.map((c, i) =>
        i === index ? { ...c, ...patch } : c
      ),
    }));
  }

  function removeCampoExtra(index: number) {
    setFields((f) => ({
      ...f,
      camposExtras: f.camposExtras.filter((_, i) => i !== index),
    }));
  }

  function addCampoExtra() {
    setFields((f) => ({
      ...f,
      camposExtras: [...f.camposExtras, { rotulo: "", valor: "" }],
    }));
  }

  function handleSalvar() {
    addNota({
      id: `nota-${Date.now()}`,
      emitente: fields.emitente,
      destinatario: fields.destinatario,
      dataEmissao: fields.dataEmissao,
      valorTotal: fields.valorTotal,
      observacoes: "",
      produtos: fields.produtos,
      camposExtras: fields.camposExtras,
      fotos: photos,
      criadoEm: new Date().toISOString(),
    });
    router.push("/notas/consultar");
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Adicionar Nota/Recibo" showBack />

      {stage === "capture" && (
        <main className="flex flex-1 flex-col gap-4 px-4 py-5">
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-[3/4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt={`Página ${index + 1}`}
                    className="h-full w-full rounded-xl border border-gray-100 object-cover shadow-sm"
                  />
                  <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                  <button
                    onClick={() =>
                      setPhotos((p) => p.filter((_, i) => i !== index))
                    }
                    aria-label={`Remover página ${index + 1}`}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setCameraOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ml-blue/40 bg-ml-blue/5 py-4 text-sm font-semibold text-ml-blue transition-all hover:border-ml-blue/60 hover:bg-ml-blue/10 active:scale-[0.98]"
          >
            📷 {photos.length === 0 ? "Tirar foto" : "Tirar outra página"}
          </button>

          {photos.length > 0 && (
            <button
              onClick={() => setPreviewIndex(0)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98]"
            >
              👁️ Pré-visualizar
            </button>
          )}

          <div className="flex-1" />

          <button
            onClick={handleConcluir}
            disabled={photos.length === 0}
            className="w-full rounded-2xl bg-ml-blue py-3 text-sm font-bold text-white shadow-sm transition-all active:scale-[0.98] active:bg-ml-blue-dark disabled:opacity-40"
          >
            ✅ Concluir
          </button>
        </main>
      )}

      {stage === "analyzing" && (
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
          <span className="animate-spin-slow inline-block h-8 w-8 rounded-full border-2 border-ml-blue/30 border-t-ml-blue" />
          <p className="text-sm text-gray-500">Lendo nota com IA...</p>
        </main>
      )}

      {stage === "review" && (
        <main className="flex flex-1 flex-col gap-4 px-4 py-5">
          {aiMessage && (
            <div className="animate-fade-slide-up rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {aiMessage}
            </div>
          )}

          <div className="animate-fade-slide-up flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Emitente
              </label>
              <input
                value={fields.emitente}
                onChange={(e) =>
                  setFields((f) => ({ ...f, emitente: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ml-blue/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Destinatário
              </label>
              <input
                value={fields.destinatario}
                onChange={(e) =>
                  setFields((f) => ({ ...f, destinatario: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ml-blue/20"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Data de emissão
                </label>
                <input
                  type="date"
                  value={fields.dataEmissao ?? ""}
                  onChange={(e) =>
                    setFields((f) => ({
                      ...f,
                      dataEmissao: e.target.value || null,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ml-blue/20"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Valor total (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fields.valorTotal ?? ""}
                  onChange={(e) =>
                    setFields((f) => ({
                      ...f,
                      valorTotal: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ml-blue/20"
                />
              </div>
            </div>
          </div>

          <div
            className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            style={{ animationDelay: "0.05s" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">Produtos</span>
              <button
                onClick={addProduto}
                className="text-xs font-semibold text-ml-blue"
              >
                + Adicionar produto
              </button>
            </div>

            {fields.produtos.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum produto identificado.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {fields.produtos.map((produto, index) => (
                  <div
                    key={index}
                    className="rounded-xl bg-gray-50 p-3 text-sm"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        value={produto.descricao}
                        onChange={(e) =>
                          updateProduto(index, { descricao: e.target.value })
                        }
                        placeholder="Descrição"
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ml-blue/20"
                      />
                      <button
                        onClick={() => removeProduto(index)}
                        aria-label="Remover produto"
                        className="text-lg leading-none text-gray-300"
                      >
                        ×
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={produto.quantidade}
                        onChange={(e) =>
                          updateProduto(index, {
                            quantidade: Number(e.target.value),
                          })
                        }
                        placeholder="Qtd."
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ml-blue/20"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={produto.valorUnitario ?? ""}
                        onChange={(e) =>
                          updateProduto(index, {
                            valorUnitario: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        placeholder="Val. unit."
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ml-blue/20"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={produto.valorTotal ?? ""}
                        onChange={(e) =>
                          updateProduto(index, {
                            valorTotal: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        placeholder="Val. total"
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ml-blue/20"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">
                Outras informações
              </span>
              <button
                onClick={addCampoExtra}
                className="text-xs font-semibold text-ml-blue"
              >
                + Adicionar campo
              </button>
            </div>

            {fields.camposExtras.length === 0 ? (
              <p className="text-xs text-gray-400">
                Nenhuma informação extra identificada (CNPJ, número da nota,
                forma de pagamento, etc.).
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {fields.camposExtras.map((campo, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={campo.rotulo}
                      onChange={(e) =>
                        updateCampoExtra(index, { rotulo: e.target.value })
                      }
                      placeholder="Campo (ex: CNPJ)"
                      className="w-2/5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ml-blue/20"
                    />
                    <input
                      value={campo.valor}
                      onChange={(e) =>
                        updateCampoExtra(index, { valor: e.target.value })
                      }
                      placeholder="Valor"
                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ml-blue/20"
                    />
                    <button
                      onClick={() => removeCampoExtra(index)}
                      aria-label="Remover campo"
                      className="text-lg leading-none text-gray-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStage("capture")}
              className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 active:scale-[0.98]"
            >
              Voltar às fotos
            </button>
            <button
              onClick={handleSalvar}
              className="flex-1 rounded-2xl bg-ml-blue py-3 text-sm font-bold text-white shadow-sm transition-all active:scale-[0.98] active:bg-ml-blue-dark"
            >
              Salvar nota
            </button>
          </div>
        </main>
      )}

      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(dataUrl) => {
            setPhotos((p) => [...p, dataUrl]);
            setCameraOpen(false);
          }}
        />
      )}

      {previewIndex !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setPreviewIndex(null)}
              aria-label="Fechar"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl text-white"
            >
              ×
            </button>
            <span className="text-sm text-white/80">
              Página {previewIndex + 1} de {photos.length}
            </span>
            <span className="w-9" />
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[previewIndex]}
              alt={`Página ${previewIndex + 1}`}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </div>
          <div className="flex items-center justify-center gap-6 px-4 py-6">
            <button
              onClick={() => setPreviewIndex((i) => Math.max(0, (i ?? 0) - 1))}
              disabled={previewIndex === 0}
              className="rounded-full bg-white/10 px-4 py-2 text-sm text-white disabled:opacity-30"
            >
              ‹ Anterior
            </button>
            <button
              onClick={() =>
                setPreviewIndex((i) =>
                  Math.min(photos.length - 1, (i ?? 0) + 1)
                )
              }
              disabled={previewIndex === photos.length - 1}
              className="rounded-full bg-white/10 px-4 py-2 text-sm text-white disabled:opacity-30"
            >
              Próxima ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
