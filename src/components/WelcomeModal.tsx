"use client";

import { useAppStore } from "@/lib/store";

function formatRemaining(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "um período";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "algumas horas";
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days} dia${days === 1 ? "" : "s"}`;
  const hours = Math.max(1, Math.round(ms / (60 * 60 * 1000)));
  return `${hours} hora${hours === 1 ? "" : "s"}`;
}

export function WelcomeModal() {
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const revendedorAuth = useAppStore((s) => s.revendedorAuth);
  const setRevendedorAuth = useAppStore((s) => s.setRevendedorAuth);

  const shouldShow =
    hasHydrated &&
    role === "revendedor" &&
    revendedorAuth?.isTemp === true &&
    revendedorAuth.welcomeShown === false;

  if (!shouldShow || !revendedorAuth) return null;

  function handleClose() {
    if (!revendedorAuth) return;
    fetch("/api/auth/marcar-boas-vindas", {
      method: "POST",
      headers: { Authorization: `Bearer ${revendedorAuth.token}` },
    }).catch(() => {});
    setRevendedorAuth({ ...revendedorAuth, welcomeShown: true });
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="animate-fade-slide-up max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <span className="text-4xl">🚀</span>
        <h2 className="mt-3 text-lg font-bold text-gray-900">
          Bem-vindo ao Economizador Coala!
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Você tem <strong>{formatRemaining(revendedorAuth.expiresAt)}</strong>{" "}
          de teste gratuito. Aproveite para usufruir bastante do nosso
          serviço!
        </p>
        <p className="mt-2 text-xs leading-relaxed text-gray-400">
          Qualquer dúvida, é só nos contatar pelo botão de ajuda (
          <span className="font-bold text-gray-500">?</span>) ou em
          Configurações.
        </p>
        <button
          onClick={handleClose}
          className="mt-5 w-full rounded-2xl bg-ml-blue py-3 text-sm font-bold text-white shadow-sm transition-transform active:scale-[0.98]"
        >
          Começar a usar
        </button>
      </div>
    </div>
  );
}
