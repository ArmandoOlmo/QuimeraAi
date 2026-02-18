/**
 * PageSelector Component
 * 
 * Allows users to select which page to edit in the editor.
 * Shows a dropdown/list of all pages in the project with:
 * - Page title
 * - Page type (static/dynamic)
 * - Navigation indicator
 * - Actions (duplicate, delete, settings)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    FileText,
    Home,
    ShoppingBag,
    Tag,
    FileEdit,
    Plus,
    ChevronDown,
    Settings,
    Copy,
    Trash2,
    GripVertical,
    Eye,
    EyeOff,
    Globe,
    Box,
    BookOpen,
    ShoppingCart,
    CreditCard,
    Users,
    Briefcase,
    Image,
    HelpCircle,
    Mail
} from 'lucide-react';
import { SitePage } from '../../types/project';
import { PageTemplateId } from '../../types/onboarding';
import ConfirmationModal from '../ui/ConfirmationModal';

interface PageSelectorProps {
    /** All pages in the project */
    pages: SitePage[];
    /** Currently active page */
    activePage: SitePage | null;
    /** Callback when a page is selected */
    onSelectPage: (pageId: string) => void;
    /** Callback when adding a new page */
    onAddPage: (templateId: PageTemplateId) => void;
    /** Callback when duplicating a page */
    onDuplicatePage: (pageId: string) => void;
    /** Callback when deleting a page */
    onDeletePage: (pageId: string) => void;
    /** Callback when opening page settings */
    onPageSettings?: (pageId: string) => void;
    /** Whether the selector is in compact mode */
    compact?: boolean;
    /** Custom class name */
    className?: string;
}

// Page template options for the "Add Page" dropdown
const PAGE_TEMPLATES: { id: PageTemplateId; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Página de Inicio', icon: <Home size={16} /> },
    { id: 'about', label: 'Nosotros', icon: <Users size={16} /> },
    { id: 'services', label: 'Servicios', icon: <Briefcase size={16} /> },
    { id: 'portfolio', label: 'Portafolio', icon: <Image size={16} /> },
    { id: 'pricing', label: 'Precios', icon: <Tag size={16} /> },
    { id: 'contact', label: 'Contacto', icon: <Mail size={16} /> },
    { id: 'faq', label: 'Preguntas Frecuentes', icon: <HelpCircle size={16} /> },
    { id: 'blog', label: 'Blog', icon: <BookOpen size={16} /> },
    { id: 'store', label: 'Tienda', icon: <ShoppingBag size={16} /> },
    { id: 'cart', label: 'Carrito', icon: <ShoppingCart size={16} /> },
    { id: 'checkout', label: 'Checkout', icon: <CreditCard size={16} /> },
];

// Get icon for a page based on its slug or type
const getPageIcon = (page: SitePage): React.ReactNode => {
    if (page.isHomePage) return <Home size={16} />;
    if (page.slug.includes('tienda') || page.slug.includes('store')) return <ShoppingBag size={16} />;
    if (page.slug.includes('producto') || page.dynamicSource === 'products') return <Box size={16} />;
    if (page.slug.includes('categoria') || page.dynamicSource === 'categories') return <Tag size={16} />;
    if (page.slug.includes('blog')) return <BookOpen size={16} />;
    if (page.slug.includes('contacto')) return <Mail size={16} />;
    if (page.slug.includes('nosotros') || page.slug.includes('about')) return <Users size={16} />;
    if (page.slug.includes('servicio')) return <Briefcase size={16} />;
    if (page.slug.includes('portafolio') || page.slug.includes('portfolio')) return <Image size={16} />;
    if (page.slug.includes('precio') || page.slug.includes('pricing')) return <Tag size={16} />;
    if (page.slug.includes('faq') || page.slug.includes('pregunta')) return <HelpCircle size={16} />;
    if (page.slug.includes('carrito') || page.slug.includes('cart')) return <ShoppingCart size={16} />;
    if (page.slug.includes('checkout')) return <CreditCard size={16} />;
    return <FileText size={16} />;
};

