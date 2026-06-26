import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    buildDashboardAssistantEntryMetadata,
    createGlobalAssistantEntryPayload,
    getDashboardAssistantQuickActions,
    routeDashboardAssistantEntry,
} from '../../services/globalAssistant/globalAssistantEntryBridge.ts';

describe('globalAssistantEntryBridge', () => {
    const getTranslation = (tree: Record<string, unknown>, key: string): unknown =>
        key.split('.').reduce<unknown>((node, segment) => {
            if (!node || typeof node !== 'object') return undefined;
            return (node as Record<string, unknown>)[segment];
        }, tree);

    it('ignores empty dashboard submissions instead of opening AI Studio implicitly', () => {
        expect(routeDashboardAssistantEntry('   ')).toEqual({
            destination: 'none',
            reason: 'empty_dashboard_request_ignored',
            forwardPromptToAiStudio: false,
        });
    });

    it('routes dashboard requests to the Global Assistant by default', () => {
        expect(routeDashboardAssistantEntry('Crea un website para un restaurante con menu y citas')).toMatchObject({
            destination: 'global_assistant',
            reason: 'dashboard_request_routes_to_global_operating_layer',
        });
        expect(routeDashboardAssistantEntry('Genera una imagen para el hero de mi proyecto')).toMatchObject({
            destination: 'global_assistant',
        });
        expect(routeDashboardAssistantEntry('Revisa mis leads y prepara follow ups')).toMatchObject({
            destination: 'global_assistant',
        });
    });

    it('keeps explicit AI Studio requests on the AI Studio surface', () => {
        expect(routeDashboardAssistantEntry('Abre AI Studio')).toEqual({
            destination: 'ai_studio',
            reason: 'explicit_ai_studio_open_request',
            forwardPromptToAiStudio: false,
        });
        expect(routeDashboardAssistantEntry('Usa AI Studio para crear una landing')).toEqual({
            destination: 'ai_studio',
            reason: 'explicit_ai_studio_creation_request',
            forwardPromptToAiStudio: true,
        });
    });

    it('builds a typed dashboard payload for the assistant drawer', () => {
        const metadata = buildDashboardAssistantEntryMetadata({
            entryPoint: 'dashboard_input',
            projectCount: 3,
            routingReason: 'dashboard_request_routes_to_global_operating_layer',
        });
        const payload = createGlobalAssistantEntryPayload('  Abre ecommerce  ', {
            source: 'dashboard_quick_action',
            surface: 'dashboard',
            metadata,
        });

        expect(payload).toMatchObject({
            request: 'Abre ecommerce',
            source: 'dashboard_quick_action',
            surface: 'dashboard',
            autoSubmit: true,
            metadata: {
                route: 'dashboard',
                entryPoint: 'dashboard_input',
                projectCount: 3,
                hasProjects: true,
                requestedMode: 'user',
                routingReason: 'dashboard_request_routes_to_global_operating_layer',
            },
        });
        expect(new Date(payload.createdAt).toString()).not.toBe('Invalid Date');
    });

    it('builds dashboard quick-action metadata with module and admin mode context', () => {
        expect(buildDashboardAssistantEntryMetadata({
            entryPoint: 'dashboard_quick_action',
            projectCount: 2,
            routingReason: 'dashboard_quick_action_routes_to_global_operating_layer',
            quickAction: {
                id: 'open_ecommerce',
                category: 'open',
                module: 'ecommerce',
            },
        })).toMatchObject({
            route: 'dashboard',
            entryPoint: 'dashboard_quick_action',
            projectCount: 2,
            hasProjects: true,
            requestedMode: 'user',
            activeModule: 'ecommerce',
            quickActionId: 'open_ecommerce',
            quickActionCategory: 'open',
        });

        expect(buildDashboardAssistantEntryMetadata({
            entryPoint: 'dashboard_quick_action',
            projectCount: 0,
            routingReason: 'dashboard_quick_action_routes_to_global_operating_layer',
            quickAction: {
                id: 'review_platform_errors',
                category: 'admin',
                module: 'admin',
            },
        })).toMatchObject({
            hasProjects: false,
            requestedMode: 'admin',
            activeModule: 'admin',
        });
    });

    it('exposes dashboard quick actions as Global Assistant command-center entries', () => {
        const withoutProjects = getDashboardAssistantQuickActions({
            hasProjects: false,
            canUseAdminMode: false,
        });

        expect(withoutProjects.map(action => action.id)).toEqual([
            'create_website',
        ]);
        expect(withoutProjects[0]).toMatchObject({
            module: 'aiStudio',
            requiresProject: false,
        });

        const ownerWithoutProjects = getDashboardAssistantQuickActions({
            hasProjects: false,
            canUseAdminMode: true,
        });
        expect(ownerWithoutProjects.map(action => action.id)).toEqual([
            'create_website',
            'review_platform_errors',
        ]);

        const ownerActions = getDashboardAssistantQuickActions({
            hasProjects: true,
            canUseAdminMode: true,
        });

        expect(ownerActions.map(action => action.id)).toEqual([
            'create_website',
            'generate_hero_image',
            'review_leads',
            'create_email',
            'open_ecommerce',
            'review_platform_errors',
        ]);
        expect(ownerActions.every(action => action.promptKey.startsWith('dashboard.assistantQuickActions.'))).toBe(true);
        expect(ownerActions.find(action => action.id === 'review_platform_errors')).toMatchObject({
            module: 'admin',
            adminOnly: true,
        });
    });

    it('keeps dashboard quick action labels and prompts translated in English and Spanish', () => {
        const en = JSON.parse(readFileSync(resolve(process.cwd(), 'locales/en/translation.json'), 'utf8')) as Record<string, unknown>;
        const es = JSON.parse(readFileSync(resolve(process.cwd(), 'locales/es/translation.json'), 'utf8')) as Record<string, unknown>;
        const actions = getDashboardAssistantQuickActions({
            hasProjects: true,
            canUseAdminMode: true,
            limit: 10,
        });

        for (const action of actions) {
            for (const key of [action.labelKey, action.promptKey]) {
                expect(getTranslation(en, key), `Missing English translation for ${key}`).toEqual(expect.any(String));
                expect(getTranslation(es, key), `Missing Spanish translation for ${key}`).toEqual(expect.any(String));
            }
        }
    });

    it('keeps website creation out of empty-argument dashboard fast paths', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).not.toContain("return { name: 'create_website', args: {} }");
        expect(source).toContain('Website creation request requires LLM argument extraction.');
        expect(source).toContain('I need businessName, industry, and description before creating a website draft.');
    });

    it('wires dashboard global requests to persistent operating-layer conversations', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('globalAssistantConversationService.createConversation');
        expect(source).toContain('conversationId: assistantConversationIdRef.current');
        expect(source).toContain("source: 'operating_layer_plan'");
        expect(source).toContain('clearAssistantConversation');
    });

    it('wires dashboard global requests to tenant/workspace-aware context', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('useSafeTenant');
        expect(source).toContain('tenantContextRef');
        expect(source).toContain('resolveOperatingLayerAccessContext');
        expect(source).toContain('resolveOperatingLayerTenantContext');
        expect(source).toContain('activeTenantId: tenant.tenantId');
        expect(source).toContain('activeTenantName: tenant.tenantName');
        expect(source).toContain('tenantPlan: tenant.tenantPlan');
        expect(source).toContain('activeTaskId');
        expect(source).toContain('mode: access.mode');
        expect(source).toContain('userPermissions: access.userPermissions');
    });
});
