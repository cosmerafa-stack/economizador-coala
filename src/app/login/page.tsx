"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useFinishRevendedorLogin } from "@/lib/useFinishRevendedorLogin";
import { AppHeader } from "@/components/AppHeader";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function LoginPage() {
  const router = useRouter();
  const ensureDeviceId = useAppStore((s) => s.ensureDeviceId);
  const setRevendedorAuth = useAppStore((s) => s.setRevendedorAuth);
  const hydrateRevendedorData = useAppStore((s) => s.hydrateRevendedorData);
  const finishRevendedorLogin = useFinishRevendedorLogin();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function afterLoginSuccess(data: {
    token: string;
    nome: string;
    mustChangePassword: boolean;
    isTemp: boolean;
    expiresAt: string | null;
    welcomeShown: boolean;
  }) {
    setRevendedorAuth({
      token: data.token,
      nome: data.nome,
      isTemp: data.isTemp,
      expiresAt: data.expiresAt,
      welcomeShown: data.welcomeShown,
    });

    if (data.mustChangePassword) {
      router.replace("/trocar-senha");
      return;
    }

    await hydrateRevendedorData();
    finishRevendedorLogin();
  }

  async function handleSubmit() {
    if (!email.trim() || !senha) {
      setError("Preencha e-mail/usuário e senha.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const deviceId = ensureDeviceId();
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha, deviceId }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.message ?? "Não foi possível entrar.");
        setLoading(false);
        return;
      }

      await afterLoginSuccess(data);
    } catch {
      setError("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    setLoading(true);
    setError(null);
    try {
      const deviceId = ensureDeviceId();
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, deviceId }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.message ?? "Não foi possível entrar com o Google.");
        setLoading(false);
        return;
      }

      await afterLoginSuccess(data);
    } catch {
      setError("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Entrar" showBack />

      <main className="flex flex-1 flex-col justify-center gap-4 px-6 py-10">
        <div className="animate-fade-slide-up mb-2 text-center">
          <span className="text-4xl">📦</span>
          <p className="mt-2 text-sm text-gray-500">
            Entre com sua conta de revendedor
          </p>
        </div>

        <div className="animate-fade-slide-up">
          <GoogleSignInButton onCredential={handleGoogleCredential} />
        </div>

        <div className="animate-fade-slide-up flex items-center gap-3 text-xs text-gray-400">
          <div className="h-px flex-1 bg-gray-200" />
          ou
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="animate-fade-slide-up flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              E-mail ou usuário
            </label>
            <input
              type="text"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-ml-blue focus:ring-2 focus:ring-ml-blue/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
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
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <Link
          href="/cadastro"
          className="animate-fade-slide-up text-center text-sm font-semibold text-ml-blue"
        >
          Não tem conta? Cadastre-se
        </Link>
      </main>
    </div>
  );
}
