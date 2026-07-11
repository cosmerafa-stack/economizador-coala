import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { CommunityPrice } from "@/lib/types";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

interface Row {
  id: string;
  product_name: string;
  price: string;
  store_name: string;
  created_at: string;
}

function toPublic(row: Row): CommunityPrice {
  return {
    id: row.id,
    productName: row.product_name,
    price: Number(row.price),
    storeName: row.store_name,
    createdAt: row.created_at,
  };
}

export async function GET() {
  const rows = (await sql.query(
    "select id, product_name, price, store_name, created_at from community_prices order by created_at desc limit 50"
  )) as Row[];
  return NextResponse.json({ precos: rows.map(toPublic) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { deviceId, productName, price, storeName } = body ?? {};

  if (!deviceId || !productName || !storeName || !Number.isFinite(Number(price))) {
    return NextResponse.json(
      { ok: false, message: "Preencha produto, preço e loja." },
      { status: 400 }
    );
  }

  await sql.query(
    "insert into community_prices (product_name, price, store_name, device_id) values ($1, $2, $3, $4)",
    [String(productName).trim(), Number(price), String(storeName).trim(), deviceId]
  );

  return NextResponse.json({ ok: true });
}
