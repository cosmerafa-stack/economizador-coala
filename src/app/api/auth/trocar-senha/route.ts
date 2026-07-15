import { NextRequest, NextResponse } from "next/server";
import { changePassword } from "@/lib/authStore.server";
import { requireRevendedorAccount } from "@/lib/revendedorAuth.server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const accountId = await requireRevendedorAccount(request);
  if (!accountId) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }

  const ip = getClientIp(request);
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `trocar-senha:ip:${ip}`,
    10,
    15 * 60 * 1000
  );
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds ?? 900) } }
    );
  }

  const body = await request.json().catch(() => null);
  const novaSenha = typeof body?.novaSenha === "string" ? body.novaSenha : "";
  if (novaSenha.length < 6) {
    return NextResponse.json(
      { ok: false, message: "A senha precisa ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  const ok = await changePassword(accountId, novaSenha);
  return NextResponse.json({ ok });
}
