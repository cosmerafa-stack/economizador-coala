"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function NotificationSettings() {
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useAppStore((s) => s.setNotificationsEnabled);
  const [permission, setPermission] = useState<PermissionState>("unsupported");
  const [confirmingDisable, setConfirmingDisable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  if (permission === "unsupported") {
    return (
      <div
        className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        style={{ animationDelay: "0.28s" }}
      >
        <p className="text-sm font-medium text-gray-700">Notificações</p>
        <p className="mt-1 text-xs text-gray-400">
          Este navegador não suporta notificações.
        </p>
      </div>
    );
  }

  async function handleAtivar() {
    if (permission === "denied") return;
    if (permission === "granted") {
      setNotificationsEnabled(true);
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
    if (result === "granted") setNotificationsEnabled(true);
  }

  return (
    <div
      className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
      style={{ animationDelay: "0.28s" }}
    >
      <p className="text-sm font-medium text-gray-700">Notificações</p>

      {permission === "denied" && (
        <p className="mt-1 text-xs text-amber-600">
          Notificações bloqueadas no navegador. Habilite manualmente nas
          configurações do site para ativar.
        </p>
      )}

      {permission === "granted" && notificationsEnabled && !confirmingDisable && (
        <>
          <p className="mt-1 text-xs text-ml-green">✓ Notificações já ativadas.</p>
          <button
            onClick={() => setConfirmingDisable(true)}
            className="mt-2 text-xs font-semibold text-gray-400 underline"
          >
            Desativar
          </button>
        </>
      )}

      {permission === "granted" && notificationsEnabled && confirmingDisable && (
        <div className="mt-2 rounded-xl bg-amber-50 p-3">
          <p className="text-xs text-amber-700">
            Ao desativar, você deixa de receber avisos quando um alerta de
            preço-alvo é atingido e outras novidades importantes do app.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                setNotificationsEnabled(false);
                setConfirmingDisable(false);
              }}
              className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white"
            >
              Desativar mesmo assim
            </button>
            <button
              onClick={() => setConfirmingDisable(false)}
              className="rounded-lg px-3 py-1 text-xs font-semibold text-gray-500"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!(permission === "granted" && notificationsEnabled) && permission !== "denied" && (
        <>
          <p className="mt-1 text-xs text-gray-400">
            Receba avisos quando um alerta de preço-alvo for atingido.
          </p>
          <button
            onClick={handleAtivar}
            className="mt-2 rounded-xl bg-ml-blue px-3 py-1.5 text-xs font-bold text-white shadow-sm active:scale-95"
          >
            Ativar notificações
          </button>
        </>
      )}
    </div>
  );
}
