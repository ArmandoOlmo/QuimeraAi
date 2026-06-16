-- Harden Realty Suite lead synchronization into the general CRM.
--
-- The public website writes to property_leads. These private triggers keep
-- property_leads and leads linked without exposing service-role credentials in
-- the frontend and without duplicating leads for the same project/email/property.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.normalize_realty_crm_status(p_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE COALESCE(NULLIF(p_status, ''), 'new')
        WHEN 'showing_scheduled' THEN 'qualified'
        WHEN 'offer_made' THEN 'negotiation'
        WHEN 'under_contract' THEN 'negotiation'
        WHEN 'closed' THEN 'won'
        WHEN 'converted' THEN 'won'
        WHEN 'contacted' THEN 'contacted'
        WHEN 'qualified' THEN 'qualified'
        WHEN 'negotiation' THEN 'negotiation'
        WHEN 'won' THEN 'won'
        WHEN 'lost' THEN 'lost'
        ELSE 'new'
    END;
$$;

REVOKE ALL ON FUNCTION private.normalize_realty_crm_status(text) FROM PUBLIC;

-- Merge historical duplicate CRM leads before enforcing the unique key.
DROP TABLE IF EXISTS pg_temp.duplicate_realty_crm_leads;
CREATE TEMP TABLE duplicate_realty_crm_leads ON COMMIT DROP AS
WITH scoped AS (
    SELECT
        id,
        first_value(id) OVER (
            PARTITION BY
                project_id,
                lower(btrim(email)),
                COALESCE(custom_data->>'propertyId', custom_data->>'realtyPropertyId')
            ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        ) AS keep_id,
        row_number() OVER (
            PARTITION BY
                project_id,
                lower(btrim(email)),
                COALESCE(custom_data->>'propertyId', custom_data->>'realtyPropertyId')
            ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        ) AS row_num
    FROM public.leads
    WHERE (source = 'realty-website' OR custom_data->>'realtyLead' = 'true')
      AND email IS NOT NULL
      AND btrim(email) <> ''
      AND COALESCE(custom_data->>'propertyId', custom_data->>'realtyPropertyId') IS NOT NULL
)
SELECT id, keep_id
FROM scoped
WHERE row_num > 1;

UPDATE public.property_leads pl
SET crm_lead_id = d.keep_id,
    updated_at = now()
FROM duplicate_realty_crm_leads d
WHERE pl.crm_lead_id = d.id;

UPDATE public.lead_activities la
SET lead_id = d.keep_id
FROM duplicate_realty_crm_leads d
WHERE la.lead_id = d.id;

UPDATE public.lead_tasks lt
SET lead_id = d.keep_id
FROM duplicate_realty_crm_leads d
WHERE lt.lead_id = d.id;

DELETE FROM public.leads l
USING duplicate_realty_crm_leads d
WHERE l.id = d.id;

-- Merge historical duplicate property leads before enforcing the unique key.
DROP TABLE IF EXISTS pg_temp.duplicate_property_leads;
CREATE TEMP TABLE duplicate_property_leads ON COMMIT DROP AS
WITH scoped AS (
    SELECT
        id,
        first_value(id) OVER (
            PARTITION BY project_id, property_id, lower(btrim(email))
            ORDER BY
                (crm_lead_id IS NOT NULL) DESC,
                updated_at DESC NULLS LAST,
                created_at DESC NULLS LAST,
                id DESC
        ) AS keep_id,
        row_number() OVER (
            PARTITION BY project_id, property_id, lower(btrim(email))
            ORDER BY
                (crm_lead_id IS NOT NULL) DESC,
                updated_at DESC NULLS LAST,
                created_at DESC NULLS LAST,
                id DESC
        ) AS row_num
    FROM public.property_leads
    WHERE email IS NOT NULL
      AND btrim(email) <> ''
      AND project_id IS NOT NULL
      AND property_id IS NOT NULL
)
SELECT id, keep_id
FROM scoped
WHERE row_num > 1;

UPDATE public.property_lead_events e
SET property_lead_id = d.keep_id,
    updated_at = now()
FROM duplicate_property_leads d
WHERE e.property_lead_id = d.id;

UPDATE public.leads l
SET custom_data = COALESCE(l.custom_data, '{}'::jsonb)
    || jsonb_build_object(
        'propertyLeadId', d.keep_id,
        'realtyPropertyLeadId', d.keep_id,
        'mergedDuplicatePropertyLeadId', d.id,
        'realtyLead', true
    ),
    updated_at = now()
FROM duplicate_property_leads d
WHERE l.custom_data->>'propertyLeadId' = d.id::text
   OR l.custom_data->>'realtyPropertyLeadId' = d.id::text;

DELETE FROM public.property_leads pl
USING duplicate_property_leads d
WHERE pl.id = d.id;

CREATE UNIQUE INDEX IF NOT EXISTS property_leads_project_email_property_unique_idx
ON public.property_leads (project_id, property_id, lower(btrim(email)))
WHERE email IS NOT NULL
  AND btrim(email) <> ''
  AND project_id IS NOT NULL
  AND property_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS leads_realty_project_email_property_unique_idx
ON public.leads (
    project_id,
    lower(btrim(email)),
    (COALESCE(custom_data->>'propertyId', custom_data->>'realtyPropertyId'))
)
WHERE (source = 'realty-website' OR custom_data->>'realtyLead' = 'true')
  AND email IS NOT NULL
  AND btrim(email) <> ''
  AND COALESCE(custom_data->>'propertyId', custom_data->>'realtyPropertyId') IS NOT NULL;

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
            'syncedAt', now()
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
            ARRAY['realty', 'website', 'property:' || v_property_key],
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
            tags = ARRAY['realty', 'website', 'property:' || v_property_key],
            notes = v_notes,
            custom_data = COALESCE(custom_data, '{}'::jsonb) || v_custom_data,
            updated_at = now()
        WHERE id = v_crm_lead_id;
    END IF;

    PERFORM set_config('quimera.realty_sync_from_property', 'off', true);

    NEW.crm_lead_id := v_crm_lead_id;
    NEW.metadata := v_custom_data;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_property_lead_to_crm() FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.sync_crm_realty_lead_to_property_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_property_lead_id uuid;
    v_property_id uuid;
    v_stage text;
BEGIN
    IF current_setting('quimera.realty_sync_from_property', true) = 'on' THEN
        RETURN NEW;
    END IF;

    IF NOT (NEW.source = 'realty-website' OR NEW.custom_data->>'realtyLead' = 'true') THEN
        RETURN NEW;
    END IF;

    IF NEW.custom_data->>'propertyLeadId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_property_lead_id := (NEW.custom_data->>'propertyLeadId')::uuid;
    END IF;

    IF COALESCE(NEW.custom_data->>'propertyId', NEW.custom_data->>'realtyPropertyId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_property_id := COALESCE(NEW.custom_data->>'propertyId', NEW.custom_data->>'realtyPropertyId')::uuid;
    END IF;

    v_stage := private.normalize_realty_crm_status(NEW.status);

    IF v_property_lead_id IS NULL AND v_property_id IS NOT NULL AND NEW.email IS NOT NULL AND NEW.project_id IS NOT NULL THEN
        SELECT pl.id
        INTO v_property_lead_id
        FROM public.property_leads pl
        WHERE pl.project_id::text = NEW.project_id
          AND pl.property_id = v_property_id
          AND lower(btrim(pl.email)) = lower(btrim(NEW.email))
        ORDER BY pl.updated_at DESC NULLS LAST, pl.created_at DESC NULLS LAST
        LIMIT 1;
    END IF;

    IF v_property_lead_id IS NULL THEN
        SELECT pl.id
        INTO v_property_lead_id
        FROM public.property_leads pl
        WHERE pl.crm_lead_id = NEW.id
        LIMIT 1;
    END IF;

    IF v_property_lead_id IS NULL THEN
        RETURN NEW;
    END IF;

    PERFORM set_config('quimera.realty_sync_from_crm', 'on', true);

    UPDATE public.property_leads
    SET
        stage = v_stage,
        crm_lead_id = NEW.id,
        metadata = COALESCE(metadata, '{}'::jsonb)
            || jsonb_build_object(
                'realtyLead', true,
                'sourceLeadId', NEW.id,
                'crmStatusSyncedAt', now()
            ),
        updated_at = now()
    WHERE id = v_property_lead_id
      AND (
          stage IS DISTINCT FROM v_stage
          OR crm_lead_id IS DISTINCT FROM NEW.id
      );

    PERFORM set_config('quimera.realty_sync_from_crm', 'off', true);

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_crm_realty_lead_to_property_lead() FROM PUBLIC;

DROP TRIGGER IF EXISTS dedupe_property_leads_before_insert ON public.property_leads;
CREATE TRIGGER dedupe_property_leads_before_insert
    BEFORE INSERT ON public.property_leads
    FOR EACH ROW
    EXECUTE FUNCTION private.dedupe_property_lead_before_insert();

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
        crm_lead_id
    ON public.property_leads
    FOR EACH ROW
    EXECUTE FUNCTION private.sync_property_lead_to_crm();

DROP TRIGGER IF EXISTS sync_crm_realty_leads_to_property_leads_after_write ON public.leads;
CREATE TRIGGER sync_crm_realty_leads_to_property_leads_after_write
    AFTER UPDATE OF status, custom_data
    ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION private.sync_crm_realty_lead_to_property_lead();

-- Backfill links and metadata with the hardened function.
UPDATE public.property_leads
SET
    source = COALESCE(NULLIF(source, ''), 'realty-website'),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('realtyLead', true),
    updated_at = now()
WHERE source = 'realty-website'
   OR source IS NULL
   OR crm_lead_id IS NULL;
