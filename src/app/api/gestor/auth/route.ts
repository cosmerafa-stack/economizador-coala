import { NextRequest, NextResponse } from "next/server";
import { verifyGestorPassword, createGestorToken } from "@/lib/gestorAuth.server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  // Strict — this is a single shared password gating admin access, so a
  // small window is appropriate even at the cost of inconveniencing a
  // legitimate mistyped attempt.
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `gestor-auth:ip:${ip}`,
    5,
    15 * 60 * 1000
  );
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds ?? 900) } }
    );
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!verifyGestorPassword(password)) {
    return NextResponse.json(
      { ok: false, message: "Senha incorreta." },
      { status: 401 }
    );
  }

  const token = await createGestorToken();
  return NextResponse.json({ ok: true, token });
}
