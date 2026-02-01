
import React, { useState } from 'react';
import DashboardSidebar from '../DashboardSidebar';
import ComponentLibrary from './ComponentLibrary';
import ComponentDesigner from './ComponentDesigner';
import { useEditor } from '../../../contexts/EditorContext';
import { ArrowLeft, Menu, Puzzle, Monitor, Tablet, Smartphone } from 'lucide-react';
import { PreviewDevice, PreviewOrientation } from '../../../types';

interface ComponentsDashboardProps {
    onBack: () => void;
}

type ActiveTab = 'library' | 'studio';

const ComponentsDashboard: React.FC<ComponentsDashboardProps> = ({ onBack }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>('library');
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
    const [previewOrientation, setPreviewOrientation] = useState<PreviewOrientation>('portrait');

    const deviceOptions: { name: PreviewDevice; icon: React.ReactNode }[] = [
        { name: 'desktop', icon: <Monitor /> },
        { name: 'tablet', icon: <Tablet /> },
        { name: 'mobile', icon: <Smartphone /> },
    ];

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                hiddenOnDesktop={activeTab === 'studio'}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
                    <div className="flex items-center">
                        {activeTab !== 'studio' && (
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary lg:hidden mr-2 transition-colors"
                                title="Open menu"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <Puzzle className="text-editor-accent w-5 h-5" />
                            <h1 className="text-lg font-semibold text-editor-text-primary">Components</h1>
                        </div>
                    </div>

                    {activeTab === 'studio' && (
                        <div className="hidden sm:flex items-center justify-center space-x-3">
                            <div className="flex items-center space-x-2 bg-editor-panel-bg p-1 rounded-lg">
                                {deviceOptions.map(({ name, icon }) => (
                                    <button
                                        key={name}
                                        title={`Preview on ${name}`}
                                        onClick={() => setPreviewDevice(name)}
                                        className={`p-2 transition-colors ${previewDevice === name ? 'text-editor-accent' : 'text-editor-text-secondary hover:text-editor-text-primary'}`}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-1 rounded-lg border border-editor-border/60 p-1">
                                {(['portrait', 'landscape'] as PreviewOrientation[]).map((orientation) => (
                                    <button
                                        key={orientation}
                                        onClick={() => setPreviewOrientation(orientation)}
                                        disabled={previewDevice === 'desktop'}
                                        className={`h-8 w-9 text-xs font-semibold transition-all ${previewOrientation === orientation
                                                ? 'text-editor-accent'
                                                : 'text-editor-text-secondary hover:text-editor-text-primary'
                                            } ${previewDevice === 'desktop' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        aria-label={`Preview ${orientation}`}
                                    >
                                        {orientation === 'portrait' ? 'P' : 'L'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </button>
                </header>

                <div className="border-b border-editor-border flex-shrink-0">
                    <div className="px-4 sm:px-6">
                        <nav className="-mb-px flex space-x-6">
                            <button
                                onClick={() => setActiveTab('library')}
                                className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab === 'library' ? 'border-editor-accent text-editor-accent' : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'}`}
                            >
                                Library
                            </button>
                            <button
                                onClick={() => setActiveTab('studio')}
                                className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab === 'studio' ? 'border-editor-accent text-editor-accent' : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'}`}
                            >
                                Studio
                            </button>
                        </nav>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    {activeTab === 'library' && <ComponentLibrary />}
                    {activeTab === 'studio' && <ComponentDesigner previewDevice={previewDevice} previewOrientation={previewOrientation} />}
                </div>
            </div>
        </div>
    );
};

export default ComponentsDashboard;
