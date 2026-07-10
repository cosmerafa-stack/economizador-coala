"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "./store";

// From carrinho/configuracoes, the first press returns to the last search
// results (if any); from resultados (or with no prior search) it goes to
// the blank search screen.
export function useGoToSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const lastSearchQuery = useAppStore((s) => s.lastSearchQuery);

  return () => {
    if (lastSearchQuery && pathname !== "/resultados") {
      router.push(`/resultados?q=${encodeURIComponent(lastSearchQuery)}`);
    } else {
      router.push("/buscar");
    }
  };
}
