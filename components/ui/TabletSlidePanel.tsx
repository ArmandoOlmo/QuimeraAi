import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronRight } from 'lucide-react';

interface TabletSlidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    position?: 'left' | 'right';
}

/**
 * Tablet Slide Panel Component
 * A slide-out panel for tablet viewports that opens from the left or right side.
 * Features:
 * - Smooth slide animation
 * - Backdrop overlay with tap-to-close
 * - Swipe-to-close gesture
 * - Proper width for tablet viewport
 */
const TabletSlidePanel: React.FC<TabletSlidePanelProps> = ({
    isOpen,
    onClose,
    title,
    children,
    position = 'left',
}) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const dragStartX = useRef(0);

    // Handle escape key to close
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Lock body scroll when panel is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Reset drag offset when opening/closing
    useEffect(() => {
        if (!isOpen) {
            setDragOffset(0);
        }
    }, [isOpen]);

    // Drag handlers for swipe-to-close
    const handleDragStart = useCallback((clientX: number) => {
        setIsDragging(true);
        dragStartX.current = clientX;
    }, []);

    const handleDragMove = useCallback((clientX: number) => {
        if (!isDragging) return;
        const delta = clientX - dragStartX.current;
        // For left panel, allow dragging left (negative)
        // For right panel, allow dragging right (positive)
        if (position === 'left') {
            setDragOffset(Math.min(0, delta));
        } else {
            setDragOffset(Math.max(0, delta));
        }
    }, [isDragging, position]);

    const handleDragEnd = useCallback(() => {
        if (!isDragging) return;
        setIsDragging(false);

        // If dragged more than 100px, close the panel
        if (Math.abs(dragOffset) > 100) {
            onClose();
        }
        setDragOffset(0);
    }, [isDragging, dragOffset, onClose]);

    // Touch event handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        handleDragStart(e.touches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        handleDragMove(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
        handleDragEnd();
    };

    if (!isOpen) return null;

    const panelStyles = {
        transform: position === 'left'
            ? `translateX(${isOpen ? dragOffset : -100}${isOpen && dragOffset === 0 ? '%' : 'px'})`
            : `translateX(${isOpen ? dragOffset : 100}${isOpen && dragOffset === 0 ? '%' : 'px'})`,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
    };

    return (
        <>
            {/* Backdrop Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
                style={{ opacity: Math.max(0.3, 1 - (Math.abs(dragOffset) / 300)) }}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide Panel */}
            <div
                ref={panelRef}
                className={`fixed inset-y-0 z-50 w-80 lg:w-96 ${position === 'left' ? 'left-0' : 'right-0'}`}
                style={panelStyles}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    className={`h-full bg-card shadow-2xl flex flex-col overflow-hidden ${position === 'left' ? 'border-r border-border' : 'border-l border-border'
                        }`}
                >
                    {/* Header */}
                    <div className="flex-shrink-0 px-4 py-3 border-b border-border flex items-center justify-between bg-card">
                        <h2 className="font-semibold text-base text-foreground">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            aria-label="Cerrar"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div
                        className="flex-1 overflow-y-auto overscroll-contain"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
};

export default TabletSlidePanel;
