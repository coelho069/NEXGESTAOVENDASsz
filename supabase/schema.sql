-- FluxoGestão — schema Postgres / Supabase
-- Rodar no SQL Editor do projeto.

create extension if not exists "pgcrypto";

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'pro',
  catalog_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  name text not null,
  description text,
  barcode text,
  sku text,
  ncm text,
  price numeric(12,2) not null,
  cost numeric(12,2),
  stock numeric(12,3) not null default 0,
  min_stock numeric(12,3) not null default 5,
  unit text not null default 'un',
  category text not null default 'Geral',
  expires_at timestamptz,
  image_url text,
  catalog_visible boolean not null default true,
  kit_components jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cash_shifts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_cash numeric(12,2) not null,
  closing_cash numeric(12,2),
  expected_cash numeric(12,2),
  difference numeric(12,2),
  cash_sales numeric(12,2) not null default 0,
  other_sales numeric(12,2) not null default 0,
  status text not null default 'open',
  notes text
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  shift_id uuid references cash_shifts(id),
  customer_id uuid,
  customer_name text,
  total numeric(12,2) not null,
  cost_total numeric(12,2) not null default 0,
  profit numeric(12,2) not null default 0,
  discount numeric(12,2) default 0,
  payment_method text not null,
  status text not null default 'pending_sync',
  sync_pending boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  quantity numeric(12,3) not null,
  unit_price numeric(12,2) not null,
  unit_cost numeric(12,2) not null default 0,
  total_price numeric(12,2) not null,
  line_profit numeric(12,2) not null default 0
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  type text not null,
  quantity numeric(12,3) not null,
  reason text not null,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists products_store_idx on products(store_id);
create index if not exists products_barcode_idx on products(barcode);
create index if not exists sales_store_idx on sales(store_id);
create index if not exists sales_sync_idx on sales(sync_pending);
create index if not exists sale_items_sale_idx on sale_items(sale_id);
create index if not exists shifts_store_status_idx on cash_shifts(store_id, status);

alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table cash_shifts enable row level security;
alter table inventory_movements enable row level security;
alter table stores enable row level security;

-- Demo: políticas abertas para a chave anon. Restrinja em produção.
do $$ begin
  create policy "demo_all_products" on products for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo_all_sales" on sales for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo_all_sale_items" on sale_items for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo_all_shifts" on cash_shifts for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo_all_movements" on inventory_movements for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo_all_stores" on stores for all using (true) with check (true);
exception when duplicate_object then null; end $$;
