import { NextRequest, NextResponse } from "next/server";
import { markTutorialPromptShown } from "@/lib/authStore.server";
import { requireRevendedorAccount } from "@/lib/revendedorAuth.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const accountId = await requireRevendedorAccount(request);
  if (!accountId) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }
  const ok = await markTutorialPromptShown(accountId);
  return NextResponse.json({ ok });
}
