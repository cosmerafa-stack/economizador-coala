import { NextRequest, NextResponse } from "next/server";
import { registerAccount } from "@/lib/authStore.server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { nome, sobrenome, telefone, email, senha } = body ?? {};

  if (!nome || !sobrenome || !telefone || !email || !senha) {
    return NextResponse.json(
      { ok: false, message: "Preencha todos os campos." },
      { status: 400 }
    );
  }

  if (String(senha).length < 6) {
    return NextResponse.json(
      { ok: false, message: "A senha precisa ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  // Limits spam signups / mass account-enumeration attempts (the "e-mail
  // já cadastrado" response below is informative by design for real
  // users, so this is the main defense against it being abused at scale).
  const ip = getClientIp(request);
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    `cadastro:ip:${ip}`,
    5,
    60 * 60 * 1000
  );
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds ?? 3600) } }
    );
  }

  const result = await registerAccount({ nome, sobrenome, telefone, email, senha });
  if (!result.ok) {
    return NextResponse.json(result, { status: 409 });
  }
  return NextResponse.json(result);
}
