const UNIT_PATTERN =
  /\b\d+([.,]\d+)?\s?(ml|l|kg|g|mg|un|und|unid|cx|pct|pac|fardo|dz|x)\b/gi;

const STOPWORDS = new Set([
  "de",
  "da",
  "do",
  "com",
  "sem",
  "e",
  "a",
  "o",
]);

/**
 * Shrinks a verbose product description (as read from a receipt or a
 * previous search result) down to a short, generic term more likely to
 * match the live price-scraper's own product naming — e.g.
 * "ARROZ URBANO 7 GRAOS LENTILHA+GIRASSOL INTEGRAL 500G" -> "ARROZ URBANO".
 */
export function simplifySearchTerm(name: string): string {
  const withoutUnits = name
    .replace(UNIT_PATTERN, " ")
    .replace(/\d+([.,]\d+)?/g, " ")
    .replace(/[+/\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = withoutUnits
    .split(" ")
    .filter((w) => w.length > 0 && !STOPWORDS.has(w.toLowerCase()));

  const simplified = words.slice(0, 2).join(" ");
  return simplified || name.trim();
}
