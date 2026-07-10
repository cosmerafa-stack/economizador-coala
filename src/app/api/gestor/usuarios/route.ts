import { NextResponse } from "next/server";
import { listAccounts } from "@/lib/authStore.server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ usuarios: await listAccounts() });
}
