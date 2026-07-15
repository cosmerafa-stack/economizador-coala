import { NextRequest, NextResponse } from "next/server";
import { createTempAccount, listTempAccounts } from "@/lib/authStore.server";
import { requireGestorAuth } from "@/lib/gestorAuth.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await requireGestorAuth(request))) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  return NextResponse.json({ usuarios: await listTempAccounts() });
}

export async function POST(request: NextRequest) {
  if (!(await requireGestorAuth(request))) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const trialHours =
    typeof body?.trialHours === "number" && Number.isFinite(body.trialHours)
      ? body.trialHours
      : undefined;
  const contactEmail = typeof body?.contactEmail === "string" ? body.contactEmail : undefined;
  const telefone = typeof body?.telefone === "string" ? body.telefone : undefined;

  if (!username.trim()) {
    return NextResponse.json(
      { ok: false, message: "Informe um nome de usuário." },
      { status: 400 }
    );
  }

  const result = await createTempAccount({ username, trialHours, contactEmail, telefone });
  if (!result.ok) {
    return NextResponse.json(result, { status: 409 });
  }
  return NextResponse.json(result);
}
