import { describe, expect, it } from 'vitest';
import { resolveModuleFromRoute } from '../../services/globalAssistant/globalAssistantContextResolver.ts';

describe('globalAssistantContextResolver', () => {
    it('maps real app routes to the module the Global Assistant should understand', () => {
        expect(resolveModuleFromRoute('/ai-studio')).toBe('aiStudio');
        expect(resolveModuleFromRoute('/editor/project-1')).toBe('website');
        expect(resolveModuleFromRoute('/cms')).toBe('website');
        expect(resolveModuleFromRoute('/navigation')).toBe('website');
        expect(resolveModuleFromRoute('/domains')).toBe('settings');
        expect(resolveModuleFromRoute('/templates')).toBe('project');
        expect(resolveModuleFromRoute('/blog-hub')).toBe('website');
        expect(resolveModuleFromRoute('/agency/reports')).toBe('tenant');
        expect(resolveModuleFromRoute('/ai-assistant')).toBe('chatbot');
        expect(resolveModuleFromRoute('/real-estate')).toBe('realEstate');
        expect(resolveModuleFromRoute('/admin/global-assistant')).toBe('admin');
    });
});
