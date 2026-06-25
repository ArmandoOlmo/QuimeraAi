-- Scope Realty public lead dedupe to the canonical pipeline event.
--
-- A buyer can submit a property inquiry, request a showing, and register for
-- an open house on the same property with the same email. Those are distinct
-- Realty pipeline events and should remain visible in Realty while the CRM
-- trigger still updates a single CRM lead for the person/property.

DROP INDEX IF EXISTS public.property_leads_project_email_property_unique_idx;

CREATE UNIQUE INDEX IF NOT EXISTS property_leads_pipeline_key_unique_idx
ON public.property_leads (project_id, pipeline_idempotency_key)
WHERE project_id IS NOT NULL
  AND pipeline_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS property_leads_legacy_project_email_property_unique_idx
ON public.property_leads (project_id, property_id, lower(btrim(email)))
WHERE project_id IS NOT NULL
  AND property_id IS NOT NULL
  AND email IS NOT NULL
  AND pipeline_idempotency_key IS NULL;

CREATE OR REPLACE FUNCTION private.dedupe_property_lead_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_property record;
    v_existing_id uuid;
    v_lock_key text;
BEGIN
    IF NEW.property_id IS NULL OR NEW.email IS NULL OR btrim(NEW.email) = '' THEN
        RETURN NEW;
    END IF;

    SELECT
        p.user_id,
        p.tenant_id,
        p.project_id,
        p.price
    INTO v_property
    FROM public.properties p
    WHERE p.id = NEW.property_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    NEW.user_id := COALESCE(NEW.user_id, v_property.user_id);
    NEW.tenant_id := COALESCE(NEW.tenant_id, v_property.tenant_id);
    NEW.project_id := COALESCE(NEW.project_id, v_property.project_id);
    NEW.email := btrim(NEW.email);
    NEW.source := COALESCE(NULLIF(NEW.source, ''), 'realty-website');
    NEW.stage := COALESCE(NULLIF(NEW.stage, ''), 'new');
    NEW.lead_type := COALESCE(NULLIF(NEW.lead_type, ''), 'buyer');
    NEW.budget := COALESCE(NEW.budget, v_property.price);
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);

    IF NEW.lead_tags IS NULL OR array_length(NEW.lead_tags, 1) IS NULL THEN
        NEW.lead_tags := private.default_realty_lead_tags(
            NEW.metadata,
            NEW.property_id::text,
            NEW.pipeline_event_type,
            NEW.lead_type
        );
    END IF;

    IF NEW.project_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_lock_key := CASE
        WHEN NEW.pipeline_idempotency_key IS NOT NULL AND NEW.pipeline_idempotency_key <> ''
            THEN NEW.project_id::text || ':pipeline:' || NEW.pipeline_idempotency_key
        ELSE NEW.project_id::text || ':legacy:' || NEW.property_id::text || ':' || lower(NEW.email)
    END;

    PERFORM pg_advisory_xact_lock(hashtext(v_lock_key));

    IF NEW.pipeline_idempotency_key IS NOT NULL AND NEW.pipeline_idempotency_key <> '' THEN
        SELECT pl.id
        INTO v_existing_id
        FROM public.property_leads pl
        WHERE pl.project_id = NEW.project_id
          AND pl.pipeline_idempotency_key = NEW.pipeline_idempotency_key
        ORDER BY pl.updated_at DESC NULLS LAST, pl.created_at DESC NULLS LAST
        LIMIT 1;
    ELSE
        SELECT pl.id
        INTO v_existing_id
        FROM public.property_leads pl
        WHERE pl.project_id = NEW.project_id
          AND pl.property_id = NEW.property_id
          AND lower(btrim(pl.email)) = lower(NEW.email)
          AND pl.pipeline_idempotency_key IS NULL
        ORDER BY pl.updated_at DESC NULLS LAST, pl.created_at DESC NULLS LAST
        LIMIT 1;
    END IF;

    IF v_existing_id IS NOT NULL THEN
        UPDATE public.property_leads
        SET
            tenant_id = COALESCE(property_leads.tenant_id, NEW.tenant_id),
            user_id = COALESCE(property_leads.user_id, NEW.user_id),
            name = COALESCE(NULLIF(NEW.name, ''), property_leads.name),
            phone = COALESCE(NULLIF(NEW.phone, ''), property_leads.phone),
            message = COALESCE(NULLIF(NEW.message, ''), property_leads.message),
            stage = COALESCE(NULLIF(property_leads.stage, ''), NULLIF(NEW.stage, ''), 'new'),
            lead_type = COALESCE(NULLIF(NEW.lead_type, ''), property_leads.lead_type, 'buyer'),
            preferred_date = COALESCE(NEW.preferred_date, property_leads.preferred_date),
            budget = COALESCE(NEW.budget, property_leads.budget),
            source = COALESCE(NULLIF(NEW.source, ''), property_leads.source, 'realty-website'),
            pipeline_idempotency_key = COALESCE(NULLIF(NEW.pipeline_idempotency_key, ''), property_leads.pipeline_idempotency_key),
            pipeline_event_type = COALESCE(NULLIF(NEW.pipeline_event_type, ''), property_leads.pipeline_event_type),
            pipeline_source = COALESCE(NULLIF(NEW.pipeline_source, ''), property_leads.pipeline_source),
            lead_tags = CASE
                WHEN NEW.lead_tags IS NOT NULL AND array_length(NEW.lead_tags, 1) IS NOT NULL THEN NEW.lead_tags
                ELSE property_leads.lead_tags
            END,
            needs_review = COALESCE(NEW.needs_review, property_leads.needs_review, true),
            metadata = COALESCE(property_leads.metadata, '{}'::jsonb)
                || NEW.metadata
                || jsonb_build_object(
                    'realtyLead', true,
                    'lastDuplicateSubmissionAt', now()
                ),
            updated_at = now()
        WHERE id = v_existing_id;

        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.dedupe_property_lead_before_insert() FROM PUBLIC;
