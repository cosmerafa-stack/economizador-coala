import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";

  if (!deviceId) {
    return NextResponse.json(
      { ok: false, message: "Dispositivo não identificado." },
      { status: 400 }
    );
  }

  await sql.query(
    `insert into community_price_confirmations (community_price_id, device_id)
     values ($1, $2)
     on conflict (community_price_id, device_id) do nothing`,
    [id, deviceId]
  );

  return NextResponse.json({ ok: true });
}
