
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardSidebar from '../DashboardSidebar';
import ComponentLibrary from './ComponentLibrary';
import ComponentDesigner from './ComponentDesigner';
import AdminPageHeader from './AdminPageHeader';
import { Puzzle, Monitor, Smartphone } from 'lucide-react';
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

    return (
        <div className="flex h-screen bg-q-bg text-q-text">
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                hiddenOnDesktop={activeTab === 'studio'}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <AdminPageHeader
                    title={t('superadmin.componentsTitle')}
                    icon={<Puzzle className="h-5 w-5" />}
                    onBack={onBack}
                    onMenuClick={() => setIsMobileMenuOpen(true)}
                    hideMenuButton={activeTab === 'studio'}
                    menuTitle={t('common.openMenu', 'Open menu')}
                    sticky
                    zIndexClassName="z-20"
                    centerContent={activeTab === 'studio' ? (
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
                                            : 'text-q-text-muted hover:text-foreground hover:bg-q-bg/50'
                                        }
                                    `}
                                >
                                    {icon}
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    ) : undefined}
                />

                <div className="border-b border-q-border flex-shrink-0">
                    <div className="px-4 sm:px-6">
                        <nav className="-mb-px flex space-x-6">
                            <button
                                onClick={() => setActiveTab('library')}
                                className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab === 'library' ? 'border-q-accent text-q-accent' : 'border-transparent text-q-text-secondary hover:text-q-text'}`}
                            >
                                Library
                            </button>
                            <button
                                onClick={() => setActiveTab('studio')}
                                className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab === 'studio' ? 'border-q-accent text-q-accent' : 'border-transparent text-q-text-secondary hover:text-q-text'}`}
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
