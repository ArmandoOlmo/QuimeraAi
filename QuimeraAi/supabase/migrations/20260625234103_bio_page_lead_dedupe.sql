-- Prevent repeated public Bio Page submissions from creating duplicate CRM leads.
-- The key is written by Bio Page Engine for new submissions, so this does not
-- touch or fail on historical CRM rows that predate the canonical Bio Page flow.

CREATE UNIQUE INDEX IF NOT EXISTS leads_bio_page_project_email_source_unique_idx
ON public.leads (
    project_id,
    source,
    (custom_data->>'bioPageDedupeKey')
)
WHERE source IN ('bio_page', 'bio_page_chat')
  AND email IS NOT NULL
  AND btrim(email) <> ''
  AND custom_data ? 'bioPageDedupeKey'
  AND btrim(custom_data->>'bioPageDedupeKey') <> '';
