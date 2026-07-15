"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, getEffectiveLocation } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { SettingsMenuButton } from "@/components/SettingsMenuButton";
import { formatCurrency, formatTimeAgo } from "@/lib/format";
import { googleMapsUrl } from "@/lib/maps";
import { nearestNeighborOrder, googleMapsRouteUrl } from "@/lib/route";
import { useGoToSearch } from "@/lib/useGoToSearch";
import { StoreContactButton } from "@/components/StoreContactButton";
import { CartItem, Store } from "@/lib/types";
import { TUTORIAL_DEMO_CART } from "@/lib/tutorialSteps";

const UNDO_TIMEOUT_MS = 6000;

export default function CarrinhoPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const realCart = useAppStore((s) => s.cart);
  const tutorialActive = useAppStore((s) => s.tutorialActive);
  // Two example products shown only during the guided tutorial, so the
  // WhatsApp-contact and smart-route steps have something real to point at
  // without touching (or syncing to the server) the user's actual cart.
  const cart = tutorialActive ? TUTORIAL_DEMO_CART : realCart;
  const location = useAppStore((s) => s.location);
  const removeFromCart = useAppStore((s) => s.removeFromCart);
  const updateCartItemQuantity = useAppStore((s) => s.updateCartItemQuantity);
  const clearCart = useAppStore((s) => s.clearCart);
  const addToCart = useAppStore((s) => s.addToCart);
  const goToSearch = useGoToSearch();
  const [tracandoRota, setTracandoRota] = useState(false);
  const [lastRemoved, setLastRemoved] = useState<CartItem | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleRemove(item: CartItem) {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    removeFromCart(item.id);
    setLastRemoved(item);
    undoTimeoutRef.current = setTimeout(() => setLastRemoved(null), UNDO_TIMEOUT_MS);
  }

  function handleUndoRemove() {
    if (!lastRemoved) return;
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    addToCart(lastRemoved);
    setLastRemoved(null);
  }

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!role) {
      router.replace("/");
    } else if (role === "gestor") {
      router.replace("/gestor");
    }
  }, [hasHydrated, role, router]);

  const isRevendedor = role === "revendedor";

  const totals = useMemo(() => {
    return cart.reduce(
      (acc, item) => ({
        count: acc.count + item.quantity,
        gross: acc.gross + item.priceResult.price * item.quantity,
        profit: acc.profit + item.grossProfit * item.quantity,
      }),
      { count: 0, gross: 0, profit: 0 }
    );
  }, [cart]);

  const stopStores = useMemo(() => {
    const byId = new Map<string, Store>();
    for (const item of cart) {
      byId.set(item.priceResult.store.id, item.priceResult.store);
    }
    return [...byId.values()];
  }, [cart]);

  function handleLimparCarrinho() {
    if (tutorialActive || cart.length === 0) return;
    if (window.confirm("Tem certeza que deseja remover todos os itens do carrinho?")) {
      clearCart();
    }
  }

  function handleTracarRota() {
    if (stopStores.length === 0) return;
    setTracandoRota(true);

    const openRouteFrom = (origin: { lat: number; lng: number }) => {
      const ordered = nearestNeighborOrder(origin, stopStores);
      const url = googleMapsRouteUrl(origin, ordered);
      window.open(url, "_blank", "noopener,noreferrer");
      setTracandoRota(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          openRouteFrom({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        () => openRouteFrom(getEffectiveLocation(location)),
        { timeout: 6000 }
      );
    } else {
      openRouteFrom(getEffectiveLocation(location));
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        title={isRevendedor ? "Carrinho de revenda" : "Meu carrinho"}
        extra={<SettingsMenuButton />}
        dataTutorial="carrinho-nav"
      />

      <div className="px-4 pt-3">
        <button
          onClick={goToSearch}
          className="flex items-center gap-1 text-sm font-semibold text-ml-blue"
        >
          ‹ Voltar à pesquisa
        </button>
      </div>

      <main className="flex flex-1 flex-col gap-3 px-4 py-4 pb-4">
        {lastRemoved && (
          <div className="animate-fade-slide-up flex items-center justify-between gap-3 rounded-2xl bg-gray-800 px-4 py-3 text-sm text-white shadow-sm">
            <span className="truncate">
              {lastRemoved.priceResult.productName} removido
            </span>
            <button
              onClick={handleUndoRemove}
              className="shrink-0 font-bold text-ml-blue"
            >
              Desfazer
            </button>
          </div>
        )}

        {stopStores.length > 0 && (
          <button
            data-tutorial="carrinho-rota"
            onClick={handleTracarRota}
            disabled={tracandoRota}
            className="animate-fade-slide-up flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-ml-blue to-ml-blue-dark px-4 py-3.5 text-left text-white shadow-sm transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">🧭</span>
              <span>
                <span className="block text-sm font-bold">
                  {tracandoRota ? "Traçando rota..." : "Traçar rota inteligente"}
                </span>
                <span className="block text-xs text-white/80">
                  {stopStores.length === 1
                    ? "1 parada a partir da sua localização"
                    : `${stopStores.length} paradas, otimizadas pela mais próxima`}
                </span>
              </span>
            </span>
            <span className="text-lg">›</span>
          </button>
        )}

        {cart.length === 0 ? (
          <div className="mt-10 text-center text-sm text-gray-400">
            Seu carrinho está vazio.
            <br />
            {isRevendedor
              ? "Busque um produto e adicione para revenda."
              : "Busque um produto e adicione ao carrinho."}
          </div>
        ) : (
          cart.map((item, index) => (
            <div
              key={item.id}
              className="animate-fade-slide-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md"
              style={{ animationDelay: `${Math.min(index * 0.06, 0.4)}s` }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug text-gray-800">
                  {item.priceResult.productName}
                </p>
                <button
                  onClick={() => handleRemove(item)}
                  aria-label="Remover"
                  className="shrink-0 text-lg leading-none text-gray-300"
                >
                  ×
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {item.priceResult.store.name} ·{" "}
                {formatTimeAgo(item.priceResult.emittedAt)}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-gray-400">
                {item.priceResult.store.address}
              </p>
              <a
                href={googleMapsUrl(
                  item.priceResult.store.coordinates,
                  item.priceResult.store.name
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-ml-blue"
              >
                📍 Abrir Mapa
              </a>
              <div>
                <StoreContactButton
                  store={item.priceResult.store}
                  productName={item.priceResult.productName}
                  price={item.priceResult.price}
                  dataTutorial={index === 0 ? "carrinho-whatsapp" : undefined}
                />
              </div>

              <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-xs text-gray-500">Quantidade</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      item.quantity <= 1
                        ? handleRemove(item)
                        : updateCartItemQuantity(item.id, item.quantity - 1)
                    }
                    aria-label={
                      item.quantity <= 1 ? "Remover" : "Diminuir quantidade"
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-sm font-bold text-gray-600 active:bg-gray-100"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-gray-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateCartItemQuantity(item.id, item.quantity + 1)
                    }
                    aria-label="Aumentar quantidade"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-sm font-bold text-gray-600 active:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>

              {isRevendedor ? (
                <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-2 text-center text-xs">
                  <div>
                    <p className="text-gray-400">Custo (un.)</p>
                    <p className="font-semibold text-gray-800">
                      {formatCurrency(item.priceResult.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Revenda ({item.profitPercent}%)</p>
                    <p className="font-semibold text-ml-blue">
                      {formatCurrency(item.resalePrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Lucro total</p>
                    <p className="font-semibold text-ml-green">
                      {formatCurrency(item.grossProfit * item.quantity)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-2 text-center text-xs">
                  <div>
                    <p className="text-gray-400">Preço (un.)</p>
                    <p className="font-semibold text-gray-800">
                      {formatCurrency(item.priceResult.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Subtotal</p>
                    <p className="font-semibold text-ml-blue">
                      {formatCurrency(item.priceResult.price * item.quantity)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {cart.length > 0 && isRevendedor && (
          <div
            className="animate-fade-slide-up mt-1 grid grid-cols-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-lg leading-none">📦</span>
              <span className="text-base font-extrabold text-gray-900">
                {totals.count}
              </span>
              <span className="text-[11px] leading-tight text-gray-400">
                Produtos
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 border-x border-gray-100 text-center">
              <span className="text-lg leading-none">💰</span>
              <span className="text-base font-extrabold text-gray-900">
                {formatCurrency(totals.gross)}
              </span>
              <span className="text-[11px] leading-tight text-gray-400">
                Valor bruto
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-lg leading-none">📈</span>
              <span className="text-base font-extrabold text-ml-green">
                {formatCurrency(totals.profit)}
              </span>
              <span className="text-[11px] leading-tight text-gray-400">
                Lucro bruto
              </span>
            </div>
          </div>
        )}

        {cart.length > 0 && !isRevendedor && (
          <div
            className="animate-fade-slide-up mt-1 grid grid-cols-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-lg leading-none">📦</span>
              <span className="text-base font-extrabold text-gray-900">
                {totals.count}
              </span>
              <span className="text-[11px] leading-tight text-gray-400">
                Produtos
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 border-l border-gray-100 text-center">
              <span className="text-lg leading-none">💰</span>
              <span className="text-base font-extrabold text-gray-900">
                {formatCurrency(totals.gross)}
              </span>
              <span className="text-[11px] leading-tight text-gray-400">
                Valor total
              </span>
            </div>
          </div>
        )}

        {cart.length > 0 && (
          <button
            onClick={handleLimparCarrinho}
            className="animate-fade-slide-up text-center text-xs font-semibold text-red-500"
            style={{ animationDelay: "0.15s" }}
          >
            Limpar carrinho
          </button>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