const PageSelector: React.FC<PageSelectorProps> = ({
    pages,
    activePage,
    onSelectPage,
    onAddPage,
    onDuplicatePage,
    onDeletePage,
    onPageSettings,
    compact = false,
    className = '',
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [contextMenuPage, setContextMenuPage] = useState<string | null>(null);
    const [deletePageId, setDeletePageId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const addMenuRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    // Using 'click' instead of 'mousedown' to avoid race condition with button onClick
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
                setContextMenuPage(null);
            }
            if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
                setIsAddMenuOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Sort pages by navigation order
    const sortedPages = [...pages].sort((a, b) => {
        // Home page always first
        if (a.isHomePage) return -1;
        if (b.isHomePage) return 1;
        return (a.navigationOrder || 0) - (b.navigationOrder || 0);
    });

    if (compact) {
        // Compact mode: just a dropdown selector
        return (
            <div className={`relative ${className}`} ref={dropdownRef}>
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-[var(--editor-panel-bg)] border border-[var(--editor-border)] rounded-lg hover:bg-[var(--editor-border)] transition-colors w-full"
                >
                    {activePage && getPageIcon(activePage)}
                    <span className="flex-1 text-left text-sm text-[var(--editor-text-primary)] truncate">
                        {activePage?.title || 'Seleccionar página'}
                    </span>
                    <ChevronDown
                        size={16}
                        className={`text-[var(--editor-text-secondary)] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--editor-panel-bg)] border border-[var(--editor-border)] rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                        {sortedPages.map((page) => (
                            <button
                                key={page.id}
                                onClick={() => {
                                    onSelectPage(page.id);
                                    setIsDropdownOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--editor-border)] transition-colors ${activePage?.id === page.id ? 'bg-[var(--editor-accent)]/10 text-[var(--editor-accent)]' : 'text-[var(--editor-text-primary)]'
                                    }`}
                            >
                                {getPageIcon(page)}
                                <span className="flex-1 text-sm truncate">{page.title}</span>
                                {page.type === 'dynamic' && (
                                    <span className="text-xs px-1.5 py-0.5 bg-[var(--editor-accent)]/20 text-[var(--editor-accent)] rounded">
                                        Dinámica
                                    </span>
                                )}
                            </button>
                        ))}

                        {/* Add page button */}
                        <div className="border-t border-[var(--editor-border)] p-2">
                            <button
                                onClick={() => {
                                    setIsDropdownOpen(false);
                                    setIsAddMenuOpen(true);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[var(--editor-accent)] hover:bg-[var(--editor-accent)]/10 rounded-lg transition-colors"
                            >
                                <Plus size={16} />
                                <span className="text-sm">Agregar página</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Add page menu */}
                {isAddMenuOpen && (
                    <div
                        ref={addMenuRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-[var(--editor-panel-bg)] border border-[var(--editor-border)] rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                    >
                        <div className="p-2 border-b border-[var(--editor-border)]">
                            <span className="text-xs text-[var(--editor-text-secondary)] uppercase tracking-wide">
                                Seleccionar tipo de página
                            </span>
                        </div>
                        {PAGE_TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => {
                                    onAddPage(template.id);
                                    setIsAddMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--editor-text-primary)] hover:bg-[var(--editor-border)] transition-colors"
                            >
                                {template.icon}
                                <span className="text-sm">{template.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Full mode: list with actions
    return (
        <div className={`bg-[var(--editor-panel-bg)] rounded-lg border border-[var(--editor-border)] ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--editor-border)]">
                <h3 className="text-sm font-medium text-[var(--editor-text-primary)]">
                    Páginas
                </h3>
                <div className="relative" ref={addMenuRef}>
                    <button
                        onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--editor-accent)] hover:bg-[var(--editor-accent)]/10 rounded transition-colors"
                    >
                        <Plus size={14} />
                        Agregar
                    </button>

                    {isAddMenuOpen && (
                        <div className="absolute top-full right-0 mt-1 w-56 bg-[var(--editor-panel-bg)] border border-[var(--editor-border)] rounded-lg shadow-lg z-50">
                            <div className="p-2 border-b border-[var(--editor-border)]">
                                <span className="text-xs text-[var(--editor-text-secondary)] uppercase tracking-wide">
                                    Tipo de página
                                </span>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                {PAGE_TEMPLATES.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => {
                                            onAddPage(template.id);
                                            setIsAddMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--editor-text-primary)] hover:bg-[var(--editor-border)] transition-colors"
                                    >
                                        {template.icon}
                                        <span className="text-sm">{template.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Page list */}
            <div className="divide-y divide-[var(--editor-border)]">
                {sortedPages.map((page) => (
                    <div
                        key={page.id}
                        className={`group flex items-center gap-2 px-4 py-3 hover:bg-[var(--editor-border)]/50 cursor-pointer transition-colors ${activePage?.id === page.id ? 'bg-[var(--editor-accent)]/10' : ''
                            }`}
                        onClick={() => onSelectPage(page.id)}
                    >
                        {/* Drag handle (for future reordering) */}
                        <GripVertical
                            size={14}
                            className="text-[var(--editor-text-secondary)] opacity-0 group-hover:opacity-100 cursor-grab"
                        />

                        {/* Page icon */}
                        <div className={`flex-shrink-0 ${activePage?.id === page.id ? 'text-[var(--editor-accent)]' : 'text-[var(--editor-text-secondary)]'}`}>
                            {getPageIcon(page)}
                        </div>

                        {/* Page info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm truncate ${activePage?.id === page.id ? 'text-[var(--editor-accent)] font-medium' : 'text-[var(--editor-text-primary)]'
                                    }`}>
                                    {page.title}
                                </span>
                                {page.isHomePage && (
                                    <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                                        Inicio
                                    </span>
                                )}
                                {page.type === 'dynamic' && (
                                    <span className="text-xs px-1.5 py-0.5 bg-[var(--editor-accent)]/20 text-[var(--editor-accent)] rounded">
                                        Dinámica
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-[var(--editor-text-secondary)] truncate block">
                                {page.slug}
                            </span>
                        </div>

                        {/* Navigation indicator */}
                        <div className="flex-shrink-0">
                            {page.showInNavigation ? (
                                <Eye size={14} className="text-green-400" title="Visible en navegación" />
                            ) : (
                                <EyeOff size={14} className="text-[var(--editor-text-secondary)]" title="Oculta en navegación" />
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            {onPageSettings && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPageSettings(page.id);
                                    }}
                                    className="p-1 text-[var(--editor-text-secondary)] hover:text-[var(--editor-text-primary)] hover:bg-[var(--editor-border)] rounded transition-colors"
                                    title="Configuración"
                                >
                                    <Settings size={14} />
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicatePage(page.id);
                                }}
                                className="p-1 text-[var(--editor-text-secondary)] hover:text-[var(--editor-text-primary)] hover:bg-[var(--editor-border)] rounded transition-colors"
                                title="Duplicar"
                            >
                                <Copy size={14} />
                            </button>
                            {!page.isHomePage && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletePageId(page.id);
                                    }}
                                    className="p-1 text-[var(--editor-text-secondary)] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {pages.length === 0 && (
                    <div className="px-4 py-8 text-center">
                        <Globe size={32} className="mx-auto mb-2 text-[var(--editor-text-secondary)]" />
                        <p className="text-sm text-[var(--editor-text-secondary)]">
                            No hay páginas creadas
                        </p>
                        <button
                            onClick={() => setIsAddMenuOpen(true)}
                            className="mt-2 text-sm text-[var(--editor-accent)] hover:underline"
                        >
                            Crear primera página
                        </button>
                    </div>
                )}
            </div>
            {/* Delete Page Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deletePageId}
                onConfirm={() => {
                    if (deletePageId) onDeletePage(deletePageId);
                    setDeletePageId(null);
                }}
                onCancel={() => setDeletePageId(null)}
                title={`¿Eliminar la página "${pages.find(p => p.id === deletePageId)?.title}"?`}
                message="Esta acción no se puede deshacer. La página será eliminada permanentemente."
                variant="danger"
            />
        </div>
    );
};

export default PageSelector;


