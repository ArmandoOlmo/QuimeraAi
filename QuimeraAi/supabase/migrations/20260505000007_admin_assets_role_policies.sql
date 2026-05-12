-- Allow the same admin roles exposed in the app UI to manage shared asset libraries.
DROP POLICY IF EXISTS "Superadmins can manage admin assets" ON public.admin_assets;
CREATE POLICY "Admins can manage admin assets" ON public.admin_assets
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('owner', 'superadmin', 'admin')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('owner', 'superadmin', 'admin')
  )
);

DROP POLICY IF EXISTS "Superadmins can manage global files" ON public.global_files;
CREATE POLICY "Admins can manage global files" ON public.global_files
FOR ALL USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('owner', 'superadmin', 'admin')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('owner', 'superadmin', 'admin')
  )
);
