
import React, { useState } from 'react';
import { EditableComponentID, PreviewDevice } from '../../../types';
import ComponentControls from './ComponentControls';
import ComponentPreview from './ComponentPreview';
import CreateComponentModal from './CreateComponentModal';
import { useEditor } from '../../../contexts/EditorContext';
import { Image, List, Wrench, Star, Users, Megaphone, GalleryHorizontal, Tag, HelpCircle, Briefcase, Mail, FilePenLine, Video, Puzzle, Type, Plus, Menu, Settings, X, Save, Loader2 } from 'lucide-react';

interface ComponentDesignerProps {
    previewDevice: PreviewDevice;
}

const componentOptions: { id: EditableComponentID, name: string, icon: React.ReactNode }[] = [
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
    { id: 'newsletter', name: 'Newsletter', icon: <FilePenLine size={18} /> },
    { id: 'video', name: 'Video', icon: <Video size={18} /> },
    { id: 'howItWorks', name: 'How It Works', icon: <Puzzle size={18} /> },
    { id: 'footer', name: 'Footer', icon: <Type size={18} /> },
];

const ComponentDesigner: React.FC<ComponentDesignerProps> = ({ previewDevice }) => {
    const { customComponents, saveComponent } = useEditor();
    const [selectedComponentId, setSelectedComponentId] = useState<string>('hero');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeMobilePanel, setActiveMobilePanel] = useState<'none' | 'nav' | 'props'>('none');
    const [isSaving, setIsSaving] = useState(false);

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
                                <button key={comp.id} onClick={() => handleComponentSelect(comp.id)} className={`w-full flex items-center text-left p-2 rounded-md text-sm font-medium transition-colors ${selectedComponentId === comp.id ? 'bg-editor-accent/10 text-editor-accent' : 'text-editor-text-secondary hover:bg-editor-border hover:text-editor-text-primary'}`}>
                                <span className="mr-3 opacity-60"><Puzzle size={18} /></span>
                                {comp.name}
                            </button>
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

    const RightSidebar = () => (
        <aside className={`
            fixed xl:relative inset-y-0 right-0 z-50 xl:z-30 w-80 sm:w-[384px] bg-editor-panel-bg border-l border-editor-border flex flex-col
            transform transition-transform duration-300 ease-in-out xl:transform-none shadow-2xl xl:shadow-none
            ${activeMobilePanel === 'props' ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'}
        `}>
            <div className="p-4 border-b border-editor-border flex-shrink-0 flex justify-between items-center">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-editor-text-secondary">Properties</h3>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-editor-accent text-editor-bg px-3 py-1.5 rounded-md text-xs font-bold hover:bg-editor-accent-hover transition-colors disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save Changes
                    </button>
                    <button onClick={() => setActiveMobilePanel('none')} className="xl:hidden p-1 rounded-md hover:bg-editor-border">
                        <X size={18} />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                <ComponentControls selectedComponentId={selectedComponentId} />
            </div>
        </aside>
    );

    return (
        <>
            <CreateComponentModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onComponentCreated={(newComponent) => {
                    setSelectedComponentId(newComponent.id);
                }}
            />
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
                        <ComponentPreview selectedComponentId={selectedComponentId} previewDevice={previewDevice} />
                    </div>
                </main>

                <RightSidebar />
            </div>
        </>
    );
};

export default ComponentDesigner;
