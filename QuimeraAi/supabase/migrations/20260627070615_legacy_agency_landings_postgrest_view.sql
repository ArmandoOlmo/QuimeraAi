-- Transitional PostgREST compatibility for bundles that still request
-- /rest/v1/agencyLandings before compatData maps to public.agency_landings.

create or replace view public."agencyLandings"
with (security_invoker = true)
as
select
  id,
  tenant_id,
  data,
  subdomain,
  custom_domain,
  is_published,
  published_at,
  last_updated,
  created_at,
  updated_at,
  updated_by
from public.agency_landings;

revoke all on table public."agencyLandings" from anon, authenticated;
grant select on table public."agencyLandings" to anon, authenticated;
grant insert, update, delete on table public."agencyLandings" to authenticated;
grant select, insert, update, delete on table public."agencyLandings" to service_role;
