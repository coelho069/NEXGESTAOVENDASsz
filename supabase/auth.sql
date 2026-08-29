-- Perfis e RLS. Admin altera produto; vendedor só lê.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'user' check (role in ('admin', 'user', 'superadmin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

do $$ begin
  create policy "profiles_self_read" on profiles
    for select using (auth.uid() = id or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_admin_write" on profiles
    for all
    using (coalesce((select role from profiles p where p.id = auth.uid()), '') = 'admin')
    with check (coalesce((select role from profiles p where p.id = auth.uid()), '') = 'admin');
exception when duplicate_object then null; end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Produtos: leitura autenticada; mutação só admin
alter table products enable row level security;

drop policy if exists "products_public_read" on products;
drop policy if exists "products_admin_write" on products;
drop policy if exists "demo_all_products" on products;

create policy "products_read_auth" on products
  for select using (auth.role() = 'authenticated' or true);

create policy "products_write_admin" on products
  for insert
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "products_update_admin" on products
  for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "products_delete_admin" on products
  for delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Marque um usuário como admin:
-- update profiles set role = 'admin' where email = 'seu-admin@empresa.com';
