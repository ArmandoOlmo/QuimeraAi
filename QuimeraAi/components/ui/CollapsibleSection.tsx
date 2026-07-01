import React, { useCallback, useState } from 'react';
import { ChevronDown, Settings2 } from 'lucide-react';

/**
 * Shared collapsible settings/inspector section used across every editor in the app.
 * Provides a consistent, professional look with an icon chip, title, optional badge,
 * and an animated expand/collapse body so each panel can economize vertical space.
 */
export interface CollapsibleSectionProps {
    title: string;
    icon?: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    badge?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    icon,
    isOpen,
    onToggle,
    badge,
    className = '',
    children,
}) => (
    <section className={`overflow-hidden rounded-xl border border-q-border bg-q-surface/70 shadow-[var(--shadow-card)] ${className}`}>
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-q-surface-elevated/60"
        >
            <span className="flex min-w-0 items-center gap-2.5">
                {icon && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-q-accent/12 text-q-accent">
                        {icon}
                    </span>
                )}
                <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-q-text">{title}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
                {badge}
                <ChevronDown
                    size={15}
                    className={`text-q-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </span>
        </button>
        <div className={`grid transition-all duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
                <div className="border-t border-q-border/70 p-3">{children}</div>
            </div>
        </div>
    </section>
);

/**
 * Optional header for an inspector/settings panel with Expand / Collapse all actions.
 */
export interface CollapsiblePanelHeaderProps {
    title?: string;
    icon?: React.ReactNode;
    onExpandAll?: () => void;
    onCollapseAll?: () => void;
    className?: string;
}

export const CollapsiblePanelHeader: React.FC<CollapsiblePanelHeaderProps> = ({
    title = 'Settings',
    icon = <Settings2 size={15} className="text-q-accent" />,
    onExpandAll,
    onCollapseAll,
    className = '',
}) => (
    <div className={`mb-3 flex items-center justify-between px-1 ${className}`}>
        <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-sm font-semibold text-q-text">{title}</h2>
        </div>
        {(onExpandAll || onCollapseAll) && (
            <div className="flex items-center gap-1">
                {onExpandAll && (
                    <button
                        type="button"
                        onClick={onExpandAll}
                        className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-q-text-muted transition-colors hover:bg-q-surface-elevated/60 hover:text-q-text"
                    >
                        Expand
                    </button>
                )}
                {onCollapseAll && (
                    <button
                        type="button"
                        onClick={onCollapseAll}
                        className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-q-text-muted transition-colors hover:bg-q-surface-elevated/60 hover:text-q-text"
                    >
                        Collapse
                    </button>
                )}
            </div>
        )}
    </div>
);

/**
 * Hook that manages the open/closed state for a group of collapsible sections.
 * `initial` maps a section key to its default open state.
 */
export function useCollapsibleSections<K extends string>(initial: Record<K, boolean>) {
    const [openSections, setOpenSections] = useState<Record<K, boolean>>(initial);

    const toggle = useCallback((key: K) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const setAll = useCallback((value: boolean) => {
        setOpenSections(prev => {
            const next = { ...prev };
            (Object.keys(next) as K[]).forEach(key => {
                next[key] = value;
            });
            return next;
        });
    }, []);

    const expandAll = useCallback(() => setAll(true), [setAll]);
    const collapseAll = useCallback(() => setAll(false), [setAll]);

    return { openSections, toggle, expandAll, collapseAll, setOpenSections };
}

export default CollapsibleSection;
