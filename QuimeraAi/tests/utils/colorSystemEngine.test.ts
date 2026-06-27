import { describe, expect, it } from 'vitest';
import {
    COLOR_PROPORTION_RULE_603010,
    contrastRatio,
    createColorBriefFromWebsitePlan,
    createImportedPaletteCandidates,
    generateColorCandidates,
    repairColorSystem,
    score603010Compliance,
    toGlobalColors,
    validateColorSystem,
} from '../../utils/colorSystemEngine';
import { applyColorExpertToPlan, createWebsitePlanFromImport } from '../../utils/websitePlanEngine';
import type { WebsitePlan } from '../../types/websitePlan';

const basePlan: WebsitePlan = {
    source: 'chat',
    generationMode: 'from-scratch',
    businessProfile: {
        businessName: 'Borinquea',
        industry: 'cultural ecommerce',
        description: 'Productos culturales de Puerto Rico con una marca tropical y artesanal.',
        services: [],
        contactInfo: {},
        hasEcommerce: true,
    },
    brandProfile: {
        colors: {
            primary: '#218fe5',
            secondary: '#ee9441',
            accent: '#faba2b',
            background: '#f6f4ef',
            surface: '#1a1a24',
            text: '#e4e4e7',
        },
    },
    contentMap: {
        pages: [],
        extractedImages: [],
    },
    componentPlan: [
        { component: 'productHero', reason: 'Commerce', confidence: 1, source: 'ai' },
        { component: 'featuredProducts', reason: 'Commerce', confidence: 1, source: 'ai' },
        { component: 'productReviews', reason: 'Commerce', confidence: 1, source: 'ai' },
    ],
    assetPlan: [],
    qualityGoals: [],
};

