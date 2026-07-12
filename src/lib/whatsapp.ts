import { formatCurrency } from "./format";

/**
 * Builds a wa.me deep link from a Brazilian phone number (with or without
 * the country/DDD already attached). Returns null when the digit count
 * doesn't look like a plausible DDD+number, so callers can skip the button
 * instead of opening a broken link.
 */
export function buildWhatsAppLink(phoneRaw: string, message: string): string | null {
  const digits = phoneRaw.replace(/\D/g, "");
  const withoutCountry = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  if (withoutCountry.length !== 10 && withoutCountry.length !== 11) return null;

  return `https://wa.me/55${withoutCountry}?text=${encodeURIComponent(message)}`;
}

export function buildStoreInquiryMessage(productName: string, price: number): string {
  return `Olá, tudo bem? Gostaria de saber se o produto ${productName} tem em estoque e se está no valor de ${formatCurrency(price)}. Agradeço desde já!`;
}
