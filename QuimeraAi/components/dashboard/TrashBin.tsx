import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, RotateCcw, AlertTriangle, Clock, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useProject } from '../../contexts/project';
import { Project } from '../../types';
import Modal from '../ui/Modal';

const TrashBin: React.FC = () => {
    const { t } = useTranslation();
    const { deletedProjects, restoreFromTrash, permanentlyDelete } = useProject();
    const [isOpen, setIsOpen] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    if (deletedProjects.length === 0) return null;

    const handleRestore = async (projectId: string) => {
        setRestoringId(projectId);
        try {
            await restoreFromTrash(projectId);
        } catch (err) {
            console.error('Error restoring project:', err);
        } finally {
            setRestoringId(null);
        }
    };

    const handlePermanentDelete = async (projectId: string) => {
        setDeletingId(projectId);
        try {
            await permanentlyDelete(projectId);
        } catch (err) {
            console.error('Error permanently deleting project:', err);
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    const getTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return t('common.today');
        if (diffDays === 1) return t('common.yesterday');
        if (diffDays < 7) return t('common.daysAgo', { count: diffDays });
        if (diffDays < 30) return t('common.weeksAgo', { count: Math.floor(diffDays / 7) });
        return t('common.monthsAgo', { count: Math.floor(diffDays / 30) });
    };

    const getDaysRemaining = (dateStr: string) => {
        const deletedDate = new Date(dateStr);
        const expiryDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const remaining = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return remaining;
    };

    return (
        <>
            {/* Trash Bin Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-300"
                aria-expanded={isOpen}
                aria-controls="trash-panel"
            >
                <Trash2 size={18} className="text-red-400" />
                <span className="text-sm font-medium text-red-400">
                    {t('trash.title')}
                </span>
                <span className="bg-red-500/30 text-red-300 text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {deletedProjects.length}
                </span>
                {isOpen ? (
                    <ChevronUp size={16} className="text-red-400/60" />
                ) : (
                    <ChevronDown size={16} className="text-red-400/60" />
                )}
            </button>

            {/* Trash Panel */}
            {isOpen && (
                <div
                    id="trash-panel"
                    className="mt-4 rounded-2xl border border-red-500/15 bg-gradient-to-br from-red-950/20 via-background to-background overflow-hidden animate-fade-in"
                >
                    {/* Panel Header */}
                    <div className="px-6 py-4 border-b border-red-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-red-500/15">
                                <Trash2 size={20} className="text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-foreground">{t('trash.title')}</h3>
                                <p className="text-xs text-muted-foreground">{t('trash.subtitle')}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground"
                            aria-label={t('common.close')}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Auto-delete Warning */}
                    <div className="px-6 py-3 bg-amber-500/5 border-b border-amber-500/10 flex items-center gap-2">
                        <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                        <span className="text-xs text-amber-400/80">{t('trash.autoDeleteWarning')}</span>
                    </div>

                    {/* Project List */}
                    <div className="divide-y divide-border/30">
                        {deletedProjects.map((project: Project) => {
                            const deletedAt = (project as any).deletedAt;
                            const daysLeft = deletedAt ? getDaysRemaining(deletedAt) : 30;
                            const isRestoring = restoringId === project.id;
                            const isDeleting = deletingId === project.id;

                            return (
                                <div
                                    key={project.id}
                                    className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                                >
                                    {/* Project Info */}
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {/* Thumbnail or fallback */}
                                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-secondary/50 border border-border/30">
                                            {project.thumbnailUrl ? (
                                                <img
                                                    src={project.thumbnailUrl}
                                                    alt={project.name}
                                                    className="w-full h-full object-cover opacity-60"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Trash2 size={16} className="text-muted-foreground/40" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground/80 truncate">
                                                {project.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Clock size={12} className="text-muted-foreground/50" />
                                                <span className="text-xs text-muted-foreground/60">
                                                    {t('trash.deletedAgo', { time: deletedAt ? getTimeAgo(deletedAt) : '' })}
                                                </span>
                                                <span className="text-[10px] text-red-400/60 font-medium">
                                                    • {t('trash.daysLeft', { count: daysLeft })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleRestore(project.id)}
                                            disabled={isRestoring || isDeleting}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all text-xs font-medium disabled:opacity-50"
                                            aria-label={t('trash.restore')}
                                        >
                                            {isRestoring ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <RotateCcw size={14} />
                                            )}
                                            {t('trash.restore')}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDeleteId(project.id)}
                                            disabled={isRestoring || isDeleting}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all text-xs font-medium disabled:opacity-50"
                                            aria-label={t('trash.permanentDelete')}
                                        >
                                            {isDeleting ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={14} />
                                            )}
                                            {t('trash.permanentDelete')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Permanent Delete Confirmation Modal */}
            <Modal
                isOpen={!!confirmDeleteId}
                onClose={() => !deletingId && setConfirmDeleteId(null)}
                maxWidth="max-w-md"
            >
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-full bg-red-500/15">
                            <AlertTriangle size={24} className="text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold">{t('trash.permanentDeleteTitle')}</h3>
                    </div>
                    <p className="text-gray-400 mb-6">{t('trash.permanentDeleteMessage')}</p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={!!deletingId}
                            className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={() => confirmDeleteId && handlePermanentDelete(confirmDeleteId)}
                            disabled={!!deletingId}
                            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-2"
                        >
                            {deletingId && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t('trash.permanentDelete')}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default TrashBin;
