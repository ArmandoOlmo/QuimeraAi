-- Ensure Supabase project templates expose the metadata selected by the MCP.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS industries text[] DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects(status);
CREATE INDEX IF NOT EXISTS projects_category_idx ON public.projects(category);
CREATE INDEX IF NOT EXISTS projects_tags_gin_idx ON public.projects USING gin(tags);
CREATE INDEX IF NOT EXISTS projects_industries_gin_idx ON public.projects USING gin(industries);
