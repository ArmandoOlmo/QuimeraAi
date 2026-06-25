-- Realty Engine lead pipeline canonicalization.
--
-- Public property pages only write property_leads. This migration makes the
-- AI-powered Realty lead pipeline explicit at the database layer: idempotency,
-- lead intent tags, review state, CRM tags, and draft timeline events are
-- preserved without exposing service-role credentials or activating email,
-- calendar, chatbot, analytics, or payment runtimes.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

ALTER TABLE public.property_leads
    ADD COLUMN IF NOT EXISTS pipeline_idempotency_key text,
    ADD COLUMN IF NOT EXISTS pipeline_event_type text,
    ADD COLUMN IF NOT EXISTS pipeline_source text,
    ADD COLUMN IF NOT EXISTS lead_tags text[] DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT true;

ALTER TABLE public.property_lead_events
    ADD COLUMN IF NOT EXISTS pipeline_idempotency_key text,
    ADD COLUMN IF NOT EXISTS pipeline_event_type text,
    ADD COLUMN IF NOT EXISTS pipeline_source text,
    ADD COLUMN IF NOT EXISTS draft_status text DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS no_runtime_activated boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS property_leads_pipeline_event_type_idx
ON public.property_leads (pipeline_event_type)
WHERE pipeline_event_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS property_leads_pipeline_source_idx
ON public.property_leads (pipeline_source)
WHERE pipeline_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS property_leads_lead_tags_idx
ON public.property_leads USING gin (lead_tags);

CREATE INDEX IF NOT EXISTS property_lead_events_pipeline_event_type_idx
ON public.property_lead_events (pipeline_event_type)
WHERE pipeline_event_type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS property_lead_events_property_pipeline_key_unique_idx
ON public.property_lead_events (property_lead_id, pipeline_idempotency_key)
WHERE pipeline_idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION private.default_realty_lead_tags(
    p_metadata jsonb,
    p_property_key text,
    p_event_type text,
    p_lead_type text
)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_tags text[] := ARRAY[]::text[];
    v_event_tag text := replace(COALESCE(NULLIF(p_event_type, ''), 'property_inquiry'), '_', '-');
    v_lead_type text := COALESCE(NULLIF(p_lead_type, ''), 'buyer');
BEGIN
    IF jsonb_typeof(COALESCE(p_metadata, '{}'::jsonb)->'leadTags') = 'array' THEN
        SELECT COALESCE(array_agg(DISTINCT btrim(tag.value)), ARRAY[]::text[])
        INTO v_tags
        FROM jsonb_array_elements_text(p_metadata->'leadTags') AS tag(value)
        WHERE btrim(tag.value) <> '';
    END IF;

    v_tags := COALESCE(v_tags, ARRAY[]::text[])
        || ARRAY['realty', 'website', v_event_tag, v_lead_type];

    IF COALESCE(p_property_key, '') <> '' THEN
        v_tags := v_tags || ARRAY['property:' || p_property_key];
    END IF;

    IF p_event_type = 'open_house_registration' THEN
        v_tags := v_tags || ARRAY['open-house', 'high-intent'];
    ELSIF p_event_type = 'showing_request' THEN
        v_tags := v_tags || ARRAY['high-intent'];
    END IF;

    RETURN ARRAY(
        SELECT DISTINCT normalized.tag
        FROM unnest(v_tags) AS normalized(tag)
        WHERE normalized.tag IS NOT NULL
          AND btrim(normalized.tag) <> ''
        ORDER BY normalized.tag
    );
END;
$$;

