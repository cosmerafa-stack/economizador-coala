"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000;

export function SessionHeartbeat() {
  const role = useAppStore((s) => s.role);
  const token = useAppStore((s) => s.revendedorAuth?.token);

  useEffect(() => {
    if (role !== "revendedor" || !token) return;

    const ping = () => {
      fetch("/api/auth/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    };

    ping();
    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [role, token]);

  return null;
}
