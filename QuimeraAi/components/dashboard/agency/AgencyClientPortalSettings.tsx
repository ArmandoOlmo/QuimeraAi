import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart3,
    CreditCard,
    ExternalLink,
    FileCheck2,
    Globe,
    LifeBuoy,
    Lock,
    Monitor,
    Palette,
    ShieldCheck,
    Workflow,
} from 'lucide-react';

import { useRouter } from '../../../hooks/useRouter';
import { useServiceAccess } from '../../../hooks/useServiceAccess';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { ROUTES } from '../../../routes/config';
import {
    AgencyInlineStatus,
    AgencyNextAction,
    AgencyPanel,
    AgencyReadinessPanel,
    AgencySectionHeader,
} from './AgencyDesignSystem';

const portalModules = [
    { icon: Workflow, labelKey: 'agency.clientPortal.projects', fallback: 'Projects', descriptionKey: 'agency.clientPortal.projectsDesc', description: 'Transferred websites, storefronts, modules, and delivery status.' },
    { icon: FileCheck2, labelKey: 'agency.clientPortal.approvals', fallback: 'Approvals', descriptionKey: 'agency.clientPortal.approvalsDesc', description: 'Client review requests for project transfer and launch approvals.' },
    { icon: BarChart3, labelKey: 'agency.clientPortal.reports', fallback: 'Reports', descriptionKey: 'agency.clientPortal.reportsDesc', description: 'Shared performance reports, AI summaries, recommendations, and exports.' },
    { icon: CreditCard, labelKey: 'agency.clientPortal.billing', fallback: 'Billing', descriptionKey: 'agency.clientPortal.billingDesc', description: 'Plan, invoices, payment links, and agency-managed billing visibility.' },
    { icon: LifeBuoy, labelKey: 'agency.clientPortal.support', fallback: 'Support', descriptionKey: 'agency.clientPortal.supportDesc', description: 'Agency support identity, email, and help links.' },
];

