import { useState, useRef, useCallback } from 'react';
import { usePersistedJSON } from './usePersistedState';

// ─── Types ───────────────────────────────────────────────────────────────────
export type DashboardSectionId = 'projects' | 'templates' | 'leads' | 'news';

const DEFAULT_SECTION_ORDER: DashboardSectionId[] = ['projects', 'templates', 'leads', 'news'];

function isValidSectionOrder(parsed: unknown): parsed is DashboardSectionId[] {
    return (
        Array.isArray(parsed) &&
        parsed.length === DEFAULT_SECTION_ORDER.length &&
        DEFAULT_SECTION_ORDER.every((s) => (parsed as string[]).includes(s))
    );
}

export interface DragHandlers {
    handleDragStart: (sectionId: DashboardSectionId) => void;
    handleDragOver: (e: React.DragEvent, sectionId: DashboardSectionId) => void;
    handleDragEnd: () => void;
    handleDragLeave: (e: React.DragEvent) => void;
}

export interface DashboardSectionsHook {
    sectionOrder: DashboardSectionId[];
    draggedSection: DashboardSectionId | null;
    dragOverSection: DashboardSectionId | null;
    dragHandlers: DragHandlers;
    getWrapperClasses: (sectionId: DashboardSectionId) => string;
}

/**
 * useDashboardSections
 *
 * Encapsulates the drag & drop reordering logic for dashboard sections.
 * Previously inline in Dashboard.tsx lines 140-204.
 */
export function useDashboardSections(): DashboardSectionsHook {
    const [sectionOrder, setSectionOrder] = usePersistedJSON<DashboardSectionId[]>(
        'quimera_dashboard_section_order',
        DEFAULT_SECTION_ORDER,
        isValidSectionOrder,
    );

    const dragItem = useRef<DashboardSectionId | null>(null);
    const dragOverItem = useRef<DashboardSectionId | null>(null);
    const [draggedSection, setDraggedSection] = useState<DashboardSectionId | null>(null);
    const [dragOverSection, setDragOverSection] = useState<DashboardSectionId | null>(null);

    const handleDragStart = useCallback((sectionId: DashboardSectionId) => {
        dragItem.current = sectionId;
        setDraggedSection(sectionId);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, sectionId: DashboardSectionId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        dragOverItem.current = sectionId;
        setDragOverSection(sectionId);
    }, []);

    const handleDragEnd = useCallback(() => {
        if (
            dragItem.current !== null &&
            dragOverItem.current !== null &&
            dragItem.current !== dragOverItem.current
        ) {
            setSectionOrder((prev) => {
                const newOrder = [...prev];
                const dragIdx = newOrder.indexOf(dragItem.current!);
                const overIdx = newOrder.indexOf(dragOverItem.current!);
                if (dragIdx === -1 || overIdx === -1) return prev;
                newOrder.splice(dragIdx, 1);
                newOrder.splice(overIdx, 0, dragItem.current!);
                return newOrder;
            });
        }
        dragItem.current = null;
        dragOverItem.current = null;
        setDraggedSection(null);
        setDragOverSection(null);
    }, [setSectionOrder]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        const relatedTarget = e.relatedTarget as Node | null;
        if (!e.currentTarget.contains(relatedTarget)) {
            setDragOverSection(null);
        }
    }, []);

    const getWrapperClasses = useCallback(
        (sectionId: DashboardSectionId) => {
            const isDragging = draggedSection === sectionId;
            const isOver = dragOverSection === sectionId && draggedSection !== sectionId;
            return [
                'group/drag relative rounded-2xl transition-all duration-300',
                isDragging ? 'opacity-40 scale-[0.98]' : '',
                isOver ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background' : '',
            ]
                .filter(Boolean)
                .join(' ');
        },
        [draggedSection, dragOverSection],
    );

    return {
        sectionOrder,
        draggedSection,
        dragOverSection,
        dragHandlers: {
            handleDragStart,
            handleDragOver,
            handleDragEnd,
            handleDragLeave,
        },
        getWrapperClasses,
    };
}
