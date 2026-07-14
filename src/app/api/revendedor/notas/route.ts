import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { requireRevendedorAccount } from "@/lib/revendedorAuth.server";
import { readJsonWithSizeLimit, tooLargeResponse } from "@/lib/requestLimits.server";
import { Nota } from "@/lib/types";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL as string);

interface NotaRow {
  id: string;
  emitente: string;
  destinatario: string;
  data_emissao: string | null;
  valor_total: string | null;
  observacoes: string;
  produtos: Nota["produtos"];
  campos_extras: Nota["camposExtras"];
  fotos: string[];
  criado_em: string;
}

function toPublic(row: NotaRow): Nota {
  return {
    id: row.id,
    emitente: row.emitente,
    destinatario: row.destinatario,
    dataEmissao: row.data_emissao,
    valorTotal: row.valor_total != null ? Number(row.valor_total) : null,
    observacoes: row.observacoes,
    produtos: row.produtos,
    camposExtras: row.campos_extras,
    fotos: row.fotos,
    criadoEm: row.criado_em,
  };
}

export async function GET(request: NextRequest) {
  const accountId = await requireRevendedorAccount(request);
  if (!accountId) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const rows = (await sql.query(
    "select * from revendedor_notas where account_id = $1 order by criado_em desc",
    [accountId]
  )) as NotaRow[];

  return NextResponse.json({ notas: rows.map(toPublic) });
}

export async function POST(request: NextRequest) {
  const accountId = await requireRevendedorAccount(request);
  if (!accountId) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const parsed = await readJsonWithSizeLimit(request);
  if (!parsed.ok) {
    return tooLargeResponse();
  }
  const body = parsed.body as { nota?: Nota } | null;
  const nota: Nota | undefined = body?.nota;
  if (!nota?.id) {
    return NextResponse.json({ message: "Nota inválida." }, { status: 400 });
  }

  await sql.query(
    `insert into revendedor_notas
       (id, account_id, emitente, destinatario, data_emissao, valor_total, observacoes, produtos, campos_extras, fotos, criado_em)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     on conflict (id) do nothing`,
    [
      nota.id,
      accountId,
      nota.emitente,
      nota.destinatario,
      nota.dataEmissao,
      nota.valorTotal,
      nota.observacoes,
      JSON.stringify(nota.produtos),
      JSON.stringify(nota.camposExtras),
      JSON.stringify(nota.fotos),
      nota.criadoEm,
    ]
  );

  return NextResponse.json({ ok: true });
}
