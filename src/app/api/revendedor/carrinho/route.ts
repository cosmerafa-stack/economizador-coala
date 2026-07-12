import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireRevendedorAccount } from "@/lib/revendedorAuth.server";
import { CartItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

interface CartRow {
  id: string;
  price_result: CartItem["priceResult"];
  profit_percent: string;
  resale_price: string;
  gross_profit: string;
  quantity: number;
  added_at: string;
}

function toPublic(row: CartRow): CartItem {
  return {
    id: row.id,
    priceResult: row.price_result,
    profitPercent: Number(row.profit_percent),
    resalePrice: Number(row.resale_price),
    grossProfit: Number(row.gross_profit),
    quantity: row.quantity,
    addedAt: row.added_at,
  };
}

export async function GET(request: NextRequest) {
  const accountId = await requireRevendedorAccount(request);
  if (!accountId) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const rows = (await sql.query(
    "select * from revendedor_cart_items where account_id = $1 order by added_at asc",
    [accountId]
  )) as CartRow[];

  return NextResponse.json({ cart: rows.map(toPublic) });
}

// Replaces the whole cart snapshot for this account — simplest correct
// sync model given the client already holds the full array in memory.
export async function PUT(request: NextRequest) {
  const accountId = await requireRevendedorAccount(request);
  if (!accountId) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const cart: CartItem[] = Array.isArray(body?.cart) ? body.cart : [];

  await sql.query("delete from revendedor_cart_items where account_id = $1", [accountId]);

  if (cart.length > 0) {
    const values: string[] = [];
    const params: unknown[] = [];
    cart.forEach((item, i) => {
      const base = i * 8;
      values.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`
      );
      params.push(
        item.id,
        accountId,
        JSON.stringify(item.priceResult),
        item.profitPercent,
        item.resalePrice,
        item.grossProfit,
        item.quantity,
        item.addedAt
      );
    });
    await sql.query(
      `insert into revendedor_cart_items
         (id, account_id, price_result, profit_percent, resale_price, gross_profit, quantity, added_at)
       values ${values.join(",")}`,
      params
    );
  }

  return NextResponse.json({ ok: true });
}
