import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MobileSearchModalProps {
    isOpen: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onClose: () => void;
    placeholder?: string;
    containerClassName?: string;
}

/**
 * MobileSearchModal
 * Floating search overlay rendered via portal to escape parent stacking contexts.
 * Triggered by the magnifying glass icon in dashboard headers.
 */
const MobileSearchModal: React.FC<MobileSearchModalProps> = ({
    isOpen, searchQuery, onSearchChange, onClose, placeholder,
}) => {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const overlayClasses = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-start justify-center pt-20';
    const modalClasses = 'bg-q-surface border border-q-border rounded-2xl shadow-2xl w-[90%] max-w-md p-4 animate-fade-in-up';
    const inputWrapClasses = 'flex items-center gap-2 mb-2';
    const iconClasses = 'text-q-text-muted';
    const inputClasses = 'flex-1 bg-transparent outline-none text-foreground placeholder:text-q-text-muted';
    const closeButtonClasses = 'p-2 text-q-text-muted hover:text-foreground transition-colors';
    const statusClasses = 'text-xs text-q-text-muted';

    // Render via portal to escape any parent stacking context
    return createPortal(
        <div
            className={overlayClasses}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Search"
        >
            <div
                className={modalClasses}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={inputWrapClasses} role="search">
                    <Search className={iconClasses} size={20} aria-hidden="true" />
                    <input
                        ref={inputRef}
                        type="search"
                        placeholder={placeholder || t('common.search', 'Buscar...')}
                        value={searchQuery.trim() === '' ? '' : searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className={inputClasses}
                    />
                    <button
                        onClick={() => {
                            onSearchChange('');
                            onClose();
                        }}
                        className={closeButtonClasses}
                        aria-label="Close search"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>
                {searchQuery && (
                    <div className={statusClasses} role="status" aria-live="polite">
                        {t('common.searching', 'Buscando...')}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default MobileSearchModal;
