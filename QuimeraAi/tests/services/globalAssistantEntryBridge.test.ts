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
        expect(inferDashboardAssistantModule('¿Dónde configuro la agencia?')).toBe('agency');
        expect(inferDashboardAssistantModule('Open agency white label')).toBe('agency');
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

        expect(buildDashboardAssistantEntryMetadata({
            entryPoint: 'dashboard_input',
            projectCount: 4,
            routingReason: 'dashboard_route_service_unavailable',
            activeModule: null,
            blockedModule: 'emailMarketing',
            blockedServiceId: 'emailMarketing',
        })).toMatchObject({
            route: 'dashboard',
            entryPoint: 'dashboard_input',
            routingReason: 'dashboard_route_service_unavailable',
            blockedModule: 'emailMarketing',
            blockedServiceId: 'emailMarketing',
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
        ]);

        const ownerWithoutActiveProject = getDashboardAssistantQuickActions({
            hasProjects: true,
            hasActiveProject: false,
            canUseAdminMode: true,
        });
        expect(ownerWithoutActiveProject.map(action => action.id)).toEqual([
            'create_website',
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
        ]);

        const ownerActions = getDashboardAssistantQuickActions({
            hasProjects: true,
            hasActiveProject: true,
            canUseAdminMode: true,
        });

        expect(ownerActions.map(action => action.id)).toEqual([
            'create_website',
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
        ]);
        expect(ownerActions.map(action => action.id)).not.toEqual(expect.arrayContaining([
            'open_business_blueprint',
            'analyze_project',
            'review_platform_errors',
        ]));
        expect(ownerActions.map(action => action.module)).toEqual(expect.arrayContaining([
            'aiStudio',
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
        ]));
        expect(ownerActions.every(action => action.promptKey.startsWith('dashboard.assistantQuickActions.'))).toBe(true);
        expect(ownerActions.find(action => action.id === 'create_video')).toMatchObject({
            module: 'media',
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
            serviceId: 'bioPage',
        });

        const filteredByService = getDashboardAssistantQuickActions({
            hasProjects: true,
            hasActiveProject: true,
            canUseAdminMode: true,
            canAccessService: serviceId => serviceId !== 'aiFeatures' && serviceId !== 'ecommerce' && serviceId !== 'bioPage',
        });
        expect(filteredByService.map(action => action.id)).not.toEqual(expect.arrayContaining([
            'create_website',
            'open_storefront_builder',
            'generate_hero_image',
            'create_video',
            'open_ecommerce',
            'improve_bio_page',
        ]));
        expect(filteredByService.map(action => action.id)).toEqual(expect.arrayContaining([
            'open_website_builder',
            'review_leads',
        ]));

        expect(ownerActions.map(action => action.labelFallback)).toEqual([
            'AI Studio',
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
        expect(source).toContain("const entryPoint = selectedQuickAction ? 'dashboard_quick_action' : 'dashboard_input';");
        expect(source).toContain("const entrySource = selectedQuickAction ? 'dashboard_quick_action' : 'dashboard_welcome';");
        expect(source).toContain("const routingReason = selectedQuickAction");
        expect(source).toContain('quickAction: selectedQuickAction');
        expect(source).toContain('const metadataActiveModule = routeServiceAvailable');
        expect(source).toContain('const metadataBlockedModule = routeServiceAvailable ? null : route.activeModule;');
        expect(source).toContain('activeModule: metadataActiveModule');
        expect(source).toContain('blockedModule: metadataBlockedModule');
        expect(source).toContain('blockedServiceId: routeServiceAvailable ? null : routeServiceId');
        expect(source).toContain('source: entrySource');
        expect(source).toContain('entryPoint,');
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
        expect(assistantSource).toContain('isProjectScopedGuideTarget(decision.target)');
        expect(assistantSource).toContain('formatMissingProjectGuideMessage(decision.target, request, i18n.language)');
        expect(assistantSource).toContain("target: 'project_required'");
        expect(assistantSource).toContain('resolveProjectMentionFromRequest');
        expect(assistantSource).toContain('loadProjectRef.current(resolution.projectId, false, false)');
        expect(assistantSource).toContain("target: 'project_resolution'");
        expect(assistantSource).toContain('appendProjectGuideContext(decision.message, navigationProject.projectName)');
        expect(assistantSource).toContain('blocked?: boolean');
        expect(assistantSource).toContain("route.view === 'superadmin'");
        expect(assistantSource).toContain("access.mode !== 'owner' && access.mode !== 'super_admin'");
        expect(assistantSource).toContain('${targetName} necesita permiso admin. Usa una cuenta Owner o Super Admin para revisar esa área.');
        expect(assistantSource).toContain('${targetName} needs admin permission. Use an Owner or Super Admin account to review that area.');
        expect(assistantSource).toContain('if (!directModuleNavigation.blocked)');
        expect(assistantSource).toContain("source: directModuleNavigation.blocked");
        expect(assistantSource).toContain("'direct_module_navigation_blocked'");
        expect(assistantSource).toContain('syncAssistantConversationNavigation(directModuleNavigation, operatingLayerEntry)');
        expect(assistantSource).toContain('lastNavigationTarget: navigation.target');
        expect(assistantSource).toContain('lastNavigationModule: activeModule');
        expect(assistantSource).toContain('lastNavigationProjectId: nextProjectId || null');
        expect(assistantSource).toContain('lastHandoff: {');
        expect(assistantSource).toContain('memoryScope,');
        expect(assistantSource).toContain('sessionId: conversation.id');
        expect(assistantSource).toContain('resolveGuideTargetAssistantModule(directModuleNavigation.target)');
        expect(assistantSource).toContain('resolveGuideTargetAssistantModule(navigation.target)');
        expect(assistantSource).toContain('getEntryBlockedServiceId(entry)');
        expect(assistantSource).toContain('getEntryBlockedModule(entry)');
        expect(assistantSource).toContain("target: target || 'service_unavailable'");
        expect(assistantSource).toContain('activeTaskId: null');
        expect(assistantSource).toContain("media: { view: 'assets', route: ROUTES.ASSETS }");
        expect(assistantSource).toContain("cms: { view: 'cms', route: ROUTES.CMS }");
        expect(assistantSource).toContain("navigation: { view: 'navigation', route: ROUTES.NAVIGATION }");
        expect(assistantSource).toContain("domains: { view: 'domains', route: ROUTES.DOMAINS }");
        expect(assistantSource).toContain("seo: { view: 'seo', route: ROUTES.SEO }");
        expect(assistantSource).toContain("templates: { view: 'templates', route: ROUTES.TEMPLATES }");
        expect(assistantSource).toContain("blogHub: { view: 'blog-hub', route: ROUTES.BLOG_HUB }");
        expect(assistantSource).toContain('openAIStudioFromAssistant');
        expect(assistantSource).toContain('setIsOnboardingOpen(true)');
        expect(assistantSource).toContain("designSystem: { view: 'superadmin', route: ROUTES.ADMIN_DESIGN_TOKENS, adminView: 'design-tokens' }");
        expect(assistantSource).toContain("storefront: { view: 'ecommerce', route: ROUTES.ECOMMERCE }");
        expect(assistantSource).toContain("agency: { view: 'agency', route: ROUTES.AGENCY }");
        expect(assistantSource).toContain("projects: { view: 'websites', route: ROUTES.WEBSITES }");
        expect(assistantSource).toContain("settings: { view: 'settings', route: ROUTES.SETTINGS }");
        expect(assistantSource).toContain("'direct_module_navigation'");
        expect(guideSource).toContain('AI Studio sirve para convertir una idea en un website o contenido inicial.');
        expect(guideSource).toContain('Cuando esté claro, presiona Enviar dentro de AI Studio.');
        expect(aiStudioSource).toContain('studio.setInput(initialPrompt)');
        expect(aiStudioSource).not.toContain('studio.sendMessage(initialPrompt)');
        expect(guideSource).toContain('Imágenes sirve para preparar una imagen antes de generarla.');
        expect(guideSource).toContain('Elige aspect ratio: 1:1 para posts');
        expect(guideSource).toContain('Videos sirve para preparar un video antes de generarlo.');
        expect(guideSource).toContain('CMS sirve para crear y organizar contenido del proyecto.');
        expect(guideSource).toContain('Domains sirve para conectar y revisar dominios.');
        expect(guideSource).toContain('Blog sirve para revisar artículos, categorías e ideas de contenido.');
        expect(guideSource).toContain('isComponentHelpQuestion');
        expect(guideSource).toContain('resolveNamedModuleOpenTarget');
        expect(assistantSource).toContain('buildCurrentQuestionPromptContext');
        expect(assistantSource).toContain('CURRENT QUESTION CONTEXT:');
        expect(assistantSource).not.toContain('formatComponentHelpResponse');
        expect(assistantSource).not.toContain("source: 'component_help'");
        expect(guideSource).toContain('Revisa el preview de opciones y toca Generar cuando todo esté listo.');
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
        expect(source).toContain('You are guide-only from the Global Assistant chat');
        expect(source).toContain('When a user asks how something works, answer with practical step-by-step instructions');
        expect(source).toContain('After routing to a module, do not say "I opened" or "I took you"');
        expect(source).toContain('For image or video requests from the global input, use Media AI context');
        expect(source).toContain('Never say you created, changed, generated, sent, published, or applied something from the Global Assistant chat.');
        expect(source).toContain('Route is internal context only; do not mention it unless the user asks for technical details.');
        expect(source).toContain("t('superadmin.globalAssistant.drawer.preparing', 'Preparando...')");
        expect(source).not.toContain('Ejecutando acciones...');
        expect(source).toContain('buildCurrentQuestionPromptContext');
        expect(source).toContain('Current screen area');
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
        expect(source).toContain('assistantConversationIdRef.current = conversationWithContext.id');
        expect(source).toContain('buildCurrentQuestionPromptContext');
        expect(source).not.toContain("source: 'operating_layer_plan'");
        expect(source).not.toContain("source: 'operating_layer_navigation'");
        expect(source).not.toContain("source: 'operating_layer_apply'");
        expect(source).toContain('clearAssistantConversation');
        expect(source).toContain('activeTaskId: conversation.activeTaskId === taskId ? null : conversation.activeTaskId');
        expect(source).toContain('guideOnly: true');
    });

    it('routes manual Global Assistant drawer messages to the LLM with screen context by default', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('buildManualOperatingLayerEntry');
        expect(source).toContain('buildLiveConversationMetadata');
        expect(source).toContain('const existingConversation = assistantConversationRef.current');
        expect(source).toContain('Failed to sync live assistant context');
        expect(source).toContain('conversationWithContext');
        expect(source).toContain("source: 'global_assistant'");
        expect(source).toContain("entryPoint: 'global_assistant_input'");
        expect(source).toContain('inferGlobalAssistantEntryModule(request)');
        expect(source).toContain('resolveModuleFromRoute(path)');
        expect(source).toContain("routeModule && routeModule !== 'project' ? routeModule : null");
        expect(source).toContain('routeModule,');
        expect(source).toContain('const operatingLayerEntry = entry || buildManualOperatingLayerEntry(userMsg)');
        expect(source).toContain("source: 'global_assistant'");
        expect(source).toContain('buildCurrentQuestionPromptContext');
        expect(source).toContain('CURRENT QUESTION CONTEXT:');
        expect(source).not.toContain('shouldRouteEntryToOperatingLayer(operatingLayerEntry)');
        expect(source).not.toContain("source: 'guide_only_operating_layer_fallback'");
        expect(source).not.toContain('globalAssistantRuntime.planRequest');
        expect(source).not.toContain('globalAssistantRuntime.applyTask');
    });

    it('does not expose executable tools to the global assistant chat fallback', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('const isGuideOnlyToolName');
        expect(source).toContain("GUIDE_ONLY_TOOL_NAMES.has(toolName) || toolName.startsWith('open_')");
        expect(source).toContain('if (!isGuideOnlyToolName(name))');
        expect(source).toContain('Guide-only block: ${name}');
        expect(source).toContain('const restTools: any[] = []');
        expect(source).toContain("source: 'guide_only_tool_call_blocked'");
        expect(source).toContain("source: 'guide_only_text_tool_call_blocked'");
        expect(source).toContain('containsGuideOnlyExecutionClaim');
        expect(source).toContain("source: 'guide_only_execution_claim_blocked'");
        expect(source).toContain('Blocked execution claim in guide-only response');
        expect(source).toContain('Tool calls blocked in guide-only mode');
        expect(source).toContain('Usa el módulo correcto para hacer esa acción.');
        expect(source).toContain('Use the matching module for that action.');
        expect(source).not.toContain('const restTools = [{ functionDeclarations: availableTools }]');
        expect(source).not.toContain('? TOOLS\n                    : TOOLS.filter(tool =>');
    });

    it('keeps the conversational fallback guide-only instead of injecting edit instructions', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('ACTIVE PROJECT CONTEXT (FOR GUIDANCE ONLY)');
        expect(source).toContain('Use this context only to answer what the user is viewing and where they can make changes.');
        expect(source).toContain('Do not execute, generate, create, edit, update, delete, publish, send, or apply changes from the chat.');
        expect(source).toContain('Do not mention internal paths, schemas, tool names, or field keys unless the user explicitly asks for technical details.');
        expect(source).toContain('You are guide-only from the Global Assistant chat: do not create, edit, generate, update, delete, publish, send, apply, or execute work from the chat.');
        expect(source).toContain('Never say you created, changed, generated, sent, published, or applied something from the Global Assistant chat.');
        expect(source).toContain('Keep explanations conversational, friendly, and immediately usable.');
        expect(source).not.toContain("EDITING RULES:\\n1. Use 'update_site_content'");
    });

    it('sends ambiguous global edit requests to the LLM without executable tools', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('const restTools: any[] = []');
        expect(source).toContain('buildCurrentQuestionPromptContext');
        expect(source).not.toContain('resolveGuideOnlyActionResponse');
        expect(source).not.toContain("source: 'guide_only_action_request'");
        expect(source).not.toContain('globalAssistantRuntime.planRequest');
        expect(source).not.toContain('globalAssistantRuntime.applyTask');
    });

    it('keeps Global Assistant confirmations guide-only instead of applying pending plans', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain("source: 'guide_only_confirmation_blocked'");
        expect(source).toContain('Para aplicar cambios, usa el módulo correspondiente y confirma allí la acción final.');
        expect(source).not.toContain('globalAssistantRuntime.confirmPlan({');
        expect(source).toContain('setPendingOperatingLayerTask(null);');
        expect(source).not.toContain('globalAssistantRuntime.planRequest');
        expect(source).not.toContain('globalAssistantRuntime.applyTask');
        expect(source.indexOf("source: 'guide_only_confirmation_blocked'")).toBeLessThan(
            source.indexOf('const guideOnlyFallback = resolveGuideOnlyFallbackResponse'),
        );
    });

    it('removes legacy fast-path execution from the global assistant chat flow', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('const directModuleNavigation = await maybeHandleDirectModuleNavigation(userMsg, operatingLayerEntry)');
        expect(source).toContain('const restTools: any[] = []');
        expect(source).not.toContain('// STEP 1: Fast-path tool inference from user text');
        expect(source).not.toContain('const inferredTool = inferToolCallFromUserText(userMsg)');
        expect(source).not.toContain("await executeTool(inferredTool.name, inferredTool.args, 'chat')");
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
        expect(source).toContain('resolveCurrentAssistantContext');
        expect(source).toContain('buildLiveAssistantContextSnapshot');
        expect(source).toContain('activeModule = typeof message.metadata?.activeModule');
        expect(source).toContain('activeTenantId: tenant.tenantId');
        expect(source).toContain('activeTenantName: tenant.tenantName');
        expect(source).toContain('activeTenantId: tenantContext?.currentTenant?.id || project?.tenantId || null');
        expect(source).toContain('activeProjectName: typeof project?.name ===');
        expect(source).toContain('tenantPlan: tenant.tenantPlan');
        expect(source).toContain('memoryScopeHint:');
        expect(source).toContain('memoryScope,');
        expect(source).toContain('sessionId: conversationId');
        expect(source).toContain('taskId: pendingOperatingLayerTaskRef.current?.taskId || null');
        expect(source).toContain('liveContextAt: new Date().toISOString()');
        expect(source).toContain('guideOnly: true');
        expect(source).toContain('activeTaskId');
        expect(source).toContain('mode: access.mode');
        expect(source).toContain('assistantPermissions: access.userPermissions');
    });

    it('keeps conversational fallback context useful without exposing internal ids', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('CURRENT APP CONTEXT: Active Project:');
        expect(source).toContain('Route is internal context only; do not mention it unless the user asks for technical details.');
        expect(source).toContain('Available Projects:');
        expect(source).toContain('Recent Posts:');
        expect(source).toContain('Recent Leads:');
        expect(source).toContain('Domains:');
        expect(source).not.toContain('(ID:${p.id})');
        expect(source).not.toContain('ID:${l.id}');
        expect(source).not.toContain('(ID:${d.id})');
        expect(source).not.toContain('(ID: ${p.id}');
    });

    it('loads segmented guide-only memory into the conversational fallback', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/ui/GlobalAiAssistant.tsx'), 'utf8');

        expect(source).toContain('GlobalAssistantMemoryService');
        expect(source).toContain('SupabaseGlobalAssistantMemoryAdapter');
        expect(source).toContain('buildGuideOnlyMemoryPromptContext');
        expect(source).toContain('assistantMemoryServiceRef');
        expect(source).toContain('recordContextSnapshot(liveContextSnapshot)');
        expect(source).toContain("source: 'guide_only_error'");
        expect(source).toContain('resolveMemoryContext({');
        expect(source).toContain('context: memoryContext');
        expect(source).toContain('text: userMsg');
        expect(source).toContain('memoryContextLoaded: true');
        expect(source).toContain('memoryScopeCounts: memoryContextResult.manifest.scopeCounts');
        expect(source).toContain('memoryModuleCounts: memoryContextResult.manifest.moduleCounts');
        expect(source).toContain('contextSnapshotId: liveContextSnapshot.id');
        expect(source).toContain('memoryIds: loadedMemoryIds');
        expect(source).toContain("source: 'guide_only_conversation_response'");
    });
});
