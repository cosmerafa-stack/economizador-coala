"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Coordinates, Nota, PriceResult, UserRole } from "./types";
import { DEFAULT_LOCATION } from "./mockData";
import {
  pullCart,
  pushCartSnapshot,
  pullNotas,
  pushNota,
  deleteNotaRemote,
  patchNotaProdutoRemote,
  pullSettings,
  pushSettings,
} from "./revendedorSync";

export type Theme = "light" | "dark";

export interface RevendedorAuth {
  token: string;
  nome: string;
}

export interface CachedResultados {
  signature: string;
  results: PriceResult[];
  source: string;
  cachedAt: string | null;
  fetchedAt: number;
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
  gestorToken: string | null;
  deviceId: string | null;
  revendedorAuth: RevendedorAuth | null;
  lastResultados: CachedResultados | null;
  setLastResultados: (data: CachedResultados) => void;
  setGestorToken: (token: string | null) => void;
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
  updateNotaProduto: (
    notaId: string,
    index: number,
    changes: Partial<Pick<Nota["produtos"][number], "descricao" | "valorUnitario" | "valorTotal">>
  ) => void;
  resetOnboarding: () => void;
  setHasHydrated: (value: boolean) => void;
  ensureDeviceId: () => string;
  setRevendedorAuth: (auth: RevendedorAuth | null) => void;
  /** Restores cart/notas/settings from the server after login — adopts
   * server data when present (new device / cleared cache), otherwise
   * uploads whatever exists locally so it starts being backed up. */
  hydrateRevendedorData: () => Promise<void>;
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
      gestorToken: null,
      deviceId: null,
      revendedorAuth: null,
      lastResultados: null,
      setLastResultados: (data) => set({ lastResultados: data }),
      setGestorToken: (token) => set({ gestorToken: token }),
      setRole: (role) => set({ role }),
      setLocation: (location) => set({ location }),
      setDefaultProfitPercent: (percent) => {
        set({ defaultProfitPercent: percent });
        const { role, revendedorAuth, searchRadiusKm } = get();
        if (role === "revendedor" && revendedorAuth) {
          pushSettings(percent, searchRadiusKm, revendedorAuth.token).catch(() => {});
        }
      },
      setSearchRadiusKm: (radiusKm) => {
        set({ searchRadiusKm: radiusKm });
        const { role, revendedorAuth, defaultProfitPercent } = get();
        if (role === "revendedor" && revendedorAuth) {
          pushSettings(defaultProfitPercent, radiusKm, revendedorAuth.token).catch(() => {});
        }
      },
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
      addToCart: (item) => {
        set((state) => ({ cart: [...state.cart, item] }));
        const { role, revendedorAuth, cart } = get();
        if (role === "revendedor" && revendedorAuth) {
          pushCartSnapshot(cart, revendedorAuth.token).catch(() => {});
        }
      },
      removeFromCart: (id) => {
        set((state) => ({ cart: state.cart.filter((i) => i.id !== id) }));
        const { role, revendedorAuth, cart } = get();
        if (role === "revendedor" && revendedorAuth) {
          pushCartSnapshot(cart, revendedorAuth.token).catch(() => {});
        }
      },
      updateCartItemQuantity: (id, quantity) => {
        set((state) => ({
          cart: state.cart.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        }));
        const { role, revendedorAuth, cart } = get();
        if (role === "revendedor" && revendedorAuth) {
          pushCartSnapshot(cart, revendedorAuth.token).catch(() => {});
        }
      },
      clearCart: () => {
        set({ cart: [] });
        const { role, revendedorAuth } = get();
        if (role === "revendedor" && revendedorAuth) {
          pushCartSnapshot([], revendedorAuth.token).catch(() => {});
        }
      },
      addNota: (nota) => {
        set((state) => ({ notas: [nota, ...state.notas] }));
        const { role, revendedorAuth } = get();
        if (role === "revendedor" && revendedorAuth) {
          pushNota(nota, revendedorAuth.token).catch(() => {});
        }
      },
      removeNota: (id) => {
        set((state) => ({ notas: state.notas.filter((n) => n.id !== id) }));
        const { role, revendedorAuth } = get();
        if (role === "revendedor" && revendedorAuth) {
          deleteNotaRemote(id, revendedorAuth.token).catch(() => {});
        }
      },
      updateNotaProduto: (notaId, index, changes) => {
        set((state) => ({
          notas: state.notas.map((n) =>
            n.id !== notaId
              ? n
              : {
                  ...n,
                  produtos: n.produtos.map((p, i) =>
                    i === index ? { ...p, ...changes } : p
                  ),
                }
          ),
        }));
        const { role, revendedorAuth } = get();
        if (role === "revendedor" && revendedorAuth) {
          patchNotaProdutoRemote(notaId, index, changes, revendedorAuth.token).catch(() => {});
        }
      },
      resetOnboarding: () =>
        set({
          role: null,
          cart: [],
          notas: [],
          recentSearches: [],
          lastSearchQuery: null,
          gestorToken: null,
        }),
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
      hydrateRevendedorData: async () => {
        const { revendedorAuth, cart, notas, defaultProfitPercent, searchRadiusKm } = get();
        if (!revendedorAuth) return;
        const token = revendedorAuth.token;

        const [remoteCart, remoteNotas, remoteSettings] = await Promise.all([
          pullCart(token).catch(() => []),
          pullNotas(token).catch(() => []),
          pullSettings(token).catch(() => ({
            found: false,
            defaultProfitPercent: null,
            searchRadiusKm: null,
          })),
        ]);

        // Server already has data for this account (new device, or cache
        // was cleared and this is a fresh login) — adopt it as the source
        // of truth.
        if (remoteCart.length > 0) set({ cart: remoteCart });
        else if (cart.length > 0) pushCartSnapshot(cart, token).catch(() => {});

        if (remoteNotas.length > 0) set({ notas: remoteNotas });
        else if (notas.length > 0) {
          for (const nota of notas) pushNota(nota, token).catch(() => {});
        }

        if (remoteSettings.found) {
          set({
            defaultProfitPercent: remoteSettings.defaultProfitPercent ?? defaultProfitPercent,
            searchRadiusKm: remoteSettings.searchRadiusKm ?? searchRadiusKm,
          });
        } else {
          pushSettings(defaultProfitPercent, searchRadiusKm, token).catch(() => {});
        }
      },
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
