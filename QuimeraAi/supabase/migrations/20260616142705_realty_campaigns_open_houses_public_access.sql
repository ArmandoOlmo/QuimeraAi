-- Realty Campaigns/Open Houses incremental access.
-- Keeps campaigns private while allowing public registration discovery for public properties.

CREATE INDEX IF NOT EXISTS property_campaigns_campaign_type_idx ON public.property_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS property_campaigns_status_idx ON public.property_campaigns(status);
CREATE INDEX IF NOT EXISTS property_campaigns_scheduled_at_idx ON public.property_campaigns(scheduled_at);

CREATE INDEX IF NOT EXISTS property_open_houses_status_idx ON public.property_open_houses(status);
CREATE INDEX IF NOT EXISTS property_open_houses_starts_at_idx ON public.property_open_houses(starts_at);
CREATE INDEX IF NOT EXISTS property_open_houses_registration_enabled_idx ON public.property_open_houses(registration_enabled);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_open_houses TO authenticated;
GRANT SELECT ON public.property_open_houses TO anon;

ALTER TABLE public.property_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_open_houses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read open houses for public properties" ON public.property_open_houses;
CREATE POLICY "Public can read open houses for public properties"
ON public.property_open_houses FOR SELECT
TO anon, authenticated
USING (
    registration_enabled = true
    AND status IN ('scheduled', 'active')
    AND EXISTS (
        SELECT 1
        FROM public.properties p
        WHERE p.id = property_open_houses.property_id
          AND p.status = 'active'
          AND p.public_enabled = true
          AND (
              property_open_houses.project_id IS NULL
              OR p.project_id = property_open_houses.project_id
          )
    )
);
