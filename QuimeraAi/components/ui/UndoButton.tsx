/**
 * UndoButton Component
 * 
 * Reusable button component for undo/redo functionality.
 * Can be used standalone or with the global UndoContext.
 * 
 * @example
 * // Standalone usage
 * <UndoButton onUndo={handleUndo} canUndo={true} />
 * 
 * // With redo
 * <UndoButton 
 *   onUndo={handleUndo} 
 *   canUndo={true} 
 *   showRedo 
 *   onRedo={handleRedo} 
 *   canRedo={true} 
 * />
 */

import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface UndoButtonProps {
    /** Handler for undo action */
    onUndo: () => void;
    /** Whether undo is available */
    canUndo: boolean;
    /** Description of last action (shown in tooltip) */
    lastActionDescription?: string | null;
    /** Whether to show redo button */
    showRedo?: boolean;
    /** Handler for redo action */
    onRedo?: () => void;
    /** Whether redo is available */
    canRedo?: boolean;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Style variant */
    variant?: 'default' | 'ghost' | 'outline';
    /** Additional className */
    className?: string;
    /** Show labels instead of just icons */
    showLabels?: boolean;
    /** Orientation of buttons */
    orientation?: 'horizontal' | 'vertical';
}

const sizeClasses = {
    sm: 'h-7 w-7 [&_svg]:w-3.5 [&_svg]:h-3.5',
    md: 'h-9 w-9 [&_svg]:w-4 [&_svg]:h-4',
    lg: 'h-10 w-10 [&_svg]:w-5 [&_svg]:h-5',
};

const sizeLabelClasses = {
    sm: 'h-7 px-2 gap-1 text-xs',
    md: 'h-9 px-3 gap-1.5 text-sm',
    lg: 'h-10 px-4 gap-2 text-sm',
};

const variantClasses = {
    default: 'bg-secondary hover:bg-secondary/80 text-foreground',
    ghost: 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground',
    outline: 'border border-border hover:bg-secondary/50 text-muted-foreground hover:text-foreground',
};

const disabledClasses = 'opacity-40 cursor-not-allowed pointer-events-none';

export const UndoButton: React.FC<UndoButtonProps> = ({
    onUndo,
    canUndo,
    lastActionDescription,
    showRedo = false,
    onRedo,
    canRedo = false,
    size = 'md',
    variant = 'ghost',
    className = '',
    showLabels = false,
    orientation = 'horizontal',
}) => {
    const { t } = useTranslation();

    const baseButtonClasses = `
    inline-flex items-center justify-center rounded-md transition-colors
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
  `;

    const buttonClasses = (enabled: boolean) => `
    ${baseButtonClasses}
    ${showLabels ? sizeLabelClasses[size] : sizeClasses[size]}
    ${variantClasses[variant]}
    ${!enabled ? disabledClasses : ''}
  `;

    const containerClasses = `
    flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} gap-1
    ${className}
  `;

    const undoTitle = lastActionDescription
        ? `${t('undo.button', 'Deshacer')}: ${lastActionDescription}`
        : t('undo.button', 'Deshacer');

    return (
        <div className={containerClasses}>
            {/* Undo Button */}
            <button
                onClick={onUndo}
                disabled={!canUndo}
                className={buttonClasses(canUndo)}
                title={undoTitle}
                aria-label={undoTitle}
            >
                <Undo2 />
                {showLabels && <span>{t('undo.button', 'Deshacer')}</span>}
            </button>

            {/* Redo Button (optional) */}
            {showRedo && onRedo && (
                <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className={buttonClasses(canRedo)}
                    title={t('undo.redo', 'Rehacer')}
                    aria-label={t('undo.redo', 'Rehacer')}
                >
                    <Redo2 />
                    {showLabels && <span>{t('undo.redo', 'Rehacer')}</span>}
                </button>
            )}
        </div>
    );
};

/**
 * Compact undo/redo button group for headers
 */
export const UndoRedoGroup: React.FC<Omit<UndoButtonProps, 'showRedo'> & {
    onRedo: () => void;
    canRedo: boolean;
}> = (props) => {
    return (
        <UndoButton
            {...props}
            showRedo={true}
        />
    );
};

/**
 * Minimal undo indicator that shows last action
 */
export const UndoIndicator: React.FC<{
    canUndo: boolean;
    lastActionDescription: string | null;
    onUndo: () => void;
}> = ({ canUndo, lastActionDescription, onUndo }) => {
    const { t } = useTranslation();

    if (!canUndo || !lastActionDescription) return null;

    return (
        <button
            onClick={onUndo}
            className="
        flex items-center gap-2 px-3 py-1.5 rounded-lg
        bg-amber-500/10 text-amber-600 dark:text-amber-400
        hover:bg-amber-500/20 transition-colors text-sm
      "
        >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="max-w-[200px] truncate">
                {t('undo.button', 'Deshacer')}: {lastActionDescription}
            </span>
        </button>
    );
};

export default UndoButton;
