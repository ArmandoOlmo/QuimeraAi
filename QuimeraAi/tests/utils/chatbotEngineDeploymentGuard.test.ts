import { describe, expect, it } from 'vitest';
import type { ChatbotBlueprint } from '../../types/businessBlueprint';
import type { Project } from '../../types/project';
import type { WebsitePlan } from '../../types/websitePlan';
import { createBusinessBlueprintFromWebsitePlan } from '../../utils/businessBlueprint';
import { evaluateChatbotSurfaceDeployment } from '../../utils/chatbotEngine/deploymentGuard';

function buildPlan(): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'Quimera Surface Demo',
            industry: 'ecommerce',
            description: 'A store with canonical Chatbot Engine deployment settings.',
            services: [{ name: 'Online store', description: 'Products and checkout.' }],
            contactInfo: { email: 'hello@example.com' },
            hasEcommerce: true,
        },
        brandProfile: {
            colors: {
                primary: '#f4b000',
                secondary: '#111827',
                accent: '#14b8a6',
                background: '#ffffff',
                surface: '#f8fafc',
                text: '#111827',
            },
        },
        contentMap: { pages: [] },
        componentPlan: [
            { component: 'hero', reason: 'Intro', confidence: 0.8 },
            { component: 'featuredProducts', reason: 'Storefront', confidence: 0.8 },
            { component: 'chatbot', reason: 'ChatCore', confidence: 0.8 },
        ],
        assetPlan: [],
        qualityGoals: [],
    };
}

function buildBlueprint(): ChatbotBlueprint {
    return createBusinessBlueprintFromWebsitePlan(buildPlan(), {
        now: '2026-06-26T00:00:00.000Z',
        projectId: 'project_surface',
        tenantId: 'tenant_surface',
    }).chatbotBlueprint;
}

function buildProject(chatbotBlueprint: ChatbotBlueprint): Project {
    const businessBlueprint = createBusinessBlueprintFromWebsitePlan(buildPlan(), {
        now: '2026-06-26T00:00:00.000Z',
        projectId: 'project_surface',
        tenantId: 'tenant_surface',
    });

    return {
        id: 'project_surface',
        name: 'Quimera Surface Demo',
        data: {
            businessBlueprint: {
                ...businessBlueprint,
                chatbotBlueprint,
            },
        },
        theme: {},
        componentOrder: [],
        sectionVisibility: {},
        status: 'Published',
    } as unknown as Project;
}

describe('chatbotEngine deployment guard', () => {
    it('keeps legacy projects visible when ChatbotBlueprint V2 is missing', () => {
        const evaluation = evaluateChatbotSurfaceDeployment(null, 'website');

        expect(evaluation).toMatchObject({
            allowed: true,
            visible: true,
            source: 'legacy',
            reason: 'chatbot_blueprint_missing_legacy_allowed',
        });
    });

    it('blocks a paused surface even when the legacy assistant remains active', () => {
        const blueprint = buildBlueprint();
        const evaluation = evaluateChatbotSurfaceDeployment({
            ...blueprint,
            channels: {
                ...blueprint.channels,
                webWidget: {
                    ...blueprint.channels.webWidget,
                    enabled: false,
                    status: 'paused',
                },
            },
        }, 'website');

        expect(evaluation).toMatchObject({
            allowed: false,
            visible: false,
            reason: 'surface_paused',
            surfaceKey: 'webWidget',
            status: 'paused',
        });
        expect(evaluation.blockers).toEqual(['surface_paused']);
    });

    it('blocks a disabled surface before public runtime actions can execute', () => {
        const blueprint = buildBlueprint();
        const evaluation = evaluateChatbotSurfaceDeployment({
            ...blueprint,
            channels: {
                ...blueprint.channels,
                storefront: {
                    ...blueprint.channels.storefront,
                    enabled: false,
                    status: 'disabled',
                },
            },
        }, 'storefront');

        expect(evaluation.allowed).toBe(false);
        expect(evaluation.reason).toBe('surface_disabled');
        expect(evaluation.blockers).toEqual(['surface_disabled']);
    });

    it('allows current non-strict public surfaces while marking deployment as not enforced', () => {
        const blueprint = buildBlueprint();
        const evaluation = evaluateChatbotSurfaceDeployment(buildProject(blueprint), 'website');

        expect(evaluation.allowed).toBe(true);
        expect(evaluation.visible).toBe(true);
        expect(evaluation.reason).toBe('surface_legacy_allowed');
        expect(evaluation.warnings).toContain('surface_deployment_not_enforced');
    });

    it('blocks non-deployed public surfaces when strict deployment is required', () => {
        const blueprint = buildBlueprint();
        const evaluation = evaluateChatbotSurfaceDeployment({
            ...blueprint,
            deployment: {
                ...blueprint.deployment,
                safetySettings: {
                    ...blueprint.deployment.safetySettings,
                    requireSurfaceDeployment: true,
                },
            },
        }, 'website');

        expect(evaluation.allowed).toBe(false);
        expect(evaluation.reason).toBe('surface_not_deployed');
        expect(evaluation.blockers).toEqual(['surface_status_test']);
        expect(evaluation.strict).toBe(true);
    });

    it('allows deployed surfaces under strict deployment', () => {
        const blueprint = buildBlueprint();
        const evaluation = evaluateChatbotSurfaceDeployment({
            ...blueprint,
            channels: {
                ...blueprint.channels,
                webWidget: {
                    ...blueprint.channels.webWidget,
                    enabled: true,
                    status: 'deployed',
                },
            },
            deployment: {
                ...blueprint.deployment,
                safetySettings: {
                    ...blueprint.deployment.safetySettings,
                    requireSurfaceDeployment: true,
                },
            },
        }, 'website');

        expect(evaluation).toMatchObject({
            allowed: true,
            visible: true,
            reason: 'surface_deployed',
            strict: true,
        });
    });

    it('allows test mode in preview/admin surfaces even when strict deployment is active', () => {
        const blueprint = buildBlueprint();
        const evaluation = evaluateChatbotSurfaceDeployment({
            ...blueprint,
            deployment: {
                ...blueprint.deployment,
                safetySettings: {
                    ...blueprint.deployment.safetySettings,
                    requireSurfaceDeployment: true,
                },
            },
        }, 'admin_preview', { isPreview: true });

        expect(evaluation.allowed).toBe(true);
        expect(evaluation.reason).toBe('surface_test_preview_allowed');
        expect(evaluation.warnings).toContain('surface_test_mode');
    });
});
