import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/authStore.server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, senha, deviceId } = body ?? {};

  if (!email || !senha || !deviceId) {
    return NextResponse.json(
      { ok: false, message: "Preencha e-mail e senha." },
      { status: 400 }
    );
  }

  // Both by IP (stop a single attacker spraying many accounts) and by the
  // targeted email (stop distributed brute force against one account) —
  // 15 minute windows, generous enough for a real user who mistypes a
  // few times.
  const ip = getClientIp(request);
  const emailKey = String(email).trim().toLowerCase();
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`login:ip:${ip}`, 15, 15 * 60 * 1000),
    checkRateLimit(`login:email:${emailKey}`, 8, 15 * 60 * 1000),
  ]);

  if (!ipLimit.allowed || !emailLimit.allowed) {
    const retryAfter = Math.max(ipLimit.retryAfterSeconds ?? 0, emailLimit.retryAfterSeconds ?? 0);
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const result = await login({ email, senha, deviceId });
  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }
  return NextResponse.json(result);
}
