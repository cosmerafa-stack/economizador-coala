import { NextRequest, NextResponse } from "next/server";
import { disableAccount, enableAccount, extendExpiration } from "@/lib/authStore.server";
import { requireGestorAuth } from "@/lib/gestorAuth.server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireGestorAuth(request))) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (body?.action === "disable") {
    const ok = await disableAccount(id);
    return NextResponse.json({ ok });
  }

  if (body?.action === "enable") {
    const ok = await enableAccount(id);
    return NextResponse.json({ ok });
  }

  if (body?.action === "extend") {
    const extraHours = Number(body.extraHours);
    if (!Number.isFinite(extraHours) || extraHours <= 0) {
      return NextResponse.json(
        { ok: false, message: "Valor inválido." },
        { status: 400 }
      );
    }
    const ok = await extendExpiration(id, extraHours);
    return NextResponse.json({ ok });
  }

  return NextResponse.json(
    { ok: false, message: "Ação desconhecida." },
    { status: 400 }
  );
}