REVOKE ALL ON FUNCTION private.default_realty_lead_tags(jsonb, text, text, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.normalize_property_lead_pipeline_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_metadata jsonb := COALESCE(NEW.metadata, '{}'::jsonb);
    v_is_pipeline boolean;
    v_event_type text;
    v_idempotency_key text;
    v_pipeline_source text;
BEGIN
    v_event_type := COALESCE(
        NULLIF(NEW.pipeline_event_type, ''),
        NULLIF(v_metadata->>'pipelineEventType', ''),
        NULLIF(v_metadata->>'leadSourceDetail', '')
    );
    v_idempotency_key := COALESCE(
        NULLIF(NEW.pipeline_idempotency_key, ''),
        NULLIF(v_metadata->>'idempotencyKey', '')
    );
    v_pipeline_source := COALESCE(
        NULLIF(NEW.pipeline_source, ''),
        NULLIF(v_metadata->>'source', '')
    );
    v_is_pipeline := v_pipeline_source = 'realty-lead-pipeline'
        OR v_idempotency_key IS NOT NULL
        OR v_event_type IS NOT NULL;

    NEW.metadata := v_metadata;

    IF NOT v_is_pipeline THEN
        IF NEW.lead_tags IS NULL OR array_length(NEW.lead_tags, 1) IS NULL THEN
            NEW.lead_tags := private.default_realty_lead_tags(
                v_metadata,
                NEW.property_id::text,
                COALESCE(v_event_type, 'property_inquiry'),
                NEW.lead_type
            );
        END IF;
        RETURN NEW;
    END IF;

    NEW.pipeline_event_type := COALESCE(v_event_type, 'property_inquiry');
    NEW.pipeline_idempotency_key := v_idempotency_key;
    NEW.pipeline_source := COALESCE(v_pipeline_source, 'realty-lead-pipeline');
    NEW.needs_review := COALESCE(
        NEW.needs_review,
        CASE
            WHEN v_metadata->>'needsReview' IN ('true', 'false')
                THEN (v_metadata->>'needsReview')::boolean
            ELSE true
        END
    );
    NEW.lead_tags := private.default_realty_lead_tags(
        v_metadata,
        NEW.property_id::text,
        NEW.pipeline_event_type,
        NEW.lead_type
    );
    NEW.metadata := v_metadata
        || jsonb_strip_nulls(jsonb_build_object(
            'source', NEW.pipeline_source,
            'pipelineEventType', NEW.pipeline_event_type,
            'leadSourceDetail', NEW.pipeline_event_type,
            'idempotencyKey', NEW.pipeline_idempotency_key,
            'leadTags', to_jsonb(NEW.lead_tags),
            'needsReview', NEW.needs_review
        ));

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.normalize_property_lead_pipeline_fields() FROM PUBLIC;

UPDATE public.property_leads
SET
    pipeline_idempotency_key = COALESCE(pipeline_idempotency_key, NULLIF(metadata->>'idempotencyKey', '')),
    pipeline_event_type = COALESCE(
        pipeline_event_type,
        NULLIF(metadata->>'pipelineEventType', ''),
        NULLIF(metadata->>'leadSourceDetail', '')
    ),
    pipeline_source = COALESCE(pipeline_source, NULLIF(metadata->>'source', '')),
    needs_review = COALESCE(
        needs_review,
        CASE
            WHEN metadata->>'needsReview' IN ('true', 'false')
                THEN (metadata->>'needsReview')::boolean
            ELSE true
        END
    ),
    lead_tags = private.default_realty_lead_tags(
        COALESCE(metadata, '{}'::jsonb),
        property_id::text,
        COALESCE(NULLIF(metadata->>'pipelineEventType', ''), NULLIF(metadata->>'leadSourceDetail', ''), 'property_inquiry'),
        lead_type
    )
WHERE metadata ? 'idempotencyKey'
   OR metadata ? 'pipelineEventType'
   OR metadata ? 'leadSourceDetail'
   OR metadata->>'source' = 'realty-lead-pipeline';

CREATE OR REPLACE FUNCTION private.dedupe_property_lead_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_property record;
    v_existing_id uuid;
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

    PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::text || ':' || lower(NEW.email) || ':' || NEW.property_id::text));

    SELECT pl.id
    INTO v_existing_id
    FROM public.property_leads pl
    WHERE pl.project_id = NEW.project_id
      AND pl.property_id = NEW.property_id
      AND lower(btrim(pl.email)) = lower(NEW.email)
    ORDER BY pl.updated_at DESC NULLS LAST, pl.created_at DESC NULLS LAST
    LIMIT 1;

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

CREATE OR REPLACE FUNCTION private.sync_property_lead_to_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_property record;
    v_tenant_uuid uuid;
    v_crm_lead_id uuid;
    v_status text;
    v_source text;
    v_notes text;
    v_budget numeric;
    v_property_key text;
    v_custom_data jsonb;
    v_tags text[];