describe('colorSystemEngine', () => {
    it('generates six valid candidates for a website plan', () => {
        const brief = createColorBriefFromWebsitePlan(basePlan);
        const candidates = generateColorCandidates(brief);

        expect(candidates).toHaveLength(6);
        expect(candidates[0].system.score).toBeGreaterThanOrEqual(candidates[5].system.score);
        for (const candidate of candidates) {
            const result = validateColorSystem(candidate.system);
            expect(result.valid).toBe(true);
            expect(candidate.system.colors.primary).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it('includes modern trend archetypes instead of six same-color variations', () => {
        const brief = createColorBriefFromWebsitePlan(basePlan);
        const candidates = generateColorCandidates(brief);
        const strategies = candidates.map(candidate => candidate.system.strategy);

        expect(strategies.some(strategy => strategy.includes('earth') || strategy.includes('clay'))).toBe(true);
        expect(strategies.some(strategy => strategy.includes('pastel'))).toBe(true);
        expect(strategies.some(strategy => strategy.includes('mono'))).toBe(true);
        expect(strategies.some(strategy => strategy.includes('dopamine') || strategy.includes('carbon'))).toBe(true);
    });

    it('allows monochrome systems when they have depth and readable contrast', () => {
        const brief = createColorBriefFromWebsitePlan(basePlan);
        const monoCandidate = generateColorCandidates(brief).find(candidate => candidate.system.strategy.includes('mono'));

        expect(monoCandidate).toBeTruthy();
        expect(validateColorSystem(monoCandidate!.system).valid).toBe(true);
        expect(validateColorSystem(monoCandidate!.system).issues.some(issue => issue.path === 'primary/secondary/accent')).toBe(false);
        expect(contrastRatio(monoCandidate!.system.colors.text, monoCandidate!.system.colors.background)).toBeGreaterThanOrEqual(4.5);
    });

    it('repairs poor text/background and primary button contrast', () => {
        const repaired = repairColorSystem({
            primary: '#eeeeee',
            secondary: '#eeeeee',
            accent: '#f3f3f3',
            background: '#ffffff',
            surface: '#ffffff',
            text: '#fefefe',
            textMuted: '#fefefe',
            heading: '#fafafa',
            border: '#ffffff',
            success: '#10b981',
            error: '#ef4444',
        });

        expect(contrastRatio(repaired.colors.text, repaired.colors.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(repaired.colors.heading, repaired.colors.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(repaired.colors.text, repaired.colors.surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(repaired.colors.heading, repaired.colors.surface)).toBeGreaterThanOrEqual(4.5);
        expect(Math.max(
            contrastRatio(repaired.colors.primary, '#ffffff'),
            contrastRatio(repaired.colors.primary, '#111827'),
        )).toBeGreaterThanOrEqual(3);
    });

    it('repairs light-page palettes that put dark text on a dark surface', () => {
        const repaired = repairColorSystem({
            primary: '#228fe4',
            secondary: '#e5ad2e',
            accent: '#892f2f',
            background: '#f8f7f3',
            surface: '#2e2e2e',
            text: '#525252',
            textMuted: '#525252',
            heading: '#525252',
            border: '#2e2e2e',
            success: '#7fb069',
            error: '#c75c5c',
        });

        expect(contrastRatio(repaired.colors.text, repaired.colors.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(repaired.colors.text, repaired.colors.surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(repaired.colors.heading, repaired.colors.surface)).toBeGreaterThanOrEqual(4.5);
        expect(repaired.colors.surface).not.toBe('#2e2e2e');
    });

    it('ignores invalid imported color values before contrast repair', () => {
        const repaired = repairColorSystem({
            primary: { color: '#be123c' },
            secondary: '#0f766e',
            accent: 'not-a-color',
            background: '#fff7ed',
            surface: '#ffffff',
            text: '#1f2937',
        } as any);

        expect(repaired.colors.primary).toMatch(/^#[0-9a-f]{6}$/);
        expect(repaired.colors.accent).toMatch(/^#[0-9a-f]{6}$/);
        expect(contrastRatio(repaired.colors.text, repaired.colors.background)).toBeGreaterThanOrEqual(4.5);
    });

    it('converts old import colors into a ColorBrief and preserves ecommerce context', () => {
        const brief = createColorBriefFromWebsitePlan(basePlan);

        expect(brief.importedColors?.some(signal => signal.roleGuess === 'primary')).toBe(true);
        expect(brief.hasEcommerce).toBe(true);
    });

    it('toGlobalColors returns complete global color tokens', () => {
        const candidate = generateColorCandidates(createColorBriefFromWebsitePlan(basePlan))[0];
        const colors = toGlobalColors(candidate);

        expect(colors.primary).toBeTruthy();
        expect(colors.secondary).toBeTruthy();
        expect(colors.accent).toBeTruthy();
        expect(colors.background).toBeTruthy();
        expect(colors.surface).toBeTruthy();
        expect(colors.text).toBeTruthy();
        expect(colors.heading).toBeTruthy();
        expect(colors.border).toBeTruthy();
    });

    it('feeds imported website colors into Color Expert from legacy and rich import shapes', () => {
        const plan = createWebsitePlanFromImport({
            success: true,
            result: {
                businessName: 'Imported Shop',
                industry: 'ecommerce',
                description: 'A product store with existing brand colors.',
                services: [],
                contactInfo: {},
                branding: {
                    primaryColor: '#0057b8',
                    secondaryColor: '#f5a623',
                    accentColor: '#ef4444',
                    backgroundColor: '#ffffff',
                    isDarkTheme: false,
                },
                colorsFound: ['#0057b8', '#f5a623', '#ef4444', '#ffffff'],
                recommendedComponents: ['productHero', 'featuredProducts', 'productReviews', 'footer'],
            },
        });

        expect(plan.brandProfile.colorBrief?.importedColors?.some(signal => signal.color.toLowerCase() === '#0057b8')).toBe(true);
        expect(plan.brandProfile.colorCandidates?.some(candidate => candidate.id === 'imported-palette-polished')).toBe(true);
        expect(plan.brandProfile.colorCandidates?.length).toBe(8);
        expect(plan.brandProfile.colors.primary).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('creates selectable imported palette options and preserves the selected one', () => {
        const plan = createWebsitePlanFromImport({
            success: true,
            result: {
                businessName: 'Imported Shop',
                industry: 'ecommerce',
                description: 'A product store with existing brand colors.',
                services: [],
                contactInfo: {},
                branding: {
                    primaryColor: '#0057b8',
                    secondaryColor: '#f5a623',
                    accentColor: '#ef4444',
                    backgroundColor: '#ffffff',
                    isDarkTheme: false,
                },
                colorsFound: ['#0057b8', '#f5a623', '#ef4444', '#ffffff'],
                recommendedComponents: ['productHero', 'featuredProducts', 'productReviews', 'footer'],
            },
        });
        const importedCandidates = createImportedPaletteCandidates(plan.brandProfile.colorBrief!);

        expect(importedCandidates.map(candidate => candidate.id)).toEqual([
            'imported-palette-faithful',
            'imported-palette-polished',
        ]);
        expect(validateColorSystem(importedCandidates[0].system).valid).toBe(true);

        const selectedPlan = applyColorExpertToPlan({
            ...plan,
            brandProfile: {
                ...plan.brandProfile,
                colorCandidates: [...importedCandidates, ...(plan.brandProfile.colorCandidates || [])],
                selectedColorCandidateId: importedCandidates[0].id,
            },
        });

        expect(selectedPlan.brandProfile.selectedColorCandidateId).toBe('imported-palette-faithful');
        expect(selectedPlan.brandProfile.colors.primary).toBe(importedCandidates[0].system.colors.primary);
    });

    it('scores and repairs palettes toward the 60-30-10 proportion rule', () => {
        const noisyPalette = {
            primary: '#228fe4',
            secondary: '#228fe4',
            accent: '#228fe4',
            background: '#1d4ed8',
            surface: '#2563eb',
            text: '#1e40af',
            textMuted: '#1d4ed8',
            heading: '#1e3a8a',
            border: '#3b82f6',
            success: '#16a34a',
            error: '#dc2626',
        };

        expect(score603010Compliance(noisyPalette)).toBeLessThan(55);

        const repaired = repairColorSystem(noisyPalette);
        expect(score603010Compliance(repaired.colors)).toBeGreaterThanOrEqual(62);
        expect(repaired.warnings.some(warning => /60-30-10|dominant|accent|brand layer/i.test(warning))).toBe(true);
        expect(contrastRatio(repaired.colors.text, repaired.colors.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(repaired.colors.accent, repaired.colors.primary)).toBeGreaterThan(0);
    });

    it('includes proportionBalance in generated candidate scores', () => {
        const brief = createColorBriefFromWebsitePlan(basePlan);
        const candidates = generateColorCandidates(brief);

        for (const candidate of candidates) {
            expect(candidate.system.scores.proportionBalance).toBeGreaterThanOrEqual(55);
        }
    });

    it('exports the 60-30-10 rule definition for AI Studio and Color Expert', () => {
        expect(COLOR_PROPORTION_RULE_603010.id).toBe('60-30-10');
        expect(COLOR_PROPORTION_RULE_603010.roles.dominant).toContain('background');
        expect(COLOR_PROPORTION_RULE_603010.roles.brand).toContain('primary');
        expect(COLOR_PROPORTION_RULE_603010.roles.accent).toContain('accent');
    });
});
