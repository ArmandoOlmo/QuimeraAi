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
}

const AgencyNavigationManagement: React.FC<AgencyNavigationManagementProps> = ({ onBack }) => {
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

    // Load config
    useEffect(() => {
        const loadConfig = async () => {
            if (!currentTenant?.id) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                let config = await getAgencyLanding(currentTenant.id);

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
            } catch (error) {
                console.error('Error loading agency landing:', error);
                showToast('Error al cargar configuración', 'error');
            }
            setIsLoading(false);
        };

        loadConfig();
    }, [currentTenant?.id, currentTenant?.name, showToast]);

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
            <div className="flex h-full items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <header className="h-14 border-b border-border flex items-center justify-between bg-background z-20 sticky top-0">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-secondary transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <MenuIcon className="text-primary w-5 h-5" />
                    <h1 className="text-lg font-semibold">Enlaces del Menú</h1>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded-full">
                        Solo enlaces
                    </span>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Guardar
                </button>
            </header>

            {/* Info banner */}
            <div className="py-3 bg-blue-500/5 border-b border-blue-500/10">
                <p className="text-sm text-blue-400">
                    💡 Aquí configuras los <strong>enlaces de navegación</strong> del header, las <strong>columnas del footer</strong> con sus enlaces, y tus <strong>redes sociales</strong>.
                </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-border px-4 sm:px-6">
                <div className="flex gap-1">
                    <button
                        onClick={() => setActiveTab('header')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'header' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <MenuIcon size={14} className="inline mr-2" />
                        Enlaces Header ({headerLinks.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('footer')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'footer' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Layout size={14} className="inline mr-2" />
                        Columnas Footer ({footerColumns.length})
                    </button>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-4 sm:space-y-6">

                    {/* ============================================ */}
                    {/* HEADER LINKS TAB */}
                    {/* ============================================ */}
                    {activeTab === 'header' && (
                        <>
                            {/* Instructions - Collapsible */}
                            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setShowInstructions(!showInstructions)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-amber-500/5 transition-colors"
                                >
                                    <h4 className="font-semibold text-amber-500 flex items-center gap-2 text-base">
                                        📋 Guía: Configura el menú de navegación
                                    </h4>
                                    {showInstructions ? <ChevronUp className="text-amber-500" size={20} /> : <ChevronDown className="text-amber-500" size={20} />}
                                </button>

                                {showInstructions && (
                                    <div className="px-5 pb-5 text-sm space-y-4">
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold shrink-0 mt-0.5">1</span>
                                                <div>
                                                    <strong className="text-foreground block mb-1">Tipos de Enlaces Disponibles</strong>
                                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-1">
                                                        <li><strong>Secciones (#):</strong> Llevan a partes de tu página (ej. <code className="bg-secondary px-1.5 py-0.5 rounded text-xs">#services</code>, <code className="bg-secondary px-1.5 py-0.5 rounded text-xs">#pricing</code>).</li>
                                                        <li><strong>Artículos (CMS):</strong> Contenido de tu blog. Al seleccionarlos de la lista "Artículos del CMS" abajo, se configuran automáticamente.</li>
                                                        <li><strong>Externos (https://):</strong> Enlaces a otras webs (ej. tu calendario, portafolio externo).</li>
                                                    </ul>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold shrink-0 mt-0.5">2</span>
                                                <div>
                                                    <strong className="text-foreground block mb-1">Cómo Configurar</strong>
                                                    <p className="text-muted-foreground mb-2">
                                                        Usa los botones <strong>"Enlace manual"</strong> o selecciona un <strong>Artículo</strong> de la lista inferior.
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-amber-500/5 p-2 rounded">
                                                        <div>
                                                            <span className="font-semibold text-amber-600 block">Texto:</span>
                                                            Lo que ve el usuario en el menú.
                                                        </div>
                                                        <div>
                                                            <span className="font-semibold text-amber-600 block">URL / Enlace:</span>
                                                            El destino (ej. <code className="text-xs">#contacto</code> o <code className="text-xs">https://google.com</code>).
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold shrink-0 mt-0.5">3</span>
                                                <div>
                                                    <strong className="text-foreground block mb-1">Gestión</strong>
                                                    <p className="text-muted-foreground">
                                                        Edita directamente escribiendo en los campos. Para <strong>eliminar</strong>, pasa el cursor sobre el enlace y haz clic en el icono de basura <Trash2 size={10} className="inline" />.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-amber-500/20">
                                            <p className="text-xs text-muted-foreground flex gap-2">
                                                <span className="shrink-0">💡</span>
                                                <span>
                                                    <strong>Consejo Pro:</strong> Mantén tu menú limpio (máximo 5-6 elementos) para asegurar que se vea bien en móviles y tablets. Prioriza las acciones más importantes.
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Current links */}
                            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                                <h3 className="font-medium flex items-center gap-2">
                                    <LinkIcon size={16} className="text-primary" />
                                    Enlaces en navegación
                                </h3>

                                {headerLinks.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4 text-center">
                                        No hay enlaces configurados. Añade artículos del CMS o enlaces manuales.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {headerLinks.map((link, index) => (
                                            <div key={index} className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg group">
                                                <GripVertical size={14} className="text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={link.text}
                                                    onChange={(e) => updateHeaderLink(index, { text: e.target.value })}
                                                    className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm"
                                                    placeholder="Texto"
                                                />
                                                <input
                                                    type="text"
                                                    value={link.href}
                                                    onChange={(e) => updateHeaderLink(index, { href: e.target.value })}
                                                    className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm font-mono text-xs"
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
                                        className="flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium border border-dashed border-border rounded-lg hover:border-primary hover:text-primary transition-colors"
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
                            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                                <h3 className="font-medium flex items-center gap-2">
                                    <FileText size={16} className="text-primary" />
                                    Artículos del CMS
                                    <span className="text-xs text-muted-foreground">({publishedArticles.length} publicados)</span>
                                </h3>

                                {publishedArticles.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4 text-center">
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
                                                        : 'border-border hover:border-primary hover:bg-primary/5'
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
                            {/* Instructions - Collapsible */}
                            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/30 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setShowInstructions(!showInstructions)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-blue-500/5 transition-colors"
                                >
                                    <h4 className="font-semibold text-blue-400 flex items-center gap-2 text-base">
                                        📋 Guía: Configura el pie de página
                                    </h4>
                                    {showInstructions ? <ChevronUp className="text-blue-400" size={20} /> : <ChevronDown className="text-blue-400" size={20} />}
                                </button>

                                {showInstructions && (
                                    <div className="px-5 pb-5 text-sm space-y-4">
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold shrink-0 mt-0.5">1</span>
                                                <div>
                                                    <strong className="text-foreground block mb-1">Estructura por Columnas</strong>
                                                    <p className="text-muted-foreground mb-2">
                                                        El footer se organiza verticalmente. Crea columnas temáticas como "Compañía", "Legal" o "Recursos" para agrupar tus enlaces.
                                                    </p>
                                                    <button className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">
                                                        <Plus size={10} /> Añadir columna al footer
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold shrink-0 mt-0.5">2</span>
                                                <div>
                                                    <strong className="text-foreground block mb-1">Contenido de las Columnas</strong>
                                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-1">
                                                        <li>Añade enlaces individuales a cada columna.</li>
                                                        <li>Puedes vincular <strong>Artículos del CMS</strong> (ej. tutoriales, noticias) directamente desde los botones de acceso rápido en cada columna.</li>
                                                        <li>Ideal para enlaces secundarios como <em>Política de Privacidad</em> o <em>Términos de Servicio</em>.</li>
                                                    </ul>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold shrink-0 mt-0.5">3</span>
                                                <div>
                                                    <strong className="text-foreground block mb-1">Redes Sociales</strong>
                                                    <p className="text-muted-foreground">
                                                        Aparecen al final del footer. Activa solo las redes que uses.
                                                        Usa URLs completas a tu perfil, por ejemplo: <code className="bg-secondary px-1.5 py-0.5 rounded text-xs select-all">https://instagram.com/miempresa</code>.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-blue-500/20">
                                            <p className="text-xs text-muted-foreground flex gap-2">
                                                <span className="shrink-0">💡</span>
                                                <span>
                                                    <strong>Estrategia:</strong> Un footer bien organizado genera confianza. Incluye siempre una forma de contacto y tus enlaces legales obligatorios aquí.
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer columns */}
                            {footerColumns.map((column, colIndex) => (
                                <div key={colIndex} className="bg-card border border-border rounded-xl p-4 space-y-4">
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
                                                    className="flex-1 px-2 py-1 bg-secondary/30 border border-border rounded text-xs"
                                                    placeholder="Texto"
                                                />
                                                <input
                                                    type="text"
                                                    value={link.href}
                                                    onChange={(e) => updateFooterLink(colIndex, linkIndex, { href: e.target.value })}
                                                    className="flex-1 px-2 py-1 bg-secondary/30 border border-border rounded text-xs font-mono"
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
                                        <div className="pt-2 border-t border-border">
                                            <p className="text-xs text-muted-foreground mb-2">Añadir artículo:</p>
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
                                className="w-full flex items-center justify-center gap-2 p-4 text-sm font-medium border-2 border-dashed border-border rounded-xl hover:border-primary hover:text-primary transition-colors"
                            >
                                <Plus size={18} />
                                Añadir columna al footer
                            </button>

                            {/* Social Links Section */}
                            <div className="mt-8 p-4 bg-card rounded-xl border border-border">
                                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                    <LinkIcon size={16} />
                                    Redes Sociales
                                </h3>

                                {/* Current social links */}
                                <div className="space-y-3 mb-4">
                                    {socialLinks.map(link => {
                                        const platform = SOCIAL_PLATFORMS.find(p => p.value === link.platform);
                                        const PlatformIcon = platform?.icon || LinkIcon;
                                        return (
                                            <div key={link.id} className="flex items-center gap-2 group">
                                                <div className="flex items-center gap-2 w-28 text-sm text-muted-foreground">
                                                    <PlatformIcon size={16} />
                                                    {platform?.label || link.platform}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={link.url}
                                                    onChange={(e) => updateSocialLink(link.id, e.target.value)}
                                                    className="flex-1 px-3 py-2 bg-secondary/30 border border-border rounded-lg text-sm"
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
            </main>
        </div>
    );
};

export default AgencyNavigationManagement;