BEGIN
    IF current_setting('quimera.realty_sync_from_crm', true) = 'on' THEN
        RETURN NEW;
    END IF;

    SELECT
        p.id,
        p.title,
        p.slug,
        p.price,
        p.user_id,
        p.tenant_id,
        p.project_id
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

    IF NEW.tenant_id IS NULL
       OR NEW.project_id IS NULL
       OR NEW.email IS NULL
       OR NEW.email = '' THEN
        RETURN NEW;
    END IF;

    v_tenant_uuid := NEW.tenant_id;
    v_status := private.normalize_realty_crm_status(NEW.stage);
    v_source := COALESCE(NULLIF(NEW.source, ''), 'realty-website');
    v_notes := COALESCE(NULLIF(NEW.message, ''), format('Interested in %s', COALESCE(v_property.title, 'property')));
    v_budget := COALESCE(NEW.budget, v_property.price, 0);
    v_property_key := NEW.property_id::text;
    v_tags := CASE
        WHEN NEW.lead_tags IS NOT NULL AND array_length(NEW.lead_tags, 1) IS NOT NULL THEN NEW.lead_tags
        ELSE private.default_realty_lead_tags(NEW.metadata, v_property_key, NEW.pipeline_event_type, NEW.lead_type)
    END;
    v_custom_data := NEW.metadata
        || jsonb_build_object(
            'realtyLead', true,
            'realtyPropertyLeadId', NEW.id,
            'propertyLeadId', NEW.id,
            'realtyPropertyId', NEW.property_id,
            'propertyId', NEW.property_id,
            'realtyPropertyTitle', COALESCE(v_property.title, ''),
            'propertyTitle', COALESCE(v_property.title, ''),
            'realtyPropertySlug', COALESCE(v_property.slug, ''),
            'propertySlug', COALESCE(v_property.slug, ''),
            'message', v_notes,
            'preferredDate', NEW.preferred_date,
            'budget', v_budget,
            'sourceComponent', COALESCE(NEW.metadata->>'sourceComponent', 'realty-property-lead-trigger'),
            'syncedFrom', 'property_leads',
            'syncedAt', now(),
            'pipelineEventType', NEW.pipeline_event_type,
            'pipelineIdempotencyKey', NEW.pipeline_idempotency_key,
            'leadTags', to_jsonb(v_tags),
            'needsReview', COALESCE(NEW.needs_review, true)
        );

    PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::text || ':' || lower(NEW.email) || ':' || v_property_key));

    IF NEW.crm_lead_id IS NOT NULL THEN
        SELECT l.id
        INTO v_crm_lead_id
        FROM public.leads l
        WHERE l.id = NEW.crm_lead_id
        LIMIT 1;
    END IF;

    IF v_crm_lead_id IS NULL THEN
        SELECT l.id
        INTO v_crm_lead_id
        FROM public.leads l
        WHERE l.project_id = NEW.project_id::text
          AND l.custom_data->>'propertyLeadId' = NEW.id::text
        ORDER BY l.updated_at DESC NULLS LAST, l.created_at DESC NULLS LAST
        LIMIT 1;
    END IF;

    IF v_crm_lead_id IS NULL THEN
        SELECT l.id
        INTO v_crm_lead_id
        FROM public.leads l
        WHERE l.project_id = NEW.project_id::text
          AND lower(btrim(l.email)) = lower(NEW.email)
          AND COALESCE(l.custom_data->>'propertyId', l.custom_data->>'realtyPropertyId') = v_property_key
          AND (l.source = 'realty-website' OR l.custom_data->>'realtyLead' = 'true')
        ORDER BY l.updated_at DESC NULLS LAST, l.created_at DESC NULLS LAST
        LIMIT 1;
    END IF;

    PERFORM set_config('quimera.realty_sync_from_property', 'on', true);

    IF v_crm_lead_id IS NULL THEN
        INSERT INTO public.leads (
            tenant_id,
            project_id,
            name,
            email,
            phone,
            company,
            status,
            source,
            value,
            tags,
            notes,
            custom_data,
            last_contact_date,
            created_at,
            updated_at
        )
        VALUES (
            v_tenant_uuid,
            NEW.project_id::text,
            NEW.name,
            NEW.email,
            NULLIF(NEW.phone, ''),
            'Realty',
            v_status,
            v_source,
            v_budget,
            v_tags,
            v_notes,
            v_custom_data,
            now(),
            now(),
            now()
        )
        RETURNING id INTO v_crm_lead_id;
    ELSE
        UPDATE public.leads
        SET
            tenant_id = v_tenant_uuid,
            project_id = NEW.project_id::text,
            name = NEW.name,
            email = NEW.email,
            phone = NULLIF(NEW.phone, ''),
            company = COALESCE(NULLIF(company, ''), 'Realty'),
            status = v_status,
            source = v_source,
            value = v_budget,
            tags = v_tags,
            notes = v_notes,
            custom_data = COALESCE(custom_data, '{}'::jsonb) || v_custom_data,
            updated_at = now()
        WHERE id = v_crm_lead_id;
    END IF;

    PERFORM set_config('quimera.realty_sync_from_property', 'off', true);

    NEW.crm_lead_id := v_crm_lead_id;
    NEW.lead_tags := v_tags;
    NEW.metadata := v_custom_data;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_property_lead_to_crm() FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.record_property_lead_pipeline_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_metadata jsonb := COALESCE(NEW.metadata, '{}'::jsonb);
    v_idempotency_key text := COALESCE(NULLIF(NEW.pipeline_idempotency_key, ''), NULLIF(v_metadata->>'idempotencyKey', ''));
    v_event_type text := COALESCE(NULLIF(NEW.pipeline_event_type, ''), NULLIF(v_metadata->>'pipelineEventType', ''), 'property_inquiry');
    v_pipeline_source text := COALESCE(NULLIF(NEW.pipeline_source, ''), NULLIF(v_metadata->>'source', ''));
    v_event_metadata jsonb;
