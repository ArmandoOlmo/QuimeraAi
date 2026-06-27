/**
 * ClientActivityFeed
 * Real-time activity feed showing events across all sub-clients
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityEvent } from '../../../hooks/useAgencyMetrics';
import {
    getActivityColor,
    formatTimeAgo,
} from '../../../contexts/agency/AgencyContext';
import {
    UserPlus,
    UserCheck,
    FileText,
    DollarSign,
    FolderPlus,
    Globe,
    Activity,
    FileCheck2,
} from 'lucide-react';
import { AgencyPanel } from './AgencyDesignSystem';
import { getPortalReportDeliveryStatus } from './agencyActivityDisplay';
import { StatusBadge } from '../../ui/system';

interface ClientActivityFeedProps {
    activities: ActivityEvent[];
    maxVisible?: number;
}

export function ClientActivityFeed({
    activities,
    maxVisible = 10,
}: ClientActivityFeedProps) {
    const { t } = useTranslation();
    const [showAll, setShowAll] = useState(false);
    const visibleActivities = showAll ? activities : activities.slice(0, maxVisible);
    const hasMore = activities.length > maxVisible;

    const getIconComponent = (type: ActivityEvent['type']) => {
        const iconMap: Record<ActivityEvent['type'], React.ReactNode> = {
            client_created: <UserPlus className="h-5 w-5" />,
            client_updated: <UserCheck className="h-5 w-5" />,
            report_generated: <FileText className="h-5 w-5" />,
            payment_received: <DollarSign className="h-5 w-5" />,
            project_created: <FolderPlus className="h-5 w-5" />,
            project_published: <Globe className="h-5 w-5" />,
            project_transferred: <FolderPlus className="h-5 w-5" />,
            approval_responded: <UserCheck className="h-5 w-5" />,
        };
        return iconMap[type] || <Activity className="h-5 w-5" />;
    };

    if (activities.length === 0) {
        return (
            <AgencyPanel title="Actividad Reciente" icon={Activity}>
                <div className="text-center py-8">
                    <Activity className="h-10 w-10 text-q-text-muted/40 mx-auto mb-4" strokeWidth={1.5} />
                    <p className="text-q-text-muted">
                        No hay actividad reciente
                    </p>
                    <p className="text-sm text-q-text-muted dark:text-gray-500 mt-1">
                        La actividad de tus clientes aparecerá aquí
                    </p>
                </div>
            </AgencyPanel>
        );
    }

    return (
        <AgencyPanel
            title="Actividad Reciente"
            icon={Activity}
            action={
                <span className="text-sm text-q-text-muted">
                    Últimas {activities.length} actividades
                </span>
            }
        >

            <div className="space-y-2">
                {visibleActivities.map((activity) => {
                    const portalReportStatus = getPortalReportDeliveryStatus(activity);

                    return (
                        <div
                            key={activity.id}
                            className="flex items-start gap-3 rounded-lg border border-transparent p-3 transition-colors hover:border-q-border/70 hover:bg-muted/40"
                        >
                            {/* Icon */}
                            <div
                                className={`flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0 ${activity.type === 'client_created'
                                    ? 'bg-q-success/10 dark:bg-q-success/12'
                                    : activity.type === 'payment_received'
                                        ? 'bg-q-success/10 dark:bg-q-success/12'
                                        : activity.type === 'report_generated'
                                            ? 'bg-q-accent/10 dark:bg-q-accent/12'
                                            : activity.type === 'project_published'
                                                ? 'bg-q-warning/10 dark:bg-q-warning/12'
                                                : 'bg-q-accent/10 dark:bg-q-accent/12'
                                    }`}
                            >
                                <span className={getActivityColor(activity.type)}>
                                    {getIconComponent(activity.type)}
                                </span>
                            </div>

                        {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground">
                                    {activity.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    {activity.clientName && (
                                        <span className="text-xs text-q-text-muted">
                                            {activity.clientName}
                                        </span>
                                    )}
                                    {activity.userName && (
                                        <>
                                            <span className="text-xs text-q-text-muted">•</span>
                                            <span className="text-xs text-q-text-muted">
                                                por {activity.userName}
                                            </span>
                                        </>
                                    )}
                                </div>
                                {portalReportStatus && (
                                    <div className="mt-2">
                                        <StatusBadge
                                            size="sm"
                                            variant={portalReportStatus === 'published' ? 'success' : 'info'}
                                            className="gap-1"
                                        >
                                            <FileCheck2 className="h-3.5 w-3.5" />
                                            {portalReportStatus === 'published'
                                                ? t('dashboard.agency.activityFeed.portalPublished', 'Published in Client Portal')
                                                : t('dashboard.agency.activityFeed.portalSent', 'Shared in Client Portal')}
                                        </StatusBadge>
                                    </div>
                                )}
                            </div>

                            {/* Timestamp */}
                            <div className="flex-shrink-0 text-xs text-q-text-muted">
                                {formatTimeAgo(activity.timestamp)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {hasMore && !showAll && (
                <button
                    onClick={() => setShowAll(true)}
                    className="w-full mt-4 text-sm quimera-status-card-link font-medium"
                >
                    Ver todas las actividades ({activities.length})
                </button>
            )}

            {showAll && (
                <button
                    onClick={() => setShowAll(false)}
                    className="w-full mt-4 text-sm text-q-text-muted hover:text-foreground font-medium"
                >
                    Mostrar menos
                </button>
            )}
        </AgencyPanel>
    );
}
