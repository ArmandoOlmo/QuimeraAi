/**
 * ConfirmationModal
 * 
 * A reusable premium confirmation modal component that replaces native browser confirm dialogs.
 * Provides a consistent, branded user experience with support for:
 * - Different variants (danger, warning, info)
 * - Loading states during async operations
 * - Keyboard navigation (Escape to close)
 * - Customizable content and actions
 * 
 * @example
 * // Basic usage
 * <ConfirmationModal
 *   isOpen={showDeleteModal}
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDeleteModal(false)}
 *   title="Delete Item?"
 *   message="This action cannot be undone."
 *   variant="danger"
 * />
 */

import React, { useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ConfirmationModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Called when user confirms the action */
    onConfirm: () => void | Promise<void>;
    /** Called when user cancels or closes the modal */
    onCancel: () => void;
    /** Modal title */
    title?: string;
    /** Modal message/description */
    message?: string;
    /** Text for the confirm button */
    confirmText?: string;
    /** Text for the cancel button */
    cancelText?: string;
    /** Visual variant - affects colors and default icon */
    variant?: 'danger' | 'warning' | 'info';
    /** Show loading spinner in confirm button */
    isLoading?: boolean;
    /** Custom icon to display (overrides variant default) */
    icon?: ReactNode;
    /** Optional: count for bulk operations */
    count?: number;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onConfirm,
    onCancel,
    title,
    message,
    confirmText,
    cancelText,
    variant = 'danger',
    isLoading = false,
    icon,
    count,
}) => {
    const { t } = useTranslation();

    // Default texts based on variant
    const defaultTitle = variant === 'danger'
        ? t('common.confirmDelete', '¿Estás seguro?')
        : variant === 'warning'
            ? t('common.confirmAction', '¿Confirmar acción?')
            : t('common.confirm', 'Confirmar');

    const defaultMessage = variant === 'danger'
        ? count
            ? t('common.confirmDeleteMessagePlural', { count, defaultValue: `Esta acción eliminará ${count} elemento(s) permanentemente.` })
            : t('common.confirmDeleteMessage', 'Esta acción no se puede deshacer. El elemento será eliminado permanentemente.')
        : t('common.confirmActionMessage', '¿Deseas continuar con esta acción?');

    const defaultConfirmText = variant === 'danger'
        ? t('common.delete', 'Eliminar')
        : t('common.confirm', 'Confirmar');

    // Variant styles
    const variantStyles = {
        danger: {
            iconBg: 'bg-red-500/10',
            iconColor: 'text-red-500',
            buttonBg: 'bg-red-600 hover:bg-red-700',
            DefaultIcon: Trash2,
        },
        warning: {
            iconBg: 'bg-amber-500/10',
            iconColor: 'text-amber-500',
            buttonBg: 'bg-amber-600 hover:bg-amber-700',
            DefaultIcon: AlertTriangle,
        },
        info: {
            iconBg: 'bg-blue-500/10',
            iconColor: 'text-blue-500',
            buttonBg: 'bg-blue-600 hover:bg-blue-700',
            DefaultIcon: Info,
        },
    };

    const styles = variantStyles[variant];
    const IconComponent = styles.DefaultIcon;

    // Handle escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isLoading) {
            onCancel();
        }
    }, [onCancel, isLoading]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const portalRoot = document.getElementById('portal-root') || document.body;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
            style={{ zIndex: 9999 }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) {
                    onCancel();
                }
            }}
        >
            <div
                className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center mb-4 ${styles.iconColor} mx-auto`}>
                        {icon || <IconComponent size={24} />}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-center text-foreground mb-2">
                        {title || defaultTitle}
                    </h3>

                    {/* Message */}
                    <p className="text-center text-muted-foreground mb-6">
                        {message || defaultMessage}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="px-5 py-2.5 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors font-medium text-sm disabled:opacity-50"
                        >
                            {cancelText || t('common.cancel', 'Cancelar')}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`px-5 py-2.5 rounded-lg ${styles.buttonBg} text-white transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-70`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {t('common.processing', 'Procesando...')}
                                </>
                            ) : (
                                confirmText || defaultConfirmText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        portalRoot
    );
};

export default ConfirmationModal;
