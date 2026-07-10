import { NextRequest, NextResponse } from "next/server";
import {
  approveAccount,
  removeAccount,
  setMaxDevices,
} from "@/lib/authStore.server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (body?.action === "approve") {
    const ok = approveAccount(id);
    return NextResponse.json({ ok });
  }

  if (body?.action === "setMaxDevices") {
    const value = Number(body.maxDevices);
    if (!Number.isFinite(value) || value < 1) {
      return NextResponse.json(
        { ok: false, message: "Valor inválido." },
        { status: 400 }
      );
    }
    const ok = setMaxDevices(id, value);
    return NextResponse.json({ ok });
  }

  return NextResponse.json(
    { ok: false, message: "Ação desconhecida." },
    { status: 400 }
  );
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = removeAccount(id);
  return NextResponse.json({ ok });
}
