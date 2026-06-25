-- ============================================================================
-- Harden canonical Appointments Engine database surface
-- ============================================================================
-- Google Calendar OAuth tokens are server-side runtime state. Keep the table
-- visible to the service role only and add explicit deny policies so RLS is
-- intentional instead of "enabled with no policy".

REVOKE ALL ON public.project_google_calendar_integrations FROM anon;
REVOKE ALL ON public.project_google_calendar_integrations FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_google_calendar_integrations TO service_role;

DROP POLICY IF EXISTS "Client cannot read Google Calendar integrations" ON public.project_google_calendar_integrations;
CREATE POLICY "Client cannot read Google Calendar integrations"
  ON public.project_google_calendar_integrations
  FOR SELECT
  TO authenticated
  USING (FALSE);

DROP POLICY IF EXISTS "Client cannot insert Google Calendar integrations" ON public.project_google_calendar_integrations;
CREATE POLICY "Client cannot insert Google Calendar integrations"
  ON public.project_google_calendar_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "Client cannot update Google Calendar integrations" ON public.project_google_calendar_integrations;
CREATE POLICY "Client cannot update Google Calendar integrations"
  ON public.project_google_calendar_integrations
  FOR UPDATE
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "Client cannot delete Google Calendar integrations" ON public.project_google_calendar_integrations;
CREATE POLICY "Client cannot delete Google Calendar integrations"
  ON public.project_google_calendar_integrations
  FOR DELETE
  TO authenticated
  USING (FALSE);

CREATE OR REPLACE FUNCTION public.is_project_appointments_member(target_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = target_project_id
      AND (
        p.user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.tenant_members tm
          WHERE tm.tenant_id = p.tenant_id
            AND tm.user_id = (SELECT auth.uid())
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_appointments_member(UUID) TO authenticated;
