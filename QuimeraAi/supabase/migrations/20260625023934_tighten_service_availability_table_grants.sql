-- The project had broad default table grants on these SQL-created tables.
-- Keep Data API access scoped to the operations allowed by the RLS policies.

REVOKE ALL ON TABLE public.settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.service_audit_logs FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.settings TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.settings TO authenticated;
GRANT SELECT, INSERT ON TABLE public.service_audit_logs TO authenticated;
