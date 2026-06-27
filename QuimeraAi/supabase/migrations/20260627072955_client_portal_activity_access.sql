-- Client Portal operational feed access.
-- Clients can read agency activity rows for their own workspace while writes
-- remain controlled by the existing agency/service-role paths.

drop policy if exists "Agency and clients can view activity" on public.agency_activity;
create policy "Agency and clients can view activity"
on public.agency_activity
for select
to authenticated
using (
  public.quimera_can_view_agency_relationship(agency_tenant_id::text, client_tenant_id::text)
);

drop policy if exists "Clients can view sent reports" on public.agency_reports;
create policy "Clients can view sent reports"
on public.agency_reports
for select
to authenticated
using (
  status in ('sent', 'published')
  and public.quimera_can_view_agency_relationship(agency_tenant_id::text, client_tenant_id::text)
);
