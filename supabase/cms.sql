-- CMS da vitrine. Leitura pública, escrita só para admin.

create table if not exists cms_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table cms_content enable row level security;

do $$ begin
  create policy "cms_public_read" on cms_content for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cms_admin_write" on cms_content
    for all
    using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin')
    with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');
exception when duplicate_object then null; end $$;

insert into cms_content (key, value)
values ('site', '{}'::jsonb)
on conflict (key) do nothing;

-- Storage da galeria (rode no dashboard Storage se preferir o UI)
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;
