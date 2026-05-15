-- Sentinel project + RLS so platform admins can use Visual Identity Kit for /admin/assets content.

INSERT INTO public.projects (
  id,
  name,
  status,
  pages,
  data,
  theme,
  brand_identity,
  component_order,
  section_visibility,
  menus,
  ai_assistant_config,
  seo_config,
  crm_config,
  is_archived
)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  '__Quimera Admin Visual Kit__',
  'Archived',
  '[]'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_access_admin_visual_kit_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_project_id = 'a0000000-0000-4000-8000-000000000001'::uuid
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND COALESCE(u.role, 'user') IN ('superadmin', 'admin', 'owner')
  );
$$;

DROP POLICY IF EXISTS "Project members can view visual identity references" ON public.visual_identity_references;
CREATE POLICY "Project members can view visual identity references"
  ON public.visual_identity_references FOR SELECT
  USING (
    public.can_access_visual_identity_project(project_id)
    OR public.can_access_admin_visual_kit_project(project_id)
  );

DROP POLICY IF EXISTS "Project members can insert visual identity references" ON public.visual_identity_references;
CREATE POLICY "Project members can insert visual identity references"
  ON public.visual_identity_references FOR INSERT
  WITH CHECK (
    public.can_access_visual_identity_project(project_id)
    OR public.can_access_admin_visual_kit_project(project_id)
  );

DROP POLICY IF EXISTS "Project members can update visual identity references" ON public.visual_identity_references;
CREATE POLICY "Project members can update visual identity references"
  ON public.visual_identity_references FOR UPDATE
  USING (
    public.can_access_visual_identity_project(project_id)
    OR public.can_access_admin_visual_kit_project(project_id)
  );

DROP POLICY IF EXISTS "Project members can delete visual identity references" ON public.visual_identity_references;
CREATE POLICY "Project members can delete visual identity references"
  ON public.visual_identity_references FOR DELETE
  USING (
    public.can_access_visual_identity_project(project_id)
    OR public.can_access_admin_visual_kit_project(project_id)
  );
