"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

interface BetaFeature {
  href: string;
  icon: string;
  title: string;
  description: string;
}

const FEATURES: BetaFeature[] = [
  {
    href: "/beta/alertas",
    icon: "🔔",
    title: "Alerta de preço-alvo",
    description:
      "Diga o preço que você quer pagar por um produto e o app avisa quando encontrar.",
  },
  {
    href: "/beta/otimizador",
    icon: "🧮",
    title: "Otimizador de lista",
    description:
      "Compara comprar tudo numa loja só x dividir entre lojas próximas — qual sai mais barato.",
  },
  {
    href: "/beta/historico",
    icon: "📈",
    title: "Histórico de preço",
    description: "Veja como o preço de um produto variou ao longo do tempo.",
  },
  {
    href: "/beta/radar",
    icon: "🎯",
    title: "Radar de oportunidade",
    description:
      "Produtos com maior diferença entre o preço mais barato e o preço típico encontrados recentemente.",
  },
  {
    href: "/beta/colaborativo",
    icon: "🤝",
    title: "Preço colaborativo",
    description: "Reporte um preço que você viu e veja o que outras pessoas reportaram.",
  },
  {
    href: "/beta/comparar-notas",
    icon: "🧾",
    title: "Comparar suas notas",
    description:
      "Veja se os produtos das suas notas salvas estão mais baratos em outro lugar hoje.",
  },
  {
    href: "/beta/relatorio",
    icon: "💰",
    title: "Relatório de economia",
    description: "Resumo do que você economizou e lucrou até agora no app.",
  },
  {
    href: "/beta/garantia",
    icon: "⏳",
    title: "Prazo de troca/garantia",
    description: "Contagem regressiva do prazo de troca das suas notas salvas.",
  },
];

export default function BetaHubPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) router.replace("/");
    else if (role !== "revendedor") router.replace("/buscar");
  }, [hasHydrated, role, router]);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Beta (experimental)" showBack dataTutorial="beta-nav" />

      <main className="flex flex-1 flex-col gap-3 px-4 py-5">
        <div
          className="animate-fade-slide-up rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700"
          style={{ animationDelay: "0.02s" }}
        >
          🧪 Área experimental. Essas funções são novas, podem mudar ou ter
          limitações — mas já funcionam de verdade.
        </div>

        {FEATURES.map((feature, index) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="animate-fade-slide-up flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
            style={{ animationDelay: `${Math.min(0.05 + index * 0.05, 0.4)}s` }}
          >
            <span className="text-2xl">{feature.icon}</span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-gray-900">
                {feature.title}
              </span>
              <span className="block text-xs leading-snug text-gray-500">
                {feature.description}
              </span>
            </span>
            <span className="mt-1 text-gray-300">›</span>
          </Link>
        ))}
      </main>

      <BottomNav />
    </div>
  );
}
