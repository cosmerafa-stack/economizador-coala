import { Coordinates, PriceRecord, PriceResult, Store } from "./types";
import { haversineDistanceKm } from "./geo";

// Salvador, BA — used as the fallback center when geolocation is unavailable.
export const DEFAULT_LOCATION: Coordinates = { lat: -12.9777, lng: -38.5016 };

const stores: Store[] = [
  {
    id: "st-01",
    name: "ALMACEN PEPE HORTO",
    address: "AVENIDA SANTA LUZIA 000985 HORTO FLORESTAL 40295050, SALVADOR",
    city: "Salvador",
    phone: "7132518050",
    coordinates: { lat: -12.9977, lng: -38.4772 },
  },
  {
    id: "st-02",
    name: "SUPERMERCADO BOMPREÇO PITUBA",
    address: "AVENIDA PAULO VI 0125 PITUBA 41810000, SALVADOR",
    city: "Salvador",
    phone: "7133498200",
    coordinates: { lat: -12.9865, lng: -38.4489 },
  },
  {
    id: "st-03",
    name: "ATACADÃO ATAKAREJO PARALELA",
    address: "AVENIDA LUIS VIANA FILHO 8812 PARALELA 41730101, SALVADOR",
    city: "Salvador",
    phone: "7133711200",
    coordinates: { lat: -12.9478, lng: -38.4453 },
  },
  {
    id: "st-04",
    name: "MERCADO EXTRA BARRA",
    address: "AVENIDA CENTENARIO 2992 BARRA 40155080, SALVADOR",
    city: "Salvador",
    phone: "7132648800",
    coordinates: { lat: -13.0088, lng: -38.5288 },
  },
  {
    id: "st-05",
    name: "SUPER NAZARE CAMPO GRANDE",
    address: "AVENIDA JOANA ANGELICA 0540 NAZARE 40050410, SALVADOR",
    city: "Salvador",
    phone: "7132420033",
    coordinates: { lat: -12.9702, lng: -38.5115 },
  },
  {
    id: "st-06",
    name: "HIPER IDEAL LAURO DE FREITAS",
    address: "ESTRADA DO COCO 2500 CENTRO 42700000, LAURO DE FREITAS",
    city: "Lauro de Freitas",
    phone: "7133754500",
    coordinates: { lat: -12.8944, lng: -38.3272 },
  },
  {
    id: "st-07",
    name: "SUPERMERCADO G. BARBOSA CAMAÇARI",
    address: "AVENIDA CENTRO ADMINISTRATIVO 100 CENTRO 42800000, CAMAÇARI",
    city: "Camaçari",
    phone: "7136212233",
    coordinates: { lat: -12.6989, lng: -38.3245 },
  },
  {
    id: "st-08",
    name: "ATACADO FEIRA DE SANTANA",
    address: "AVENIDA MARIA QUITERIA 400 CENTRO 44001000, FEIRA DE SANTANA",
    city: "Feira de Santana",
    phone: "7532210099",
    coordinates: { lat: -12.2664, lng: -38.9663 }, // ~130km away, used to prove radius filtering
  },
];

function hoursAgo(hours: number, minutes = 0, seconds = 0): string {
  return new Date(
    Date.now() - (hours * 3600 + minutes * 60 + seconds) * 1000
  ).toISOString();
}

