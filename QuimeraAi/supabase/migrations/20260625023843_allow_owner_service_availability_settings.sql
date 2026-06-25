-- Align service availability persistence with the admin roles exposed in the UI.
-- The browser client still uses RLS; these grants only expose the tables to the
-- Data API and the policies below decide who can write rows.

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_audit_logs ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.settings TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.settings TO authenticated;
GRANT SELECT, INSERT ON TABLE public.service_audit_logs TO authenticated;

DROP POLICY IF EXISTS "Settings readable by everyone" ON public.settings;
CREATE POLICY "Settings readable by everyone"
ON public.settings
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Settings editable by superadmins" ON public.settings;
DROP POLICY IF EXISTS "Settings insertable by platform owners" ON public.settings;
DROP POLICY IF EXISTS "Settings updatable by platform owners" ON public.settings;

CREATE POLICY "Settings insertable by platform owners"
ON public.settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = (SELECT auth.uid())
      AND u.role IN ('owner', 'superadmin')
  )
);

CREATE POLICY "Settings updatable by platform owners"
ON public.settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = (SELECT auth.uid())
      AND u.role IN ('owner', 'superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = (SELECT auth.uid())
      AND u.role IN ('owner', 'superadmin')
  )
);

DROP POLICY IF EXISTS "Audit logs readable by superadmins" ON public.service_audit_logs;
DROP POLICY IF EXISTS "Audit logs insertable by superadmins" ON public.service_audit_logs;
DROP POLICY IF EXISTS "Audit logs readable by platform owners" ON public.service_audit_logs;
DROP POLICY IF EXISTS "Audit logs insertable by platform owners" ON public.service_audit_logs;

CREATE POLICY "Audit logs readable by platform owners"
ON public.service_audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = (SELECT auth.uid())
      AND u.role IN ('owner', 'superadmin')
  )
);

CREATE POLICY "Audit logs insertable by platform owners"
ON public.service_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = (SELECT auth.uid())
      AND u.role IN ('owner', 'superadmin')
  )
);
