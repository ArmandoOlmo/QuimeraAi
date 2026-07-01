import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    buildAgencySnapshotApplicationIdempotencyKey,
    buildAgencySnapshotApplicationInsert,
    buildAgencySnapshotApplicationPreview,
    buildAgencySnapshotChecksum,
    buildAgencySnapshotPayload,
    buildAgencySnapshotTargetProjectUpdate,
    readAgencySnapshotVersionPayload,
    type AgencySnapshotProjectRow,
    type AgencySnapshotRow,
    type AgencySnapshotVersionRow,
} from '../../services/agency/agencySnapshotService';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const sourceProject = (overrides: Partial<AgencySnapshotProjectRow> = {}): AgencySnapshotProjectRow => ({
    id: 'project-source-1',
    tenant_id: 'agency-tenant-1',
    name: 'Source Template',
    pages: [{ id: 'home', title: 'Home', sections: [] }],
    data: {
        hero: { title: 'Draft site' },
        versionHistory: { blueprintSnapshots: [{ id: 'old' }] },
        publishedData: { shouldNotCopy: true },
        stripeCheckoutSessionId: 'cs_live_should_not_copy',
        businessBlueprint: {
            projectId: 'project-source-1',
            tenantId: 'agency-tenant-1',
            status: 'ready',
            agencyOperatingSystem: {
                generatedModuleIds: ['website-builder', 'crm-leads'],
                enabledClient360ModuleIds: ['website-builder'],
                foundationModuleIds: ['ai-business-blueprint'],
            },
        },
    },
    theme: { primaryColor: '#111111' },
    brand_identity: { logoUrl: 'https://cdn.example/logo.png' },
    component_order: ['hero', 'features'],
    section_visibility: { hero: true },
    menus: [{ id: 'main' }],
    ai_assistant_config: { enabled: false },
    seo_config: { title: 'Template SEO' },
    crm_config: { industry: 'general' },
    ...overrides,
});

const snapshotRow: AgencySnapshotRow = {
    id: 'snapshot-1',
    agency_tenant_id: 'agency-tenant-1',
    name: 'Client Starter Snapshot',
    snapshot_type: 'project_template',
    status: 'active',
    source_project_id: 'project-source-1',
};

function versionRow(payload = buildAgencySnapshotPayload(sourceProject(), '2026-07-01T12:00:00.000Z')): AgencySnapshotVersionRow {
    return {
        id: 'snapshot-version-1',
        snapshot_id: 'snapshot-1',
        version: 1,
        label: 'Initial',
        data: payload,
        payload,
        included_modules: payload.includedModules,
        readiness: payload.readiness,
        checksum: buildAgencySnapshotChecksum(payload),
        metadata: { includedModules: payload.includedModules },
    };
}

