-- Create visual_identity_references table for project-specific image references
-- Used by the Visual Identity Kit system to persist brand characters, backgrounds, elements, etc.
CREATE TABLE IF NOT EXISTS public.visual_identity_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('character','background','product','element','style','environment','prop','lighting')),
  label TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  ai_prompt_hint TEXT,
  usage TEXT NOT NULL DEFAULT 'optional' CHECK (usage IN ('always','optional','contextual')),
  contextual_triggers TEXT[],
  position TEXT,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by project
CREATE INDEX IF NOT EXISTS idx_vir_project ON public.visual_identity_references(project_id);

-- Index for filtering by usage type
CREATE INDEX IF NOT EXISTS idx_vir_usage ON public.visual_identity_references(usage);

-- Index for fetching default references quickly
CREATE INDEX IF NOT EXISTS idx_vir_default ON public.visual_identity_references(project_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.visual_identity_references ENABLE ROW LEVEL SECURITY;

-- Access: project owner OR tenant member (same pattern as projects UPDATE policy)
CREATE OR REPLACE FUNCTION public.can_access_visual_identity_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.tenant_members tm
          WHERE tm.tenant_id = p.tenant_id
            AND tm.user_id = auth.uid()
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Project members can view visual identity references" ON public.visual_identity_references;
CREATE POLICY "Project members can view visual identity references"
  ON public.visual_identity_references
  FOR SELECT
  USING (public.can_access_visual_identity_project(project_id));

DROP POLICY IF EXISTS "Project members can insert visual identity references" ON public.visual_identity_references;
CREATE POLICY "Project members can insert visual identity references"
  ON public.visual_identity_references
  FOR INSERT
  WITH CHECK (public.can_access_visual_identity_project(project_id));

DROP POLICY IF EXISTS "Project members can update visual identity references" ON public.visual_identity_references;
CREATE POLICY "Project members can update visual identity references"
  ON public.visual_identity_references
  FOR UPDATE
  USING (public.can_access_visual_identity_project(project_id));

DROP POLICY IF EXISTS "Project members can delete visual identity references" ON public.visual_identity_references;
CREATE POLICY "Project members can delete visual identity references"
  ON public.visual_identity_references
  FOR DELETE
  USING (public.can_access_visual_identity_project(project_id));
