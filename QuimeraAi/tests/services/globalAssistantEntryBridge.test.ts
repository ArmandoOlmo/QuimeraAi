import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    buildDashboardAssistantEntryMetadata,
    createGlobalAssistantEntryPayload,
    getDashboardAssistantQuickActions,
    inferDashboardAssistantModule,
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
            activeModule: null,
        });
    });

    it('routes dashboard requests to the Global Assistant by default with inferred module context', () => {
        expect(routeDashboardAssistantEntry('Crea un website para un restaurante con menu y citas')).toMatchObject({
            destination: 'global_assistant',
            reason: 'dashboard_request_routes_to_global_operating_layer',
            activeModule: 'aiStudio',
        });
        expect(routeDashboardAssistantEntry('Necesito crear un website por una firma de arquitecto')).toMatchObject({
            destination: 'global_assistant',
            reason: 'dashboard_request_routes_to_global_operating_layer',
            activeModule: 'aiStudio',
        });
        expect(routeDashboardAssistantEntry('Genera una imagen para el hero de mi proyecto')).toMatchObject({
            destination: 'global_assistant',
            activeModule: 'media',
        });
        expect(routeDashboardAssistantEntry('Crea un video para la campaña de este proyecto')).toMatchObject({
            destination: 'global_assistant',
            activeModule: 'media',
        });
        expect(routeDashboardAssistantEntry('Revisa mis leads y prepara follow ups')).toMatchObject({
            destination: 'global_assistant',
            activeModule: 'crm',
        });
    });

    it('keeps explicit AI Studio requests on the AI Studio surface', () => {
        expect(routeDashboardAssistantEntry('Abre AI Studio')).toEqual({
            destination: 'ai_studio',
            reason: 'explicit_ai_studio_open_request',
            forwardPromptToAiStudio: false,
            activeModule: 'aiStudio',
        });
        expect(routeDashboardAssistantEntry('Usa AI Studio para crear una landing')).toEqual({
            destination: 'ai_studio',
            reason: 'explicit_ai_studio_creation_request',
            forwardPromptToAiStudio: true,
            activeModule: 'aiStudio',
        });
    });

    it('infers dashboard command-center modules without mixing ChatCore and Global Assistant', () => {
        expect(inferDashboardAssistantModule('¿Cómo funciona AI Studio?')).toBe('aiStudio');
        expect(inferDashboardAssistantModule('Entrena ChatCore con el conocimiento del proyecto')).toBe('chatbot');
        expect(inferDashboardAssistantModule('Abre Chat Core')).toBe('chatbot');
        expect(inferDashboardAssistantModule('Crea una campaña de email para leads nuevos')).toBe('emailMarketing');
        expect(inferDashboardAssistantModule('Abre ecommerce y revisa inventario')).toBe('ecommerce');
        expect(inferDashboardAssistantModule('Revisa platform errors en owner mode')).toBe('admin');
        expect(inferDashboardAssistantModule('Abre SuperAdmin')).toBe('admin');
        expect(inferDashboardAssistantModule('Revisa BusinessBlueprint del proyecto')).toBe('businessBlueprint');
        expect(inferDashboardAssistantModule('Open BusinessBlueprint')).toBe('businessBlueprint');
        expect(inferDashboardAssistantModule('Open storefront builder')).toBe('storefront');
        expect(inferDashboardAssistantModule('Open StorefrontBuilder')).toBe('storefront');
        expect(inferDashboardAssistantModule('Abre Media AI')).toBe('media');
        expect(inferDashboardAssistantModule('Abre Imágenes')).toBe('media');
        expect(inferDashboardAssistantModule('Open Videos')).toBe('media');
        expect(inferDashboardAssistantModule('Abre Website Builder')).toBe('website');
        expect(inferDashboardAssistantModule('Open WebsiteBuilder')).toBe('website');
        expect(inferDashboardAssistantModule('Abre Finance')).toBe('finance');
        expect(inferDashboardAssistantModule('Abre Restaurants')).toBe('restaurants');
        expect(inferDashboardAssistantModule('Revisa bienes raíces')).toBe('realEstate');
        expect(inferDashboardAssistantModule('Abre Bio Pages')).toBe('bioPage');
        expect(inferDashboardAssistantModule('Abre Appointments')).toBe('appointments');
        expect(inferDashboardAssistantModule('Revisa Analytics')).toBe('analytics');
        expect(inferDashboardAssistantModule('Cambia de proyecto')).toBe('project');
        expect(inferDashboardAssistantModule('Abre settings del workspace')).toBe('settings');
        expect(inferDashboardAssistantModule('Revisa design tokens')).toBe('designSystem');
        expect(inferDashboardAssistantModule('Solo dime que puedes hacer')).toBe(null);
    });

    it('builds a typed dashboard payload for the assistant drawer', () => {
        const metadata = buildDashboardAssistantEntryMetadata({
            entryPoint: 'dashboard_input',
            projectCount: 3,
            routingReason: 'dashboard_request_routes_to_global_operating_layer',
            activeModule: 'ecommerce',
            activeProjectId: 'project-1',
            activeProjectName: 'Casa Luna',
            activeTenantId: 'tenant-1',
            activeTenantName: 'Workspace One',
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
                sourceComponent: 'DashboardWelcome',
                assistantLayer: 'global_operating_layer',
                commandCenter: true,
                memoryScopeHint: 'user_tenant_project_module_session_task',
                projectCount: 3,
                hasProjects: true,
                requestedMode: 'user',
                activeModule: 'ecommerce',
                activeProjectId: 'project-1',
                activeProjectName: 'Casa Luna',
                activeTenantId: 'tenant-1',
                activeTenantName: 'Workspace One',
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

        const ownerWithoutActiveProject = getDashboardAssistantQuickActions({
            hasProjects: true,
            hasActiveProject: false,
            canUseAdminMode: true,
        });
        expect(ownerWithoutActiveProject.map(action => action.id)).toEqual([
            'create_website',
            'open_business_blueprint',
            'open_website_builder',
            'open_storefront_builder',
            'generate_hero_image',
            'create_video',
            'review_leads',
            'create_email',
            'open_ecommerce',
            'open_finance',
            'open_restaurants',
            'open_realty',
            'train_chatcore',
            'create_appointment',
            'improve_bio_page',
            'analyze_project',
            'review_platform_errors',
        ]);

        const ownerActions = getDashboardAssistantQuickActions({
            hasProjects: true,
            hasActiveProject: true,
            canUseAdminMode: true,
        });

        expect(ownerActions.map(action => action.id)).toEqual([
            'create_website',
            'open_business_blueprint',
            'open_website_builder',
            'open_storefront_builder',
            'generate_hero_image',
            'create_video',
            'review_leads',
            'create_email',
            'open_ecommerce',
            'open_finance',
            'open_restaurants',
            'open_realty',
            'train_chatcore',
            'create_appointment',
            'improve_bio_page',
            'analyze_project',
            'review_platform_errors',
        ]);
        expect(ownerActions.map(action => action.module)).toEqual(expect.arrayContaining([
            'aiStudio',
            'businessBlueprint',
            'website',
            'storefront',
            'media',
            'crm',
            'emailMarketing',
            'ecommerce',
            'finance',
            'restaurants',
            'realEstate',
            'chatbot',
            'appointments',
            'bioPage',
            'analytics',
            'admin',
        ]));
        expect(ownerActions.every(action => action.promptKey.startsWith('dashboard.assistantQuickActions.'))).toBe(true);
        expect(ownerActions.find(action => action.id === 'create_video')).toMatchObject({
            module: 'media',
            requiresProject: true,
        });
        expect(ownerActions.find(action => action.id === 'open_business_blueprint')).toMatchObject({
            module: 'businessBlueprint',
            requiresProject: true,
        });
        expect(ownerActions.find(action => action.id === 'open_website_builder')).toMatchObject({
            module: 'website',
            requiresProject: true,
        });
        expect(ownerActions.find(action => action.id === 'open_storefront_builder')).toMatchObject({
            module: 'storefront',
            requiresProject: true,
        });
        expect(ownerActions.find(action => action.id === 'open_finance')).toMatchObject({
            module: 'finance',
            requiresProject: true,
        });
        expect(ownerActions.find(action => action.id === 'open_restaurants')).toMatchObject({
            module: 'restaurants',
            requiresProject: true,
        });
        expect(ownerActions.find(action => action.id === 'open_realty')).toMatchObject({
            module: 'realEstate',
            requiresProject: true,
        });
        expect(ownerActions.find(action => action.id === 'train_chatcore')).toMatchObject({
            module: 'chatbot',
            requiresProject: true,
        });
        expect(ownerActions.find(action => action.id === 'create_appointment')).toMatchObject({
            module: 'appointments',
            requiresProject: true,
        });
        expect(ownerActions.find(action => action.id === 'improve_bio_page')).toMatchObject({
            module: 'bioPage',
            requiresProject: true,
        });
        expect(ownerActions.find(action => action.id === 'analyze_project')).toMatchObject({
            module: 'analytics',
            requiresProject: true,
        });
        expect(ownerActions.find(action => action.id === 'review_platform_errors')).toMatchObject({
            module: 'admin',
            adminOnly: true,
        });
        expect(ownerActions.map(action => action.labelFallback)).toEqual([
            'AI Studio',
            'BusinessBlueprint',
            'Website Builder',
            'Storefront',
            'Images',
            'Videos',
            'Leads',
            'Email',
            'Ecommerce',
            'Finance',
            'Restaurants',
            'Realty',
            'ChatCore',
            'Appointments',
            'Bio Page',
            'Analytics',
            'Owner Mode',
        ]);
    });

    it('keeps dashboard quick action labels and prompts translated in English and Spanish', () => {
        const en = JSON.parse(readFileSync(resolve(process.cwd(), 'locales/en/translation.json'), 'utf8')) as Record<string, unknown>;
        const es = JSON.parse(readFileSync(resolve(process.cwd(), 'locales/es/translation.json'), 'utf8')) as Record<string, unknown>;
        const actions = getDashboardAssistantQuickActions({
            hasProjects: true,
            canUseAdminMode: true,
            limit: 24,
        });

        for (const action of actions) {
            for (const key of [action.labelKey, action.promptKey]) {
                expect(getTranslation(en, key), `Missing English translation for ${key}`).toEqual(expect.any(String));
                expect(getTranslation(es, key), `Missing Spanish translation for ${key}`).toEqual(expect.any(String));
            }
        }

        for (const key of [
            'dashboard.aiPromptPlaceholder',
            'dashboard.aiModePromptPlaceholder',
            'dashboard.aiModeSelected',
            'dashboard.assistantInputLabel',
            'dashboard.sendAssistantRequest',
            'superadmin.globalAssistant.drawer.preparing',
            'superadmin.globalAssistant.drawer.thinking',
        ]) {
            expect(getTranslation(en, key), `Missing English translation for ${key}`).toEqual(expect.any(String));
            expect(getTranslation(es, key), `Missing Spanish translation for ${key}`).toEqual(expect.any(String));
        }

        expect(getTranslation(es, 'dashboard.aiModeSelected')).toBe('{{mode}}');
        expect(getTranslation(en, 'dashboard.aiModeSelected')).toBe('{{mode}}');
        expect(getTranslation(es, 'dashboard.sendAssistantRequest')).toBe('Enviar');
        expect(getTranslation(es, 'superadmin.globalAssistant.systemPrompt.placeholder')).not.toContain('CONTROL TOTAL');
        expect(getTranslation(en, 'superadmin.globalAssistant.systemPrompt.placeholder')).not.toContain('FULL CONTROL');
    });

    it('keeps Global Assistant language defaults limited to English and Spanish', () => {
        const settingsSource = readFileSync(resolve(process.cwd(), 'components/dashboard/admin/GlobalAssistantSettings.tsx'), 'utf8');
        const adminContextSource = readFileSync(resolve(process.cwd(), 'contexts/admin/AdminContext.tsx'), 'utf8');

        expect(settingsSource).toContain("supportedLanguages: globalAssistantConfig.supportedLanguages || 'English, Spanish'");
        expect(adminContextSource).toContain("supportedLanguages: 'English, Spanish'");
        expect(settingsSource).not.toContain('English, Spanish, French');
        expect(adminContextSource).not.toContain('English, Spanish, French');
    });

    it('uses dashboard quick actions as icon mode selectors instead of immediate submit buttons', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/dashboard/DashboardWelcome.tsx'), 'utf8');

        expect(source).toContain('selectedQuickActionId');
        expect(source).toContain('hoveredQuickActionId');
        expect(source).toContain('visibleModeAction');
        expect(source).toContain('aria-pressed={isSelected}');
        expect(source).toContain('onMouseEnter={() => setHoveredQuickActionId(action.id)}');
        expect(source).toContain('setSelectedQuickActionId(current => current === action.id ? null : action.id)');
        expect(source).toContain('const request = rawRequest;');
        expect(source).toContain('quickAction: selectedQuickAction');
        expect(source).toContain('activeModule: selectedQuickAction?.module || route.activeModule');
        expect(source).toContain("title={t('dashboard.sendAssistantRequest', 'Enviar')}");
        expect(source).toContain("t('dashboard.assistantInputLabel', 'Escribe tu solicitud')");
        expect(source).not.toContain('<span className="truncate">{t(action.labelKey, action.labelFallback)}</span>');
        expect(source).not.toContain('const request = t(action.promptKey, action.promptFallback);');
        expect(source).not.toContain('`${selectedLabel}: ${rawRequest}`');
        expect(source).not.toContain('storeMediaGeneratorLaunchRequest');
        expect(source).toContain('dispatchGlobalAssistantEntryRequest(createGlobalAssistantEntryPayload(request');
    });

    it('opens clear module destinations directly instead of hallucinating chat-side work', () => {
        const assistantSource = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');
        const guideSource = readFileSync(resolve(process.cwd(), 'services/globalAssistant/globalAssistantModuleGuide.ts'), 'utf8');
        const aiStudioSource = readFileSync(resolve(process.cwd(), 'components/onboarding/AIWebsiteStudio.tsx'), 'utf8');
        const imagePanelSource = readFileSync(resolve(process.cwd(), 'components/ui/ImageGeneratorPanel.tsx'), 'utf8');
        const videoPanelSource = readFileSync(resolve(process.cwd(), 'components/media-generator/VideoGenerationSection.tsx'), 'utf8');
        const mediaPanelSource = readFileSync(resolve(process.cwd(), 'components/media-generator/MediaGeneratorPanel.tsx'), 'utf8');

        expect(assistantSource).toContain('maybeHandleDirectModuleNavigation');
        expect(assistantSource).toContain('const maybeHandleDirectModuleNavigation = async');
        expect(assistantSource).toContain('await maybeHandleDirectModuleNavigation(userMsg, operatingLayerEntry)');
        expect(assistantSource).toContain('resolveDirectModuleGuideDecision');
        expect(assistantSource).toContain('resolveProjectMentionFromRequest');
        expect(assistantSource).toContain('loadProjectRef.current(resolution.projectId, false, false)');
        expect(assistantSource).toContain("target: 'project_resolution'");
        expect(assistantSource).toContain('appendProjectGuideContext(decision.message, navigationProject.projectName)');
        expect(assistantSource).toContain('syncAssistantConversationNavigation(directModuleNavigation, operatingLayerEntry)');
        expect(assistantSource).toContain('lastNavigationTarget: navigation.target');
        expect(assistantSource).toContain('lastNavigationProjectId: nextProjectId || null');
        expect(assistantSource).toContain('activeTaskId: null');
        expect(assistantSource).toContain("media: { view: 'assets', route: ROUTES.ASSETS }");
        expect(assistantSource).toContain('resolveComponentHelpGuideResponse');
        expect(assistantSource).toContain('openAIStudioFromAssistant');
        expect(assistantSource).toContain('setIsOnboardingOpen(true)');
        expect(assistantSource).toContain("designSystem: { view: 'superadmin', route: ROUTES.ADMIN_DESIGN_TOKENS, adminView: 'design-tokens' }");
        expect(assistantSource).toContain("storefront: { view: 'ecommerce', route: ROUTES.ECOMMERCE }");
        expect(assistantSource).toContain("projects: { view: 'websites', route: ROUTES.WEBSITES }");
        expect(assistantSource).toContain("settings: { view: 'settings', route: ROUTES.SETTINGS }");
        expect(assistantSource).toContain("source: 'direct_module_navigation'");
        expect(guideSource).toContain('Abrí AI Studio. Dejé tu idea en el campo.');
        expect(aiStudioSource).toContain('studio.setInput(initialPrompt)');
        expect(aiStudioSource).not.toContain('studio.sendMessage(initialPrompt)');
        expect(guideSource).toContain('Abrí Imágenes y dejé el prompt escrito.');
        expect(guideSource).toContain('Abrí Videos y dejé el prompt escrito.');
        expect(guideSource).toContain('isComponentHelpQuestion');
        expect(assistantSource).toContain('formatComponentHelpResponse');
        expect(assistantSource).toContain("source: 'component_help'");
        expect(guideSource).toContain('Imágenes sirve para preparar prompts');
        expect(guideSource).toContain('Yo dejo todo listo; tú presionas Generar.');
        expect(assistantSource).toContain('autoStart: false');
        expect(assistantSource).not.toContain('guided_handoff_offer');
        expect(assistantSource).not.toContain('¿Quieres que te lleve');
        expect(imagePanelSource).toContain('setPrompt(request.prompt)');
        expect(imagePanelSource).toContain('if (request.autoStart)');
        expect(videoPanelSource).toContain("consumeMediaGeneratorLaunchRequest('video', projectId)");
        expect(videoPanelSource).toContain('setPrompt(request.prompt)');
        expect(mediaPanelSource).toContain('peekMediaGeneratorLaunchRequest(projectId)');
    });

    it('keeps the Global Assistant page-aware and guide-only in its system instruction', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('Always use the current route, view, visible screen, active project, and recent conversation as context.');
        expect(source).toContain('Answer in the same language the user is using.');
        expect(source).toContain('Never reveal internal reasoning');
        expect(source).toContain('Act as a guide first');
        expect(source).toContain('If the user clearly names a module or task destination, open that module first');
        expect(source).toContain('For image or video requests from the global input, open Media AI');
        expect(source).toContain('Route: ${path}.');
        expect(source).toContain("t('superadmin.globalAssistant.drawer.preparing', 'Preparando...')");
        expect(source).not.toContain('Ejecutando acciones...');
        expect(source).toContain('activeRouteModule: getEntryRouteModule(entry)');
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
        expect(source).toContain('assistantConversationIdRef.current = conversation.id');
        expect(source).toContain("source: 'guide_only_operating_layer_fallback'");
        expect(source).not.toContain("source: 'operating_layer_plan'");
        expect(source).not.toContain("source: 'operating_layer_navigation'");
        expect(source).not.toContain("source: 'operating_layer_apply'");
        expect(source).toContain('clearAssistantConversation');
        expect(source).toContain('activeTaskId: conversation.activeTaskId === taskId ? null : conversation.activeTaskId');
        expect(source).toContain('guideOnly: true');
    });

    it('routes manual Global Assistant drawer messages through guide-only command center behavior by default', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('buildManualOperatingLayerEntry');
        expect(source).toContain("source: 'global_assistant'");
        expect(source).toContain("entryPoint: 'global_assistant_input'");
        expect(source).toContain('inferGlobalAssistantEntryModule(request)');
        expect(source).toContain('resolveModuleFromRoute(path)');
        expect(source).toContain("routeModule && routeModule !== 'project' ? routeModule : null");
        expect(source).toContain('routeModule,');
        expect(source).toContain('const operatingLayerEntry = entry || buildManualOperatingLayerEntry(userMsg)');
        expect(source).toContain("entry.source === 'global_assistant'");
        expect(source).toContain('resolveGuideOnlyFallbackResponse');
        expect(source).toContain("source: 'guide_only_operating_layer_fallback'");
        expect(source).not.toContain('globalAssistantRuntime.planRequest');
        expect(source).not.toContain('globalAssistantRuntime.applyTask');
    });

    it('exposes only navigation tools to the global assistant and blocks mutable legacy tools', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('GLOBAL_ASSISTANT_GUIDE_ONLY_TOOLS');
        expect(source).toContain('const isGuideOnlyToolName');
        expect(source).toContain("GUIDE_ONLY_TOOL_NAMES.has(toolName) || toolName.startsWith('open_')");
        expect(source).toContain('if (!isGuideOnlyToolName(name))');
        expect(source).toContain('Guide-only block: ${name}');
        expect(source).toContain('? GLOBAL_ASSISTANT_GUIDE_ONLY_TOOLS');
        expect(source).toContain(': GLOBAL_ASSISTANT_GUIDE_ONLY_TOOLS.filter(tool =>');
        expect(source).toContain('No hice cambios. Te llevé o te puedo llevar al módulo correcto');
        expect(source).toContain('I did not make changes. I took you, or can take you, to the right module');
        expect(source).not.toContain('? TOOLS\n                    : TOOLS.filter(tool =>');
    });

    it('stops ambiguous global edit requests before planning or executing actions', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('resolveGuideOnlyActionResponse');
        expect(source).toContain("source: 'guide_only_action_request'");
        expect(source.indexOf('const guideOnlyActionResponse = resolveGuideOnlyActionResponse')).toBeGreaterThan(-1);
        expect(source.indexOf('const guideOnlyFallback = resolveGuideOnlyFallbackResponse')).toBeGreaterThan(-1);
        expect(source.indexOf('const guideOnlyActionResponse = resolveGuideOnlyActionResponse'))
            .toBeLessThan(source.indexOf('const guideOnlyFallback = resolveGuideOnlyFallbackResponse'));
    });

    it('keeps Global Assistant confirmations guide-only instead of applying pending plans', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain("source: 'guide_only_confirmation_blocked'");
        expect(source).toContain('No hice cambios. Te puedo llevar al módulo correcto');
        expect(source).not.toContain('globalAssistantRuntime.confirmPlan({');
        expect(source).toContain('setPendingOperatingLayerTask(null);');
        expect(source).not.toContain('globalAssistantRuntime.planRequest');
        expect(source).not.toContain('globalAssistantRuntime.applyTask');
        expect(source.indexOf("source: 'guide_only_confirmation_blocked'")).toBeLessThan(
            source.indexOf('const guideOnlyFallback = resolveGuideOnlyFallbackResponse'),
        );
    });

    it('does not fall through to legacy fast-path execution for operating-layer entries', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        const planBranchIndex = source.indexOf('if (shouldRouteEntryToOperatingLayer(operatingLayerEntry))');
        const legacyFastPathIndex = source.indexOf('// STEP 1: Fast-path tool inference from user text');
        const stopBeforeFastPathIndex = source.indexOf('setIsThinking(false);\n                    return;', planBranchIndex);

        expect(planBranchIndex).toBeGreaterThan(-1);
        expect(legacyFastPathIndex).toBeGreaterThan(planBranchIndex);
        expect(stopBeforeFastPathIndex).toBeGreaterThan(planBranchIndex);
        expect(stopBeforeFastPathIndex).toBeLessThan(legacyFastPathIndex);
    });

    it('preserves guide-only line breaks in the assistant drawer renderer', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('resolveGuideOnlyFallbackResponse');
        expect(source).toContain('whitespace-pre-wrap break-words');
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
        expect(source).toContain('assistantPermissions: access.userPermissions');
    });
});
