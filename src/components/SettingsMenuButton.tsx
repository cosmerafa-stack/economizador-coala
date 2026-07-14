"use client";

import { useRouter } from "next/navigation";

export function SettingsMenuButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/configuracoes")}
      aria-label="Configurações"
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-lg leading-none text-gray-500 transition-colors hover:bg-gray-100 active:scale-90"
    >
      ⋮
    </button>
  );
}
