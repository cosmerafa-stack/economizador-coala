export type UserRole = "consumidor" | "revendedor" | "gestor";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  coordinates: Coordinates;
}

export interface PriceRecord {
  id: string;
  productName: string;
  barcode: string;
  price: number;
  store: Store;
  emittedAt: string; // ISO timestamp of the NFCe emission
}

export interface PriceResult extends PriceRecord {
  distanceKm: number;
}

export type SortOption =
  | "preco_asc"
  | "preco_desc"
  | "distancia_asc"
  | "distancia_desc"
  | "mais_antigo"
  | "mais_proximo"; // mais recente (data)

export interface CartItem {
  id: string;
  priceResult: PriceResult;
  profitPercent: number;
  resalePrice: number;
  grossProfit: number;
  quantity: number;
  addedAt: string;
}

export interface ResellerSettings {
  defaultProfitPercent: number;
}

export interface NotaProduto {
  descricao: string;
  quantidade: number;
  valorUnitario: number | null;
  valorTotal: number | null;
}

export interface NotaCampoExtra {
  rotulo: string;
  valor: string;
}

export interface Nota {
  id: string;
  emitente: string;
  destinatario: string;
  dataEmissao: string | null; // ISO date
  valorTotal: number | null;
  observacoes: string;
  produtos: NotaProduto[];
  camposExtras: NotaCampoExtra[];
  fotos: string[]; // compressed JPEG data URLs, one per page
  criadoEm: string; // ISO timestamp
}

export interface ExtractedNotaFields {
  emitente: string;
  destinatario: string;
  dataEmissao: string | null;
  valorTotal: number | null;
  produtos: NotaProduto[];
  camposExtras: NotaCampoExtra[];
}

export interface RevendedorAccountPublic {
  id: string;
  nome: string;
  sobrenome: string;
  telefone: string;
  email: string;
  approved: boolean;
  maxDevices: number;
  activeDevices: number;
  createdAt: string;
}
