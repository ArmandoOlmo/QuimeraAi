import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, FolderOpen, User, Menu } from 'lucide-react';
import AdminAssetLibrary from './AdminAssetLibrary';
import ImageLibraryManagement from './ImageLibraryManagement';
import TenantMediaAuditor from './TenantMediaAuditor';
import DashboardSidebar from '../DashboardSidebar';
import HeaderBackButton from '../../ui/HeaderBackButton';

export default function MediaManagerView({ onBack }: { onBack?: () => void }) {
    const { t } = useTranslation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Tabs configuration
    const [activeTab, setActiveTab] = useState<'platform' | 'global' | 'tenants'>('platform');

    const tabs = [
        {
            id: 'platform',
            label: t('superadmin.media.platformAssets', 'Assets de Plataforma'),
            icon: <FolderOpen size={18} />,
            component: <AdminAssetLibrary noLayout={true} onBack={onBack} />
        },
        {
            id: 'global',
            label: t('superadmin.media.globalAssets', 'Archivos Globales'),
            icon: <ImageIcon size={18} />,
            component: <ImageLibraryManagement noLayout={true} onBack={onBack} />
        },
        {
            id: 'tenants',
            label: t('superadmin.media.tenantAssets', 'Archivos de Usuarios'),
            icon: <User size={18} />,
            component: <TenantMediaAuditor />
        }
    ] as const;

    return (
        <div className="flex h-screen bg-q-bg text-q-text">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Global Header for the Media Manager */}
                <header className="h-16 px-4 md:px-8 border-b border-q-border flex flex-col justify-center bg-q-bg z-20 sticky top-0 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="lg:hidden text-q-text-secondary hover:text-q-text"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <ImageIcon className="text-q-accent w-6 h-6 hidden sm:block" />
                            <h1 className="text-xl font-bold text-q-text">
                                {t('superadmin.mediaManager', 'Librería de Medios')}
                            </h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <HeaderBackButton onClick={onBack} label={t('common.back', 'Volver')} />
                        </div>
                    </div>
                </header>

                {/* Sub-header with Quimera Style Tabs */}
                <div className="px-4 md:px-8 py-4 border-b border-q-border bg-q-surface/50">
                    <div className="flex space-x-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                                    ${activeTab === tab.id 
                                        ? 'bg-q-accent/20 text-q-accent border border-q-accent/30 shadow-sm shadow-q-accent/10' 
                                        : 'bg-q-surface text-q-text-secondary border border-q-border hover:bg-q-surface-overlay hover:text-q-text'}
                                `}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden relative bg-q-bg">
                    {tabs.find(t => t.id === activeTab)?.component}
                </div>
            </div>
        </div>
    );
}
