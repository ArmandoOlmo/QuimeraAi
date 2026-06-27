import { describe, expect, it } from 'vitest';
import type { Project } from '../../types/project';
import type { WebsitePlan } from '../../types/websitePlan';
import { createBusinessBlueprintFromWebsitePlan } from '../../utils/businessBlueprint';
import {
    buildChatbotEngineDashboardSummary,
    resolveProjectChatbotBlueprint,
} from '../../utils/chatbotEngine/blueprintDashboard';

function buildChatbotPlan(): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'Quimera Demo Shop',
            industry: 'fitness ecommerce with appointments',
            description: 'A bilingual fitness store that sells products and books consultations.',
            tagline: 'Train smarter',
            services: [
                { name: 'Training gear', description: 'Gear for home training.' },
                { name: 'Consultation', description: 'Appointment-based coaching.' },
            ],
            contactInfo: { city: 'San Juan', country: 'Puerto Rico', email: 'hello@example.com' },
            hasEcommerce: true,
        },
        brandProfile: {
            colors: {
                primary: '#0f766e',
                secondary: '#111827',
                accent: '#f59e0b',
                background: '#f8fafc',
                surface: '#ffffff',
                text: '#111827',
            },
            visualStyle: 'clean ecommerce',
        },
        contentMap: {
            pages: [],
            products: [
                {
                    name: 'Resistance Kit',
                    category: 'Training gear',
                    description: 'Bands and handles for strength training.',
                    price: 49,
                },
            ],
        },
        componentPlan: [
            { component: 'heroLead', reason: 'Lead capture hero', confidence: 0.9 },
            { component: 'featuredProducts', reason: 'Product discovery', confidence: 0.9 },
            { component: 'chatbot', reason: 'ChatCore entry point', confidence: 0.9 },
            { component: 'footer', reason: 'Navigation footer', confidence: 0.8 },
        ],
        assetPlan: [{
            targetPath: 'media/hero-launch.png',
            source: 'generate',
            prompt: 'Premium fitness ecommerce hero image',
            aspectRatio: '16:9',
        }],
        qualityGoals: ['canonical chatbot engine'],
    };
}

function buildProjectWithBlueprint(location: 'root' | 'data'): Project {
    const blueprint = createBusinessBlueprintFromWebsitePlan(buildChatbotPlan(), {
        now: '2026-06-26T00:00:00.000Z',
        projectId: 'project_chatbot',
        tenantId: 'tenant_chatbot',
    });
    const project = {
        id: 'project_chatbot',
        name: 'Quimera Demo Shop',
        data: location === 'data' ? { businessBlueprint: blueprint } : {},
        theme: {},
        componentOrder: [],
        sectionVisibility: {},
        status: 'Draft',
        ...(location === 'root' ? { businessBlueprint: blueprint } : {}),
    } as unknown as Project;

    return project;
}

