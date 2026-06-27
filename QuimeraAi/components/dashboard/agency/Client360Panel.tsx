import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Bot,
    CalendarDays,
    CheckCircle,
    Clock,
    CreditCard,
    Download,
    FileText,
    FolderOpen,
    Globe,
    Home,
    Image,
    LayoutDashboard,
    Mail,
    Package,
    ShoppingCart,
    Sparkles,
    Users,
    X,
    type LucideIcon,
} from 'lucide-react';

import type { ActivityEvent, ClientMetricsSummary } from '../../../hooks/useAgencyMetrics';
import type { Tenant } from '../../../types/multiTenant';
import { ROUTES } from '../../../routes/config';
import {
    getAgencyEngineOperatingSystemManifest,
    type AgencyEngineClient360Module,
    type AgencyEngineClient360ModuleId,
} from '../../../registry/moduleRegistry';
import { useRouter } from '../../../hooks/useRouter';
import { AgencyPanel } from './AgencyDesignSystem';
import { StatusBadge } from '../../ui/system';
import { formatTimeAgo } from '../../../contexts/agency/AgencyContext';
import { cn } from '../../../utils';
import { resolveAgencyClientServicePlanLabel } from './agencyClientDisplay';
import {
    createGlobalAssistantEntryPayload,
    dispatchGlobalAssistantEntryRequest,
} from '../../../services/globalAssistant/globalAssistantEntryBridge';

interface Client360PanelProps {
    client: Tenant | null;
    metrics: ClientMetricsSummary | null;
    activities: ActivityEvent[];
    isOpen: boolean;
    isExporting?: boolean;
    onClose: () => void;
    onExport: (clientId: string) => void;
}

