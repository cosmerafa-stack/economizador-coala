import { NextRequest, NextResponse } from "next/server";
import { findStoreContact } from "@/lib/storeContact.server";

export const dynamic = "force-dynamic";

// Fallback lookup for a store's phone when the government price API didn't
// return one. Tries three free, keyless sources in order — see
// storeContact.server.ts for the confidence tiers.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const digitsOnly = typeof body?.cnpj === "string" ? body.cnpj.replace(/\D/g, "") : "";
  // The store id comes from `String(estabelecimento.cnpj)`, a number, so a
  // CNPJ with leading zeros loses them — pad back out to the real 14 digits.
  const cnpj = digitsOnly.padStart(14, "0");
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const storeName = typeof body?.storeName === "string" ? body.storeName.trim() : "";

  if (digitsOnly.length === 0 || cnpj.length !== 14) {
    return NextResponse.json(
      { ok: false, message: "CNPJ do estabelecimento não identificado." },
      { status: 400 }
    );
  }

  const result = await findStoreContact({
    cnpj,
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
    storeName,
  });

  if (!result) {
    return NextResponse.json({
      ok: false,
      message: "Não encontramos um contato para esta loja.",
    });
  }

  return NextResponse.json({
    ok: true,
    phone: result.phone,
    confirmed: result.confirmed,
  });
}
