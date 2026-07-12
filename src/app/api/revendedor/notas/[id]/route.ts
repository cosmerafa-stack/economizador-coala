import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireRevendedorAccount } from "@/lib/revendedorAuth.server";
import { NotaProduto } from "@/lib/types";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await requireRevendedorAccount(request);
  if (!accountId) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  const { id } = await params;

  await sql.query("delete from revendedor_notas where id = $1 and account_id = $2", [
    id,
    accountId,
  ]);

  return NextResponse.json({ ok: true });
}

// Updates a single product line inside a nota (the inline-edit feature),
// without needing to resend the whole nota including its photos.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = await requireRevendedorAccount(request);
  if (!accountId) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const index = Number(body?.index);
  const changes = body?.changes as Partial<NotaProduto> | undefined;

  if (!Number.isInteger(index) || index < 0 || !changes) {
    return NextResponse.json({ message: "Requisição inválida." }, { status: 400 });
  }

  const rows = (await sql.query(
    "select produtos from revendedor_notas where id = $1 and account_id = $2",
    [id, accountId]
  )) as { produtos: NotaProduto[] }[];

  const nota = rows[0];
  if (!nota) {
    return NextResponse.json({ message: "Nota não encontrada." }, { status: 404 });
  }

  const produtos = nota.produtos.map((p, i) => (i === index ? { ...p, ...changes } : p));

  await sql.query(
    "update revendedor_notas set produtos = $1 where id = $2 and account_id = $3",
    [JSON.stringify(produtos), id, accountId]
  );

  return NextResponse.json({ ok: true });
}