export function AgencyClientPortalSettings() {
    const { t } = useTranslation();
    const { navigate } = useRouter();
    const { currentTenant } = useTenant();
    const serviceAccess = useServiceAccess();
    const portalAccess = serviceAccess.canAccessModule('agency-client-portal', {
        serviceId: 'agency',
        featureKey: 'agencyModule',
        requiredPermission: 'canManageSettings',
    });
    const canManagePortal = !serviceAccess.isLoading && portalAccess.allowed;
    const branding = currentTenant?.branding || {};
    const hasVerifiedDomain = Boolean(branding.customDomain && branding.customDomainVerified);
    const portalUrl = hasVerifiedDomain ? `https://${branding.customDomain}` : ROUTES.PORTAL_DASHBOARD;

    const readinessItems = useMemo(() => [
        {
            label: t('agency.clientPortal.readiness.brand', 'Brand identity'),
            description: t('agency.clientPortal.readiness.brandDesc', 'Company name, logo, colors, and footer are configured for the client portal.'),
            complete: Boolean(branding.companyName || branding.logoUrl || branding.primaryColor),
            icon: Palette,
            onClick: () => navigate(ROUTES.AGENCY_WHITE_LABEL),
        },
        {
            label: t('agency.clientPortal.readiness.domain', 'Portal domain'),
            description: t('agency.clientPortal.readiness.domainDesc', 'Custom domain or default portal route is available for clients.'),
            complete: hasVerifiedDomain,
            icon: Globe,
            onClick: () => navigate(ROUTES.AGENCY_WHITE_LABEL),
        },
        {
            label: t('agency.clientPortal.readiness.support', 'Support identity'),
            description: t('agency.clientPortal.readiness.supportDesc', 'Support email and support URL are ready for client-facing requests.'),
            complete: Boolean(branding.supportEmail || branding.supportUrl),
            icon: LifeBuoy,
            onClick: () => navigate(ROUTES.AGENCY_WHITE_LABEL),
        },
        {
            label: t('agency.clientPortal.readiness.access', 'Service Access'),
            description: canManagePortal
                ? t('agency.clientPortal.readiness.accessReady', 'Agency owners can manage and publish the portal.')
                : portalAccess.message,
            complete: canManagePortal,
            icon: ShieldCheck,
        },
    ], [
        branding.companyName,
        branding.logoUrl,
        branding.primaryColor,
        branding.supportEmail,
        branding.supportUrl,
        canManagePortal,
        hasVerifiedDomain,
        navigate,
        portalAccess.message,
        t,
    ]);

    const readinessScore = Math.round(
        (readinessItems.filter(item => item.complete).length / readinessItems.length) * 100,
    );

    return (
        <div className="space-y-6">
            <AgencySectionHeader
                icon={Monitor}
                eyebrow={t('agency.clientPortal.eyebrow', 'Agency OS')}
                title={t('agency.clientPortal.title', 'Client Portal')}
                subtitle={t('agency.clientPortal.subtitle', 'Configure the white-label client portal where clients review projects, reports, approvals, billing, and support.')}
                actions={(
                    <button
                        type="button"
                        onClick={() => navigate(ROUTES.PORTAL_DASHBOARD)}
                        disabled={!canManagePortal}
                        className="quimera-guide-cta disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <ExternalLink className="h-4 w-4" />
                        {t('agency.clientPortal.openPortal', 'Open portal')}
                    </button>
                )}
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <AgencyPanel
                    title={t('agency.clientPortal.operatingSurface', 'Client-facing operating surface')}
                    icon={Monitor}
                    contentClassName="space-y-4"
                >
                    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-q-border/60 bg-q-bg/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wider text-q-text-muted">
                                {t('agency.clientPortal.liveRoute', 'Live route')}
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-foreground">
                                {portalUrl}
                            </p>
                        </div>
                        <AgencyInlineStatus tone={canManagePortal ? 'success' : 'warning'}>
                            {canManagePortal
                                ? t('agency.clientPortal.accessReady', 'Ready')
                                : (serviceAccess.isLoading
                                    ? t('agency.clientPortal.validatingAccess', 'Validating access')
                                    : t('agency.clientPortal.accessBlocked', 'Blocked'))}
                        </AgencyInlineStatus>
                    </div>

                    {!canManagePortal && (
                        <div className="flex items-start gap-3 rounded-lg border border-q-warning/30 bg-q-warning/10 p-4 text-sm text-foreground">
                            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-q-warning" />
                            <p>{serviceAccess.isLoading ? t('agency.clientPortal.validatingAccess', 'Validating access') : portalAccess.message}</p>
                        </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                        {portalModules.map(module => {
                            const Icon = module.icon;
                            return (
                                <div key={module.labelKey} className="min-w-0 rounded-lg border border-q-border/60 bg-q-surface/60 p-4">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-q-accent/10 quimera-status-card-accent-text">
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0">
                                            <h3 className="truncate text-sm font-bold text-foreground">
                                                {t(module.labelKey, module.fallback)}
                                            </h3>
                                            <p className="mt-1 line-clamp-2 text-xs text-q-text-muted">
                                                {t(module.descriptionKey, module.description)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </AgencyPanel>

                <AgencyReadinessPanel
                    title={t('agency.clientPortal.readiness.title', 'Portal readiness')}
                    subtitle={t('agency.clientPortal.readiness.subtitle', 'Client Portal inherits White Label, reports, approvals, and billing state.')}
                    score={readinessScore}
                    items={readinessItems}
                />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <AgencyNextAction
                    icon={Palette}
                    label={t('agency.clientPortal.actions.branding', 'Configure white label')}
                    description={t('agency.clientPortal.actions.brandingDesc', 'Update brand identity, support details, email identity, and domain settings.')}
                    onClick={() => navigate(ROUTES.AGENCY_WHITE_LABEL)}
                />
                <AgencyNextAction
                    icon={BarChart3}
                    label={t('agency.clientPortal.actions.reports', 'Prepare client reports')}
                    description={t('agency.clientPortal.actions.reportsDesc', 'Generate AI summaries and publish performance reports into the client portal.')}
                    onClick={() => navigate(ROUTES.AGENCY_REPORTS)}
                />
                <AgencyNextAction
                    icon={Workflow}
                    label={t('agency.clientPortal.actions.projects', 'Transfer projects')}
                    description={t('agency.clientPortal.actions.projectsDesc', 'Move agency-built projects into client workspaces with review history.')}
                    onClick={() => navigate(ROUTES.AGENCY_PROJECTS)}
                />
            </div>
        </div>
    );
}

export default AgencyClientPortalSettings;
