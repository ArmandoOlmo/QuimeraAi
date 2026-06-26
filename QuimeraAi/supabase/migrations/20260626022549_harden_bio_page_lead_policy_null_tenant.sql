-- Allow project-scoped Bio Pages without a tenant to create public CRM leads
-- while keeping tenant-bearing pages isolated to matching tenant leads.

drop policy if exists "Public can create CRM leads from published bio pages" on public.leads;

create policy "Public can create CRM leads from published bio pages"
on public.leads for insert
to anon, authenticated
with check (
    source in ('bio_page', 'bio_page_chat')
    and exists (
        select 1 from public.bio_pages bp
        where bp.project_id::text = leads.project_id
          and bp.tenant_id is not distinct from leads.tenant_id
          and bp.status = 'published'
    )
);
