"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { TUTORIAL_STEPS } from "@/lib/tutorialSteps";
import { buildWhatsAppLink } from "@/lib/whatsapp";

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const router = useRouter();
  const startTutorial = useAppStore((s) => s.startTutorial);
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
  const supportLink = supportPhone
    ? buildWhatsAppLink(supportPhone, "Olá! Preciso de ajuda com o Economizador Coala.")
    : null;

  function handleStartTutorial() {
    startTutorial();
    router.push(TUTORIAL_STEPS[0].route);
    onClose();
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        className="animate-fade-slide-up w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-3xl">🙋</p>
        <h2 className="mt-2 text-center text-base font-bold text-gray-900">
          Precisa de ajuda?
        </h2>

        {supportLink && (
          <a
            href={supportLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-ml-green/10 py-2.5 text-sm font-semibold text-ml-green"
          >
            💬 Falar com o suporte no WhatsApp
          </a>
        )}

        <div className="mt-4 rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-sm text-gray-700">
            Deseja acessar um tutorial explicativo da ferramenta?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleStartTutorial}
              className="flex-1 rounded-xl bg-ml-blue py-2 text-sm font-bold text-white"
            >
              Sim
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-600"
            >
              Agora não
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-xs font-semibold text-gray-400"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
