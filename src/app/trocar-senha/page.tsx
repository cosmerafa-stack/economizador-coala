"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useFinishRevendedorLogin } from "@/lib/useFinishRevendedorLogin";
import { AppHeader } from "@/components/AppHeader";

export default function TrocarSenhaPage() {
  const router = useRouter();
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const revendedorAuth = useAppStore((s) => s.revendedorAuth);
  const hydrateRevendedorData = useAppStore((s) => s.hydrateRevendedorData);
  const finishRevendedorLogin = useFinishRevendedorLogin();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!revendedorAuth) router.replace("/login");
  }, [hasHydrated, revendedorAuth, router]);

  async function handleSubmit() {
    if (!revendedorAuth) return;
    if (novaSenha.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/trocar-senha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${revendedorAuth.token}`,
        },
        body: JSON.stringify({ novaSenha }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.message ?? "Não foi possível trocar a senha.");
        setLoading(false);
        return;
      }

      await hydrateRevendedorData();
      finishRevendedorLogin();
    } catch {
      setError("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Criar nova senha" />

      <main className="flex flex-1 flex-col justify-center gap-4 px-6 py-10">
        <div className="animate-fade-slide-up mb-2 text-center">
          <span className="text-4xl">🔒</span>
          <p className="mt-2 text-sm text-gray-500">
            Por segurança, crie uma nova senha antes de continuar.
          </p>
        </div>

        <div className="animate-fade-slide-up flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Nova senha
            </label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-ml-blue focus:ring-2 focus:ring-ml-blue/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-ml-blue focus:ring-2 focus:ring-ml-blue/20"
            />
          </div>
        </div>

        {error && (
          <p className="animate-fade-slide-up text-center text-xs text-red-500">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="animate-fade-slide-up rounded-2xl bg-ml-blue py-3 text-sm font-bold text-white shadow-sm transition-transform active:scale-[0.98] active:bg-ml-blue-dark disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Salvar e continuar"}
        </button>
      </main>
    </div>
  );
}
