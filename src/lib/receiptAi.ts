import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ExtractedNotaFields } from "./types";

export const isReceiptAiConfigured = Boolean(process.env.GEMINI_API_KEY);

const EXTRACTION_PROMPT = `Você recebe fotos de uma nota fiscal ou recibo (podem ser várias páginas do mesmo documento). Extraia as informações e responda APENAS com um JSON válido, sem texto adicional, no formato:

{
  "emitente": "nome da empresa/pessoa que emitiu",
  "destinatario": "nome de quem recebeu/comprou, ou vazio se não identificado",
  "dataEmissao": "YYYY-MM-DD ou null se não identificado",
  "valorTotal": numero ou null,
  "produtos": [
    { "descricao": "nome do produto/serviço", "quantidade": numero, "valorUnitario": numero ou null, "valorTotal": numero ou null }
  ],
  "camposExtras": [
    { "rotulo": "nome do campo encontrado", "valor": "valor lido" }
  ]
}

Em "produtos", crie um item para CADA produto/serviço individual que você localizar na nota, não agrupe itens diferentes.

Em "camposExtras", crie um item para CADA outra informação relevante que você encontrar na nota e que não se encaixe nos campos acima — por exemplo: CNPJ/CPF do emitente, número da nota/NFCe, chave de acesso, forma de pagamento, desconto, troco, endereço, telefone, número do cupom, série, etc. Não repita informação já capturada em emitente/destinatario/dataEmissao/valorTotal/produtos.

Se não conseguir identificar um campo, use null (ou string vazia para textos). Se não conseguir ler nenhum produto individualmente, retorne "produtos": []. Se não houver outras informações relevantes, retorne "camposExtras": [].`;

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    throw new Error("Formato de imagem inválido");
  }
  return { mimeType: match[1], base64: match[2] };
}

export async function extractNotaFields(
  photos: string[]
): Promise<ExtractedNotaFields> {
  if (!isReceiptAiConfigured) {
    throw new Error("IA de leitura de notas não configurada (GEMINI_API_KEY ausente)");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const imageParts = photos.map((photo) => {
    const { mimeType, base64 } = parseDataUrl(photo);
    return { inlineData: { mimeType, data: base64 } };
  });

  const result = await model.generateContent([
    ...imageParts,
    { text: EXTRACTION_PROMPT },
  ]);

  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Não foi possível interpretar a resposta da IA");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    emitente: parsed.emitente ?? "",
    destinatario: parsed.destinatario ?? "",
    dataEmissao: parsed.dataEmissao ?? null,
    valorTotal: typeof parsed.valorTotal === "number" ? parsed.valorTotal : null,
    produtos: Array.isArray(parsed.produtos)
      ? parsed.produtos.map((p: Record<string, unknown>) => ({
          descricao: String(p.descricao ?? ""),
          quantidade: typeof p.quantidade === "number" ? p.quantidade : 1,
          valorUnitario:
            typeof p.valorUnitario === "number" ? p.valorUnitario : null,
          valorTotal: typeof p.valorTotal === "number" ? p.valorTotal : null,
        }))
      : [],
    camposExtras: Array.isArray(parsed.camposExtras)
      ? parsed.camposExtras
          .map((c: Record<string, unknown>) => ({
            rotulo: String(c.rotulo ?? ""),
            valor: String(c.valor ?? ""),
          }))
          .filter((c: { rotulo: string; valor: string }) => c.rotulo && c.valor)
      : [],
  };
}
