"use client";

import { useAppStore } from "@/lib/store";
import { HelpModal } from "@/components/HelpModal";

// Auto-shown once, on the very first login of any revendedor (temp or
// permanent) — after that, the same "quer ver o tutorial?" question is only
// reachable via the "?" help button. Waits for the welcome modal (temp
// accounts only) to be dismissed first, so they don't stack.
export function AutoTutorialPrompt() {
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const revendedorAuth = useAppStore((s) => s.revendedorAuth);
  const setRevendedorAuth = useAppStore((s) => s.setRevendedorAuth);

  const waitingOnWelcomeModal = revendedorAuth?.isTemp === true && revendedorAuth.welcomeShown === false;

  const shouldShow =
    hasHydrated &&
    role === "revendedor" &&
    !!revendedorAuth &&
    revendedorAuth.tutorialPromptShown === false &&
    !waitingOnWelcomeModal;

  if (!shouldShow || !revendedorAuth) return null;

  function handleClose() {
    if (!revendedorAuth) return;
    fetch("/api/auth/marcar-tutorial-visto", {
      method: "POST",
      headers: { Authorization: `Bearer ${revendedorAuth.token}` },
    }).catch(() => {});
    setRevendedorAuth({ ...revendedorAuth, tutorialPromptShown: true });
  }

  return <HelpModal onClose={handleClose} />;
}
