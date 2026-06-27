import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

describe('Canonical plan contract', () => {
    const usePlanFeatures = read('hooks/usePlanFeatures.ts');
    const plansService = read('services/plansService.ts');

    it('uses the shared canonical active plan order instead of legacy agency order in UI helpers', () => {
        expect(usePlanFeatures).toContain('CANONICAL_PLAN_IDS');
        expect(usePlanFeatures).toContain('const planOrder = CANONICAL_PLAN_IDS');
        expect(usePlanFeatures).not.toContain("['free', 'starter', 'pro', 'agency', 'enterprise']");
    });

    it('uses the shared canonical active plan order for plan distribution and migration', () => {
        expect(plansService).toContain('CANONICAL_PLAN_IDS');
        expect(plansService).toContain('const ACTIVE_PLANS = [...CANONICAL_PLAN_IDS]');
        expect(plansService).toContain('function getPlanSortRank');
        expect(plansService).not.toContain("const ACTIVE_PLANS = ['free', 'individual', 'agency_starter', 'agency_pro', 'agency_scale', 'enterprise']");
        expect(plansService).not.toContain("const order = ['free', 'starter', 'pro', 'agency', 'enterprise']");
    });
});
