-- CBAM AI database schema. Run once in the Supabase SQL editor (or via the CLI).
-- Organization isolation is enforced with row level security on every table.

create extension if not exists pgcrypto with schema extensions;

-- All CBAM AI objects live in their own schema so this project can be shared with other apps.
create schema if not exists cbam;
set search_path = cbam, public, extensions;

-- ---------- Core identity ----------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  business_type text,
  eori_number text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  company text,
  country text,
  business_type text,
  account_type text not null default 'organization' check (account_type in ('organization','supplier')),
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'team_member' check (role in
    ('org_admin','compliance_manager','sustainability_manager','import_manager','procurement_manager','analyst','team_member')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'team_member',
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Helper functions ----------
create or replace function cbam_is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = cbam, public, extensions as $$
  select exists (select 1 from memberships where org_id = p_org and user_id = auth.uid());
$$;

create or replace function cbam_member_role(p_org uuid) returns text
language sql stable security definer set search_path = cbam, public, extensions as $$
  select role from memberships where org_id = p_org and user_id = auth.uid();
$$;

create or replace function cbam_can_write(p_org uuid) returns boolean
language sql stable security definer set search_path = cbam, public, extensions as $$
  select coalesce(cbam_member_role(p_org) in
    ('org_admin','compliance_manager','sustainability_manager','import_manager','procurement_manager','team_member'), false);
$$;

create or replace function cbam_is_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = cbam, public, extensions as $$
  select coalesce(cbam_member_role(p_org) = 'org_admin', false);
$$;

-- ---------- Business tables (all org scoped) ----------
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  country text,
  contact_person text,
  email text,
  status text not null default 'draft' check (status in ('draft','invited','active','inactive')),
  invite_token text unique default encode(gen_random_bytes(18), 'hex'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists supplier_users (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (supplier_id, user_id)
);

create table if not exists production_facilities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  name text not null,
  country text,
  address text,
  sector text,
  production_processes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reporting_periods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  label text not null,
  start_date date not null,
  end_date date not null,
  declaration_due date,
  deadline_source text,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists product_classifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  cn_code text not null,
  description text,
  sector text,
  in_scope boolean not null default true,
  source_url text,
  last_reviewed_at date,
  created_at timestamptz not null default now(),
  unique (org_id, cn_code)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  cn_code text,
  category text check (category in ('cement','iron_steel','aluminium','fertilisers','electricity','hydrogen','other')),
  unit text not null default 'tonne',
  supplier_id uuid references suppliers(id) on delete set null,
  facility_id uuid references production_facilities(id) on delete set null,
  scope_status text not null default 'needs_review' check (scope_status in ('in_scope','out_of_scope','needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  reference text not null,
  import_date date,
  product_id uuid references products(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  country_of_origin text,
  quantity numeric check (quantity is null or quantity >= 0),
  unit text default 'tonne',
  customs_reference text,
  reporting_period_id uuid references reporting_periods(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists methodologies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  method_type text not null default 'actual' check (method_type in ('actual','default','estimated')),
  description text,
  source_reference text,
  version text default '1',
  status text not null default 'pending_verification' check (status in ('verified','pending_verification','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists emissions_factors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  factor_type text not null default 'fuel' check (factor_type in ('fuel','electricity','process','precursor','default_value')),
  value numeric not null,
  unit text not null,
  source text not null,
  source_url text,
  valid_from date,
  valid_to date,
  status text not null default 'pending_verification' check (status in ('verified','pending_verification','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_data (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  facility_id uuid references production_facilities(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  activity_type text not null check (activity_type in ('production_quantity','energy_consumption','fuel_consumption','process_information')),
  description text,
  quantity numeric,
  unit text,
  period_start date,
  period_end date,
  source text,
  status text not null default 'pending_verification' check (status in ('verified','pending_verification','needs_review')),
  created_at timestamptz not null default now()
);

create table if not exists emissions_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  facility_id uuid references production_facilities(id) on delete set null,
  period_start date,
  period_end date,
  direct_emissions numeric default 0 check (direct_emissions >= 0),
  indirect_emissions numeric default 0 check (indirect_emissions >= 0),
  precursor_emissions numeric default 0 check (precursor_emissions >= 0),
  production_quantity numeric,
  unit text default 'tonne',
  value_basis text not null default 'actual' check (value_basis in ('actual','default','estimated')),
  status text not null default 'pending_verification' check (status in ('verified','pending_verification','needs_review')),
  source text,
  notes text,
  submission_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists calculation_results (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  methodology_id uuid references methodologies(id) on delete set null,
  period_start date,
  period_end date,
  basis text not null default 'actual' check (basis in ('actual','default','estimated')),
  inputs jsonb not null default '{}',
  factors jsonb not null default '[]',
  assumptions text,
  direct_emissions numeric not null default 0,
  indirect_emissions numeric not null default 0,
  precursor_emissions numeric not null default 0,
  quantity numeric,
  unit text,
  emissions_per_unit numeric,
  total_emissions numeric not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists supplier_submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  facility_id uuid references production_facilities(id) on delete set null,
  emissions_requested text,
  deadline date,
  status text not null default 'requested' check (status in ('requested','submitted','approved','rejected','correction_requested')),
  data jsonb not null default '{}',
  files jsonb not null default '[]',
  supplier_notes text,
  review_notes text,
  reminder_count int not null default 0,
  last_reminder_at timestamptz,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  folder text not null default 'General',
  name text not null,
  category text not null default 'other',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  version int not null default 1,
  access_level text not null default 'all' check (access_level in ('all','managers')),
  supplier_id uuid references suppliers(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_revisions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  version int not null,
  storage_path text not null,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists cbam_declarations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  reporting_period_id uuid references reporting_periods(id) on delete set null,
  title text not null,
  status text not null default 'draft' check (status in ('draft','in_review','approved','rejected','exported')),
  snapshot jsonb not null default '{}',
  readiness jsonb not null default '{}',
  notes text,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists compliance_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','in_progress','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists authorization_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  status text not null default 'not_applied' check (status in ('not_applied','application_prepared','applied','authorised','rejected')),
  application_reference text,
  authority text,
  eori_number text,
  valid_from date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists carbon_price_evidence (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  country text,
  scheme text,
  amount_paid numeric,
  currency text default 'EUR',
  emissions_covered_t numeric,
  period_start date,
  period_end date,
  document_id uuid references documents(id) on delete set null,
  validation_status text not null default 'pending' check (validation_status in ('pending','validated','rejected')),
  validated_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists certificate_estimates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  reporting_period_id uuid references reporting_periods(id) on delete set null,
  scenario_name text not null,
  embedded_emissions_t numeric not null default 0,
  adjustment_factor_pct numeric not null default 100,
  deduction_t numeric not null default 0,
  price_per_t numeric not null,
  price_basis text not null default 'scenario' check (price_basis in ('official_reference','scenario')),
  price_source text,
  price_date date,
  certificates_required numeric,
  estimated_cost numeric,
  currency text not null default 'EUR',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists regulatory_sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  url text not null,
  publisher text,
  category text,
  verification_status text not null default 'requires_verification' check (verification_status in ('verified','requires_verification')),
  last_reviewed_at date,
  reviewed_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists regulatory_updates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  source_id uuid references regulatory_sources(id) on delete set null,
  title text not null,
  summary text,
  category text,
  published_date date,
  url text,
  review_status text not null default 'requires_verification' check (review_status in ('verified','requires_verification')),
  reviewed_at date,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  kind text default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  org_id uuid,
  user_id uuid,
  table_name text not null,
  row_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Audit trigger ----------
create or replace function audit_row() returns trigger
language plpgsql security definer set search_path = cbam, public, extensions as $$
declare v_org uuid; v_row text;
begin
  if tg_op = 'DELETE' then v_org := (to_jsonb(old)->>'org_id')::uuid; v_row := to_jsonb(old)->>'id';
  else v_org := (to_jsonb(new)->>'org_id')::uuid; v_row := to_jsonb(new)->>'id'; end if;
  insert into audit_logs(org_id, user_id, table_name, row_id, action, old_data, new_data)
  values (v_org, auth.uid(), tg_table_name, v_row, tg_op,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['suppliers','production_facilities','products','imports','methodologies','emissions_factors',
    'emissions_records','calculation_results','supplier_submissions','documents','cbam_declarations','compliance_tasks',
    'authorization_records','carbon_price_evidence','certificate_estimates','memberships','activity_data']
  loop
    execute format('drop trigger if exists audit_%1$s on %1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on %1$s for each row execute function audit_row()', t);
  end loop;
  foreach t in array array['organizations','suppliers','production_facilities','products','imports','methodologies','emissions_factors',
    'emissions_records','supplier_submissions','documents','cbam_declarations','compliance_tasks','authorization_records']
  loop
    execute format('drop trigger if exists touch_%1$s on %1$s', t);
    execute format('create trigger touch_%1$s before update on %1$s for each row execute function touch_updated_at()', t);
  end loop;
end $$;

-- ---------- Row level security ----------
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table invitations enable row level security;
alter table supplier_users enable row level security;
alter table audit_logs enable row level security;

drop policy if exists org_select on organizations;
create policy org_select on organizations for select using (cbam_is_member(id));
drop policy if exists org_update on organizations;
create policy org_update on organizations for update using (cbam_is_admin(id)) with check (cbam_is_admin(id));

drop policy if exists profile_select on profiles;
create policy profile_select on profiles for select using (
  id = auth.uid() or exists (select 1 from memberships a join memberships b on a.org_id = b.org_id
                             where a.user_id = auth.uid() and b.user_id = profiles.id));
drop policy if exists profile_update on profiles;
create policy profile_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists mem_select on memberships;
create policy mem_select on memberships for select using (cbam_is_member(org_id) or user_id = auth.uid());
drop policy if exists mem_update on memberships;
create policy mem_update on memberships for update using (cbam_is_admin(org_id)) with check (cbam_is_admin(org_id));
drop policy if exists mem_delete on memberships;
create policy mem_delete on memberships for delete using (cbam_is_admin(org_id) and user_id <> auth.uid());

drop policy if exists inv_select on invitations;
create policy inv_select on invitations for select using (cbam_is_admin(org_id));
drop policy if exists inv_insert on invitations;
create policy inv_insert on invitations for insert with check (cbam_is_admin(org_id));
drop policy if exists inv_update on invitations;
create policy inv_update on invitations for update using (cbam_is_admin(org_id));
drop policy if exists inv_delete on invitations;
create policy inv_delete on invitations for delete using (cbam_is_admin(org_id));


drop policy if exists audit_select on audit_logs;
create policy audit_select on audit_logs for select using (org_id is not null and cbam_is_member(org_id));
-- no insert/update/delete policies: audit logs are written only by the trigger and cannot be altered.

-- Generic org scoped tables: members read, writers write.
do $$
declare t text;
begin
  foreach t in array array['suppliers','production_facilities','reporting_periods','product_classifications','products','imports',
    'methodologies','emissions_factors','activity_data','emissions_records','calculation_results','supplier_submissions',
    'cbam_declarations','compliance_tasks','authorization_records','carbon_price_evidence','certificate_estimates',
    'regulatory_sources','regulatory_updates','notifications','document_revisions']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %1$s_sel on %1$I', t);
    execute format('create policy %1$s_sel on %1$I for select using (cbam_is_member(org_id))', t);
    execute format('drop policy if exists %1$s_ins on %1$I', t);
    execute format('create policy %1$s_ins on %1$I for insert with check (cbam_can_write(org_id))', t);
    execute format('drop policy if exists %1$s_upd on %1$I', t);
    execute format('create policy %1$s_upd on %1$I for update using (cbam_can_write(org_id)) with check (cbam_can_write(org_id))', t);
    execute format('drop policy if exists %1$s_del on %1$I', t);
    execute format('create policy %1$s_del on %1$I for delete using (cbam_can_write(org_id))', t);
  end loop;
end $$;

-- Documents: restricted documents are visible to managers only.
alter table documents enable row level security;
drop policy if exists documents_sel on documents;
create policy documents_sel on documents for select using (
  cbam_is_member(org_id) and (access_level = 'all' or cbam_member_role(org_id) in ('org_admin','compliance_manager','sustainability_manager')));
drop policy if exists documents_ins on documents;
create policy documents_ins on documents for insert with check (cbam_can_write(org_id));
drop policy if exists documents_upd on documents;
create policy documents_upd on documents for update using (cbam_can_write(org_id)) with check (cbam_can_write(org_id));
drop policy if exists documents_del on documents;
create policy documents_del on documents for delete using (cbam_is_admin(org_id) or cbam_member_role(org_id) = 'compliance_manager');

-- Approved declarations are immutable except for status progression by managers.
create or replace function guard_declaration() returns trigger language plpgsql set search_path = cbam, public, extensions as $$
begin
  if old.status = 'approved' and new.snapshot is distinct from old.snapshot then
    raise exception 'Approved declarations cannot be edited. Create a new draft instead.';
  end if;
  if new.status = 'approved' and old.status <> 'approved'
     and coalesce(cbam_member_role(new.org_id),'') not in ('org_admin','compliance_manager') then
    raise exception 'Only an Organization Admin or Compliance Manager can approve a declaration.';
  end if;
  if new.status = 'approved' and new.submitted_by = auth.uid() and old.status <> 'approved' then
    raise exception 'A declaration must be approved by a different person than the one who submitted it.';
  end if;
  return new;
end $$;
drop trigger if exists guard_declaration_t on cbam_declarations;
create trigger guard_declaration_t before update on cbam_declarations for each row execute function guard_declaration();

-- Suppliers: portal users can see their own supplier, requests, and linked products.

create or replace function cbam_is_supplier_user(p_supplier uuid) returns boolean
language sql stable security definer set search_path = cbam, public, extensions as $$
  select exists (select 1 from supplier_users where supplier_id = p_supplier and user_id = auth.uid());
$$;
create or replace function cbam_supplier_in_my_org(p_supplier uuid) returns boolean
language sql stable security definer set search_path = cbam, public, extensions as $$
  select exists (select 1 from suppliers s where s.id = p_supplier and cbam_is_member(s.org_id));
$$;
grant execute on function cbam_is_supplier_user(uuid), cbam_supplier_in_my_org(uuid) to authenticated, service_role;

drop policy if exists su_select on supplier_users;
create policy su_select on supplier_users for select using (user_id = auth.uid() or cbam_supplier_in_my_org(supplier_id));
drop policy if exists suppliers_portal_sel on suppliers;
create policy suppliers_portal_sel on suppliers for select using (cbam_is_supplier_user(id));
drop policy if exists subs_portal_sel on supplier_submissions;
create policy subs_portal_sel on supplier_submissions for select using (cbam_is_supplier_user(supplier_id));
drop policy if exists products_portal_sel on products;
create policy products_portal_sel on products for select using (cbam_is_supplier_user(supplier_id));

-- ---------- New user bootstrap ----------
create or replace function seed_org(p_org uuid) returns void language plpgsql security definer set search_path = cbam, public, extensions as $$
begin
  insert into regulatory_sources(org_id, title, url, publisher, category, notes) values
   (p_org,'Regulation (EU) 2023/956 establishing a carbon border adjustment mechanism','https://eur-lex.europa.eu/eli/reg/2023/956/oj','EUR-Lex','Legislation','Primary legal text. Check EUR-Lex for the consolidated version and any later amendments.'),
   (p_org,'European Commission: Carbon Border Adjustment Mechanism','https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en','European Commission, DG TAXUD','Official guidance','Official hub for guidance, implementing acts, reporting templates and the CBAM Registry.'),
   (p_org,'EUR-Lex summary: Carbon Border Adjustment Mechanism','https://eur-lex.europa.eu/EN/legal-content/summary/carbon-border-adjustment-mechanism.html','EUR-Lex','Legislation summary','Plain language summary. Not a substitute for the legal text.'),
   (p_org,'European Commission: EU Emissions Trading System','https://climate.ec.europa.eu/eu-action/carbon-markets/eu-emissions-trading-system-eu-ets_en','European Commission, DG CLIMA','Certificate pricing reference','Background for EU ETS allowance price references used in certificate planning.');
  insert into authorization_records(org_id) values (p_org);
end $$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = cbam, public, extensions as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_org uuid; inv invitations%rowtype; sup suppliers%rowtype;
begin
  -- Only act for CBAM AI signups. Other apps sharing this project are left untouched.
  if coalesce(m->>'cbam_app','') <> '1' then return new; end if;
  insert into profiles(id, email, full_name, company, country, business_type, account_type)
  values (new.id, new.email, m->>'full_name', m->>'company', m->>'country', m->>'business_type',
          case when coalesce(m->>'supplier_invite_token','') <> '' then 'supplier' else 'organization' end);

  if coalesce(m->>'supplier_invite_token','') <> '' then
    select * into sup from suppliers where invite_token = m->>'supplier_invite_token';
    if found then
      insert into supplier_users(supplier_id, user_id) values (sup.id, new.id) on conflict do nothing;
      update suppliers set status = 'active' where id = sup.id and status in ('draft','invited');
    end if;
    return new;
  end if;

  if coalesce(m->>'invite_token','') <> '' then
    select * into inv from invitations where token = m->>'invite_token' and status = 'pending' and lower(email) = lower(new.email);
    if found then
      insert into memberships(org_id, user_id, role) values (inv.org_id, new.id, inv.role) on conflict do nothing;
      update invitations set status = 'accepted' where id = inv.id;
      return new;
    end if;
  end if;

  insert into organizations(name, country, business_type, created_by)
  values (coalesce(nullif(m->>'company',''), 'My organization'), m->>'country', m->>'business_type', new.id)
  returning id into v_org;
  insert into memberships(org_id, user_id, role) values (v_org, new.id, 'org_admin');
  perform seed_org(v_org);
  return new;
exception when others then
  -- Never block account creation for other apps. ensure_workspace() can recover a missing workspace.
  raise warning 'cbam handle_new_user failed: %', sqlerrm;
  return new;
end $$;

drop trigger if exists cbam_on_auth_user_created on auth.users;
create trigger cbam_on_auth_user_created after insert on auth.users for each row execute function cbam.handle_new_user();

-- Existing logged in users (for example supplier or invited users who sign in later) can accept tokens:
create or replace function accept_supplier_invite(p_token text) returns uuid
language plpgsql security definer set search_path = cbam, public, extensions as $$
declare sup suppliers%rowtype;
begin
  select * into sup from suppliers where invite_token = p_token;
  if not found then raise exception 'Invitation not found'; end if;
  insert into supplier_users(supplier_id, user_id) values (sup.id, auth.uid()) on conflict do nothing;
  update suppliers set status = 'active' where id = sup.id and status in ('draft','invited');
  return sup.id;
end $$;

create or replace function accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = cbam, public, extensions as $$
declare inv invitations%rowtype; v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  select * into inv from invitations where token = p_token and status = 'pending';
  if not found or lower(inv.email) <> lower(v_email) then raise exception 'Invitation not valid for this account'; end if;
  insert into memberships(org_id, user_id, role) values (inv.org_id, auth.uid(), inv.role) on conflict do nothing;
  update invitations set status = 'accepted' where id = inv.id;
  return inv.org_id;
end $$;

-- Supplier portal: submit data through a controlled function (suppliers never write tables directly).
create or replace function submit_supplier_data(p_id uuid, p_data jsonb, p_notes text, p_files jsonb)
returns void language plpgsql security definer set search_path = cbam, public, extensions as $$
declare s supplier_submissions%rowtype;
begin
  select * into s from supplier_submissions where id = p_id;
  if not found or not exists (select 1 from supplier_users where supplier_id = s.supplier_id and user_id = auth.uid()) then
    raise exception 'Not authorised for this request';
  end if;
  if s.status not in ('requested','correction_requested') then
    raise exception 'This request is not open for submission';
  end if;
  update supplier_submissions set data = p_data, supplier_notes = p_notes, files = coalesce(p_files, files),
    status = 'submitted', submitted_at = now() where id = p_id;
  insert into audit_logs(org_id, user_id, table_name, row_id, action, new_data)
  values (s.org_id, auth.uid(), 'supplier_submissions', p_id::text, 'SUPPLIER_SUBMIT', p_data);
end $$;

-- Reminder logging (email delivery must be configured separately).
create or replace function log_reminder(p_id uuid) returns void
language plpgsql security definer set search_path = cbam, public, extensions as $$
declare s supplier_submissions%rowtype;
begin
  select * into s from supplier_submissions where id = p_id;
  if not found or not cbam_can_write(s.org_id) then raise exception 'Not authorised'; end if;
  update supplier_submissions set reminder_count = reminder_count + 1, last_reminder_at = now() where id = p_id;
end $$;

-- Delete own account's organization data is intentionally not exposed. Contact an administrator.

-- ---------- Storage ----------
insert into storage.buckets (id, name, public) values ('cbam-documents','cbam-documents', false) on conflict (id) do nothing;

drop policy if exists "cbam read documents" on storage.objects;
create policy "cbam read documents" on storage.objects for select using (
  bucket_id = 'cbam-documents' and (
    (split_part(name,'/',1) ~ '^[0-9a-f-]{36}$' and cbam_is_member(split_part(name,'/',1)::uuid))
    or (split_part(name,'/',1) = 'sub' and (
         exists (select 1 from supplier_submissions s where s.id::text = split_part(name,'/',2) and cbam_is_member(s.org_id))
      or exists (select 1 from supplier_submissions s join supplier_users su on su.supplier_id = s.supplier_id
                 where s.id::text = split_part(name,'/',2) and su.user_id = auth.uid())))));
drop policy if exists "cbam write documents" on storage.objects;
create policy "cbam write documents" on storage.objects for insert with check (
  bucket_id = 'cbam-documents' and (
    (split_part(name,'/',1) ~ '^[0-9a-f-]{36}$' and cbam_can_write(split_part(name,'/',1)::uuid))
    or (split_part(name,'/',1) = 'sub' and exists (
        select 1 from supplier_submissions s join supplier_users su on su.supplier_id = s.supplier_id
        where s.id::text = split_part(name,'/',2) and su.user_id = auth.uid()))));
drop policy if exists "cbam delete documents" on storage.objects;
create policy "cbam delete documents" on storage.objects for delete using (
  bucket_id = 'cbam-documents' and split_part(name,'/',1) ~ '^[0-9a-f-]{36}$' and cbam_can_write(split_part(name,'/',1)::uuid));

-- Recovery: creates a workspace for a signed in user who has none (for example accounts created before this schema was applied).
create or replace function ensure_workspace() returns uuid
language plpgsql security definer set search_path = cbam, public, extensions as $$
declare v_org uuid; u auth.users%rowtype; m jsonb;
begin
  select * into u from auth.users where id = auth.uid();
  if not found then raise exception 'Not signed in'; end if;
  select org_id into v_org from memberships where user_id = u.id limit 1;
  if v_org is not null then return v_org; end if;
  m := coalesce(u.raw_user_meta_data, '{}'::jsonb);
  insert into profiles(id, email, full_name, company, country, business_type)
    values (u.id, u.email, m->>'full_name', m->>'company', m->>'country', m->>'business_type') on conflict (id) do nothing;
  insert into organizations(name, country, business_type, created_by)
    values (coalesce(nullif(m->>'company',''), 'My organization'), m->>'country', m->>'business_type', u.id) returning id into v_org;
  insert into memberships(org_id, user_id, role) values (v_org, u.id, 'org_admin');
  perform seed_org(v_org);
  return v_org;
end $$;

-- ---------- API access ----------
-- Also expose the schema: Supabase dashboard, Settings, API, Exposed schemas, add "cbam".
grant usage on schema cbam to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema cbam to authenticated;
grant all on all tables in schema cbam to service_role;
grant usage, select on all sequences in schema cbam to authenticated, service_role;
grant execute on all functions in schema cbam to authenticated, service_role;
alter default privileges in schema cbam grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema cbam grant all on tables to service_role;
alter default privileges in schema cbam grant execute on functions to authenticated, service_role;
revoke all on all tables in schema cbam from anon;

-- The auth service runs the signup trigger, so its role needs access to this schema.
grant usage on schema cbam to supabase_auth_admin;
grant execute on function cbam.handle_new_user() to supabase_auth_admin;
grant select, insert on all tables in schema cbam to supabase_auth_admin;
