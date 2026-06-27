import { describe, expect, it, vi } from 'vitest';
import { GlobalAssistantAuditService } from '../../services/globalAssistant/globalAssistantAuditService.ts';
import {
    buildGuideHandoffRuntimeEvent,
    recordGuideHandoffAudit,
} from '../../services/globalAssistant/globalAssistantGuideHandoffAudit.ts';
import { resolveCurrentAssistantContext } from '../../services/globalAssistant/globalAssistantContextResolver.ts';

const context = resolveCurrentAssistantContext({
    conversationId: 'asst_conv_1',
    userId: 'user-1',
    email: 'owner@example.com',
    role: 'owner',
    mode: 'owner',
    tenantId: 'tenant-1',
    tenantName: 'Studio Tenant',
    activeProject: {
        id: 'project-1',
        name: 'Casa Luna',
        status: 'Draft',
        tenantId: 'tenant-1',
        userId: 'user-1',
    },
    activeRoute: '/dashboard',
    activeModule: 'website',
    currentSurface: 'dashboard',
    locale: 'es',
    snapshot: {
        entryPoint: 'dashboard_input',
    },
});

describe('globalAssistantGuideHandoffAudit', () => {
    it('builds an auditable guide handoff event without mutating data', () => {
        const event = buildGuideHandoffRuntimeEvent({
            context,
            target: 'websiteBuilder',
            targetModule: 'website',
            message: 'Website Builder sirve para editar el sitio visualmente.\n1. Elige la página o sección que quieres cambiar.\n2. Usa el panel de controles para texto, imágenes, colores, espaciado y visibilidad.',
            route: '/editor/project-1',
            projectId: 'project-1',
            projectName: 'Casa Luna',
            entrySource: 'dashboard_welcome',
            entryMetadata: { quickActionId: 'open_website_builder' },
        });

        expect(event).toMatchObject({
            type: 'assistant_guide_handoff_opened',
            userId: 'user-1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            taskId: null,
            metadata: expect.objectContaining({
                guideOnly: true,
                blocked: false,
                target: 'websiteBuilder',
                targetModule: 'website',
                route: '/editor/project-1',
                contextSnapshotId: context.id,
                conversationId: 'asst_conv_1',
                entrySource: 'dashboard_welcome',
                entryMetadata: { quickActionId: 'open_website_builder' },
                reason: 'handoff_opened',
            }),
        });
    });

    it('records blocked guide handoffs locally and through persistence', () => {
        const auditService = new GlobalAssistantAuditService();
        const recordEvent = vi.fn();
        const event = recordGuideHandoffAudit({
            context,
            target: 'ownerMode',
            targetModule: 'admin',
            message: 'Owner Mode necesita permiso admin. Usa una cuenta Owner o Super Admin para revisar esa área.',
            blocked: true,
            route: null,
            projectId: null,
            projectName: null,
            reason: 'direct_navigation_blocked',
        }, {
            auditService,
            persistence: { recordEvent },
        });

        expect(event).toMatchObject({
            id: expect.stringMatching(/^asst_evt_/),
            type: 'assistant_guide_handoff_blocked',
            createdAt: expect.any(String),
            metadata: expect.objectContaining({
                guideOnly: true,
                blocked: true,
                target: 'ownerMode',
                reason: 'direct_navigation_blocked',
            }),
        });
        expect(auditService.listEvents()).toEqual([event]);
        expect(recordEvent).toHaveBeenCalledWith(event);
    });
});
