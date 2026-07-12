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
  confirmations: string;
  confirmed_by_me: boolean;
}

function toPublic(row: Row): CommunityPrice {
  return {
    id: row.id,
    productName: row.product_name,
    price: Number(row.price),
    storeName: row.store_name,
    createdAt: row.created_at,
    confirmations: Number(row.confirmations),
    confirmedByMe: row.confirmed_by_me,
  };
}

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId") ?? "";

  const rows = (await sql.query(
    `select
       cp.id, cp.product_name, cp.price, cp.store_name, cp.created_at,
       count(cc.id) as confirmations,
       bool_or(cc.device_id = $1) as confirmed_by_me
     from community_prices cp
     left join community_price_confirmations cc on cc.community_price_id = cp.id
     group by cp.id
     order by cp.created_at desc
     limit 50`,
    [deviceId]
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
