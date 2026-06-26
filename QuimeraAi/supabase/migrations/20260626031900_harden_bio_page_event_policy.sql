-- Harden public Bio Page analytics writes so anonymous traffic cannot spoof
-- project scope or attribute events to hidden/foreign links and blocks.

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
    and jsonb_typeof(coalesce(utm, '{}'::jsonb)) = 'object'
    and jsonb_typeof(coalesce(metadata, '{}'::jsonb)) = 'object'
    and octet_length(coalesce(metadata, '{}'::jsonb)::text) <= 4096
    and (source is null or char_length(source) <= 80)
    and (referrer is null or char_length(referrer) <= 240)
    and exists (
        select 1
        from public.bio_pages bp
        where bp.id = bio_page_events.bio_page_id
          and bp.project_id = bio_page_events.project_id
          and bp.tenant_id is not distinct from bio_page_events.tenant_id
          and bp.status = 'published'
    )
    and (
        bio_page_events.block_id is null
        or exists (
            select 1
            from public.bio_page_blocks b
            where b.id = bio_page_events.block_id
              and b.bio_page_id = bio_page_events.bio_page_id
              and b.project_id = bio_page_events.project_id
              and b.tenant_id is not distinct from bio_page_events.tenant_id
              and b.visible = true
        )
    )
    and (
        bio_page_events.link_id is null
        or exists (
            select 1
            from public.bio_page_links l
            where l.id = bio_page_events.link_id
              and l.bio_page_id = bio_page_events.bio_page_id
              and l.project_id = bio_page_events.project_id
              and l.tenant_id is not distinct from bio_page_events.tenant_id
              and l.visible = true
              and (
                l.block_id is null
                or exists (
                    select 1
                    from public.bio_page_blocks lb
                    where lb.id = l.block_id
                      and lb.bio_page_id = bio_page_events.bio_page_id
                      and lb.project_id = bio_page_events.project_id
                      and lb.tenant_id is not distinct from bio_page_events.tenant_id
                      and lb.visible = true
                )
              )
              and (
                bio_page_events.block_id is null
                or l.block_id is null
                or l.block_id = bio_page_events.block_id
              )
        )
    )
    and (
        event_type not in ('bio_link_clicked', 'bio_social_clicked', 'bio_collection_clicked')
        or bio_page_events.link_id is not null
    )
    and (
        event_type <> 'bio_product_clicked'
        or bio_page_events.block_id is not null
        or bio_page_events.link_id is not null
    )
);

drop policy if exists "Public can subscribe to published bio pages" on public.bio_page_subscribers;

create policy "Public can subscribe to published bio pages"
on public.bio_page_subscribers for insert
to anon, authenticated
with check (
    consent = true
    and source = 'bio_page'
    and char_length(email) <= 254
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and (name is null or char_length(name) <= 160)
    and jsonb_typeof(coalesce(metadata, '{}'::jsonb)) = 'object'
    and octet_length(coalesce(metadata, '{}'::jsonb)::text) <= 4096
    and exists (
        select 1
        from public.bio_pages bp
        where bp.id = bio_page_subscribers.bio_page_id
          and bp.project_id = bio_page_subscribers.project_id
          and bp.tenant_id is not distinct from bio_page_subscribers.tenant_id
          and bp.status = 'published'
    )
);
