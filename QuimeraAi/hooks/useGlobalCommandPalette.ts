import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/core/AuthContext';
import { useSafeProject } from '../contexts/project';
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

const COMMAND_GUIDE_TARGETS: Record<string, string> = {
    'action:create-website': 'create_website',
    'action:edit-website': 'open_website_builder',
    'action:generate-image': 'generate_hero_image',
    'action:create-video': 'create_video',
    'action:create-email': 'create_email',
    'action:create-product': 'open_ecommerce',
    'action:create-appointment': 'create_appointment',
    'action:review-leads': 'review_leads',
    'action:create-bio-page': 'improve_bio_page',
    'action:train-chatcore': 'train_chatcore',
    'action:analyze-project': 'analyze_project',
    'action:use-cms': 'open_cms',
    'action:use-blog-hub': 'open_blog',
    'action:use-navigation': 'open_navigation',
    'action:use-domains': 'open_domains',
    'action:use-seo': 'open_seo',
    'action:use-templates': 'open_templates',
    'action:use-finance': 'open_finance',
    'action:use-restaurants': 'open_restaurants',
    'action:use-realty': 'open_realty',
    'action:use-owner-mode': 'review_platform_errors',
};

export function useGlobalCommandPalette() {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { canAccessSuperAdmin } = useAuth();
    const projectContext = useSafeProject();
    const projects = projectContext?.projects || [];
    const activeProjectId = projectContext?.activeProjectId || null;
    const activeProject = projectContext?.activeProject || null;
    const loadProject = projectContext?.loadProject;
    const { setView, setAdminView } = useUI();
    const tenantContext = useSafeTenant();
    const { isServicePublic, isLoading: isLoadingServices } = useServiceAvailability();
    const router = useRouter();
    const canAccessOwnerMode = Boolean(
        canAccessSuperAdmin
        || tenantContext?.currentMembership?.role === 'agency_owner'
    );

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
                canAccessAdmin: canAccessOwnerMode,
                canAccessService: serviceId => !isLoadingServices && isServicePublic(serviceId),
            });
        } catch (error) {
            console.error('[GlobalCommandPalette] Failed to build command items:', error);
            return buildGlobalCommandItems({
                query,
                projects: [],
                activeProjectId,
                canAccessAdmin: false,
                canAccessService: () => false,
            });
        }
    }, [activeProjectId, canAccessOwnerMode, isLoadingServices, isServicePublic, projects, query]);

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
            const quickActionId = COMMAND_GUIDE_TARGETS[item.id] || null;
            dispatchGlobalAssistantEntryRequest(createGlobalAssistantEntryPayload(prompt, {
                source: 'command_palette',
                surface: item.requiresAdmin ? 'admin' : 'app',
                metadata: {
                    commandId: item.id,
                    commandType: item.type,
                    ...(quickActionId ? { quickActionId } : {}),
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
            if (!loadProject) return;
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
