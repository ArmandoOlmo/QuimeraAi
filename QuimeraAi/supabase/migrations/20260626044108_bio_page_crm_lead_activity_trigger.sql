-- Record Bio Page CRM timeline activity without exposing lead_activities to
-- public anonymous clients. Public visitors can create a CRM lead only through
-- the published Bio Page policy; this private trigger mirrors that lead into
-- the CRM timeline after the lead row exists.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.record_bio_page_lead_activity_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_page_id text;
    v_block_id text;
    v_bio_slug text;
    v_source_module text;
    v_activity_type text;
    v_description text;
BEGIN
    IF NEW.source NOT IN ('bio_page', 'bio_page_chat') THEN
        RETURN NEW;
    END IF;

    IF NEW.tenant_id IS NULL OR NEW.project_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_page_id := NULLIF(COALESCE(NEW.custom_data->>'bioPageId', ''), '');
    v_block_id := NULLIF(COALESCE(NEW.custom_data->>'blockId', ''), '');
    v_bio_slug := NULLIF(COALESCE(NEW.custom_data->>'bioSlug', ''), '');
    v_source_module := COALESCE(NULLIF(NEW.custom_data->>'sourceModule', ''), 'bio-page-engine');

    IF NOT EXISTS (
        SELECT 1
        FROM public.bio_pages bp
        WHERE bp.project_id::text = NEW.project_id
          AND bp.tenant_id IS NOT DISTINCT FROM NEW.tenant_id
          AND bp.status = 'published'
          AND (v_page_id IS NULL OR bp.id::text = v_page_id)
    ) THEN
        RETURN NEW;
    END IF;

    v_activity_type := CASE
        WHEN NEW.source = 'bio_page_chat' THEN 'bio_page_chat_lead_captured'
        ELSE 'bio_page_lead_captured'
    END;

    v_description := CASE
        WHEN NEW.source = 'bio_page_chat' THEN 'Bio Page ChatCore lead captured'
        ELSE 'Bio Page lead captured'
    END;

    INSERT INTO public.lead_activities (
        tenant_id,
        project_id,
        lead_id,
        type,
        description,
        metadata,
        created_at
    )
    VALUES (
        NEW.tenant_id,
        NEW.project_id,
        NEW.id,
        v_activity_type,
        v_description,
        jsonb_strip_nulls(jsonb_build_object(
            'bioPageId', v_page_id,
            'bioSlug', v_bio_slug,
            'blockId', v_block_id,
            'source', NEW.source,
            'sourceModule', v_source_module,
            'sourceEvent', 'bio_page_lead_capture',
            'recordedBy', 'bio_page_crm_lead_activity_trigger'
        )),
        now()
    );

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.record_bio_page_lead_activity_after_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.record_bio_page_lead_activity_after_insert() FROM anon, authenticated;

DROP TRIGGER IF EXISTS record_bio_page_lead_activity_after_insert ON public.leads;
CREATE TRIGGER record_bio_page_lead_activity_after_insert
    AFTER INSERT ON public.leads
    FOR EACH ROW
    WHEN (NEW.source IN ('bio_page', 'bio_page_chat'))
    EXECUTE FUNCTION private.record_bio_page_lead_activity_after_insert();
