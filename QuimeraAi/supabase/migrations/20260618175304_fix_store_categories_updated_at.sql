-- Legacy Quimera installations created store_categories before the dashboard
-- schema existed. The dashboard migration added an updated_at trigger but did
-- not add the updated_at column when the legacy table already existed.
ALTER TABLE public.store_categories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.store_categories
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;
