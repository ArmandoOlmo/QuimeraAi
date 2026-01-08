/**
 * PageSettings Component
 * 
 * Modal/panel for editing page settings including:
 * - Page title
 * - URL slug
 * - SEO settings (title, description, image)
 * - Navigation visibility
 * - Dynamic page source configuration
 */

import React, { useState, useEffect } from 'react';
import { 
    X, 
    Save, 
    Globe, 
    Eye, 
    EyeOff, 
    Search, 
    Image as ImageIcon,
    Link,
    Type,
    FileText,
    AlertCircle,
    Check
} from 'lucide-react';
import { SitePage, PageType, DynamicSource } from '../../types/project';

interface PageSettingsProps {
    /** The page being edited */
    page: SitePage;
    /** Callback when settings are saved */
    onSave: (pageId: string, updates: Partial<SitePage>) => void;
    /** Callback when modal is closed */
    onClose: () => void;
    /** Whether the page slug is unique */
    isSlugUnique?: (slug: string, currentPageId: string) => boolean;
}

const PageSettings: React.FC<PageSettingsProps> = ({
    page,
    onSave,
    onClose,
    isSlugUnique = () => true,
}) => {
    const [title, setTitle] = useState(page.title);
    const [slug, setSlug] = useState(page.slug);
    const [seoTitle, setSeoTitle] = useState(page.seo.title || '');
    const [seoDescription, setSeoDescription] = useState(page.seo.description || '');
    const [seoImage, setSeoImage] = useState(page.seo.image || '');
    const [showInNavigation, setShowInNavigation] = useState(page.showInNavigation ?? true);
    const [navigationOrder, setNavigationOrder] = useState(page.navigationOrder || 0);
    const [isHomePage, setIsHomePage] = useState(page.isHomePage || false);
    const [hasChanges, setHasChanges] = useState(false);
    const [slugError, setSlugError] = useState<string | null>(null);

    // Track changes
    useEffect(() => {
        const changed = 
            title !== page.title ||
            slug !== page.slug ||
            seoTitle !== (page.seo.title || '') ||
            seoDescription !== (page.seo.description || '') ||
            seoImage !== (page.seo.image || '') ||
            showInNavigation !== (page.showInNavigation ?? true) ||
            navigationOrder !== (page.navigationOrder || 0) ||
            isHomePage !== (page.isHomePage || false);
        
        setHasChanges(changed);
    }, [title, slug, seoTitle, seoDescription, seoImage, showInNavigation, navigationOrder, isHomePage, page]);

    // Validate slug
    useEffect(() => {
        if (slug === page.slug) {
            setSlugError(null);
            return;
        }

        // Check format
        if (!/^\/[a-z0-9-/:]*$/.test(slug) && slug !== '/') {
            setSlugError('El slug debe empezar con / y solo contener letras minúsculas, números y guiones');
            return;
        }

        // Check uniqueness (for static pages only)
        if (page.type === 'static' && !isSlugUnique(slug, page.id)) {
            setSlugError('Este slug ya está en uso por otra página');
            return;
        }

        setSlugError(null);
    }, [slug, page.slug, page.id, page.type, isSlugUnique]);

    // Generate slug from title
    const generateSlugFromTitle = () => {
        const generated = '/' + title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Spaces to hyphens
            .replace(/-+/g, '-') // Multiple hyphens to single
            .trim();
        setSlug(generated);
    };

    const handleSave = () => {
        if (slugError) return;

        onSave(page.id, {
            title,
            slug,
            seo: {
                title: seoTitle || undefined,
                description: seoDescription || undefined,
                image: seoImage || undefined,
            },
            showInNavigation,
            navigationOrder,
            isHomePage,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[var(--editor-panel-bg)] border border-[var(--editor-border)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--editor-border)]">
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--editor-text-primary)]">
                            Configuración de Página
                        </h2>
                        <p className="text-sm text-[var(--editor-text-secondary)]">
                            {page.type === 'dynamic' ? 'Página dinámica' : 'Página estática'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[var(--editor-text-secondary)] hover:text-[var(--editor-text-primary)] hover:bg-[var(--editor-border)] rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
                    {/* Basic Info */}
                    <section>
                        <h3 className="text-sm font-medium text-[var(--editor-text-primary)] mb-4 flex items-center gap-2">
                            <FileText size={16} />
                            Información Básica
                        </h3>
                        
                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm text-[var(--editor-text-secondary)] mb-1">
                                    Título de la página
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--editor-input-bg)] border border-[var(--editor-border)] rounded-lg text-[var(--editor-text-primary)] focus:border-[var(--editor-accent)] focus:outline-none transition-colors"
                                    placeholder="Ej: Acerca de nosotros"
                                />
                            </div>

                            {/* Slug */}
                            <div>
                                <label className="block text-sm text-[var(--editor-text-secondary)] mb-1">
                                    URL (slug)
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--editor-text-secondary)]" />
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            className={`w-full pl-9 pr-3 py-2 bg-[var(--editor-input-bg)] border rounded-lg text-[var(--editor-text-primary)] focus:outline-none transition-colors ${
                                                slugError 
                                                    ? 'border-red-400 focus:border-red-400' 
                                                    : 'border-[var(--editor-border)] focus:border-[var(--editor-accent)]'
                                            }`}
                                            placeholder="/mi-pagina"
                                            disabled={page.type === 'dynamic'}
                                        />
                                    </div>
                                    {page.type === 'static' && (
                                        <button
                                            onClick={generateSlugFromTitle}
                                            className="px-3 py-2 text-sm text-[var(--editor-accent)] bg-[var(--editor-accent)]/10 hover:bg-[var(--editor-accent)]/20 rounded-lg transition-colors"
                                            title="Generar desde título"
                                        >
                                            Auto
                                        </button>
                                    )}
                                </div>
                                {slugError && (
                                    <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                                        <AlertCircle size={14} />
                                        {slugError}
                                    </p>
                                )}
                                {page.type === 'dynamic' && (
                                    <p className="mt-1 text-xs text-[var(--editor-text-secondary)]">
                                        Las páginas dinámicas usan patrones de URL con parámetros (ej: /producto/:slug)
                                    </p>
                                )}
                            </div>

                            {/* Home page toggle */}
                            {page.type === 'static' && (
                                <div className="flex items-center justify-between p-3 bg-[var(--editor-input-bg)] rounded-lg">
                                    <div>
                                        <span className="text-sm text-[var(--editor-text-primary)]">
                                            Página de inicio
                                        </span>
                                        <p className="text-xs text-[var(--editor-text-secondary)]">
                                            Esta página será la principal del sitio
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsHomePage(!isHomePage)}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            isHomePage ? 'bg-[var(--editor-accent)]' : 'bg-[var(--editor-border)]'
                                        }`}
                                    >
                                        <span 
                                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                                isHomePage ? 'left-7' : 'left-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Navigation */}
                    <section>
                        <h3 className="text-sm font-medium text-[var(--editor-text-primary)] mb-4 flex items-center gap-2">
                            <Globe size={16} />
                            Navegación
                        </h3>
                        
                        <div className="space-y-4">
                            {/* Show in nav toggle */}
                            <div className="flex items-center justify-between p-3 bg-[var(--editor-input-bg)] rounded-lg">
                                <div className="flex items-center gap-3">
                                    {showInNavigation ? (
                                        <Eye size={18} className="text-green-400" />
                                    ) : (
                                        <EyeOff size={18} className="text-[var(--editor-text-secondary)]" />
                                    )}
                                    <div>
                                        <span className="text-sm text-[var(--editor-text-primary)]">
                                            Mostrar en navegación
                                        </span>
                                        <p className="text-xs text-[var(--editor-text-secondary)]">
                                            La página aparecerá en el menú del sitio
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowInNavigation(!showInNavigation)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${
                                        showInNavigation ? 'bg-green-500' : 'bg-[var(--editor-border)]'
                                    }`}
                                >
                                    <span 
                                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                            showInNavigation ? 'left-7' : 'left-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Navigation order */}
                            {showInNavigation && (
                                <div>
                                    <label className="block text-sm text-[var(--editor-text-secondary)] mb-1">
                                        Orden en navegación
                                    </label>
                                    <input
                                        type="number"
                                        value={navigationOrder}
                                        onChange={(e) => setNavigationOrder(parseInt(e.target.value) || 0)}
                                        min={0}
                                        max={99}
                                        className="w-24 px-3 py-2 bg-[var(--editor-input-bg)] border border-[var(--editor-border)] rounded-lg text-[var(--editor-text-primary)] focus:border-[var(--editor-accent)] focus:outline-none transition-colors"
                                    />
                                    <p className="mt-1 text-xs text-[var(--editor-text-secondary)]">
                                        Números menores aparecen primero
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* SEO */}
                    <section>
                        <h3 className="text-sm font-medium text-[var(--editor-text-primary)] mb-4 flex items-center gap-2">
                            <Search size={16} />
                            SEO (Optimización para buscadores)
                        </h3>
                        
                        <div className="space-y-4">
                            {/* SEO Title */}
                            <div>
                                <label className="block text-sm text-[var(--editor-text-secondary)] mb-1">
                                    Título SEO
                                </label>
                                <div className="relative">
                                    <Type size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--editor-text-secondary)]" />
                                    <input
                                        type="text"
                                        value={seoTitle}
                                        onChange={(e) => setSeoTitle(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-[var(--editor-input-bg)] border border-[var(--editor-border)] rounded-lg text-[var(--editor-text-primary)] focus:border-[var(--editor-accent)] focus:outline-none transition-colors"
                                        placeholder={title || 'Título de la página - Tu Marca'}
                                        maxLength={70}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-[var(--editor-text-secondary)]">
                                    {seoTitle.length}/70 caracteres. Aparece en Google.
                                    {page.type === 'dynamic' && ' Usa {{product.name}}, {{category.name}} o {{article.title}} para contenido dinámico.'}
                                </p>
                            </div>

                            {/* SEO Description */}
                            <div>
                                <label className="block text-sm text-[var(--editor-text-secondary)] mb-1">
                                    Descripción SEO
                                </label>
                                <textarea
                                    value={seoDescription}
                                    onChange={(e) => setSeoDescription(e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--editor-input-bg)] border border-[var(--editor-border)] rounded-lg text-[var(--editor-text-primary)] focus:border-[var(--editor-accent)] focus:outline-none transition-colors resize-none"
                                    placeholder="Descripción breve de la página para motores de búsqueda..."
                                    rows={3}
                                    maxLength={160}
                                />
                                <p className="mt-1 text-xs text-[var(--editor-text-secondary)]">
                                    {seoDescription.length}/160 caracteres.
                                    {page.type === 'dynamic' && ' Usa {{product.description}}, {{category.description}} o {{article.summary}}.'}
                                </p>
                            </div>

                            {/* SEO Image */}
                            <div>
                                <label className="block text-sm text-[var(--editor-text-secondary)] mb-1">
                                    Imagen para redes sociales (og:image)
                                </label>
                                <div className="relative">
                                    <ImageIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--editor-text-secondary)]" />
                                    <input
                                        type="url"
                                        value={seoImage}
                                        onChange={(e) => setSeoImage(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-[var(--editor-input-bg)] border border-[var(--editor-border)] rounded-lg text-[var(--editor-text-primary)] focus:border-[var(--editor-accent)] focus:outline-none transition-colors"
                                        placeholder="https://..."
                                    />
                                </div>
                                <p className="mt-1 text-xs text-[var(--editor-text-secondary)]">
                                    Imagen que se muestra al compartir en redes. Tamaño recomendado: 1200x630px
                                </p>
                            </div>

                            {/* Preview */}
                            <div className="p-4 bg-white rounded-lg border">
                                <p className="text-xs text-gray-500 mb-2">Vista previa en Google:</p>
                                <div>
                                    <p className="text-blue-600 text-lg truncate hover:underline cursor-pointer">
                                        {seoTitle || title || 'Título de la página'}
                                    </p>
                                    <p className="text-green-700 text-sm truncate">
                                        tudominio.com{slug}
                                    </p>
                                    <p className="text-gray-600 text-sm line-clamp-2">
                                        {seoDescription || 'Descripción de la página que aparecerá en los resultados de búsqueda...'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--editor-border)] bg-[var(--editor-panel-bg)]">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-[var(--editor-text-secondary)] hover:text-[var(--editor-text-primary)] hover:bg-[var(--editor-border)] rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || !!slugError}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            hasChanges && !slugError
                                ? 'bg-[var(--editor-accent)] text-white hover:bg-[var(--editor-accent)]/90'
                                : 'bg-[var(--editor-border)] text-[var(--editor-text-secondary)] cursor-not-allowed'
                        }`}
                    >
                        <Save size={16} />
                        Guardar cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PageSettings;



