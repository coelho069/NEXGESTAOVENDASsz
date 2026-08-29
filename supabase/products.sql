-- Tabela de produtos (backoffice + vitrine + PDV)
-- Nomes pedidos no brief e aliases usados pelo app (price/cost/stock).

create extension if not exists "pgcrypto";

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  store_id uuid,
  name text not null,
  description text,
  cost_price numeric(12,2) default 0,
  sale_price numeric(12,2) not null default 0,
  cost numeric(12,2) default 0,
  price numeric(12,2) not null default 0,
  stock_quantity numeric(12,3) not null default 0,
  stock numeric(12,3) not null default 0,
  min_stock numeric(12,3) not null default 5,
  category text not null default 'Geral',
  image_url text,
  catalog_visible boolean not null default true,
  active boolean not null default true,
  barcode text,
  sku text,
  ncm text,
  unit text not null default 'un',
  kit_components jsonb not null default '[]'::jsonb
);

-- Se a tabela já existia, garante as colunas do brief:
alter table products add column if not exists cost_price numeric(12,2) default 0;
alter table products add column if not exists sale_price numeric(12,2) default 0;
alter table products add column if not exists stock_quantity numeric(12,3) default 0;
alter table products add column if not exists min_stock numeric(12,3) default 5;
alter table products add column if not exists category text default 'Geral';
alter table products add column if not exists image_url text;
alter table products add column if not exists name text;
alter table products add column if not exists description text;

create index if not exists products_category_idx on products(category);
create index if not exists products_name_idx on products using gin (to_tsvector('portuguese', coalesce(name, '')));

alter table products enable row level security;

do $$ begin
  create policy "products_public_read" on products for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "products_admin_write" on products
    for all
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;
