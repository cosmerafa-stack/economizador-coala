"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { RevendedorAccountPublic } from "@/lib/types";

export default function GestorPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);
  const gestorToken = useAppStore((s) => s.gestorToken);

  const [usuarios, setUsuarios] = useState<RevendedorAccountPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [maxDevicesDrafts, setMaxDevicesDrafts] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    if (!hasHydrated) return;
    if (role !== "gestor" || !gestorToken) router.replace("/");
  }, [hasHydrated, role, gestorToken, router]);

  function authFetch(input: string, init: RequestInit = {}) {
    return fetch(input, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${gestorToken}`,
      },
    }).then((res) => {
      if (res.status === 401) {
        resetOnboarding();
        router.replace("/");
      }
      return res;
    });
  }

  async function loadUsuarios() {
    setLoading(true);
    try {
      const res = await authFetch("/api/gestor/usuarios");
      const data = await res.json();
      setUsuarios(data.usuarios ?? []);
      const drafts: Record<string, number> = {};
      for (const u of data.usuarios ?? []) drafts[u.id] = u.maxDevices;
      setMaxDevicesDrafts(drafts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard data-fetching effect triggered when role becomes available
    if (role === "gestor" && gestorToken) loadUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, gestorToken]);

  function withPending(id: string, fn: () => Promise<void>) {
    setPendingIds((prev) => new Set(prev).add(id));
    fn().finally(() => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  function handleApprove(id: string) {
    withPending(id, async () => {
      await authFetch(`/api/gestor/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      await loadUsuarios();
    });
  }

  function handleSaveMaxDevices(id: string) {
    withPending(id, async () => {
      await authFetch(`/api/gestor/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setMaxDevices",
          maxDevices: maxDevicesDrafts[id],
        }),
      });
      await loadUsuarios();
    });
  }

  function handleRemove(id: string) {
    withPending(id, async () => {
      await authFetch(`/api/gestor/usuarios/${id}`, { method: "DELETE" });
      await loadUsuarios();
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Área do Gestor" />

      <main className="flex flex-1 flex-col gap-4 px-4 py-5">
        <button
          onClick={() => router.push("/gestor/documentacao")}
          className="animate-fade-slide-up flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left shadow-sm active:scale-[0.98]"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
            📖 Documentação do app
          </span>
          <span className="text-gray-400">›</span>
        </button>

        <div className="animate-fade-slide-up flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Usuários (Revendedores)
          </h2>
          <button
            onClick={loadUsuarios}
            className="text-xs font-semibold text-ml-blue"
          >
            Atualizar
          </button>
        </div>

        {loading ? (
          <p className="text-center text-sm text-gray-400">Carregando...</p>
        ) : usuarios.length === 0 ? (
          <p className="animate-fade-slide-up text-center text-sm text-gray-400">
            Nenhum cadastro de revendedor ainda.
          </p>
        ) : (
          usuarios.map((u, index) => (
            <div
              key={u.id}
              className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {u.nome} {u.sobrenome}
                  </p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                  <p className="text-xs text-gray-400">{u.telefone}</p>
                </div>
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold ${
                    u.approved
                      ? "bg-ml-green/10 text-ml-green"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {u.approved ? "Aprovado" : "Em análise"}
                </span>
              </div>

              {!u.approved && (
                <button
                  onClick={() => handleApprove(u.id)}
                  disabled={pendingIds.has(u.id)}
                  className="mt-3 w-full rounded-xl bg-ml-blue py-2 text-xs font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  Aprovar cadastro
                </button>
              )}

              <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-xs text-gray-500">
                  Dispositivos conectados
                </span>
                <span className="text-xs font-bold text-gray-800">
                  {u.activeDevices} / {u.maxDevices}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-gray-500">
                  Limite de dispositivos simultâneos
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxDevicesDrafts[u.id] ?? u.maxDevices}
                  onChange={(e) =>
                    setMaxDevicesDrafts((prev) => ({
                      ...prev,
                      [u.id]: Number(e.target.value),
                    }))
                  }
                  className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-right text-xs"
                />
                <button
                  onClick={() => handleSaveMaxDevices(u.id)}
                  disabled={pendingIds.has(u.id)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>

              <button
                onClick={() => handleRemove(u.id)}
                disabled={pendingIds.has(u.id)}
                className="mt-3 text-xs font-semibold text-red-500 disabled:opacity-50"
              >
                Excluir cadastro
              </button>
            </div>
          ))
        )}

        <button
          onClick={() => {
            resetOnboarding();
            router.replace("/");
          }}
          className="mt-4 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 active:scale-[0.98]"
        >
          Sair
        </button>
      </main>
    </div>
  );
}
