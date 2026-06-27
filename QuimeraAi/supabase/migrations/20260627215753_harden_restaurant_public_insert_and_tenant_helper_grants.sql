-- Apply the final production-readiness hardening incrementally for databases
-- that already received the initial public insert and tenant helper migrations.

revoke execute on function public.get_auth_user_tenants() from public;
revoke execute on function public.get_auth_user_tenants() from anon;
grant execute on function public.get_auth_user_tenants() to authenticated, service_role;

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
