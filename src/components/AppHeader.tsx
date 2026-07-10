"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
}

export function AppHeader({ title = "Economizador Coala", showBack = false }: AppHeaderProps) {
  const router = useRouter();
  const isBrand = title === "Economizador Coala";

  return (
    <header className="app-header animate-fade-in px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        {showBack && (
          <button
            onClick={() => router.back()}
            aria-label="Voltar"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xl leading-none text-gray-500 transition-colors hover:bg-gray-100 active:scale-90"
          >
            ‹
          </button>
        )}
        {isBrand && (
          <span className="app-header-mark">
            <span className="flame-trail-sm" aria-hidden />
            🚀
          </span>
        )}
        <h1
          className={`font-display flex-1 truncate font-bold tracking-tight ${
            isBrand
              ? "bg-gradient-to-r from-ml-blue to-ml-blue-dark bg-clip-text text-[1.05rem] text-transparent"
              : "text-base text-gray-900"
          }`}
        >
          {title}
        </h1>
        <ThemeToggle />
      </div>
    </header>
  );
}
