/**
 * UpcomingRenewalsPanel
 * Display upcoming renewals and trial expirations
 */

import React from 'react';
import { UpcomingRenewal } from '../../../hooks/useAgencyMetrics';
import { Calendar, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { useRouter } from '../../../hooks/useRouter';

interface UpcomingRenewalsPanelProps {
    renewals: UpcomingRenewal[];
    maxVisible?: number;
}

export function UpcomingRenewalsPanel({
    renewals,
    maxVisible = 5,
}: UpcomingRenewalsPanelProps) {
    const { navigate } = useRouter();
    const visibleRenewals = renewals.slice(0, maxVisible);
    const hasMore = renewals.length > maxVisible;

    const formatDate = (date: Date): string => {
        return new Intl.DateTimeFormat('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(date);
    };

    const getDaysColor = (days: number): string => {
        if (days <= 7) return 'text-red-600 dark:text-red-400';
        if (days <= 14) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-blue-600 dark:text-blue-400';
    };

    const getDaysBadgeColor = (days: number): string => {
        if (days <= 7)
            return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400';
        if (days <= 14)
            return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400';
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400';
    };

    const handleRenewalClick = (renewal: UpcomingRenewal) => {
        navigate(`/dashboard/agency/clients/${renewal.clientId}`);
    };

    if (renewals.length === 0) {
        return (
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    Renovaciones Próximas
                </h3>
                <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        No hay renovaciones próximas
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Las renovaciones de los próximos 30 días aparecerán aquí
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                    Renovaciones Próximas
                </h3>
                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400">
                    {renewals.length}
                </span>
            </div>

            <div className="space-y-3">
                {visibleRenewals.map((renewal) => (
                    <button
                        key={renewal.clientId}
                        onClick={() => handleRenewalClick(renewal)}
                        className="w-full text-left p-4 rounded-lg border border-border hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-md"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                {/* Client Name */}
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="font-medium text-foreground truncate">
                                        {renewal.clientName}
                                    </p>
                                    {renewal.status === 'trial' && (
                                        <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400">
                                            <Clock className="h-3 w-3" />
                                            Trial
                                        </span>
                                    )}
                                </div>

                                {/* Renewal Date */}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4 flex-shrink-0" />
                                    <span>{formatDate(renewal.renewalDate)}</span>
                                </div>

                                {/* Monthly Price */}
                                {renewal.monthlyPrice && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                        <DollarSign className="h-4 w-4 flex-shrink-0" />
                                        <span>${renewal.monthlyPrice}/mes</span>
                                    </div>
                                )}

                                {/* Warning for soon-expiring trials */}
                                {renewal.status === 'trial' && renewal.daysUntilRenewal <= 7 && (
                                    <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
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
                    onClick={() => navigate('/dashboard/agency/renewals')}
                    className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                    Ver todas las renovaciones ({renewals.length})
                </button>
            )}
        </div>
    );
}
