import { NextRequest, NextResponse } from "next/server";
import { clearErrorLog, listErrorLog } from "@/lib/errorLog.server";
import { requireGestorAuth } from "@/lib/gestorAuth.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await requireGestorAuth(request))) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  return NextResponse.json({ logs: await listErrorLog() });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireGestorAuth(request))) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  await clearErrorLog();
  return NextResponse.json({ ok: true });
}
