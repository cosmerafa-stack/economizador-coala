"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function ThemeSync() {
  const theme = useAppStore((s) => s.theme);
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme, hasHydrated]);

  return null;
}
