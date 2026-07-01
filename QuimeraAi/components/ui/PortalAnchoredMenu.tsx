import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalAnchoredMenuProps {
    isOpen: boolean;
    onClose: () => void;
    triggerRef: React.RefObject<HTMLElement | null>;
    width?: number;
    maxHeight?: number;
    className?: string;
    children: React.ReactNode;
}

/**
 * Renders a dropdown menu in a portal so it is not clipped by modal/sidebar overflow.
 */
export const PortalAnchoredMenu: React.FC<PortalAnchoredMenuProps> = ({
    isOpen,
    onClose,
    triggerRef,
    width = 192,
    maxHeight = 192,
    className = '',
    children,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});

    const updatePosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger || !isOpen) return;

        const rect = trigger.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const spaceBelow = viewportHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;
        const openUpward = spaceBelow < maxHeight && spaceAbove > spaceBelow;

        let left = rect.left;
        if (left + width > viewportWidth - 8) {
            left = viewportWidth - width - 8;
        }
        if (left < 8) left = 8;

        const nextStyle: React.CSSProperties = {
            position: 'fixed',
            left,
            width,
            maxHeight,
            zIndex: 100001,
        };

        if (openUpward) {
            nextStyle.bottom = viewportHeight - rect.top + 4;
        } else {
            nextStyle.top = rect.bottom + 4;
        }

        setStyle(nextStyle);
    }, [isOpen, maxHeight, triggerRef, width]);

    useEffect(() => {
        if (!isOpen) return;
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, updatePosition]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            onClose();
        };

        const timer = window.setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div
            ref={menuRef}
            style={style}
            className={`overflow-y-auto bg-q-surface border border-q-border rounded-lg shadow-xl custom-scrollbar ${className}`}
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>,
        document.body,
    );
};

export default PortalAnchoredMenu;
