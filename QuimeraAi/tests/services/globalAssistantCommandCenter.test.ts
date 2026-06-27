import { describe, expect, it } from 'vitest';
import type { GlobalAssistantRuntimeResult } from '../../services/globalAssistant/globalAssistantRuntime.ts';
import { buildGlobalAssistantChatSurfaceMap } from '../../services/globalAssistant/globalAssistantChatSurfaceRegistry.ts';
import {
    buildGlobalAssistantPlanMemoryMetadata,
    defaultGlobalAssistantFeatureFlags,
    formatGlobalAssistantPlanMessage,
    formatOperatingLayerApplyMessage,
    listEnabledPlatformServices,
    resolveGlobalAssistantAppContext,
    resolveOperatingLayerAccessContext,
    resolveOperatingLayerTenantContext,
    shouldAutoApplyOperatingLayerPlan,
    shouldContinueAfterRuntimePlan,
} from '../../services/globalAssistant/globalAssistantCommandCenter.ts';

describe('globalAssistantCommandCenter', () => {
    it('derives enabled platform services and default feature flags for the operating layer', () => {
        expect(listEnabledPlatformServices(serviceId => ['chatbot', 'finance'].includes(serviceId))).toEqual([
            'chatbot',
            'finance',
        ]);

        expect(defaultGlobalAssistantFeatureFlags()).toEqual(expect.arrayContaining([
            'websiteBuilder',
            'emailMarketing',
            'ecommerceEnabled',
            'chatbotEnabled',
            'realEstateModule',
        ]));
    });

    it('resolves an app context snapshot with active project and available project metadata', () => {
        const context = resolveGlobalAssistantAppContext({
            conversationId: 'asst_conversation_1',
            userId: 'user-1',
            email: 'owner@example.com',
            role: 'owner',
            tenantId: 'tenant-1',
            tenantName: 'Quimera Workspace',
            tenantRole: 'owner',
            tenantPlan: 'enterprise',
            activeServices: ['chatbot', 'finance'],
            featureFlags: defaultGlobalAssistantFeatureFlags(),
            activeProject: {
                id: 'project-1',
                name: { es: 'Tienda Demo', en: 'Demo Store' },
                status: 'Draft',
                tenantId: 'tenant-1',
                userId: 'user-1',
            } as any,
            availableProjects: [
                { id: 'project-1', name: 'Tienda Demo', status: 'Draft' },
            ] as any,
            activeRoute: '/dashboard',
            activeModule: 'ecommerce',
            activeEntityType: 'ecommerce_product',
            activeEntityId: 'product-1',
            currentSurface: 'dashboard',
            locale: 'es',
            view: 'home',
        });

        expect(context.actor).toMatchObject({
            userId: 'user-1',
            tenantId: 'tenant-1',
            mode: 'owner',
        });
        expect(context.conversationId).toBe('asst_conversation_1');
        expect(context.tenant.activeServices).toEqual(['chatbot', 'finance']);
        expect(context.project).toMatchObject({
            projectId: 'project-1',
            projectName: 'Tienda Demo',
        });
        expect(context).toMatchObject({
            activeModule: 'ecommerce',
            activeEntityType: 'ecommerce_product',
            activeEntityId: 'product-1',
        });
        expect(context.snapshot.availableProjects).toEqual([
            { id: 'project-1', name: 'Tienda Demo', status: 'Draft' },
        ]);
        expect((context.snapshot.toolCatalog as any).modules).toEqual(expect.arrayContaining([
            expect.objectContaining({
                module: 'finance',
                executableActionTypes: expect.arrayContaining(['create_finance_record']),
            }),
        ]));
        expect((context.snapshot.toolCatalog as any).modules).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ module: 'ecommerce' }),
        ]));
        expect((context.snapshot.toolCatalog as any).actions.some((action: any) => action.blockedBy?.length > 0)).toBe(false);
        expect(context.snapshot.assistantSurfaces).toMatchObject({
            currentSurfaceId: 'global-operating-layer',
            globalActionSurfaceId: 'global-operating-layer',
        });
        expect((context.snapshot.assistantSurfaces as any).surfaces).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: 'global-operating-layer',
                canGuideGlobalActions: true,
                canExecuteGlobalActions: false,
                canMutateProjectData: false,
                executionBoundary: 'guide_and_navigate',
                memoryScope: 'global_assistant_memory',
            }),
            expect.objectContaining({
                id: 'project-chatcore',
                canGuideGlobalActions: false,
                canExecuteGlobalActions: false,
                memoryScope: 'project_chat_config',
            }),
        ]));
    });

    it('does not expose service-gated tools when active service context is missing', () => {
        const context = resolveGlobalAssistantAppContext({
            conversationId: 'asst_conversation_missing_services',
            userId: 'user-1',
            role: 'owner',
            tenantId: 'tenant-1',
            tenantRole: 'owner',
            tenantPlan: 'enterprise',
            featureFlags: defaultGlobalAssistantFeatureFlags(),
            activeProject: {
                id: 'project-1',
                name: 'Demo Store',
                status: 'Draft',
                tenantId: 'tenant-1',
                userId: 'user-1',
            } as any,
            activeRoute: '/dashboard',
            currentSurface: 'dashboard',
        });
        const catalog = context.snapshot.toolCatalog as any;

        expect(catalog.actions.some((action: any) => action.actionType === 'generate_image')).toBe(false);
        expect(catalog.actions.some((action: any) => action.actionType === 'create_product')).toBe(false);
        expect(catalog.actions.some((action: any) => action.actionType === 'search_leads')).toBe(false);
        expect(catalog.modules).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ module: 'media' }),
            expect.objectContaining({ module: 'ecommerce' }),
            expect.objectContaining({ module: 'crm' }),
        ]));
        expect(catalog.actions).toEqual(expect.arrayContaining([
            expect.objectContaining({ actionType: 'open_project' }),
            expect.objectContaining({ actionType: 'search_projects' }),
        ]));
    });

    it('maps chat surfaces without mixing ChatCore, Studio, and the Operating Layer', () => {
        const dashboardMap = buildGlobalAssistantChatSurfaceMap({
            currentSurface: 'dashboard',
            activeRoute: '/dashboard',
            generatedAt: '2026-06-26T00:00:00.000Z',
        });
        const chatCoreMap = buildGlobalAssistantChatSurfaceMap({
            currentSurface: 'chatcore',
            activeRoute: '/ai-assistant',
            generatedAt: '2026-06-26T00:00:00.000Z',
        });
        const globalDrawerOverChatCoreMap = buildGlobalAssistantChatSurfaceMap({
            currentSurface: 'app',
            activeRoute: '/ai-assistant',
            generatedAt: '2026-06-26T00:00:00.000Z',
        });
        const commandPaletteOverEcommerceMap = buildGlobalAssistantChatSurfaceMap({
            currentSurface: 'command palette',
            activeRoute: '/ecommerce',
            generatedAt: '2026-06-26T00:00:00.000Z',
        });
        const adminDrawerMap = buildGlobalAssistantChatSurfaceMap({
            currentSurface: 'admin',
            activeRoute: '/admin/service-availability',
            generatedAt: '2026-06-26T00:00:00.000Z',
        });
        const studioMap = buildGlobalAssistantChatSurfaceMap({
            currentSurface: 'website studio',
            activeRoute: '/ai-studio',
            generatedAt: '2026-06-26T00:00:00.000Z',
        });

        expect(dashboardMap.currentSurfaceId).toBe('global-operating-layer');
        expect(chatCoreMap.currentSurfaceId).toBe('project-chatcore');
        expect(globalDrawerOverChatCoreMap.currentSurfaceId).toBe('global-operating-layer');
        expect(commandPaletteOverEcommerceMap.currentSurfaceId).toBe('global-operating-layer');
        expect(adminDrawerMap.currentSurfaceId).toBe('global-operating-layer');
        expect(studioMap.currentSurfaceId).toBe('ai-website-studio');
        expect(dashboardMap.surfaces.find(surface => surface.id === 'global-operating-layer')).toMatchObject({
            canGuideGlobalActions: true,
            canExecuteGlobalActions: false,
            canMutateProjectData: false,
            executionBoundary: 'guide_and_navigate',
            memoryScope: 'global_assistant_memory',
        });
        expect(dashboardMap.surfaces.find(surface => surface.id === 'project-chatcore')).toMatchObject({
            canGuideGlobalActions: false,
            canExecuteGlobalActions: false,
            memoryScope: 'project_chat_config',
            module: 'chatbot',
        });
        expect(dashboardMap.guardrails).toEqual(expect.arrayContaining([
            expect.stringContaining('does not apply project or tenant changes'),
            expect.stringContaining('Project ChatCore'),
        ]));
    });

    it('resolves tenant/workspace context without mixing mismatched project tenants', () => {
        expect(resolveOperatingLayerTenantContext({
            activeProject: null,
            currentTenant: {
                id: 'tenant-dashboard',
                name: 'Dashboard Workspace',
                subscriptionPlan: 'agency_pro',
            },
            currentMembership: { role: 'agency_owner' },
            userDocument: { tenantId: 'tenant-legacy', tenantRole: 'client' },
        })).toEqual({
            tenantId: 'tenant-dashboard',
            tenantName: 'Dashboard Workspace',
            tenantRole: 'agency_owner',
            tenantPlan: 'agency_pro',
        });

        expect(resolveOperatingLayerTenantContext({
            activeProject: { tenantId: 'tenant-project' },
            currentTenant: {
                id: 'tenant-dashboard',
                name: 'Dashboard Workspace',
                subscriptionPlan: 'agency_pro',
            },
            currentMembership: { role: 'agency_owner' },
            userDocument: { tenantId: 'tenant-legacy', tenantRole: 'client' },
        })).toEqual({
            tenantId: 'tenant-project',
            tenantName: null,
            tenantRole: 'client',
            tenantPlan: null,
        });

        expect(resolveOperatingLayerTenantContext({
            activeProject: null,
            currentTenant: null,
            currentMembership: null,
            userDocument: { tenantId: 'tenant-legacy', tenantRole: 'client' },
        })).toEqual({
            tenantId: 'tenant-legacy',
            tenantName: null,
            tenantRole: 'client',
            tenantPlan: null,
        });
    });

    it('derives Operating Layer mode and action permissions from tenant membership', () => {
        const ownerAccess = resolveOperatingLayerAccessContext({
            userRole: 'member',
            tenantRole: 'agency_owner',
            tenantPermissions: {
                canManageProjects: true,
                canManageBilling: true,
                canManageSettings: true,
            },
        });

        expect(ownerAccess.mode).toBe('owner');
        expect(ownerAccess.userPermissions).toEqual(expect.arrayContaining([
            'assistant:admin:use',
            'assistant:admin:write',
            'assistant:admin:billing',
            'assistant:ecommerce:use',
            'assistant:website:use',
        ]));

        const context = resolveGlobalAssistantAppContext({
            userId: 'user-1',
            role: 'member',
            mode: ownerAccess.mode,
            tenantId: 'tenant-1',
            tenantRole: 'agency_owner',
            currentSurface: 'dashboard',
        });

        expect(context.actor).toMatchObject({
            mode: 'owner',
            isOwner: true,
        });
        expect(context.admin.enabled).toBe(true);

        const memberAccess = resolveOperatingLayerAccessContext({
            userRole: 'member',
            tenantRole: 'agency_member',
            tenantPermissions: {
                canManageProjects: true,
                canManageLeads: true,
                canManageEcommerce: false,
                canViewAnalytics: true,
                canManageBilling: false,
                canManageSettings: false,
            },
        });

        expect(memberAccess.mode).toBe('user');
        expect(memberAccess.userPermissions).toEqual(expect.arrayContaining([
            'assistant:project:use',
            'assistant:website:use',
            'assistant:crm:use',
            'assistant:emailMarketing:use',
            'assistant:appointments:use',
            'assistant:agency:use',
            'assistant:agency:projects',
            'assistant:agency:reports',
        ]));
        expect(memberAccess.userPermissions).not.toContain('assistant:ecommerce:use');
        expect(memberAccess.userPermissions).not.toContain('assistant:admin:write');
        expect(memberAccess.userPermissions).not.toContain('assistant:finance:use');

        const adminAccess = resolveOperatingLayerAccessContext({
            userRole: 'member',
            tenantRole: 'agency_admin',
            tenantPermissions: {
                canManageProjects: true,
                canManageLeads: true,
                canManageEcommerce: true,
                canViewAnalytics: true,
                canManageBilling: true,
                canManageSettings: true,
            },
        });

        expect(adminAccess.userPermissions).toEqual(expect.arrayContaining([
            'assistant:agency:use',
            'assistant:agency:projects',
            'assistant:agency:reports',
            'assistant:agency:billing',
            'assistant:agency:settings',
            'assistant:finance:use',
            'assistant:settings:use',
        ]));

        const clientAccess = resolveOperatingLayerAccessContext({
            userRole: 'member',
            tenantRole: 'client',
            tenantPermissions: {
                canManageProjects: true,
                canManageLeads: true,
                canManageEcommerce: true,
                canViewAnalytics: true,
            },
        });

        expect(clientAccess.userPermissions).not.toContain('assistant:agency:use');
        expect(clientAccess.userPermissions).not.toContain('assistant:agency:projects');
    });

    it('formats runtime plans as user-facing previews without internal reasoning fields', () => {
        const result = {
            modelId: 'anthropic/claude-opus-4.7',
            memoryUsed: [{ id: 'memory-1' }],
            context: {
                project: { projectId: 'project-1', projectName: 'Tienda Demo' },
            },
            task: { id: 'task-1' },
            plan: {
                status: 'preview',
                safetyLevel: 'high',
                requiresConfirmation: true,
                blockers: [],
                approvals: [{ id: 'approval-1' }],
                previews: [{
                    actionId: 'action-1',
                    module: 'chatbot',
                    actionType: 'sync_chatbot_knowledge',
                }],
                intent: { module: 'chatbot', intent: 'edit' },
                actions: [
                    {
                        module: 'chatbot',
                        actionType: 'sync_chatbot_knowledge',
                    },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult;

        const spanish = formatGlobalAssistantPlanMessage(result, 'es');
        expect(spanish).toContain('Para entrenar ChatCore en Tienda Demo, abre el módulo correcto y revísalo allí.');
        expect(spanish).toContain('Dime qué área quieres usar y te explico los pasos.');
        expect(spanish.split('\n')).toHaveLength(2);
        expect(spanish).not.toContain('Plan del Operating Layer');
        expect(spanish).not.toContain('Modulo:');
        expect(spanish).not.toContain('Intencion:');
        expect(spanish).not.toContain('Tarea:');
        expect(spanish).not.toContain('Memoria usada:');
        expect(spanish).not.toContain('anthropic/claude');
        expect(spanish).not.toContain('Preview');
        expect(spanish).not.toContain('rollback');
        expect(spanish).not.toContain('confirmar');
        expect(spanish).not.toContain('aplicar');

        const english = formatGlobalAssistantPlanMessage(result, 'en');
        expect(english).toContain('To train ChatCore for Tienda Demo, open the right module and review it there.');
        expect(english).toContain('Tell me which area you want to use and I will explain the steps.');
        expect(english.split('\n')).toHaveLength(2);
        expect(english).not.toContain('Operating Layer plan');
        expect(english).not.toContain('Module:');
        expect(english).not.toContain('Intent:');
        expect(english).not.toContain('Task:');
        expect(english).not.toContain('Preview');
        expect(english).not.toContain('rollback');
        expect(english).not.toContain('confirm');
        expect(english).not.toContain('apply');
    });

    it('formats cross-project plans with the resolved target project name', () => {
        const result = {
            modelId: 'anthropic/claude-opus-4.7',
            memoryUsed: [],
            memoryContext: {
                userId: 'user-1',
                tenantId: 'tenant-1',
                projectId: 'project-2',
                mode: 'owner',
                activeModule: 'ecommerce',
                sessionId: 'conversation-1',
                taskId: 'task-1',
                totalCount: 0,
                scopeCounts: {},
                moduleCounts: {},
                memoryIds: [],
                segments: [],
                explanation: [
                    'Loaded 0 memory items for user user-1, tenant tenant-1, project project-2.',
                ],
                guardrails: {
                    tenantIsolation: 'Only memories for tenant tenant-1 or permitted global/system scopes are eligible.',
                    projectIsolation: 'Project/module memories require project project-2.',
                    adminMemoryVisible: true,
                    adminMemoryReason: 'Actor can use Owner/Super Admin memory gates.',
                },
            },
            context: {
                project: { projectId: 'project-1', projectName: 'Casa Luna' },
                snapshot: {
                    availableProjects: [
                        { id: 'project-1', name: 'Casa Luna' },
                        { id: 'project-2', name: 'Ocean Clinic' },
                    ],
                },
            },
            task: { id: 'task-1' },
            plan: {
                status: 'preview',
                safetyLevel: 'medium',
                requiresConfirmation: true,
                blockers: [],
                approvals: [{ id: 'approval-1' }],
                previews: [],
                intent: { module: 'ecommerce', intent: 'open' },
                actions: [
                    {
                        projectId: 'project-2',
                        module: 'project',
                        actionType: 'switch_project',
                    },
                    {
                        projectId: 'project-2',
                        module: 'ecommerce',
                        actionType: 'open_orders',
                    },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult;

        const spanish = formatGlobalAssistantPlanMessage(result, 'es');
        expect(spanish).toContain('Para cambiar al proyecto correcto y abrir la tienda en Ocean Clinic, abre el módulo correcto y revísalo allí.');
        expect(spanish).toContain('Dime qué área quieres usar y te explico los pasos.');
        expect(spanish.split('\n')).toHaveLength(2);
        expect(spanish).not.toContain('Contexto usado:');
        expect(spanish).not.toContain('Guardrails:');
        expect(spanish).not.toContain('confirmar');
        expect(spanish).not.toContain('aplicar');

        const english = formatGlobalAssistantPlanMessage(result, 'en');
        expect(english).toContain('To switch to the right project and open the store for Ocean Clinic, open the right module and review it there.');
        expect(english).toContain('Tell me which area you want to use and I will explain the steps.');
        expect(english.split('\n')).toHaveLength(2);
        expect(english).not.toContain('Context used:');
        expect(english).not.toContain('confirm');
        expect(english).not.toContain('apply');
    });

    it('formats missing-project dashboard quick actions as clear user questions', () => {
        const result = {
            modelId: 'google/gemini-3-pro-image',
            memoryUsed: [],
            context: {
                project: { projectId: null, projectName: null },
                snapshot: {
                    availableProjects: [
                        { id: 'project-1', name: 'Casa Luna' },
                        { id: 'project-2', name: 'Ocean Clinic' },
                    ],
                },
            },
            task: { id: 'task-1' },
            plan: {
                status: 'blocked',
                safetyLevel: 'medium',
                requiresConfirmation: false,
                blockers: ['generate_video: Clarification required: Which project should I use for this request?'],
                approvals: [],
                previews: [],
                intent: { module: 'media', intent: 'generate_video' },
                actions: [
                    {
                        module: 'media',
                        actionType: 'generate_video',
                    },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult;

        const spanish = formatGlobalAssistantPlanMessage(result, 'es');
        expect(spanish).toContain('¿Para qué proyecto?');
        expect(spanish).toContain('Puedo crear un video, pero elige un proyecto.');
        expect(spanish).toContain('Opciones: Casa Luna, Ocean Clinic');
        expect(spanish).toContain('Elige el módulo correcto y confirma allí la acción final.');
        expect(spanish.split('\n')).toHaveLength(4);
        expect(spanish).not.toContain('Estado: blocked');
        expect(spanish).not.toContain('generate_video:');
        expect(spanish).not.toContain('Clarification required');
        expect(spanish).not.toContain('Operating Layer');
    });

    it('builds structured memory metadata for persisted Operating Layer messages', () => {
        const result = {
            memoryUsed: [{ id: 'memory-1' }],
            memoryContext: {
                userId: 'user-1',
                tenantId: 'tenant-1',
                projectId: 'project-2',
                mode: 'owner',
                activeModule: 'ecommerce',
                sessionId: 'conversation-1',
                taskId: 'task-1',
                totalCount: 2,
                memoryIds: ['memory-1', 'memory-2'],
                scopeCounts: { project: 1, module: 1 },
                moduleCounts: { ecommerce: 1 },
                segments: [
                    {
                        scope: 'project',
                        module: null,
                        count: 1,
                        memoryIds: ['memory-1'],
                        titles: ['Project brand profile'],
                        sources: ['test:project_summary'],
                        highestImportance: 0.9,
                    },
                    {
                        scope: 'module',
                        module: 'ecommerce',
                        count: 1,
                        memoryIds: ['memory-2'],
                        titles: ['Ecommerce rules'],
                        sources: ['test:module_summary'],
                        highestImportance: 0.8,
                    },
                ],
                explanation: ['Loaded 2 memory items for user user-1, tenant tenant-1, project project-2.'],
                guardrails: {
                    tenantIsolation: 'Only memories for tenant tenant-1 or permitted global/system scopes are eligible.',
                    projectIsolation: 'Project/module memories require project project-2.',
                    adminMemoryVisible: true,
                    adminMemoryReason: 'Actor can use Owner/Super Admin memory gates.',
                },
                createdAt: '2026-06-26T00:00:00.000Z',
            },
        } as unknown as GlobalAssistantRuntimeResult;

        expect(buildGlobalAssistantPlanMemoryMetadata(result)).toMatchObject({
            tenantId: 'tenant-1',
            projectId: 'project-2',
            activeModule: 'ecommerce',
            totalCount: 2,
            scopeCounts: { project: 1, module: 1 },
            moduleCounts: { ecommerce: 1 },
            memoryIds: ['memory-1', 'memory-2'],
            guardrails: {
                adminMemoryVisible: true,
            },
            segments: [
                {
                    scope: 'project',
                    count: 1,
                    memoryIds: ['memory-1'],
                    titles: ['Project brand profile'],
                },
                {
                    scope: 'module',
                    module: 'ecommerce',
                    count: 1,
                    memoryIds: ['memory-2'],
                    titles: ['Ecommerce rules'],
                },
            ],
        });
    });

    it('keeps preview-first plans guide-only without asking users to confirm in chat', () => {
        const result = {
            modelId: 'google/gemini-3-pro-image',
            memoryUsed: [],
            context: {
                project: { projectId: 'project-1', projectName: 'Tienda Demo' },
            },
            task: { id: 'task-1' },
            plan: {
                status: 'preview',
                safetyLevel: 'medium',
                requiresConfirmation: false,
                blockers: [],
                approvals: [],
                previews: [{
                    actionId: 'action-1',
                    module: 'media',
                    actionType: 'generate_image',
                    diff: { createdLabel: 'Media AI image draft', reviewRequired: true },
                    after: { status: 'draft' },
                }],
                intent: { module: 'media', intent: 'generate_image' },
                actions: [
                    {
                        module: 'media',
                        actionType: 'generate_image',
                    },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult;

        const spanish = formatGlobalAssistantPlanMessage(result, 'es');
        const english = formatGlobalAssistantPlanMessage(result, 'en');

        expect(spanish).toContain('Para generar una imagen en Tienda Demo, abre el módulo correcto y revísalo allí.');
        expect(spanish).not.toContain('Preview:');
        expect(spanish).not.toContain('confirmar');
        expect(spanish).not.toContain('aplicar');
        expect(english).toContain('To generate an image for Tienda Demo, open the right module and review it there.');
        expect(english).not.toContain('Preview:');
        expect(english).not.toContain('confirm');
        expect(english).not.toContain('apply');
    });

    it('only lets low-risk non-mutating plans continue to legacy execution', () => {
        const baseResult = {
            plan: {
                status: 'complete',
                safetyLevel: 'low',
                requiresConfirmation: false,
                actions: [],
            },
        } as unknown as GlobalAssistantRuntimeResult;

        expect(shouldContinueAfterRuntimePlan(baseResult)).toBe(true);
        expect(shouldContinueAfterRuntimePlan({
            ...baseResult,
            plan: {
                ...baseResult.plan,
                status: 'preview',
                requiresConfirmation: true,
                actions: [
                    { metadata: { mutatesData: true } },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult)).toBe(false);
        expect(shouldContinueAfterRuntimePlan({
            ...baseResult,
            plan: {
                ...baseResult.plan,
                status: 'blocked',
            },
        } as unknown as GlobalAssistantRuntimeResult)).toBe(false);
        expect(shouldContinueAfterRuntimePlan({
            ...baseResult,
            plan: {
                ...baseResult.plan,
                actions: [
                    { metadata: { mutatesData: false, executable: true } },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult)).toBe(false);
    });

    it('auto-applies only safe navigation plans', () => {
        const navigationResult = {
            plan: {
                status: 'draft',
                requiresConfirmation: false,
                previews: [],
                actions: [
                    {
                        actionType: 'open_email_hub',
                        metadata: { mutatesData: false },
                    },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult;

        expect(shouldAutoApplyOperatingLayerPlan(navigationResult)).toBe(true);
        expect(shouldAutoApplyOperatingLayerPlan({
            ...navigationResult,
            plan: {
                ...navigationResult.plan,
                actions: [
                    {
                        actionType: 'switch_project',
                        metadata: { mutatesData: false },
                    },
                    {
                        actionType: 'open_orders',
                        metadata: { mutatesData: false },
                    },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult)).toBe(true);
        expect(shouldAutoApplyOperatingLayerPlan({
            ...navigationResult,
            plan: {
                ...navigationResult.plan,
                actions: [
                    {
                        actionType: 'summarize_business_blueprint',
                        metadata: { mutatesData: false, executable: true },
                    },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult)).toBe(false);
        expect(shouldAutoApplyOperatingLayerPlan({
            ...navigationResult,
            plan: {
                ...navigationResult.plan,
                actions: [
                    {
                        actionType: 'summarize_operating_layer_capabilities',
                        metadata: { mutatesData: false, executable: true },
                    },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult)).toBe(false);
        expect(shouldAutoApplyOperatingLayerPlan({
            ...navigationResult,
            plan: {
                ...navigationResult.plan,
                actions: [
                    {
                        actionType: 'summarize_analytics',
                        metadata: { mutatesData: false, executable: true },
                    },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult)).toBe(false);
        expect(shouldAutoApplyOperatingLayerPlan({
            ...navigationResult,
            plan: {
                ...navigationResult.plan,
                requiresConfirmation: true,
            },
        } as unknown as GlobalAssistantRuntimeResult)).toBe(false);
        expect(shouldAutoApplyOperatingLayerPlan({
            ...navigationResult,
            plan: {
                ...navigationResult.plan,
                status: 'preview',
                previews: [{ actionId: 'action-1' }],
                actions: [
                    {
                        actionType: 'export_report',
                        metadata: { mutatesData: false, executable: true },
                    },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult)).toBe(false);
        expect(shouldAutoApplyOperatingLayerPlan({
            ...navigationResult,
            plan: {
                ...navigationResult.plan,
                actions: [
                    {
                        actionType: 'create_email_campaign',
                        metadata: { mutatesData: true },
                    },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult)).toBe(false);
    });

    it('formats auto-applied BusinessBlueprint diagnostics with actionable result details', () => {
        const result = {
            task: { status: 'completed' },
            plan: { blockers: [] },
            actions: [{
                module: 'businessBlueprint',
                actionType: 'summarize_business_blueprint',
                status: 'applied',
                metadata: { rollbackSupported: false },
                afterSnapshot: {
                    kind: 'business_blueprint_summary',
                    projectId: 'project-1',
                    projectName: 'Casa Luna',
                    summary: {
                        businessName: 'Casa Luna',
                        selectedModuleCount: 16,
                        enabledModuleCount: 14,
                        readyModuleCount: 9,
                        reviewModuleCount: 5,
                        blockerCount: 2,
                        warningCount: 3,
                        reviewModules: ['websiteBlueprint', 'chatbotBlueprint'],
                    },
                    recommendations: ['Review AI-generated module drafts before they are exposed publicly or sent to customers.'],
                },
            }],
        } as any;

        const spanish = formatOperatingLayerApplyMessage(result, 'es');
        expect(spanish).toContain('Listo. Ya pude revisar el proyecto.');
        expect(spanish).toContain('Proyecto: Casa Luna');
        expect(spanish).toContain('Listo: 9 de 14 areas activas. Por revisar: 5.');
        expect(spanish.split('\n').length).toBeLessThanOrEqual(4);
        expect(spanish).not.toContain('BusinessBlueprint');
        expect(spanish).not.toContain('Blockers:');

        const english = formatOperatingLayerApplyMessage(result, 'en');
        expect(english).toContain('review the project');
        expect(english).toContain('Project: Casa Luna');
        expect(english).toContain('Ready: 9 of 14 active areas. To review: 5.');
        expect(english.split('\n').length).toBeLessThanOrEqual(4);
    });

    it('formats auto-applied Operating Layer capability diagnostics with tool coverage', () => {
        const result = {
            task: { status: 'completed' },
            plan: { blockers: [] },
            actions: [{
                module: 'project',
                actionType: 'summarize_operating_layer_capabilities',
                status: 'applied',
                metadata: { rollbackSupported: false },
                afterSnapshot: {
                    kind: 'operating_layer_capability_summary',
                    summary: {
                        actionCount: 52,
                        availableActionCount: 45,
                        executableActionCount: 49,
                        previewActionCount: 34,
                        rollbackActionCount: 28,
                        rollbackExecutableActionCount: 24,
                        rollbackGapActionCount: 4,
                        rollbackGapActionTypes: ['create_email_campaign', 'create_product'],
                        confirmationActionCount: 30,
                        highRiskActionCount: 27,
                        unavailableActionCount: 7,
                    },
                    modules: [
                        { module: 'website' },
                        { module: 'ecommerce' },
                        { module: 'chatbot' },
                    ],
                    blockedBy: {
                        services: ['ecommerce'],
                        features: ['ecommerceEnabled'],
                    },
                    assistantSurfaces: {
                        currentSurfaceId: 'global-operating-layer',
                        globalActionSurfaceId: 'global-operating-layer',
                        surfaceCount: 7,
                    },
                    recommendations: ['Enable missing services or feature flags before offering blocked module actions.'],
                },
            }],
        } as any;

        const spanish = formatOperatingLayerApplyMessage(result, 'es');
        expect(spanish).toContain('Listo. Ya pude revisar lo que puedo hacer.');
        expect(spanish).toContain('Puedo ayudarte en 3 areas.');
        expect(spanish).toContain('45 acciones estan disponibles ahora.');
        expect(spanish).toContain('Servicios por activar: ecommerce.');
        expect(spanish.split('\n').length).toBeLessThanOrEqual(4);
        expect(spanish).not.toContain('rollback');
        expect(spanish).not.toContain('feature flag');

        const english = formatOperatingLayerApplyMessage(result, 'en');
        expect(english).toContain('review what I can do');
        expect(english).toContain('I can help in 3 areas.');
        expect(english).toContain('45 actions are available now.');
        expect(english.split('\n').length).toBeLessThanOrEqual(4);
    });

    it('formats auto-applied analytics and lead summaries without losing module evidence', () => {
        const result = {
            task: { status: 'completed' },
            plan: { blockers: [] },
            actions: [
                {
                    module: 'analytics',
                    actionType: 'identify_blockers',
                    status: 'applied',
                    metadata: { rollbackSupported: false },
                    afterSnapshot: {
                        kind: 'blockers',
                        summary: {
                            projectName: 'Casa Luna',
                            totalSignals: 12,
                            blockerCount: 2,
                            warningCount: 1,
                        },
                        analytics: {
                            blockers: ['crm_has_no_leads', 'ecommerce_has_no_orders'],
                        },
                    },
                },
                {
                    module: 'crm',
                    actionType: 'summarize_leads',
                    status: 'applied',
                    metadata: { rollbackSupported: false },
                    afterSnapshot: {
                        kind: 'lead_summary',
                        summary: {
                            totalLeads: 8,
                            openTasks: 3,
                            activityCount: 11,
                            totalValue: 4500,
                        },
                    },
                },
            ],
        } as any;

        const spanish = formatOperatingLayerApplyMessage(result, 'es');
        expect(spanish).toContain('Listo. Ya pude identificar bloqueos y revisar leads.');
        expect(spanish).toContain('Resumen: Casa Luna');
        expect(spanish).toContain('Bloqueos: crm_has_no_leads, ecommerce_has_no_orders.');
        expect(spanish.split('\n').length).toBeLessThanOrEqual(4);
        expect(spanish).not.toContain('CRM/Leads');

        const english = formatOperatingLayerApplyMessage(result, 'en');
        expect(english).toContain('identify blockers and review leads');
        expect(english).toContain('12 signals checked. 2 blockers and 1 warnings.');
        expect(english.split('\n').length).toBeLessThanOrEqual(4);
    });
});
