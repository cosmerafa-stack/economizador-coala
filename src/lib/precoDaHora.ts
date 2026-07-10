import "server-only";
import { PriceResult, SortOption } from "./types";

const BASE_URL = "https://precodahora.ba.gov.br/produtos/";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const SESSION_TTL_MS = 10 * 60 * 1000;

interface Session {
  cookie: string;
  csrfToken: string;
  fetchedAt: number;
}

let cachedSession: Session | null = null;

function extractCsrfToken(html: string): string | null {
  const match = html.match(/name="csrf_token"[^>]*value="([^"]+)"/);
  return match ? match[1] : null;
}

async function bootstrapSession(): Promise<Session> {
  const response = await fetch(BASE_URL, {
    method: "GET",
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Falha ao iniciar sessão (status ${response.status})`);
  }

  const setCookies = response.headers.getSetCookie?.() ?? [];
  const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
  const html = await response.text();
  const csrfToken = extractCsrfToken(html);

  if (!cookie || !csrfToken) {
    throw new Error("Não foi possível obter sessão/csrf da fonte de preços");
  }

  return { cookie, csrfToken, fetchedAt: Date.now() };
}

async function ensureSession(forceRefresh = false): Promise<Session> {
  if (
    !forceRefresh &&
    cachedSession &&
    Date.now() - cachedSession.fetchedAt < SESSION_TTL_MS
  ) {
    return cachedSession;
  }
  cachedSession = await bootstrapSession();
  return cachedSession;
}

const SORT_TO_ORDENAR: Record<SortOption, string> = {
  preco_asc: "preco.asc",
  preco_desc: "preco.desc",
  distancia_asc: "distancia.asc",
  distancia_desc: "distancia.desc",
  mais_antigo: "data.asc",
  mais_proximo: "data.desc",
};

interface RawProduto {
  codProduto: string;
  gtin: number | null;
  descricao: string;
  precoLiquido: number;
  precoUnitario: number;
  data: string;
}

interface RawEstabelecimento {
  nomeEstabelecimento: string;
  endLogradouro: string;
  endNumero: string;
  bairro: string;
  cep: string;
  municipio: string;
  telefone: string;
  cnpj: number;
  latitude: number;
  longitude: number;
  distancia: number;
}

interface RawResultItem {
  produto: RawProduto;
  estabelecimento: RawEstabelecimento;
}

interface RawSearchResponse {
  codigo: number;
  descricao?: string;
  resultado?: RawResultItem[];
}

export interface SearchLivePriceParams {
  query: string;
  lat: number;
  lng: number;
  radiusKm: number;
  sort: SortOption;
  page?: number;
}

function mapResult(item: RawResultItem): PriceResult {
  const { produto, estabelecimento } = item;
  const address = `${produto ? "" : ""}${estabelecimento.endLogradouro} ${estabelecimento.endNumero} ${estabelecimento.bairro} ${estabelecimento.cep}, ${estabelecimento.municipio}`;

  return {
    id: `${produto.codProduto}-${estabelecimento.cnpj}-${produto.data}`,
    productName: produto.descricao.trim(),
    barcode: produto.gtin ? String(produto.gtin) : produto.codProduto,
    price: produto.precoLiquido ?? produto.precoUnitario,
    store: {
      id: String(estabelecimento.cnpj),
      name: estabelecimento.nomeEstabelecimento,
      address,
      city: estabelecimento.municipio,
      phone: estabelecimento.telefone,
      coordinates: {
        lat: estabelecimento.latitude,
        lng: estabelecimento.longitude,
      },
    },
    emittedAt: new Date(produto.data.replace(" ", "T")).toISOString(),
    distanceKm: estabelecimento.distancia,
  };
}

async function postSearch(
  params: SearchLivePriceParams,
  session: Session
): Promise<Response> {
  const body = new URLSearchParams({
    termo: params.query,
    horas: "72",
    latitude: String(params.lat),
    longitude: String(params.lng),
    raio: String(params.radiusKm),
    pagina: String(params.page ?? 1),
    ordenar: SORT_TO_ORDENAR[params.sort],
  });

  return fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": USER_AGENT,
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      Referer: BASE_URL,
      "X-CSRFToken": session.csrfToken,
      Cookie: session.cookie,
    },
    body: body.toString(),
    cache: "no-store",
  });
}

export class SourceUnavailableError extends Error {}

export async function searchLivePrices(
  params: SearchLivePriceParams
): Promise<PriceResult[]> {
  let session = await ensureSession();
  let response = await postSearch(params, session);

  if (response.status === 401) {
    session = await ensureSession(true);
    response = await postSearch(params, session);
  }

  if (response.status === 429) {
    throw new SourceUnavailableError("Limite de requisições atingido");
  }

  if (!response.ok) {
    throw new Error(`Fonte de preços retornou status ${response.status}`);
  }

  const data: RawSearchResponse = await response.json();

  if (data.codigo !== 80) {
    // codigo 80 = success; anything else (e.g. "nenhum parâmetro") means no usable results.
    return [];
  }

  return (data.resultado ?? []).map(mapResult);
}
