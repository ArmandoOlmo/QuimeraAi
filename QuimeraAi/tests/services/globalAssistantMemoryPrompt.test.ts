import { describe, expect, it } from 'vitest';
import { buildGuideOnlyMemoryPromptContext } from '../../services/globalAssistant/globalAssistantMemoryPrompt.ts';
import type {
    AssistantMemoryContextManifest,
    GlobalAssistantMemory,
} from '../../types/globalAssistant.ts';

const manifest: AssistantMemoryContextManifest = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    mode: 'user',
    activeModule: 'media',
    activeRoute: '/assets',
    currentSurface: 'dashboard',
    activeServices: ['aiFeatures', 'crm'],
    sessionId: 'conversation-1',
    taskId: null,
    totalCount: 2,
    memoryIds: ['memory-1', 'memory-2'],
    scopeCounts: { user: 1, module: 1 },
    moduleCounts: { media: 1 },
    segments: [],
    explanation: [],
    guardrails: {
        tenantIsolation: 'Only tenant memory is eligible.',
        projectIsolation: 'Only project memory is eligible.',
        adminMemoryVisible: false,
        adminMemoryReason: 'User mode.',
    },
    createdAt: '2026-06-26T00:00:00.000Z',
};

const memory = (overrides: Partial<GlobalAssistantMemory>): GlobalAssistantMemory => ({
    id: 'memory-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    projectId: 'project-1',
    scope: 'user',
    module: null,
    title: 'Short answers',
    summary: 'The user prefers short Spanish guidance.',
    data: {},
    source: 'test',
    sourceEntityType: 'note',
    sourceEntityId: 'note-1',
    importance: 0.8,
    expiresAt: null,
    items: [],
    createdAt: '2026-06-26T00:00:00.000Z',
    updatedAt: '2026-06-26T00:00:00.000Z',
    ...overrides,
});

describe('buildGuideOnlyMemoryPromptContext', () => {
    it('formats scoped memory for guide-only Spanish prompts without exposing IDs', () => {
        const prompt = buildGuideOnlyMemoryPromptContext([
            memory({}),
            memory({
                id: 'memory-2',
                scope: 'module',
                module: 'media',
                title: 'Image flow',
                summary: 'Open Images and let the user press Generate.',
            }),
        ], manifest, 'es');

        expect(prompt).toContain('CONTEXTO PARA GUIAR AL USUARIO');
        expect(prompt).toContain('Reglas: responde corto y claro');
        expect(prompt).toContain('No digas que creaste, generaste, editaste o cambiaste algo desde el chat');
        expect(prompt).toContain('Si un servicio no esta en la lista disponible');
        expect(prompt).toContain('workspace activo');
        expect(prompt).toContain('modulo media');
        expect(prompt).toContain('Pagina actual: /assets; superficie: dashboard');
        expect(prompt).toContain('Servicios disponibles: AI Studio / Media AI, Leads / CRM.');
        expect(prompt).toContain('Usuario: Short answers');
        expect(prompt).toContain('Modulo: media: Image flow');
        expect(prompt).not.toContain('tenant-1');
        expect(prompt).not.toContain('project-1');
        expect(prompt).not.toContain('memory-1');
        expect(prompt).not.toContain('conversation-1');
        expect(prompt).not.toContain('sourceEntityId');
    });

    it('still provides active context when no memory is available', () => {
        const prompt = buildGuideOnlyMemoryPromptContext([], manifest, 'en');

        expect(prompt).toContain('CONTEXT TO GUIDE THE USER');
        expect(prompt).toContain('Current page: /assets; surface: dashboard');
        expect(prompt).toContain('Available services: AI Studio / Media AI, Leads / CRM.');
        expect(prompt).toContain('No relevant prior memory is available for this request.');
    });
});
