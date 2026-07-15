"use client";

import { useEffect, useState } from "react";

interface ProductImageFrameProps {
  barcode: string | null;
}

// Module-level cache so the same barcode (common across nearby stores) isn't
// re-fetched every time a result card mounts.
const imageCache = new Map<string, string | null>();

// NFCe covers every kind of retail product, not just food, so Open Food
// Facts alone (great coverage for groceries) misses a lot. Open Products
// Facts is the same project's sister database for everything else — same
// free, keyless API shape, tried second since its catalog is much smaller.
const IMAGE_SOURCES = [
  "https://world.openfoodfacts.org/api/v2/product",
  "https://world.openproductsfacts.org/api/v2/product",
];

async function fetchFromSource(source: string, barcode: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(
      `${source}/${encodeURIComponent(barcode)}.json?fields=image_front_small_url,image_url`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.product?.image_front_small_url ?? data?.product?.image_url ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchProductImage(barcode: string): Promise<string | null> {
  if (imageCache.has(barcode)) return imageCache.get(barcode) ?? null;

  let url: string | null = null;
  for (const source of IMAGE_SOURCES) {
    url = await fetchFromSource(source, barcode);
    if (url) break;
  }
  imageCache.set(barcode, url);
  return url;
}

export function ProductImageFrame({ barcode }: ProductImageFrameProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(
    barcode ? imageCache.get(barcode) ?? null : null
  );

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
    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable domain per product; not worth next/image's remotePatterns config for a best-effort thumbnail
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
    </div>
  );
}
