/**
 * LandingPageEditor
 * WYSIWYG editor for the Quimera.ai public landing page
 * Features: Real-time preview, component management, manual save
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Menu as MenuIcon, Save, Eye, EyeOff, Settings, Layers, Plus,
    GripVertical, Trash2, ChevronDown, ChevronUp, Monitor,
    Smartphone, Loader2, Check, Type, Layout,
    Sparkles, X, RefreshCw, Palette, PanelRightClose, PanelRightOpen, FileText, LayoutTemplate, MessageSquareCode, Image as ImageIcon, Workflow, Globe, ExternalLink, Moon, Wand2, PaintBucket, Users, CalendarCheck, Link as LinkIcon, Send, SlidersHorizontal
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
import MobileBottomSheet from '../../ui/MobileBottomSheet';
import { GlobalColors } from '../../../types';
import { isRetiredDesignSuiteSection } from '../../../data/retiredSuites';
import { generateHeroWaveGradientColors, contrastText } from '../../ui/GlobalStylesControl';
import { hexToRgba } from '../../../utils/colorUtils';
import { supabase } from '../../../supabase';

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
const isMobileEditorViewport = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
const isContentSection = (section: LandingSection) =>
    section.type !== 'header' &&
    section.type !== 'footer' &&
    section.type !== 'typography' &&
    section.type !== 'colors' &&
    !isRetiredDesignSuiteSection(section.type);

// Available components for landing page (CONTENIDO section)
const AVAILABLE_COMPONENTS = [
    // Quimera Suite
    { type: 'heroQuimera', icon: Layout },
    { type: 'whatIsQuimera', icon: FileText },
    { type: 'templatesPreviewQuimera', icon: LayoutTemplate },
    { type: 'aiWebStudioQuimera', icon: MessageSquareCode },
    { type: 'contentManagerQuimera', icon: FileText },
    { type: 'imageGeneratorQuimera', icon: ImageIcon },
    { type: 'chatbotWorkflowQuimera', icon: Workflow },
    { type: 'chatbotBuilderQuimera', icon: PaintBucket },
    { type: 'leadsManagerQuimera', icon: Users },
    { type: 'appointmentsQuimera', icon: CalendarCheck },
    { type: 'bioPageQuimera', icon: LinkIcon },
    { type: 'emailMarketingQuimera', icon: Send },
    { type: 'platformShowcaseQuimera', icon: Layout },
    { type: 'bentoShowcaseQuimera', icon: Layout },
    { type: 'agentDemonstrationQuimera', icon: Layout },
    { type: 'featuresQuimera', icon: Layers },
    { type: 'pricingQuimera', icon: Type },
    { type: 'testimonialsQuimera', icon: Type },
    { type: 'faqQuimera', icon: Type },
    { type: 'metricsQuimera', icon: Layers },
    { type: 'aiCapabilitiesQuimera', icon: Sparkles },
    { type: 'industrySolutionsQuimera', icon: Layers },
    { type: 'agencyWhiteLabelQuimera', icon: Layout },
    { type: 'ctaQuimera', icon: Type },
    { type: 'finalCtaQuimera', icon: Type },
];

// Structure items for global settings (ESTRUCTURA section)
const STRUCTURE_ITEMS = [
    { id: 'colors', type: 'colors', icon: Palette },
    { id: 'typography', type: 'typography', icon: Type },
    { id: 'navigation', type: 'header', icon: MenuIcon },
    { id: 'footerGlobal', type: 'footer', icon: Layout },
];

const getLandingSectionIcon = (type: string) => {
    return AVAILABLE_COMPONENTS.find(component => component.type === type)?.icon
        || STRUCTURE_ITEMS.find(item => item.type === type)?.icon
        || Layout;
};

// Helper to get translated section label from translation keys
const useSectionLabel = () => {
    const { t } = useTranslation();
    return (type: string) => t(`landingEditor.components.${type}`, type);
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
    const getSectionLabel = useSectionLabel();
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
            className={`group flex items-center gap-2 p-2.5 rounded-[var(--q-radius-md)] cursor-pointer transition-all border ${isActive
                ? 'border-q-accent bg-q-accent text-q-text-on-accent shadow-[var(--shadow-card)] dark:bg-q-accent/10 dark:text-q-accent dark:border-q-accent/30 dark:shadow-none black:bg-q-accent/10 black:text-q-accent black:border-q-accent/30 black:shadow-none'
                : 'border-transparent hover:border-structure-control-border hover:bg-structure-control-hover hover:text-q-text hover:shadow-[inset_0_0_0_1px_hsl(var(--structure-control-border))]'
                } ${!section.enabled ? 'opacity-50' : ''} ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical size={14} className={isActive ? 'text-q-text-on-accent/75 dark:text-q-accent/75 black:text-q-accent/75 flex-shrink-0' : 'text-q-text-muted flex-shrink-0'} />
            </div>

            <Icon size={16} className={isActive ? 'text-q-text-on-accent dark:text-q-accent black:text-q-accent flex-shrink-0' : 'text-q-text-muted group-hover:text-q-text flex-shrink-0'} />

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getSectionLabel(section.type)}</p>
            </div>

            {/* Section actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
                    className={isActive ? 'p-1 rounded text-q-text-on-accent/75 hover:bg-q-text-on-accent/12 hover:text-q-text-on-accent dark:text-q-accent/75 dark:hover:bg-q-accent/12 dark:hover:text-q-accent black:text-q-accent/75 black:hover:bg-q-accent/12 black:hover:text-q-accent' : 'p-1 rounded text-q-text-muted hover:bg-structure-control-hover hover:text-q-text'}
                >
                    {section.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className={isActive ? 'p-1 rounded text-q-text-on-accent/75 hover:bg-q-surface/25 hover:text-q-error dark:text-q-accent/75 dark:hover:bg-q-error/10 dark:hover:text-q-error black:text-q-accent/75 black:hover:bg-q-error/10 black:hover:text-q-error' : 'p-1 rounded hover:bg-destructive/20 text-destructive'}
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

// Drag Overlay Item (shown while dragging)
const DragOverlayItem: React.FC<{ section: LandingSection }> = ({ section }) => {
    const getSectionLabel = useSectionLabel();
    const Icon = getLandingSectionIcon(section.type);
    return (
        <div className="flex items-center gap-2 p-2.5 bg-q-surface border border-primary rounded-lg shadow-xl">
            <GripVertical size={14} className="text-primary" />
            <Icon size={16} className="text-primary" />
            <span className="text-sm font-medium">{getSectionLabel(section.type)}</span>
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
        const sanitizedSections = newSections.filter(section => !isRetiredDesignSuiteSection(section.type));
        pushAction({
            type: 'update_sections',
            description,
            previousState: sections,
            newState: sanitizedSections,
        });
        setSections(sanitizedSections);
        setHasUnsavedChanges(true);
    }, [sections, pushAction]);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [selectedStructureItem, setSelectedStructureItem] = useState<string | null>(null);
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
    const [isPreviewVisible, setIsPreviewVisible] = useState(true);
    const [isControlsPanelOpen, setIsControlsPanelOpen] = useState(true);
    const [isMobileStructureOpen, setIsMobileStructureOpen] = useState(false);
    const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false);
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
            } else if (event.data?.type === 'SECTION_FOCUS' && event.data.sectionId) {
                const targetId = event.data.sectionId;

                if (targetId === 'header') {
                    setSelectedStructureItem('navigation');
                    setSelectedSection(null);
                    if (isMobileEditorViewport()) setIsMobileControlsOpen(true);
                } else if (targetId === 'footer') {
                    setSelectedStructureItem('footerGlobal');
                    setSelectedSection(null);
                    if (isMobileEditorViewport()) setIsMobileControlsOpen(true);
                } else {
                    const section = sections.find(s => s.type === targetId || s.id === targetId || s.id.includes(targetId));
                    if (section) {
                        setSelectedSection(section.id);
                        setSelectedStructureItem(null);
                        if (isMobileEditorViewport()) setIsMobileControlsOpen(true);
                    }
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

    // Load landing page configuration from Supabase
    useEffect(() => {
        const loadConfiguration = async () => {
            setIsLoading(true);
            try {
                const { data: rows, error } = await supabase
                    .from('landing_sections')
                    .select('*')
                    .order('order', { ascending: true });

                if (error) throw error;

                if (rows && rows.length > 0) {
                    const loadedSections: LandingSection[] = rows
                        .map(row => ({
                            id: row.id,
                            type: row.type,
                            enabled: row.enabled,
                            order: row.order,
                            data: row.data || {},
                        }))
                        .filter(section => !isRetiredDesignSuiteSection(section.type));

                    // Ensure required structure sections exist
                    const mergedSections = ensureStructureSections(loadedSections);

                    // Hydrate features section if it has no features array
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

                    mergedSections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                    setSections(mergedSections);
                    savedSectionsRef.current = JSON.parse(JSON.stringify(mergedSections));
                    setIsLoading(false);
                    return;
                }
            } catch (error) {
                console.error('Error loading landing page configuration:', error);
            }

            // Fallback to default sections if no saved data
            const defaultSections: LandingSection[] = [
                ...defaultStructureSections,
                { id: 'hero', type: 'hero', enabled: true, order: 1, data: {} },
                {
                    id: 'features', type: 'features', enabled: true, order: 2, data: {
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
                    }
                },
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

    // Handle save to Supabase
    // Each section is stored as its own row in the landing_sections table.
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const now = new Date().toISOString();

            // 1. Get currently persisted section IDs so we can delete removed ones
            const { data: existingRows } = await supabase
                .from('landing_sections')
                .select('id');
            const existingIds = new Set((existingRows ?? []).map(r => r.id));
            const currentIds = new Set(sections.map(s => s.id));

            // 2. Upsert each section
            const rows = sections.map(s => ({
                id: s.id,
                type: s.type,
                enabled: s.enabled !== false,
                order: s.order ?? 0,
                data: s.data || {},
                updated_at: now,
            }));

            const { error: upsertError } = await supabase
                .from('landing_sections')
                .upsert(rows, { onConflict: 'id' });
            if (upsertError) throw upsertError;

            // 3. Delete sections that no longer exist
            const toDelete = [...existingIds].filter(id => !currentIds.has(id));
            if (toDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('landing_sections')
                    .delete()
                    .in('id', toDelete);
                if (deleteError) throw deleteError;
            }

            setHasUnsavedChanges(false);
            setLastSaved(new Date());
            savedSectionsRef.current = JSON.parse(JSON.stringify(sections));
            clearHistory();
            setPreviewKey(prev => prev + 1);
            console.log('[LandingPageEditor] Saved to Supabase successfully');
        } catch (error: any) {
            console.error('[LandingPageEditor] Error saving landing page:', error);
            console.error('[LandingPageEditor] Error code:', error?.code, 'message:', error?.message);
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

    // Get initial defaults for new components
    const getInitialDataForComponent = (type: string) => {
        const defaults: Record<string, any> = {
            colors: { background: '#0A0A0A', text: '#ffffff', accent: '#D4AF37' }
        };

        const typeLower = type.toLowerCase();

        if (type === 'whatIsQuimera') {
            return {
                ...defaults,
                title: 'Todo lo que tu negocio necesita para crecer en internet, impulsado por AI.',
                subtitle: 'Quimera AI combina creación de websites, contenido, automatización, ecommerce, leads y asistentes inteligentes en una sola plataforma.',
                introText: 'Quimera AI es una plataforma inteligente que convierte la información de tu negocio en una presencia digital completa.',
                differentiatorTitle: 'No es solo crear una página. Es construir el sistema digital de tu negocio.',
                differentiatorText: 'Mientras otras herramientas se enfocan únicamente en diseño o publicación, Quimera AI conecta las partes esenciales del negocio.',
                primaryButtonText: 'Comienza con Quimera AI',
                secondaryButtonText: 'Ver cómo funciona',
                footnote: 'Diseñado para pequeños negocios, creadores, profesionales, realtors, restaurantes, tiendas online y agencias.',
            };
        }

        if (type === 'templatesPreviewQuimera') {
            return {
                ...defaults,
                title: 'Comienza con un template profesional y hazlo tuyo.',
                subtitle: 'Elige una base visual diseñada para tu industria y conviértela en un website único con la ayuda de Quimera AI.',
                introText: 'Los templates de Quimera AI no son páginas rígidas. Son puntos de partida inteligentes con estructura, diseño y secciones listas para personalizar. Cambia textos, colores, imágenes, llamadas a la acción y funcionalidades sin comenzar desde una página en blanco.',
                differentiatorTitle: 'No empiezas desde cero. Empiezas desde una ventaja.',
                differentiatorText: 'Los templates funcionan como una base inteligente: tienen estructura, diseño y secciones esenciales listas para adaptar a tu industria, tu marca y tus objetivos.',
                primaryButtonText: 'Explorar templates',
                secondaryButtonText: 'Generar con AI',
                flowText: 'Choose template → Customize with AI → Launch website'
            };
        }

        if (type === 'aiWebStudioQuimera') {
            return {
                ...defaults,
                title: 'Construye tu website conversando con AI Web Studio.',
                subtitle: 'Responde preguntas simples sobre tu negocio y Quimera AI genera una página web inicial con estructura, textos y secciones listas para personalizar.',
                introText: 'AI Web Studio funciona como un estratega, copywriter y diseñador inicial dentro de Quimera AI. Te guía paso a paso, entiende lo que vendes, quién es tu cliente y qué quieres lograr, y luego crea una primera versión de tu website para que puedas editar, mejorar y publicar más rápido.',
                differentiatorTitle: 'Tu website empieza con una conversación.',
                differentiatorText: 'AI Web Studio convierte ideas sueltas en una estructura clara: títulos, secciones, textos, llamadas a la acción y contenido inicial adaptado al tipo de negocio.',
                primaryButtonText: 'Crear con AI Web Studio',
                secondaryButtonText: 'Explorar templates',
                flowText: 'Chat → Website Draft → Edit → Publish'
            };
        }

        if (type === 'bentoShowcaseQuimera') {
            return {
                ...defaults,
                title: 'Características Principales',
                subtitle: 'Todo lo que necesitas para escalar tu negocio digital en un solo lugar',
                headline: 'Características Principales',
                subheadline: 'Todo lo que necesitas para escalar tu negocio digital en un solo lugar',
                glassEffect: true,
            };
        }

        if (typeLower.includes('hero') || typeLower.includes('cta')) {
            return {
                ...defaults,
                title: 'La plataforma definitiva para la era de la IA',
                subtitle: 'Construye y escala tu negocio digital en segundos. Todo en un solo lugar, con tu propia marca.',
                buttonText: 'Comenzar Gratis',
                secondaryButtonText: 'Agendar Demo',
                headline: 'La plataforma definitiva para la era de la IA',
                subheadline: 'Construye y escala tu negocio digital en segundos. Todo en un solo lugar, con tu propia marca.',
                primaryCta: 'Comenzar Gratis',
                secondaryCta: 'Agendar Demo',
            };
        }

        if (typeLower.includes('feature') || typeLower.includes('showcase') || typeLower.includes('metric') || typeLower.includes('solution') || typeLower.includes('capability') || typeLower.includes('agency')) {
            return {
                ...defaults,
                title: 'Características Principales',
                subtitle: 'Todo lo que necesitas para escalar tu negocio digital en un solo lugar',
                headline: 'Características Principales',
                subheadline: 'Todo lo que necesitas para escalar tu negocio digital en un solo lugar',
            };
        }

        if (typeLower.includes('pricing')) {
            return {
                ...defaults,
                title: 'Precios Simples y Transparentes',
                subtitle: 'Elige el plan que mejor se adapte a tus necesidades. Sin costos ocultos.',
                headline: 'Precios Simples y Transparentes',
                subheadline: 'Elige el plan que mejor se adapte a tus necesidades. Sin costos ocultos.',
            };
        }

        if (typeLower.includes('testimonial')) {
            return {
                ...defaults,
                title: 'Historias de Éxito',
                subtitle: 'Únete a miles de emprendedores y agencias que ya están escalando con QuimeraAi.',
                headline: 'Historias de Éxito',
                subheadline: 'Únete a miles de emprendedores y agencias que ya están escalando con QuimeraAi.',
            };
        }

        if (typeLower.includes('faq')) {
            return {
                ...defaults,
                title: 'Preguntas Frecuentes',
                subtitle: 'Resolvemos tus dudas sobre la plataforma',
                headline: 'Preguntas Frecuentes',
                subheadline: 'Resolvemos tus dudas sobre la plataforma',
            };
        }

        // Catch-all for any other components
        return {
            ...defaults,
            title: 'Título de la Sección',
            subtitle: 'Descripción breve de esta sección. Puedes editar este texto para que coincida con tu marca.',
            buttonText: 'Saber más',
            headline: 'Título de la Sección',
            subheadline: 'Descripción breve de esta sección. Puedes editar este texto para que coincida con tu marca.',
            primaryCta: 'Saber más',
        };
    };

    // Add new component
    const addComponent = (type: string) => {
        if (isRetiredDesignSuiteSection(type)) return;
        const newSection: LandingSection = {
            id: `${type}-${Date.now()}`,
            type,
            enabled: true,
            order: sections.length,
            data: getInitialDataForComponent(type)
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
                mutedText: colors.textMuted,
                heading: colors.heading,
                description: colors.textMuted,
                buttonBackground: colors.primary,
                buttonText: contrastText(colors.primary, colors.background, colors.heading),
                gradientStart: colors.primary,
                gradientEnd: colors.secondary,
                cardBackground: colors.surface,
                cardHeading: colors.heading,
                cardText: colors.text,
                priceColor: colors.heading,
                checkmarkColor: colors.success,
                panelBackground: colors.heading,
                panelText: contrastText(colors.heading, colors.background, colors.text),
                surfaceAlt: colors.surface,
                featuredBackground: colors.heading,
                featuredText: contrastText(colors.heading, colors.background, colors.text),
                badgeBackground: colors.secondary,
                badgeText: contrastText(colors.secondary, colors.background, colors.heading),
                dividerColor: colors.border,
                imageOverlay: colors.background,
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
        showcase: {
            colors: {
                background: colors.background,
                accent: colors.primary,
                borderColor: colors.border,
                text: colors.text,
                heading: colors.heading,
                description: hexToRgba(colors.text, 0.78),
                cardBackground: hexToRgba(colors.background, 0.9),
                cardHeading: colors.heading,
                cardText: hexToRgba(colors.text, 0.9),
                mutedText: colors.textMuted || hexToRgba(colors.text, 0.65),
                pillBackground: colors.heading,
                pillText: colors.background,
                overlayStart: hexToRgba(colors.background, 0.9),
                overlayEnd: hexToRgba(colors.background, 0.16),
                buttonBackground: colors.primary,
                buttonText: '#ffffff',
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
        return structureItem ? t(`landingEditor.components.${structureItem.id}`, structureItem.id) : selectedStructureItem;
    }, [selectedStructureItem, t]);

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
        setIsMobileStructureOpen(false);
        if (isMobileEditorViewport()) setIsMobileControlsOpen(true);
        scrollToSection(sectionId);
    }, [scrollToSection]);

    // Handle structure item selection (Colores, Tipografía, etc.)
    const handleStructureSelect = useCallback((itemId: string) => {
        setSelectedStructureItem(itemId);
        setSelectedSection(null); // Clear section selection
        setIsMobileStructureOpen(false);
        if (isMobileEditorViewport()) setIsMobileControlsOpen(true);

        // Scroll to corresponding section if applicable
        const structureItem = STRUCTURE_ITEMS.find(i => i.id === itemId);
        if (structureItem && (structureItem.type === 'header' || structureItem.type === 'footer')) {
            scrollToSection(structureItem.type);
        }
    }, [scrollToSection]);

    if (isLoading) {
        return (
            <div className="flex h-[100dvh] items-center justify-center bg-q-bg">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex h-[100dvh] min-w-0 bg-q-bg text-foreground overflow-hidden">
            {/* Sidebar */}
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
 <header className="admin-dashboard-topbar quimera-dashboard-header-bar h-14 px-4 lg:px-6 flex items-center z-20 sticky top-0 relative">
                    {/* Left Section */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-10 w-10 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors"
                        >
                            <MenuIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setIsMobileStructureOpen(true)}
                            className="md:hidden h-10 w-10 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors"
                            title={t('landingEditor.pageStructure', 'ESTRUCTURA DE PÁGINA')}
                            aria-label={t('landingEditor.pageStructure', 'ESTRUCTURA DE PÁGINA')}
                        >
                            <SlidersHorizontal className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Layout className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                            <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                                {t('landingEditor.title', 'Editor Landing Page')}
                            </h1>
                        </div>

                        {/* Unsaved changes indicator */}
                        {hasUnsavedChanges && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-q-accent/10 text-q-accent rounded-full">
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
                                            : 'text-q-text-muted hover:text-foreground hover:bg-q-bg/50'
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all text-q-text-muted hover:text-foreground hover:bg-secondary/50"
                            title={t('landingEditor.refreshPreview', 'Refrescar vista previa')}
                        >
                            <RefreshCw size={16} />
                        </button>

                        {/* Toggle preview */}
                        <button
                            onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all text-q-text-muted hover:text-foreground hover:bg-secondary/50"
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
                                : 'bg-secondary/50 text-q-text-muted cursor-not-allowed'
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
                    <div className="hidden w-64 lg:w-72 border-r border-q-border bg-q-surface/50 md:flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-q-border flex items-center justify-between">
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
                                    className="w-full flex items-center gap-2 px-2 py-2 text-xs font-bold text-q-accent uppercase tracking-wider hover:bg-structure-control-hover hover:text-q-text hover:shadow-[inset_0_0_0_1px_hsl(var(--structure-control-border))] rounded-[var(--q-radius-md)] transition-all"
                                >
                                    <ChevronDown size={14} className={`transition-transform ${isStructureExpanded ? '' : '-rotate-90'}`} />
                                    <Layers size={14} />
                                    <span>{t('landingEditor.structure', 'ESTRUCTURA')}</span>
                                    <span className="text-q-text-muted">({STRUCTURE_ITEMS.length})</span>
                                </button>

                                {isStructureExpanded && (
                                    <div className="mt-1 space-y-0.5 pl-2">
                                        {STRUCTURE_ITEMS.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleStructureSelect(item.id)}
                                                className={`w-full flex items-center gap-2 p-2.5 rounded-[var(--q-radius-md)] cursor-pointer transition-all text-left border ${selectedStructureItem === item.id
                                                    ? 'border-q-accent bg-q-accent text-q-text-on-accent shadow-[var(--shadow-card)] dark:bg-q-accent/10 dark:text-q-accent dark:border-q-accent/30 dark:shadow-none black:bg-q-accent/10 black:text-q-accent black:border-q-accent/30 black:shadow-none'
                                                    : 'border-transparent hover:border-structure-control-border hover:bg-structure-control-hover hover:text-q-text hover:shadow-[inset_0_0_0_1px_hsl(var(--structure-control-border))]'
                                                    }`}
                                            >
                                                {React.createElement(item.icon, {
                                                    size: 16,
                                                    className: selectedStructureItem === item.id
                                                        ? 'text-q-text-on-accent dark:text-q-accent black:text-q-accent flex-shrink-0'
                                                        : 'text-q-text-muted flex-shrink-0',
                                                })}
                                                <span className="text-sm font-medium">{t(`landingEditor.components.${item.id}`, item.id)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* CONTENIDO Group */}
                            <div>
                                <button
                                    onClick={() => setIsContentExpanded(!isContentExpanded)}
                                    className="w-full flex items-center gap-2 px-2 py-2 text-xs font-bold text-q-accent uppercase tracking-wider hover:bg-structure-control-hover hover:text-q-text hover:shadow-[inset_0_0_0_1px_hsl(var(--structure-control-border))] rounded-[var(--q-radius-md)] transition-all"
                                >
                                    <ChevronDown size={14} className={`transition-transform ${isContentExpanded ? '' : '-rotate-90'}`} />
                                    <FileText size={14} />
                                    <span>{t('landingEditor.content', 'CONTENIDO')}</span>
                                    <span className="text-q-text-muted">({sections.filter(isContentSection).length})</span>
                                </button>

                                {isContentExpanded && (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={(e) => setActiveDragId(e.active.id as string)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={sections.filter(isContentSection).map(s => s.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="mt-1 space-y-0.5 pl-2">
                                                {sections.filter(isContentSection).map((section) => (
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
                            <div className="p-3 border-t border-q-border flex items-center gap-2 text-xs text-q-text-muted">
                                <Check size={12} className="text-q-success" />
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
                            <div className={`flex-1 rounded-xl shadow-2xl bg-q-surface border border-q-border flex flex-col overflow-hidden mx-auto ${previewWidth} w-full transition-all duration-300`}>
                                {/* Browser Header */}
                                <div className="flex-shrink-0 h-12 bg-q-bg border-b border-q-border flex items-center px-4 space-x-2 z-10">
                                    <div className="flex space-x-2">
                                        <span className="w-3.5 h-3.5 bg-q-error rounded-full"></span>
                                        <span className="w-3.5 h-3.5 bg-q-accent rounded-full"></span>
                                        <span className="w-3.5 h-3.5 bg-q-success rounded-full"></span>
                                    </div>
                                    <div className="flex-grow flex items-center justify-center">
                                        <div className="bg-secondary/50 text-q-text-muted text-sm rounded-full px-4 py-1.5 w-full max-w-md text-center truncate flex items-center justify-center cursor-default select-none border border-q-border/50">
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
                                    src="/landing-editor-preview"
                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
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
                            className={`absolute top-1/2 hidden -translate-y-1/2 z-30 p-2 bg-q-surface border border-q-border shadow-lg hover:bg-accent transition-all duration-300 overflow-hidden rounded-lg md:block ${isControlsPanelOpen
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
                        <div className={`${isControlsPanelOpen ? (isPreviewVisible ? 'w-80 lg:w-96' : 'flex-1 max-w-2xl mx-auto') : 'w-0 overflow-hidden'} editor-theme hidden border-l border-q-border bg-q-bg md:flex flex-col overflow-hidden transition-all duration-300`}>
                            {/* Structure Item Controls (Colores, Tipografía, etc.) */}
                            {currentStructureSection ? (
                                <>
                                    <div className="p-4 border-b border-q-border">
                                        <h2 className="font-semibold text-sm flex items-center gap-2 text-q-text">
                                            <Settings size={16} className="text-q-accent" />
                                            {t('landingEditor.edit', 'Editar')}: <span className="capitalize">
                                                {currentStructureLabel}
                                            </span>
                                        </h2>
                                    </div>
                                    <div data-editor-controls-surface="template-structure" className="quimera-clean-controls flex-1 min-h-0 overflow-y-auto p-4">
                                        <LandingPageControls
                                            key={currentStructureSection.id}
                                            section={currentStructureSection}
                                            isStructureItem={true}
                                            structureItemId={selectedStructureItem || undefined}
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
                                    <div className="p-4 border-b border-q-border">
                                        <h2 className="font-semibold text-sm flex items-center gap-2 text-q-text">
                                            <Settings size={16} className="text-q-accent" />
                                            {t('landingEditor.editSection', 'Editar')}: <span>{t(`landingEditor.components.${currentSection!.type}`, currentSection!.type)}</span>
                                        </h2>
                                    </div>
                                    <div data-editor-controls-surface="template-section" className="quimera-clean-controls flex-1 min-h-0 overflow-y-auto p-4">
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

            <MobileBottomSheet
                isOpen={isMobileStructureOpen}
                onClose={() => setIsMobileStructureOpen(false)}
                title={t('landingEditor.pageStructure', 'ESTRUCTURA DE PÁGINA')}
            >
                <div className="flex max-h-[75vh] min-h-[520px] min-w-0 flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-q-border p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-q-text-muted">
                            {t('landingEditor.componentsTitle', 'Componentes')}
                        </p>
                        <button
                            onClick={() => setShowAddComponent(true)}
                            className="h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-colors"
                            title={t('landingEditor.addComponent', 'Añadir componente')}
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-3">
                        <div className="mb-4">
                            <button
                                onClick={() => setIsStructureExpanded(!isStructureExpanded)}
                                className="w-full flex items-center gap-2 px-2 py-2 text-xs font-bold text-q-accent uppercase tracking-wider hover:bg-structure-control-hover hover:text-q-text rounded-[var(--q-radius-md)] transition-all"
                            >
                                <ChevronDown size={14} className={`transition-transform ${isStructureExpanded ? '' : '-rotate-90'}`} />
                                <Layers size={14} />
                                <span>{t('landingEditor.structure', 'ESTRUCTURA')}</span>
                                <span className="text-q-text-muted">({STRUCTURE_ITEMS.length})</span>
                            </button>

                            {isStructureExpanded && (
                                <div className="mt-1 space-y-0.5 pl-2">
                                    {STRUCTURE_ITEMS.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleStructureSelect(item.id)}
                                            className={`w-full flex items-center gap-2 p-2.5 rounded-[var(--q-radius-md)] cursor-pointer transition-all text-left border ${selectedStructureItem === item.id
                                                ? 'border-q-accent bg-q-accent text-q-text-on-accent shadow-[var(--shadow-card)] dark:bg-q-accent/10 dark:text-q-accent dark:border-q-accent/30 dark:shadow-none black:bg-q-accent/10 black:text-q-accent black:border-q-accent/30 black:shadow-none'
                                                : 'border-transparent hover:border-structure-control-border hover:bg-structure-control-hover hover:text-q-text'
                                                }`}
                                        >
                                            {React.createElement(item.icon, {
                                                size: 16,
                                                className: selectedStructureItem === item.id
                                                    ? 'text-q-text-on-accent dark:text-q-accent black:text-q-accent flex-shrink-0'
                                                    : 'text-q-text-muted flex-shrink-0',
                                            })}
                                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{t(`landingEditor.components.${item.id}`, item.id)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <button
                                onClick={() => setIsContentExpanded(!isContentExpanded)}
                                className="w-full flex items-center gap-2 px-2 py-2 text-xs font-bold text-q-accent uppercase tracking-wider hover:bg-structure-control-hover hover:text-q-text rounded-[var(--q-radius-md)] transition-all"
                            >
                                <ChevronDown size={14} className={`transition-transform ${isContentExpanded ? '' : '-rotate-90'}`} />
                                <FileText size={14} />
                                <span>{t('landingEditor.content', 'CONTENIDO')}</span>
                                <span className="text-q-text-muted">({sections.filter(isContentSection).length})</span>
                            </button>

                            {isContentExpanded && (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={(e) => setActiveDragId(e.active.id as string)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={sections.filter(isContentSection).map(s => s.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="mt-1 space-y-0.5 pl-2">
                                            {sections.filter(isContentSection).map((section) => (
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
                </div>
            </MobileBottomSheet>

            <MobileBottomSheet
                isOpen={isMobileControlsOpen && Boolean(currentStructureSection || currentSection)}
                onClose={() => setIsMobileControlsOpen(false)}
                title={currentStructureSection ? currentStructureLabel : (currentSection ? t(`landingEditor.components.${currentSection.type}`, currentSection.type) : '')}
                subtitle={currentStructureSection ? t('landingEditor.edit', 'Editar') : t('landingEditor.editSection', 'Editar sección')}
            >
                <div data-editor-controls-surface="template-mobile" className="quimera-clean-controls max-h-[75vh] min-h-[520px] min-w-0 overflow-y-auto p-4">
                    {currentStructureSection ? (
                        <LandingPageControls
                            key={currentStructureSection.id}
                            section={currentStructureSection}
                            isStructureItem={true}
                            structureItemId={selectedStructureItem || undefined}
                            onUpdateSection={updateSectionData}
                            onRefreshPreview={() => setPreviewKey(prev => prev + 1)}
                            allSections={sections}
                            onApplyGlobalColors={applyGlobalColorsToAllSections}
                            portalContainer={previewOverlayRef.current}
                        />
                    ) : currentSection ? (
                        <LandingPageControls
                            section={currentSection}
                            onUpdateSection={updateSectionData}
                            onRefreshPreview={() => setPreviewKey(prev => prev + 1)}
                            allSections={sections}
                            onApplyGlobalColors={applyGlobalColorsToAllSections}
                            portalContainer={previewOverlayRef.current}
                        />
                    ) : null}
                </div>
            </MobileBottomSheet>

            {/* Add Component Modal */}
            {showAddComponent && (
                <div className="fixed inset-0 bg-q-text/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-q-surface rounded-[var(--editor-control-modal-radius)] border border-q-border w-full max-w-md shadow-xl">
                        <div className="p-4 border-b border-q-border flex items-center justify-between">
                            <h3 className="font-semibold">{t('landingEditor.addComponent', 'Añadir componente')}</h3>
	                            <button
	                                onClick={() => setShowAddComponent(false)}
	                                className="p-1 rounded-[var(--q-radius-md)] text-q-text-muted hover:bg-structure-control-hover hover:text-q-text"
	                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                            {AVAILABLE_COMPONENTS.map(comp => (
	                                <button
	                                    key={comp.type}
	                                    onClick={() => addComponent(comp.type)}
	                                    className="w-full flex items-center gap-3 p-3 rounded-[var(--q-radius-md)] border border-transparent hover:border-structure-control-border hover:bg-structure-control-hover hover:shadow-[inset_0_0_0_1px_hsl(var(--structure-control-border))] transition-all text-left"
	                                >
	                                    <div className="p-2 bg-q-accent/14 rounded-[var(--q-radius-md)] text-q-accent">
                                        {React.createElement(comp.icon, { size: 18 })}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{t(`landingEditor.components.${comp.type}`, comp.type)}</p>
                                    </div>
                                    {comp.isNew && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-q-success/10 text-q-success rounded-full">
                                            {t('landingEditor.components.new', 'Nuevo')}
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
                    <p className="text-q-text-muted mb-6">
                        {t('landingEditor.confirmReset', '¿Descartar todos los cambios no guardados?')}
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowResetConfirm(false)}
                            className="px-4 py-2 rounded-[var(--editor-control-radius)] hover:bg-secondary transition-colors"
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
                            className="px-4 py-2 rounded-[var(--editor-control-radius)] bg-q-accent hover:bg-q-accent text-q-text-on-accent transition-colors"
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
                    <p className="text-q-text-muted mb-6">
                        {t('landingEditor.confirmDeleteMessage', '¿Estás seguro de que quieres eliminar esta sección? Esta acción no se puede deshacer.')}
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setSectionToDelete(null)}
                            className="px-4 py-2 rounded-[var(--editor-control-radius)] hover:bg-secondary transition-colors"
                        >
                            {t('common.cancel', 'Cancelar')}
                        </button>
                        <button
                            onClick={confirmDeleteSection}
                            className="px-4 py-2 rounded-[var(--editor-control-radius)] bg-q-error hover:bg-q-error text-white transition-colors"
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