BEGIN
    IF v_pipeline_source <> 'realty-lead-pipeline' OR v_idempotency_key IS NULL THEN
        RETURN NEW;
    END IF;

    v_event_metadata := jsonb_strip_nulls(jsonb_build_object(
        'source', v_pipeline_source,
        'pipelineVersion', v_metadata->'pipelineVersion',
        'pipelineEventType', v_event_type,
        'idempotencyKey', v_idempotency_key,
        'idempotencyBucket', v_metadata->>'idempotencyBucket',
        'sourceComponent', v_metadata->>'sourceComponent',
        'leadIntent', v_metadata->>'leadIntent',
        'leadTags', to_jsonb(COALESCE(NEW.lead_tags, ARRAY[]::text[])),
        'crmLeadId', NEW.crm_lead_id,
        'needsReview', true,
        'noRuntimeActivated', true,
        'noEmailSent', true,
        'noAppointmentCreated', true,
        'noAnalyticsTracked', true,
        'timelineEvents', COALESCE(v_metadata->'timelineEvents', '[]'::jsonb),
        'emailEvents', COALESCE(v_metadata->'emailEvents', '[]'::jsonb),
        'analyticsEvents', COALESCE(v_metadata->'analyticsEvents', '[]'::jsonb),
        'chatbotHandoff', v_metadata->'chatbotHandoff',
        'appointmentRequest', v_metadata->'appointmentRequest',
        'openHouse', v_metadata->'openHouse',
        'showingRequest', v_metadata->'showingRequest'
    ));

    INSERT INTO public.property_lead_events (
        user_id,
        project_id,
        tenant_id,
        property_id,
        property_lead_id,
        event_type,
        note,
        metadata,
        pipeline_idempotency_key,
        pipeline_event_type,
        pipeline_source,
        draft_status,
        needs_review,
        no_runtime_activated,
        created_at,
        updated_at
    )
    VALUES (
        NEW.user_id,
        NEW.project_id,
        NEW.tenant_id,
        NEW.property_id,
        NEW.id,
        v_event_type,
        NEW.message,
        v_event_metadata,
        v_idempotency_key,
        v_event_type,
        v_pipeline_source,
        'draft',
        true,
        true,
        now(),
        now()
    )
    ON CONFLICT (property_lead_id, pipeline_idempotency_key)
    WHERE pipeline_idempotency_key IS NOT NULL
    DO UPDATE SET
        user_id = EXCLUDED.user_id,
        project_id = EXCLUDED.project_id,
        tenant_id = EXCLUDED.tenant_id,
        property_id = EXCLUDED.property_id,
        event_type = EXCLUDED.event_type,
        note = EXCLUDED.note,
        metadata = COALESCE(property_lead_events.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        pipeline_event_type = EXCLUDED.pipeline_event_type,
        pipeline_source = EXCLUDED.pipeline_source,
        draft_status = 'draft',
        needs_review = true,
        no_runtime_activated = true,
        updated_at = now();

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.record_property_lead_pipeline_event() FROM PUBLIC;

INSERT INTO public.property_lead_events (
    user_id,
    project_id,
    tenant_id,
    property_id,
    property_lead_id,
    event_type,
    note,
    metadata,
    pipeline_idempotency_key,
    pipeline_event_type,
    pipeline_source,
    draft_status,
    needs_review,
    no_runtime_activated,
    created_at,
    updated_at
)
SELECT
    pl.user_id,
    pl.project_id,
    pl.tenant_id,
    pl.property_id,
    pl.id,
    COALESCE(pl.pipeline_event_type, 'property_inquiry'),
    pl.message,
    COALESCE(pl.metadata, '{}'::jsonb)
        || jsonb_build_object(
            'needsReview', true,
            'noRuntimeActivated', true,
            'backfilledFrom', 'property_leads'
        ),
    pl.pipeline_idempotency_key,
    COALESCE(pl.pipeline_event_type, 'property_inquiry'),
    pl.pipeline_source,
    'draft',
    true,
    true,
    COALESCE(pl.created_at, now()),
    now()
FROM public.property_leads pl
WHERE pl.pipeline_source = 'realty-lead-pipeline'
  AND pl.pipeline_idempotency_key IS NOT NULL
ON CONFLICT (property_lead_id, pipeline_idempotency_key)
WHERE pipeline_idempotency_key IS NOT NULL
DO UPDATE SET
    metadata = COALESCE(property_lead_events.metadata, '{}'::jsonb) || EXCLUDED.metadata,
    note = EXCLUDED.note,
    pipeline_event_type = EXCLUDED.pipeline_event_type,
    pipeline_source = EXCLUDED.pipeline_source,
    draft_status = 'draft',
    needs_review = true,
    no_runtime_activated = true,
    updated_at = now();

DROP TRIGGER IF EXISTS normalize_property_lead_pipeline_before_write ON public.property_leads;
DROP TRIGGER IF EXISTS a_normalize_property_lead_pipeline_before_write ON public.property_leads;
CREATE TRIGGER a_normalize_property_lead_pipeline_before_write
    BEFORE INSERT OR UPDATE OF
        metadata,
        pipeline_idempotency_key,
        pipeline_event_type,
        pipeline_source,
        lead_tags,
        needs_review,
        lead_type
    ON public.property_leads
    FOR EACH ROW
    EXECUTE FUNCTION private.normalize_property_lead_pipeline_fields();

DROP TRIGGER IF EXISTS sync_property_leads_to_crm_before_write ON public.property_leads;
CREATE TRIGGER sync_property_leads_to_crm_before_write
    BEFORE INSERT OR UPDATE OF
        name,
        email,
        phone,
        message,
        stage,
        lead_type,
        preferred_date,
        budget,
        source,
        metadata,
        crm_lead_id,
        pipeline_idempotency_key,
        pipeline_event_type,
        pipeline_source,
        lead_tags,
        needs_review
    ON public.property_leads
    FOR EACH ROW
    EXECUTE FUNCTION private.sync_property_lead_to_crm();

DROP TRIGGER IF EXISTS record_property_lead_pipeline_event_after_write ON public.property_leads;
CREATE TRIGGER record_property_lead_pipeline_event_after_write
    AFTER INSERT OR UPDATE OF
        metadata,
        pipeline_idempotency_key,
        pipeline_event_type,
        pipeline_source,
        lead_tags,
        needs_review,
        crm_lead_id,
        stage
    ON public.property_leads
    FOR EACH ROW
    EXECUTE FUNCTION private.record_property_lead_pipeline_event();
