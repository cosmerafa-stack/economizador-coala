import { NextRequest, NextResponse } from "next/server";
import { loginOrRegisterWithGoogle } from "@/lib/authStore.server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit.server";

export const dynamic = "force-dynamic";

interface GoogleTokenInfo {
  aud: string;
  sub: string;
  email?: string;
  email_verified?: string | boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
}

// Verifies the ID token Google's Identity Services client handed back to
// the browser. Uses Google's own tokeninfo endpoint rather than a JWT
// library — it does full signature/expiry validation on Google's side, and
// is a plain HTTPS call, which keeps this compatible with the Cloudflare
// Workers runtime without pulling in a JWKS-verification dependency.
async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!res.ok) return null;
    return (await res.json()) as GoogleTokenInfo;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const credential = typeof body?.credential === "string" ? body.credential : "";
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";

  if (!credential || !deviceId) {
    return NextResponse.json(
      { ok: false, message: "Requisição inválida." },
      { status: 400 }
    );
  }

  // Can't really be brute-forced (needs a Google-signed token), but a
  // generous cap still guards against abuse hammering the tokeninfo call.
  const ip = getClientIp(request);
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `google-auth:ip:${ip}`,
    30,
    15 * 60 * 1000
  );
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds ?? 900) } }
    );
  }

  const info = await verifyGoogleIdToken(credential);
  const expectedAudience = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!info || !expectedAudience || info.aud !== expectedAudience) {
    return NextResponse.json(
      { ok: false, message: "Não foi possível verificar sua conta Google." },
      { status: 401 }
    );
  }

  if (!info.email || info.email_verified === false || info.email_verified === "false") {
    return NextResponse.json(
      { ok: false, message: "Sua conta Google precisa ter um e-mail verificado." },
      { status: 401 }
    );
  }

  const result = await loginOrRegisterWithGoogle({
    googleSub: info.sub,
    email: info.email,
    nome: info.given_name || info.name || "Revendedor",
    sobrenome: info.family_name || "",
    avatarUrl: info.picture ?? null,
    deviceId,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.pending ? 202 : 401 });
  }

  return NextResponse.json(result);
}
