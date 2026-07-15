"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { HelpModal } from "@/components/HelpModal";

export function HelpButton() {
  const role = useAppStore((s) => s.role);
  const tutorialActive = useAppStore((s) => s.tutorialActive);
  const [open, setOpen] = useState(false);

  if (role !== "revendedor" || tutorialActive) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ajuda"
        className="fixed z-30 flex h-11 w-11 items-center justify-center rounded-full bg-ml-blue text-lg font-bold text-white shadow-lg transition-transform active:scale-90"
        style={{
          right: "1rem",
          bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        ?
      </button>
      {open && <HelpModal onClose={() => setOpen(false)} />}
    </>
  );
}