const rawRecords: PriceRecord[] = [
  // Manteiga Paysan Breton — barcode 3184030011629
  {
    id: "pr-01",
    productName: "MANTEIGA COM SAL PAYSAN BRETON 200GR 1X200GR",
    barcode: "3184030011629",
    price: 28.49,
    store: stores[0],
    emittedAt: hoursAgo(20, 14, 43),
  },
  {
    id: "pr-02",
    productName: "MANTEIGA COM SAL PAYSAN BRETON 200GR 1X200GR",
    barcode: "3184030011629",
    price: 31.9,
    store: stores[1],
    emittedAt: hoursAgo(5, 2, 10),
  },
  {
    id: "pr-03",
    productName: "MANTEIGA COM SAL PAYSAN BRETON 200GR 1X200GR",
    barcode: "3184030011629",
    price: 34.5,
    store: stores[2],
    emittedAt: hoursAgo(1, 40, 5),
  },
  {
    id: "pr-04",
    productName: "MANTEIGA COM SAL PAYSAN BRETON 200GR 1X200GR",
    barcode: "3184030011629",
    price: 58.99,
    store: stores[3],
    emittedAt: hoursAgo(48, 0, 0),
  },
  {
    id: "pr-05",
    productName: "MANTEIGA COM SAL PAYSAN BRETON 200GR 1X200GR",
    barcode: "3184030011629",
    price: 29.9,
    store: stores[4],
    emittedAt: hoursAgo(72, 30, 0),
  },
  {
    id: "pr-06",
    productName: "MANTEIGA COM SAL PAYSAN BRETON 200GR 1X200GR",
    barcode: "3184030011629",
    price: 27.9,
    store: stores[5],
    emittedAt: hoursAgo(3, 5, 0),
  },
  {
    id: "pr-07",
    productName: "MANTEIGA COM SAL PAYSAN BRETON 200GR 1X200GR",
    barcode: "3184030011629",
    price: 30.0,
    store: stores[6],
    emittedAt: hoursAgo(10, 0, 0),
  },
  {
    id: "pr-08",
    productName: "MANTEIGA COM SAL PAYSAN BRETON 200GR 1X200GR",
    barcode: "3184030011629",
    price: 24.99,
    store: stores[7], // out of 30km radius from Salvador center
    emittedAt: hoursAgo(2, 0, 0),
  },

  // Arroz Tio João 1kg
  {
    id: "pr-09",
    productName: "ARROZ BRANCO TIPO 1 TIO JOAO 1KG",
    barcode: "7896006715001",
    price: 6.49,
    store: stores[1],
    emittedAt: hoursAgo(6, 0, 0),
  },
  {
    id: "pr-10",
    productName: "ARROZ BRANCO TIPO 1 TIO JOAO 1KG",
    barcode: "7896006715001",
    price: 5.99,
    store: stores[2],
    emittedAt: hoursAgo(1, 10, 0),
  },
  {
    id: "pr-11",
    productName: "ARROZ BRANCO TIPO 1 TIO JOAO 1KG",
    barcode: "7896006715001",
    price: 7.2,
    store: stores[4],
    emittedAt: hoursAgo(15, 0, 0),
  },

  // Coca-Cola 2L
  {
    id: "pr-12",
    productName: "REFRIGERANTE COCA-COLA 2L",
    barcode: "7894900011517",
    price: 9.49,
    store: stores[0],
    emittedAt: hoursAgo(4, 0, 0),
  },
  {
    id: "pr-13",
    productName: "REFRIGERANTE COCA-COLA 2L",
    barcode: "7894900011517",
    price: 10.99,
    store: stores[3],
    emittedAt: hoursAgo(9, 0, 0),
  },
  {
    id: "pr-14",
    productName: "REFRIGERANTE COCA-COLA 2L",
    barcode: "7894900011517",
    price: 8.9,
    store: stores[5],
    emittedAt: hoursAgo(0, 40, 0),
  },

  // Azeite Gallo 500ml
  {
    id: "pr-15",
    productName: "AZEITE DE OLIVA EXTRA VIRGEM GALLO 500ML",
    barcode: "5601252005121",
    price: 34.9,
    store: stores[1],
    emittedAt: hoursAgo(30, 0, 0),
  },
  {
    id: "pr-16",
    productName: "AZEITE DE OLIVA EXTRA VIRGEM GALLO 500ML",
    barcode: "5601252005121",
    price: 29.99,
    store: stores[6],
    emittedAt: hoursAgo(12, 0, 0),
  },
];

export interface SearchParams {
  query: string;
  location: Coordinates;
  radiusKm?: number;
}

function matches(record: PriceRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (/^\d{6,}$/.test(q)) {
    return record.barcode === q;
  }
  return record.productName.toLowerCase().includes(q);
}

export function searchProducts({
  query,
  location,
  radiusKm = 30,
}: SearchParams): PriceResult[] {
  return rawRecords
    .filter((record) => matches(record, query))
    .map((record) => ({
      ...record,
      distanceKm: haversineDistanceKm(location, record.store.coordinates),
    }))
    .filter((result) => result.distanceKm <= radiusKm)
    .sort((a, b) => a.price - b.price);
}