describe('AgencySnapshotService helpers', () => {
    it('builds a draft-safe snapshot payload from a project without copying runtime payment or publish state', () => {
        const payload = buildAgencySnapshotPayload(sourceProject(), '2026-07-01T12:00:00.000Z');

        expect(payload).toMatchObject({
            schemaVersion: 1,
            source: 'agency_snapshot_service',
            capturedAt: '2026-07-01T12:00:00.000Z',
            sourceProject: {
                id: 'project-source-1',
                tenantId: 'agency-tenant-1',
                name: 'Source Template',
            },
            draftSafety: {
                noAutoPublish: true,
                noRuntimeActivated: true,
                noCheckoutSessionCreated: true,
                noEmailSent: true,
                requiresClientApproval: true,
            },
        });
        expect(payload.project.data.versionHistory).toBeUndefined();
        expect(payload.project.data.publishedData).toBeUndefined();
        expect(payload.project.data.stripeCheckoutSessionId).toBeUndefined();
        expect(payload.businessBlueprint?.projectId).toBe('project-source-1');
        expect(payload.agencyOperatingSystem?.generatedModuleIds).toEqual(['website-builder', 'crm-leads']);
        expect(payload.includedModules).toEqual(['ai-business-blueprint', 'crm-leads', 'website-builder']);
        expect(payload.readiness).toEqual({
            isReady: true,
            blockers: [],
            warnings: [],
        });
    });

    it('creates deterministic checksums and reads version payloads from direct or wrapped rows', () => {
        const payload = buildAgencySnapshotPayload(sourceProject(), '2026-07-01T12:00:00.000Z');
        expect(buildAgencySnapshotChecksum(payload)).toBe(buildAgencySnapshotChecksum({ ...payload }));
        expect(readAgencySnapshotVersionPayload(versionRow(payload))).toBe(payload);
        expect(readAgencySnapshotVersionPayload({ ...versionRow(payload), data: {}, payload })).toBe(payload);
        expect(readAgencySnapshotVersionPayload({ ...versionRow(payload), data: { payload } })).toBe(payload);
    });

    it('previews a snapshot application before applying and keeps target updates draft-only', () => {
        const payload = buildAgencySnapshotPayload(sourceProject(), '2026-07-01T12:00:00.000Z');
        const version = versionRow(payload);
        const targetProject = sourceProject({
            id: 'project-target-1',
            tenant_id: 'client-tenant-1',
            name: 'Client Current Site',
            pages: [],
            data: { existing: true },
        });
        const preview = buildAgencySnapshotApplicationPreview({
            agencyTenantId: 'agency-tenant-1',
            snapshot: snapshotRow,
            version,
            payload,
            targetProject,
            clientTenantId: 'client-tenant-1',
            previewedAt: '2026-07-01T13:00:00.000Z',
        });

        expect(preview.idempotencyKey).toBe(buildAgencySnapshotApplicationIdempotencyKey({
            agencyTenantId: 'agency-tenant-1',
            snapshotId: 'snapshot-1',
            snapshotVersionId: 'snapshot-version-1',
            clientTenantId: 'client-tenant-1',
            targetProjectId: 'project-target-1',
        }));
        expect(preview.readiness.isReady).toBe(true);
        expect(preview.changes.map(change => change.field)).toEqual(expect.arrayContaining([
            'pages',
            'data',
            'published_runtime',
            'status',
        ]));
        expect(preview.draftSafety).toMatchObject({
            targetStatus: 'Draft',
            clearsPublishedRuntime: true,
            noAutoPublish: true,
            noRuntimeActivated: true,
        });
        expect(preview.targetProjectUpdate).toMatchObject({
            status: 'Draft',
            published_data: null,
            published_at: null,
        });
        expect(preview.targetProjectUpdate.data.agencySnapshotApplication).toMatchObject({
            agencyTenantId: 'agency-tenant-1',
            snapshotId: 'snapshot-1',
            snapshotVersionId: 'snapshot-version-1',
            noAutoPublish: true,
            noRuntimeActivated: true,
            requiresClientApproval: true,
        });
        expect(preview.targetProjectUpdate.data.businessBlueprint).toMatchObject({
            projectId: 'project-target-1',
            tenantId: 'client-tenant-1',
            status: 'needs_review',
            generatedBy: 'agency_snapshot_service',
        });
    });

    it('stores application preview and audit metadata in agency_snapshot_applications row shape', () => {
        const payload = buildAgencySnapshotPayload(sourceProject(), '2026-07-01T12:00:00.000Z');
        const preview = buildAgencySnapshotApplicationPreview({
            agencyTenantId: 'agency-tenant-1',
            snapshot: snapshotRow,
            version: versionRow(payload),
            payload,
            targetProject: sourceProject({ id: 'project-target-1', tenant_id: 'client-tenant-1' }),
            clientTenantId: 'client-tenant-1',
            previewedAt: '2026-07-01T13:00:00.000Z',
        });
        const row = buildAgencySnapshotApplicationInsert({
            preview,
            appliedBy: 'user-1',
        });

        expect(row).toMatchObject({
            agency_tenant_id: 'agency-tenant-1',
            snapshot_id: 'snapshot-1',
            snapshot_version_id: 'snapshot-version-1',
            client_tenant_id: 'client-tenant-1',
            target_project_id: 'project-target-1',
            status: 'pending',
            applied_by: 'user-1',
            preview,
            applied_changes: [],
        });
        expect(row.idempotency_key).toContain('agency-snapshot:agency-tenant-1:snapshot-1');
        expect(row.metadata).toMatchObject({
            source: 'agency_snapshot_service',
            noAutoPublish: true,
            noRuntimeActivated: true,
            requiresClientApproval: true,
            preview: {
                includedModules: ['ai-business-blueprint', 'crm-leads', 'website-builder'],
                readiness: { isReady: true },
            },
        });
    });

    it('marks archived snapshots as blocked in preview instead of applying them silently', () => {
        const payload = buildAgencySnapshotPayload(sourceProject(), '2026-07-01T12:00:00.000Z');
        const preview = buildAgencySnapshotApplicationPreview({
            agencyTenantId: 'agency-tenant-1',
            snapshot: { ...snapshotRow, status: 'archived' },
            version: versionRow(payload),
            payload,
            targetProject: sourceProject({ id: 'project-target-1', tenant_id: 'client-tenant-1' }),
            clientTenantId: 'client-tenant-1',
        });

        expect(preview.readiness.isReady).toBe(false);
        expect(preview.readiness.blockers).toContain('snapshot_archived');
    });

    it('preserves version history checkpoints when building target project updates', () => {
        const payload = buildAgencySnapshotPayload(sourceProject(), '2026-07-01T12:00:00.000Z');
        const update = buildAgencySnapshotTargetProjectUpdate({
            agencyTenantId: 'agency-tenant-1',
            snapshot: snapshotRow,
            version: versionRow(payload),
            payload,
            targetProject: sourceProject({ id: 'project-target-1', tenant_id: 'client-tenant-1', data: { versionHistory: { blueprintSnapshots: [{ id: 'existing' }] } } }),
            clientTenantId: 'client-tenant-1',
            appliedAt: '2026-07-01T13:00:00.000Z',
        });

        expect(update.data.versionHistory.blueprintSnapshots[0]).toMatchObject({
            id: 'agency_snapshot_snapshot-version-1',
            source: 'agency_snapshot',
            changeType: 'snapshot_application',
            metadata: {
                agencyTenantId: 'agency-tenant-1',
                snapshotId: 'snapshot-1',
                snapshotVersionId: 'snapshot-version-1',
                noAutoPublish: true,
                noRuntimeActivated: true,
            },
        });
        expect(update.data.versionHistory.blueprintSnapshots[1]).toMatchObject({ id: 'existing' });
    });
});

describe('Agency Snapshot canonical contract', () => {
    const service = read('services/agency/agencySnapshotService.ts');
    const snapshotsDoc = read('docs/agency/AGENCY_SNAPSHOTS.md');

    it('uses the canonical Supabase snapshot tables and does not mix platform billing tables into snapshots', () => {
        expect(service).toContain(".from('agency_snapshots')");
        expect(service).toContain(".from('agency_snapshot_versions')");
        expect(service).toContain(".from('agency_snapshot_applications')");
        expect(service).toContain(".from('agency_clients')");
        expect(service).toContain(".from('agency_activity')");
        expect(service).not.toContain(".from('subscription_plans')");
        expect(service).not.toContain(".from('agencyPlans')");
    });

    it('documents preview-before-apply and draft-safe runtime behavior', () => {
        expect(snapshotsDoc).toContain('preview before apply');
        expect(snapshotsDoc).toContain('agencySnapshotService');
        expect(snapshotsDoc).toContain('noAutoPublish');
        expect(snapshotsDoc).toContain('noRuntimeActivated');
        expect(snapshotsDoc).toContain('idempotency_key');
    });
});
