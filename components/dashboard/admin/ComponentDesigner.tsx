
import React, { useState } from 'react';
import { EditableComponentID, PreviewDevice, ComponentVariant, ComponentPermissions, ComponentDocumentation } from '../../../types';
import ComponentControls from './ComponentControls';
import ComponentPreview from './ComponentPreview';
import CreateComponentModal from './CreateComponentModal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { VariantsManager } from './VariantsManager';
import ComponentPermissionsEditor from './ComponentPermissionsEditor';
import ComponentDocumentationEditor from './ComponentDocumentationEditor';
import { useEditor } from '../../../contexts/EditorContext';
import { generateComponentThumbnail, createPlaceholderThumbnail } from '../../../utils/thumbnailGenerator';
import { Image, List, Wrench, Star, Users, Megaphone, GalleryHorizontal, Tag, HelpCircle, Briefcase, Mail, FilePenLine, Video, Puzzle, Type, Plus, Menu, Settings, X, Save, Loader2, Clock, Camera, Sparkles, Shield, BookOpen, AlignJustify, Edit2, Check, MessageCircle } from 'lucide-react';

interface ComponentDesignerProps {
    previewDevice: PreviewDevice;
}

const componentOptions: { id: EditableComponentID, name: string, icon: React.ReactNode }[] = [
    { id: 'header', name: 'Navigation Bar', icon: <AlignJustify size={18} /> },
    { id: 'hero', name: 'Hero', icon: <Image size={18} /> },
    { id: 'features', name: 'Features', icon: <List size={18} /> },
    { id: 'services', name: 'Services', icon: <Wrench size={18} /> },
    { id: 'testimonials', name: 'Testimonials', icon: <Star size={18} /> },
    { id: 'team', name: 'Team', icon: <Users size={18} /> },
    { id: 'cta', name: 'CTA', icon: <Megaphone size={18} /> },
    { id: 'slideshow', name: 'Slideshow', icon: <GalleryHorizontal size={18} /> },
    { id: 'pricing', name: 'Pricing', icon: <Tag size={18} /> },
    { id: 'faq', name: 'FAQ', icon: <HelpCircle size={18} /> },
    { id: 'portfolio', name: 'Portfolio', icon: <Briefcase size={18} /> },
    { id: 'leads', name: 'Leads Form', icon: <Mail size={18} /> },
    { id: 'menu', name: 'Restaurant Menu', icon: <Menu size={18} /> },
    { id: 'newsletter', name: 'Newsletter', icon: <FilePenLine size={18} /> },
    { id: 'video', name: 'Video', icon: <Video size={18} /> },
    { id: 'howItWorks', name: 'How It Works', icon: <Puzzle size={18} /> },
    { id: 'chatbot', name: 'AI Chatbot', icon: <MessageCircle size={18} /> },
    { id: 'typography', name: 'Global Typography', icon: <Type size={18} /> },
    { id: 'footer', name: 'Footer', icon: <Type size={18} /> },
];

