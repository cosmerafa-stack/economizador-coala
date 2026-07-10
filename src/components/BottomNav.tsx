"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useGoToSearch } from "@/lib/useGoToSearch";

const icons = {
  buscar: "🔍",
  carrinho: "🛒",
  notas: "🧾",
  config: "⚙️",
};

export function BottomNav() {
  const pathname = usePathname();
  const role = useAppStore((s) => s.role);
  const cartCount = useAppStore((s) => s.cart.length);
  const goToSearch = useGoToSearch();

  if (!role) return null;

  const active = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const itemClass = (href: string) =>
    `app-navitem font-display ${
      active(href)
        ? "app-navitem-active text-ml-blue font-semibold"
        : "text-gray-400 hover:text-gray-600"
    }`;
  const iconClass = (href: string) =>
    `text-lg leading-none transition-transform duration-200 ${
      active(href) ? "scale-110" : "scale-100"
    }`;

  return (
    <div className="app-bottomnav-wrap">
      <nav className="app-bottomnav">
        <button onClick={goToSearch} className={itemClass("/buscar")}>
          <span className={iconClass("/buscar")}>{icons.buscar}</span>
          Buscar
        </button>

        {(role === "revendedor" || role === "consumidor") && (
          <Link href="/carrinho" className={itemClass("/carrinho")}>
            <span className={iconClass("/carrinho")}>{icons.carrinho}</span>
            Carrinho
            {cartCount > 0 && (
              <span className="absolute right-3 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ml-green px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        )}

        {role === "revendedor" && (
          <Link href="/notas" className={itemClass("/notas")}>
            <span className={iconClass("/notas")}>{icons.notas}</span>
            Notas
          </Link>
        )}

        {(role === "revendedor" || role === "consumidor") && (
          <Link href="/configuracoes" className={itemClass("/configuracoes")}>
            <span className={iconClass("/configuracoes")}>{icons.config}</span>
            Ajustes
          </Link>
        )}
      </nav>
    </div>
  );
}
