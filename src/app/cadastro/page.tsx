"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function CadastroPage() {
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!nome.trim() || !sobrenome.trim() || !telefone.trim() || !email.trim() || !senha) {
      setError("Preencha todos os campos.");
      return;
    }
    if (senha.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmSenha) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, sobrenome, telefone, email, senha }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.message ?? "Não foi possível concluir o cadastro.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title="Cadastro" showBack />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <span className="text-4xl">✅</span>
          <h2 className="text-lg font-bold text-gray-900">
            Cadastro enviado!
          </h2>
          <p className="max-w-xs text-sm text-gray-500">
            Seu cadastro está em análise. Assim que for aprovado, você poderá
            entrar normalmente.
          </p>
          <Link
            href="/login"
            className="rounded-2xl bg-ml-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
          >
            Ir para o login
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Cadastro de Revendedor" showBack />

      <main className="flex flex-1 flex-col gap-4 px-6 py-8">
        <div className="animate-fade-slide-up flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Nome
              </label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-ml-blue focus:ring-2 focus:ring-ml-blue/20"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Sobrenome
              </label>
              <input
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-ml-blue focus:ring-2 focus:ring-ml-blue/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Telefone / WhatsApp
            </label>
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(71) 90000-0000"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-ml-blue focus:ring-2 focus:ring-ml-blue/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-ml-blue focus:ring-2 focus:ring-ml-blue/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirmSenha}
              onChange={(e) => setConfirmSenha(e.target.value)}
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
          {loading ? "Enviando..." : "Cadastrar"}
        </button>

        <Link
          href="/login"
          className="animate-fade-slide-up text-center text-sm font-semibold text-ml-blue"
        >
          Já tem conta? Entrar
        </Link>
      </main>
    </div>
  );
}
