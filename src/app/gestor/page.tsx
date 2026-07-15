"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { RevendedorAccountPublic, TempAccountPublic } from "@/lib/types";

function formatRemaining(remainingMs: number | null): string {
  if (remainingMs == null) return "sem expiração";
  if (remainingMs <= 0) return "expirado";
  const totalHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h restantes`;
  return `${hours}h restantes`;
}

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

  const [tempUsuarios, setTempUsuarios] = useState<TempAccountPublic[]>([]);
  const [tempLoading, setTempLoading] = useState(true);
  const [tempPendingIds, setTempPendingIds] = useState<Set<string>>(new Set());
  const [novoUsername, setNovoUsername] = useState("");
  const [novoTrialDias, setNovoTrialDias] = useState("");
  const [novoContactEmail, setNovoContactEmail] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [criandoTemp, setCriandoTemp] = useState(false);
  const [criarTempError, setCriarTempError] = useState<string | null>(null);
  const [extendDrafts, setExtendDrafts] = useState<Record<string, string>>({});
  const [defaultTrialDias, setDefaultTrialDias] = useState("3");
  const [savingDefaultTrial, setSavingDefaultTrial] = useState(false);
  const [defaultTrialSaved, setDefaultTrialSaved] = useState(false);

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

  async function loadTempUsuarios() {
    setTempLoading(true);
    try {
      const res = await authFetch("/api/gestor/temp-usuarios");
      const data = await res.json();
      setTempUsuarios(data.usuarios ?? []);
    } finally {
      setTempLoading(false);
    }
  }

  async function loadConfig() {
    const res = await authFetch("/api/gestor/config");
    const data = await res.json();
    if (Number.isFinite(data.defaultTrialHours)) {
      setDefaultTrialDias(String(data.defaultTrialHours / 24));
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard data-fetching effect triggered when role becomes available
    if (role === "gestor" && gestorToken) {
      loadUsuarios();
      loadTempUsuarios();
      loadConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, gestorToken]);

  function withTempPending(id: string, fn: () => Promise<void>) {
    setTempPendingIds((prev) => new Set(prev).add(id));
    fn().finally(() => {
      setTempPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  async function handleCriarTemp() {
    if (!novoUsername.trim()) return;
    setCriandoTemp(true);
    setCriarTempError(null);
    try {
      const trialDias = Number(novoTrialDias);
      const body: {
        username: string;
        trialHours?: number;
        contactEmail?: string;
        telefone?: string;
      } = {
        username: novoUsername.trim(),
      };
      if (novoTrialDias.trim() && Number.isFinite(trialDias) && trialDias > 0) {
        body.trialHours = trialDias * 24;
      }
      if (novoContactEmail.trim()) body.contactEmail = novoContactEmail.trim();
      if (novoTelefone.trim()) body.telefone = novoTelefone.trim();
      const res = await authFetch("/api/gestor/temp-usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        setCriarTempError(data.message ?? "Não foi possível criar o usuário.");
        return;
      }
      setNovoUsername("");
      setNovoTrialDias("");
      setNovoContactEmail("");
      setNovoTelefone("");
      await loadTempUsuarios();
    } finally {
      setCriandoTemp(false);
    }
  }

  function handleDisableTemp(id: string) {
    withTempPending(id, async () => {
      await authFetch(`/api/gestor/temp-usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable" }),
      });
      await loadTempUsuarios();
    });
  }

  function handleEnableTemp(id: string) {
    withTempPending(id, async () => {
      await authFetch(`/api/gestor/temp-usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable" }),
      });
      await loadTempUsuarios();
    });
  }

  function handleExtendTemp(id: string) {
    const dias = Number(extendDrafts[id]);
    if (!Number.isFinite(dias) || dias <= 0) return;
    withTempPending(id, async () => {
      await authFetch(`/api/gestor/temp-usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extend", extraHours: dias * 24 }),
      });
      setExtendDrafts((prev) => ({ ...prev, [id]: "" }));
      await loadTempUsuarios();
    });
  }

  async function handleSaveDefaultTrial() {
    const dias = Number(defaultTrialDias);
    if (!Number.isFinite(dias) || dias <= 0) return;
    setSavingDefaultTrial(true);
    try {
      await authFetch("/api/gestor/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultTrialHours: dias * 24 }),
      });
      setDefaultTrialSaved(true);
      setTimeout(() => setDefaultTrialSaved(false), 2000);
    } finally {
      setSavingDefaultTrial(false);
    }
  }

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

        <div className="animate-fade-slide-up mt-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Usuários temporários (demo)
          </h2>
          <button
            onClick={loadTempUsuarios}
            className="text-xs font-semibold text-ml-blue"
          >
            Atualizar
          </button>
        </div>

        <div className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Tempo de teste padrão para novos usuários (dias)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={defaultTrialDias}
              onChange={(e) => setDefaultTrialDias(e.target.value)}
              className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
            <button
              onClick={handleSaveDefaultTrial}
              disabled={savingDefaultTrial}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 ${
                defaultTrialSaved ? "bg-ml-green" : "bg-ml-blue"
              }`}
            >
              {defaultTrialSaved ? "✓ Salvo" : "Salvar"}
            </button>
          </div>
        </div>

        <div className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Criar novo usuário de demonstração
          </label>
          <p className="mb-2 text-xs text-gray-400">
            Não precisa de e-mail pra acessar — ex.: marinalva,
            mercearia.santiago. Senha inicial: <strong>123</strong> (trocada
            no primeiro acesso). E-mail e WhatsApp abaixo são só pra
            referência, opcionais.
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="nome de usuário"
              value={novoUsername}
              onChange={(e) => setNovoUsername(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="e-mail (opcional)"
              value={novoContactEmail}
              onChange={(e) => setNovoContactEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="tel"
              placeholder="WhatsApp com DDD (opcional)"
              value={novoTelefone}
              onChange={(e) => setNovoTelefone(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0.1}
                step={0.5}
                placeholder={`padrão (${defaultTrialDias} dias)`}
                value={novoTrialDias}
                onChange={(e) => setNovoTrialDias(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-2 py-2 text-sm"
              />
              <span className="text-xs text-gray-400">dias</span>
              <button
                onClick={handleCriarTemp}
                disabled={criandoTemp || !novoUsername.trim()}
                className="rounded-lg bg-ml-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                Criar novo
              </button>
            </div>
            {criarTempError && (
              <p className="text-xs text-red-500">{criarTempError}</p>
            )}
          </div>
        </div>

        {tempLoading ? (
          <p className="text-center text-sm text-gray-400">Carregando...</p>
        ) : tempUsuarios.length === 0 ? (
          <p className="animate-fade-slide-up text-center text-sm text-gray-400">
            Nenhum usuário de demonstração criado ainda.
          </p>
        ) : (
          tempUsuarios.map((u, index) => {
            const expired = u.remainingMs != null && u.remainingMs <= 0;
            return (
              <div
                key={u.id}
                className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{u.username}</p>
                    <p className="text-xs text-gray-400">
                      criado em {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                    {(u.contactEmail || u.telefone) && (
                      <p className="mt-0.5 text-xs text-gray-400">
                        {[u.contactEmail, u.telefone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold ${
                      u.disabled
                        ? "bg-gray-100 text-gray-500"
                        : expired
                          ? "bg-red-50 text-red-500"
                          : "bg-ml-green/10 text-ml-green"
                    }`}
                  >
                    {u.disabled ? "Desativado" : formatRemaining(u.remainingMs)}
                  </span>
                </div>

                {u.mustChangePassword && (
                  <p className="mt-1 text-xs text-amber-600">
                    Ainda não trocou a senha inicial.
                  </p>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    placeholder="dias"
                    value={extendDrafts[u.id] ?? ""}
                    onChange={(e) =>
                      setExtendDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))
                    }
                    className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-right text-xs"
                  />
                  <button
                    onClick={() => handleExtendTemp(u.id)}
                    disabled={tempPendingIds.has(u.id) || !extendDrafts[u.id]}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50"
                  >
                    + Aumentar tempo
                  </button>
                </div>

                <div className="mt-2 flex gap-3">
                  {u.disabled ? (
                    <button
                      onClick={() => handleEnableTemp(u.id)}
                      disabled={tempPendingIds.has(u.id)}
                      className="text-xs font-semibold text-ml-blue disabled:opacity-50"
                    >
                      Reativar acesso
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDisableTemp(u.id)}
                      disabled={tempPendingIds.has(u.id)}
                      className="text-xs font-semibold text-red-500 disabled:opacity-50"
                    >
                      Excluir acesso
                    </button>
                  )}
                </div>
              </div>
            );
          })
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
