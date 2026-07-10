import { NextRequest, NextResponse } from "next/server";
import { registerAccount } from "@/lib/authStore.server";

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

  const result = await registerAccount({ nome, sobrenome, telefone, email, senha });
  if (!result.ok) {
    return NextResponse.json(result, { status: 409 });
  }
  return NextResponse.json(result);
}
