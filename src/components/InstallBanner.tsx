"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallBanner() {
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const installBannerDismissed = useAppStore((s) => s.installBannerDismissed);
  const setInstallBannerDismissed = useAppStore((s) => s.setInstallBannerDismissed);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    setIsIOS(isIOSDevice());
    setIsStandalone(isStandaloneDisplay());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (!hasHydrated || !role || installBannerDismissed || isStandalone) return null;
  if (!deferredPrompt && !isIOS) return null;

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setInstallBannerDismissed(true);
    } else if (isIOS) {
      setShowIOSSteps(true);
    }
  }

  return (
    <div className="animate-fade-slide-up mx-4 mt-3 rounded-2xl border border-ml-blue/20 bg-ml-blue/5 p-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          📲
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">Instale o app</p>
          <p className="mt-0.5 text-xs leading-snug text-gray-500">
            Mais rápido, funciona melhor e fica no seu atalho da tela inicial.
          </p>

          {showIOSSteps ? (
            <p className="mt-2 text-xs leading-relaxed text-gray-600">
              Toque em <strong>Compartilhar</strong>{" "}
              <span aria-hidden>⬆️</span> e depois em{" "}
              <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
            </p>
          ) : (
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleInstallClick}
                className="rounded-xl bg-ml-blue px-3 py-1.5 text-xs font-bold text-white shadow-sm active:scale-95"
              >
                Instalar
              </button>
              <button
                onClick={() => setInstallBannerDismissed(true)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-500 active:scale-95"
              >
                Agora não
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setInstallBannerDismissed(true)}
          aria-label="Fechar"
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-sm text-gray-400 hover:bg-gray-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}
