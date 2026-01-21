/**
 * ClientActivityFeed
 * Real-time activity feed showing events across all sub-clients
 */

import React, { useState } from 'react';
import { ActivityEvent } from '../../../hooks/useAgencyMetrics';
import {
    getActivityIcon,
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
} from 'lucide-react';

interface ClientActivityFeedProps {
    activities: ActivityEvent[];
    maxVisible?: number;
}

export function ClientActivityFeed({
    activities,
    maxVisible = 10,
}: ClientActivityFeedProps) {
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
        };
        return iconMap[type] || <Activity className="h-5 w-5" />;
    };

    if (activities.length === 0) {
        return (
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    Actividad Reciente
                </h3>
                <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        No hay actividad reciente
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        La actividad de tus clientes aparecerá aquí
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                    Actividad Reciente
                </h3>
                <span className="text-sm text-muted-foreground">
                    Últimas {activities.length} actividades
                </span>
            </div>

            <div className="space-y-4">
                {visibleActivities.map((activity) => (
                    <div
                        key={activity.id}
                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                        {/* Icon */}
                        <div
                            className={`flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0 ${activity.type === 'client_created'
                                ? 'bg-green-100 dark:bg-green-900/20'
                                : activity.type === 'payment_received'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/20'
                                    : activity.type === 'report_generated'
                                        ? 'bg-purple-100 dark:bg-purple-900/20'
                                        : activity.type === 'project_published'
                                            ? 'bg-orange-100 dark:bg-orange-900/20'
                                            : 'bg-blue-100 dark:bg-blue-900/20'
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
                                    <span className="text-xs text-muted-foreground">
                                        {activity.clientName}
                                    </span>
                                )}
                                {activity.userName && (
                                    <>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs text-muted-foreground">
                                            por {activity.userName}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Timestamp */}
                        <div className="flex-shrink-0 text-xs text-muted-foreground">
                            {formatTimeAgo(activity.timestamp)}
                        </div>
                    </div>
                ))}
            </div>

            {hasMore && !showAll && (
                <button
                    onClick={() => setShowAll(true)}
                    className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                    Ver todas las actividades ({activities.length})
                </button>
            )}

            {showAll && (
                <button
                    onClick={() => setShowAll(false)}
                    className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground font-medium"
                >
                    Mostrar menos
                </button>
            )}
        </div>
    );
}
