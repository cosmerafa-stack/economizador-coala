import { NextRequest, NextResponse } from "next/server";
import { extractNotaFields, isReceiptAiConfigured } from "@/lib/receiptAi";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isReceiptAiConfigured) {
    return NextResponse.json({
      aiAvailable: false,
      fields: null,
      message:
        "IA de leitura de notas não configurada. Preencha os campos manualmente.",
    });
  }

  const body = await request.json();
  const photos: string[] = Array.isArray(body?.photos) ? body.photos : [];

  if (photos.length === 0) {
    return NextResponse.json(
      { aiAvailable: true, fields: null, message: "Nenhuma foto enviada" },
      { status: 400 }
    );
  }

  try {
    const fields = await extractNotaFields(photos);
    return NextResponse.json({ aiAvailable: true, fields, message: null });
  } catch {
    return NextResponse.json({
      aiAvailable: true,
      fields: null,
      message: "Não foi possível ler a nota automaticamente. Preencha os campos manualmente.",
    });
  }
}
