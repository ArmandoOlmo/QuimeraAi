
import React, { useState } from 'react';
import DashboardSidebar from '../DashboardSidebar';
import ComponentLibrary from './ComponentLibrary';
import ComponentDesigner from './ComponentDesigner';
import { useEditor } from '../../../contexts/EditorContext';
import { ArrowLeft, Menu, Puzzle, Monitor, Tablet, Smartphone } from 'lucide-react';
import { PreviewDevice } from '../../../types';

interface ComponentsDashboardProps {
    onBack: () => void;
}

type ActiveTab = 'library' | 'studio';

const ComponentsDashboard: React.FC<ComponentsDashboardProps> = ({ onBack }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>('library');
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');

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
                <header className="h-[65px] bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
                    <div className="flex items-center">
                        {activeTab !== 'studio' && (
                            <button 
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="p-2 text-editor-text-secondary hover:text-editor-text-primary lg:hidden mr-2"
                                title="Open menu"
                            >
                                <Menu />
                            </button>
                        )}
                        <div className="flex items-center space-x-2">
                            <Puzzle className="text-editor-accent" />
                            <h1 className="text-xl font-bold text-editor-text-primary">Components</h1>
                        </div>
                    </div>

                    {activeTab === 'studio' && (
                        <div className="hidden sm:flex items-center justify-center space-x-2 bg-editor-panel-bg p-1 rounded-lg">
                            {deviceOptions.map(({ name, icon }) => (
                                <button
                                    key={name}
                                    title={`Preview on ${name}`}
                                    onClick={() => setPreviewDevice(name)}
                                    className={`p-2 rounded-md transition-colors ${previewDevice === name ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border'}`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    )}

                    <button 
                        onClick={onBack}
                        className="flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg transition-colors"
                    >
                        <ArrowLeft size={16} className="mr-1.5" />
                        Back to Admin
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
                    {activeTab === 'studio' && <ComponentDesigner previewDevice={previewDevice} />}
                </div>
            </div>
        </div>
    );
};

export default ComponentsDashboard;
