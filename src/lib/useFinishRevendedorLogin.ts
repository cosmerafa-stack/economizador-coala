"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "./store";

// Shared by the login page and the forced password-change page — sets the
// role, best-effort grabs the device location, then lands on /buscar.
export function useFinishRevendedorLogin() {
  const router = useRouter();
  const setRole = useAppStore((s) => s.setRole);
  const setLocation = useAppStore((s) => s.setLocation);

  return () => {
    setRole("revendedor");
    if (!navigator.geolocation) {
      router.replace("/buscar");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        router.replace("/buscar");
      },
      () => router.replace("/buscar")
    );
  };
}
