import { NextRequest, NextResponse } from "next/server";
import { heartbeat } from "@/lib/authStore.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token } = body ?? {};
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const ok = heartbeat(token);
  return NextResponse.json({ ok });
}
