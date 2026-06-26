import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/core/AuthContext';
import { useProject } from '../contexts/project';
import { useUI } from '../contexts/core/UIContext';
import { useServiceAvailability } from './useServiceAvailability';
import { useRouter } from './useRouter';
import {
    createGlobalAssistantEntryPayload,
    dispatchGlobalAssistantEntryRequest,
} from '../services/globalAssistant/globalAssistantEntryBridge';
import {
    buildGlobalCommandItems,
    type GlobalCommandItem,
} from '../services/globalAssistant/globalCommandSearch';

type CommandTranslationParams = Record<string, string | number | boolean | null | undefined>;

const safeTranslationParams = (params?: CommandTranslationParams): CommandTranslationParams => {
    if (!params) return {};

    return Object.entries(params).reduce<CommandTranslationParams>((safeParams, [key, value]) => {
        if (key === 'defaultValue' || key === 'interpolation' || key === 'nest') return safeParams;
        if (
            typeof value === 'string'
            || typeof value === 'number'
            || typeof value === 'boolean'
            || value == null
        ) {
            safeParams[key] = value;
        }
        return safeParams;
    }, {});
};

const translatePromptSafe = (
    translate: ReturnType<typeof useTranslation>['t'],
    key: string | undefined,
    fallback: string,
    params?: CommandTranslationParams,
): string => {
    if (!key) return fallback;
    try {
        const translated = translate(key, {
            ...safeTranslationParams(params),
            defaultValue: fallback,
            interpolation: { skipOnVariables: true },
            nest: false,
        } as any);
        return typeof translated === 'string' ? translated : fallback;
    } catch {
        return fallback;
    }
};

export function useGlobalCommandPalette() {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { canAccessSuperAdmin } = useAuth();
    const { projects, activeProjectId, loadProject } = useProject();
    const { setView, setAdminView } = useUI();
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

    const items = useMemo(() => buildGlobalCommandItems({
        query,
        projects,
        activeProjectId,
        canAccessAdmin: canAccessSuperAdmin,
        canAccessService: serviceId => isLoadingServices || canAccessService(serviceId),
    }), [activeProjectId, canAccessService, canAccessSuperAdmin, isLoadingServices, projects, query]);

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
            const prompt = translatePromptSafe(t, item.promptKey, item.prompt || query.trim(), item.promptParams);
            if (!prompt) return;
            dispatchGlobalAssistantEntryRequest(createGlobalAssistantEntryPayload(prompt, {
                source: 'command_palette',
                surface: item.requiresAdmin ? 'admin' : 'app',
                metadata: {
                    commandId: item.id,
                    commandType: item.type,
                    activeProjectId,
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
    }, [activeProjectId, close, loadProject, query, router, setAdminView, setView, t]);

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
