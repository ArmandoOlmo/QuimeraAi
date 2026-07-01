import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Agency Snapshot Center contract', () => {
    const snapshotCenter = read('components/dashboard/agency/AgencySnapshotCenter.tsx');
    const agencyProjects = read('components/dashboard/agency/AgencyProjects.tsx');
    const snapshotService = read('services/agency/agencySnapshotService.ts');
    const snapshotsDoc = read('docs/agency/AGENCY_SNAPSHOTS.md');

    it('renders Snapshot Center from the Projects operating surface', () => {
        expect(agencyProjects).toContain("import { AgencySnapshotCenter } from './AgencySnapshotCenter'");
        expect(agencyProjects).toContain('<AgencySnapshotCenter');
        expect(agencyProjects).toContain('projects={userProjects}');
        expect(agencyProjects).toContain('onSnapshotApplied={refreshProjects}');
    });

    it('routes all Snapshot Center mutations through the canonical service', () => {
        expect(snapshotCenter).toContain("import {");
        expect(snapshotCenter).toContain("agencySnapshotService,");
        expect(snapshotCenter).toContain("../../../services/agency/agencySnapshotService");
        expect(snapshotCenter).toContain('agencySnapshotService.listSnapshots');
        expect(snapshotCenter).toContain('agencySnapshotService.createSnapshotFromProject');
        expect(snapshotCenter).toContain('agencySnapshotService.previewSnapshotApplication');
        expect(snapshotCenter).toContain('agencySnapshotService.applySnapshot');
        expect(snapshotCenter).not.toContain(".from('agency_snapshots')");
        expect(snapshotCenter).not.toContain(".from('agency_snapshot_applications')");
    });

    it('gates snapshots with the Agency project-transfer module and requires preview before apply', () => {
        expect(snapshotCenter).toContain("serviceAccess.canAccessModule('agency-project-transfer'");
        expect(snapshotCenter).toContain("requiredPermission: 'canManageProjects'");
        expect(snapshotCenter).toContain('disabled={applyingSnapshot || !preview || !preview.readiness.isReady}');
        expect(snapshotCenter).toContain('preview?.idempotencyKey');
        expect(snapshotCenter).toContain("t('agency.snapshots.preview'");
        expect(snapshotCenter).toContain("t('agency.snapshots.applyDraft'");
    });

    it('keeps the service on canonical Supabase snapshot tables with list support', () => {
        expect(snapshotService).toContain('async listSnapshots');
        expect(snapshotService).toContain(".from('agency_snapshots')");
        expect(snapshotService).toContain(".from('agency_snapshot_versions')");
        expect(snapshotService).toContain(".from('agency_snapshot_applications')");
        expect(snapshotService).not.toContain(".from('subscription_plans')");
    });

    it('documents the live UI entrypoint instead of a future-only plan', () => {
        expect(snapshotsDoc).toContain('AgencySnapshotCenter');
        expect(snapshotsDoc).toContain('`/agency/projects`');
        expect(snapshotsDoc).not.toContain('Future UI should use these tables');
    });
});
