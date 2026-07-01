export type AgencyActivityType =
    | 'client_created'
    | 'plan_assigned'
    | 'payment_link_created'
    | 'checkout_started'
    | 'payment_completed'
    | 'payment_received'
    | 'payment_failed'
    | 'subscription_updated'
    | 'subscription_cancelled'
    | 'project_created'
    | 'project_transferred'
    | 'snapshot_applied'
    | 'approval_requested'
    | 'approval_approved'
    | 'approval_rejected'
    | 'approval_responded'
    | 'report_created'
    | 'report_generated'
    | 'report_published'
    | 'note_created'
    | 'usage_recorded'
    | 'access_changed';

export interface AgencyActivityInsertInput {
    agencyTenantId: string;
    clientTenantId?: string | null;
    projectId?: string | null;
    type: AgencyActivityType;
    title?: string | null;
    description?: string | null;
    metadata?: Record<string, unknown> | null;
    createdBy?: string | null;
    createdAt?: string | null;
}

export interface AgencyReportActivitySummary {
    totalClients: number;
    totalRevenue: number;
    totalOrders: number;
    totalMrr: number;
    moduleReadiness: {
        moduleReadinessRate: number;
        activeModuleSlots: number;
        totalModuleSlots: number;
        clientsWithAgencyOperatingSystem: number;
    };
}

export function buildAgencyActivityInsert(input: AgencyActivityInsertInput, now = new Date()) {
    return {
        agency_tenant_id: input.agencyTenantId,
        client_tenant_id: input.clientTenantId || null,
        project_id: input.projectId || null,
        type: input.type,
        title: input.title || null,
        description: input.description || null,
        metadata: input.metadata || {},
        created_by: input.createdBy || null,
        created_at: input.createdAt || now.toISOString(),
    };
}

export function buildAgencyPaymentReceivedActivity(input: {
    agencyTenantId: string;
    clientTenantId: string;
    agencyPlanId?: string | null;
    stripeCheckoutSessionId?: string | null;
    stripeSubscriptionId?: string | null;
    source?: string | null;
}, now = new Date()) {
    return buildAgencyActivityInsert({
        agencyTenantId: input.agencyTenantId,
        clientTenantId: input.clientTenantId,
        type: 'payment_received',
        title: 'Client subscription activated',
        description: 'Client completed agency service checkout.',
        metadata: {
            agencyPlanId: input.agencyPlanId || null,
            stripeCheckoutSessionId: input.stripeCheckoutSessionId || null,
            stripeSubscriptionId: input.stripeSubscriptionId || null,
            source: input.source || 'stripe-webhook',
        },
        createdAt: now.toISOString(),
    }, now);
}

export function buildAgencyPaymentFailedActivity(input: {
    agencyTenantId: string;
    clientTenantId: string;
    agencyPlanId?: string | null;
    stripeCheckoutSessionId?: string | null;
    stripeSubscriptionId?: string | null;
    billingStatus?: string | null;
    source?: string | null;
}, now = new Date()) {
    return buildAgencyActivityInsert({
        agencyTenantId: input.agencyTenantId,
        clientTenantId: input.clientTenantId,
        type: 'payment_failed',
        title: 'Client subscription payment requires attention',
        description: 'Stripe reported an unpaid or past-due agency client subscription.',
        metadata: {
            agencyPlanId: input.agencyPlanId || null,
            stripeCheckoutSessionId: input.stripeCheckoutSessionId || null,
            stripeSubscriptionId: input.stripeSubscriptionId || null,
            billingStatus: input.billingStatus || null,
            source: input.source || 'stripe-webhook',
        },
        createdAt: now.toISOString(),
    }, now);
}

export function buildAgencySubscriptionCancelledActivity(input: {
    agencyTenantId: string;
    clientTenantId: string;
    agencyPlanId?: string | null;
    stripeCheckoutSessionId?: string | null;
    stripeSubscriptionId?: string | null;
    source?: string | null;
}, now = new Date()) {
    return buildAgencyActivityInsert({
        agencyTenantId: input.agencyTenantId,
        clientTenantId: input.clientTenantId,
        type: 'subscription_cancelled',
        title: 'Client subscription cancelled',
        description: 'Stripe reported a cancelled agency client subscription.',
        metadata: {
            agencyPlanId: input.agencyPlanId || null,
            stripeCheckoutSessionId: input.stripeCheckoutSessionId || null,
            stripeSubscriptionId: input.stripeSubscriptionId || null,
            source: input.source || 'stripe-webhook',
        },
        createdAt: now.toISOString(),
    }, now);
}

export function buildAgencySnapshotAppliedActivity(input: {
    agencyTenantId: string;
    clientTenantId?: string | null;
    targetProjectId: string;
    applicationId: string;
    snapshotId: string;
    snapshotVersionId?: string | null;
    appliedBy?: string | null;
    includedModules: string[];
}, now = new Date()) {
    return buildAgencyActivityInsert({
        agencyTenantId: input.agencyTenantId,
        clientTenantId: input.clientTenantId || null,
        projectId: input.targetProjectId,
        type: 'snapshot_applied',
        title: 'Agency Snapshot aplicado',
        description: 'Snapshot aplicado en modo borrador; runtime publico no activado.',
        metadata: {
            source: 'agency_snapshot_service',
            applicationId: input.applicationId,
            snapshotId: input.snapshotId,
            snapshotVersionId: input.snapshotVersionId || null,
            includedModules: input.includedModules,
            noAutoPublish: true,
            noRuntimeActivated: true,
            requiresClientApproval: true,
        },
        createdBy: input.appliedBy || null,
        createdAt: now.toISOString(),
    }, now);
}

