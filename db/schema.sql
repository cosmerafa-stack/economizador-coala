-- Economizador Coala — Neon Postgres schema
-- Revendedor accounts, approval workflow and device-limited sessions.

create extension if not exists pgcrypto;

-- Brute-force / spam throttling for auth endpoints. Backed by Postgres
-- (not in-memory) because Cloudflare Workers isolates don't share memory
-- across requests — same reason scrape_session lives here too.
create table if not exists rate_limit_buckets (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

-- Server-side errors worth the gestor knowing about (e.g. the price
-- source failing/timing out) — surfaced in the área do gestor.
create table if not exists error_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  route text not null,
  message text not null,
  stack text,
  context jsonb
);
create index if not exists error_log_created_at_idx on error_log (created_at desc);

-- Audit trail of gestor actions (approve, create/disable/extend demo
-- users, config changes, etc.) — also surfaced in the área do gestor.
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor text not null default 'gestor',
  action text not null,
  details jsonb
);
create index if not exists activity_log_created_at_idx on activity_log (created_at desc);

create table if not exists revendedor_accounts (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sobrenome text not null,
  telefone text not null,
  email text not null unique,
  password_hash text not null,
  approved boolean not null default false,
  max_devices integer not null default 1,
  created_at timestamptz not null default now(),
  -- Set when the account was created/linked via "Continuar com o Google" —
  -- password_hash still gets a random unusable value for these so the
  -- column stays not-null without enabling a password login path.
  google_sub text unique,
  avatar_url text,
  -- Demo/trial accounts created by the gestor (username in the email
  -- column, no real e-mail). expires_at null means "not a temp account or
  -- no expiration"; disabled_at is the soft "Excluir acesso" toggle
  -- ("Reativar acesso" just clears it back to null).
  is_temp boolean not null default false,
  expires_at timestamptz,
  disabled_at timestamptz,
  must_change_password boolean not null default false,
  welcome_shown boolean not null default false,
  -- Auto-shown "want a guided tutorial?" prompt on the very first login,
  -- for every revendedor (temp or permanent) — not just demo accounts.
  -- After that, it's only reachable via the "?" help button.
  tutorial_prompt_shown boolean not null default false,
  -- Optional real contact e-mail for temp/demo accounts (the `email`
  -- column above holds the login username for those, not a real address).
  contact_email text
);

-- Small global key/value config store, e.g. the gestor-configurable
-- default trial length for new demo accounts.
create table if not exists app_settings (
  key text primary key,
  value text not null
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
  recorded_at timestamptz not null default now(),
  -- Enough store detail (address/phone/coordinates) to reconstruct a full,
  -- usable result — not just a stat — when this table is used as the
  -- third-tier search fallback (see readHistoryFallback in precoDaHora.ts).
  store_address text,
  store_phone text,
  store_lat double precision,
  store_lng double precision,
  barcode text
);
create index if not exists price_history_query_idx on price_history (query, recorded_at desc);

-- Price-target alerts. Scoped by deviceId by default (consumidor doesn't
-- log in), but tagged with account_id when created by a logged-in
-- revendedor so it survives a device switch — see account_id below.
create table if not exists price_alerts (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  account_id uuid references revendedor_accounts (id) on delete cascade,
  query text not null,
  -- Resolved once at creation time when `query` is a barcode/EAN, so the
  -- list can show a real product name next to the code instead of just
  -- the digits — see the barcode-lookup in POST /api/beta/alertas.
  product_name text,
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
create index if not exists price_alerts_account_idx on price_alerts (account_id);

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

-- ===================== Dados do Revendedor (persistentes por conta) =====================
-- Antes só viviam no localStorage do aparelho (zustand persist) — limpar o
-- cache do navegador ou trocar de celular perdia tudo. Agora ficam
-- atrelados à conta (revendedor_accounts.id), sobrevivendo a ambos.

create table if not exists revendedor_cart_items (
  id text primary key,
  account_id uuid not null references revendedor_accounts (id) on delete cascade,
  price_result jsonb not null,
  profit_percent numeric(6, 2) not null,
  resale_price numeric(10, 2) not null,
  gross_profit numeric(10, 2) not null,
  quantity integer not null default 1,
  added_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists revendedor_cart_items_account_idx on revendedor_cart_items (account_id);

create table if not exists revendedor_notas (
  id text primary key,
  account_id uuid not null references revendedor_accounts (id) on delete cascade,
  emitente text not null default '',
  destinatario text not null default '',
  data_emissao date,
  valor_total numeric(10, 2),
  observacoes text not null default '',
  produtos jsonb not null default '[]',
  campos_extras jsonb not null default '[]',
  fotos jsonb not null default '[]',
  criado_em timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists revendedor_notas_account_idx on revendedor_notas (account_id);

create table if not exists revendedor_settings (
  account_id uuid primary key references revendedor_accounts (id) on delete cascade,
  default_profit_percent numeric(6, 2) not null default 30,
  search_radius_km integer not null default 25,
  updated_at timestamptz not null default now()
);

-- Product thumbnails looked up by barcode (Open Food Facts / Open Products
-- Facts / Cosmos Bluesoft, in that order). Keyed by barcode so once any
-- user's search resolves an image, every other user searching the same
-- EAN gets it straight from here — no repeat external lookups.
create table if not exists product_images (
  barcode text primary key,
  image_data text not null,
  source text not null,
  created_at timestamptz not null default now()
);
