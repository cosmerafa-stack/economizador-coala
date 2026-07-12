import "server-only";
import { neon } from "@neondatabase/serverless";
import { searchPrices } from "@/lib/precoDaHora";
import { DEFAULT_LOCATION } from "@/lib/mockData";
import { PriceResult } from "@/lib/types";

const sql = neon(process.env.DATABASE_URL as string);

export const DEFAULT_ALERT_CHECK_INTERVAL_MINUTES = 15;
export const MIN_ALERT_CHECK_INTERVAL_MINUTES = 5;
export const MAX_ALERT_CHECK_INTERVAL_MINUTES = 24 * 60;

// An alert claiming "found" should mean the price is real and recent
// enough to act on — not a 3-day-old invoice pulled from a rate-limit
// fallback cache. A match only counts if all three hold:
const MAX_EMITTED_AGE_MS = 24 * 60 * 60 * 1000; // invoice itself issued within last 24h
const MIN_OUTLIER_RATIO = 0.2; // cheapest can't be < 20% of the 2nd cheapest when we have one to compare

function looksLikeOutlier(results: PriceResult[]): boolean {
  if (results.length < 2) return false;
  const [cheapest, second] = results;
  if (second.price <= 0) return false;
  return cheapest.price / second.price < MIN_OUTLIER_RATIO;
}

interface CheckAlertsParams {
  /** Limit the sweep to one device's alerts — always evaluated immediately
   * (screen-open check), ignoring the device's configured interval. */
  deviceId?: string;
  /** Limit the sweep to a single alert — always evaluated immediately (the
   * "Verificar agora" button), ignoring the configured interval. */
  alertId?: string;
  /** Search origin — defaults to Salvador when the caller has no real
   * location (e.g. the cross-device cron sweep, which has no single user
   * location to use). */
  lat?: number;
  lng?: number;
  /** Search radius in km — defaults to 50 for the same reason as above. */
  radiusKm?: number;
}

interface ActiveAlertRow {
  id: string;
  query: string;
  target_price: string;
  device_id: string;
  last_checked_at: string | null;
  interval_minutes: number;
}

// Checks still-active alerts against the current price, searching within
// the given radius from the given location — the same km the user actually
// configured for search, not a hardcoded stand-in. Called: (a) whenever the
// device opens the Alerts screen, scoped to its own alerts and location,
// always immediate; (b) on demand via the per-alert "Verificar agora"
// button, always immediate; (c) as a cross-device sweep via
// /api/beta/alertas/verificar — this is the only path that throttles each
// alert to its device's configured check interval (default 15 min, set in
// Configurações), since it's meant to be hit by an external scheduler on a
// short, fixed heartbeat (e.g. every 5 min) regardless of what interval
// each device actually wants.
export async function checkAlerts(params: CheckAlertsParams = {}): Promise<void> {
  const lat = params.lat ?? DEFAULT_LOCATION.lat;
  const lng = params.lng ?? DEFAULT_LOCATION.lng;
  const radiusKm = params.radiusKm ?? 50;
  const isBackgroundSweep = !params.deviceId && !params.alertId;

  const active = (
    params.alertId
      ? await sql.query(
          `select a.id, a.query, a.target_price, a.device_id, a.last_checked_at,
                  coalesce(s.alert_check_interval_minutes, $2) as interval_minutes
           from price_alerts a
           left join device_settings s on s.device_id = a.device_id
           where a.id = $1 and a.active = true`,
          [params.alertId, DEFAULT_ALERT_CHECK_INTERVAL_MINUTES]
        )
      : params.deviceId
        ? await sql.query(
            `select a.id, a.query, a.target_price, a.device_id, a.last_checked_at,
                    coalesce(s.alert_check_interval_minutes, $2) as interval_minutes
             from price_alerts a
             left join device_settings s on s.device_id = a.device_id
             where a.device_id = $1 and a.active = true`,
            [params.deviceId, DEFAULT_ALERT_CHECK_INTERVAL_MINUTES]
          )
        : await sql.query(
            `select a.id, a.query, a.target_price, a.device_id, a.last_checked_at,
                    coalesce(s.alert_check_interval_minutes, $1) as interval_minutes
             from price_alerts a
             left join device_settings s on s.device_id = a.device_id
             where a.active = true`,
            [DEFAULT_ALERT_CHECK_INTERVAL_MINUTES]
          )
  ) as ActiveAlertRow[];

  for (const alert of active) {
    if (isBackgroundSweep && alert.last_checked_at) {
      const dueAt =
        new Date(alert.last_checked_at).getTime() + alert.interval_minutes * 60 * 1000;
      if (Date.now() < dueAt) continue;
    }

    try {
      const { results, source } = await searchPrices({
        query: alert.query,
        lat,
        lng,
        radiusKm,
        sort: "preco_asc",
      });

      if (isBackgroundSweep) {
        await sql.query("update price_alerts set last_checked_at = now() where id = $1", [
          alert.id,
        ]);
      }

      // Never trust a rate-limit fallback cache (up to 24h stale on top of
      // the invoice window) to trigger a "go buy it now" alert.
      if (source !== "live") continue;

      const cheapest = results[0];
      if (!cheapest || cheapest.price > Number(alert.target_price)) continue;
      if (looksLikeOutlier(results)) continue;

      const emittedAt = new Date(cheapest.emittedAt);
      if (Date.now() - emittedAt.getTime() > MAX_EMITTED_AGE_MS) continue;

      await sql.query(
        `update price_alerts
         set active = false, triggered_at = now(), triggered_store_name = $1,
             triggered_price = $2, triggered_emitted_at = $3,
             triggered_store_address = $4, triggered_store_phone = $5,
             triggered_store_lat = $6, triggered_store_lng = $7
         where id = $8`,
        [
          cheapest.store.name,
          cheapest.price,
          cheapest.emittedAt,
          cheapest.store.address,
          cheapest.store.phone,
          cheapest.store.coordinates.lat,
          cheapest.store.coordinates.lng,
          alert.id,
        ]
      );
    } catch {
      // best-effort — one failing alert shouldn't block the others
    }
  }
}