export function buildAgencyClientCreatedActivity(input: {
    agencyTenantId: string;
    clientTenantId: string;
    projectId?: string | null;
    businessName: string;
    selectedPlanId?: string | null;
    selectedPlanName?: string | null;
    effectivePlanId?: string | null;
    billingMode?: string | null;
    modules: string[];
    agencyOperatingSystem?: Record<string, unknown> | null;
    invitesSent: number;
    createdBy?: string | null;
    source?: string | null;
}, now = new Date()) {
    return buildAgencyActivityInsert({
        agencyTenantId: input.agencyTenantId,
        clientTenantId: input.clientTenantId,
        projectId: input.projectId || null,
        type: 'client_created',
        title: `Cliente creado: ${input.businessName}`,
        description: `Agency Engine provisionó ${input.businessName} con ${input.modules.length} módulos en draft.`,
        metadata: {
            selectedPlanId: input.selectedPlanId || null,
            selectedPlanName: input.selectedPlanName || null,
            effectivePlanId: input.effectivePlanId || null,
            billingMode: input.billingMode || null,
            modules: input.modules,
            agencyOperatingSystem: input.agencyOperatingSystem || null,
            invitesSent: input.invitesSent,
            source: input.source || 'onboarding-api',
        },
        createdBy: input.createdBy || null,
        createdAt: now.toISOString(),
    }, now);
}

export function buildAgencyProjectTransferredActivity(input: {
    agencyTenantId: string;
    clientTenantId: string;
    projectId: string;
    projectName: string;
    clientName?: string | null;
    transferredBy?: string | null;
    metadata?: Record<string, unknown> | null;
}, now = new Date()) {
    return buildAgencyActivityInsert({
        agencyTenantId: input.agencyTenantId,
        clientTenantId: input.clientTenantId,
        projectId: input.projectId,
        type: 'project_transferred',
        title: `Proyecto transferido: ${input.projectName}`,
        description: `Agency Engine transfirió ${input.projectName} a ${input.clientName || 'cliente'} como borrador.`,
        metadata: input.metadata || {},
        createdBy: input.transferredBy || null,
        createdAt: now.toISOString(),
    }, now);
}

export function buildAgencyApprovalRespondedActivity(input: {
    agencyTenantId: string;
    clientTenantId: string;
    projectId?: string | null;
    approvalId: string;
    approvalTitle: string;
    decision: 'approved' | 'rejected' | 'changes_requested' | string;
    responseNote?: string | null;
    clientName?: string | null;
    respondedBy?: string | null;
    source?: string | null;
}, now = new Date()) {
    const decisionLabel = input.decision === 'approved'
        ? 'aprobó'
        : input.decision === 'rejected'
            ? 'rechazó'
            : 'pidió cambios en';

    return buildAgencyActivityInsert({
        agencyTenantId: input.agencyTenantId,
        clientTenantId: input.clientTenantId,
        projectId: input.projectId || null,
        type: 'approval_responded',
        title: `Respuesta de aprobación: ${input.approvalTitle}`,
        description: `${input.clientName || 'El cliente'} ${decisionLabel} ${input.approvalTitle}.`,
        metadata: {
            approvalId: input.approvalId,
            decision: input.decision,
            responseNote: input.responseNote ?? null,
            source: input.source || 'client-portal',
        },
        createdBy: input.respondedBy || null,
        createdAt: now.toISOString(),
    }, now);
}

export function buildAgencyReportGeneratedActivity(input: {
    agencyTenantId: string;
    clientTenantId?: string | null;
    reportId?: string | null;
    template: string;
    title?: string | null;
    generatedBy?: string | null;
    summary: AgencyReportActivitySummary;
    aiSummary: string;
    reportStatus: 'draft' | 'sent' | 'published';
    publishToClientPortal: boolean;
    metadata?: Record<string, unknown> | null;
}, now = new Date()) {
    return buildAgencyActivityInsert({
        agencyTenantId: input.agencyTenantId,
        clientTenantId: input.clientTenantId || null,
        type: 'report_generated',
        title: input.title || 'Reporte Agency Engine generado',
        description: input.aiSummary,
        metadata: {
            ...(input.metadata || {}),
            reportId: input.reportId || null,
            template: input.template,
            totalClients: input.summary.totalClients,
            totalRevenue: input.summary.totalRevenue,
            totalOrders: input.summary.totalOrders,
            totalMrr: input.summary.totalMrr,
            reportStatus: input.reportStatus,
            clientPortalVisible: input.publishToClientPortal && input.reportStatus !== 'draft',
            portalPublicationStatus: input.publishToClientPortal ? input.reportStatus : 'not_requested',
            moduleReadinessRate: input.summary.moduleReadiness.moduleReadinessRate,
            activeModuleSlots: input.summary.moduleReadiness.activeModuleSlots,
            totalModuleSlots: input.summary.moduleReadiness.totalModuleSlots,
            clientsWithAgencyOperatingSystem: input.summary.moduleReadiness.clientsWithAgencyOperatingSystem,
        },
        createdBy: input.generatedBy || null,
        createdAt: now.toISOString(),
    }, now);
}

export async function insertAgencyActivity(client: { from: (table: string) => any }, input: AgencyActivityInsertInput) {
    const row = buildAgencyActivityInsert(input);
    const query = client
        .from('agency_activity')
        .insert(row);
    let result: any;
    if (typeof query?.select === 'function') {
        const selected = query.select('id');
        result = typeof selected?.maybeSingle === 'function' ? await selected.maybeSingle() : await selected;
    } else {
        result = await query;
    }

    if (result?.error) throw result.error;
    return { data: result?.data, row };
}
