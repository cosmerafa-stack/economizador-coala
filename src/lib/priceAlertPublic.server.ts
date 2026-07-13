import "server-only";
import { PriceAlert } from "@/lib/types";

export interface PriceAlertRow {
  id: string;
  query: string;
  product_name: string | null;
  target_price: string;
  active: boolean;
  triggered_at: string | null;
  triggered_store_name: string | null;
  triggered_store_address: string | null;
  triggered_store_phone: string | null;
  triggered_store_lat: number | null;
  triggered_store_lng: number | null;
  triggered_price: string | null;
  triggered_emitted_at: string | null;
  created_at: string;
}

export function toPublicAlert(row: PriceAlertRow): PriceAlert {
  return {
    id: row.id,
    query: row.query,
    productName: row.product_name,
    targetPrice: Number(row.target_price),
    active: row.active,
    triggeredAt: row.triggered_at,
    triggeredStoreName: row.triggered_store_name,
    triggeredStoreAddress: row.triggered_store_address,
    triggeredStorePhone: row.triggered_store_phone,
    triggeredStoreLat: row.triggered_store_lat,
    triggeredStoreLng: row.triggered_store_lng,
    triggeredPrice: row.triggered_price ? Number(row.triggered_price) : null,
    triggeredEmittedAt: row.triggered_emitted_at,
    createdAt: row.created_at,
  };
}
