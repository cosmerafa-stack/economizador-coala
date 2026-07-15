import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { checkRateLimit } from "@/lib/rateLimit.server";
import { fetchAndCompressImage } from "@/lib/imageCompress.server";
import { lookupCosmosThumbnailUrl, cosmosImageFetchOptions } from "@/lib/cosmosImage.server";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

const COSMOS_DAILY_LIMIT = 25;

async function getStoredImage(barcode: string): Promise<{ imageData: string; source: string } | null> {
  const rows = (await sql.query(
    "select image_data, source from product_images where barcode = $1",
    [barcode]
  )) as { image_data: string; source: string }[];
  return rows[0] ? { imageData: rows[0].image_data, source: rows[0].source } : null;
}

async function saveImage(barcode: string, imageData: string, source: string): Promise<void> {
  await sql.query(
    `insert into product_images (barcode, image_data, source) values ($1, $2, $3)
     on conflict (barcode) do nothing`,
    [barcode, imageData, source]
  );
}

// Tries the free, keyless sources first — Cosmos is rate-limited to 25
// lookups/day, which a single popular product (found at many stores) would
// burn through fast if it were tried first.
async function tryFreeSource(
  base: string,
  barcode: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${base}/${encodeURIComponent(barcode)}.json?fields=image_front_small_url,image_url`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const url: string | null =
      data?.product?.image_front_small_url ?? data?.product?.image_url ?? null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get("barcode")?.trim();
  if (!barcode) {
    return NextResponse.json({ imageData: null });
  }

  const stored = await getStoredImage(barcode);
  if (stored) {
    return NextResponse.json({ imageData: stored.imageData, source: stored.source });
  }

  const freeSources = [
    { base: "https://world.openfoodfacts.org/api/v2/product", name: "openfoodfacts" },
    { base: "https://world.openproductsfacts.org/api/v2/product", name: "openproductsfacts" },
  ];

  for (const { base, name } of freeSources) {
    const url = await tryFreeSource(base, barcode);
    if (!url) continue;
    const compressed = await fetchAndCompressImage(url);
    if (compressed) {
      await saveImage(barcode, compressed, name);
      return NextResponse.json({ imageData: compressed, source: name });
    }
  }

  const { allowed } = await checkRateLimit("cosmos-images:daily", COSMOS_DAILY_LIMIT, 24 * 60 * 60 * 1000);
  if (allowed) {
    const thumbnailUrl = await lookupCosmosThumbnailUrl(barcode);
    if (thumbnailUrl) {
      const compressed = await fetchAndCompressImage(thumbnailUrl, cosmosImageFetchOptions);
      if (compressed) {
        await saveImage(barcode, compressed, "cosmos");
        return NextResponse.json({ imageData: compressed, source: "cosmos" });
      }
    }
  }

  return NextResponse.json({ imageData: null });
}
