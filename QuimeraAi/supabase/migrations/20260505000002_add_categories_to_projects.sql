ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;
