import { describe, expect, it } from 'vitest';
import type { GlobalAssistantRuntimeResult } from '../../services/globalAssistant/globalAssistantRuntime.ts';
import {
    defaultGlobalAssistantFeatureFlags,
    formatGlobalAssistantPlanMessage,
    listEnabledPlatformServices,
    resolveGlobalAssistantAppContext,
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
            currentSurface: 'dashboard',
            locale: 'es',
            view: 'home',
        });

        expect(context.actor).toMatchObject({
            userId: 'user-1',
            tenantId: 'tenant-1',
            mode: 'owner',
        });
        expect(context.tenant.activeServices).toEqual(['chatbot', 'finance']);
        expect(context.project).toMatchObject({
            projectId: 'project-1',
            projectName: 'Tienda Demo',
        });
        expect(context.snapshot.availableProjects).toEqual([
            { id: 'project-1', name: 'Tienda Demo', status: 'Draft' },
        ]);
    });

    it('formats runtime plans in Spanish and English with safety context', () => {
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
                blockers: ['requires_owner_confirmation'],
                approvals: [{ id: 'approval-1' }],
                previews: [{ actionId: 'action-1' }],
                intent: { module: 'chatbot', intent: 'edit' },
                actions: [
                    {
                        module: 'chatbot',
                        actionType: 'train_chatbot_knowledge',
                    },
                ],
            },
        } as unknown as GlobalAssistantRuntimeResult;

        expect(formatGlobalAssistantPlanMessage(result, 'es')).toContain('Plan del Operating Layer');
        expect(formatGlobalAssistantPlanMessage(result, 'es')).toContain('Confirmaciones requeridas: 1');
        expect(formatGlobalAssistantPlanMessage(result, 'es')).toContain('No voy a aplicar cambios');
        expect(formatGlobalAssistantPlanMessage(result, 'en')).toContain('Operating Layer plan');
        expect(formatGlobalAssistantPlanMessage(result, 'en')).toContain('Confirmations required: 1');
        expect(formatGlobalAssistantPlanMessage(result, 'en')).toContain('I will not apply changes');
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
    });
});
