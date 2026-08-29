create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'pro',
  status text not null default 'active'
    check (status in ('active', 'pending', 'past_due', 'canceled', 'expired')),
  preference_id text,
  last_gateway_payment_id text,
  started_at timestamptz not null default now(),
  last_payment_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists subscriptions_expires_idx on subscriptions (expires_at);

alter table subscriptions enable row level security;

do $$ begin
  create policy "sub_self_read" on subscriptions
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "sub_self_insert" on subscriptions
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "sub_super_all" on subscriptions
    for all
    using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin'))
    with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin'));
exception when duplicate_object then null; end $$;
