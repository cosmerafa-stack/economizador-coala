-- Só Lucro — Supabase schema
-- Run this in the Supabase SQL editor to provision the database.

create extension if not exists "uuid-ossp";

create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text not null,
  city text not null,
  phone text,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  barcode text unique,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists products_barcode_idx on products (barcode);
create index if not exists products_name_idx on products using gin (to_tsvector('portuguese', name));

-- One row per NFCe price observation scraped/ingested for a product at a store.
create table if not exists price_records (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products (id) on delete cascade,
  store_id uuid not null references stores (id) on delete cascade,
  price numeric(10, 2) not null,
  emitted_at timestamptz not null,
  nfce_key text,
  created_at timestamptz not null default now()
);
create index if not exists price_records_product_idx on price_records (product_id, emitted_at desc);
create index if not exists price_records_store_idx on price_records (store_id);

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('consumidor', 'revendedor')),
  default_profit_percent numeric(6, 2) not null default 30,
  last_lat double precision,
  last_lng double precision,
  created_at timestamptz not null default now()
);

create table if not exists cart_items (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles (id) on delete cascade,
  price_record_id uuid not null references price_records (id) on delete cascade,
  profit_percent numeric(6, 2) not null,
  resale_price numeric(10, 2) not null,
  gross_profit numeric(10, 2) not null,
  added_at timestamptz not null default now()
);
create index if not exists cart_items_profile_idx on cart_items (profile_id);

alter table profiles enable row level security;
alter table cart_items enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_upsert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

create policy "cart_items_select_own" on cart_items
  for select using (auth.uid() = profile_id);
create policy "cart_items_insert_own" on cart_items
  for insert with check (auth.uid() = profile_id);
create policy "cart_items_delete_own" on cart_items
  for delete using (auth.uid() = profile_id);

-- stores / products / price_records are public read data (comparable to precodahora.ba.gov.br).
alter table stores enable row level security;
alter table products enable row level security;
alter table price_records enable row level security;

create policy "stores_public_read" on stores for select using (true);
create policy "products_public_read" on products for select using (true);
create policy "price_records_public_read" on price_records for select using (true);
