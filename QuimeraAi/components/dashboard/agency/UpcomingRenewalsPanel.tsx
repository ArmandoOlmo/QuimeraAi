/**
 * UpcomingRenewalsPanel
 * Display upcoming renewals and trial expirations
 */

import React, { useState } from 'react';
import { UpcomingRenewal } from '../../../hooks/useAgencyMetrics';
import { Calendar, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { AgencyEmptyState, AgencyPanel } from './AgencyDesignSystem';
import { StatusBadge } from '../../ui/system';

interface UpcomingRenewalsPanelProps {
    renewals: UpcomingRenewal[];
    maxVisible?: number;
    onSelectClient?: (clientId: string) => void;
}

export function UpcomingRenewalsPanel({
    renewals,
    maxVisible = 5,
    onSelectClient,
}: UpcomingRenewalsPanelProps) {
    const [showAll, setShowAll] = useState(false);
    const visibleRenewals = showAll ? renewals : renewals.slice(0, maxVisible);
    const hasMore = renewals.length > maxVisible;

    const formatDate = (date: Date): string => {
        return new Intl.DateTimeFormat('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(date);
    };

    const getDaysBadgeColor = (days: number): string => {
        if (days <= 7)
            return 'bg-q-error/10 dark:bg-q-error/12 text-q-error dark:text-q-error';
        if (days <= 14)
            return 'bg-q-accent/10 dark:bg-q-accent/12 text-q-accent dark:text-q-accent';
        return 'bg-q-accent/10 dark:bg-q-accent/12 text-q-accent dark:text-q-accent';
    };

    const handleRenewalClick = (renewal: UpcomingRenewal) => {
        onSelectClient?.(renewal.clientId);
    };

    if (renewals.length === 0) {
        return (
            <AgencyPanel title="Renovaciones Próximas" icon={Calendar}>
                <AgencyEmptyState
                    icon={Calendar}
                    title="Sin renovaciones próximas"
                    description="Las renovaciones de los próximos 30 días aparecerán aquí."
                />
            </AgencyPanel>
        );
    }

    return (
        <AgencyPanel
            title="Renovaciones Próximas"
            icon={Calendar}
            action={<StatusBadge size="sm" variant="warning">{renewals.length}</StatusBadge>}
        >
            <div className="space-y-3">
                {visibleRenewals.map((renewal) => (
                    <button
                        key={renewal.clientId}
                        onClick={() => handleRenewalClick(renewal)}
                        className="w-full text-left p-4 rounded-lg border border-q-border transition-colors hover:border-q-border hover:bg-muted/35"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                {/* Client Name */}
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="font-medium text-foreground truncate">
                                        {renewal.clientName}
                                    </p>
                                    {renewal.status === 'trial' && (
                                        <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-q-accent/10 dark:bg-q-accent/12 text-q-accent dark:text-q-accent">
                                            <Clock className="h-3 w-3" />
                                            Trial
                                        </span>
                                    )}
                                </div>

                                {/* Renewal Date */}
                                <div className="flex items-center gap-2 text-sm text-q-text-muted">
                                    <Calendar className="h-4 w-4 flex-shrink-0" />
                                    <span>{formatDate(renewal.renewalDate)}</span>
                                </div>

                                {/* Monthly Price */}
                                {renewal.monthlyPrice && (
                                    <div className="flex items-center gap-2 text-sm text-q-text-muted mt-1">
                                        <DollarSign className="h-4 w-4 flex-shrink-0" />
                                        <span>${renewal.monthlyPrice}/mes</span>
                                    </div>
                                )}

                                {/* Warning for soon-expiring trials */}
                                {renewal.status === 'trial' && renewal.daysUntilRenewal <= 7 && (
                                    <div className="flex items-center gap-1 text-xs text-q-error dark:text-q-error mt-2 font-medium">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        <span>Trial expira pronto - Contactar cliente</span>
                                    </div>
                                )}
                            </div>

                            {/* Days Badge */}
                            <div className="flex-shrink-0">
                                <span
                                    className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-semibold ${getDaysBadgeColor(
                                        renewal.daysUntilRenewal
                                    )}`}
                                >
                                    {renewal.daysUntilRenewal}d
                                </span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {hasMore && (
                <button
                    onClick={() => setShowAll((value) => !value)}
                    className="w-full mt-4 text-sm text-q-accent dark:text-q-accent hover:text-q-accent dark:hover:text-q-accent font-medium"
                >
                    {showAll ? 'Mostrar menos' : `Ver todas las renovaciones (${renewals.length})`}
                </button>
            )}
        </AgencyPanel>
    );
}
