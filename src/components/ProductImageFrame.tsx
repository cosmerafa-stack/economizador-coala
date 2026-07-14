"use client";

import { useEffect, useState } from "react";

interface ProductImageFrameProps {
  barcode: string | null;
}

// Module-level cache so the same barcode (common across nearby stores) isn't
// re-fetched from Open Food Facts every time a result card mounts.
const imageCache = new Map<string, string | null>();

async function fetchProductImage(barcode: string): Promise<string | null> {
  if (imageCache.has(barcode)) return imageCache.get(barcode) ?? null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=image_front_small_url,image_url`,
      { signal: controller.signal }
    );
    if (!res.ok) throw new Error("not ok");
    const data = await res.json();
    const url: string | null =
      data?.product?.image_front_small_url ?? data?.product?.image_url ?? null;
    imageCache.set(barcode, url);
    return url;
  } catch {
    imageCache.set(barcode, null);
    return null;
  } finally {
    clearTimeout(timeout);
  }
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
