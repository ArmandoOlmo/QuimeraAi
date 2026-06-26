import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/core/AuthContext';
import { useProject } from '../contexts/project';
import { useUI } from '../contexts/core/UIContext';
import { useSafeTenant } from '../contexts/tenant/TenantContext';
import { useServiceAvailability } from './useServiceAvailability';
import { useRouter } from './useRouter';
import {
    createGlobalAssistantEntryPayload,
    dispatchGlobalAssistantEntryRequest,
    inferGlobalAssistantEntryModule,
} from '../services/globalAssistant/globalAssistantEntryBridge';
import {
    buildGlobalCommandItems,
    type GlobalCommandItem,
} from '../services/globalAssistant/globalCommandSearch';
import { translateCommandTextSafe } from '../services/globalAssistant/globalCommandTranslations';

export function useGlobalCommandPalette() {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { canAccessSuperAdmin } = useAuth();
    const { projects, activeProjectId, activeProject, loadProject } = useProject();
    const { setView, setAdminView } = useUI();
    const tenantContext = useSafeTenant();
    const { canAccessService, isLoading: isLoadingServices } = useServiceAvailability();
    const router = useRouter();

    const open = useCallback(() => {
        setIsOpen(true);
        setSelectedIndex(0);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(0);
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
            if ((event.metaKey || event.ctrlKey) && key === 'k') {
                event.preventDefault();
                setIsOpen(current => {
                    const next = !current;
                    if (!next) {
                        setQuery('');
                        setSelectedIndex(0);
                    }
                    return next;
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const items = useMemo(() => {
        try {
            return buildGlobalCommandItems({
                query,
                projects: Array.isArray(projects) ? projects : [],
                activeProjectId,
                canAccessAdmin: canAccessSuperAdmin,
                canAccessService: serviceId => isLoadingServices || canAccessService(serviceId),
            });
        } catch (error) {
            console.error('[GlobalCommandPalette] Failed to build command items:', error);
            return buildGlobalCommandItems({
                query,
                projects: [],
                activeProjectId,
                canAccessAdmin: false,
                canAccessService: () => true,
            });
        }
    }, [activeProjectId, canAccessService, canAccessSuperAdmin, isLoadingServices, projects, query]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const moveSelection = useCallback((direction: 1 | -1) => {
        setSelectedIndex(current => {
            if (items.length === 0) return 0;
            return (current + direction + items.length) % items.length;
        });
    }, [items.length]);

    const executeCommand = useCallback(async (item: GlobalCommandItem) => {
        if (item.disabledReason) return;

        if (item.type === 'assistant_request' || item.type === 'action') {
            const prompt = translateCommandTextSafe(t, item.promptKey, item.prompt || query.trim(), item.promptParams);
            if (!prompt) return;
            const activeModule = item.assistantModule || inferGlobalAssistantEntryModule(prompt);
            dispatchGlobalAssistantEntryRequest(createGlobalAssistantEntryPayload(prompt, {
                source: 'command_palette',
                surface: item.requiresAdmin ? 'admin' : 'app',
                metadata: {
                    commandId: item.id,
                    commandType: item.type,
                    sourceComponent: 'GlobalCommandPalette',
                    assistantLayer: 'global_operating_layer',
                    commandCenter: true,
                    memoryScopeHint: 'user_tenant_project_module_session_task',
                    activeModule,
                    activeProjectId,
                    activeProjectName: typeof activeProject?.name === 'string' ? activeProject.name : null,
                    activeTenantId: tenantContext?.currentTenant?.id || activeProject?.tenantId || null,
                    activeTenantName: tenantContext?.currentTenant?.name || null,
                },
            }));
            close();
            return;
        }

        if (item.type === 'project' && item.projectId) {
            await loadProject(item.projectId, false, true);
            close();
            return;
        }

        if (item.view) {
            if (item.adminView) setAdminView(item.adminView);
            setView(item.view);
            router.navigateToView(item.view, item.adminView);
            close();
        }
    }, [activeProject, activeProjectId, close, loadProject, query, router, setAdminView, setView, t, tenantContext]);

    return {
        isOpen,
        open,
        close,
        query,
        setQuery,
        selectedIndex,
        setSelectedIndex,
        items,
        moveSelection,
        executeCommand,
    };
}
