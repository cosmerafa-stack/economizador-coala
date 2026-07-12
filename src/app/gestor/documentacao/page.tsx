"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";

interface Secao {
  titulo: string;
  icone: string;
  conteudo: React.ReactNode;
}

function Bloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">
        {titulo}
      </p>
      <div className="text-sm leading-relaxed text-gray-700">{children}</div>
    </div>
  );
}

function Codigo({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px] text-gray-800">
      {children}
    </code>
  );
}

export default function DocumentacaoGestorPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const gestorToken = useAppStore((s) => s.gestorToken);
  const [openId, setOpenId] = useState<string | null>("visao-geral");

  useEffect(() => {
    if (!hasHydrated) return;
    if (role !== "gestor" || !gestorToken) router.replace("/");
  }, [hasHydrated, role, gestorToken, router]);

  const secoes: (Secao & { id: string })[] = [
    {
      id: "visao-geral",
      titulo: "Visão geral",
      icone: "🧭",
      conteudo: (
        <>
          <Bloco titulo="O que é">
            Economizador Coala compara preços de notas fiscais na Bahia
            (Preço da Hora BA), para dois públicos: quem quer economizar na
            compra (Consumidor) e quem compra para revender com lucro
            (Revendedor).
          </Bloco>
          <Bloco titulo="Três papéis">
            <b>Consumidor</b> — busca e compara preços, sem informações de
            revenda.
            <br />
            <b>Revendedor</b> — cadastro com aprovação, carrinho com % de
            lucro, notas fiscais organizadas, rota de compra e acesso à área
            Beta.
            <br />
            <b>Gestor</b> — esta área: aprova cadastros, controla limite de
            dispositivos por conta e mantém esta documentação.
          </Bloco>
        </>
      ),
    },
    {
      id: "arquitetura",
      titulo: "Arquitetura",
      icone: "🏗️",
      conteudo: (
        <>
          <Bloco titulo="Stack">
            Next.js 16 (App Router) → build de produção com webpack (o
            Turbopack tem incompatibilidade conhecida com o adaptador
            OpenNext) → deploy em Cloudflare Workers via{" "}
            <Codigo>@opennextjs/cloudflare</Codigo>.
          </Bloco>
          <Bloco titulo="Banco de dados">
            Neon Postgres (região São Paulo), acessado via{" "}
            <Codigo>@neondatabase/serverless</Codigo>. Tabelas principais:{" "}
            <Codigo>revendedor_accounts</Codigo>,{" "}
            <Codigo>revendedor_sessions</Codigo>,{" "}
            <Codigo>price_history</Codigo>, <Codigo>price_alerts</Codigo>,{" "}
            <Codigo>community_prices</Codigo> e{" "}
            <Codigo>community_price_confirmations</Codigo>.
          </Bloco>
          <Bloco titulo="Estado do app">
            Zustand com <Codigo>persist</Codigo> em localStorage (chave{" "}
            <Codigo>solucro-storage</Codigo>). Trocar de papel (ou sair) zera
            carrinho, notas e buscas recentes — antes ficavam vazando de um
            papel para o outro.
          </Bloco>
          <Bloco titulo="IA nas notas fiscais">
            Fotos/PDF de nota são lidos pelo Gemini (
            <Codigo>gemini-3-flash-preview</Codigo>) para extrair
            emitente, produtos e valores automaticamente.
          </Bloco>
        </>
      ),
    },
    {
      id: "seguranca",
      titulo: "Segurança da Área do Gestor",
      icone: "🔒",
      conteudo: (
        <>
          <Bloco titulo="Como funciona hoje">
            Acesso pela tela inicial: arrastar o ícone do foguete até o
            ícone de tema, depois digitar a senha. A senha é verificada no
            servidor (<Codigo>GESTOR_PASSWORD</Codigo>), que devolve um token
            assinado (HMAC, expira em 8h). Esse token vai como{" "}
            <Codigo>Authorization: Bearer</Codigo> em toda chamada às rotas{" "}
            <Codigo>/api/gestor/*</Codigo> — antes essas rotas não exigiam
            nada além da barreira visual do app.
          </Bloco>
          <Bloco titulo="Variáveis necessárias">
            <Codigo>GESTOR_PASSWORD</Codigo> — senha de acesso.
            <br />
            <Codigo>GESTOR_TOKEN_SECRET</Codigo> — segredo usado para assinar
            o token. Troque os dois valores padrão antes de expor o app a
            mais gente.
          </Bloco>
        </>
      ),
    },
    {
      id: "beta",
      titulo: "Área Beta (8 funções)",
      icone: "🧪",
      conteudo: (
        <>
          <Bloco titulo="O que é">
            Recursos experimentais visíveis só para Revendedor, dentro de{" "}
            <Codigo>/beta</Codigo>. Todos dependem do histórico de preços que
            o próprio uso do app vai alimentando.
          </Bloco>
          <Bloco titulo="As 8 funções">
            🔔 <b>Alerta de preço-alvo</b> — avisa quando um produto atinge o
            preço desejado (checado quando a tela abre, e também via
            varredura externa — ver seção de Alertas abaixo).
            <br />
            🧮 <b>Otimizador de lista</b> — compara comprar tudo numa loja só
            vs. cada item na loja mais barata.
            <br />
            📈 <b>Histórico de preço</b> — série histórica de um produto,
            com outliers filtrados.
            <br />
            🎯 <b>Radar de oportunidade</b> — produtos com maior diferença
            entre preço típico e mais barato recente, entre todos os
            usuários.
            <br />
            🤝 <b>Preço colaborativo</b> — usuários reportam preços vistos;
            outro usuário pode confirmar, gerando o selo “verificado”.
            <br />
            🧾 <b>Comparar suas notas</b> — releitura dos itens de uma nota
            salva contra o preço de hoje.
            <br />
            💰 <b>Relatório de economia</b> — resumo do lucro potencial do
            carrinho atual e do total já registrado em notas.
            <br />
            ⏳ <b>Prazo de troca/garantia</b> — calcula prazo restante a
            partir da data de emissão da nota.
          </Bloco>
        </>
      ),
    },
    {
      id: "alertas-cron",
      titulo: "Alertas: verificação em segundo plano",
      icone: "⏰",
      conteudo: (
        <>
          <Bloco titulo="Como funciona hoje">
            Sem notificação push ainda — mas o alerta é checado (1) sempre
            que o usuário abre a tela de Alertas, (2) sob demanda no botão
            &ldquo;Verificar agora&rdquo;, e (3) em segundo plano, no
            intervalo que o próprio usuário define em Ajustes (padrão 15
            min, entre 5 min e 24h).
          </Bloco>
          <Bloco titulo="Por que precisa de um workflow do GitHub">
            O Cloudflare Workers deste projeto (via OpenNext) não tem um
            cron trigger próprio configurado. Em vez disso, um workflow do
            GitHub Actions (
            <Codigo>.github/workflows/alertas-cron.yml</Codigo>) bate na
            rota <Codigo>POST /api/beta/alertas/verificar</Codigo> a cada 5
            min — esse é só o &ldquo;batimento&rdquo;; o intervalo real de
            cada dispositivo é decidido no servidor (
            <Codigo>last_checked_at</Codigo> + intervalo configurado), não
            pelo workflow.
          </Bloco>
          <Bloco titulo="Passos manuais necessários (únicos, uma vez só)">
            1. No repositório do GitHub, criar o secret{" "}
            <Codigo>ALERTAS_CRON_SECRET</Codigo> (Settings → Secrets and
            variables → Actions) com o mesmo valor da variável de ambiente
            de produção.
            <br />
            2. No Cloudflare Workers, garantir que{" "}
            <Codigo>ALERTAS_CRON_SECRET</Codigo> e{" "}
            <Codigo>DATABASE_URL</Codigo> estão configurados como secrets
            de produção (<Codigo>wrangler secret put</Codigo>).
            <br />
            Sem isso, o workflow roda mas recebe 401 e nada é verificado.
          </Bloco>
        </>
      ),
    },
    {
      id: "limitacoes",
      titulo: "Limitações conhecidas",
      icone: "⚠️",
      conteudo: (
        <>
          <Bloco titulo="Qualidade dos dados">
            O histórico de preço é alimentado por busca com casamento por
            substring — outliers grosseiros são filtrados (fora de 4× a
            mediana), mas erros mais sutis ainda podem passar.
          </Bloco>
          <Bloco titulo="Re-busca por nome salvo">
            Otimizador e Comparar notas agora tentam um termo mais curto
            quando a busca pelo nome completo do produto não encontra nada,
            mas a correspondência ainda não é garantida para todo produto.
          </Bloco>
          <Bloco titulo="Sessão do Revendedor">
            Limite de dispositivos simultâneos é controlado por “sessão
            ativa nos últimos 15 min” — não é um logout forçado imediato.
          </Bloco>
        </>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="📖 Documentação" showBack />

      <main className="flex flex-1 flex-col gap-3 px-4 py-5">
        <p className="animate-fade-slide-up text-xs text-gray-400">
          Referência técnica do app para quem administra a Área do Gestor —
          arquitetura, segurança e limitações conhecidas.
        </p>

        {secoes.map((secao) => {
          const open = openId === secao.id;
          return (
            <div
              key={secao.id}
              className="animate-fade-slide-up overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <button
                onClick={() => setOpenId(open ? null : secao.id)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <span>{secao.icone}</span>
                  {secao.titulo}
                </span>
                <span
                  className={`text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
                >
                  ›
                </span>
              </button>
              {open && (
                <div className="border-t border-gray-100 px-4 py-3">
                  {secao.conteudo}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
