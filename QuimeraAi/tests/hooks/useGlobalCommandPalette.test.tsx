import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dispatchGlobalAssistantEntryRequestMock = vi.hoisted(() => vi.fn());
const createGlobalAssistantEntryPayloadMock = vi.hoisted(() => vi.fn((prompt: string, options: Record<string, unknown>) => ({
    prompt,
    options,
})));
const loadProjectMock = vi.hoisted(() => vi.fn());
const setViewMock = vi.hoisted(() => vi.fn());
const setAdminViewMock = vi.hoisted(() => vi.fn());
const navigateToViewMock = vi.hoisted(() => vi.fn());

vi.mock('../../contexts/core/AuthContext', () => ({
    useAuth: () => ({ canAccessSuperAdmin: true }),
}));

vi.mock('../../contexts/project', () => ({
    useProject: () => ({
        projects: [],
        activeProjectId: 'project_1',
        loadProject: loadProjectMock,
    }),
}));

vi.mock('../../contexts/core/UIContext', () => ({
    useUI: () => ({
        setView: setViewMock,
        setAdminView: setAdminViewMock,
    }),
}));

vi.mock('../../hooks/useServiceAvailability', () => ({
    useServiceAvailability: () => ({
        canAccessService: () => true,
        isLoading: false,
    }),
}));

vi.mock('../../hooks/useRouter', () => ({
    useRouter: () => ({ navigateToView: navigateToViewMock }),
}));

vi.mock('../../services/globalAssistant/globalAssistantEntryBridge', () => ({
    createGlobalAssistantEntryPayload: createGlobalAssistantEntryPayloadMock,
    dispatchGlobalAssistantEntryRequest: dispatchGlobalAssistantEntryRequestMock,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: { defaultValue?: string }) => {
            if (key.includes('.bad.')) {
                throw new TypeError("Cannot read properties of null (reading '1')");
            }
            return options?.defaultValue || key;
        },
    }),
}));

describe('useGlobalCommandPalette', () => {
    beforeEach(() => {
        dispatchGlobalAssistantEntryRequestMock.mockClear();
        createGlobalAssistantEntryPayloadMock.mockClear();
        loadProjectMock.mockClear();
        setViewMock.mockClear();
        setAdminViewMock.mockClear();
        navigateToViewMock.mockClear();
    });

    it('falls back to the raw prompt when command prompt translation throws', async () => {
        const { useGlobalCommandPalette } = await import('../../hooks/useGlobalCommandPalette');
        const { result } = renderHook(() => useGlobalCommandPalette());

        await act(async () => {
            await result.current.executeCommand({
                id: 'action:bad',
                type: 'action',
                label: 'Bad action',
                labelKey: 'globalCommandPalette.commands.action.bad.label',
                description: 'Bad action description',
                prompt: 'Use the fallback prompt.',
                promptKey: 'globalCommandPalette.commands.action.bad.prompt',
                keywords: ['bad'],
            });
        });

        expect(createGlobalAssistantEntryPayloadMock).toHaveBeenCalledWith('Use the fallback prompt.', expect.objectContaining({
            source: 'command_palette',
            surface: 'app',
            metadata: expect.objectContaining({
                commandId: 'action:bad',
                activeProjectId: 'project_1',
            }),
        }));
        expect(dispatchGlobalAssistantEntryRequestMock).toHaveBeenCalledWith({
            prompt: 'Use the fallback prompt.',
            options: expect.objectContaining({ source: 'command_palette' }),
        });
    });
});
