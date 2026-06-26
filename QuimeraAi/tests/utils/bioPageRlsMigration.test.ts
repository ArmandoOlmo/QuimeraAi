import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const migration = fs.readFileSync(
    path.join(rootDir, 'supabase/migrations/20260626031900_harden_bio_page_event_policy.sql'),
    'utf8',
);
const leadActivityMigration = fs.readFileSync(
    path.join(rootDir, 'supabase/migrations/20260626044108_bio_page_crm_lead_activity_trigger.sql'),
    'utf8',
);

describe('Bio Page RLS migrations', () => {
    it('hardens public analytics inserts against scope and attribution spoofing', () => {
        expect(migration).toContain('Public can insert safe bio analytics events');
        expect(migration).toContain('bp.project_id = bio_page_events.project_id');
        expect(migration).toContain('bp.tenant_id is not distinct from bio_page_events.tenant_id');
        expect(migration).toContain("bp.status = 'published'");
        expect(migration).toContain('b.id = bio_page_events.block_id');
        expect(migration).toContain('b.bio_page_id = bio_page_events.bio_page_id');
        expect(migration).toContain('b.visible = true');
        expect(migration).toContain('l.id = bio_page_events.link_id');
        expect(migration).toContain('l.bio_page_id = bio_page_events.bio_page_id');
        expect(migration).toContain('l.visible = true');
        expect(migration).toContain('lb.id = l.block_id');
        expect(migration).toContain("event_type not in ('bio_link_clicked', 'bio_social_clicked', 'bio_collection_clicked')");
        expect(migration).toContain("event_type <> 'bio_product_clicked'");
    });

    it('keeps public analytics payloads bounded and object-shaped', () => {
        expect(migration).toContain("jsonb_typeof(coalesce(utm, '{}'::jsonb)) = 'object'");
        expect(migration).toContain("jsonb_typeof(coalesce(metadata, '{}'::jsonb)) = 'object'");
        expect(migration).toContain("octet_length(coalesce(metadata, '{}'::jsonb)::text) <= 4096");
        expect(migration).toContain('char_length(source) <= 80');
        expect(migration).toContain('char_length(referrer) <= 240');
    });

    it('hardens public Bio Page subscriber inserts to the published page scope', () => {
        expect(migration).toContain('Public can subscribe to published bio pages');
        expect(migration).toContain('source = \'bio_page\'');
        expect(migration).toContain('char_length(email) <= 254');
        expect(migration).toContain("email ~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'");
        expect(migration).toContain('bp.project_id = bio_page_subscribers.project_id');
        expect(migration).toContain('bp.tenant_id is not distinct from bio_page_subscribers.tenant_id');
        expect(migration).toContain("bp.status = 'published'");
    });

    it('records CRM timeline activity for public Bio Page leads without opening lead activities to anon clients', () => {
        expect(leadActivityMigration).toContain('CREATE SCHEMA IF NOT EXISTS private');
        expect(leadActivityMigration).toContain('SECURITY DEFINER');
        expect(leadActivityMigration).toContain('REVOKE ALL ON FUNCTION private.record_bio_page_lead_activity_after_insert() FROM anon, authenticated');
        expect(leadActivityMigration).toContain("NEW.source NOT IN ('bio_page', 'bio_page_chat')");
        expect(leadActivityMigration).toContain('NEW.tenant_id IS NULL OR NEW.project_id IS NULL');
        expect(leadActivityMigration).toContain("bp.status = 'published'");
        expect(leadActivityMigration).toContain('bp.tenant_id IS NOT DISTINCT FROM NEW.tenant_id');
        expect(leadActivityMigration).toContain('INSERT INTO public.lead_activities');
        expect(leadActivityMigration).toContain("'bio_page_lead_captured'");
        expect(leadActivityMigration).toContain("'bio_page_chat_lead_captured'");
        expect(leadActivityMigration).toContain("'sourceEvent', 'bio_page_lead_capture'");
        expect(leadActivityMigration).not.toContain('bioPageDedupeKey');
        expect(leadActivityMigration).not.toContain('email');
    });
});
