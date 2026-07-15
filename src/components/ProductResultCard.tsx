"use client";

import { PriceResult } from "@/lib/types";
import { formatCurrency, formatDistance, formatTimeAgo } from "@/lib/format";
import { googleMapsUrl } from "@/lib/maps";
import { useAppStore } from "@/lib/store";
import { ProductImageFrame } from "@/components/ProductImageFrame";

interface ProductResultCardProps {
  result: PriceResult;
  showAddToCart: boolean;
  onAddToCart?: () => void;
}

export function ProductResultCard({
  result,
  showAddToCart,
  onAddToCart,
}: ProductResultCardProps) {
  const showProductImage = useAppStore((s) => s.showProductImage);

  const header = (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium leading-snug text-gray-800">
        {result.productName}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-ml-green">
        {formatCurrency(result.price)}
      </p>
      {result.barcode && (
        <p className="mt-0.5 text-xs text-gray-400">
          Código de barras: {result.barcode}
        </p>
      )}
      <p className="text-xs text-gray-400">{formatTimeAgo(result.emittedAt)}</p>
    </div>
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {showProductImage ? (
        <div className="flex gap-3">
          <ProductImageFrame barcode={result.barcode} productName={result.productName} />
          {header}
        </div>
      ) : (
        header
      )}

      <div className="mt-3 border-t border-gray-100 pt-3">
        <p className="text-sm font-bold text-gray-900">{result.store.name}</p>
        <p className="text-xs leading-snug text-gray-500">
          {result.store.address}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          <span className="font-semibold text-ml-blue">
            {formatDistance(result.distanceKm)}
          </span>
          <span>{result.store.phone}</span>
        </div>
        <a
          href={googleMapsUrl(result.store.coordinates, result.store.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ml-blue transition-transform hover:translate-x-0.5"
        >
          📍 Abrir Mapa
        </a>
      </div>

      {showAddToCart && (
        <button
          onClick={onAddToCart}
          className="mt-3 w-full rounded-xl bg-ml-blue py-2.5 text-sm font-bold text-white shadow-sm transition-transform active:scale-95 active:bg-ml-blue-dark"
        >
          Adicionar ao carrinho
        </button>
      )}
    </div>
  );
}
