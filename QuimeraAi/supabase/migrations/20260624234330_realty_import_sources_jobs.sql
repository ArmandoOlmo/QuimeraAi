-- Realty Import source configuration and job history.
--
-- This establishes the persistent contract for future MLS, IDX, CSV, URL, API,
-- and external-feed adapters. It does not store provider secrets and does not
-- activate live feed sync. Imported listings still flow through draft/review.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_realty_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.realty_import_sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    project_id text NOT NULL,
    tenant_id text,
    source_type text NOT NULL DEFAULT 'manual'
        CHECK (source_type IN ('manual', 'csv', 'imported-url', 'mls', 'idx', 'api', 'external-feed')),
    name text NOT NULL,
    provider_name text,
    feed_url text,
    uploaded_file_name text,
    external_account_id text,
    sync_mode text NOT NULL DEFAULT 'manual'
        CHECK (sync_mode IN ('manual', 'scheduled', 'webhook', 'disabled')),
    enabled boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'needs_review', 'configured', 'disabled')),
    last_run_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.realty_import_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    project_id text NOT NULL,
    tenant_id text,
    source_id uuid REFERENCES public.realty_import_sources(id) ON DELETE SET NULL,
    source_type text NOT NULL DEFAULT 'manual'
        CHECK (source_type IN ('manual', 'csv', 'imported-url', 'mls', 'idx', 'api', 'external-feed')),
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'mapping_required', 'ready_for_review', 'completed', 'failed', 'cancelled')),
    mapping jsonb NOT NULL DEFAULT '[]'::jsonb,
    total_rows integer NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
    draft_count integer NOT NULL DEFAULT 0 CHECK (draft_count >= 0),
    duplicate_count integer NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
    error_count integer NOT NULL DEFAULT 0 CHECK (error_count >= 0),
    needs_review boolean NOT NULL DEFAULT true,
    no_auto_publish boolean NOT NULL DEFAULT true,
    started_at timestamptz,
    completed_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS realty_import_sources_user_id_idx
ON public.realty_import_sources(user_id);

CREATE INDEX IF NOT EXISTS realty_import_sources_project_id_idx
ON public.realty_import_sources(project_id);

CREATE INDEX IF NOT EXISTS realty_import_sources_tenant_id_idx
ON public.realty_import_sources(tenant_id);

CREATE INDEX IF NOT EXISTS realty_import_sources_project_source_type_idx
ON public.realty_import_sources(project_id, source_type);

CREATE INDEX IF NOT EXISTS realty_import_sources_project_status_idx
ON public.realty_import_sources(project_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS realty_import_sources_project_name_uidx
ON public.realty_import_sources(project_id, lower(btrim(name)))
WHERE project_id IS NOT NULL
  AND btrim(name) <> '';

CREATE INDEX IF NOT EXISTS realty_import_jobs_user_id_idx
ON public.realty_import_jobs(user_id);

CREATE INDEX IF NOT EXISTS realty_import_jobs_project_id_idx
ON public.realty_import_jobs(project_id);

CREATE INDEX IF NOT EXISTS realty_import_jobs_tenant_id_idx
ON public.realty_import_jobs(tenant_id);

CREATE INDEX IF NOT EXISTS realty_import_jobs_source_id_idx
ON public.realty_import_jobs(source_id);

CREATE INDEX IF NOT EXISTS realty_import_jobs_project_source_type_idx
ON public.realty_import_jobs(project_id, source_type);

CREATE INDEX IF NOT EXISTS realty_import_jobs_project_status_idx
ON public.realty_import_jobs(project_id, status);

CREATE INDEX IF NOT EXISTS realty_import_jobs_created_at_idx
ON public.realty_import_jobs(created_at DESC);

DROP TRIGGER IF EXISTS set_realty_import_sources_updated_at ON public.realty_import_sources;
CREATE TRIGGER set_realty_import_sources_updated_at
    BEFORE UPDATE ON public.realty_import_sources
    FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

DROP TRIGGER IF EXISTS set_realty_import_jobs_updated_at ON public.realty_import_jobs;
CREATE TRIGGER set_realty_import_jobs_updated_at
    BEFORE UPDATE ON public.realty_import_jobs
    FOR EACH ROW EXECUTE FUNCTION public.set_realty_updated_at();

-- Data API grants. These tables are private to authenticated Realty members;
-- row-level access is enforced by RLS below.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.realty_import_sources,
    public.realty_import_jobs
TO authenticated;

ALTER TABLE public.realty_import_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realty_import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Realty members manage import sources" ON public.realty_import_sources;
CREATE POLICY "Realty members manage import sources"
ON public.realty_import_sources FOR ALL
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));

DROP POLICY IF EXISTS "Realty members manage import jobs" ON public.realty_import_jobs;
CREATE POLICY "Realty members manage import jobs"
ON public.realty_import_jobs FOR ALL
TO authenticated
USING (private.can_manage_realty_record(project_id, tenant_id, user_id))
WITH CHECK (private.can_manage_realty_record(project_id, tenant_id, user_id));
