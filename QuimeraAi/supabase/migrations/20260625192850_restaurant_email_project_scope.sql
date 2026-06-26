-- Link Restaurant Engine rows to project-scoped Email Marketing Engine runtime.
-- Nullable by design: existing restaurants without an unambiguous project remain non-sending.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.restaurant_reservations
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.restaurant_analytics_events
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

UPDATE public.restaurants r
SET project_id = (
  SELECT pr.id
  FROM public.projects pr
  WHERE pr.tenant_id = r.tenant_id
    AND pr.user_id = r.owner_id
    AND COALESCE(pr.is_archived, false) = false
  ORDER BY pr.created_at DESC NULLS LAST
  LIMIT 1
)
WHERE r.project_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.projects pr
    WHERE pr.tenant_id = r.tenant_id
      AND pr.user_id = r.owner_id
      AND COALESCE(pr.is_archived, false) = false
  );

UPDATE public.restaurant_reservations rr
SET project_id = r.project_id
FROM public.restaurants r
WHERE rr.restaurant_id = r.id
  AND rr.project_id IS NULL
  AND r.project_id IS NOT NULL;

UPDATE public.restaurant_analytics_events rae
SET project_id = r.project_id
FROM public.restaurants r
WHERE rae.restaurant_id = r.id
  AND rae.project_id IS NULL
  AND r.project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS restaurants_project_id_idx
  ON public.restaurants(project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS restaurant_reservations_project_id_idx
  ON public.restaurant_reservations(project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS restaurant_analytics_events_project_id_idx
  ON public.restaurant_analytics_events(project_id)
  WHERE project_id IS NOT NULL;
