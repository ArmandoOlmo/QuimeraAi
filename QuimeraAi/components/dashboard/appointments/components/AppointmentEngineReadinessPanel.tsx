import React from 'react';
import {
    Bot,
    CalendarClock,
    CheckCircle2,
    Clock3,
    CreditCard,
    Database,
    Globe2,
    Mail,
    ShieldAlert,
    UserRoundCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AppointmentAnalytics, AppointmentsBlueprint } from '../../../../types';

type ReadinessState = 'ready' | 'review' | 'action';

interface AppointmentEngineReadinessPanelProps {
    analytics: AppointmentAnalytics;
    appointmentsBlueprint?: AppointmentsBlueprint | null;
    googleConfigured: boolean;
    googleConnected: boolean;
    hasLegacyBlockedDates: boolean;
    legacyBlockedDateCount: number;
}

interface ReadinessItem {
    key: string;
    state: ReadinessState;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const stateStyles: Record<ReadinessState, string> = {
    ready: 'border-q-success/25 bg-q-success/10 text-q-success',
    review: 'border-q-warning/30 bg-q-warning/10 text-q-warning',
    action: 'border-q-error/25 bg-q-error/10 text-q-error',
};

const stateDotStyles: Record<ReadinessState, string> = {
    ready: 'bg-q-success',
    review: 'bg-q-warning',
    action: 'bg-q-error',
};

export const AppointmentEngineReadinessPanel: React.FC<AppointmentEngineReadinessPanelProps> = ({
    analytics,
    appointmentsBlueprint,
    googleConfigured,
    googleConnected,
    hasLegacyBlockedDates,
    legacyBlockedDateCount,
}) => {
    const { t } = useTranslation();
    const engine = analytics.engine;
    const publicBooking = appointmentsBlueprint?.publicBooking;
    const chatcore = appointmentsBlueprint?.chatcore;
    const crm = appointmentsBlueprint?.crm;
    const emailMarketing = appointmentsBlueprint?.emailMarketing;
    const ecommerce = appointmentsBlueprint?.ecommerce;
    const availabilityConfigured = appointmentsBlueprint?.availabilityStatus === 'configured';
    const hasAvailabilityDraft = Boolean(appointmentsBlueprint?.availability?.weeklyHours?.some(rule => rule.enabled));
    const hasPublicBookingSignals = Boolean(publicBooking?.enabled || engine?.publicBookings);
    const hasChatCoreSignals = Boolean(chatcore?.enabled || engine?.chatCoreBookings);
    const hasCrmSignals = Boolean(crm?.enabled || engine?.linkedLeadCount);
    const hasPaidSignals = Boolean(ecommerce?.enabled || engine?.paidBookingCount);

    const items: ReadinessItem[] = [
        {
            key: 'canonicalSource',
            state: 'ready',
            icon: Database,
        },
        {
            key: 'availability',
            state: availabilityConfigured ? 'ready' : hasAvailabilityDraft ? 'review' : 'action',
            icon: CalendarClock,
        },
        {
            key: 'publicBooking',
            state: publicBooking?.status === 'configured' || engine?.publicBookings ? 'ready' : hasPublicBookingSignals ? 'review' : 'action',
            icon: Globe2,
        },
        {
            key: 'chatcore',
            state: hasChatCoreSignals ? 'ready' : 'review',
            icon: Bot,
        },
        {
            key: 'crm',
            state: hasCrmSignals ? 'ready' : 'review',
            icon: UserRoundCheck,
        },
        {
            key: 'emailMarketing',
            state: emailMarketing?.status === 'configured' ? 'ready' : emailMarketing?.enabled ? 'review' : 'action',
            icon: Mail,
        },
        {
            key: 'googleCalendar',
            state: googleConnected ? 'ready' : googleConfigured ? 'review' : 'action',
            icon: CheckCircle2,
        },
        {
            key: 'ecommerce',
            state: engine?.paidBookingCount ? 'ready' : hasPaidSignals ? 'review' : 'action',
            icon: CreditCard,
        },
        {
            key: 'legacyBlockedDates',
            state: hasLegacyBlockedDates ? 'review' : 'ready',
            icon: ShieldAlert,
        },
    ];

    const readyCount = items.filter(item => item.state === 'ready').length;

    return (
        <section className="border-b border-q-border bg-q-bg px-3 py-3 sm:px-6">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-q-text-muted">
                        {t('appointments.readiness.eyebrow')}
                    </p>
                    <h2 className="text-sm font-semibold text-foreground">
                        {t('appointments.readiness.title')}
                    </h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-q-text-muted">
                    <Clock3 className="h-4 w-4" strokeWidth={2} />
                    <span>
                        {t('appointments.readiness.score', { ready: readyCount, total: items.length })}
                    </span>
                </div>
            </div>

            <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-9">
                {items.map(({ key, state, icon: Icon }) => (
                    <div key={key} className="rounded-lg border border-q-border/60 bg-q-surface/60 px-3 py-2">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <Icon className="h-4 w-4 text-q-text-muted" strokeWidth={2} />
                            <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${stateStyles[state]}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${stateDotStyles[state]}`} />
                                {t(`appointments.readiness.states.${state}`)}
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-foreground">
                            {t(`appointments.readiness.items.${key}.title`)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-q-text-muted">
                            {t(`appointments.readiness.items.${key}.${state}`, {
                                count: legacyBlockedDateCount,
                            })}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default AppointmentEngineReadinessPanel;
