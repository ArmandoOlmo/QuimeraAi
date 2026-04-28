/**
 * AgencyNavigationManagement
 * Gestión de ENLACES del Landing Page de la Agencia
 * Solo maneja: Enlaces a artículos del CMS (header links + footer columns)
 * Los aspectos visuales (logo, colores, CTA, estilos) se manejan en AgencyLandingEditor
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { useAgencyContent } from '../../../contexts/agency/AgencyContentContext';
import { useToast } from '../../../contexts/ToastContext';
import {
    getAgencyLanding,
    saveAgencyLanding,
} from '../../../services/agencyLandingService';
import {
    AgencyLandingConfig,
    AgencyLandingSection,
    createDefaultAgencyLandingConfig,
} from '../../../types/agencyLanding';
import {
    HeaderData,
    FooterData,
    NavLink,
    FooterColumn,
    FooterLink,
} from '../../../types/components';
import {
    Menu as MenuIcon,
    Plus,
    ArrowLeft,
    Save,
    Trash2,
    Loader2,
    GripVertical,
    FileText,
    Link as LinkIcon,
    Layout,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Twitter,
    Facebook,
    Instagram,
    Linkedin,
    Youtube,
    Github,
} from 'lucide-react';

interface AgencyNavigationManagementProps {
    onBack?: () => void;
    onSaveReady?: (saveState: { save: () => Promise<void>; isSaving: boolean; hasChanges: boolean }) => void;
}

const AgencyNavigationManagement: React.FC<AgencyNavigationManagementProps> = ({ onBack, onSaveReady }) => {
    const { t } = useTranslation();
    const { currentTenant } = useTenant();
    const { articles } = useAgencyContent();
    const { showToast } = useToast();

    // States
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [activeTab, setActiveTab] = useState<'header' | 'footer'>('header');
    const [showInstructions, setShowInstructions] = useState(true);

    // Data
    const [landingConfig, setLandingConfig] = useState<AgencyLandingConfig | null>(null);
    const [sections, setSections] = useState<AgencyLandingSection[]>([]);
    const [headerLinks, setHeaderLinks] = useState<NavLink[]>([]);
    const [footerColumns, setFooterColumns] = useState<FooterColumn[]>([]);
    const [socialLinks, setSocialLinks] = useState<{ id: string; platform: string; url: string }[]>([]);

    // Published articles only
    const publishedArticles = articles.filter(a => a.status === 'published');

    // Expose save state to parent
    useEffect(() => {
        if (onSaveReady) {
            onSaveReady({ save: handleSave, isSaving, hasChanges });
        }
    }, [isSaving, hasChanges]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load config
    useEffect(() => {
        let cancelled = false;

        const loadConfig = async () => {
            if (!currentTenant?.id) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                let config = await getAgencyLanding(currentTenant.id);

                if (cancelled) return;

                if (!config) {
                    config = createDefaultAgencyLandingConfig(currentTenant.id, currentTenant.name) as AgencyLandingConfig;
                }

                setLandingConfig(config);
                setSections(config.sections || []);

                // Extract header links
                const headerSection = config.sections?.find(s => s.type === 'header');
                if (headerSection?.data?.links) {
                    setHeaderLinks(headerSection.data.links);
                }

                // Extract footer columns
                const footerSection = config.sections?.find(s => s.type === 'footer');
                if (footerSection?.data?.linkColumns) {
                    setFooterColumns(footerSection.data.linkColumns);
                }
                // Extract social links from footer
                if (footerSection?.data?.socialLinks) {
                    setSocialLinks(footerSection.data.socialLinks);
                }
            } catch (error: any) {
                if (cancelled) return;
                console.error('Error loading agency landing:', error);
                // Don't show toast for permission errors (race condition with auth)
                if (error?.code !== 'permission-denied') {
                    showToast('Error al cargar configuración', 'error');
                }
            }
            if (!cancelled) setIsLoading(false);
        };

        loadConfig();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTenant?.id]);

    // Save changes
    const handleSave = async () => {
        if (!currentTenant?.id || !landingConfig) return;

        setIsSaving(true);
        try {
            const updatedSections = sections.map(section => {
                if (section.type === 'header') {
                    return {
                        ...section,
                        data: { ...section.data, links: headerLinks }
                    };
                }
                if (section.type === 'footer') {
                    return {
                        ...section,
                        data: { ...section.data, linkColumns: footerColumns, socialLinks: socialLinks }
                    };
                }
                return section;
            });

            await saveAgencyLanding(currentTenant.id, {
                ...landingConfig,
                sections: updatedSections,
            });

            setSections(updatedSections);
            setHasChanges(false);
            showToast('Enlaces guardados correctamente', 'success');
        } catch (error) {
            console.error('Error saving:', error);
            showToast('Error al guardar', 'error');
        }
        setIsSaving(false);
    };

    // ==========================================================================
    // HEADER LINKS
    // ==========================================================================
    const addHeaderLink = (text: string, href: string) => {
        setHeaderLinks(prev => [...prev, { text, href }]);
        setHasChanges(true);
    };

    const updateHeaderLink = (index: number, updates: Partial<NavLink>) => {
        setHeaderLinks(prev => {
            const newLinks = [...prev];
            newLinks[index] = { ...newLinks[index], ...updates };
            return newLinks;
        });
        setHasChanges(true);
    };

    const removeHeaderLink = (index: number) => {
        setHeaderLinks(prev => prev.filter((_, i) => i !== index));
        setHasChanges(true);
    };

    // ==========================================================================
    // FOOTER COLUMNS
    // ==========================================================================
    const addFooterColumn = () => {
        setFooterColumns(prev => [...prev, { title: 'Nueva Columna', links: [] }]);
        setHasChanges(true);
    };

    const updateFooterColumn = (index: number, title: string) => {
        setFooterColumns(prev => {
            const newColumns = [...prev];
            newColumns[index] = { ...newColumns[index], title };
            return newColumns;
        });
        setHasChanges(true);
    };

    const removeFooterColumn = (index: number) => {
        setFooterColumns(prev => prev.filter((_, i) => i !== index));
        setHasChanges(true);
    };

    const addFooterLink = (columnIndex: number, text: string, href: string) => {
        setFooterColumns(prev => {
            const newColumns = [...prev];
            newColumns[columnIndex].links = [...newColumns[columnIndex].links, { text, href }];
            return newColumns;
        });
        setHasChanges(true);
    };

    const updateFooterLink = (columnIndex: number, linkIndex: number, updates: Partial<FooterLink>) => {
        setFooterColumns(prev => {
            const newColumns = [...prev];
            newColumns[columnIndex].links = newColumns[columnIndex].links.map((link, i) =>
                i === linkIndex ? { ...link, ...updates } : link
            );
            return newColumns;
        });
        setHasChanges(true);
    };

    const removeFooterLink = (columnIndex: number, linkIndex: number) => {
        setFooterColumns(prev => {
            const newColumns = [...prev];
            newColumns[columnIndex].links = newColumns[columnIndex].links.filter((_, i) => i !== linkIndex);
            return newColumns;
        });
        setHasChanges(true);
    };

    // ==========================================================================
    // SOCIAL LINKS
    // ==========================================================================
    const SOCIAL_PLATFORMS = [
        { value: 'twitter', label: 'Twitter / X', icon: Twitter },
        { value: 'facebook', label: 'Facebook', icon: Facebook },
        { value: 'instagram', label: 'Instagram', icon: Instagram },
        { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
        { value: 'youtube', label: 'YouTube', icon: Youtube },
        { value: 'github', label: 'GitHub', icon: Github },
    ];

    const addSocialLink = (platform: string) => {
        setSocialLinks(prev => [...prev, { id: `social-${Date.now()}`, platform, url: '' }]);
        setHasChanges(true);
    };

    const updateSocialLink = (id: string, url: string) => {
        setSocialLinks(prev => prev.map(link => link.id === id ? { ...link, url } : link));
        setHasChanges(true);
    };

    const removeSocialLink = (id: string) => {
        setSocialLinks(prev => prev.filter(link => link.id !== id));
        setHasChanges(true);
    };

    // ==========================================================================
    // RENDER
    // ==========================================================================
    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-q-bg">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <MenuIcon className="h-6 w-6 text-primary" />
                        {t('agency.navigation', 'Enlaces del Menú')}
                    </h2>
                    <p className="text-q-text-muted mt-1">
                        {t('agency.navigationDesc', 'Configura los enlaces de navegación del header, columnas del footer y redes sociales.')}
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isSaving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
                </button>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <MenuIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                    Aquí configuras los <strong>enlaces de navegación</strong> del header, las <strong>columnas del footer</strong> con sus enlaces, y tus <strong>redes sociales</strong>. Los aspectos visuales se configuran desde el editor del Landing Page.
                </p>
            </div>

            {/* Tabs Card */}
            <div className="bg-q-surface border border-q-border rounded-xl overflow-hidden">
                <div className="px-6 py-0 border-b border-q-border bg-muted/30 flex gap-1">
                    <button
                        onClick={() => setActiveTab('header')}
                        className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'header' ? 'border-primary text-primary' : 'border-transparent text-q-text-muted hover:text-foreground'}`}
                    >
                        <MenuIcon size={14} />
                        Enlaces Header ({headerLinks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('footer')}
                        className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'footer' ? 'border-primary text-primary' : 'border-transparent text-q-text-muted hover:text-foreground'}`}
                    >
                        <Layout size={14} />
                        Columnas Footer ({footerColumns.length})
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* ============================================ */}
                    {/* HEADER LINKS TAB */}
                    {/* ============================================ */}
                    {activeTab === 'header' && (
                        <>
                            {/* Quick Guide - collapsible */}
                            <button
                                onClick={() => setShowInstructions(!showInstructions)}
                                className="w-full flex items-center justify-between text-left p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                                <span className="text-sm font-medium text-q-text-muted flex items-center gap-2">
                                    📋 Guía rápida de configuración
                                </span>
                                {showInstructions ? <ChevronUp size={16} className="text-q-text-muted" /> : <ChevronDown size={16} className="text-q-text-muted" />}
                            </button>

                            {showInstructions && (
                                <div className="text-sm text-q-text-muted space-y-2 pl-3 border-l-2 border-primary/20">
                                    <p><strong className="text-foreground">Secciones (#):</strong> Llevan a partes de tu página (ej. <code className="bg-secondary px-1.5 py-0.5 rounded text-xs">#services</code>)</p>
                                    <p><strong className="text-foreground">Artículos (CMS):</strong> Contenido de tu blog. Se configuran automáticamente al seleccionarlos.</p>
                                    <p><strong className="text-foreground">Externos (https://):</strong> Enlaces a otras webs (ej. calendario, portafolio).</p>
                                    <p className="text-xs text-q-text-muted/70">💡 Mantén tu menú limpio (máximo 5-6 elementos) para que se vea bien en todos los dispositivos.</p>
                                </div>
                            )}

                            {/* Current links */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-foreground flex items-center gap-2">
                                    <LinkIcon size={16} className="text-primary" />
                                    Enlaces en navegación
                                </h3>

                                {headerLinks.length === 0 ? (
                                    <p className="text-sm text-q-text-muted py-4 text-center">
                                        No hay enlaces configurados. Añade artículos del CMS o enlaces manuales.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {headerLinks.map((link, index) => (
                                            <div key={index} className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg group">
                                                <GripVertical size={14} className="text-q-text-muted" />
                                                <input
                                                    type="text"
                                                    value={link.text}
                                                    onChange={(e) => updateHeaderLink(index, { text: e.target.value })}
                                                    className="flex-1 px-2 py-1 bg-q-bg border border-q-border rounded text-sm"
                                                    placeholder="Texto"
                                                />
                                                <input
                                                    type="text"
                                                    value={link.href}
                                                    onChange={(e) => updateHeaderLink(index, { href: e.target.value })}
                                                    className="flex-1 px-2 py-1 bg-q-bg border border-q-border rounded text-sm font-mono text-xs"
                                                    placeholder="#section-leads"
                                                />
                                                <button
                                                    onClick={() => removeHeaderLink(index)}
                                                    className="p-1 hover:bg-destructive/20 text-destructive rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add manual link */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => addHeaderLink('Nuevo enlace', '#')}
                                        className="flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium border border-dashed border-q-border rounded-lg hover:border-primary hover:text-primary transition-colors"
                                    >
                                        <Plus size={16} />
                                        Enlace manual
                                    </button>
                                    <button
                                        onClick={() => addHeaderLink('Nuevo artículo', '#article-mi-articulo')}
                                        className="flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium border border-dashed border-amber-500/50 text-amber-500 rounded-lg hover:border-amber-500 hover:bg-amber-500/10 transition-colors"
                                    >
                                        <FileText size={16} />
                                        Artículo manual
                                    </button>
                                </div>
                            </div>

                            {/* CMS Articles */}
                            <div className="pt-6 border-t border-q-border space-y-4">
                                <h3 className="font-semibold text-foreground flex items-center gap-2">
                                    <FileText size={16} className="text-primary" />
                                    Artículos del CMS
                                    <span className="text-xs text-q-text-muted">({publishedArticles.length} publicados)</span>
                                </h3>

                                {publishedArticles.length === 0 ? (
                                    <p className="text-sm text-q-text-muted py-4 text-center">
                                        No hay artículos publicados en el CMS.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {publishedArticles.map(article => {
                                            const isAdded = headerLinks.some(l => l.href.includes(article.slug));
                                            return (
                                                <button
                                                    key={article.id}
                                                    onClick={() => !isAdded && addHeaderLink(article.title, `#article-${article.slug}`)}
                                                    disabled={isAdded}
                                                    className={`flex items-center gap-2 p-3 text-left text-sm rounded-lg border transition-colors ${isAdded
                                                        ? 'border-green-500/30 bg-green-500/10 text-green-400 cursor-default'
                                                        : 'border-q-border hover:border-primary hover:bg-primary/5'
                                                        }`}
                                                >
                                                    <FileText size={14} className="shrink-0" />
                                                    <span className="truncate flex-1">{article.title}</span>
                                                    {isAdded && <span className="text-xs">✓ Añadido</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ============================================ */}
                    {/* FOOTER COLUMNS TAB */}
                    {/* ============================================ */}
                    {activeTab === 'footer' && (
                        <>
                            {/* Quick Guide - collapsible */}
                            <button
                                onClick={() => setShowInstructions(!showInstructions)}
                                className="w-full flex items-center justify-between text-left p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                                <span className="text-sm font-medium text-q-text-muted flex items-center gap-2">
                                    📋 Guía rápida del footer
                                </span>
                                {showInstructions ? <ChevronUp size={16} className="text-q-text-muted" /> : <ChevronDown size={16} className="text-q-text-muted" />}
                            </button>

                            {showInstructions && (
                                <div className="text-sm text-q-text-muted space-y-2 pl-3 border-l-2 border-primary/20">
                                    <p><strong className="text-foreground">Columnas:</strong> Organiza enlaces por categoría (ej. "Compañía", "Legal", "Recursos").</p>
                                    <p><strong className="text-foreground">Contenido:</strong> Añade enlaces manuales o artículos del CMS a cada columna.</p>
                                    <p><strong className="text-foreground">Redes Sociales:</strong> Aparecen al final del footer. Usa URLs completas.</p>
                                    <p className="text-xs text-q-text-muted/70">💡 Un footer bien organizado genera confianza. Incluye contacto y enlaces legales.</p>
                                </div>
                            )}

                            {/* Footer columns */}
                            {footerColumns.map((column, colIndex) => (
                                <div key={colIndex} className="bg-q-surface border border-q-border rounded-xl p-4 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Layout size={16} className="text-primary" />
                                        <input
                                            type="text"
                                            value={column.title}
                                            onChange={(e) => updateFooterColumn(colIndex, e.target.value)}
                                            className="flex-1 text-sm font-medium bg-transparent border-b border-transparent focus:border-primary outline-none"
                                            placeholder="Título de columna"
                                        />
                                        <button
                                            onClick={() => removeFooterColumn(colIndex)}
                                            className="p-1 hover:bg-destructive/20 text-destructive rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {/* Column links */}
                                    <div className="space-y-2 pl-4">
                                        {column.links.map((link, linkIndex) => (
                                            <div key={linkIndex} className="flex items-center gap-2 group">
                                                <input
                                                    type="text"
                                                    value={link.text}
                                                    onChange={(e) => updateFooterLink(colIndex, linkIndex, { text: e.target.value })}
                                                    className="flex-1 px-2 py-1 bg-secondary/30 border border-q-border rounded text-xs"
                                                    placeholder="Texto"
                                                />
                                                <input
                                                    type="text"
                                                    value={link.href}
                                                    onChange={(e) => updateFooterLink(colIndex, linkIndex, { href: e.target.value })}
                                                    className="flex-1 px-2 py-1 bg-secondary/30 border border-q-border rounded text-xs font-mono"
                                                    placeholder="URL"
                                                />
                                                <button
                                                    onClick={() => removeFooterLink(colIndex, linkIndex)}
                                                    className="p-1 hover:bg-destructive/20 text-destructive rounded opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}

                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => addFooterLink(colIndex, 'Nuevo enlace', '#')}
                                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Enlace manual
                                            </button>
                                            <button
                                                onClick={() => addFooterLink(colIndex, 'Nuevo artículo', '#article-mi-articulo')}
                                                className="text-xs text-amber-500 hover:underline flex items-center gap-1"
                                            >
                                                <FileText size={12} /> Artículo manual
                                            </button>
                                        </div>
                                    </div>

                                    {/* Add article to this column */}
                                    {publishedArticles.length > 0 && (
                                        <div className="pt-2 border-t border-q-border">
                                            <p className="text-xs text-q-text-muted mb-2">Añadir artículo:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {publishedArticles.slice(0, 6).map(article => {
                                                    const isAdded = column.links.some(l => l.href.includes(article.slug));
                                                    return (
                                                        <button
                                                            key={article.id}
                                                            onClick={() => !isAdded && addFooterLink(colIndex, article.title, `#article-${article.slug}`)}
                                                            disabled={isAdded}
                                                            className={`px-2 py-1 text-xs rounded transition-colors ${isAdded
                                                                ? 'bg-green-500/20 text-green-400'
                                                                : 'bg-secondary hover:bg-primary/20 hover:text-primary'
                                                                }`}
                                                        >
                                                            {article.title.slice(0, 20)}...
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Add column */}
                            <button
                                onClick={addFooterColumn}
                                className="w-full flex items-center justify-center gap-2 p-4 text-sm font-medium border-2 border-dashed border-q-border rounded-xl hover:border-primary hover:text-primary transition-colors"
                            >
                                <Plus size={18} />
                                Añadir columna al footer
                            </button>

                            {/* Social Links Section */}
                            <div className="pt-6 border-t border-q-border space-y-4">
                                <h3 className="font-semibold text-foreground flex items-center gap-2">
                                    <LinkIcon size={16} className="text-primary" />
                                    Redes Sociales
                                </h3>

                                {/* Current social links */}
                                <div className="space-y-3 mb-4">
                                    {socialLinks.map(link => {
                                        const platform = SOCIAL_PLATFORMS.find(p => p.value === link.platform);
                                        const PlatformIcon = platform?.icon || LinkIcon;
                                        return (
                                            <div key={link.id} className="flex items-center gap-2 group">
                                                <div className="flex items-center gap-2 w-28 text-sm text-q-text-muted">
                                                    <PlatformIcon size={16} />
                                                    {platform?.label || link.platform}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={link.url}
                                                    onChange={(e) => updateSocialLink(link.id, e.target.value)}
                                                    className="flex-1 px-3 py-2 bg-secondary/30 border border-q-border rounded-lg text-sm"
                                                    placeholder={`URL de ${platform?.label || link.platform}`}
                                                />
                                                <button
                                                    onClick={() => removeSocialLink(link.id)}
                                                    className="p-2 hover:bg-destructive/20 text-destructive rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Add social link buttons */}
                                <div className="flex flex-wrap gap-2">
                                    {SOCIAL_PLATFORMS.filter(p => !socialLinks.some(l => l.platform === p.value)).map(platform => {
                                        const PlatformIcon = platform.icon;
                                        return (
                                            <button
                                                key={platform.value}
                                                onClick={() => addSocialLink(platform.value)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary hover:bg-primary/20 hover:text-primary rounded-lg transition-colors"
                                            >
                                                <PlatformIcon size={12} />
                                                {platform.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgencyNavigationManagement;
