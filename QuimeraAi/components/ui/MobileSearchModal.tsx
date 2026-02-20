import React, { useRef, useEffect } from 'react';
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
 * Replicates the exact mobile search overlay from Dashboard.tsx (lines 322-356).
 * Fixed fullscreen overlay with a floating search card, matching the main dashboard UX.
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

    // Exact same structure as Dashboard.tsx mobile search overlay
    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden flex items-start justify-center pt-20"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Search"
        >
            <div
                className="bg-card border border-border rounded-2xl shadow-2xl w-[90%] max-w-md p-4 animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 mb-2" role="search">
                    <Search className="text-muted-foreground" size={20} aria-hidden="true" />
                    <input
                        ref={inputRef}
                        type="search"
                        placeholder={placeholder || t('common.search', 'Buscar...')}
                        value={searchQuery.trim() === '' ? '' : searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                        onClick={() => {
                            onSearchChange('');
                            onClose();
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Close search"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>
                {searchQuery && (
                    <div className="text-xs text-muted-foreground" role="status" aria-live="polite">
                        {t('common.searching', 'Buscando...')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileSearchModal;
