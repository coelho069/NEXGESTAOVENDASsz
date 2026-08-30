-- FluxoGestão — persistência fiscal (PostgreSQL / Supabase)
-- Integração via API de terceiro: XML/autorização fora deste schema.
-- Segredos (token do provedor, CSC): Vault UUID ou env de servidor — nunca colunas texto.
-- Rodar no SQL Editor depois de schema.sql e auth.sql.

-- ---------------------------------------------------------------------------
-- Tenância (necessária para RLS por loja; o app demo usa store-1)
-- ---------------------------------------------------------------------------

create table if not exists store_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  store_id uuid not null references stores (id) on delete cascade,
  member_role text not null default 'user'
    check (member_role in ('admin', 'user', 'superadmin')),
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

create index if not exists store_members_store_idx on store_members (store_id);

create or replace function public.fg_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'superadmin')
  );
$$;

create or replace function public.fg_is_store_member(_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.fg_is_admin()
    or exists (
      select 1 from store_members m
      where m.user_id = auth.uid()
        and m.store_id = _store_id
    );
$$;

alter table store_members enable row level security;

drop policy if exists "store_members_self_read" on store_members;
create policy "store_members_self_read" on store_members
  for select using (user_id = auth.uid() or public.fg_is_admin());

drop policy if exists "store_members_admin_write" on store_members;
create policy "store_members_admin_write" on store_members
  for all
  using (public.fg_is_admin())
  with check (public.fg_is_admin());

revoke all on table store_members from anon;
grant select on table store_members to authenticated;

-- ---------------------------------------------------------------------------
-- Emitente: metadados públicos + referências a vault.secrets (não o segredo)
-- Criar o secret: select vault.create_secret('…', 'fiscal_provider_token_store_1');
-- ---------------------------------------------------------------------------

create table if not exists fiscal_issuers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  environment text not null default 'homologation'
    check (environment in ('homologation', 'production')),
  uf char(2) not null,
  cnpj char(14) not null,
  ie text,
  provider_name text not null default 'legacy_stub',
  -- IDs de vault.secrets (opcional). Sem FK: o schema vault pode não existir no dump local.
  provider_token_secret_id uuid,
  csc_id text,
  csc_token_secret_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, environment)
);

create index if not exists fiscal_issuers_store_idx on fiscal_issuers (store_id);

comment on column fiscal_issuers.provider_token_secret_id is
  'UUID em vault.secrets. Não gravar o token do provedor nesta tabela.';
comment on column fiscal_issuers.csc_token_secret_id is
  'UUID em vault.secrets do token CSC. csc_id (identificador) pode ser texto não secreto.';

-- ---------------------------------------------------------------------------
-- Classificação por produto (códigos para o JSON do terceiro; sem XML)
-- ---------------------------------------------------------------------------

create table if not exists product_tax (
  product_id uuid primary key references products (id) on delete cascade,
  store_id uuid not null references stores (id) on delete cascade,
  cfop text,
  cst_ibs_cbs char(3),
  c_class_trib char(6),
  updated_at timestamptz not null default now()
);

create index if not exists product_tax_store_idx on product_tax (store_id);

-- ---------------------------------------------------------------------------
-- Documento fiscal N:1 venda (resultado da API de terceiro)
-- ---------------------------------------------------------------------------

create table if not exists fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  sale_id uuid not null references sales (id) on delete restrict,
  issuer_id uuid references fiscal_issuers (id) on delete set null,
  model char(2) not null check (model in ('55', '65')),
  series integer,
  number integer,
  access_key char(44),
  protocol text,
  environment text not null default 'homologation'
    check (environment in ('homologation', 'production')),
  contingency text not null default 'none'
    check (contingency in ('none', 'offline', 'svc')),
  status text not null default 'queued'
    check (status in (
      'queued',
      'processing',
      'authorized',
      'rejected',
      'cancelled',
      'denied',
      'contingency'
    )),
  provider_document_id text,
  -- Caminhos em Storage, não o XML/PDF em bytea/texto.
  xml_storage_path text,
  pdf_storage_path text,
  rejection_code text,
  rejection_message text,
  authorized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (access_key)
);

create unique index if not exists fiscal_documents_provider_id_uidx
  on fiscal_documents (store_id, provider_document_id)
  where provider_document_id is not null;

create index if not exists fiscal_documents_sale_idx on fiscal_documents (sale_id);
create index if not exists fiscal_documents_store_status_idx on fiscal_documents (store_id, status);

