import { NextRequest, NextResponse } from "next/server";
import { verifyGestorPassword, createGestorToken } from "@/lib/gestorAuth.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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