const ComponentDesigner: React.FC<ComponentDesignerProps> = ({ previewDevice }) => {
    const { customComponents, saveComponent, revertToVersion, updateComponentStyle, updateComponentVariants, renameCustomComponent, componentStyles } = useEditor();
    const [selectedComponentId, setSelectedComponentId] = useState<string>('header');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
    const [showVariants, setShowVariants] = useState(false);
    const [showPermissions, setShowPermissions] = useState(false);
    const [showDocumentation, setShowDocumentation] = useState(false);
    const [activeMobilePanel, setActiveMobilePanel] = useState<'none' | 'nav' | 'props'>('none');
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
    const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState<string>('');
    const [isRenamingSaving, setIsRenamingSaving] = useState(false);

    const toggleMobilePanel = (panel: 'nav' | 'props') => {
        setActiveMobilePanel(prev => prev === panel ? 'none' : panel);
    };

    const handleComponentSelect = (id: string) => {
        setSelectedComponentId(id);
        if (window.innerWidth < 1280) { // Close on mobile/tablet selection
            setActiveMobilePanel('none');
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        await saveComponent(selectedComponentId);
        setIsSaving(false);
    };

    const handleGenerateThumbnail = async () => {
        const selectedComponent = customComponents?.find(c => c.id === selectedComponentId);
        if (!selectedComponent) {
            alert("Solo los componentes personalizados pueden tener thumbnails");
            return;
        }

        setIsGeneratingThumbnail(true);
        try {
            // Wait a bit for any animations to complete
            await new Promise(resolve => setTimeout(resolve, 300));

            // Try to generate from preview
            let thumbnail = await generateComponentThumbnail(selectedComponentId, {
                width: 300,
                height: 200,
                quality: 0.9,
            });

            // If failed, create placeholder
            if (!thumbnail) {
                thumbnail = createPlaceholderThumbnail(
                    selectedComponent.name,
                    selectedComponent.baseComponent
                );
            }

            // Update component with thumbnail
            await updateComponentStyle(
                selectedComponentId,
                { ...selectedComponent.styles, thumbnail } as any,
                true
            );

            alert("✅ Thumbnail generado exitosamente");
        } catch (error) {
            console.error("Error generating thumbnail:", error);
            alert("❌ Error al generar thumbnail. Intenta de nuevo.");
        } finally {
            setIsGeneratingThumbnail(false);
        }
    };

    const handleStartEdit = (componentId: string, currentName: string) => {
        setEditingComponentId(componentId);
        setEditingName(currentName);
    };

    const handleCancelEdit = () => {
        setEditingComponentId(null);
        setEditingName('');
    };

    const handleSaveEdit = async (componentId: string) => {
        // Prevenir guardados múltiples
        if (isRenamingSaving) {
            return;
        }

        if (!editingName.trim()) {
            alert("El nombre no puede estar vacío");
            return;
        }

        setIsRenamingSaving(true);
        try {
            await renameCustomComponent(componentId, editingName);
            setEditingComponentId(null);
            setEditingName('');
        } catch (error) {
            console.error("Error renaming component:", error);
            alert("❌ Error al renombrar el componente: " + (error as Error).message);
        } finally {
            setIsRenamingSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, componentId: string) => {
        if (e.key === 'Enter') {
            handleSaveEdit(componentId);
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    const LeftSidebar = () => (
        <aside className={`
            fixed xl:relative inset-y-0 left-0 z-50 xl:z-30 w-64 bg-editor-panel-bg border-r border-editor-border flex flex-col
            transform transition-transform duration-300 ease-in-out xl:transform-none shadow-2xl xl:shadow-none
            ${activeMobilePanel === 'nav' ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
        `}>
             <div className="p-4 border-b border-editor-border flex-shrink-0 flex justify-between items-center">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-editor-text-secondary">Components</h3>
                <button onClick={() => setActiveMobilePanel('none')} className="xl:hidden p-1 rounded-md hover:bg-editor-border">
                    <X size={18} />
                </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                <div>
                    <p className="px-2 pt-2 pb-1 text-xs font-bold text-editor-text-secondary uppercase">Standard</p>
                    {componentOptions.map(opt => (
                        <button key={opt.id} onClick={() => handleComponentSelect(opt.id)} className={`w-full flex items-center text-left p-2 rounded-md text-sm font-medium transition-colors ${selectedComponentId === opt.id ? 'bg-editor-accent/10 text-editor-accent' : 'text-editor-text-secondary hover:bg-editor-border hover:text-editor-text-primary'}`}>
                            <span className="mr-3">{opt.icon}</span>
                            {opt.name}
                        </button>
                    ))}
                </div>
                {customComponents && customComponents.length > 0 && (
                        <div>
                        <p className="px-2 pt-4 pb-1 text-xs font-bold text-editor-text-secondary uppercase">Custom</p>
                        {customComponents.map((comp) => (
                            <div key={comp.id} className={`group w-full flex items-center text-left p-2 rounded-md text-sm font-medium transition-colors ${selectedComponentId === comp.id ? 'bg-editor-accent/10 text-editor-accent' : 'text-editor-text-secondary hover:bg-editor-border hover:text-editor-text-primary'}`}>
                                <span className="mr-3 opacity-60"><Puzzle size={18} /></span>
                                {editingComponentId === comp.id ? (
                                    <div className="flex-1 flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, comp.id)}
                                            className="flex-1 bg-editor-bg border border-editor-accent rounded px-2 py-1 text-sm text-editor-text-primary focus:outline-none"
                                            autoFocus
                                        />
                                        <button
                                            onMouseDown={(e) => {
                                                e.preventDefault(); // Prevenir que el input pierda el foco
                                                handleSaveEdit(comp.id);
                                            }}
                                            className="p-1 rounded hover:bg-editor-accent/20 text-editor-accent"
                                            title="Guardar"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onMouseDown={(e) => {
                                                e.preventDefault(); // Prevenir que el input pierda el foco
                                                handleCancelEdit();
                                            }}
                                            className="p-1 rounded hover:bg-editor-border text-editor-text-secondary"
                                            title="Cancelar"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleComponentSelect(comp.id)}
                                            className="flex-1 text-left"
                                        >
                                            {comp.name}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartEdit(comp.id, comp.name);
                                            }}
                                            className="p-1 rounded hover:bg-editor-accent/20 text-editor-text-secondary hover:text-editor-accent opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Editar nombre"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </nav>
                <div className="p-2 border-t border-editor-border">
                <button onClick={() => setIsCreateModalOpen(true)} className="w-full flex items-center text-left p-2 rounded-md text-sm font-medium transition-colors text-editor-accent hover:bg-editor-accent/10">
                    <Plus size={18} className="mr-3" />
                    Create New Component
                </button>
            </div>
        </aside>
    );

    const RightSidebar = () => {
        // Check if selected component is custom (has version history)
        const selectedComponent = customComponents?.find(c => c.id === selectedComponentId);
        const hasVersionHistory = selectedComponent && selectedComponent.versionHistory && selectedComponent.versionHistory.length > 0;

        return (
            <aside className={`
                fixed xl:relative inset-y-0 right-0 z-50 xl:z-30 w-80 sm:w-[384px] bg-editor-panel-bg border-l border-editor-border flex flex-col
                transform transition-transform duration-300 ease-in-out xl:transform-none shadow-2xl xl:shadow-none
                ${activeMobilePanel === 'props' ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'}
            `}>
                <div className="p-4 border-b border-editor-border flex-shrink-0">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-editor-text-secondary">Properties</h3>
                        <button onClick={() => setActiveMobilePanel('none')} className="xl:hidden p-1 rounded-md hover:bg-editor-border">
                            <X size={18} />
                        </button>
                    </div>
                    
                    {/* Component Name Editor for Custom Components */}
                    {selectedComponent && (
                        <div className="mb-2">
                            <label className="block text-xs font-medium text-editor-text-secondary mb-1">Component Name</label>
                            <div className="flex items-center gap-2">
                                {editingComponentId === selectedComponent.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, selectedComponent.id)}
                                            className="flex-1 bg-editor-bg border border-editor-accent rounded px-2 py-1.5 text-sm text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-editor-accent/50"
                                            autoFocus
                                        />
                                        <button
                                            onMouseDown={(e) => {
                                                e.preventDefault(); // Prevenir que el input pierda el foco
                                                handleSaveEdit(selectedComponent.id);
                                            }}
                                            className="p-1.5 rounded bg-editor-accent text-editor-bg hover:bg-editor-accent-hover"
                                            title="Guardar"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            onMouseDown={(e) => {
                                                e.preventDefault(); // Prevenir que el input pierda el foco
                                                handleCancelEdit();
                                            }}
                                            className="p-1.5 rounded bg-editor-border text-editor-text-secondary hover:bg-editor-border/70"
                                            title="Cancelar"
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex-1 bg-editor-bg border border-editor-border rounded px-2 py-1.5 text-sm text-editor-text-primary">
                                            {selectedComponent.name}
                                        </div>
                                        <button
                                            onClick={() => handleStartEdit(selectedComponent.id, selectedComponent.name)}
                                            className="p-1.5 rounded bg-editor-border text-editor-text-secondary hover:bg-editor-accent/20 hover:text-editor-accent"
                                            title="Editar nombre"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                        {hasVersionHistory && (
                            <button 
                                onClick={() => setIsVersionHistoryOpen(true)}
                                className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-purple-700 transition-colors"
                                title="Ver historial de versiones"
                            >
                                <Clock size={14} />
                                <span className="hidden sm:inline">Historial</span>
                            </button>
                        )}
                        {selectedComponent && (
                            <button 
                                onClick={handleGenerateThumbnail}
                                disabled={isGeneratingThumbnail}
                                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                title="Generar thumbnail"
                            >
                                {isGeneratingThumbnail ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                <span className="hidden sm:inline">Thumbnail</span>
                            </button>
                        )}
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-editor-accent text-editor-bg px-3 py-1.5 rounded-md text-xs font-bold hover:bg-editor-accent-hover transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Save Changes
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <ComponentControls selectedComponentId={selectedComponentId} />
                    
                    {/* Variants Section (for custom components only) */}
                    {selectedComponent && (
                        <div className="border-t border-editor-border mt-4">
                            <button
                                onClick={() => setShowVariants(!showVariants)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-editor-border/30 transition-colors"
                            >
                                <div className="flex items-center gap-2 text-sm font-semibold text-editor-text-primary">
                                    <Sparkles className="w-4 h-4" />
                                    Variants {selectedComponent.variants && `(${selectedComponent.variants.length})`}
                                </div>
                                <span className={`transition-transform ${showVariants ? 'rotate-180' : ''}`}>▼</span>
                            </button>
                            {showVariants && (
                                <div className="p-4 bg-editor-bg">
                                    <VariantsManager
                                        component={selectedComponent}
                                        onUpdateVariants={async (variants, activeVariant) => {
                                            await updateComponentVariants(selectedComponent.id, variants, activeVariant);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Permissions Section (for custom components only) */}
                    {selectedComponent && (
                        <div className="border-t border-editor-border">
                            <button
                                onClick={() => setShowPermissions(!showPermissions)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-editor-border/30 transition-colors"
                            >
                                <div className="flex items-center gap-2 text-sm font-semibold text-editor-text-primary">
                                    <Shield className="w-4 h-4" />
                                    Permissions
                                </div>
                                <span className={`transition-transform ${showPermissions ? 'rotate-180' : ''}`}>▼</span>
                            </button>
                            {showPermissions && (
                                <div className="p-4 bg-editor-bg">
                                    <ComponentPermissionsEditor
                                        component={selectedComponent}
                                        onUpdate={async (permissions: ComponentPermissions) => {
                                            // Update component permissions
                                            await updateComponentStyle(selectedComponent.id, { permissions }, true);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Documentation Section (for custom components only) */}
                    {selectedComponent && (
                        <div className="border-t border-editor-border">
                            <button
                                onClick={() => setShowDocumentation(!showDocumentation)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-editor-border/30 transition-colors"
                            >
                                <div className="flex items-center gap-2 text-sm font-semibold text-editor-text-primary">
                                    <BookOpen className="w-4 h-4" />
                                    Documentation
                                </div>
                                <span className={`transition-transform ${showDocumentation ? 'rotate-180' : ''}`}>▼</span>
                            </button>
                            {showDocumentation && (
                                <div className="p-4 bg-editor-bg">
                                    <ComponentDocumentationEditor
                                        component={selectedComponent}
                                        onUpdate={async (documentation: ComponentDocumentation) => {
                                            // Update component documentation
                                            await updateComponentStyle(selectedComponent.id, { documentation }, true);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>
        );
    };

    const selectedCustomComponent = customComponents?.find(c => c.id === selectedComponentId);

    return (
        <>
            <CreateComponentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onComponentCreated={(newComponent) => {
                    setSelectedComponentId(newComponent.id);
                }}
            />
            
            {selectedCustomComponent && (
                <VersionHistoryModal
                    isOpen={isVersionHistoryOpen}
                    onClose={() => setIsVersionHistoryOpen(false)}
                    component={selectedCustomComponent}
                    onRevert={async (versionNumber) => {
                        await revertToVersion(selectedComponentId, versionNumber);
                    }}
                />
            )}
            
            <div className="flex h-full relative overflow-hidden">
                {/* Mobile Backdrop */}
                {activeMobilePanel !== 'none' && (
                    <div 
                        className="fixed inset-0 bg-black/50 z-40 xl:hidden"
                        onClick={() => setActiveMobilePanel('none')}
                    />
                )}

                <LeftSidebar />

                {/* Center Panel: Preview */}
                <main className="flex-1 flex flex-col min-w-0 bg-editor-bg relative z-0">
                    {/* Mobile/Tablet Toolbar */}
                    <div className="xl:hidden h-14 border-b border-editor-border bg-editor-panel-bg flex items-center justify-between px-4 flex-shrink-0 z-30 relative gap-4">
                         <button 
                            onClick={() => toggleMobilePanel('nav')}
                            className={`flex-1 p-2 rounded-md text-sm font-medium flex items-center justify-center transition-colors ${activeMobilePanel === 'nav' ? 'bg-editor-accent/10 text-editor-accent' : 'bg-editor-bg text-editor-text-secondary border border-editor-border'}`}
                        >
                            <Menu size={18} className="mr-2" />
                            Components
                        </button>
                        <button 
                            onClick={() => toggleMobilePanel('props')}
                             className={`flex-1 p-2 rounded-md text-sm font-medium flex items-center justify-center transition-colors ${activeMobilePanel === 'props' ? 'bg-editor-accent/10 text-editor-accent' : 'bg-editor-bg text-editor-text-secondary border border-editor-border'}`}
                        >
                            <Settings size={18} className="mr-2" />
                            Properties
                        </button>
                    </div>

                    <div className="flex-1 p-4 sm:p-8 overflow-y-auto flex justify-center items-start bg-editor-bg">
                        <ComponentPreview 
                            selectedComponentId={selectedComponentId} 
                            previewDevice={previewDevice} 
                        />
                    </div>
                </main>

                <RightSidebar />
            </div>
        </>
    );
};

export default ComponentDesigner;
