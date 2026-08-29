create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_id uuid,
  actor_name text not null,
  table_name text not null,
  record_id text not null,
  field text not null,
  from_value text,
  to_value text,
  action text not null default 'update'
);

create index if not exists audit_logs_at_idx on audit_logs (at desc);
create index if not exists audit_logs_actor_idx on audit_logs (actor_id);

alter table audit_logs enable row level security;

do $$ begin
  create policy "audit_super_read" on audit_logs
    for select using (
      exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin')
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "audit_super_write" on audit_logs
    for insert with check (
      exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin')
    );
exception when duplicate_object then null; end $$;

alter table profiles add column if not exists locked boolean not null default false;
alter table products add column if not exists deleted_at timestamptz;

-- Papel superadmin
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'user', 'superadmin'));
