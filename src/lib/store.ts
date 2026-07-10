"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Coordinates, Nota, UserRole } from "./types";
import { DEFAULT_LOCATION } from "./mockData";

export type Theme = "light" | "dark";

export interface RevendedorAuth {
  token: string;
  nome: string;
}

interface AppState {
  theme: Theme;
  role: UserRole | null;
  location: Coordinates | null;
  defaultProfitPercent: number;
  searchRadiusKm: number;
  cart: CartItem[];
  notas: Nota[];
  hasHydrated: boolean;
  lastSearchQuery: string | null;
  recentSearches: string[];
  gestorPassword: string;
  deviceId: string | null;
  revendedorAuth: RevendedorAuth | null;
  setGestorPassword: (password: string) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setRole: (role: UserRole) => void;
  setLocation: (location: Coordinates) => void;
  setDefaultProfitPercent: (percent: number) => void;
  setSearchRadiusKm: (radiusKm: number) => void;
  setLastSearchQuery: (query: string) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateCartItemQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  addNota: (nota: Nota) => void;
  removeNota: (id: string) => void;
  resetOnboarding: () => void;
  setHasHydrated: (value: boolean) => void;
  ensureDeviceId: () => string;
  setRevendedorAuth: (auth: RevendedorAuth | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "light",
      role: null,
      location: null,
      defaultProfitPercent: 30,
      searchRadiusKm: 25,
      cart: [],
      notas: [],
      hasHydrated: false,
      lastSearchQuery: null,
      recentSearches: [],
      gestorPassword: "ab123456",
      deviceId: null,
      revendedorAuth: null,
      setGestorPassword: (password) => set({ gestorPassword: password }),
      setRole: (role) => set({ role }),
      setLocation: (location) => set({ location }),
      setDefaultProfitPercent: (percent) =>
        set({ defaultProfitPercent: percent }),
      setSearchRadiusKm: (radiusKm) => set({ searchRadiusKm: radiusKm }),
      setLastSearchQuery: (query) => set({ lastSearchQuery: query }),
      addRecentSearch: (query) =>
        set((state) => ({
          recentSearches: [
            query,
            ...state.recentSearches.filter(
              (q) => q.toLowerCase() !== query.toLowerCase()
            ),
          ].slice(0, 8),
        })),
      clearRecentSearches: () => set({ recentSearches: [] }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      addToCart: (item) => set((state) => ({ cart: [...state.cart, item] })),
      removeFromCart: (id) =>
        set((state) => ({ cart: state.cart.filter((i) => i.id !== id) })),
      updateCartItemQuantity: (id, quantity) =>
        set((state) => ({
          cart: state.cart.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        })),
      clearCart: () => set({ cart: [] }),
      addNota: (nota) => set((state) => ({ notas: [nota, ...state.notas] })),
      removeNota: (id) =>
        set((state) => ({ notas: state.notas.filter((n) => n.id !== id) })),
      resetOnboarding: () => set({ role: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      ensureDeviceId: () => {
        const existing = get().deviceId;
        if (existing) return existing;
        const created =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        set({ deviceId: created });
        return created;
      },
      setRevendedorAuth: (auth) => set({ revendedorAuth: auth }),
    }),
    {
      name: "solucro-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function getEffectiveLocation(location: Coordinates | null): Coordinates {
  return location ?? DEFAULT_LOCATION;
}