function readClientMrr(client: Tenant | null): number {
    const billing = (client?.billing || {}) as Record<string, unknown>;
    const billingInfo = (client?.billingInfo || {}) as Record<string, unknown>;
    const values = [
        billing.mrr,
        billing.monthlyPrice,
        billingInfo.mrr,
    ];

    for (const value of values) {
        const amount = Number(value);
        if (Number.isFinite(amount) && amount > 0) return amount;
    }

    return 0;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(value: unknown): string {
    if (!value) return '-';
    const date = typeof value === 'string'
        ? new Date(value)
        : typeof value === 'object' && value && 'seconds' in value
            ? new Date(Number((value as { seconds: number }).seconds) * 1000)
            : null;

    if (!date || Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('es', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function statusVariant(status?: Tenant['status']) {
    if (status === 'active') return 'success';
    if (status === 'expired') return 'muted';
    return 'warning';
}

type Client360ModuleSignal = {
    icon: LucideIcon;
    active: boolean;
} & AgencyEngineClient360Module;

const CLIENT_360_MODULE_ICONS: Record<AgencyEngineClient360ModuleId, LucideIcon> = {
    businessBlueprint: Sparkles,
    'website-builder': Globe,
    'storefront-builder': Package,
    ecommerce: ShoppingCart,
    'crm-leads': Users,
    'email-marketing': Mail,
    appointments: CalendarDays,
    restaurants: FileText,
    realty: Home,
    'bio-page': FileText,
    chatcore: Bot,
    'media-ai': Image,
    finance: CreditCard,
    analytics: BarChart3,
};

function readEnabledFeatures(client: Tenant): Set<string> {
    const enabledFeatures = Array.isArray(client.settings?.enabledFeatures)
        ? client.settings.enabledFeatures
        : [];

    return new Set(
        enabledFeatures
            .map((feature) => String(feature || '').trim().toLowerCase())
            .filter(Boolean),
    );
}

function hasAnyFeature(features: Set<string>, values: string[]): boolean {
    return values.some(value => features.has(value.toLowerCase()));
}

function readStringSet(value: unknown): Set<string> {
    if (!Array.isArray(value)) return new Set();
    return new Set(
        value
            .map(item => String(item || '').trim())
            .filter(Boolean),
    );
}

function readClientAgencyOperatingSystem(client: Tenant): Record<string, any> | null {
    const candidates = [
        client.agencyOperatingSystem,
        client.agencyClientMetadata?.agencyOperatingSystem,
        (client.billing as Record<string, unknown> | undefined)?.agencyOperatingSystem,
    ];

    for (const candidate of candidates) {
        if (candidate && typeof candidate === 'object') return candidate as Record<string, any>;
    }

    return null;
}

function readAgencyOperatingModuleState(
    module: AgencyEngineClient360Module,
    agencyOperatingSystem: Record<string, any> | null,
): boolean | null {
    if (!agencyOperatingSystem) return null;

    const enabledClient360ModuleIds = readStringSet(agencyOperatingSystem.enabledClient360ModuleIds);
    const generatedModuleIds = readStringSet(agencyOperatingSystem.generatedModuleIds);
    const foundationModuleIds = readStringSet(agencyOperatingSystem.foundationModuleIds);
    if (
        enabledClient360ModuleIds.has(module.id) ||
        generatedModuleIds.has(module.ownerModuleId) ||
        foundationModuleIds.has(module.ownerModuleId)
    ) {
        return true;
    }

    const moduleRows = Array.isArray(agencyOperatingSystem.client360Modules)
        ? agencyOperatingSystem.client360Modules
        : [];
    const moduleRow = moduleRows.find((row: Record<string, unknown>) =>
        row?.id === module.id || row?.ownerModuleId === module.ownerModuleId,
    );

    if (!moduleRow) return null;
    return moduleRow.enabled === true;
}

function isClient360ModuleActive(
    module: AgencyEngineClient360Module,
    features: Set<string>,
    projectCount: number,
    hasBilling: boolean,
    agencyOperatingSystem: Record<string, any> | null,
): boolean {
    const operatingState = readAgencyOperatingModuleState(module, agencyOperatingSystem);
    if (operatingState !== null) return operatingState;
    if (module.id === 'businessBlueprint') return projectCount > 0 || features.size > 0;
    if (module.id === 'website-builder') return projectCount > 0 || hasAnyFeature(features, module.activationSignals);
    if (module.id === 'finance') return hasBilling || hasAnyFeature(features, module.activationSignals);
    if (module.id === 'analytics') return projectCount > 0 || hasAnyFeature(features, module.activationSignals);
    return hasAnyFeature(features, module.activationSignals);
}

function buildClient360ModuleSignals(client: Tenant, metrics: ClientMetricsSummary | null): Client360ModuleSignal[] {
    const features = readEnabledFeatures(client);
    const agencyOperatingSystem = readClientAgencyOperatingSystem(client);
    const billing = (client.billing || {}) as Record<string, unknown>;
    const projectCount = metrics?.usage.projectCount || client.usage?.projectCount || client.projectIds?.length || 0;
    const hasBilling = Number(billing.mrr || billing.monthlyPrice || 0) > 0 || Boolean(billing.mode && billing.mode !== 'included_in_parent');

    return getAgencyEngineOperatingSystemManifest().client360Modules.map(module => ({
        ...module,
        icon: CLIENT_360_MODULE_ICONS[module.id],
        active: isClient360ModuleActive(module, features, projectCount, hasBilling, agencyOperatingSystem),
    }));
}

function UsageRow({
    label,
    value,
    limit,
    percentage,
}: {
    label: React.ReactNode;
    value: React.ReactNode;
    limit: React.ReactNode;
    percentage: number;
}) {
    const safePercentage = Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : 100;
    const isCritical = safePercentage >= 95;
    const isWarning = safePercentage >= 80 && !isCritical;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">{label}</span>
                <span className="text-q-text-muted">{value} / {limit}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                    className={cn(
                        'h-full rounded-full transition-all',
                        isCritical ? 'bg-q-error' : isWarning ? 'bg-q-warning' : 'bg-q-success',
                    )}
                    style={{ width: `${safePercentage}%` }}
                />
            </div>
        </div>
    );
}

export function Client360Panel({
    client,
    metrics,
    activities,
    isOpen,
    isExporting = false,
    onClose,
    onExport,
}: Client360PanelProps) {
    const { t } = useTranslation();
    const { navigate } = useRouter();

    if (!isOpen || !client) return null;

    const clientActivities = activities
        .filter((activity) => activity.clientId === client.id)
        .slice(0, 6);
    const billing = (client.billing || {}) as Record<string, any>;
    const mrr = readClientMrr(client);
    const hasAlerts = Boolean(metrics?.alerts.length);
    const agencyOperatingSystem = readClientAgencyOperatingSystem(client);
    const billingMode = String(client.agencyBillingMode || billing.mode || '-').replaceAll('_', ' ');
    const servicePlanLabel = resolveAgencyClientServicePlanLabel(
        client,
        t('dashboard.agency.client360.noServicePlan', 'No service plan'),
    );
    const moduleSignals = buildClient360ModuleSignals(client, metrics);
    const activeModuleSignals = moduleSignals.filter(module => module.active);
    const pendingModuleSignals = moduleSignals.filter(module => !module.active);

    const goTo = (route: string) => {
        onClose();
        navigate(route);
    };

    const openAiReport = () => {
        const clientName = client.companyName || client.name;
        const prompt = t(
            'dashboard.agency.client360.aiReportPrompt',
            'Create an agency report for {{clientName}} using Client 360 context. Focus on usage, billing, activity, blockers, and next steps.',
            { clientName },
        );

        dispatchGlobalAssistantEntryRequest(createGlobalAssistantEntryPayload(prompt, {
            source: 'agency_client_360',
            surface: 'app',
            metadata: {
                entryPoint: 'client_360_operating_action',
                sourceComponent: 'Client360Panel',
                assistantLayer: 'global_operating_layer',
                commandCenter: true,
                memoryScopeHint: 'user_tenant_project_module_session_task',
                activeModule: 'agency',
                quickActionId: 'create_agency_report',
                quickActionCategory: 'analyze',
                activeEntityType: 'agency_client',
                activeEntityId: client.id,
                activeEntityName: clientName,
                clientTenantId: client.id,
                clientName,
                agencyOperatingSystemAvailable: Boolean(agencyOperatingSystem),
                agencyOperatingSystemModuleIds: agencyOperatingSystem?.enabledClient360ModuleIds || null,
                reportRoute: ROUTES.AGENCY_REPORTS,
                servicePlanLabel,
                billingMode,
                activeModuleIds: activeModuleSignals.map(module => module.id),
                pendingModuleIds: pendingModuleSignals.map(module => module.id),
            },
        }));
    };

    return (
        <div className="fixed inset-0 z-[70] flex justify-end">
            <button
                type="button"
                aria-label={t('dashboard.agency.client360.close', 'Close Client 360')}
                className="absolute inset-0 bg-q-text/45 backdrop-blur-sm"
                onClick={onClose}
            />
            <aside className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden border-l border-q-border bg-q-bg shadow-2xl">
                <header className="quimera-dashboard-header-bar flex min-h-14 shrink-0 items-center justify-between gap-3 px-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_14%,transparent)]">
                            <Users className="h-5 w-5 quimera-dashboard-header-icon" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider quimera-status-card-accent-text">
                                {t('dashboard.agency.client360.eyebrow', 'Client 360')}
                            </p>
                            <h2 className="truncate text-base font-semibold text-foreground sm:text-lg">{client.name}</h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={t('dashboard.agency.client360.close', 'Close Client 360')}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="space-y-5">
                        <AgencyPanel>
                            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                                <div className="min-w-0 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <StatusBadge size="sm" variant={statusVariant(client.status)}>
                                            {client.status}
                                        </StatusBadge>
                                        {hasAlerts && (
                                            <StatusBadge size="sm" variant="warning" className="gap-1">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                {t('dashboard.agency.client360.alerts', '{{count}} alerts', { count: metrics?.alerts.length || 0 })}
                                            </StatusBadge>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-foreground">{client.companyName || client.name}</h3>
                                        <div className="mt-2 grid gap-2 text-sm text-q-text-muted sm:grid-cols-2">
                                            <span className="flex min-w-0 items-center gap-2">
                                                <Mail className="h-4 w-4 shrink-0" />
                                                <span className="truncate">{client.email || '-'}</span>
                                            </span>
                                            <span className="flex min-w-0 items-center gap-2 capitalize">
                                                <Package className="h-4 w-4 shrink-0" />
                                                <span className="truncate">{servicePlanLabel}</span>
                                            </span>
                                            <span className="flex min-w-0 items-center gap-2">
                                                <Globe className="h-4 w-4 shrink-0" />
                                                <span className="truncate">{client.slug || '-'}</span>
                                            </span>
                                            <span className="flex min-w-0 items-center gap-2">
                                                <Clock className="h-4 w-4 shrink-0" />
                                                <span className="truncate">
                                                    {t('dashboard.agency.client360.lastActive', 'Last active')}: {metrics?.lastActiveAt ? formatDate(metrics.lastActiveAt.toISOString()) : '-'}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-q-border bg-q-surface p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-q-text-muted">
                                            {t('dashboard.agency.client360.mrr', 'MRR')}
                                        </p>
                                        <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(mrr)}</p>
                                    </div>
                                    <div className="rounded-lg border border-q-border bg-q-surface p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-q-text-muted">
                                            {t('dashboard.agency.client360.projects', 'Projects')}
                                        </p>
                                        <p className="mt-2 text-2xl font-bold text-foreground">{metrics?.usage.projectCount || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </AgencyPanel>

                        <div className="grid gap-5 xl:grid-cols-2">
                            <AgencyPanel title={t('dashboard.agency.client360.usage', 'Usage and limits')} icon={BarChart3}>
                                <div className="space-y-4">
                                    <UsageRow
                                        label={t('dashboard.agency.client360.projects', 'Projects')}
                                        value={metrics?.usage.projectCount || 0}
                                        limit={metrics?.limits.maxProjects || 0}
                                        percentage={metrics?.usagePercentages.projects || 0}
                                    />
                                    <UsageRow
                                        label={t('dashboard.agency.client360.users', 'Users')}
                                        value={metrics?.usage.userCount || 0}
                                        limit={metrics?.limits.maxUsers || 0}
                                        percentage={metrics?.usagePercentages.users || 0}
                                    />
                                    <UsageRow
                                        label={t('dashboard.agency.client360.storage', 'Storage')}
                                        value={`${(metrics?.usage.storageUsedGB || 0).toFixed(1)} GB`}
                                        limit={`${metrics?.limits.maxStorageGB || 0} GB`}
                                        percentage={metrics?.usagePercentages.storage || 0}
                                    />
                                    <UsageRow
                                        label={t('dashboard.agency.client360.aiCredits', 'AI Credits')}
                                        value={(metrics?.usage.aiCreditsUsed || 0).toLocaleString()}
                                        limit={(metrics?.limits.maxAiCredits || 0).toLocaleString()}
                                        percentage={metrics?.usagePercentages.aiCredits || 0}
                                    />
                                </div>
                            </AgencyPanel>

                            <AgencyPanel title={t('dashboard.agency.client360.billing', 'Billing')} icon={CreditCard}>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between gap-3">
                                        <span className="text-q-text-muted">{t('dashboard.agency.client360.mode', 'Mode')}</span>
                                        <span className="font-medium capitalize text-foreground">{billingMode}</span>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <span className="text-q-text-muted">{t('dashboard.agency.client360.status', 'Status')}</span>
                                        <span className="font-medium text-foreground">{billing.status || client.status}</span>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <span className="text-q-text-muted">{t('dashboard.agency.client360.plan', 'Service plan')}</span>
                                        <span className="font-medium text-foreground">{servicePlanLabel}</span>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <span className="text-q-text-muted">{t('dashboard.agency.client360.nextBilling', 'Next billing')}</span>
                                        <span className="font-medium text-foreground">{formatDate(billing.nextBillingDate || billing.currentPeriodEnd)}</span>
                                    </div>
                                </div>
                            </AgencyPanel>
                        </div>

                        <AgencyPanel
                            title={t('dashboard.agency.client360.moduleMap', 'Module operating map')}
                            icon={LayoutDashboard}
                        >
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <p className="max-w-2xl text-sm text-q-text-muted">
                                    {t('dashboard.agency.client360.moduleMapSubtitle', '{{active}}/{{total}} connected modules for this client business.', {
                                        active: activeModuleSignals.length,
                                        total: moduleSignals.length,
                                    })}
                                </p>
                                <StatusBadge size="sm" variant={pendingModuleSignals.length === 0 ? 'success' : 'warning'}>
                                    {pendingModuleSignals.length === 0
                                        ? t('dashboard.agency.client360.moduleConfigured', 'Fully configured')
                                        : t('dashboard.agency.client360.moduleNeedsSetup', '{{count}} pending', { count: pendingModuleSignals.length })}
                                </StatusBadge>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {moduleSignals.map((module) => {
                                    const Icon = module.icon;
                                    const content = (
                                        <div className={cn(
                                            'h-full rounded-lg border p-3 text-left transition-colors',
                                            module.active
                                                ? 'border-q-success/30 bg-q-success/5'
                                                : 'border-q-border bg-q-surface/70 hover:bg-muted/50',
                                        )}>
                                            <div className="flex items-start gap-3">
                                                <span className={cn(
                                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                                    module.active ? 'bg-q-success/10 text-q-success' : 'bg-muted text-q-text-muted',
                                                )}>
                                                    <Icon className="h-4 w-4" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex min-w-0 items-center justify-between gap-2">
                                                        <h3 className="truncate text-sm font-semibold text-foreground">
                                                            {t(module.labelKey, module.label)}
                                                        </h3>
                                                        <span className={cn(
                                                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                                                            module.active
                                                                ? 'bg-q-success/10 text-q-success'
                                                                : 'bg-muted text-q-text-muted',
                                                        )}>
                                                            {module.active
                                                                ? t('dashboard.agency.client360.moduleActive', 'Active')
                                                                : t('dashboard.agency.client360.modulePending', 'Pending')}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 line-clamp-2 text-xs text-q-text-muted">
                                                        {t(module.descriptionKey, module.description)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );

                                    if (module.route) {
                                        return (
                                            <button
                                                key={module.id}
                                                type="button"
                                                onClick={() => goTo(module.route!)}
                                                className="block min-w-0 text-left"
                                            >
                                                {content}
                                            </button>
                                        );
                                    }

                                    return (
                                        <div key={module.id} className="min-w-0">
                                            {content}
                                        </div>
                                    );
                                })}
                            </div>
                        </AgencyPanel>

                        <AgencyPanel
                            title={t('dashboard.agency.client360.actions', 'Operating actions')}
                            icon={CheckCircle}
                        >
                            <div className="grid gap-2 sm:grid-cols-2">
                                <button type="button" onClick={() => goTo(ROUTES.AGENCY_BILLING)} className="quimera-guide-cta flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
                                    <CreditCard className="h-4 w-4" />
                                    {t('dashboard.agency.client360.openBilling', 'Open billing')}
                                </button>
                                <button type="button" onClick={openAiReport} className="rounded-lg border border-q-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                                    <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" />{t('dashboard.agency.client360.generateAiReport', 'Generate AI report')}</span>
                                </button>
                                <button type="button" onClick={() => goTo(ROUTES.AGENCY_PROJECTS)} className="rounded-lg border border-q-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                                    <span className="inline-flex items-center gap-2"><FolderOpen className="h-4 w-4" />{t('dashboard.agency.client360.projectsAction', 'Projects')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onExport(client.id)}
                                    disabled={isExporting}
                                    className="rounded-lg border border-q-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                                >
                                    <span className="inline-flex items-center gap-2"><Download className="h-4 w-4" />{t('dashboard.agency.client360.export', 'Export')}</span>
                                </button>
                            </div>
                        </AgencyPanel>

                        <AgencyPanel title={t('dashboard.agency.client360.activity', 'Recent activity')} icon={Activity}>
                            {clientActivities.length > 0 ? (
                                <div className="space-y-2">
                                    {clientActivities.map((activity) => (
                                        <div key={activity.id} className="rounded-lg border border-q-border bg-q-surface p-3">
                                            <p className="text-sm text-foreground">{activity.description}</p>
                                            <p className="mt-1 text-xs text-q-text-muted">{formatTimeAgo(activity.timestamp)}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-q-text-muted">
                                    {t('dashboard.agency.client360.noActivity', 'No recent activity for this client yet.')}
                                </p>
                            )}
                        </AgencyPanel>
                    </div>
                </div>
            </aside>
        </div>
    );
}
