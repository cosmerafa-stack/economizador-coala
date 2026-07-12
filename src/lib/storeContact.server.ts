import "server-only";

export interface StoreContactResult {
  phone: string;
  /** true only when a source explicitly identifies the number as WhatsApp
   * (e.g. an OSM `contact:whatsapp` tag) — never asserted for a plain
   * registered phone number, which may or may not have WhatsApp at all. */
  confirmed: boolean;
  source: "osm" | "brasilapi" | "receitaws";
}

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; EconomizadorCoala/1.0)",
  Accept: "application/json",
};

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(ltda|eireli|me|s\/a|sa|epp|comercio|de|do|da)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  const firstWordA = na.split(" ")[0];
  const firstWordB = nb.split(" ")[0];
  return (
    na.includes(nb) ||
    nb.includes(na) ||
    (firstWordA.length > 2 && (na.includes(firstWordB) || nb.includes(firstWordA)))
  );
}

interface OverpassElement {
  tags?: Record<string, string>;
}

// Tries OpenStreetMap first: a `contact:whatsapp` tag is a human explicitly
// marking that number as WhatsApp — the closest thing to a free, confirmed
// signal. Coverage for small Brazilian stores is sparse, so this is
// expected to miss often; that's fine, it's the highest-confidence tier.
export async function lookupOsmWhatsapp(
  lat: number,
  lng: number,
  storeName: string
): Promise<StoreContactResult | null> {
  try {
    const query = `[out:json][timeout:10];(node(around:250,${lat},${lng});way(around:250,${lat},${lng}););out body;`;
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        ...FETCH_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { elements: OverpassElement[] };
    for (const el of data.elements) {
      const tags = el.tags;
      const whatsapp = tags?.["contact:whatsapp"];
      const name = tags?.name;
      if (whatsapp && name && namesLikelyMatch(name, storeName)) {
        const digits = whatsapp.replace(/\D/g, "");
        if (digits.length >= 10) {
          return { phone: digits, confirmed: true, source: "osm" };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

interface BrasilApiCnpjResponse {
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
}

// Registered commercial phone from the Receita Federal registry (via
// BrasilAPI's free, keyless proxy) — real data, but not confirmed WhatsApp.
export async function lookupBrasilApi(cnpj: string): Promise<StoreContactResult | null> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as BrasilApiCnpjResponse;
    const phone = (data.ddd_telefone_1 || data.ddd_telefone_2 || "").replace(/\D/g, "");
    if (phone.length < 10) return null;

    return { phone, confirmed: false, source: "brasilapi" };
  } catch {
    return null;
  }
}

interface ReceitaWsResponse {
  telefone?: string;
  status?: string;
}

// Second free CNPJ registry, tried when BrasilAPI has no phone on file for
// that establishment. Same registered-phone caveat as above.
export async function lookupReceitaWs(cnpj: string): Promise<StoreContactResult | null> {
  try {
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as ReceitaWsResponse;
    if (data.status === "ERROR") return null;

    const phone = (data.telefone || "").replace(/\D/g, "");
    if (phone.length < 10) return null;

    return { phone, confirmed: false, source: "receitaws" };
  } catch {
    return null;
  }
}

export async function findStoreContact(params: {
  cnpj: string;
  lat: number;
  lng: number;
  storeName: string;
}): Promise<StoreContactResult | null> {
  const { cnpj, lat, lng, storeName } = params;

  const osm = await lookupOsmWhatsapp(lat, lng, storeName);
  if (osm) return osm;

  const brasilApi = await lookupBrasilApi(cnpj);
  if (brasilApi) return brasilApi;

  return lookupReceitaWs(cnpj);
}
