"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { TUTORIAL_STEPS } from "@/lib/tutorialSteps";

const PADDING = 8;

export function TutorialOverlay() {
  const tutorialActive = useAppStore((s) => s.tutorialActive);
  const tutorialStep = useAppStore((s) => s.tutorialStep);
  const stopTutorial = useAppStore((s) => s.stopTutorial);
  const nextTutorialStep = useAppStore((s) => s.nextTutorialStep);
  const prevTutorialStep = useAppStore((s) => s.prevTutorialStep);
  const router = useRouter();
  const pathname = usePathname();

  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = TUTORIAL_STEPS[tutorialStep];

  useEffect(() => {
    if (!tutorialActive || !step) return;
    if (pathname !== step.route) {
      router.push(step.route);
      return;
    }

    setRect(null);
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      const el = document.querySelector(`[data-tutorial="${step.id}"]`);
      if (el) {
        setRect(el.getBoundingClientRect());
        clearInterval(interval);
      } else if (attempts > 20) {
        clearInterval(interval);
      }
    }, 150);

    function handleReposition() {
      const el = document.querySelector(`[data-tutorial="${step.id}"]`);
      if (el) setRect(el.getBoundingClientRect());
    }
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [tutorialActive, tutorialStep, pathname, step, router]);

  if (!tutorialActive || !step) return null;

  const isLast = tutorialStep === TUTORIAL_STEPS.length - 1;

  // The tooltip and the pointer always go on opposite sides of the
  // highlighted element, so the pointer never covers the instructions.
  const tooltipBelow = rect ? rect.bottom + PADDING + 140 < window.innerHeight : true;
  const tooltipTop = rect
    ? tooltipBelow
      ? rect.bottom + PADDING + 12
      : Math.max(12, rect.top - PADDING - 170)
    : null;
  const pointerTop = rect
    ? tooltipBelow
      ? Math.max(4, rect.top - PADDING - 40)
      : rect.bottom + PADDING + 4
    : null;
  const pointerEmoji = tooltipBelow ? "👇" : "👆";

  return (
    <div className="fixed inset-0 z-[100]">
      {rect ? (
        <>
          <div
            className="pointer-events-none absolute rounded-xl transition-all duration-200"
            style={{
              top: rect.top - PADDING,
              left: rect.left - PADDING,
              width: rect.width + PADDING * 2,
              height: rect.height + PADDING * 2,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
            }}
          />
          <div
            className="pointer-events-none absolute animate-bounce text-3xl drop-shadow-lg"
            style={{
              top: pointerTop ?? undefined,
              left: rect.left + rect.width / 2 - 16,
            }}
            aria-hidden
          >
            {pointerEmoji}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 bg-black/65" />
      )}

      <div
        className="animate-fade-slide-up absolute mx-4 max-w-sm rounded-2xl bg-white p-4 shadow-2xl"
        style={
          tooltipTop != null && rect
            ? { top: tooltipTop, left: Math.max(12, Math.min(rect.left, window.innerWidth - 300)) }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
        }
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-gray-900">{step.title}</p>
          <button
            onClick={stopTutorial}
            aria-label="Fechar tutorial"
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-sm text-gray-400 hover:bg-gray-100"
          >
            ×
          </button>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">{step.text}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            {tutorialStep + 1} / {TUTORIAL_STEPS.length}
          </span>
          <div className="flex gap-2">
            {tutorialStep > 0 && (
              <button
                onClick={prevTutorialStep}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500"
              >
                Voltar
              </button>
            )}
            <button
              onClick={() => {
                nextTutorialStep(TUTORIAL_STEPS.length - 1);
                if (isLast) router.push("/buscar");
              }}
              className="rounded-lg bg-ml-blue px-3 py-1.5 text-xs font-bold text-white"
            >
              {isLast ? "Concluir" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
