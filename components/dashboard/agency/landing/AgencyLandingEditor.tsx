/**
 * AgencyLandingEditor
 * WYSIWYG editor for agency landing pages
 * Mirrors the structure of Quimera's LandingPageEditor exactly
 * Features: Real-time preview, component management, manual save, drag & drop
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, Menu as MenuIcon, Save, Eye, EyeOff, Settings, Layers, Plus,
    GripVertical, Trash2, ChevronDown, Monitor, Tablet,
    Smartphone, Loader2, Check, Image, Type, Layout,
    X, RefreshCw, Palette, Globe, Search, ExternalLink
} from 'lucide-react';
import { useUndoRedo } from '../../../../hooks/useUndoRedo';
import { UndoRedoGroup } from '../../../ui/UndoButton';
import { useUndo } from '../../../../contexts/undo';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
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
import Modal from '../../../ui/Modal';
import { GlobalColors } from '../../../../types';
import { useTenant } from '../../../../contexts/tenant/TenantContext';
import {
    AgencyLandingSection,
    AgencyLandingConfig,
    AGENCY_LANDING_COMPONENTS,
    AGENCY_STRUCTURE_ITEMS,
    createDefaultAgencyLandingConfig,
} from '../../../../types/agencyLanding';
import {
    getAgencyLanding,
    saveAgencyLanding,
    publishAgencyLanding,
    unpublishAgencyLanding,
} from '../../../../services/agencyLandingService';
// Import the same controls as Quimera's landing page
import LandingPageControls from '../../admin/LandingPageControls';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

// =============================================================================
// SORTABLE SECTION ITEM COMPONENT
// =============================================================================

interface SortableSectionItemProps {
    section: AgencyLandingSection;
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
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate capitalize">{section.type}</p>
            </div>

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

// Drag Overlay Item
const DragOverlayItem: React.FC<{ section: AgencyLandingSection }> = ({ section }) => (
    <div className="flex items-center gap-2 p-2.5 bg-card border border-primary rounded-lg shadow-xl">
        <GripVertical size={14} className="text-primary" />
        <span className="text-sm font-medium capitalize">{section.type}</span>
    </div>
);

// =============================================================================
// STRUCTURE ITEMS WITH ICONS
// =============================================================================

const getStructureItemsWithIcons = (t: any) => [
    { id: 'colors', type: 'colors', label: t('dashboard.agency.landing.structureItems.colors', 'Colores'), icon: <Palette size={18} /> },
    { id: 'typography', type: 'typography', label: t('dashboard.agency.landing.structureItems.typography', 'Tipografía'), icon: <Type size={18} /> },
    { id: 'navigation', type: 'header', label: t('dashboard.agency.landing.structureItems.navigation', 'Navegación'), icon: <MenuIcon size={18} /> },
    { id: 'footerGlobal', type: 'footer', label: t('dashboard.agency.landing.structureItems.footer', 'Pie de Página'), icon: <Layout size={18} /> },
    { id: 'branding', type: 'branding', label: t('dashboard.agency.landing.structureItems.branding', 'Marca'), icon: <Image size={18} /> },
    { id: 'seo', type: 'seo', label: t('dashboard.agency.landing.structureItems.seo', 'SEO'), icon: <Search size={18} /> },
    { id: 'domain', type: 'domain', label: t('dashboard.agency.landing.structureItems.domain', 'Dominio'), icon: <Globe size={18} /> },
];

// =============================================================================
// MAIN EDITOR COMPONENT
// =============================================================================

interface AgencyLandingEditorProps {
    onBack?: () => void;
}

export function AgencyLandingEditor({ onBack }: AgencyLandingEditorProps) {
    const { t } = useTranslation();
    const { currentTenant } = useTenant();

    // Editor state
    const [sections, setSections] = useState<AgencyLandingSection[]>([]);
    const [landingConfig, setLandingConfig] = useState<AgencyLandingConfig | null>(null);
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
    const [isPublishing, setIsPublishing] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Preview refresh
    const [previewKey, setPreviewKey] = useState(0);

    // Modals
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

    // Drag and drop
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // Refs
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const savedSectionsRef = useRef<AgencyLandingSection[]>([]);

    // Undo/Redo
    const undoContext = useUndo();
    const {
        pushAction,
        undo,
        redo,
        canUndo,
        canRedo,
        lastActionDescription,
        clear: clearHistory
    } = useUndoRedo<AgencyLandingSection[]>({
        moduleId: 'agency-landing-editor',
        maxHistory: 50,
        onUndo: (action) => setSections(action.previousState),
        onRedo: (action) => setSections(action.newState)
    });

    // Register with undo context
    useEffect(() => {
        undoContext.registerModule('agency-landing-editor', {
            undo: () => undo(),
            redo: () => redo(),
            canUndo: () => canUndo,
            canRedo: () => canRedo,
            getLastActionDescription: () => lastActionDescription,
        });
        undoContext.setActiveModule('agency-landing-editor');

        return () => undoContext.unregisterModule('agency-landing-editor');
    }, [canUndo, canRedo, lastActionDescription]);

    // Drag sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Update sections with undo tracking
    const updateSectionsWithUndo = useCallback((newSections: AgencyLandingSection[], description: string) => {
        pushAction({
            type: 'update_sections',
            description,
            previousState: sections,
            newState: newSections,
        });
        setSections(newSections);
        setHasUnsavedChanges(true);
    }, [sections, pushAction]);

    // Load configuration
    useEffect(() => {
        const loadConfiguration = async () => {
            if (!currentTenant?.id) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const config = await getAgencyLanding(currentTenant.id);

                if (config) {
                    setLandingConfig(config);
                    setSections(config.sections || []);
                    savedSectionsRef.current = JSON.parse(JSON.stringify(config.sections || []));
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AgencyLandingEditor.tsx:loadConfig',message:'Loaded from Firestore',data:{sectionsCount:config.sections?.length||0,sectionIds:(config.sections||[]).map((s:any)=>({id:s.id,type:s.type}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
                    // #endregion
                    if (config.updatedAt) {
                        setLastSaved(config.updatedAt.toDate ? config.updatedAt.toDate() : new Date(config.updatedAt));
                    }
                } else {
                    // Create default configuration
                    const defaultConfig = createDefaultAgencyLandingConfig(currentTenant.id, currentTenant.name);
                    setSections(defaultConfig.sections);
                    savedSectionsRef.current = JSON.parse(JSON.stringify(defaultConfig.sections));
                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AgencyLandingEditor.tsx:loadConfig',message:'Created default config',data:{sectionsCount:defaultConfig.sections.length,sectionIds:defaultConfig.sections.map(s=>({id:s.id,type:s.type}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
                    // #endregion
                }
            } catch (error) {
                console.error('Error loading agency landing:', error);
            }
            setIsLoading(false);
        };

        loadConfiguration();
    }, [currentTenant?.id, currentTenant?.name]);

    // Send updates to preview iframe
    useEffect(() => {
        // #region agent log
        const footerSection = sections.find(s => s.type === 'footer');
        const headerSection = sections.find(s => s.type === 'header');
        fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AgencyLandingEditor.tsx:postMessage',message:'Sending to preview',data:{hasIframe:!!iframeRef.current?.contentWindow,sectionsCount:sections.length,footerDataKeys:Object.keys(footerSection?.data||{}),headerDataKeys:Object.keys(headerSection?.data||{})},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H6'})}).catch(()=>{});
        // #endregion
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'AGENCY_LANDING_UPDATE',
                sections: sections,
                theme: landingConfig?.theme,
                branding: landingConfig?.branding,
            }, window.location.origin);
        }
    }, [sections, landingConfig]);

    // Listen for preview ready message
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'PREVIEW_READY') {
                if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage({
                        type: 'AGENCY_LANDING_UPDATE',
                        sections: sections,
                        theme: landingConfig?.theme,
                        branding: landingConfig?.branding,
                    }, window.location.origin);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [sections, landingConfig]);

    // Save handler
    const handleSave = useCallback(async () => {
        if (!currentTenant?.id) return;

        setIsSaving(true);
        try {
            await saveAgencyLanding(currentTenant.id, {
                ...landingConfig,
                sections,
            });
            setHasUnsavedChanges(false);
            setLastSaved(new Date());
            savedSectionsRef.current = JSON.parse(JSON.stringify(sections));
            clearHistory();
            setPreviewKey(prev => prev + 1);
        } catch (error) {
            console.error('Error saving:', error);
            alert(t('common.errorSaving', '❌ Error al guardar. Intenta de nuevo.'));
        }
        setIsSaving(false);
    }, [currentTenant?.id, landingConfig, sections, t, clearHistory]);

    // Publish handler
    const handlePublish = useCallback(async () => {
        if (!currentTenant?.id) return;

        setIsPublishing(true);
        try {
            // Save first
            await saveAgencyLanding(currentTenant.id, { ...landingConfig, sections });
            // Then publish
            await publishAgencyLanding(currentTenant.id);
            setLandingConfig(prev => prev ? { ...prev, isPublished: true } : null);
            alert(t('agency.landing.published', '✅ Landing page publicada correctamente'));
        } catch (error) {
            console.error('Error publishing:', error);
            alert(t('common.error', '❌ Error al publicar'));
        }
        setIsPublishing(false);
    }, [currentTenant?.id, landingConfig, sections, t]);

    // Unpublish handler
    const handleUnpublish = useCallback(async () => {
        if (!currentTenant?.id) return;

        setIsPublishing(true);
        try {
            await unpublishAgencyLanding(currentTenant.id);
            setLandingConfig(prev => prev ? { ...prev, isPublished: false } : null);
        } catch (error) {
            console.error('Error unpublishing:', error);
        }
        setIsPublishing(false);
    }, [currentTenant?.id]);

    // Section operations
    const toggleSection = (id: string) => {
        const targetSection = sections.find(s => s.id === id);
        const newSections = sections.map(s =>
            s.id === id ? { ...s, enabled: !s.enabled } : s
        );
        updateSectionsWithUndo(newSections, `${targetSection?.enabled ? 'Ocultó' : 'Mostró'} sección ${targetSection?.type || id}`);
    };

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

        updateSectionsWithUndo(newSections, `Movió sección ${movedSection.type}`);
    };

    const deleteSection = (id: string) => setSectionToDelete(id);

    const confirmDeleteSection = () => {
        if (!sectionToDelete) return;
        const deletedSection = sections.find(s => s.id === sectionToDelete);
        const newSections = sections.filter(s => s.id !== sectionToDelete);
        updateSectionsWithUndo(newSections, `Eliminó sección ${deletedSection?.type || sectionToDelete}`);
        if (selectedSection === sectionToDelete) setSelectedSection(null);
        setSectionToDelete(null);
    };

    const addComponent = (type: string) => {
        const newSection: AgencyLandingSection = {
            id: `${type}-${Date.now()}`,
            type,
            enabled: true,
            order: sections.length,
            data: {}
        };
        const newSections = [...sections, newSection];
        updateSectionsWithUndo(newSections, `Agregó sección ${type}`);
        setSelectedSection(newSection.id);
        setShowAddComponent(false);
    };

    const updateSectionData = useCallback((sectionId: string, newData: Record<string, any>) => {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AgencyLandingEditor.tsx:updateSectionData',message:'Function called',data:{sectionId,newDataKeys:Object.keys(newData||{})},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        setSections(prev => {
            const foundSection = prev.find(s => s.id === sectionId);
            const allIds = prev.map(s => s.id);
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AgencyLandingEditor.tsx:updateSectionData:inside',message:'Inside setSections',data:{sectionId,foundId:foundSection?.id||'NOT_FOUND',allIds,sectionCount:prev.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4,H5'})}).catch(()=>{});
            // #endregion
            return prev.map(s =>
                s.id === sectionId ? { ...s, data: newData } : s
            );
        });
        setHasUnsavedChanges(true);
    }, []);

    // Color mappings for global colors
    const generateColorMappings = (colors: GlobalColors): Record<string, Record<string, string>> => ({
        hero: { backgroundColor: colors.background, textColor: colors.text, accentColor: colors.primary },
        heroModern: { backgroundColor: colors.background, textColor: colors.text, accentColor: colors.primary },
        heroGradient: { backgroundColor: colors.background, textColor: colors.text, accentColor: colors.primary },
        features: { backgroundColor: colors.surface, textColor: colors.text, accentColor: colors.primary },
        services: { backgroundColor: colors.background, textColor: colors.text, accentColor: colors.primary },
        pricing: { backgroundColor: colors.background, textColor: colors.text, accentColor: colors.primary },
        testimonials: { backgroundColor: colors.surface, textColor: colors.text, accentColor: colors.secondary },
        portfolio: { backgroundColor: colors.background, textColor: colors.text, accentColor: colors.primary },
        team: { backgroundColor: colors.surface, textColor: colors.text, accentColor: colors.primary },
        faq: { backgroundColor: colors.background, textColor: colors.text, accentColor: colors.primary },
        cta: { backgroundColor: colors.primary, textColor: '#ffffff', accentColor: colors.secondary },
        leads: { backgroundColor: colors.surface, textColor: colors.text, accentColor: colors.primary },
        footer: { backgroundColor: colors.surface, textColor: colors.textMuted, accentColor: colors.primary },
        header: { backgroundColor: colors.background, textColor: colors.text, accentColor: colors.primary },
    });

    const applyGlobalColorsToAllSections = useCallback((colors: GlobalColors) => {
        const colorMappings = generateColorMappings(colors);
        setSections(prev => prev.map(section => {
            const sectionColors = colorMappings[section.type];
            if (sectionColors) {
                return { ...section, data: { ...section.data, ...sectionColors } };
            }
            return section;
        }));
        setHasUnsavedChanges(true);
        setPreviewKey(prev => prev + 1);
    }, []);

    // Selection handlers
    const scrollToSection = useCallback((sectionType: string) => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'SCROLL_TO_SECTION',
                sectionType
            }, window.location.origin);
        }
    }, []);

    const handleSectionSelect = useCallback((sectionId: string, sectionType: string) => {
        setSelectedSection(sectionId);
        setSelectedStructureItem(null);
        scrollToSection(sectionType);
    }, [scrollToSection]);

    const handleStructureSelect = useCallback((itemId: string) => {
        setSelectedStructureItem(itemId);
        setSelectedSection(null);
    }, []);

    // Preview width
    const previewWidth = useMemo(() => {
        switch (previewDevice) {
            case 'tablet': return 'max-w-[768px]';
            case 'mobile': return 'max-w-[375px]';
            default: return 'max-w-full';
        }
    }, [previewDevice]);

    const currentSection = useMemo(() =>
        sections.find(s => s.id === selectedSection),
        [sections, selectedSection]
    );

    // Memoize structure items with translations - MUST be before any conditional returns
    const structureItemsWithIcons = useMemo(() => getStructureItemsWithIcons(t), [t]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex w-full h-full items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // No tenant
    if (!currentTenant?.id) {
        return (
            <div className="flex w-full h-full items-center justify-center bg-background">
                <p className="text-muted-foreground">{t('dashboard.agency.landing.noTenant', 'No hay agencia seleccionada')}</p>
            </div>
        );
    }

    return (
        <div className="flex w-full h-full min-h-0 bg-background text-foreground overflow-hidden">
            <div className="flex-1 w-full flex flex-col overflow-hidden min-h-0">
                {/* Header */}
                <header className="h-14 px-4 lg:px-6 border-b border-border flex items-center bg-background z-20 sticky top-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Layout className="text-primary w-5 h-5" />
                            <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                                {t('dashboard.agency.landing.editorTitle', 'Editor Landing Page')}
                            </h1>
                        </div>

                        {hasUnsavedChanges && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-500 rounded-full">
                                {t('landingEditor.unsavedChanges', 'Cambios sin guardar')}
                            </span>
                        )}

                        {landingConfig?.isPublished && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-500 rounded-full">
                                {t('dashboard.agency.landing.publishedBadge', 'Publicada')}
                            </span>
                        )}
                    </div>

                    {/* Device toggle */}
                    <div className="hidden md:flex flex-1 justify-center">
                        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
                            {(['desktop', 'tablet', 'mobile'] as PreviewDevice[]).map((device) => (
                                <button
                                    key={device}
                                    onClick={() => setPreviewDevice(device)}
                                    className={`p-2 rounded-md transition-colors ${previewDevice === device ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    title={device}
                                >
                                    {device === 'desktop' && <Monitor size={18} />}
                                    {device === 'tablet' && <Tablet size={18} />}
                                    {device === 'mobile' && <Smartphone size={18} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            onClick={() => setPreviewKey(prev => prev + 1)}
                            className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title={t('dashboard.agency.landing.refreshPreview', 'Refrescar vista previa')}
                        >
                            <RefreshCw size={18} />
                        </button>

                        <button
                            onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                            className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title={isPreviewVisible ? t('dashboard.agency.landing.hidePreview', 'Ocultar vista previa') : t('dashboard.agency.landing.showPreview', 'Mostrar vista previa')}
                        >
                            {isPreviewVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>

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
                            className={`flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium transition-all ${hasUnsavedChanges
                                ? 'bg-primary text-primary-foreground hover:opacity-90'
                                : 'bg-secondary/50 text-muted-foreground cursor-not-allowed'
                                }`}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                            <span className="hidden sm:inline">{isSaving ? t('dashboard.agency.landing.saving', 'Guardando...') : t('dashboard.agency.landing.save', 'Guardar')}</span>
                        </button>

                        {/* Publish button */}
                        <button
                            onClick={landingConfig?.isPublished ? handleUnpublish : handlePublish}
                            disabled={isPublishing || hasUnsavedChanges}
                            className={`flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium transition-all ${landingConfig?.isPublished
                                ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                                : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                } ${hasUnsavedChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe size={16} />}
                            <span className="hidden sm:inline">
                                {landingConfig?.isPublished ? t('dashboard.agency.landing.unpublish', 'Despublicar') : t('dashboard.agency.landing.publish', 'Publicar')}
                            </span>
                        </button>

                        {/* View live link */}
                        {landingConfig?.isPublished && landingConfig?.domain?.subdomain && (
                            <a
                                href={`https://${landingConfig.domain.subdomain}.quimera.app`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="Ver sitio"
                            >
                                <ExternalLink size={18} />
                            </a>
                        )}

                        {onBack && (
                            <button
                                onClick={onBack}
                                className="flex items-center gap-2 h-9 px-3 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('dashboard.agency.landing.back', 'Volver')}</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Main Content - Three Panel Layout */}
                <main className="flex-1 flex overflow-hidden">
                    {/* Left Panel - Component List */}
                    <div className="w-48 lg:w-52 border-r border-border bg-card/50 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h2 className="font-semibold text-sm">{t('dashboard.agency.landing.pageStructure', 'ESTRUCTURA DE PÁGINA')}</h2>
                            <button
                                onClick={() => setShowAddComponent(true)}
                                className="h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-colors"
                                title={t('dashboard.agency.landing.addComponent', 'Añadir componente')}
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {/* ESTRUCTURA Group */}
                            <div className="mb-4">
                                <button
                                    onClick={() => setIsStructureExpanded(!isStructureExpanded)}
                                    className="w-full flex items-center gap-2 px-2 py-2 text-xs font-bold text-primary uppercase tracking-wider hover:bg-secondary/30 rounded transition-colors"
                                >
                                    <ChevronDown size={14} className={`transition-transform ${isStructureExpanded ? '' : '-rotate-90'}`} />
                                    <span>{t('dashboard.agency.landing.structure', 'ESTRUCTURA')}</span>
                                    <span className="text-muted-foreground">({structureItemsWithIcons.length})</span>
                                </button>

                                {isStructureExpanded && (
                                    <div className="mt-1 space-y-0.5 pl-2">
                                        {structureItemsWithIcons.map((item) => (
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
                                    <span>{t('dashboard.agency.landing.content', 'CONTENIDO')}</span>
                                    <span className="text-muted-foreground">({sections.filter(s => s.type !== 'header' && s.type !== 'footer').length})</span>
                                </button>

                                {isContentExpanded && (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={(e) => setActiveDragId(e.active.id as string)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={sections.filter(s => s.type !== 'header' && s.type !== 'footer').map(s => s.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="mt-1 space-y-0.5 pl-2">
                                                {sections.filter(s => s.type !== 'header' && s.type !== 'footer').map((section) => (
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
                                                <DragOverlayItem section={sections.find(s => s.id === activeDragId)!} />
                                            )}
                                        </DragOverlay>
                                    </DndContext>
                                )}
                            </div>
                        </div>

                        {lastSaved && (
                            <div className="p-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                                <Check size={12} className="text-green-500" />
                                <span>{t('dashboard.agency.landing.saved', 'Guardado')}: {lastSaved.toLocaleTimeString()}</span>
                            </div>
                        )}
                    </div>

                    {/* Center Panel - Preview */}
                    {isPreviewVisible && (
                        <div className="flex-1 bg-muted/30 p-4 flex flex-col min-h-0">
                            <div className={`flex-1 flex flex-col bg-white rounded-lg shadow-lg mx-auto ${previewWidth} w-full transition-all duration-300 min-h-0`}>
                                <iframe
                                    ref={iframeRef}
                                    key={previewKey}
                                    src={`/agency-landing-preview?tenantId=${currentTenant.id}`}
                                    className="w-full h-full border-0"
                                    title="Agency Landing Preview"
                                />
                            </div>
                        </div>
                    )}

                    {/* Right Panel - Controls */}
                    <div className={`${isPreviewVisible ? 'w-64 lg:w-72' : 'flex-1 max-w-2xl mx-auto'} border-l border-border bg-card/50 flex flex-col overflow-hidden`}>
                        {selectedStructureItem ? (
                            <>
                                <div className="p-4 border-b border-border">
                                    <h2 className="font-semibold text-sm flex items-center gap-2">
                                        <Settings size={16} className="text-primary" />
                                        {t('dashboard.agency.landing.edit', 'Editar')}: <span className="capitalize">
                                            {structureItemsWithIcons.find(i => i.id === selectedStructureItem)?.label || selectedStructureItem}
                                        </span>
                                    </h2>
                                </div>
                                <LandingPageControls
                                    section={(() => {
                                        // FIX: Use the ACTUAL section ID from sections array, not the structure item ID
                                        const structureItem = structureItemsWithIcons.find(i => i.id === selectedStructureItem);
                                        const actualSection = sections.find(s => s.type === structureItem?.type);
                                        const result = actualSection || {
                                            id: selectedStructureItem,
                                            type: structureItem?.type || selectedStructureItem,
                                            enabled: true,
                                            order: 0,
                                            data: {}
                                        };
                                        // #region agent log
                                        fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AgencyLandingEditor.tsx:sectionProp',message:'Section passed to controls',data:{selectedStructureItem,structureItemType:structureItem?.type,actualSectionFound:!!actualSection,resultId:result.id,resultType:result.type,resultDataKeys:Object.keys(result.data||{}),sectionsCount:sections.length,allSectionTypes:sections.map(s=>({id:s.id,type:s.type}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H2'})}).catch(()=>{});
                                        // #endregion
                                        return result;
                                    })()}
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
                                        {t('dashboard.agency.landing.edit', 'Editar')}: <span className="capitalize">{currentSection.type}</span>
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
                                    <h3 className="font-semibold mb-2">{t('dashboard.agency.landing.noSectionSelected', 'Ninguna sección seleccionada')}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t('dashboard.agency.landing.selectSectionHint', 'Selecciona una sección de la lista para editarla')}
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
                            <h3 className="font-semibold">{t('dashboard.agency.landing.addComponent', 'Añadir componente')}</h3>
                            <button onClick={() => setShowAddComponent(false)} className="p-1 rounded hover:bg-secondary">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                            {AGENCY_LANDING_COMPONENTS.map(comp => (
                                <button
                                    key={comp.type}
                                    onClick={() => addComponent(comp.type)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                                >
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Layout size={18} />
                                    </div>
                                    <p className="font-medium text-sm">{comp.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <Modal isOpen={!!sectionToDelete} onClose={() => setSectionToDelete(null)} maxWidth="max-w-md">
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4">{t('dashboard.agency.landing.deleteSection', 'Eliminar Sección')}</h3>
                    <p className="text-muted-foreground mb-6">
                        {t('dashboard.agency.landing.deleteSectionConfirm', '¿Estás seguro de que quieres eliminar esta sección? Esta acción no se puede deshacer.')}
                    </p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setSectionToDelete(null)} className="px-4 py-2 rounded-lg hover:bg-secondary transition-colors">
                            {t('dashboard.agency.landing.cancel', 'Cancelar')}
                        </button>
                        <button onClick={confirmDeleteSection} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">
                            {t('dashboard.agency.landing.delete', 'Eliminar')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Reset Confirmation Modal */}
            <Modal isOpen={showResetConfirm} onClose={() => setShowResetConfirm(false)} maxWidth="max-w-md">
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4">{t('dashboard.agency.landing.discardChangesTitle', 'Confirmar')}</h3>
                    <p className="text-muted-foreground mb-6">{t('dashboard.agency.landing.discardChangesMessage', '¿Descartar todos los cambios no guardados?')}</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 rounded-lg hover:bg-secondary transition-colors">
                            {t('dashboard.agency.landing.cancel', 'Cancelar')}
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
                            {t('dashboard.agency.landing.discard', 'Descartar')}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default AgencyLandingEditor;
