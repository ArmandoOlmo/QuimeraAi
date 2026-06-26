import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    createGlobalAssistantEntryPayload,
    routeDashboardAssistantEntry,
} from '../../services/globalAssistant/globalAssistantEntryBridge.ts';

describe('globalAssistantEntryBridge', () => {
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
});
