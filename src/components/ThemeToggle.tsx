"use client";

import { useAppStore } from "@/lib/store";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  return (
    <button
      onClick={toggleTheme}
      aria-label={
        theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"
      }
      className={`theme-toggle ${className}`}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
