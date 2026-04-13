import React from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical, ChevronDown } from 'lucide-react';
import type { DashboardSectionId, DragHandlers } from '../../hooks/useDashboardSections';

interface DashboardDraggableSectionProps {
    sectionId: DashboardSectionId;
    title: string;
    icon: React.ElementType;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    wrapperClasses: string;
    dragHandlers: DragHandlers;
    /** Optional right-side action (e.g. "View All" button) */
    rightAction?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * DashboardDraggableSection
 *
 * Generic wrapper for each draggable/collapsible section on the dashboard.
 * Replaces the repeated pattern of drag handle + collapse toggle + section content
 * that was duplicated for projects, templates, leads, and news sections.
 */
const DashboardDraggableSection: React.FC<DashboardDraggableSectionProps> = ({
    sectionId,
    title,
    icon: Icon,
    isCollapsed,
    onToggleCollapse,
    wrapperClasses,
    dragHandlers,
    rightAction,
    children,
}) => {
    const { t } = useTranslation();

    const dragHandle = (
        <div
            draggable
            onDragStart={() => dragHandlers.handleDragStart(sectionId)}
            onDragEnd={dragHandlers.handleDragEnd}
            className="opacity-0 group-hover/drag:opacity-100 focus-within:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing flex-shrink-0 self-center mr-1"
            title={t('dashboard.dragToReorder', 'Arrastra para reordenar')}
            aria-label={t('dashboard.dragToReorder', 'Arrastra para reordenar')}
            role="button"
            tabIndex={0}
        >
            <div className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-secondary/80 transition-colors">
                <GripVertical size={14} className="text-muted-foreground/60" />
            </div>
        </div>
    );

    return (
        <div
            className={wrapperClasses}
            onDragOver={(e) => dragHandlers.handleDragOver(e, sectionId)}
            onDragLeave={dragHandlers.handleDragLeave}
        >
            <section className={sectionId === 'projects' ? 'relative z-[1]' : 'w-full'}>
                <div className={`flex items-center justify-between ${isCollapsed ? 'mb-0' : 'mb-6'}`}>
                    <div className="flex items-center gap-0">
                        {dragHandle}
                        <button
                            onClick={onToggleCollapse}
                            className="text-2xl font-bold text-foreground flex items-center gap-3 hover:text-primary/90 transition-colors"
                            aria-expanded={!isCollapsed}
                        >
                            <Icon className="text-primary" size={24} />
                            {title}
                            <ChevronDown
                                size={20}
                                className={`text-muted-foreground transition-transform duration-300 ${
                                    isCollapsed ? '-rotate-90' : 'rotate-0'
                                }`}
                            />
                        </button>
                    </div>
                    {!isCollapsed && rightAction}
                </div>

                {!isCollapsed && <div className="animate-fade-in-up">{children}</div>}
            </section>
        </div>
    );
};

export default DashboardDraggableSection;
