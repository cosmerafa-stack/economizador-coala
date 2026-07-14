"use client";

import { useEffect } from "react";
import { useAppStore, FONT_SIZE_SCALE } from "@/lib/store";

export function FontSizeSync() {
  const fontSizeLevel = useAppStore((s) => s.fontSizeLevel);
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    document.documentElement.style.fontSize = `${FONT_SIZE_SCALE[fontSizeLevel] * 100}%`;
  }, [fontSizeLevel, hasHydrated]);

  return null;
}
