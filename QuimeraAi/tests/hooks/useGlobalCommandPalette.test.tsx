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
const authStateMock = vi.hoisted(() => ({
    canAccessSuperAdmin: true,
}));
const tenantStateMock = vi.hoisted(() => ({
    currentTenant: {
        id: 'tenant_1',
        name: 'Workspace Uno',
    },
    currentMembership: {
        role: 'agency_member',
    },
}));

vi.mock('../../contexts/core/AuthContext', () => ({
    useAuth: () => ({ canAccessSuperAdmin: authStateMock.canAccessSuperAdmin }),
}));

vi.mock('../../contexts/project', () => ({
    useProject: () => ({
        projects: [],
        activeProjectId: 'project_1',
        activeProject: {
            id: 'project_1',
            name: 'Casa Luna',
            tenantId: 'tenant_1',
        },
        loadProject: loadProjectMock,
    }),
}));

vi.mock('../../contexts/tenant/TenantContext', () => ({
    useSafeTenant: () => tenantStateMock,
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
    inferGlobalAssistantEntryModule: (prompt: string) => prompt.includes('leads') ? 'crm' : null,
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
        authStateMock.canAccessSuperAdmin = true;
        tenantStateMock.currentMembership.role = 'agency_member';
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
                    commandType: 'action',
                    sourceComponent: 'GlobalCommandPalette',
                    assistantLayer: 'global_operating_layer',
                    commandCenter: true,
                    memoryScopeHint: 'user_tenant_project_module_session_task',
                    activeProjectId: 'project_1',
                    activeProjectName: 'Casa Luna',
                    activeTenantId: 'tenant_1',
                    activeTenantName: 'Workspace Uno',
                }),
            }));
        expect(dispatchGlobalAssistantEntryRequestMock).toHaveBeenCalledWith({
            prompt: 'Use the fallback prompt.',
            options: expect.objectContaining({ source: 'command_palette' }),
        });
    });

    it('adds explicit command modules and infers modules for freeform assistant requests', async () => {
        const { useGlobalCommandPalette } = await import('../../hooks/useGlobalCommandPalette');
        const { result } = renderHook(() => useGlobalCommandPalette());

        await act(async () => {
            await result.current.executeCommand({
                id: 'action:create-product',
                type: 'action',
                label: 'Create product',
                description: 'Draft a new ecommerce product.',
                prompt: 'Create an ecommerce product draft.',
                assistantModule: 'ecommerce',
                keywords: ['product'],
            });
        });

        expect(createGlobalAssistantEntryPayloadMock).toHaveBeenLastCalledWith('Create an ecommerce product draft.', expect.objectContaining({
            metadata: expect.objectContaining({
                commandId: 'action:create-product',
                activeModule: 'ecommerce',
            }),
        }));

        await act(async () => {
            await result.current.executeCommand({
                id: 'assistant:request',
                type: 'assistant_request',
                label: 'Ask Quimera',
                prompt: 'Revisa mis leads y prepara follow ups',
                keywords: ['assistant'],
            });
        });

        expect(createGlobalAssistantEntryPayloadMock).toHaveBeenLastCalledWith('Revisa mis leads y prepara follow ups', expect.objectContaining({
            metadata: expect.objectContaining({
                commandId: 'assistant:request',
                activeModule: 'crm',
            }),
        }));
    });

    it('exposes Owner Mode admin commands for agency owners without requiring global superadmin', async () => {
        authStateMock.canAccessSuperAdmin = false;
        tenantStateMock.currentMembership.role = 'agency_owner';
        const { useGlobalCommandPalette } = await import('../../hooks/useGlobalCommandPalette');
        const { result } = renderHook(() => useGlobalCommandPalette());

        await act(async () => {
            result.current.setQuery('service availability');
        });

        expect(result.current.items).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: 'admin:service-availability',
                type: 'admin',
            }),
        ]));
    });

    it('keeps admin commands hidden for non-owner workspace members', async () => {
        authStateMock.canAccessSuperAdmin = false;
        tenantStateMock.currentMembership.role = 'agency_member';
        const { useGlobalCommandPalette } = await import('../../hooks/useGlobalCommandPalette');
        const { result } = renderHook(() => useGlobalCommandPalette());

        await act(async () => {
            result.current.setQuery('service availability');
        });

        expect(result.current.items.some(item => item.id === 'admin:service-availability')).toBe(false);
        expect(result.current.items[0]).toMatchObject({
            id: 'assistant:request',
            type: 'assistant_request',
        });
    });
});
