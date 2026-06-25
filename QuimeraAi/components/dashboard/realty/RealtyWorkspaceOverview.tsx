import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Building2, CalendarDays, Eye, Megaphone, Sparkles, Users } from 'lucide-react';
import type { RealtyLead, RealtyProperty } from '../../../types/realty';
import { formatRealtyPrice } from '../../../utils/realty';

type RealtyWorkspaceTab = 'properties' | 'leads' | 'campaigns' | 'openHouses' | 'ai';

interface RealtyWorkspaceOverviewProps {
    projectName: string;
    properties: RealtyProperty[];
    leads: RealtyLead[];
    activePropertyCount: number;
    newLeadCount: number;
    averageListingScore: number;
    language: string;
    onOpenProperty: (property: RealtyProperty) => void;
    onOpenTab: (tab: RealtyWorkspaceTab) => void;
}

const workspaceActions: Array<{
    key: RealtyWorkspaceTab;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
    { key: 'properties', icon: Building2 },
    { key: 'leads', icon: Users },
    { key: 'campaigns', icon: Megaphone },
    { key: 'openHouses', icon: CalendarDays },
    { key: 'ai', icon: Sparkles },
];

const WorkspaceMetric = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) => (
    <div className="min-w-0 rounded-xl border border-q-border bg-q-surface p-5">
        <div className="flex items-center justify-between gap-4">
            <p className="truncate text-sm font-medium text-q-text-secondary">{label}</p>
            <Icon size={18} className="shrink-0 text-q-accent" />
        </div>
        <p className="mt-3 text-3xl font-bold text-q-text">{value}</p>
    </div>
);

const RealtyWorkspaceOverview: React.FC<RealtyWorkspaceOverviewProps> = ({
    projectName,
    properties,
    leads,
    activePropertyCount,
    newLeadCount,
    averageListingScore,
    language,
    onOpenProperty,
    onOpenTab,
}) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.workspaceOverview.label')}</p>
                        <h1 className="mt-1 text-2xl font-bold text-q-text">{t('realty.workspaceOverview.title')}</h1>
                        <p className="mt-2 max-w-4xl text-sm leading-6 text-q-text-secondary">{t('realty.workspaceOverview.subtitle')}</p>
                    </div>
                    <div className="rounded-lg border border-q-border bg-q-bg px-4 py-3 text-sm text-q-text-secondary lg:w-72">
                        <p className="font-semibold text-q-text">{t('realty.workspaceOverview.project')}</p>
                        <p className="mt-1 truncate">{projectName}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-5 md:grid-cols-4">
                <WorkspaceMetric icon={Building2} label={t('realty.metrics.properties')} value={properties.length} />
                <WorkspaceMetric icon={Eye} label={t('realty.metrics.active')} value={activePropertyCount} />
                <WorkspaceMetric icon={Users} label={t('realty.metrics.leads')} value={newLeadCount} />
                <WorkspaceMetric icon={Sparkles} label={t('realty.metrics.qualityScore')} value={`${averageListingScore}%`} />
            </div>

            <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-q-text-secondary">{t('realty.workspaceOverview.mapLabel')}</p>
                        <h2 className="mt-1 text-lg font-bold text-q-text">{t('realty.workspaceOverview.mapTitle')}</h2>
                    </div>
                    <span className="text-xs font-semibold text-q-text-secondary">{t('realty.workspaceOverview.userScope')}</span>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {workspaceActions.map(action => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.key}
                                type="button"
                                onClick={() => onOpenTab(action.key)}
                                className="min-w-0 rounded-lg border border-q-border bg-q-bg p-4 text-left transition-colors hover:border-q-accent/40 hover:bg-q-surface-overlay"
                            >
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-q-border bg-q-surface text-q-accent">
                                    <Icon size={17} />
                                </span>
                                <h3 className="mt-3 font-semibold text-q-text">{t(`realty.workspaceOverview.actions.${action.key}.title`)}</h3>
                                <p className="mt-1 line-clamp-3 text-sm leading-6 text-q-text-secondary">{t(`realty.workspaceOverview.actions.${action.key}.description`)}</p>
                                <p className="mt-3 text-xs font-semibold text-q-accent">{t(`realty.workspaceOverview.actions.${action.key}.cta`)}</p>
                            </button>
                        );
                    })}
                </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                    <h2 className="font-bold text-q-text">{t('realty.overview.recentProperties')}</h2>
                    <div className="mt-5 space-y-3">
                        {properties.slice(0, 4).map(property => (
                            <button
                                key={property.id}
                                type="button"
                                onClick={() => onOpenProperty(property)}
                                className="flex w-full min-w-0 items-center justify-between gap-4 rounded-lg border border-q-border p-4 text-left transition-colors hover:border-q-accent/40"
                            >
                                <span className="min-w-0 truncate text-sm font-medium text-q-accent">{property.title}</span>
                                <span className="shrink-0 text-xs text-q-text-secondary">{formatRealtyPrice(property.price, language, property.currency)}</span>
                            </button>
                        ))}
                        {properties.length === 0 && (
                            <p className="text-sm leading-6 text-q-text-secondary">{t('realty.empty.noPropertiesDesc')}</p>
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-q-border bg-q-surface p-5 md:p-6">
                    <h2 className="font-bold text-q-text">{t('realty.overview.recentLeads')}</h2>
                    <div className="mt-5 space-y-3">
                        {leads.slice(0, 4).map(lead => (
                            <button
                                key={lead.id}
                                type="button"
                                onClick={() => onOpenTab('leads')}
                                className="block w-full rounded-lg border border-q-border p-4 text-left transition-colors hover:border-q-accent/40"
                            >
                                <p className="min-w-0 truncate text-sm font-medium text-q-accent">{lead.name}</p>
                                <p className="mt-1 truncate text-xs text-q-text-secondary">{lead.email}</p>
                            </button>
                        ))}
                        {leads.length === 0 && (
                            <p className="text-sm leading-6 text-q-text-secondary">{t('realty.empty.noLeadsDesc')}</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default RealtyWorkspaceOverview;
