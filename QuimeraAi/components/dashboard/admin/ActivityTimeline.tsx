import React from 'react';
import { 
    Clock, 
    User, 
    FileEdit, 
    Trash2, 
    Plus, 
    Settings,
    Shield,
    CheckCircle,
    AlertCircle,
    Info
} from 'lucide-react';

export type ActivityType = 'create' | 'edit' | 'delete' | 'config' | 'user' | 'system';
export type ActivitySeverity = 'info' | 'success' | 'warning' | 'error';

export interface Activity {
    id: string;
    type: ActivityType;
    severity: ActivitySeverity;
    title: string;
    description: string;
    timestamp: string;
    user?: {
        name: string;
        email: string;
    };
}

interface ActivityTimelineProps {
    activities: Activity[];
    maxItems?: number;
    onViewAll?: () => void;
}

/**
 * Timeline de actividad reciente del sistema
 * Muestra las acciones importantes realizadas por administradores
 */
const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ 
    activities, 
    maxItems = 5,
    onViewAll 
}) => {
    const displayActivities = activities.slice(0, maxItems);

    const getActivityIcon = (type: ActivityType) => {
        switch (type) {
            case 'create': return <Plus className="w-4 h-4" />;
            case 'edit': return <FileEdit className="w-4 h-4" />;
            case 'delete': return <Trash2 className="w-4 h-4" />;
            case 'config': return <Settings className="w-4 h-4" />;
            case 'user': return <User className="w-4 h-4" />;
            case 'system': return <Shield className="w-4 h-4" />;
            default: return <Info className="w-4 h-4" />;
        }
    };

    const getSeverityIcon = (severity: ActivitySeverity) => {
        switch (severity) {
            case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
            default: return <Info className="w-4 h-4 text-blue-400" />;
        }
    };

    const getSeverityColor = (severity: ActivitySeverity) => {
        switch (severity) {
            case 'success': return 'bg-green-500/10 border-green-500/20';
            case 'warning': return 'bg-yellow-500/10 border-yellow-500/20';
            case 'error': return 'bg-red-500/10 border-red-500/20';
            default: return 'bg-blue-500/10 border-blue-500/20';
        }
    };

    if (displayActivities.length === 0) {
        return (
            <div className="bg-q-surface border border-q-border rounded-xl p-6 text-center">
                <Clock className="w-12 h-12 text-q-text-secondary mx-auto mb-3 opacity-50" />
                <p className="text-q-text-secondary">No hay actividad reciente</p>
            </div>
        );
    }

    return (
        <div className="bg-q-surface border border-q-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-q-accent" />
                    <h2 className="text-lg font-bold text-q-text">Actividad Reciente</h2>
                </div>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-sm text-q-accent hover:text-q-accent/80 font-medium"
                    >
                        Ver todo
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {displayActivities.map((activity, index) => (
                    <div
                        key={activity.id}
                        className={`
                            relative pl-8 pb-3
                            ${index !== displayActivities.length - 1 ? 'border-l-2 border-q-border ml-2' : ''}
                        `}
                    >
                        {/* Timeline dot */}
                        <div className={`
                            absolute left-0 top-0 -ml-[9px] w-4 h-4 rounded-full border-2 border-q-bg
                            flex items-center justify-center
                            ${getSeverityColor(activity.severity)}
                        `}>
                            <div className="w-2 h-2 rounded-full bg-current" />
                        </div>

                        {/* Activity content */}
                        <div className="bg-q-bg border border-q-border rounded-lg p-3 hover:border-q-accent/50 transition-colors">
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2 flex-1">
                                    <div className="bg-q-surface p-1.5 rounded">
                                        {getActivityIcon(activity.type)}
                                    </div>
                                    <h3 className="text-sm font-semibold text-q-text">
                                        {activity.title}
                                    </h3>
                                    {getSeverityIcon(activity.severity)}
                                </div>
                                <span className="text-xs text-q-text-secondary whitespace-nowrap">
                                    {activity.timestamp}
                                </span>
                            </div>
                            
                            <p className="text-sm text-q-text-secondary ml-8">
                                {activity.description}
                            </p>
                            
                            {activity.user && (
                                <div className="flex items-center gap-2 mt-2 ml-8 text-xs text-q-text-secondary">
                                    <User className="w-3 h-3" />
                                    <span>{activity.user.name}</span>
                                    <span className="text-q-text-secondary/60">•</span>
                                    <span className="text-q-text-secondary/80">{activity.user.email}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {activities.length > maxItems && (
                <div className="mt-3 pt-3 border-t border-q-border text-center">
                    <button
                        onClick={onViewAll}
                        className="text-sm text-q-accent hover:text-q-accent/80 font-medium"
                    >
                        Ver {activities.length - maxItems} actividades más
                    </button>
                </div>
            )}
        </div>
    );
};

export default ActivityTimeline;































