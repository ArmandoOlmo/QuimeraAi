import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency landing canonical Supabase contract', () => {
    const service = read('services/agencyLandingService.ts');
    const compatData = read('utils/compatData.ts');
    const migration = read('supabase/migrations/20260627070415_canonical_agency_landings.sql');
    const legacyViewMigration = read('supabase/migrations/20260627070615_legacy_agency_landings_postgrest_view.sql');

    it('maps the legacy agencyLandings collection to the canonical Supabase table', () => {
        expect(service).toContain("const COLLECTION_NAME = 'agencyLandings'");
        expect(compatData).toContain("agencyLandings: 'agency_landings'");
        expect(compatData).toContain("agency_landings: 'agency_landings'");
        expect(compatData).toContain("agency_landings: ['id', 'tenant_id', 'data', 'subdomain', 'custom_domain', 'is_published'");
        expect(compatData).toContain("agency_landings: 'data'");
        expect(compatData).toContain("isPublished: 'is_published'");
        expect(compatData).toContain("customDomain: 'custom_domain'");
    });

    it('uses flat lookup columns instead of unsupported dotted PostgREST filters', () => {
        expect(service).toContain("where('subdomain', '==', normalizedSubdomain)");
        expect(service).toContain("where('customDomain', '==', normalizedDomain)");
        expect(service).toContain('subdomain: normalizeSubdomain(payload)');
        expect(service).toContain('customDomain: normalizeCustomDomain(payload)');
        expect(service).toContain('...existing.domain');
        expect(service).toContain('...config.domain');
        expect(service).not.toContain("where('domain.subdomain'");
        expect(service).not.toContain("where('domain.customDomain'");
        expect(service).not.toContain("'domain.subdomain'");
    });

    it('degrades cleanly while production is waiting for the migration', () => {
        expect(service).toContain('isMissingAgencyLandingTableError');
        expect(service).toContain("candidate?.code === 'PGRST205'");
        expect(service).toContain('candidate?.status === 404');
        expect(service).toContain('warnMissingAgencyLandingTable(error)');
        expect(service).toContain('return null;');
    });

    it('creates an RLS-protected Data API table for published and tenant-owned landings', () => {
        expect(migration).toContain('create or replace function public.quimera_can_manage_agency');
        expect(migration).toContain('revoke all on function public.quimera_can_manage_agency(uuid) from public');
        expect(migration).toContain('create table if not exists public.agency_landings');
        expect(migration).toContain('tenant_id uuid not null references public.tenants(id) on delete cascade');
        expect(migration).toContain("data jsonb not null default '{}'::jsonb");
        expect(migration).toContain('subdomain text');
        expect(migration).toContain('custom_domain text');
        expect(migration).toContain('is_published boolean not null default false');
        expect(migration).toContain('alter table public.agency_landings enable row level security');
        expect(migration).toContain('grant select on table public.agency_landings to anon, authenticated');
        expect(migration).toContain('grant insert, update, delete on table public.agency_landings to authenticated');
        expect(migration).toContain('Public can view published agency landings');
        expect(migration).toContain('using (is_published = true)');
        expect(migration).toContain('Agency can view own agency landing');
        expect(migration).toContain('public.quimera_can_manage_agency(tenant_id)');
    });

    it('keeps a temporary PostgREST alias for deployed bundles still querying agencyLandings', () => {
        expect(legacyViewMigration).toContain('create or replace view public."agencyLandings"');
        expect(legacyViewMigration).toContain('with (security_invoker = true)');
        expect(legacyViewMigration).toContain('from public.agency_landings');
        expect(legacyViewMigration).toContain('grant select on table public."agencyLandings" to anon, authenticated');
    });
});
