"use client";

import { useEffect, useState } from "react";

interface ProductImageFrameProps {
  barcode: string | null;
  productName?: string;
}

// Module-level cache so the same barcode (common across nearby stores)
// isn't re-fetched every time a result card mounts — the server itself
// already caches per-barcode in Postgres, this just saves the round trip
// within the same page session.
const imageCache = new Map<string, string | null>();

async function fetchProductImage(barcode: string): Promise<string | null> {
  if (imageCache.has(barcode)) return imageCache.get(barcode) ?? null;

  try {
    const res = await fetch(`/api/produto-imagem?barcode=${encodeURIComponent(barcode)}`);
    const data = await res.json();
    const url: string | null = data?.imageData ?? null;
    imageCache.set(barcode, url);
    return url;
  } catch {
    return null;
  }
}

export function ProductImageFrame({ barcode, productName }: ProductImageFrameProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(
    barcode ? imageCache.get(barcode) ?? null : null
  );
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (!barcode) {
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    fetchProductImage(barcode).then((url) => {
      if (!cancelled) setImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [barcode]);

  return (
    <>
      <button
        type="button"
        onClick={() => imageUrl && setZoomOpen(true)}
        disabled={!imageUrl}
        aria-label={imageUrl ? "Ampliar imagem do produto" : undefined}
        className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL, not a static/remote asset next/image can optimize
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setImageUrl(null)}
          />
        ) : (
          <span className="px-1 text-center text-[9px] leading-tight text-gray-400">
            Sem imagem
          </span>
        )}
      </button>

      {zoomOpen && imageUrl && (
        <ProductImageZoomModal
          imageUrl={imageUrl}
          productName={productName}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </>
  );
}

function ProductImageZoomModal({
  imageUrl,
  productName,
  onClose,
}: {
  imageUrl: string;
  productName?: string;
  onClose: () => void;
}) {
  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-full max-w-full flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={productName ?? ""}
          className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-2xl"
        />
        <div className="flex gap-3">
          <a
            href={imageUrl}
            download={`produto-${Date.now()}.jpg`}
            className="rounded-xl bg-ml-blue px-4 py-2 text-sm font-bold text-white shadow-sm active:scale-95"
          >
            Salvar imagem
          </a>
          <button
            onClick={onClose}
            className="rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
