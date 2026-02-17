/**
 * BlockDateModal
 * Modal para crear/editar bloqueos de fecha/hora en el calendario
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, Clock, Ban, Trash2, Loader2 } from 'lucide-react';
import { BlockedDate } from '../../../../types';
import { dateToTimestamp, timestampToDate } from '../utils/appointmentHelpers';
import ConfirmationModal from '../../../ui/ConfirmationModal';

// =============================================================================
// TYPES
// =============================================================================

interface BlockDateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<BlockedDate, 'id' | 'createdAt' | 'createdBy' | 'projectId'>) => Promise<any>;
    onDelete?: (id: string) => Promise<void>;
    editingBlock?: BlockedDate | null;
    initialDate?: Date;
    initialHour?: number;
}

// =============================================================================
// HELPERS
// =============================================================================

const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatTimeForInput = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const BlockDateModal: React.FC<BlockDateModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    editingBlock,
    initialDate,
    initialHour,
}) => {
    const { t } = useTranslation();

    // Form state
    const [title, setTitle] = useState('');
    const [allDay, setAllDay] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');
    const [reason, setReason] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isEditing = !!editingBlock;

    // Initialize form
    useEffect(() => {
        if (!isOpen) return;

        if (editingBlock) {
            const start = timestampToDate(editingBlock.startDate);
            const end = timestampToDate(editingBlock.endDate);
            setTitle(editingBlock.title);
            setAllDay(editingBlock.allDay);
            setStartDate(formatDateForInput(start));
            setEndDate(formatDateForInput(end));
            setStartTime(formatTimeForInput(start));
            setEndTime(formatTimeForInput(end));
            setReason(editingBlock.reason || '');
        } else {
            const defaultDate = initialDate || new Date();
            setTitle('');
            setAllDay(initialHour === undefined);
            setStartDate(formatDateForInput(defaultDate));
            setEndDate(formatDateForInput(defaultDate));
            setStartTime(initialHour !== undefined ? `${String(initialHour).padStart(2, '0')}:00` : '09:00');
            setEndTime(initialHour !== undefined ? `${String(initialHour + 1).padStart(2, '0')}:00` : '18:00');
            setReason('');
        }
    }, [isOpen, editingBlock, initialDate, initialHour]);

    // Handle save
    const handleSave = async () => {
        if (!title.trim()) return;

        setIsSaving(true);
        try {
            const startDateObj = new Date(startDate + 'T' + (allDay ? '00:00' : startTime));
            const endDateObj = new Date(endDate + 'T' + (allDay ? '23:59' : endTime));

            await onSave({
                title: title.trim(),
                allDay,
                startDate: dateToTimestamp(startDateObj),
                endDate: dateToTimestamp(endDateObj),
                reason: reason.trim() || undefined,
            });

            onClose();
        } catch (error) {
            console.error('Error saving block:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!editingBlock || !onDelete) return;
        setIsSaving(true);
        try {
            await onDelete(editingBlock.id);
            setShowDeleteConfirm(false);
            onClose();
        } catch (error) {
            console.error('Error deleting block:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const isValid = useMemo(() => {
        if (!title.trim()) return false;
        if (!startDate || !endDate) return false;
        const s = new Date(startDate + 'T' + (allDay ? '00:00' : startTime));
        const e = new Date(endDate + 'T' + (allDay ? '23:59' : endTime));
        return e > s;
    }, [title, startDate, endDate, startTime, endTime, allDay]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
                {/* Modal */}
                <div
                    className="
                        w-full max-w-lg bg-card rounded-2xl shadow-2xl
                        border border-border overflow-hidden
                        animate-in fade-in zoom-in-95 duration-200
                    "
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-destructive/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                                <Ban className="w-5 h-5 text-destructive" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">
                                    {isEditing
                                        ? t('appointments.blockedDates.editTitle')
                                        : t('appointments.blockedDates.title')
                                    }
                                </h2>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                {t('appointments.blockedDates.titleLabel')}
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('appointments.blockedDates.titlePlaceholder')}
                                className="
                                    w-full px-4 py-2.5 bg-background border border-border rounded-xl
                                    text-foreground placeholder:text-muted-foreground
                                    focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                                    transition-all text-sm
                                "
                                autoFocus
                            />
                        </div>

                        {/* All Day Toggle */}
                        <div className="flex items-center justify-between py-2 px-4 bg-muted/30 rounded-xl">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">
                                    {t('appointments.blockedDates.allDay')}
                                </span>
                            </div>
                            <button
                                onClick={() => setAllDay(!allDay)}
                                className={`
                                    relative w-11 h-6 rounded-full transition-colors duration-200
                                    ${allDay ? 'bg-destructive' : 'bg-muted'}
                                `}
                            >
                                <span
                                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                                    style={{ transform: allDay ? 'translateX(20px)' : 'translateX(0)' }}
                                />
                            </button>
                        </div>

                        {/* Date Fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                    {t('appointments.blockedDates.startDate')}
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="
                                        w-full px-3 py-2 bg-background border border-border rounded-lg
                                        text-foreground text-sm
                                        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                                        transition-all
                                    "
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                    {t('appointments.blockedDates.endDate')}
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    className="
                                        w-full px-3 py-2 bg-background border border-border rounded-lg
                                        text-foreground text-sm
                                        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                                        transition-all
                                    "
                                />
                            </div>
                        </div>

                        {/* Time Fields (only if not allDay) */}
                        {!allDay && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                                        <Clock size={12} className="inline mr-1" />
                                        {t('appointments.blockedDates.startTime')}
                                    </label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="
                                            w-full px-3 py-2 bg-background border border-border rounded-lg
                                            text-foreground text-sm
                                            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                                            transition-all
                                        "
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                                        <Clock size={12} className="inline mr-1" />
                                        {t('appointments.blockedDates.endTime')}
                                    </label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="
                                            w-full px-3 py-2 bg-background border border-border rounded-lg
                                            text-foreground text-sm
                                            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                                            transition-all
                                        "
                                    />
                                </div>
                            </div>
                        )}

                        {/* Reason */}
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                                {t('appointments.blockedDates.reason')}
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={t('appointments.blockedDates.reasonPlaceholder')}
                                rows={2}
                                className="
                                    w-full px-4 py-2.5 bg-background border border-border rounded-xl
                                    text-foreground placeholder:text-muted-foreground
                                    focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                                    transition-all text-sm resize-none
                                "
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
                        {isEditing && onDelete ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                                {t('appointments.blockedDates.delete')}
                            </button>
                        ) : (
                            <div />
                        )}

                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                                {t('appointments.actions.cancel')}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!isValid || isSaving}
                                className="
                                    flex items-center gap-2 px-5 py-2 text-sm font-medium
                                    bg-destructive text-destructive-foreground
                                    hover:bg-destructive/90
                                    rounded-lg transition-all
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    shadow-sm
                                "
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        {t('appointments.blockedDates.saving')}
                                    </>
                                ) : (
                                    <>
                                        <Ban size={16} />
                                        {isEditing
                                            ? t('appointments.blockedDates.save')
                                            : t('appointments.blockedDates.block')
                                        }
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                title={t('appointments.blockedDates.confirmDelete')}
                message={t('appointments.blockedDates.confirmDeleteMessage')}
                variant="danger"
                isLoading={isSaving}
            />
        </>
    );
};

export default BlockDateModal;
