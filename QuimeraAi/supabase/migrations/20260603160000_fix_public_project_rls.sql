-- Fix public website reads.
--
-- Some project SELECT policies touch tenant_members, whose policy calls
-- get_auth_user_tenants(). Public site loads can run as anon, and authenticated
-- visitors may not belong to the project tenant. Both cases still need to read
-- published projects.

GRANT EXECUTE ON FUNCTION public.get_auth_user_tenants() TO anon;
GRANT EXECUTE ON FUNCTION public.get_auth_user_tenants() TO authenticated;

DROP POLICY IF EXISTS "Public can read published projects" ON public.projects;
CREATE POLICY "Public can read published projects" ON public.projects
  FOR SELECT
  USING (published_data IS NOT NULL);
