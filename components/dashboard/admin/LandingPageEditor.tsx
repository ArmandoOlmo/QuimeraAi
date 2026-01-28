/**
 * LandingPageEditor
 * WYSIWYG editor for the Quimera.ai public landing page
 * Features: Real-time preview, component management, manual save
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, Menu as MenuIcon, Save, Eye, EyeOff, Settings, Layers, Plus,
    GripVertical, Trash2, ChevronDown, ChevronUp, Monitor, Tablet,
    Smartphone, RotateCcw, Loader2, Check, Image, Type, Layout,
    Sparkles, X, RefreshCw, Palette
} from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import LandingPageControls from './LandingPageControls';
import Modal from '../../ui/Modal';
import { GlobalColors } from '../../../types';
import { doc, setDoc, getDoc } from '../../../firebase';
import { db } from '../../../firebase';

// Types for landing page sections
interface LandingSection {
    id: string;
    type: string;
    enabled: boolean;
    order: number;
    data: Record<string, any>;
}

interface LandingPageEditorProps {
    onBack: () => void;
}

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

// Available components for landing page (CONTENIDO section)
const AVAILABLE_COMPONENTS = [
    { type: 'hero', label: 'Hero Principal', icon: <Layout size={18} /> },
    { type: 'heroModern', label: 'Hero Moderno', icon: <Layout size={18} /> },
    { type: 'heroGradient', label: 'Hero Gradiente', icon: <Layout size={18} /> },
    { type: 'features', label: 'Características', icon: <Layers size={18} /> },
    { type: 'pricing', label: 'Precios', icon: <Type size={18} /> },
    { type: 'testimonials', label: 'Testimonios', icon: <Type size={18} /> },
    { type: 'faq', label: 'Preguntas Frecuentes', icon: <Type size={18} /> },
    { type: 'cta', label: 'Llamada a Acción', icon: <Type size={18} /> },
    { type: 'screenshotCarousel', label: 'Carrusel de Imágenes', icon: <Image size={18} />, isNew: true },
];

// Structure items for global settings (ESTRUCTURA section)
const STRUCTURE_ITEMS = [
    { id: 'colors', type: 'colors', label: 'Colores', icon: <Palette size={18} /> },
    { id: 'typography', type: 'typography', label: 'Tipografía', icon: <Type size={18} /> },
    { id: 'navigation', type: 'header', label: 'Navegación', icon: <MenuIcon size={18} /> },
    { id: 'footerGlobal', type: 'footer', label: 'Pie de Página', icon: <Layout size={18} /> },
];

const LandingPageEditor: React.FC<LandingPageEditorProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Editor state
    const [sections, setSections] = useState<LandingSection[]>([]);
    const [originalSections, setOriginalSections] = useState<LandingSection[]>([]); // For undo/reset
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [selectedStructureItem, setSelectedStructureItem] = useState<string | null>(null);
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
    const [isPreviewVisible, setIsPreviewVisible] = useState(true);
    const [showAddComponent, setShowAddComponent] = useState(false);

    // Group expansion state
    const [isStructureExpanded, setIsStructureExpanded] = useState(true);
    const [isContentExpanded, setIsContentExpanded] = useState(true);

    // Save state
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Preview refresh
    const [previewKey, setPreviewKey] = useState(0);

    // Reset confirmation modal
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    // Delete confirmation modal
    const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

    // Iframe ref for postMessage
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Send updates to preview iframe when sections change
    useEffect(() => {
        if (iframeRef.current?.contentWindow) {
            console.log('[Editor] Sending sections to preview:', sections.length, sections.map(s => ({ id: s.id, data: s.data })));
            iframeRef.current.contentWindow.postMessage({
                type: 'LANDING_EDITOR_UPDATE',
                sections: sections
            }, window.location.origin);
        }
    }, [sections]);

    // Listen for PREVIEW_READY message from iframe and send current state
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data?.type === 'PREVIEW_READY') {
                console.log('[Editor] Preview ready, sending current sections');
                if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage({
                        type: 'LANDING_EDITOR_UPDATE',
                        sections: sections
                    }, window.location.origin);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [sections]);

    // Load landing page configuration from Firestore
    useEffect(() => {
        const loadConfiguration = async () => {
            setIsLoading(true);
            try {
                const settingsRef = doc(db, 'globalSettings', 'landingPage');
                const settingsSnap = await getDoc(settingsRef);

                if (settingsSnap.exists()) {
                    const data = settingsSnap.data();
                    if (data.sections && Array.isArray(data.sections)) {
                        setSections(data.sections);
                        setOriginalSections(JSON.parse(JSON.stringify(data.sections))); // Deep copy for reset
                        if (data.lastUpdated) {
                            setLastSaved(new Date(data.lastUpdated));
                        }
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (error) {
                console.error('Error loading landing page configuration:', error);
            }

            // Fallback to default sections if no saved data
            const defaultSections: LandingSection[] = [
                { id: 'header', type: 'header', enabled: true, order: 0, data: {} },
                {
                    id: 'typography', type: 'typography', enabled: true, order: -1, data: {
                        headingFont: 'poppins',
                        bodyFont: 'mulish',
                        buttonFont: 'poppins',
                        headingsCaps: false,
                        buttonsCaps: false,
                        navLinksCaps: false,
                    }
                },
                { id: 'hero', type: 'hero', enabled: true, order: 1, data: {} },
                { id: 'features', type: 'features', enabled: true, order: 2, data: {} },
                { id: 'pricing', type: 'pricing', enabled: true, order: 3, data: {} },
                { id: 'testimonials', type: 'testimonials', enabled: true, order: 4, data: {} },
                { id: 'faq', type: 'faq', enabled: true, order: 5, data: {} },
                { id: 'cta', type: 'cta', enabled: true, order: 6, data: {} },
                { id: 'footer', type: 'footer', enabled: true, order: 7, data: {} },
            ];
            setSections(defaultSections);
            setOriginalSections(JSON.parse(JSON.stringify(defaultSections))); // Deep copy for reset
            setIsLoading(false);
        };
        loadConfiguration();
    }, []);

    // Handle save to Firestore
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const settingsRef = doc(db, 'globalSettings', 'landingPage');
            const payload = {
                sections: sections,
                lastUpdated: new Date().toISOString(),
            };
            await setDoc(settingsRef, payload, { merge: true });
            setHasUnsavedChanges(false);
            setLastSaved(new Date());
            setOriginalSections(JSON.parse(JSON.stringify(sections))); // Update original after save
            // Refresh preview
            setPreviewKey(prev => prev + 1);
            console.log('[LandingPageEditor] Saved to Firestore successfully');
        } catch (error) {
            console.error('Error saving landing page:', error);
            alert(t('common.errorSaving', { defaultValue: '❌ Error saving. Please try again.' }));
        } finally {
            setIsSaving(false);
        }
    }, [sections, t]);

    // Toggle section visibility
    const toggleSection = (id: string) => {
        setSections(prev => prev.map(s =>
            s.id === id ? { ...s, enabled: !s.enabled } : s
        ));
        setHasUnsavedChanges(true);
    };

    // Move section up/down
    const moveSection = (id: string, direction: 'up' | 'down') => {
        setSections(prev => {
            const idx = prev.findIndex(s => s.id === id);
            if ((direction === 'up' && idx <= 1) || (direction === 'down' && idx >= prev.length - 1)) {
                return prev; // Can't move header or beyond limits
            }
            const newSections = [...prev];
            const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
            [newSections[idx], newSections[targetIdx]] = [newSections[targetIdx], newSections[idx]];
            return newSections.map((s, i) => ({ ...s, order: i }));
        });
        setHasUnsavedChanges(true);
    };

    // Delete section - triggers modal
    const deleteSection = (id: string) => {
        setSectionToDelete(id);
    };

    // Confirm delete - executing the action
    const confirmDeleteSection = () => {
        if (!sectionToDelete) return;
        setSections(prev => prev.filter(s => s.id !== sectionToDelete));
        if (selectedSection === sectionToDelete) setSelectedSection(null);
        setHasUnsavedChanges(true);
        setSectionToDelete(null);
    };

    // Add new component
    const addComponent = (type: string) => {
        const newSection: LandingSection = {
            id: `${type}-${Date.now()}`,
            type,
            enabled: true,
            order: sections.length,
            data: {}
        };
        setSections(prev => [...prev, newSection]);
        setSelectedSection(newSection.id);
        setShowAddComponent(false);
        setHasUnsavedChanges(true);
    };

    // Update section data from controls
    const updateSectionData = useCallback((sectionId: string, newData: Record<string, any>) => {
        setSections(prev => prev.map(s =>
            s.id === sectionId ? { ...s, data: newData } : s
        ));
        setHasUnsavedChanges(true);
    }, []);

    /**
     * Mapeo de colores globales a cada tipo de sección del landing page
     */
    const generateLandingSectionColorMappings = (colors: GlobalColors): Record<string, Record<string, string>> => ({
        hero: {
            backgroundColor: colors.background,
            textColor: colors.text,
            accentColor: colors.primary,
        },
        heroModern: {
            backgroundColor: colors.background,
            textColor: colors.text,
            accentColor: colors.primary,
        },
        heroGradient: {
            backgroundColor: colors.background,
            textColor: colors.text,
            accentColor: colors.primary,
        },
        features: {
            backgroundColor: colors.surface,
            textColor: colors.text,
            accentColor: colors.primary,
        },
        pricing: {
            backgroundColor: colors.background,
            textColor: colors.text,
            accentColor: colors.primary,
        },
        testimonials: {
            backgroundColor: colors.surface,
            textColor: colors.text,
            accentColor: colors.secondary,
        },
        faq: {
            backgroundColor: colors.background,
            textColor: colors.text,
            accentColor: colors.primary,
        },
        cta: {
            backgroundColor: colors.primary,
            textColor: '#ffffff',
            accentColor: colors.secondary,
        },
        footer: {
            backgroundColor: colors.surface,
            textColor: colors.textMuted,
            accentColor: colors.primary,
        },
        header: {
            backgroundColor: colors.background,
            textColor: colors.text,
            accentColor: colors.primary,
        },
        screenshotCarousel: {
            backgroundColor: colors.background,
            textColor: colors.text,
            accentColor: colors.primary,
        },
    });

    /**
     * Aplica colores globales a TODAS las secciones del landing page
     */
    const applyGlobalColorsToAllSections = useCallback((colors: GlobalColors) => {
        const colorMappings = generateLandingSectionColorMappings(colors);

        setSections(prev => prev.map(section => {
            const sectionColors = colorMappings[section.type];
            if (sectionColors) {
                return {
                    ...section,
                    data: {
                        ...section.data,
                        ...sectionColors
                    }
                };
            }
            return section;
        }));

        setHasUnsavedChanges(true);
        // Refresh preview
        setPreviewKey(prev => prev + 1);
    }, []);

    // Get preview iframe width based on device
    const previewWidth = useMemo(() => {
        switch (previewDevice) {
            case 'tablet': return 'max-w-[768px]';
            case 'mobile': return 'max-w-[375px]';
            default: return 'max-w-full';
        }
    }, [previewDevice]);

    // Currently selected section data
    const currentSection = useMemo(() =>
        sections.find(s => s.id === selectedSection),
        [sections, selectedSection]
    );

    // Scroll preview to section when selected
    const scrollToSection = useCallback((sectionType: string) => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'SCROLL_TO_SECTION',
                sectionType: sectionType
            }, window.location.origin);
        }
    }, []);

    // Handle section selection - select and scroll to section
    const handleSectionSelect = useCallback((sectionId: string, sectionType: string) => {
        setSelectedSection(sectionId);
        setSelectedStructureItem(null); // Clear structure selection
        scrollToSection(sectionType);
    }, [scrollToSection]);

    // Handle structure item selection (Colores, Tipografía, etc.)
    const handleStructureSelect = useCallback((itemId: string) => {
        setSelectedStructureItem(itemId);
        setSelectedSection(null); // Clear section selection
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Sidebar */}
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 px-4 lg:px-6 border-b border-border flex items-center bg-background z-20 sticky top-0">
                    {/* Left Section */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors"
                        >
                            <MenuIcon className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Layout className="text-primary w-5 h-5" />
                            <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                                {t('landingEditor.title', 'Editor Landing Page')}
                            </h1>
                        </div>

                        {/* Unsaved changes indicator */}
                        {hasUnsavedChanges && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-500 rounded-full">
                                {t('landingEditor.unsavedChanges', 'Cambios sin guardar')}
                            </span>
                        )}
                    </div>

                    {/* Center - Device Preview Toggle */}
                    <div className="hidden md:flex flex-1 justify-center">
                        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
                            <button
                                onClick={() => setPreviewDevice('desktop')}
                                className={`p-2 rounded-md transition-colors ${previewDevice === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                title="Desktop"
                            >
                                <Monitor size={18} />
                            </button>
                            <button
                                onClick={() => setPreviewDevice('tablet')}
                                className={`p-2 rounded-md transition-colors ${previewDevice === 'tablet' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                title="Tablet"
                            >
                                <Tablet size={18} />
                            </button>
                            <button
                                onClick={() => setPreviewDevice('mobile')}
                                className={`p-2 rounded-md transition-colors ${previewDevice === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                title="Mobile"
                            >
                                <Smartphone size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-2 ml-auto">
                        {/* Refresh preview */}
                        <button
                            onClick={() => setPreviewKey(prev => prev + 1)}
                            className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title={t('landingEditor.refreshPreview', 'Refrescar vista previa')}
                        >
                            <RefreshCw size={18} />
                        </button>

                        {/* Toggle preview */}
                        <button
                            onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                            className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title={isPreviewVisible ? 'Ocultar vista previa' : 'Mostrar vista previa'}
                        >
                            {isPreviewVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>

                        {/* Reset/Undo button */}
                        {hasUnsavedChanges && (
                            <button
                                onClick={() => setShowResetConfirm(true)}
                                className="flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium transition-all bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                title={t('landingEditor.resetChanges', 'Descartar cambios')}
                            >
                                <RotateCcw size={16} />
                                <span className="hidden sm:inline">{t('landingEditor.reset', 'Deshacer')}</span>
                            </button>
                        )}

                        {/* Save button */}
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !hasUnsavedChanges}
                            className={`flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium transition-all ${hasUnsavedChanges
                                ? 'bg-primary text-primary-foreground hover:opacity-90'
                                : 'bg-secondary/50 text-muted-foreground cursor-not-allowed'
                                }`}
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            <span className="hidden sm:inline">
                                {isSaving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
                            </span>
                        </button>

                        {/* Back button */}
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 h-9 px-3 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                        </button>
                    </div>
                </header>

                {/* Main Content - Three Panel Layout */}
                <main className="flex-1 flex overflow-hidden">
                    {/* Left Panel - Grouped Component List */}
                    <div className="w-64 lg:w-72 border-r border-border bg-card/50 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h2 className="font-semibold text-sm">{t('landingEditor.pageStructure', 'ESTRUCTURA DE PÁGINA')}</h2>
                            <button
                                onClick={() => setShowAddComponent(true)}
                                className="h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-colors"
                                title={t('landingEditor.addComponent', 'Añadir componente')}
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto p-2">
                            {/* ESTRUCTURA Group */}
                            <div className="mb-4">
                                <button
                                    onClick={() => setIsStructureExpanded(!isStructureExpanded)}
                                    className="w-full flex items-center gap-2 px-2 py-2 text-xs font-bold text-primary uppercase tracking-wider hover:bg-secondary/30 rounded transition-colors"
                                >
                                    <ChevronDown size={14} className={`transition-transform ${isStructureExpanded ? '' : '-rotate-90'}`} />
                                    <span>{t('landingEditor.structure', 'ESTRUCTURA')}</span>
                                    <span className="text-muted-foreground">({STRUCTURE_ITEMS.length})</span>
                                </button>

                                {isStructureExpanded && (
                                    <div className="mt-1 space-y-0.5 pl-2">
                                        {STRUCTURE_ITEMS.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleStructureSelect(item.id)}
                                                className={`w-full flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors text-left ${selectedStructureItem === item.id
                                                    ? 'bg-primary/10 border border-primary/30'
                                                    : 'hover:bg-secondary/50 border border-transparent'
                                                    }`}
                                            >
                                                <span className="text-muted-foreground">{item.icon}</span>
                                                <span className="text-sm font-medium">{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* CONTENIDO Group */}
                            <div>
                                <button
                                    onClick={() => setIsContentExpanded(!isContentExpanded)}
                                    className="w-full flex items-center gap-2 px-2 py-2 text-xs font-bold text-primary uppercase tracking-wider hover:bg-secondary/30 rounded transition-colors"
                                >
                                    <ChevronDown size={14} className={`transition-transform ${isContentExpanded ? '' : '-rotate-90'}`} />
                                    <span>{t('landingEditor.content', 'CONTENIDO')}</span>
                                    <span className="text-muted-foreground">({sections.filter(s => s.type !== 'header' && s.type !== 'footer').length})</span>
                                </button>

                                {isContentExpanded && (
                                    <div className="mt-1 space-y-0.5 pl-2">
                                        {sections.filter(s => s.type !== 'header' && s.type !== 'footer').map((section, idx) => (
                                            <div
                                                key={section.id}
                                                onClick={() => handleSectionSelect(section.id, section.type)}
                                                className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${selectedSection === section.id
                                                    ? 'bg-primary/10 border border-primary/30'
                                                    : 'hover:bg-secondary/50 border border-transparent'
                                                    } ${!section.enabled ? 'opacity-50' : ''}`}
                                            >
                                                <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate capitalize">{section.type}</p>
                                                </div>
                                                {/* Section actions */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }}
                                                        className="p-1 rounded hover:bg-secondary"
                                                    >
                                                        {section.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                                                        className="p-1 rounded hover:bg-destructive/20 text-destructive"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Last saved indicator */}
                        {lastSaved && (
                            <div className="p-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                                <Check size={12} className="text-green-500" />
                                <span>
                                    {t('landingEditor.lastSaved', 'Guardado')}: {lastSaved.toLocaleTimeString()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Center Panel - Preview */}
                    {isPreviewVisible && (
                        <div className="flex-1 bg-muted/30 p-4 overflow-hidden flex flex-col">
                            <div className={`flex-1 bg-white rounded-lg shadow-lg overflow-hidden mx-auto ${previewWidth} w-full transition-all duration-300`}>
                                <iframe
                                    ref={iframeRef}
                                    key={previewKey}
                                    src="/?preview=landing"
                                    className="w-full h-full border-0"
                                    title="Landing Page Preview"
                                />
                            </div>
                        </div>
                    )}

                    {/* Right Panel - Component Controls */}
                    <div className={`${isPreviewVisible ? 'w-80 lg:w-96' : 'flex-1 max-w-2xl mx-auto'} border-l border-border bg-card/50 flex flex-col overflow-hidden`}>
                        {/* Structure Item Controls (Colores, Tipografía, etc.) */}
                        {selectedStructureItem ? (
                            <>
                                <div className="p-4 border-b border-border">
                                    <h2 className="font-semibold text-sm flex items-center gap-2">
                                        <Settings size={16} className="text-primary" />
                                        {t('landingEditor.edit', 'Editar')}: <span className="capitalize">
                                            {STRUCTURE_ITEMS.find(i => i.id === selectedStructureItem)?.label || selectedStructureItem}
                                        </span>
                                    </h2>
                                </div>
                                <LandingPageControls
                                    section={{
                                        id: selectedStructureItem,
                                        type: STRUCTURE_ITEMS.find(i => i.id === selectedStructureItem)?.type || selectedStructureItem,
                                        enabled: true,
                                        order: 0,
                                        data: sections.find(s => s.type === STRUCTURE_ITEMS.find(i => i.id === selectedStructureItem)?.type)?.data || {}
                                    }}
                                    onUpdateSection={updateSectionData}
                                    onRefreshPreview={() => setPreviewKey(prev => prev + 1)}
                                    allSections={sections}
                                    onApplyGlobalColors={applyGlobalColorsToAllSections}
                                />
                            </>
                        ) : currentSection ? (
                            <>
                                <div className="p-4 border-b border-border">
                                    <h2 className="font-semibold text-sm flex items-center gap-2">
                                        <Settings size={16} className="text-primary" />
                                        {t('landingEditor.editSection', 'Editar')}: <span className="capitalize">{currentSection.type}</span>
                                    </h2>
                                </div>
                                <LandingPageControls
                                    section={currentSection}
                                    onUpdateSection={updateSectionData}
                                    onRefreshPreview={() => setPreviewKey(prev => prev + 1)}
                                    allSections={sections}
                                    onApplyGlobalColors={applyGlobalColorsToAllSections}
                                />
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center p-8">
                                <div className="text-center">
                                    <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <h3 className="font-semibold mb-2">{t('landingEditor.noSelection', 'Ninguna sección seleccionada')}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t('landingEditor.selectSectionHint', 'Selecciona una sección de la lista para editarla')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Add Component Modal */}
            {showAddComponent && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl border border-border w-full max-w-md shadow-xl">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold">{t('landingEditor.addComponent', 'Añadir componente')}</h3>
                            <button
                                onClick={() => setShowAddComponent(false)}
                                className="p-1 rounded hover:bg-secondary"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                            {AVAILABLE_COMPONENTS.map(comp => (
                                <button
                                    key={comp.type}
                                    onClick={() => addComponent(comp.type)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                                >
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        {comp.icon}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{comp.label}</p>
                                    </div>
                                    {comp.isNew && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-500 rounded-full">
                                            Nuevo
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Confirmation Modal */}
            <Modal
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                maxWidth="max-w-md"
            >
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4">{t('common.confirm', 'Confirmar')}</h3>
                    <p className="text-muted-foreground mb-6">
                        {t('landingEditor.confirmReset', '¿Descartar todos los cambios no guardados?')}
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowResetConfirm(false)}
                            className="px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
                        >
                            {t('common.cancel', 'Cancelar')}
                        </button>
                        <button
                            onClick={() => {
                                setSections(JSON.parse(JSON.stringify(originalSections)));
                                setHasUnsavedChanges(false);
                                setPreviewKey(prev => prev + 1);
                                setShowResetConfirm(false);
                            }}
                            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                        >
                            {t('landingEditor.discardChanges', 'Descartar')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!sectionToDelete}
                onClose={() => setSectionToDelete(null)}
                maxWidth="max-w-md"
            >
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4">{t('landingEditor.confirmDeleteTitle', 'Eliminar Sección')}</h3>
                    <p className="text-muted-foreground mb-6">
                        {t('landingEditor.confirmDeleteMessage', '¿Estás seguro de que quieres eliminar esta sección? Esta acción no se puede deshacer.')}
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setSectionToDelete(null)}
                            className="px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
                        >
                            {t('common.cancel', 'Cancelar')}
                        </button>
                        <button
                            onClick={confirmDeleteSection}
                            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                        >
                            {t('common.delete', 'Eliminar')}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default LandingPageEditor;
