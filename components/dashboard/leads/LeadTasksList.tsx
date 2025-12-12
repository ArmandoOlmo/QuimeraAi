import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LeadTask } from '../../../types';
import { CheckCircle2, Circle, Plus, Trash2, Calendar, AlertCircle, Loader2 } from 'lucide-react';

interface LeadTasksListProps {
    tasks: LeadTask[];
    onAddTask: (task: { title: string; description?: string; dueDate: Date; priority: 'low' | 'medium' | 'high' }) => Promise<void>;
    onUpdateTask: (taskId: string, data: Partial<LeadTask>) => Promise<void>;
    onDeleteTask: (taskId: string) => Promise<void>;
}

const PRIORITY_COLORS = {
    low: 'text-gray-500 bg-gray-500/10',
    medium: 'text-yellow-500 bg-yellow-500/10',
    high: 'text-red-500 bg-red-500/10'
};

const LeadTasksList: React.FC<LeadTasksListProps> = ({ tasks, onAddTask, onUpdateTask, onDeleteTask }) => {
    const { t } = useTranslation();
    const [isAdding, setIsAdding] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium' as 'low' | 'medium' | 'high'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.title.trim() || !newTask.dueDate) return;

        setIsSubmitting(true);
        try {
            await onAddTask({
                title: newTask.title,
                description: newTask.description || undefined,
                dueDate: new Date(newTask.dueDate),
                priority: newTask.priority
            });
            setNewTask({ title: '', description: '', dueDate: '', priority: 'medium' });
            setIsAdding(false);
        } catch (error) {
            console.error('Error adding task:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleTaskComplete = async (task: LeadTask) => {
        await onUpdateTask(task.id, {
            completed: !task.completed,
            completedAt: !task.completed ? { seconds: Date.now() / 1000, nanoseconds: 0 } : undefined
        });
    };

    const formatDueDate = (dueDate: { seconds: number; nanoseconds: number }) => {
        const date = new Date(dueDate.seconds * 1000);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / 86400000);

        if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, color: 'text-red-500', urgent: true };
        if (diffDays === 0) return { text: 'Today', color: 'text-orange-500', urgent: true };
        if (diffDays === 1) return { text: 'Tomorrow', color: 'text-yellow-500', urgent: false };
        if (diffDays <= 7) return { text: `${diffDays}d`, color: 'text-foreground', urgent: false };

        return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'text-muted-foreground', urgent: false };
    };

    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    {t('leads.tasks.title')}
                    {pendingTasks.length > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-bold">
                            {pendingTasks.length}
                        </span>
                    )}
                </h3>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="text-xs text-primary hover:underline font-bold flex items-center"
                    >
                        <Plus size={12} className="mr-1" />{t('leads.tasks.addTask')}
                    </button>
                )}
            </div>

            {/* Add Task Form */}
            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-secondary/20 border border-border rounded-xl p-4 space-y-3">
                    <div>
                        <input
                            type="text"
                            value={newTask.title}
                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                            placeholder="Task title..."
                            className="w-full bg-card border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <textarea
                            value={newTask.description}
                            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                            placeholder="Description (optional)..."
                            className="w-full bg-card border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                            rows={2}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
                            <input
                                type="date"
                                value={newTask.dueDate}
                                onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                                className="w-full bg-card border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                            <select
                                value={newTask.priority}
                                onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                                className="w-full bg-card border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setIsAdding(false);
                                setNewTask({ title: '', description: '', dueDate: '', priority: 'medium' });
                            }}
                            className="px-3 py-1.5 text-sm border border-border rounded hover:bg-secondary transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !newTask.title.trim() || !newTask.dueDate}
                            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-colors disabled:opacity-50 flex items-center"
                        >
                            {isSubmitting ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />}
                            {t('leads.tasks.addTask')}
                        </button>
                    </div>
                </form>
            )}

            {/* Tasks List */}
            <div className="space-y-2">
                {/* Pending Tasks */}
                {pendingTasks.length > 0 && (
                    <div className="space-y-2">
                        {pendingTasks.map(task => {
                            const dueDateInfo = formatDueDate(task.dueDate);

                            return (
                                <div
                                    key={task.id}
                                    className="group flex items-start gap-3 bg-card border border-border rounded-lg p-3 hover:shadow-sm transition-all"
                                >
                                    <button
                                        onClick={() => toggleTaskComplete(task)}
                                        className="shrink-0 mt-0.5 text-muted-foreground hover:text-green-500 transition-colors"
                                    >
                                        <Circle size={18} />
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
                                                {task.description && (
                                                    <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => onDeleteTask(task.id)}
                                                className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-red-500 hover:bg-red-500/10 rounded transition-all"
                                                title="Delete task"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`text-xs flex items-center gap-1 ${dueDateInfo.color}`}>
                                                {dueDateInfo.urgent && <AlertCircle size={12} />}
                                                <Calendar size={12} />
                                                {dueDateInfo.text}
                                            </span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${PRIORITY_COLORS[task.priority]}`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                    <details className="group/details">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
                            Completed ({completedTasks.length})
                        </summary>
                        <div className="space-y-2 mt-2">
                            {completedTasks.map(task => (
                                <div
                                    key={task.id}
                                    className="group flex items-start gap-3 bg-secondary/20 border border-border/50 rounded-lg p-3 opacity-60"
                                >
                                    <button
                                        onClick={() => toggleTaskComplete(task)}
                                        className="shrink-0 mt-0.5 text-green-500 hover:text-muted-foreground transition-colors"
                                    >
                                        <CheckCircle2 size={18} />
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <h4 className="text-sm font-medium text-foreground line-through">{task.title}</h4>
                                                {task.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 line-through">{task.description}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => onDeleteTask(task.id)}
                                                className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-red-500 hover:bg-red-500/10 rounded transition-all"
                                                title="Delete task"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
                )}

                {/* Empty State */}
                {tasks.length === 0 && !isAdding && (
                    <div className="text-center py-8 text-muted-foreground text-sm italic">
                        {t('leads.tasks.noTasks')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeadTasksList;

