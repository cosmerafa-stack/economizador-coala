import { NextRequest, NextResponse } from "next/server";
import { listActivityLog } from "@/lib/activityLog.server";
import { requireGestorAuth } from "@/lib/gestorAuth.server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await requireGestorAuth(request))) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  return NextResponse.json({ atividades: await listActivityLog() });
}
