import { PriceResult, SortOption } from "./types";

export const SORT_LABELS: Record<SortOption, string> = {
  preco_asc: "Menor preço",
  preco_desc: "Maior preço",
  distancia_asc: "Mais próximo (distância)",
  distancia_desc: "Mais distante",
  mais_antigo: "Mais antigo (data)",
  mais_proximo: "Mais recente (data)",
};

export function sortResults(
  results: PriceResult[],
  sort: SortOption
): PriceResult[] {
  const copy = [...results];

  switch (sort) {
    case "preco_asc":
      return copy.sort((a, b) => a.price - b.price);
    case "preco_desc":
      return copy.sort((a, b) => b.price - a.price);
    case "distancia_asc":
      return copy.sort((a, b) => a.distanceKm - b.distanceKm);
    case "distancia_desc":
      return copy.sort((a, b) => b.distanceKm - a.distanceKm);
    case "mais_antigo":
      return copy.sort(
        (a, b) => new Date(a.emittedAt).getTime() - new Date(b.emittedAt).getTime()
      );
    case "mais_proximo":
      return copy.sort(
        (a, b) => new Date(b.emittedAt).getTime() - new Date(a.emittedAt).getTime()
      );
    default:
      return copy;
  }
}
