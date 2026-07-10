import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/authStore.server";

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

  const result = await login({ email, senha, deviceId });
  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }
  return NextResponse.json(result);
}
