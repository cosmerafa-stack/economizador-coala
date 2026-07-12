import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireRevendedorAccount } from "@/lib/revendedorAuth.server";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deviceId = request.nextUrl.searchParams.get("deviceId") ?? "";
  const accountId = await requireRevendedorAccount(request);

  await sql.query(
    "delete from price_alerts where id = $1 and (device_id = $2 or ($3::uuid is not null and account_id = $3))",
    [id, deviceId, accountId]
  );

  return NextResponse.json({ ok: true });
}
