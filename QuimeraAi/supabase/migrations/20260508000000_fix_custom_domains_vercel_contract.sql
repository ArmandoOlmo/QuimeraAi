-- ============================================================================
-- Align custom_domains with the app/server contract used for Vercel domains.
-- Older migrations created `domain`; current app code uses `domain_name` + JSONB
-- metadata. Keep both columns populated so old resolvers and new flows agree.
-- ============================================================================

ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS domain_name TEXT;
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS ssl_status TEXT DEFAULT 'pending';
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS dns_verified BOOLEAN DEFAULT false;
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS cloud_run_target TEXT;
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.custom_domains ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.custom_domains
SET
  domain_name = COALESCE(domain_name, domain),
  domain = COALESCE(domain, domain_name),
  data = COALESCE(data, '{}'::jsonb) ||
    jsonb_strip_nulls(jsonb_build_object(
      'domain', COALESCE(domain_name, domain),
      'name', COALESCE(domain_name, domain),
      'projectId', project_id,
      'project_id', project_id,
      'status', status,
      'sslStatus', ssl_status,
      'ssl_status', ssl_status,
      'dnsVerified', dns_verified,
      'dns_verified', dns_verified,
      'cloudRunTarget', cloud_run_target
    ))
WHERE domain_name IS NULL
   OR domain IS NULL
   OR data IS NULL
   OR data = '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS custom_domains_domain_name_key
  ON public.custom_domains(domain_name);

CREATE INDEX IF NOT EXISTS custom_domains_project_id_idx ON public.custom_domains(project_id);
CREATE INDEX IF NOT EXISTS custom_domains_user_id_idx ON public.custom_domains(user_id);

DROP POLICY IF EXISTS "Users can manage their own custom domains" ON public.custom_domains;
CREATE POLICY "Users can manage their own custom domains"
  ON public.custom_domains
  FOR ALL
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      LEFT JOIN public.tenant_members tm ON tm.tenant_id = p.tenant_id
      WHERE p.id = custom_domains.project_id
        AND (p.user_id = auth.uid() OR tm.user_id = auth.uid())
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      LEFT JOIN public.tenant_members tm ON tm.tenant_id = p.tenant_id
      WHERE p.id = custom_domains.project_id
        AND (p.user_id = auth.uid() OR tm.user_id = auth.uid())
    )
  );

-- ============================================================================
-- Domain Normalization Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_custom_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize domain_name and domain
  IF NEW.domain_name IS NULL AND NEW.domain IS NOT NULL THEN
    NEW.domain_name := NEW.domain;
  ELSIF NEW.domain IS NULL AND NEW.domain_name IS NOT NULL THEN
    NEW.domain := NEW.domain_name;
  END IF;

  IF NEW.domain_name IS NOT NULL THEN
    NEW.domain_name := LOWER(TRIM(NEW.domain_name));
  END IF;
  
  IF NEW.domain IS NOT NULL THEN
    NEW.domain := LOWER(TRIM(NEW.domain));
  END IF;

  -- Sync metadata
  NEW.data := COALESCE(NEW.data, '{}'::jsonb) || 
    jsonb_strip_nulls(jsonb_build_object(
      'domain_name', NEW.domain_name,
      'domain', NEW.domain,
      'projectId', NEW.project_id,
      'project_id', NEW.project_id,
      'status', NEW.status,
      'ssl_status', NEW.ssl_status,
      'dns_verified', NEW.dns_verified
    ));

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_normalize_custom_domain ON public.custom_domains;
CREATE TRIGGER tr_normalize_custom_domain
BEFORE INSERT OR UPDATE ON public.custom_domains
FOR EACH ROW EXECUTE FUNCTION public.normalize_custom_domain();