-- Idempotência de negócio: no máximo um DF-e “vivo” por venda+modelo.
create unique index if not exists fiscal_documents_sale_model_live_uidx
  on fiscal_documents (sale_id, model)
  where status not in ('cancelled', 'denied');

comment on table fiscal_documents is
  'Espelho do DF-e no provedor. XML/autorização não são gerados aqui.';

-- ---------------------------------------------------------------------------
-- Fila distinta de pending_sync (vendas → nuvem)
-- ---------------------------------------------------------------------------

create table if not exists fiscal_jobs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  sale_id uuid not null references sales (id) on delete restrict,
  document_id uuid references fiscal_documents (id) on delete set null,
  -- Chave estável: ex. '65:' || sale_id. Única por loja.
  idempotency_key text not null,
  model char(2) not null check (model in ('55', '65')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'succeeded', 'failed', 'dead')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  -- Hash do payload enviado ao terceiro (sem token/CSC).
  payload_sha256 char(64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, idempotency_key)
);

create index if not exists fiscal_jobs_queue_idx
  on fiscal_jobs (status, next_attempt_at)
  where status in ('queued', 'failed');

create index if not exists fiscal_jobs_sale_idx on fiscal_jobs (sale_id);

comment on column fiscal_jobs.idempotency_key is
  'Reenvio do mesmo fechamento de venda não cria segundo job.';

-- ---------------------------------------------------------------------------
-- RLS: anon bloqueado; authenticated lê a loja; escrita só service_role (bypass)
-- Docs: service_role bypassa RLS — manter a chave só no servidor.
-- ---------------------------------------------------------------------------

alter table fiscal_issuers enable row level security;
alter table product_tax enable row level security;
alter table fiscal_documents enable row level security;
alter table fiscal_jobs enable row level security;

revoke all on table fiscal_issuers from anon;
revoke all on table product_tax from anon;
revoke all on table fiscal_documents from anon;
revoke all on table fiscal_jobs from anon;

grant select on table fiscal_issuers to authenticated;
grant select on table product_tax to authenticated;
grant select on table fiscal_documents to authenticated;
grant select on table fiscal_jobs to authenticated;

-- Metadados de emitente: admin pode atualizar UF/CNPJ, nunca precisa de coluna de token.
drop policy if exists "fiscal_issuers_member_read" on fiscal_issuers;
create policy "fiscal_issuers_member_read" on fiscal_issuers
  for select using (public.fg_is_store_member(store_id));

drop policy if exists "fiscal_issuers_admin_write" on fiscal_issuers;
create policy "fiscal_issuers_admin_write" on fiscal_issuers
  for all
  using (public.fg_is_admin())
  with check (public.fg_is_admin());

drop policy if exists "product_tax_member_read" on product_tax;
create policy "product_tax_member_read" on product_tax
  for select using (public.fg_is_store_member(store_id));

drop policy if exists "product_tax_admin_write" on product_tax;
create policy "product_tax_admin_write" on product_tax
  for all
  using (public.fg_is_admin())
  with check (public.fg_is_admin());

drop policy if exists "fiscal_documents_member_read" on fiscal_documents;
create policy "fiscal_documents_member_read" on fiscal_documents
  for select using (public.fg_is_store_member(store_id));

-- Sem policy de insert/update para authenticated: a rota /api/fiscal/* usa service_role.

drop policy if exists "fiscal_jobs_member_read" on fiscal_jobs;
create policy "fiscal_jobs_member_read" on fiscal_jobs
  for select using (public.fg_is_store_member(store_id));

-- ---------------------------------------------------------------------------
-- Idempotência atômica de enfileiramento (chamada pelo servidor)
-- ---------------------------------------------------------------------------

create or replace function public.enqueue_fiscal_job(
  _store_id uuid,
  _sale_id uuid,
  _model text,
  _idempotency_key text
)
returns fiscal_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  job fiscal_jobs;
begin
  if _model not in ('55', '65') then
    raise exception 'enqueue_fiscal_job: modelo deve ser 55 ou 65';
  end if;
  if auth.role() is distinct from 'service_role' and not public.fg_is_admin() then
    raise exception 'enqueue_fiscal_job: papel não autorizado';
  end if;

  insert into fiscal_jobs (store_id, sale_id, model, idempotency_key)
  values (_store_id, _sale_id, _model, _idempotency_key)
  on conflict (store_id, idempotency_key) do update
    set updated_at = now()
  returning * into job;

  return job;
end;
$$;

revoke all on function public.enqueue_fiscal_job(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.enqueue_fiscal_job(uuid, uuid, text, text) to service_role;
