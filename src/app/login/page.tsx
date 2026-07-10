"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";

export default function LoginPage() {
  const router = useRouter();
  const ensureDeviceId = useAppStore((s) => s.ensureDeviceId);
  const setRevendedorAuth = useAppStore((s) => s.setRevendedorAuth);
  const setRole = useAppStore((s) => s.setRole);
  const setLocation = useAppStore((s) => s.setLocation);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function finishLoginFlow() {
    setRole("revendedor");

    if (!navigator.geolocation) {
      router.replace("/buscar");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        router.replace("/buscar");
      },
      () => router.replace("/buscar")
    );
  }

  async function handleSubmit() {
    if (!email.trim() || !senha) {
      setError("Preencha e-mail e senha.");
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

      setRevendedorAuth({ token: data.token, nome: data.nome });
      finishLoginFlow();
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

        <div className="animate-fade-slide-up flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              E-mail
            </label>
            <input
              type="email"
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
