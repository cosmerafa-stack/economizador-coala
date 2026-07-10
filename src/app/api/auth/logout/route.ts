import { NextRequest, NextResponse } from "next/server";
import { logout } from "@/lib/authStore.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token } = body ?? {};
  if (token) logout(token);
  return NextResponse.json({ ok: true });
}
