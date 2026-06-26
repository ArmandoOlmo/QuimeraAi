-- Canonical Bio Page Engine
-- Project-scoped, tenant-aware, public-read only when published.

create table if not exists public.bio_pages (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid,
    project_id uuid not null,
    user_id uuid not null,
    slug text not null,
    title text not null default '',
    description text not null default '',
    profile jsonb not null default '{}'::jsonb,
    theme jsonb not null default '{}'::jsonb,
    seo jsonb not null default '{}'::jsonb,
    settings jsonb not null default '{}'::jsonb,
    status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
    published_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.bio_page_blocks (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid,
    project_id uuid not null,
    bio_page_id uuid not null references public.bio_pages(id) on delete cascade,
    type text not null,
    title text not null default '',
    description text,
    order_index integer not null default 0,
    visible boolean not null default true,
    data jsonb not null default '{}'::jsonb,
    settings jsonb not null default '{}'::jsonb,
    source_module text,
    source_entity_id text,
    generated_by_ai boolean not null default false,
    needs_review boolean not null default false,
    user_modified boolean not null default false,
    locked_from_regeneration boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.bio_page_links (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid,
    project_id uuid not null,
    bio_page_id uuid not null references public.bio_pages(id) on delete cascade,
    block_id uuid references public.bio_page_blocks(id) on delete set null,
    title text not null default '',
    url text not null default '',
    description text,
    icon text,
    image_url text,
    platform text,
    link_type text not null default 'external',
    order_index integer not null default 0,
    visible boolean not null default true,
    click_tracking_enabled boolean not null default true,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.bio_page_events (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid,
    project_id uuid not null,
    bio_page_id uuid not null references public.bio_pages(id) on delete cascade,
    block_id uuid references public.bio_page_blocks(id) on delete set null,
    link_id uuid references public.bio_page_links(id) on delete set null,
    event_type text not null,
    source text,
    referrer text,
    utm jsonb not null default '{}'::jsonb,
    user_agent text,
    ip_hash text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.bio_page_qr_codes (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid,
    project_id uuid not null,
    bio_page_id uuid not null references public.bio_pages(id) on delete cascade,
    url text not null,
    color text,
    background_color text,
    logo_url text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.bio_page_subscribers (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid,
    project_id uuid not null,
    bio_page_id uuid not null references public.bio_pages(id) on delete cascade,
    email text not null,
    name text,
    consent boolean not null default false,
    source text not null default 'bio_page',
    audience_id text,
    metadata jsonb not null default '{}'::jsonb,
    subscribed_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    unique (bio_page_id, email)
);

create unique index if not exists bio_pages_slug_unique_idx on public.bio_pages (lower(slug));
create index if not exists bio_pages_project_id_idx on public.bio_pages (project_id);
create index if not exists bio_pages_tenant_id_idx on public.bio_pages (tenant_id);
create index if not exists bio_pages_user_id_idx on public.bio_pages (user_id);
create index if not exists bio_pages_status_idx on public.bio_pages (status);
create index if not exists bio_pages_created_at_idx on public.bio_pages (created_at);

create index if not exists bio_page_blocks_page_order_idx on public.bio_page_blocks (bio_page_id, order_index);
create index if not exists bio_page_blocks_project_id_idx on public.bio_page_blocks (project_id);
create index if not exists bio_page_blocks_tenant_id_idx on public.bio_page_blocks (tenant_id);
create index if not exists bio_page_blocks_visible_idx on public.bio_page_blocks (visible);

create index if not exists bio_page_links_page_order_idx on public.bio_page_links (bio_page_id, order_index);
create index if not exists bio_page_links_project_id_idx on public.bio_page_links (project_id);
create index if not exists bio_page_links_tenant_id_idx on public.bio_page_links (tenant_id);
create index if not exists bio_page_links_visible_idx on public.bio_page_links (visible);

create index if not exists bio_page_events_page_created_idx on public.bio_page_events (bio_page_id, created_at);
create index if not exists bio_page_events_project_created_idx on public.bio_page_events (project_id, created_at);
create index if not exists bio_page_events_type_idx on public.bio_page_events (event_type);
create index if not exists bio_page_events_link_id_idx on public.bio_page_events (link_id);

create index if not exists bio_page_qr_codes_page_idx on public.bio_page_qr_codes (bio_page_id);
create unique index if not exists bio_page_qr_codes_page_unique_idx on public.bio_page_qr_codes (bio_page_id);
create index if not exists bio_page_subscribers_page_idx on public.bio_page_subscribers (bio_page_id);
create index if not exists bio_page_subscribers_project_idx on public.bio_page_subscribers (project_id);
create index if not exists bio_page_subscribers_created_idx on public.bio_page_subscribers (created_at);

alter table public.bio_pages enable row level security;
alter table public.bio_page_blocks enable row level security;
alter table public.bio_page_links enable row level security;
alter table public.bio_page_events enable row level security;
alter table public.bio_page_qr_codes enable row level security;
alter table public.bio_page_subscribers enable row level security;

grant select on public.bio_pages to anon, authenticated;
grant select on public.bio_page_blocks to anon, authenticated;
grant select on public.bio_page_links to anon, authenticated;
grant insert on public.bio_page_events to anon, authenticated;
grant insert on public.bio_page_subscribers to anon, authenticated;
grant select, insert, update, delete on public.bio_pages to authenticated;
grant select, insert, update, delete on public.bio_page_blocks to authenticated;
grant select, insert, update, delete on public.bio_page_links to authenticated;
grant select, insert, update, delete on public.bio_page_qr_codes to authenticated;
grant select, insert, update, delete on public.bio_page_subscribers to authenticated;
grant select on public.bio_page_events to authenticated;
grant select, insert, update, delete on public.bio_pages to service_role;
grant select, insert, update, delete on public.bio_page_blocks to service_role;
grant select, insert, update, delete on public.bio_page_links to service_role;
grant select, insert, update, delete on public.bio_page_events to service_role;
grant select, insert, update, delete on public.bio_page_qr_codes to service_role;
grant select, insert, update, delete on public.bio_page_subscribers to service_role;
grant insert on public.leads to anon, authenticated;

drop policy if exists "Public can read published bio pages" on public.bio_pages;
create policy "Public can read published bio pages"
on public.bio_pages for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Project owners can manage bio pages" on public.bio_pages;
create policy "Project owners can manage bio pages"
on public.bio_pages for all
to authenticated
using (
    user_id = (select auth.uid())
    or exists (
        select 1 from public.tenant_members tm
        where tm.tenant_id = bio_pages.tenant_id
          and tm.user_id = (select auth.uid())
    )
)
with check (
    user_id = (select auth.uid())
    or exists (
        select 1 from public.tenant_members tm
        where tm.tenant_id = bio_pages.tenant_id
          and tm.user_id = (select auth.uid())
    )
);

drop policy if exists "Public can read visible published bio blocks" on public.bio_page_blocks;
create policy "Public can read visible published bio blocks"
on public.bio_page_blocks for select
to anon, authenticated
using (
    visible = true
    and exists (
        select 1 from public.bio_pages bp
        where bp.id = bio_page_blocks.bio_page_id
          and bp.status = 'published'
    )
);

drop policy if exists "Project owners can manage bio blocks" on public.bio_page_blocks;
create policy "Project owners can manage bio blocks"
on public.bio_page_blocks for all
to authenticated
using (
    exists (
        select 1 from public.bio_pages bp
        where bp.id = bio_page_blocks.bio_page_id
          and (
            bp.user_id = (select auth.uid())
            or exists (
                select 1 from public.tenant_members tm
                where tm.tenant_id = bp.tenant_id
                  and tm.user_id = (select auth.uid())
            )
          )
    )
)
with check (
    exists (
        select 1 from public.bio_pages bp
        where bp.id = bio_page_blocks.bio_page_id
          and (
            bp.user_id = (select auth.uid())
            or exists (
                select 1 from public.tenant_members tm
                where tm.tenant_id = bp.tenant_id
                  and tm.user_id = (select auth.uid())
            )
          )
    )
);

drop policy if exists "Public can read visible published bio links" on public.bio_page_links;
create policy "Public can read visible published bio links"
on public.bio_page_links for select
to anon, authenticated
using (
    visible = true
    and exists (
        select 1 from public.bio_pages bp
        where bp.id = bio_page_links.bio_page_id
          and bp.status = 'published'
    )
);

drop policy if exists "Project owners can manage bio links" on public.bio_page_links;
create policy "Project owners can manage bio links"
on public.bio_page_links for all
to authenticated
using (
    exists (
        select 1 from public.bio_pages bp
        where bp.id = bio_page_links.bio_page_id
          and (
            bp.user_id = (select auth.uid())
            or exists (
                select 1 from public.tenant_members tm
                where tm.tenant_id = bp.tenant_id
                  and tm.user_id = (select auth.uid())
            )
          )
    )
)
with check (
    exists (
        select 1 from public.bio_pages bp
        where bp.id = bio_page_links.bio_page_id
          and (
            bp.user_id = (select auth.uid())
            or exists (
                select 1 from public.tenant_members tm
                where tm.tenant_id = bp.tenant_id
                  and tm.user_id = (select auth.uid())
            )
          )
    )
);

drop policy if exists "Public can insert safe bio analytics events" on public.bio_page_events;
create policy "Public can insert safe bio analytics events"
on public.bio_page_events for insert
to anon, authenticated
with check (
    event_type in (
        'bio_page_viewed',
        'bio_profile_shared',
        'bio_qr_scanned',
        'bio_link_clicked',
        'bio_social_clicked',
        'bio_product_clicked',
        'bio_collection_clicked',
        'bio_booking_started',
        'bio_booking_completed',
        'bio_lead_submitted',
        'bio_email_subscribed',
        'bio_chat_opened',
        'bio_tab_changed'
    )
    and exists (
        select 1 from public.bio_pages bp
        where bp.id = bio_page_events.bio_page_id
          and bp.status = 'published'
    )
);

drop policy if exists "Project owners can read bio analytics events" on public.bio_page_events;
create policy "Project owners can read bio analytics events"
on public.bio_page_events for select
to authenticated
using (
    exists (
        select 1 from public.bio_pages bp
        where bp.id = bio_page_events.bio_page_id
          and (
            bp.user_id = (select auth.uid())
            or exists (
                select 1 from public.tenant_members tm
                where tm.tenant_id = bp.tenant_id
                  and tm.user_id = (select auth.uid())
            )
          )
    )
);

drop policy if exists "Project owners can manage bio QR codes" on public.bio_page_qr_codes;
create policy "Project owners can manage bio QR codes"
on public.bio_page_qr_codes for all
to authenticated
using (
    exists (
        select 1 from public.bio_pages bp
        where bp.id = bio_page_qr_codes.bio_page_id
          and (
            bp.user_id = (select auth.uid())
            or exists (
                select 1 from public.tenant_members tm
                where tm.tenant_id = bp.tenant_id
                  and tm.user_id = (select auth.uid())
            )
          )
    )
)
with check (
    exists (
        select 1 from public.bio_pages bp
        where bp.id = bio_page_qr_codes.bio_page_id
          and (
            bp.user_id = (select auth.uid())
            or exists (
                select 1 from public.tenant_members tm
                where tm.tenant_id = bp.tenant_id
                  and tm.user_id = (select auth.uid())
            )
          )
    )
);

drop policy if exists "Public can subscribe to published bio pages" on public.bio_page_subscribers;
create policy "Public can subscribe to published bio pages"
on public.bio_page_subscribers for insert
to anon, authenticated
with check (
    consent = true
    and exists (
        select 1 from public.bio_pages bp
        where bp.id = bio_page_subscribers.bio_page_id
          and bp.status = 'published'
    )
);

drop policy if exists "Project owners can manage bio subscribers" on public.bio_page_subscribers;
create policy "Project owners can manage bio subscribers"
on public.bio_page_subscribers for all
to authenticated
using (
    exists (
        select 1 from public.bio_pages bp
        where bp.id = bio_page_subscribers.bio_page_id
          and (
            bp.user_id = (select auth.uid())
            or exists (
                select 1 from public.tenant_members tm
                where tm.tenant_id = bp.tenant_id
                  and tm.user_id = (select auth.uid())
            )
          )
    )
)
with check (
    exists (
        select 1 from public.bio_pages bp
        where bp.id = bio_page_subscribers.bio_page_id
          and (
            bp.user_id = (select auth.uid())
            or exists (
                select 1 from public.tenant_members tm
                where tm.tenant_id = bp.tenant_id
                  and tm.user_id = (select auth.uid())
            )
          )
    )
);

drop policy if exists "Public can create CRM leads from published bio pages" on public.leads;
create policy "Public can create CRM leads from published bio pages"
on public.leads for insert
to anon, authenticated
with check (
    source in ('bio_page', 'bio_page_chat')
    and exists (
        select 1 from public.bio_pages bp
        where bp.project_id::text = leads.project_id
          and bp.tenant_id = leads.tenant_id
          and bp.status = 'published'
    )
);
