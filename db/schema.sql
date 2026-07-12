-- Economizador Coala — Neon Postgres schema
-- Revendedor accounts, approval workflow and device-limited sessions.

create extension if not exists pgcrypto;

create table if not exists revendedor_accounts (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sobrenome text not null,
  telefone text not null,
  email text not null unique,
  password_hash text not null,
  approved boolean not null default false,
  max_devices integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists revendedor_sessions (
  token text primary key,
  account_id uuid not null references revendedor_accounts (id) on delete cascade,
  device_id text not null,
  login_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists revendedor_sessions_account_idx on revendedor_sessions (account_id);
create index if not exists revendedor_sessions_device_idx on revendedor_sessions (device_id);

-- Preço da Hora scraper: shared session + short-lived results cache.
-- Cloudflare Workers don't keep in-memory module state across requests
-- reliably, so this state has to live in the database instead.
create table if not exists scrape_session (
  id smallint primary key default 1,
  cookie text not null,
  csrf_token text not null,
  fetched_at timestamptz not null default now(),
  constraint scrape_session_singleton check (id = 1)
);

create table if not exists price_search_cache (
  cache_key text primary key,
  query text not null,
  results jsonb not null,
  fetched_at timestamptz not null default now()
);
create index if not exists price_search_cache_fetched_idx on price_search_cache (fetched_at desc);

-- ===================== Área Beta (experimental) =====================

-- Appends one row per product/store every time a live search succeeds,
-- so we can show price trends over time (unlike price_search_cache,
-- which only keeps the latest snapshot per query).
create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  product_name text not null,
  store_id text not null,
  store_name text not null,
  price numeric(10, 2) not null,
  recorded_at timestamptz not null default now()
);
create index if not exists price_history_query_idx on price_history (query, recorded_at desc);

-- Price-target alerts. Scoped by deviceId (not account) since consumidor
-- doesn't have login — mirrors the deviceId already used for revendedor
-- session/device limiting.
create table if not exists price_alerts (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  query text not null,
  target_price numeric(10, 2) not null,
  active boolean not null default true,
  triggered_at timestamptz,
  triggered_store_name text,
  triggered_store_address text,
  triggered_store_phone text,
  triggered_store_lat double precision,
  triggered_store_lng double precision,
  triggered_price numeric(10, 2),
  -- When the matched nota fiscal was actually issued, as opposed to
  -- triggered_at (when our system happened to check) — the two can be
  -- days apart since the price source is invoice history, not live stock.
  triggered_emitted_at timestamptz,
  -- Last time the background sweep actually evaluated this alert (not just
  -- when the app happened to be open) — used to throttle each alert to its
  -- device's configured check interval.
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Per-device preferences that only make sense server-side, since the
-- background alert sweep runs with no per-device client context.
create table if not exists device_settings (
  device_id text primary key,
  alert_check_interval_minutes integer not null default 15,
  updated_at timestamptz not null default now()
);
create index if not exists price_alerts_device_idx on price_alerts (device_id);

-- Manually reported prices ("preço colaborativo"). Not merged into the
-- official search results yet — shown as its own feed inside the Beta area.
create table if not exists community_prices (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  price numeric(10, 2) not null,
  store_name text not null,
  device_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists community_prices_created_idx on community_prices (created_at desc);

-- Lets a second device confirm ("verify") a manually reported price, so the
-- feed can surface a trust signal beyond "someone typed this once".
create table if not exists community_price_confirmations (
  id uuid primary key default gen_random_uuid(),
  community_price_id uuid not null references community_prices (id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  unique (community_price_id, device_id)
);
create index if not exists community_price_confirmations_price_idx on community_price_confirmations (community_price_id);
