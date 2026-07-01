-- Canonical white-label agency landing storage.
-- Stores the full landing editor payload in data while exposing normalized
-- lookup columns for subdomain/custom-domain resolution through PostgREST.

create or replace function public.quimera_is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and translate(lower(coalesce(u.role, 'user')), ' _-', '') in ('owner', 'superadmin')
  );
$$;

create or replace function public.quimera_can_manage_agency(p_agency_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.quimera_is_platform_owner()
    or exists (
      select 1
      from public.tenants t
      where t.id = p_agency_tenant_id
        and t.owner_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id = p_agency_tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('agency_owner', 'agency_admin')
    );
$$;

revoke all on function public.quimera_is_platform_owner() from public;
revoke all on function public.quimera_can_manage_agency(uuid) from public;
grant execute on function public.quimera_is_platform_owner() to authenticated;
grant execute on function public.quimera_can_manage_agency(uuid) to authenticated;

create table if not exists public.agency_landings (
  id text primary key default ('agency_landing_' || replace(gen_random_uuid()::text, '-', '')),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  subdomain text,
  custom_domain text,
  is_published boolean not null default false,
  published_at timestamptz,
  last_updated timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint agency_landings_subdomain_normalized_chk check (
    subdomain is null or subdomain = lower(trim(subdomain))
  ),
  constraint agency_landings_custom_domain_normalized_chk check (
    custom_domain is null or custom_domain = lower(trim(custom_domain))
  )
);

create unique index if not exists agency_landings_one_per_tenant_idx
  on public.agency_landings(tenant_id);

create unique index if not exists agency_landings_subdomain_uidx
  on public.agency_landings(lower(subdomain))
  where subdomain is not null and length(trim(subdomain)) > 0;

create unique index if not exists agency_landings_custom_domain_uidx
  on public.agency_landings(lower(custom_domain))
  where custom_domain is not null and length(trim(custom_domain)) > 0;

create index if not exists agency_landings_published_lookup_idx
  on public.agency_landings(is_published, subdomain, custom_domain);

alter table public.agency_landings enable row level security;

revoke all on table public.agency_landings from anon, authenticated;
grant select on table public.agency_landings to anon, authenticated;
grant insert, update, delete on table public.agency_landings to authenticated;
grant select, insert, update, delete on table public.agency_landings to service_role;

drop policy if exists "Public can view published agency landings" on public.agency_landings;
create policy "Public can view published agency landings"
on public.agency_landings
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Agency can view own agency landing" on public.agency_landings;
create policy "Agency can view own agency landing"
on public.agency_landings
for select
to authenticated
using (public.quimera_can_manage_agency(tenant_id));

drop policy if exists "Agency can insert own agency landing" on public.agency_landings;
create policy "Agency can insert own agency landing"
on public.agency_landings
for insert
to authenticated
with check (public.quimera_can_manage_agency(tenant_id));

drop policy if exists "Agency can update own agency landing" on public.agency_landings;
create policy "Agency can update own agency landing"
on public.agency_landings
for update
to authenticated
using (public.quimera_can_manage_agency(tenant_id))
with check (public.quimera_can_manage_agency(tenant_id));

drop policy if exists "Agency can delete own agency landing" on public.agency_landings;
create policy "Agency can delete own agency landing"
on public.agency_landings
for delete
to authenticated
using (public.quimera_can_manage_agency(tenant_id));
