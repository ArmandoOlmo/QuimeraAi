-- Enable Supabase Realtime for the media library tables so generated/uploaded
-- images appear in the project / admin / global libraries instantly without
-- requiring a full page reload.
--
-- Without these statements, the postgres_changes subscriptions in
-- FilesContext.tsx never fire because the tables are not part of the
-- supabase_realtime publication.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.files;
        EXCEPTION WHEN duplicate_object THEN
            -- already added
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_assets;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.global_files;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;
