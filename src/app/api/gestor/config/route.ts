import { NextRequest, NextResponse } from "next/server";
import { getDefaultTrialHours, setDefaultTrialHours } from "@/lib/appSettings.server";
import { requireGestorAuth } from "@/lib/gestorAuth.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await requireGestorAuth(request))) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  return NextResponse.json({ defaultTrialHours: await getDefaultTrialHours() });
}

export async function PUT(request: NextRequest) {
  if (!(await requireGestorAuth(request))) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const hours = Number(body?.defaultTrialHours);
  if (!Number.isFinite(hours) || hours <= 0) {
    return NextResponse.json(
      { ok: false, message: "Valor inválido." },
      { status: 400 }
    );
  }
  await setDefaultTrialHours(hours);
  return NextResponse.json({ ok: true });
}
