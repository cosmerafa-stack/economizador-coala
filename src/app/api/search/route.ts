import { NextRequest, NextResponse } from "next/server";
import { searchPrices } from "@/lib/precoDaHora";
import { searchProducts, DEFAULT_LOCATION } from "@/lib/mockData";
import { SortOption } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_SORTS: SortOption[] = [
  "preco_asc",
  "preco_desc",
  "distancia_asc",
  "distancia_desc",
  "mais_antigo",
  "mais_proximo",
];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() ?? "";
  const lat = Number(params.get("lat") ?? DEFAULT_LOCATION.lat);
  const lng = Number(params.get("lng") ?? DEFAULT_LOCATION.lng);
  const radiusKm = Number(params.get("radius") ?? 30);
  const sortParam = params.get("sort") ?? "preco_asc";
  const sort: SortOption = VALID_SORTS.includes(sortParam as SortOption)
    ? (sortParam as SortOption)
    : "preco_asc";

  if (!query) {
    return NextResponse.json({ results: [], source: "none" });
  }

  try {
    const { results, source, cachedAt } = await searchPrices({
      query,
      lat,
      lng,
      radiusKm,
      sort,
    });
    return NextResponse.json({ results, source, cachedAt });
  } catch {
    const results = searchProducts({
      query,
      location: { lat, lng },
      radiusKm,
    });
    return NextResponse.json({ results, source: "mock" });
  }
}
