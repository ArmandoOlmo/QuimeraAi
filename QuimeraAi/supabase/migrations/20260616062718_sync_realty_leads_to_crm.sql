-- Synchronize Realty public leads into the Quimera CRM leads table.
--
-- Public visitors are intentionally not allowed to insert directly into
-- public.leads. They insert property_leads for a public property, and this
-- private SECURITY DEFINER trigger creates or updates the matching CRM lead.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

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
    v_custom_data jsonb;
BEGIN
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
    NEW.source := COALESCE(NULLIF(NEW.source, ''), 'realty-website');
    NEW.stage := COALESCE(NULLIF(NEW.stage, ''), 'new');
    NEW.lead_type := COALESCE(NULLIF(NEW.lead_type, ''), 'buyer');
    NEW.budget := COALESCE(NEW.budget, v_property.price);

    IF NEW.tenant_id IS NULL
       OR NEW.project_id IS NULL
       OR NEW.email IS NULL
       OR NEW.email = '' THEN
        RETURN NEW;
    END IF;

    v_tenant_uuid := NEW.tenant_id;
    v_status := CASE NEW.stage
        WHEN 'showing_scheduled' THEN 'qualified'
        WHEN 'offer_made' THEN 'negotiation'
        WHEN 'closed' THEN 'won'
        WHEN 'converted' THEN 'won'
        WHEN 'contacted' THEN 'contacted'
        WHEN 'qualified' THEN 'qualified'
        WHEN 'negotiation' THEN 'negotiation'
        WHEN 'won' THEN 'won'
        WHEN 'lost' THEN 'lost'
        ELSE 'new'
    END;
    v_source := COALESCE(NULLIF(NEW.source, ''), 'realty-website');
    v_notes := COALESCE(NULLIF(NEW.message, ''), format('Interested in %s', COALESCE(v_property.title, 'property')));
    v_budget := COALESCE(NEW.budget, v_property.price, 0);
    v_custom_data := COALESCE(NEW.metadata, '{}'::jsonb)
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

    IF NEW.crm_lead_id IS NOT NULL THEN
        UPDATE public.leads
        SET
            tenant_id = v_tenant_uuid,
            project_id = NEW.project_id::text,
            name = NEW.name,
            email = NEW.email,
            phone = NULLIF(NEW.phone, ''),
            status = v_status,
            source = v_source,
            value = v_budget,
            tags = ARRAY['realty', 'website', 'property:' || NEW.property_id::text],
            notes = v_notes,
            custom_data = COALESCE(custom_data, '{}'::jsonb) || v_custom_data,
            updated_at = now()
        WHERE id = NEW.crm_lead_id
        RETURNING id INTO v_crm_lead_id;
    END IF;

    IF v_crm_lead_id IS NULL THEN
        SELECT l.id
        INTO v_crm_lead_id
        FROM public.leads l
        WHERE l.project_id = NEW.project_id::text
          AND l.custom_data->>'propertyLeadId' = NEW.id::text
        LIMIT 1;
    END IF;

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
            ARRAY['realty', 'website', 'property:' || NEW.property_id::text],
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
            tags = ARRAY['realty', 'website', 'property:' || NEW.property_id::text],
            notes = v_notes,
            custom_data = COALESCE(custom_data, '{}'::jsonb) || v_custom_data,
            updated_at = now()
        WHERE id = v_crm_lead_id;
    END IF;

    NEW.crm_lead_id := v_crm_lead_id;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_property_lead_to_crm() FROM PUBLIC;

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

-- Backfill leads submitted while the public form could only write property_leads.
UPDATE public.property_leads
SET
    source = COALESCE(NULLIF(source, ''), 'realty-website'),
    updated_at = now()
WHERE crm_lead_id IS NULL;
