import "server-only";

interface CosmosProduct {
  thumbnail?: string;
}

// Cosmos Bluesoft's image CDN blocks non-browser-looking requests (its own
// API does not need this, only the CDN that serves the actual thumbnail).
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function lookupCosmosThumbnailUrl(barcode: string): Promise<string | null> {
  const token = process.env.COSMOS_API_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${encodeURIComponent(barcode)}.json`, {
      headers: { "X-Cosmos-Token": token },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CosmosProduct;
    return data.thumbnail ?? null;
  } catch {
    return null;
  }
}

export const cosmosImageFetchOptions: RequestInit = {
  headers: { "User-Agent": BROWSER_USER_AGENT },
};