describe('chatbotEngine blueprint dashboard summary', () => {
    it('resolves ChatbotBlueprint V2 from a project root blueprint', () => {
        const blueprint = resolveProjectChatbotBlueprint(buildProjectWithBlueprint('root'));

        expect(blueprint?.engineVersion).toBe('v2');
        expect(blueprint?.agentProfile.supportedLanguages).toEqual(['es', 'en']);
        expect(blueprint?.knowledgeSources.length).toBeGreaterThan(0);
    });

    it('resolves ChatbotBlueprint V2 from project.data.businessBlueprint for legacy storage', () => {
        const blueprint = resolveProjectChatbotBlueprint(buildProjectWithBlueprint('data'));

        expect(blueprint?.engineVersion).toBe('v2');
        expect(blueprint?.actions.map(action => action.actionType)).toContain('create_lead');
        expect(blueprint?.actions.map(action => action.actionType)).toContain('create_finance_quote_request');
        expect(blueprint?.actions.map(action => action.actionType)).toContain('request_media_asset');
        expect(blueprint?.knowledgeSources.map(source => source.type)).toContain('finance_invoices_private');
    });

    it('summarizes Training, Knowledge Center, Action Registry, deployment, tests, and analytics', () => {
        const blueprint = resolveProjectChatbotBlueprint(buildProjectWithBlueprint('root'));
        const summary = buildChatbotEngineDashboardSummary(blueprint);

        expect(summary.hasBlueprint).toBe(true);
        expect(summary.status).toBe('blocked');
        expect(summary.training.supportedLanguageCount).toBe(2);
        expect(summary.training.businessKnowledgeCount).toBeGreaterThan(0);
        expect(summary.training.knowledgeSectionCount).toBeGreaterThan(0);
        expect(summary.training.eventIntentCount).toBeGreaterThan(0);
        expect(summary.appearance).toMatchObject({
            status: 'review',
            source: 'businessBlueprint.brandProfile',
            designSystemSource: 'Design Star',
            usesProjectTokens: true,
            designStarAligned: true,
            primaryColor: '#0f766e',
            accentColor: '#f59e0b',
            logoConfigured: false,
        });
        expect(summary.appearance.brandColorCount).toBeGreaterThanOrEqual(5);
        expect(summary.appearance.warnings.join('\n')).toContain('Logo or avatar is missing');
        expect(summary.knowledge.total).toBeGreaterThanOrEqual(4);
        expect(summary.actions.total).toBeGreaterThanOrEqual(10);
        expect(summary.actions.enabled).toBe(0);
        expect(summary.actions.idempotent).toBeGreaterThan(0);
        expect(summary.surfaces.map(surface => surface.id)).toEqual(expect.arrayContaining([
            'webWidget',
            'storefront',
            'checkout',
            'bookingPage',
            'bioPage',
            'restaurantMenu',
            'realtyPropertyPage',
            'voice',
        ]));
        expect(summary.surfaces.find(surface => surface.id === 'webWidget')).toMatchObject({
            sourceModule: 'website-builder',
            publicSurface: true,
            requiredForCanonicalDeployment: true,
        });
        expect(summary.surfaces.find(surface => surface.id === 'restaurantMenu')?.runtimeEvidence).toContain('components/PublicRestaurantMenuPage.tsx');
        expect(summary.deployment.surfaceCoverage).toMatchObject({
            required: 7,
            deployedRequired: 0,
            public: 9,
            deployedPublic: 0,
            status: 'blocked',
        });
        expect(summary.deployment.surfaceCoverage.missingRequired).toEqual(expect.arrayContaining([
            'webWidget',
            'storefront',
            'checkout',
            'bioPage',
            'bookingPage',
            'restaurantMenu',
            'realtyPropertyPage',
        ]));
        expect(summary.capabilities.map(capability => capability.id)).toEqual(expect.arrayContaining([
            'leadCapture',
            'ecommerce',
            'finance',
            'mediaAi',
            'voice',
        ]));
        expect(summary.capabilities.find(capability => capability.id === 'finance')).toMatchObject({
            enabled: true,
            status: 'review',
        });
        expect(summary.capabilities.find(capability => capability.id === 'mediaAi')).toMatchObject({
            enabled: true,
            status: 'review',
        });
        expect(summary.testLab.scenarioCount).toBeGreaterThan(0);
        expect(blueprint?.testing.expectedActions).toContain('request_media_asset');
        expect(summary.eventLog.events).toContain('chatbot_action_blocked');
        expect(summary.deployment.voiceEnabled).toBe(false);
        expect(summary.deployment.requireActionRegistry).toBe(true);
        expect(summary.deployment.requireKnowledgeReview).toBe(true);
    });

    it('returns a blocked missing summary when no BusinessBlueprint exists', () => {
        const summary = buildChatbotEngineDashboardSummary(resolveProjectChatbotBlueprint(null));

        expect(summary.hasBlueprint).toBe(false);
        expect(summary.status).toBe('blocked');
        expect(summary.blockers).toEqual(['chatbot_blueprint_missing']);
        expect(summary.actions.total).toBe(0);
    });
});
