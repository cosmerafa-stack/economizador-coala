"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { UserRole } from "@/lib/types";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function OnboardingPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const setRole = useAppStore((s) => s.setRole);
  const setLocation = useAppStore((s) => s.setLocation);
  const gestorPassword = useAppStore((s) => s.gestorPassword);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<UserRole | null>(null);

  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [gestorMode, setGestorMode] = useState(false);
  const [gestorInput, setGestorInput] = useState("");
  const [gestorError, setGestorError] = useState<string | null>(null);
  const draggingRef = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!hasHydrated || !role) return;
    router.replace(role === "gestor" ? "/gestor" : "/buscar");
  }, [hasHydrated, role, router]);

  function chooseRole(selectedRole: UserRole) {
    setChosen(selectedRole);
    setLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocalização não suportada. Usando Salvador como referência.");
      setRole(selectedRole);
      setLocating(false);
      router.replace("/buscar");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setRole(selectedRole);
        setLocating(false);
        router.replace("/buscar");
      },
      () => {
        setLocationError("Não foi possível obter sua localização. Usando Salvador como referência.");
        setRole(selectedRole);
        setLocating(false);
        router.replace("/buscar");
      }
    );
  }

  function handlePointerDown(e: React.PointerEvent) {
    draggingRef.current = true;
    setDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    setDragPos({
      x: e.clientX - startPos.current.x,
      y: e.clientY - startPos.current.y,
    });
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);

    const target = document.querySelector(".theme-toggle");
    if (target) {
      const rect = target.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        setGestorMode(true);
        setGestorError(null);
        setGestorInput("");
      }
    }
    setDragPos({ x: 0, y: 0 });
  }

  function handleGestorSubmit() {
    if (gestorInput === gestorPassword) {
      setRole("gestor");
      router.replace("/gestor");
    } else {
      setGestorError("Senha incorreta.");
    }
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <ThemeToggle className="absolute right-4 top-4 z-20" />
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            transform: `translate(${dragPos.x}px, ${dragPos.y}px)`,
            transition: dragging ? "none" : "transform 0.3s ease",
            touchAction: "none",
          }}
          className="cursor-grab active:cursor-grabbing"
        >
          <div
            className="animate-logo-pop animate-soft-pulse relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-4xl shadow-lg"
            style={{ animationDelay: "0.05s" }}
          >
            <span className="flame-trail" aria-hidden />
            🚀
          </div>
        </div>

        <h1
          className="font-display animate-fade-slide-up text-center text-3xl font-extrabold tracking-tight text-gray-900"
          style={{ animationDelay: "0.15s" }}
        >
          Economizador Coala
        </h1>
        <p
          className="animate-fade-slide-up mt-2 max-w-xs text-center text-sm text-gray-500"
          style={{ animationDelay: "0.25s" }}
        >
          Compare preços de notas fiscais na Bahia e nunca mais pague caro
        </p>

        {gestorMode ? (
          <div className="animate-fade-slide-up mt-8 flex w-full max-w-sm flex-col gap-3">
            <p className="text-center text-sm font-semibold uppercase tracking-wide text-gray-400">
              Área do Gestor
            </p>
            <input
              type="password"
              value={gestorInput}
              onChange={(e) => setGestorInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGestorSubmit()}
              placeholder="Senha do gestor"
              autoFocus
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-center text-sm shadow-sm outline-none focus:border-ml-blue focus:ring-2 focus:ring-ml-blue/20"
            />
            {gestorError && (
              <p className="text-center text-xs text-red-500">{gestorError}</p>
            )}
            <button
              onClick={handleGestorSubmit}
              className="rounded-2xl bg-ml-blue py-3 text-sm font-bold text-white shadow-sm transition-transform active:scale-[0.98] active:bg-ml-blue-dark"
            >
              Entrar
            </button>
            <button
              onClick={() => setGestorMode(false)}
              className="text-center text-xs font-semibold text-gray-400"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <>
            <p
              className="animate-fade-slide-up mb-3 mt-8 text-center text-sm font-semibold uppercase tracking-wide text-gray-400"
              style={{ animationDelay: "0.35s" }}
            >
              Você é:
            </p>

            <div className="flex w-full max-w-sm flex-col gap-3">
              <button
                disabled={locating}
                onClick={() => chooseRole("consumidor")}
                className={`animate-fade-slide-up group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] disabled:opacity-60 ${
                  chosen === "consumidor" ? "ring-2 ring-ml-blue" : ""
                }`}
                style={{ animationDelay: "0.45s" }}
              >
                <span className="text-3xl transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
                  🛍️
                </span>
                <span>
                  <span className="block text-base font-bold text-gray-900">
                    Consumidor
                  </span>
                  <span className="block text-sm text-gray-500">
                    Quero pesquisar preços antes de comprar
                  </span>
                </span>
              </button>

              <button
                disabled={locating}
                onClick={() => router.push("/login")}
                className={`animate-fade-slide-up group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] disabled:opacity-60 ${
                  chosen === "revendedor" ? "ring-2 ring-ml-blue" : ""
                }`}
                style={{ animationDelay: "0.55s" }}
              >
                <span className="text-3xl transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6">
                  📦
                </span>
                <span>
                  <span className="block text-base font-bold text-gray-900">
                    Revendedor
                  </span>
                  <span className="block text-sm text-gray-500">
                    Quero comprar barato e revender com lucro
                  </span>
                </span>
              </button>
            </div>

            <div className="mt-5 h-5">
              {locating && (
                <p className="animate-fade-slide-up flex items-center justify-center gap-2 text-center text-sm text-gray-500">
                  <span className="h-2 w-2 animate-ping rounded-full bg-ml-blue" />
                  Obtendo sua localização...
                </p>
              )}
              {locationError && (
                <p className="text-center text-sm text-amber-600">{locationError}</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
