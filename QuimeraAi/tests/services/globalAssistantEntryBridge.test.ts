import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    createGlobalAssistantEntryPayload,
    routeDashboardAssistantEntry,
} from '../../services/globalAssistant/globalAssistantEntryBridge.ts';

describe('globalAssistantEntryBridge', () => {
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
        const payload = createGlobalAssistantEntryPayload('  Abre ecommerce  ', {
            source: 'dashboard_welcome',
            surface: 'dashboard',
            metadata: { projectCount: 3 },
        });

        expect(payload).toMatchObject({
            request: 'Abre ecommerce',
            source: 'dashboard_welcome',
            surface: 'dashboard',
            autoSubmit: true,
            metadata: { projectCount: 3 },
        });
        expect(new Date(payload.createdAt).toString()).not.toBe('Invalid Date');
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
