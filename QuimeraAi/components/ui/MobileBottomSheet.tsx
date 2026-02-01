import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronLeft } from 'lucide-react';

interface MobileBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

/**
 * Mobile Bottom Sheet Component
 * A Shopify-style bottom sheet modal that slides up from the bottom of the screen.
 * Features:
 * - Smooth slide-up animation
 * - Drag handle for touch interaction
 * - Swipe-to-close gesture
 * - Backdrop overlay with tap-to-close
 * - Scrollable content area
 */
const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
}) => {
    const sheetRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const dragStartY = useRef(0);
    const currentDragY = useRef(0);

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

    // Lock body scroll when sheet is open
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
    const handleDragStart = useCallback((clientY: number) => {
        setIsDragging(true);
        dragStartY.current = clientY;
        currentDragY.current = clientY;
    }, []);

    const handleDragMove = useCallback((clientY: number) => {
        if (!isDragging) return;
        currentDragY.current = clientY;
        const offset = Math.max(0, clientY - dragStartY.current);
        setDragOffset(offset);
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        if (!isDragging) return;
        setIsDragging(false);

        // If dragged more than 100px down, close the sheet
        if (dragOffset > 100) {
            onClose();
        }
        setDragOffset(0);
    }, [isDragging, dragOffset, onClose]);

    // Touch event handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        handleDragStart(e.touches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        handleDragMove(e.touches[0].clientY);
    };

    const handleTouchEnd = () => {
        handleDragEnd();
    };

    // Mouse event handlers (for testing on desktop)
    const handleMouseDown = (e: React.MouseEvent) => {
        handleDragStart(e.clientY);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        handleDragMove(e.clientY);
    };

    const handleMouseUp = () => {
        handleDragEnd();
    };

    const handleMouseLeave = () => {
        if (isDragging) {
            handleDragEnd();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop Overlay */}
            <div
                className="fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 md:hidden"
                style={{ opacity: Math.max(0.3, 1 - (dragOffset / 300)) }}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Bottom Sheet */}
            <div
                ref={sheetRef}
                className="fixed inset-x-0 bottom-0 z-50 md:hidden"
                style={{
                    transform: isOpen ? `translateY(${dragOffset}px)` : 'translateY(100%)',
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            >
                <div
                    className="bg-card rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
                    style={{
                        boxShadow: '0 -4px 25px rgba(0, 0, 0, 0.25)',
                    }}
                >
                    {/* Drag Handle Area */}
                    <div
                        className="flex-shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={handleMouseDown}
                    >
                        {/* Drag Handle Bar */}
                        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto" />
                    </div>

                    {/* Header */}
                    <div className="flex-shrink-0 px-4 pb-3 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                aria-label="Cerrar"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div>
                                <h2 className="font-semibold text-base text-foreground">{title}</h2>
                                {subtitle && (
                                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                                )}
                            </div>
                        </div>
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
                        ref={contentRef}
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

export default MobileBottomSheet;
