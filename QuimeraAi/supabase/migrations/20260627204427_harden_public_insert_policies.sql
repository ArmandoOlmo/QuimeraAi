-- Harden public insert policies without closing intentional public lead and
-- restaurant reservation flows. No table shape or existing data is changed.

drop policy if exists "Anyone can create platform leads" on public.platform_leads;
drop policy if exists "Public can create valid platform leads" on public.platform_leads;
create policy "Public can create valid platform leads"
  on public.platform_leads
  for insert
  to anon, authenticated
  with check (
    char_length(trim(name)) between 1 and 200
    and char_length(trim(email)) between 3 and 320
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    and char_length(trim(source)) between 1 and 80
    and source ~ '^[A-Za-z0-9_-]+$'
    and status in ('new', 'contacted', 'qualified', 'lost')
    and coalesce(score, 0) between 0 and 100
    and coalesce(project_id, '__platform__') = '__platform__'
    and (phone is null or char_length(trim(phone)) <= 80)
    and (company is null or char_length(trim(company)) <= 200)
    and (message is null or char_length(trim(message)) <= 5000)
    and (metadata is null or jsonb_typeof(metadata) = 'object')
    and (tags is null or jsonb_typeof(tags) = 'array')
  );

drop policy if exists "Public can create reservations" on public.restaurant_reservations;
drop policy if exists "Public can create valid reservations" on public.restaurant_reservations;
create policy "Public can create valid reservations"
  on public.restaurant_reservations
  for insert
  to anon, authenticated
  with check (
    tenant_id is not null
    and restaurant_id is not null
    and exists (
      select 1
      from public.restaurants restaurant_scope
      where restaurant_scope.id = restaurant_reservations.restaurant_id
        and restaurant_scope.tenant_id = restaurant_reservations.tenant_id
        and (
          restaurant_reservations.project_id is null
          or restaurant_scope.project_id = restaurant_reservations.project_id
        )
    )
    and char_length(trim(customer_name)) between 1 and 200
    and char_length(trim(customer_email)) between 3 and 320
    and customer_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    and party_size between 1 and 50
    and status = 'pending'
    and char_length(trim(source)) between 1 and 80
    and source ~ '^[A-Za-z0-9_-]+$'
    and (customer_phone is null or char_length(trim(customer_phone)) <= 80)
    and (table_preference is null or char_length(trim(table_preference)) <= 120)
    and (notes is null or char_length(trim(notes)) <= 5000)
  );

drop policy if exists "Public can insert analytics" on public.restaurant_analytics_events;
drop policy if exists "Public can insert valid analytics events" on public.restaurant_analytics_events;
create policy "Public can insert valid analytics events"
  on public.restaurant_analytics_events
  for insert
  to anon, authenticated
  with check (
    tenant_id is not null
    and restaurant_id is not null
    and exists (
      select 1
      from public.restaurants restaurant_scope
      where restaurant_scope.id = restaurant_analytics_events.restaurant_id
        and restaurant_scope.tenant_id = restaurant_analytics_events.tenant_id
        and (
          restaurant_analytics_events.project_id is null
          or restaurant_scope.project_id = restaurant_analytics_events.project_id
        )
    )
    and char_length(trim(event_name)) between 1 and 120
    and event_name ~ '^[A-Za-z0-9_.:-]+$'
    and (metadata is null or jsonb_typeof(metadata) = 'object')
  );

drop policy if exists "Service role can manage store payment events" on public.store_payment_events;
create policy "Service role can manage store payment events"
  on public.store_payment_events
  for all
  to service_role
  using (true)
  with check (true);
