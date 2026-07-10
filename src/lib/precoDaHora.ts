import "server-only";
import { neon } from "@neondatabase/serverless";
import { haversineDistanceKm } from "./geo";
import { sortResults } from "./sort";
import { Coordinates, PriceResult, SortOption } from "./types";

const sql = neon(process.env.DATABASE_URL as string);

const BASE_URL = "https://precodahora.ba.gov.br/produtos/";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const SESSION_TTL_MS = 10 * 60 * 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // stale cache is only used as a last-resort fallback

interface Session {
  cookie: string;
  csrfToken: string;
  fetchedAt: number;
}

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

  const session: Session = { cookie, csrfToken, fetchedAt: Date.now() };

  await sql.query(
    `insert into scrape_session (id, cookie, csrf_token, fetched_at)
     values (1, $1, $2, now())
     on conflict (id) do update set cookie = $1, csrf_token = $2, fetched_at = now()`,
    [session.cookie, session.csrfToken]
  );

  return session;
}

// Cloudflare Workers don't reliably keep in-memory module state across
// requests (each invocation may land on a fresh isolate), so the session
// is persisted in Postgres instead — this keeps us to ~1 bootstrap every
// 10 minutes instead of one per search, which is what was tripping the
// upstream rate limit after moving off a long-lived Node process.
async function ensureSession(forceRefresh = false): Promise<Session> {
  if (!forceRefresh) {
    const rows = (await sql.query(
      "select cookie, csrf_token, fetched_at from scrape_session where id = 1"
    )) as { cookie: string; csrf_token: string; fetched_at: string }[];
    const row = rows[0];
    if (row && Date.now() - new Date(row.fetched_at).getTime() < SESSION_TTL_MS) {
      return {
        cookie: row.cookie,
        csrfToken: row.csrf_token,
        fetchedAt: new Date(row.fetched_at).getTime(),
      };
    }
  }
  return bootstrapSession();
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

function normalizeCacheKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

async function readCache(query: string): Promise<{ results: PriceResult[]; fetchedAt: string } | null> {
  const rows = (await sql.query(
    "select results, fetched_at from price_search_cache where cache_key = $1",
    [normalizeCacheKey(query)]
  )) as { results: PriceResult[]; fetched_at: string }[];
  const row = rows[0];
  if (!row) return null;
  if (Date.now() - new Date(row.fetched_at).getTime() > CACHE_TTL_MS) return null;
  return { results: row.results, fetchedAt: row.fetched_at };
}

async function writeCache(query: string, results: PriceResult[]): Promise<void> {
  await sql.query(
    `insert into price_search_cache (cache_key, query, results, fetched_at)
     values ($1, $2, $3, now())
     on conflict (cache_key) do update set results = $3, query = $2, fetched_at = now()`,
    [normalizeCacheKey(query), query, JSON.stringify(results)]
  );
}

export type SearchSource = "live" | "cache" | "unavailable";

export interface SearchResponse {
  results: PriceResult[];
  source: SearchSource;
  cachedAt?: string;
}

// Tries the live scrape first; if the upstream is unavailable (rate limited
// or erroring), falls back to the last successful results for this same
// query term, with distances recalculated for the caller's current location.
export async function searchPrices(
  params: SearchLivePriceParams
): Promise<SearchResponse> {
  try {
    const results = await searchLivePrices(params);
    writeCache(params.query, results).catch(() => {});
    return { results, source: "live" };
  } catch (err) {
    const cached = await readCache(params.query).catch(() => null);
    if (!cached) {
      if (err instanceof SourceUnavailableError) {
        return { results: [], source: "unavailable" };
      }
      throw err;
    }

    const location: Coordinates = { lat: params.lat, lng: params.lng };
    const recalculated = cached.results
      .map((item) => ({
        ...item,
        distanceKm: haversineDistanceKm(location, item.store.coordinates),
      }))
      .filter((item) => item.distanceKm <= params.radiusKm);

    return {
      results: sortResults(recalculated, params.sort),
      source: "cache",
      cachedAt: cached.fetchedAt,
    };
  }
}
