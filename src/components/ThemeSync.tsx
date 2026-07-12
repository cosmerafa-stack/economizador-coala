"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

const THEME_COLOR = {
  light: "#f4f6fb",
  dark: "#16171b",
} as const;

export function ThemeSync() {
  const theme = useAppStore((s) => s.theme);
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    document.documentElement.setAttribute("data-theme", theme);

    // Keeps the Android/iOS status bar in sync with the app's own light/dark
    // toggle — the static <meta> in layout.tsx only covers the very first
    // paint before this runs.
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = THEME_COLOR[theme];
  }, [theme, hasHydrated]);

  return null;
}
