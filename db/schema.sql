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
