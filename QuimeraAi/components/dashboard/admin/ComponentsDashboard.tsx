
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardSidebar from '../DashboardSidebar';
import ComponentLibrary from './ComponentLibrary';
import ComponentDesigner from './ComponentDesigner';
import { ArrowLeft, Menu, Puzzle, Monitor, Tablet, Smartphone } from 'lucide-react';
import { PreviewDevice, PreviewOrientation } from '../../../types';

interface ComponentsDashboardProps {
    onBack: () => void;
}

type ActiveTab = 'library' | 'studio';

const ComponentsDashboard: React.FC<ComponentsDashboardProps> = ({ onBack }) => {
    const { t } = useTranslation();
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
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 relative">
                    <div className="flex items-center">
                        {activeTab !== 'studio' && (
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary lg:hidden mr-2 transition-colors"
                                title={t('common.openMenu', 'Open menu')}
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <Puzzle className="text-editor-accent w-5 h-5" />
                            <h1 className="text-lg font-semibold text-editor-text-primary">{t('superadmin.componentsTitle')}</h1>
                        </div>
                    </div>

                    {activeTab === 'studio' && (
                        <div className="hidden sm:flex items-center absolute left-1/2 -translate-x-1/2">
                            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
                                {([
                                    { name: 'desktop' as PreviewDevice, icon: <Monitor size={16} />, label: 'Desktop' },
                                    { name: 'mobile' as PreviewDevice, icon: <Smartphone size={16} />, label: 'Mobile' },
                                ]).map(({ name, icon, label }) => (
                                    <button
                                        key={name}
                                        title={`Preview on ${name}`}
                                        onClick={() => setPreviewDevice(name)}
                                        className={`
                                            flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                                            ${previewDevice === name
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                            }
                                        `}
                                    >
                                        {icon}
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('common.back', 'Volver')}
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
