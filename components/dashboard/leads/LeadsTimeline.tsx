import React, { useState } from 'react';
import { LeadActivity, ActivityType } from '../../../types';
import { Phone, Mail, Calendar, MessageSquare, TrendingUp, CheckCircle, Plus, Loader2 } from 'lucide-react';

interface LeadsTimelineProps {
    activities: LeadActivity[];
    onAddActivity: (activity: { type: ActivityType; title: string; description?: string }) => Promise<void>;
}

const ACTIVITY_ICONS: Record<ActivityType, { icon: React.ElementType; color: string; bgColor: string }> = {
    call: { icon: Phone, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    email: { icon: Mail, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    meeting: { icon: Calendar, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    note: { icon: MessageSquare, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    status_change: { icon: TrendingUp, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    task_completed: { icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
};

const LeadsTimeline: React.FC<LeadsTimelineProps> = ({ activities, onAddActivity }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newActivity, setNewActivity] = useState<{ type: ActivityType; title: string; description: string }>({
        type: 'note',
        title: '',
        description: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newActivity.title.trim()) return;

        setIsSubmitting(true);
        try {
            await onAddActivity({
                type: newActivity.type,
                title: newActivity.title,
                description: newActivity.description || undefined
            });
            setNewActivity({ type: 'note', title: '', description: '' });
            setIsAdding(false);
        } catch (error) {
            console.error('Error adding activity:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (timestamp: { seconds: number; nanoseconds: number }) => {
        const date = new Date(timestamp.seconds * 1000);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Activity Timeline</h3>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="text-xs text-primary hover:underline font-bold flex items-center"
                    >
                        <Plus size={12} className="mr-1" /> Log Activity
                    </button>
                )}
            </div>

            {/* Add Activity Form */}
            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-secondary/20 border border-border rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                            <select 
                                value={newActivity.type}
                                onChange={e => setNewActivity({...newActivity, type: e.target.value as ActivityType})}
                                className="w-full bg-card border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="call">Phone Call</option>
                                <option value="email">Email</option>
                                <option value="meeting">Meeting</option>
                                <option value="note">Note</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                            <input 
                                type="text"
                                value={newActivity.title}
                                onChange={e => setNewActivity({...newActivity, title: e.target.value})}
                                placeholder="Quick summary..."
                                className="w-full bg-card border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
                        <textarea 
                            value={newActivity.description}
                            onChange={e => setNewActivity({...newActivity, description: e.target.value})}
                            placeholder="Additional details..."
                            className="w-full bg-card border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                            rows={2}
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button 
                            type="button"
                            onClick={() => {
                                setIsAdding(false);
                                setNewActivity({ type: 'note', title: '', description: '' });
                            }}
                            className="px-3 py-1.5 text-sm border border-border rounded hover:bg-secondary transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting || !newActivity.title.trim()}
                            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-colors disabled:opacity-50 flex items-center"
                        >
                            {isSubmitting ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />}
                            Add Activity
                        </button>
                    </div>
                </form>
            )}

            {/* Timeline */}
            <div className="space-y-3">
                {activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm italic">
                        No activities yet. Log your first interaction!
                    </div>
                ) : (
                    activities.map((activity, index) => {
                        const config = ACTIVITY_ICONS[activity.type];
                        const Icon = config.icon;
                        
                        return (
                            <div key={activity.id} className="relative flex gap-3">
                                {/* Timeline Line */}
                                {index < activities.length - 1 && (
                                    <div className="absolute left-[15px] top-8 w-0.5 h-full bg-border" />
                                )}
                                
                                {/* Icon */}
                                <div className={`relative z-10 shrink-0 w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
                                    <Icon size={14} className={config.color} />
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 pb-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-foreground">{activity.title}</h4>
                                            {activity.description && (
                                                <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                                            )}
                                            {activity.metadata && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {activity.metadata.duration && (
                                                        <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                                                            {activity.metadata.duration} min
                                                        </span>
                                                    )}
                                                    {activity.metadata.oldStatus && activity.metadata.newStatus && (
                                                        <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                                                            {activity.metadata.oldStatus} → {activity.metadata.newStatus}
                                                        </span>
                                                    )}
                                                    {activity.metadata.emailSubject && (
                                                        <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                                                            "{activity.metadata.emailSubject}"
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {formatDate(activity.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default LeadsTimeline;

