-- Create visual_identity_references table for project-specific image references
-- Used by the Visual Identity Kit system to persist brand characters, backgrounds, elements, etc.
CREATE TABLE visual_identity_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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
CREATE INDEX idx_vir_project ON visual_identity_references(project_id);

-- Index for filtering by usage type
CREATE INDEX idx_vir_usage ON visual_identity_references(usage);

-- Index for fetching default references quickly
CREATE INDEX idx_vir_default ON visual_identity_references(project_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE visual_identity_references ENABLE ROW LEVEL SECURITY;

-- Allow project members to view references
CREATE POLICY "Project members can view visual identity references"
  ON visual_identity_references
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = visual_identity_references.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Allow project members to insert references
CREATE POLICY "Project members can insert visual identity references"
  ON visual_identity_references
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = visual_identity_references.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Allow project members to update their references
CREATE POLICY "Project members can update visual identity references"
  ON visual_identity_references
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = visual_identity_references.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Allow project members to delete references
CREATE POLICY "Project members can delete visual identity references"
  ON visual_identity_references
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = visual_identity_references.project_id
      AND pm.user_id = auth.uid()
    )
  );
