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
