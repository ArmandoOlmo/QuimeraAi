/**
 * LandingPageEditor
 * WYSIWYG editor for the Quimera.ai public landing page
 * Features: Real-time preview, component management, manual save
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Menu as MenuIcon, Save, Eye, EyeOff, Settings, Layers, Plus,
    GripVertical, Trash2, ChevronDown, ChevronUp, Monitor, Tablet,
    Smartphone, Loader2, Check, Image, Type, Layout,
    Sparkles, X, RefreshCw, Palette, PanelRightClose, PanelRightOpen
} from 'lucide-react';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { useUndoRedo, UndoableAction } from '../../../hooks/useUndoRedo';
import { UndoRedoGroup } from '../../ui/UndoButton';
import { useUndo } from '../../../contexts/undo';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DashboardSidebar from '../DashboardSidebar';
import LandingPageControls from './LandingPageControls';
import Modal from '../../ui/Modal';
import { GlobalColors } from '../../../types';
import { generateHeroWaveGradientColors, contrastText } from '../../ui/GlobalStylesControl';
import { hexToRgba } from '../../../utils/colorUtils';
import { doc, setDoc, getDoc, collection, getDocs, writeBatch, deleteDoc } from '../../../firebase';
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
    { type: 'hero', label: 'Hero Principal', icon: Layout },
    { type: 'heroModern', label: 'Hero Moderno', icon: Layout },
    { type: 'heroGradient', label: 'Hero Gradiente', icon: Layout },
    { type: 'features', label: 'Características', icon: Layers },
    { type: 'pricing', label: 'Precios', icon: Type },
    { type: 'testimonials', label: 'Testimonios', icon: Type },
    { type: 'faq', label: 'Preguntas Frecuentes', icon: Type },
    { type: 'cta', label: 'Llamada a Acción', icon: Type },
    { type: 'screenshotCarousel', label: 'Carrusel de Imágenes', icon: Image, isNew: true },
];

// Structure items for global settings (ESTRUCTURA section)
const STRUCTURE_ITEMS = [
    { id: 'colors', type: 'colors', label: 'Colores', icon: Palette },
    { id: 'typography', type: 'typography', label: 'Tipografía', icon: Type },
    { id: 'navigation', type: 'header', label: 'Navegación', icon: MenuIcon },
    { id: 'footerGlobal', type: 'footer', label: 'Pie de Página', icon: Layout },
];

const getLandingSectionIcon = (type: string) => {
    return AVAILABLE_COMPONENTS.find(component => component.type === type)?.icon
        || STRUCTURE_ITEMS.find(item => item.type === type)?.icon
        || Layout;
};

// Sortable Section Item Component
interface SortableSectionItemProps {
    section: LandingSection;
    isActive: boolean;
    onSelect: () => void;
    onToggleVisibility: () => void;
    onDelete: () => void;
}

const SortableSectionItem: React.FC<SortableSectionItemProps> = ({
    section,
    isActive,
    onSelect,
    onToggleVisibility,
    onDelete,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };
    const Icon = getLandingSectionIcon(section.type);

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${isActive
                ? 'bg-primary/10 border border-primary/30'
                : 'hover:bg-secondary/50 border border-transparent'
                } ${!section.enabled ? 'opacity-50' : ''} ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
            </div>

            <Icon size={16} className="text-muted-foreground flex-shrink-0" />

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate capitalize">{section.type}</p>
            </div>

            {/* Section actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
                    className="p-1 rounded hover:bg-secondary"
                >
                    {section.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1 rounded hover:bg-destructive/20 text-destructive"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

// Drag Overlay Item (shown while dragging)
const DragOverlayItem: React.FC<{ section: LandingSection }> = ({ section }) => {
    const Icon = getLandingSectionIcon(section.type);
    return (
    <div className="flex items-center gap-2 p-2.5 bg-card border border-primary rounded-lg shadow-xl">
        <GripVertical size={14} className="text-primary" />
        <Icon size={16} className="text-primary" />
        <span className="text-sm font-medium capitalize">{section.type}</span>
    </div>
    );
};

const LandingPageEditor: React.FC<LandingPageEditorProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Editor state
    const [sections, setSections] = useState<LandingSection[]>([]);

    // Undo/Redo integration
    const undoContext = useUndo();
    const {
        pushAction,
        undo,
        redo,
        canUndo,
        canRedo,
        lastActionDescription,
        clear: clearHistory
    } = useUndoRedo<LandingSection[]>({
        moduleId: 'landing-page-editor',
        maxHistory: 50,
        onUndo: (action) => {
            setSections(action.previousState);
        },
        onRedo: (action) => {
            setSections(action.newState);
        }
    });

    // Register with global undo context
    useEffect(() => {
        undoContext.registerModule('landing-page-editor', {
            undo: () => undo(),
            redo: () => redo(),
            canUndo: () => canUndo,
            canRedo: () => canRedo,
            getLastActionDescription: () => lastActionDescription,
        });
        undoContext.setActiveModule('landing-page-editor');

        return () => {
            undoContext.unregisterModule('landing-page-editor');
        };
    }, [canUndo, canRedo, lastActionDescription]);

    // Helper to update sections with undo tracking
    const updateSectionsWithUndo = useCallback((newSections: LandingSection[], description: string) => {
        pushAction({
            type: 'update_sections',
            description,
            previousState: sections,
            newState: newSections,
        });
        setSections(newSections);
        setHasUnsavedChanges(true);
    }, [sections, pushAction]);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [selectedStructureItem, setSelectedStructureItem] = useState<string | null>(null);
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
    const [isPreviewVisible, setIsPreviewVisible] = useState(true);
    const [isControlsPanelOpen, setIsControlsPanelOpen] = useState(true);
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

    // Drag and drop state
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // Configure sensors for drag detection
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Iframe ref for postMessage
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Saved sections ref for reset-all functionality
    const savedSectionsRef = useRef<LandingSection[]>([]);

    // Portal ref for rendering ImagePicker modal inside the preview panel
    const previewPortalRef = useRef<HTMLDivElement>(null);
    const previewOverlayRef = useRef<HTMLDivElement>(null);

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

    // Default section definitions for structure items
    const defaultStructureSections: LandingSection[] = [
        {
            id: 'header', type: 'header', enabled: true, order: 0, data: {
                logoText: 'Quimera.ai',
                showLoginButton: true,
                showRegisterButton: true,
                loginText: 'Iniciar Sesión',
                registerText: 'Comenzar Gratis',
                sticky: true,
                transparent: false,
                backgroundColor: '#000000',
            }
        },
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
        {
            id: 'colors', type: 'colors', enabled: true, order: -2, data: {
                backgroundColor: '#000000',
                textColor: '#ffffff',
                accentColor: '#facc15',
                secondaryColor: '#3b82f6',
                mainColor: '#3b82f6',
            }
        },
        { id: 'footer', type: 'footer', enabled: true, order: 99, data: {} },
    ];

    // Helper to ensure required structure sections exist AND normalize IDs
    const ensureStructureSections = (loadedSections: LandingSection[]): LandingSection[] => {
        const result = [...loadedSections];

        // FIX: Normalize section IDs to match their types for structure sections
        // This fixes legacy data where sections were saved with wrong IDs (e.g., "navigation" instead of "header")
        const structureTypeToId: Record<string, string> = {
            'header': 'header',
            'footer': 'footer',
            'typography': 'typography',
            'colors': 'colors',
        };

        // First pass: normalize IDs for existing structure sections
        for (let i = 0; i < result.length; i++) {
            const section = result[i];
            const expectedId = structureTypeToId[section.type];
            if (expectedId && section.id !== expectedId) {
                result[i] = { ...section, id: expectedId };
            }
        }

        // Second pass: add missing structure sections
        for (const defaultSection of defaultStructureSections) {
            const existingSection = result.find(s => s.type === defaultSection.type);
            if (!existingSection) {
                // Section doesn't exist, add it
                result.push(defaultSection);
            } else if (!existingSection.data || Object.keys(existingSection.data).length === 0) {
                // Section exists but has no data, merge with defaults
                const index = result.findIndex(s => s.id === existingSection.id);
                if (index !== -1) {
                    result[index] = {
                        ...existingSection,
                        data: { ...defaultSection.data, ...existingSection.data }
                    };
                }
            }
        }

        return result;
    };

    // Load landing page configuration from Firestore
    // Sections are stored individually in globalSettings/landingPage/sections/{sectionId}
    // to avoid the Firestore 1 MB document size limit.
    useEffect(() => {
        const loadConfiguration = async () => {
            setIsLoading(true);
            try {
                const sectionsColRef = collection(db, 'globalSettings', 'landingPage', 'sections');
                const sectionsSnap = await getDocs(sectionsColRef);

                if (!sectionsSnap.empty) {
                    const loadedSections: LandingSection[] = sectionsSnap.docs.map(d => d.data() as LandingSection);

                    // Ensure required structure sections exist
                    const mergedSections = ensureStructureSections(loadedSections);

                    // Hydrate features section if it has no features array
                    const featuresIdx = mergedSections.findIndex(s => s.type === 'features');
                    if (featuresIdx !== -1) {
                        const fd = mergedSections[featuresIdx].data || {};
                        // Migration: if old 'items' key exists but 'features' doesn't, copy items -> features
                        if (!fd.features && fd.items) {
                            fd.features = fd.items;
                        }
                        // If still no features array, populate with defaults
                        if (!fd.features || fd.features.length === 0) {
                            fd.features = [
                                { title: 'Generación Instantánea', description: 'Crea sitios web completos en menos de 30 segundos con IA', imageUrl: '' },
                                { title: 'Imágenes con IA', description: 'Genera imágenes 4K profesionales directamente desde tu editor', imageUrl: '' },
                                { title: 'Componentes Profesionales', description: 'Más de 20 componentes modernos listos para usar', imageUrl: '' },
                                { title: 'Sistema de Diseño Global', description: 'Cambia colores, fuentes y estilos en todo tu sitio con un clic', imageUrl: '' },
                                { title: 'Chatbot IA Integrado', description: 'Asistente conversacional para tus visitantes con voz', imageUrl: '' },
                                { title: 'SEO Optimizado', description: 'Herramientas automáticas para posicionar tu sitio', imageUrl: '' },
                            ];
                        }
                        // Ensure flat color keys exist for PublicLandingPage compatibility
                        if (!fd.backgroundColor) fd.backgroundColor = fd.colors?.background || '#0A0A0A';
                        if (!fd.textColor) fd.textColor = fd.colors?.heading || '#ffffff';
                        if (!fd.accentColor) fd.accentColor = fd.colors?.accent || '#facc15';
                        if (!fd.columns) fd.columns = fd.gridColumns || 3;
                        mergedSections[featuresIdx] = { ...mergedSections[featuresIdx], data: fd };
                    }

                    // Sort by order field
                    mergedSections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

                    setSections(mergedSections);
                    savedSectionsRef.current = JSON.parse(JSON.stringify(mergedSections));

                    // Try to get lastUpdated from root doc
                    try {
                        const rootSnap = await getDoc(doc(db, 'globalSettings', 'landingPage'));
                        if (rootSnap.exists() && rootSnap.data().lastUpdated) {
                            setLastSaved(new Date(rootSnap.data().lastUpdated));
                        }
                    } catch (_) { /* not critical */ }

                    setIsLoading(false);
                    return;
                }

                // Fallback: try legacy single-document format
                const settingsRef = doc(db, 'globalSettings', 'landingPage');
                const settingsSnap = await getDoc(settingsRef);

                if (settingsSnap.exists()) {
                    const data = settingsSnap.data();
                    if (data.sections && Array.isArray(data.sections)) {
                        const mergedSections = ensureStructureSections(data.sections);

                        const featuresIdx = mergedSections.findIndex(s => s.type === 'features');
                        if (featuresIdx !== -1) {
                            const fd = mergedSections[featuresIdx].data || {};
                            if (!fd.features && fd.items) fd.features = fd.items;
                            if (!fd.features || fd.features.length === 0) {
                                fd.features = [
                                    { title: 'Generación Instantánea', description: 'Crea sitios web completos en menos de 30 segundos con IA', imageUrl: '' },
                                    { title: 'Imágenes con IA', description: 'Genera imágenes 4K profesionales directamente desde tu editor', imageUrl: '' },
                                    { title: 'Componentes Profesionales', description: 'Más de 20 componentes modernos listos para usar', imageUrl: '' },
                                    { title: 'Sistema de Diseño Global', description: 'Cambia colores, fuentes y estilos en todo tu sitio con un clic', imageUrl: '' },
                                    { title: 'Chatbot IA Integrado', description: 'Asistente conversacional para tus visitantes con voz', imageUrl: '' },
                                    { title: 'SEO Optimizado', description: 'Herramientas automáticas para posicionar tu sitio', imageUrl: '' },
                                ];
                            }
                            if (!fd.backgroundColor) fd.backgroundColor = fd.colors?.background || '#0A0A0A';
                            if (!fd.textColor) fd.textColor = fd.colors?.heading || '#ffffff';
                            if (!fd.accentColor) fd.accentColor = fd.colors?.accent || '#facc15';
                            if (!fd.columns) fd.columns = fd.gridColumns || 3;
                            mergedSections[featuresIdx] = { ...mergedSections[featuresIdx], data: fd };
                        }

                        setSections(mergedSections);
                        savedSectionsRef.current = JSON.parse(JSON.stringify(mergedSections));
                        if (data.lastUpdated) setLastSaved(new Date(data.lastUpdated));
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (error) {
                console.error('Error loading landing page configuration:', error);
            }

            // Fallback to default sections if no saved data
            const defaultSections: LandingSection[] = [
                ...defaultStructureSections,
                { id: 'hero', type: 'hero', enabled: true, order: 1, data: {} },
                { id: 'features', type: 'features', enabled: true, order: 2, data: {
                    title: '',
                    subtitle: '',
                    backgroundColor: '#0A0A0A',
                    textColor: '#ffffff',
                    accentColor: '#facc15',
                    columns: 3,
                    showIcons: true,
                    features: [
                        { title: 'Generación Instantánea', description: 'Crea sitios web completos en menos de 30 segundos con IA', imageUrl: '' },
                        { title: 'Imágenes con IA', description: 'Genera imágenes 4K profesionales directamente desde tu editor', imageUrl: '' },
                        { title: 'Componentes Profesionales', description: 'Más de 20 componentes modernos listos para usar', imageUrl: '' },
                        { title: 'Sistema de Diseño Global', description: 'Cambia colores, fuentes y estilos en todo tu sitio con un clic', imageUrl: '' },
                        { title: 'Chatbot IA Integrado', description: 'Asistente conversacional para tus visitantes con voz', imageUrl: '' },
                        { title: 'SEO Optimizado', description: 'Herramientas automáticas para posicionar tu sitio', imageUrl: '' },
                    ],
                } },
                { id: 'pricing', type: 'pricing', enabled: true, order: 3, data: {} },
                { id: 'testimonials', type: 'testimonials', enabled: true, order: 4, data: {} },
                { id: 'faq', type: 'faq', enabled: true, order: 5, data: {} },
                { id: 'cta', type: 'cta', enabled: true, order: 6, data: {} },
            ];
            setSections(defaultSections);
            savedSectionsRef.current = JSON.parse(JSON.stringify(defaultSections));
            setIsLoading(false);
        };
        loadConfiguration();
    }, []);

    // Handle save to Firestore
    // Each section is stored as its own document in the sub-collection
    // globalSettings/landingPage/sections/{sectionId} to avoid the 1 MB limit.
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const now = new Date().toISOString();
            const sectionsColRef = collection(db, 'globalSettings', 'landingPage', 'sections');

            // 1. Get currently persisted section IDs so we can delete removed ones
            const existingSnap = await getDocs(sectionsColRef);
            const existingIds = new Set(existingSnap.docs.map(d => d.id));
            const currentIds = new Set(sections.map(s => s.id));

            // Firestore batch writes are limited to 500 ops. Sections are small in count so this is fine.
            const batch = writeBatch(db);

            // 2. Upsert each section as its own document
            for (const section of sections) {
                const sectionRef = doc(sectionsColRef, section.id);
                batch.set(sectionRef, section, { merge: false });
            }

            // 3. Delete sections that no longer exist
            for (const existingId of existingIds) {
                if (!currentIds.has(existingId)) {
                    batch.delete(doc(sectionsColRef, existingId));
                }
            }

            // 4. Update root doc with lightweight metadata only
            const rootRef = doc(db, 'globalSettings', 'landingPage');
            batch.set(rootRef, { lastUpdated: now, sectionIds: sections.map(s => s.id) }, { merge: true });

            await batch.commit();

            setHasUnsavedChanges(false);
            setLastSaved(new Date());
            savedSectionsRef.current = JSON.parse(JSON.stringify(sections));
            clearHistory();
            setPreviewKey(prev => prev + 1);
            console.log('[LandingPageEditor] Saved to Firestore successfully (sub-collection strategy)');
        } catch (error) {
            console.error('Error saving landing page:', error);
            alert(t('common.errorSaving', { defaultValue: '❌ Error saving. Please try again.' }));
        } finally {
            setIsSaving(false);
        }
    }, [sections, t]);

    // Toggle section visibility
    const toggleSection = (id: string) => {
        const targetSection = sections.find(s => s.id === id);
        const newSections = sections.map(s =>
            s.id === id ? { ...s, enabled: !s.enabled } : s
        );
        updateSectionsWithUndo(
            newSections,
            `${targetSection?.enabled ? 'Ocultó' : 'Mostró'} sección ${targetSection?.type || id}`
        );
    };

    // Move section up/down via drag and drop
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over || active.id === over.id) return;

        const oldIndex = sections.findIndex(s => s.id === active.id);
        const newIndex = sections.findIndex(s => s.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const movedSection = sections[oldIndex];
        const newSections = arrayMove(sections, oldIndex, newIndex)
            .map((s, i) => ({ ...s, order: i }));

        updateSectionsWithUndo(
            newSections,
            `Movió sección ${movedSection.type}`
        );
    };

    // Delete section - triggers modal
    const deleteSection = (id: string) => {
        setSectionToDelete(id);
    };

    // Confirm delete - executing the action
    const confirmDeleteSection = () => {
        if (!sectionToDelete) return;
        const deletedSection = sections.find(s => s.id === sectionToDelete);
        const newSections = sections.filter(s => s.id !== sectionToDelete);
        updateSectionsWithUndo(
            newSections,
            `Eliminó sección ${deletedSection?.type || sectionToDelete}`
        );
        if (selectedSection === sectionToDelete) setSelectedSection(null);
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
        const newSections = [...sections, newSection];
        updateSectionsWithUndo(
            newSections,
            `Agregó sección ${type}`
        );
        setSelectedSection(newSection.id);
        setShowAddComponent(false);
    };

    // Update section data from controls - FIXED v4 (Functional Iteration)
    const updateSectionData = useCallback((sectionId: string, newDataOrUpdater: any) => {
        setSections(prev => {
            return prev.map(s => {
                if (s.id === sectionId) {
                    const newData = typeof newDataOrUpdater === 'function' ? newDataOrUpdater(s.data || {}) : newDataOrUpdater;
                    return { ...s, data: newData };
                }
                return s;
            });
        });
        setHasUnsavedChanges(true);
    }, []);

    /**
     * Mapeo de colores globales a cada tipo de sección del landing page
     */
    const generateLandingSectionColorMappings = (colors: GlobalColors): Record<string, any> => ({
        hero: {
            colors: {
                primary: colors.primary,
                secondary: colors.secondary,
                background: colors.background,
                text: colors.text,
                heading: colors.heading,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
                secondaryButtonBackground: colors.surface,
                secondaryButtonText: colors.heading,
            }
        },
        heroModern: {
            colors: {
                primary: colors.primary,
                secondary: colors.secondary,
                background: colors.background,
                text: colors.text,
                heading: colors.heading,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
                secondaryButtonBackground: colors.surface,
                secondaryButtonText: colors.heading,
            }
        },
        heroGradient: {
            colors: {
                primary: colors.primary,
                secondary: colors.secondary,
                background: colors.background,
                text: colors.text,
                heading: colors.heading,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
                secondaryButtonBackground: colors.surface,
                secondaryButtonText: colors.heading,
            }
        },
        heroSplit: {
            colors: {
                textBackground: colors.background,
                imageBackground: colors.surface,
                heading: colors.heading,
                text: colors.text,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
            }
        },
        heroGallery: {
            colors: {
                primary: colors.primary,
                secondary: colors.secondary,
                background: colors.background,
                text: colors.text,
                heading: colors.heading,
                ctaText: colors.heading,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
                dotActive: colors.heading,
                dotInactive: hexToRgba(colors.heading, 0.4),
                arrowColor: colors.heading,
            }
        },
        heroWave: {
            colors: {
                primary: colors.primary,
                secondary: colors.secondary,
                background: colors.background,
                text: colors.text,
                heading: colors.heading,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
            }
        },
        heroNova: {
            colors: {
                primary: colors.primary,
                secondary: colors.secondary,
                background: colors.background,
                text: colors.text,
                heading: colors.heading,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
                accent: colors.accent,
            }
        },
        features: {
            colors: {
                background: colors.surface,
                accent: colors.primary,
                borderColor: colors.border,
                text: colors.text,
                heading: colors.heading,
                description: colors.text,
                cardBackground: colors.surface,
                cardHeading: colors.heading,
                cardText: colors.text,
            }
        },
        pricing: {
            colors: {
                background: colors.background,
                accent: colors.primary,
                borderColor: colors.border,
                text: colors.text,
                heading: colors.heading,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
                gradientStart: colors.primary,
                gradientEnd: colors.secondary,
                cardBackground: colors.surface,
                checkmarkColor: colors.success,
            }
        },
        testimonials: {
            colors: {
                background: colors.surface,
                accent: colors.secondary,
                borderColor: colors.border,
                text: colors.text,
                heading: colors.heading,
                description: colors.text,
                subtitleColor: colors.textMuted,
                cardBackground: colors.surface,
            }
        },
        faq: {
            colors: {
                background: colors.background,
                accent: colors.primary,
                borderColor: colors.border,
                text: colors.text,
                heading: colors.heading,
                cardBackground: colors.surface,
                gradientStart: colors.primary,
                gradientEnd: colors.secondary,
            }
        },
        cta: {
            colors: {
                background: colors.background,
                gradientStart: colors.primary,
                gradientEnd: colors.secondary,
                text: colors.heading,
                heading: colors.heading,
                description: colors.text,
                buttonBackground: colors.background,
                buttonText: colors.heading,
            }
        },
        footer: {
            colors: {
                background: colors.surface,
                border: colors.border,
                text: colors.textMuted,
                linkHover: colors.primary,
                heading: colors.heading,
            }
        },
        header: {
            colors: {
                background: colors.primary,
                text: contrastText(colors.primary, colors.background, colors.heading),
                accent: contrastText(colors.primary, colors.background, colors.heading),
                border: 'transparent',
                buttonBackground: colors.secondary,
                buttonText: contrastText(colors.secondary, colors.background, colors.heading),
            }
        },
        screenshotCarousel: {
            colors: {
                background: colors.background,
                text: colors.text,
                accent: colors.primary,
            }
        },
        newsletter: {
            colors: {
                background: colors.surface,
                heading: colors.heading,
                text: colors.text,
                cardBackground: colors.surface,
                cardHeading: colors.heading,
                cardText: colors.text,
                borderColor: colors.border,
                inputBackground: colors.background,
                inputText: colors.heading,
                inputPlaceholder: colors.textMuted,
                inputBorder: colors.border,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
                accent: colors.secondary,
            },
        },
        leads: {
            colors: {
                background: colors.surface,
                accent: colors.primary,
                borderColor: colors.border,
                text: colors.text,
                heading: colors.heading,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
                cardBackground: colors.surface,
                inputBackground: colors.background,
                inputText: colors.heading,
                inputBorder: colors.border,
                gradientStart: colors.primary,
                gradientEnd: colors.secondary,
            }
        },
        services: {
            colors: {
                background: colors.background,
                accent: colors.primary,
                borderColor: colors.border,
                text: colors.text,
                heading: colors.heading,
                description: colors.text,
                cardBackground: colors.surface,
                cardHeading: colors.heading,
                cardText: colors.text,
            }
        },
        team: {
            colors: {
                background: colors.surface,
                accent: colors.primary,
                borderColor: colors.border,
                text: colors.text,
                heading: colors.heading,
                cardBackground: colors.surface,
                photoBorderColor: colors.primary,
            }
        },
        howItWorks: {
            colors: {
                background: colors.surface,
                accent: colors.primary,
                text: colors.text,
                heading: colors.heading,
            }
        },
        video: {
            colors: {
                background: colors.background,
                accent: colors.primary,
                text: colors.text,
                heading: colors.heading,
            }
        },
        slideshow: {
            colors: {
                background: colors.background,
                heading: colors.heading,
                arrowBackground: hexToRgba(colors.background, 0.5),
                arrowText: colors.heading,
                dotActive: colors.heading,
                dotInactive: hexToRgba(colors.heading, 0.5),
                captionBackground: hexToRgba(colors.background, 0.8),
                captionText: colors.text,
            }
        },
        banner: {
            colors: {
                background: colors.surface,
                overlayColor: colors.background,
                heading: colors.heading,
                text: colors.text,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
                accent: colors.secondary,
            }
        },
        map: {
            colors: {
                background: colors.surface,
                accent: colors.primary,
                text: colors.text,
                heading: colors.heading,
                cardBackground: colors.surface,
                borderColor: colors.border,
            }
        },
        menu: {
            colors: {
                background: colors.background,
                accent: colors.primary,
                borderColor: colors.border,
                text: colors.text,
                heading: colors.heading,
                cardBackground: colors.surface,
                cardTitleColor: colors.heading,
                cardText: colors.text,
                priceColor: colors.accent,
            }
        },
        portfolio: {
            colors: {
                background: colors.background,
                accent: colors.primary,
                borderColor: colors.border,
                text: colors.text,
                heading: colors.heading,
                cardBackground: hexToRgba(colors.background, 0.9),
                cardTitleColor: colors.heading,
                cardTextColor: hexToRgba(colors.text, 0.9),
                cardOverlayStart: hexToRgba(colors.background, 0.95),
                cardOverlayEnd: hexToRgba(colors.background, 0.3),
            }
        },
        // ── New section mappings (topBar, logoBanner, signupFloat, cmsFeed, chatbot, products) ──
        topBar: {
            colors: {
                background: colors.primary,
                text: '#ffffff',
                linkColor: '#ffffff',
                iconColor: '#ffffff',
                borderColor: colors.border,
            }
        },
        logoBanner: {
            colors: {
                background: colors.background,
                text: colors.text,
                heading: colors.heading,
                accent: colors.primary,
                borderColor: colors.border,
            }
        },
        signupFloat: {
            colors: {
                background: colors.primary,
                text: contrastText(colors.primary, colors.background, colors.heading),
                heading: contrastText(colors.primary, colors.background, colors.heading),
                buttonBackground: colors.secondary,
                buttonText: contrastText(colors.secondary, colors.background, colors.heading),
                inputBackground: colors.background,
                inputText: colors.text,
                inputBorder: colors.border,
                overlayBackground: hexToRgba(colors.background, 0.5),
                cardShadow: `0 25px 50px -12px ${hexToRgba(colors.background, 0.5)}`,
            }
        },
        cmsFeed: {
            colors: {
                background: colors.background,
                heading: colors.heading,
                text: colors.text,
                accent: colors.primary,
                cardBackground: colors.surface,
                cardHeading: colors.heading,
                cardText: colors.text,
                borderColor: colors.border,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
            }
        },
        chatbot: {
            colors: {
                primaryColor: colors.primary,
                secondaryColor: colors.secondary,
                accentColor: colors.accent,
                userBubbleColor: colors.primary,
                userTextColor: contrastText(colors.primary, colors.background, colors.heading),
                botBubbleColor: colors.surface,
                botTextColor: colors.text,
                backgroundColor: colors.background,
                inputBackground: colors.surface,
                inputBorder: colors.border,
                inputText: colors.text,
                headerBackground: colors.primary,
                headerText: contrastText(colors.primary, colors.background, colors.heading),
            }
        },
        products: {
            colors: {
                background: colors.background,
                heading: colors.heading,
                text: colors.text,
                accent: colors.primary,
                cardBackground: colors.surface,
                cardText: colors.heading,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
            }
        },
    });

    /**
     * Aplica colores globales a TODAS las secciones del landing page
     */
    const applyGlobalColorsToAllSections = useCallback((colors: GlobalColors) => {
        const colorMappings = generateLandingSectionColorMappings(colors);

        // Generate gradient colors from palette for HeroWave sections
        const gradientColors = generateHeroWaveGradientColors(colors);

        setSections(prev => prev.map(section => {
            const sectionColors = colorMappings[section.type];
            if (sectionColors) {
                const mergedData = {
                    ...section.data,
                    ...sectionColors,
                    // Apply gradient colors to HeroWave sections
                    ...(section.type === 'heroWave' ? { gradientColors } : {}),
                };
                
                // Update root-level colors needed by PublicLandingPage
                if (sectionColors.colors) {
                    if (sectionColors.colors.background) mergedData.backgroundColor = sectionColors.colors.background;
                    if (sectionColors.colors.text) mergedData.textColor = sectionColors.colors.text;
                    if (sectionColors.colors.primary || sectionColors.colors.accent) mergedData.accentColor = sectionColors.colors.accent || sectionColors.colors.primary;
                    if (sectionColors.colors.error) mergedData.errorColor = sectionColors.colors.error;
                    // Update overlay color to match new background (for SectionBackground overlays)
                    if (sectionColors.colors.background && section.data?.backgroundOverlayColor) {
                        mergedData.backgroundOverlayColor = sectionColors.colors.background;
                    }
                    // Update banner/productHero/collectionBanner overlayColor
                    if (sectionColors.colors.overlayColor) {
                        mergedData.overlayColor = sectionColors.colors.overlayColor;
                    }
                }
                
                if (section.type === 'newsletter') {
                    console.log('[applyGlobalColors] Newsletter merged data:', mergedData);
                }
                return {
                    ...section,
                    data: mergedData
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

    // Currently selected structure item section (for header, footer, typography, colors)
    const currentStructureSection = useMemo(() => {
        if (!selectedStructureItem) return null;
        const structureItem = STRUCTURE_ITEMS.find(i => i.id === selectedStructureItem);
        if (!structureItem) {
            return null;
        }
        const actualSection = sections.find(s => s.type === structureItem.type);
        if (!actualSection) {
            return null;
        }
        return actualSection;
    }, [sections, selectedStructureItem]);

    // Get the label for the current structure item
    const currentStructureLabel = useMemo(() => {
        if (!selectedStructureItem) return '';
        const structureItem = STRUCTURE_ITEMS.find(i => i.id === selectedStructureItem);
        return structureItem?.label || selectedStructureItem;
    }, [selectedStructureItem]);

    // Scroll preview to section when selected
    const scrollToSection = useCallback((sectionId: string) => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'SCROLL_TO_SECTION',
                sectionId: sectionId
            }, window.location.origin);
        }
    }, []);

    // Handle section selection - select and scroll to section
    const handleSectionSelect = useCallback((sectionId: string, _sectionType: string) => {
        setSelectedSection(sectionId);
        setSelectedStructureItem(null); // Clear structure selection
        scrollToSection(sectionId);
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
                <header className="h-14 px-4 lg:px-6 border-b border-border flex items-center bg-background z-20 sticky top-0 relative">
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
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
                        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
                            {([
                                { name: 'desktop' as const, icon: <Monitor size={16} />, label: 'Desktop' },
                                { name: 'mobile' as const, icon: <Smartphone size={16} />, label: 'Mobile' },
                            ]).map(({ name, icon, label }) => (
                                <button
                                    key={name}
                                    onClick={() => setPreviewDevice(name)}
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                                        ${previewDevice === name
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                        }
                                    `}
                                    title={t(`landingEditor.${name}`)}
                                >
                                    {icon}
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-2 ml-auto">
                        {/* Refresh preview */}
                        <button
                            onClick={() => setPreviewKey(prev => prev + 1)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            title={t('landingEditor.refreshPreview', 'Refrescar vista previa')}
                        >
                            <RefreshCw size={16} />
                        </button>

                        {/* Toggle preview */}
                        <button
                            onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            title={isPreviewVisible ? 'Ocultar vista previa' : 'Mostrar vista previa'}
                        >
                            {isPreviewVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>

                        {/* Undo/Redo buttons */}
                        <UndoRedoGroup
                            onUndo={undo}
                            canUndo={canUndo}
                            onRedo={redo}
                            canRedo={canRedo}
                            lastActionDescription={lastActionDescription}
                            size="md"
                            variant="ghost"
                        />

                        {/* Save button */}
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !hasUnsavedChanges}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${hasUnsavedChanges
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

                        <HeaderBackButton onClick={onBack} />
                    </div>
                </header>

                {/* Main Content - Three Panel Layout */}
                <main className="flex-1 flex overflow-hidden relative">
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
                                    <Layers size={14} />
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
                                                {React.createElement(item.icon, { size: 16, className: 'text-muted-foreground flex-shrink-0' })}
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
                                    <FileText size={14} />
                                    <span>{t('landingEditor.content', 'CONTENIDO')}</span>
                                    <span className="text-muted-foreground">({sections.filter(s => s.type !== 'header' && s.type !== 'footer' && s.type !== 'typography' && s.type !== 'colors').length})</span>
                                </button>

                                {isContentExpanded && (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={(e) => setActiveDragId(e.active.id as string)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={sections.filter(s => s.type !== 'header' && s.type !== 'footer' && s.type !== 'typography' && s.type !== 'colors').map(s => s.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="mt-1 space-y-0.5 pl-2">
                                                {sections.filter(s => s.type !== 'header' && s.type !== 'footer' && s.type !== 'typography' && s.type !== 'colors').map((section) => (
                                                    <SortableSectionItem
                                                        key={section.id}
                                                        section={section}
                                                        isActive={selectedSection === section.id}
                                                        onSelect={() => handleSectionSelect(section.id, section.type)}
                                                        onToggleVisibility={() => toggleSection(section.id)}
                                                        onDelete={() => deleteSection(section.id)}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>

                                        <DragOverlay>
                                            {activeDragId && (
                                                <DragOverlayItem
                                                    section={sections.find(s => s.id === activeDragId)!}
                                                />
                                            )}
                                        </DragOverlay>
                                    </DndContext>
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
                        <div className="flex-1 bg-muted/30 p-4 overflow-hidden flex flex-col relative">
                            {/* Portal target for ImagePicker modals - renders on top of preview */}
                            <div ref={previewOverlayRef} className="absolute inset-0 z-[200] pointer-events-none" />
                            <div className={`flex-1 rounded-xl shadow-2xl bg-card border border-border flex flex-col overflow-hidden mx-auto ${previewWidth} w-full transition-all duration-300`}>
                                {/* Browser Header */}
                                <div className="flex-shrink-0 h-12 bg-background border-b border-border flex items-center px-4 space-x-2 z-10">
                                    <div className="flex space-x-2">
                                        <span className="w-3.5 h-3.5 bg-red-500 rounded-full"></span>
                                        <span className="w-3.5 h-3.5 bg-yellow-500 rounded-full"></span>
                                        <span className="w-3.5 h-3.5 bg-green-500 rounded-full"></span>
                                    </div>
                                    <div className="flex-grow flex items-center justify-center">
                                        <div className="bg-secondary/50 text-muted-foreground text-sm rounded-full px-4 py-1.5 w-full max-w-md text-center truncate flex items-center justify-center cursor-default select-none border border-border/50">
                                            <span className="opacity-50 mr-0.5">https://quimera.ai/</span>
                                            <span className="font-medium text-foreground">landing</span>
                                        </div>
                                    </div>
                                    <div className="w-16"></div>
                                </div>
                                {/* Browser Content */}
                                <iframe
                                    ref={iframeRef}
                                    key={previewKey}
                                    src="/?preview=landing"
                                    className="flex-1 w-full border-0"
                                    title={t('landingEditor.landingPreview')}
                                />
                            </div>
                        </div>
                    )}

                    {/* Controls Panel Toggle Button - Only visible when a section is selected */}
                    {(currentStructureSection || currentSection) && (
                        <button
                            onClick={() => setIsControlsPanelOpen(!isControlsPanelOpen)}
                            className={`absolute top-1/2 -translate-y-1/2 z-30 p-2 bg-card border border-border shadow-lg hover:bg-accent transition-all duration-300 overflow-hidden rounded-lg ${isControlsPanelOpen
                                ? (isPreviewVisible ? 'right-[calc(20rem-18px)] lg:right-[calc(24rem-18px)]' : 'right-[calc(42rem-18px)]')
                                : 'right-0 rounded-l-lg rounded-r-none'
                                }`}
                            title={isControlsPanelOpen ? 'Ocultar controles' : 'Mostrar controles'}
                        >
                            {isControlsPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                        </button>
                    )}

                    {/* Right Panel - Component Controls - Only visible when a section is selected */}
                    {(currentStructureSection || currentSection) && (
                        <div className={`${isControlsPanelOpen ? (isPreviewVisible ? 'w-80 lg:w-96' : 'flex-1 max-w-2xl mx-auto') : 'w-0 overflow-hidden'} editor-theme border-l border-editor-border bg-editor-bg flex flex-col overflow-hidden transition-all duration-300`}>
                            {/* Structure Item Controls (Colores, Tipografía, etc.) */}
                            {currentStructureSection ? (
                                <>
                                    <div className="p-4 border-b border-editor-border">
                                        <h2 className="font-semibold text-sm flex items-center gap-2 text-editor-text-primary">
                                            <Settings size={16} className="text-editor-accent" />
                                            {t('landingEditor.edit', 'Editar')}: <span className="capitalize">
                                                {currentStructureLabel}
                                            </span>
                                        </h2>
                                    </div>
                                    <div className="quimera-clean-controls flex-1 min-h-0 overflow-y-auto">
                                        <LandingPageControls
                                            key={currentStructureSection.id}
                                            section={currentStructureSection}
                                            onUpdateSection={updateSectionData}
                                            onRefreshPreview={() => setPreviewKey(prev => prev + 1)}
                                            allSections={sections}
                                            onApplyGlobalColors={applyGlobalColorsToAllSections}
                                            portalContainer={previewOverlayRef.current}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 border-b border-editor-border">
                                        <h2 className="font-semibold text-sm flex items-center gap-2 text-editor-text-primary">
                                            <Settings size={16} className="text-editor-accent" />
                                            {t('landingEditor.editSection', 'Editar')}: <span className="capitalize">{currentSection!.type}</span>
                                        </h2>
                                    </div>
                                    <div className="quimera-clean-controls flex-1 min-h-0 overflow-y-auto">
                                        <LandingPageControls
                                            section={currentSection!}
                                            onUpdateSection={updateSectionData}
                                            onRefreshPreview={() => setPreviewKey(prev => prev + 1)}
                                            allSections={sections}
                                            onApplyGlobalColors={applyGlobalColorsToAllSections}
                                            portalContainer={previewOverlayRef.current}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
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
                                        {React.createElement(comp.icon, { size: 18 })}
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
                                setSections(JSON.parse(JSON.stringify(savedSectionsRef.current)));
                                clearHistory();
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
