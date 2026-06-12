/**
 * MediaManagerView
 * Area de Medios unificada con 4 pestañas:
 * 1. Libreria Unificada (antes AdminAssets + GlobalFiles)
 * 2. Kit Visual (promovido desde toggle a pestaña)
 * 3. Archivos de Usuarios (auditoria)
 * 4. Contenido Asociado (trazabilidad bidireccional)
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Image as ImageIcon, FolderOpen, User, Menu,
    Palette, Link2,
} from 'lucide-react';
import UnifiedMediaLibrary from './UnifiedMediaLibrary';
import TenantMediaAuditor from './TenantMediaAuditor';
import ContentAssetMapper from './ContentAssetMapper';
import DashboardSidebar from '../DashboardSidebar';
import VisualIdentityKitManager from '../visual/VisualIdentityKitManager';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { ADMIN_VISUAL_KIT_PROJECT_ID } from '../../../constants/adminVisualKit';

export default function MediaManagerView({ onBack }: { onBack?: () => void }) {
    const { t } = useTranslation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [activeTab, setActiveTab] = useState<'library' | 'kit' | 'tenants' | 'content'>('library');

    const tabs = [
        {
            id: 'library' as const,
            label: t('superadmin.media.library', 'Libreria'),
            icon: <FolderOpen size={18} />,
        },
        {
            id: 'kit' as const,
            label: t('superadmin.media.kitVisual', 'Kit Visual'),
            icon: <Palette size={18} />,
        },
        {
            id: 'tenants' as const,
            label: t('superadmin.media.tenantAssets', 'Archivos de Usuarios'),
            icon: <User size={18} />,
        },
        {
            id: 'content' as const,
            label: t('superadmin.media.contentAssets', 'Contenido Asociado'),
            icon: <Link2 size={18} />,
        },
    ] as const;

    return (
        <div className="flex h-screen bg-q-bg text-q-text">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                {/* Global Header for the Media Manager */}
 <header className="quimera-dashboard-header-bar h-16 px-4 md:px-8 flex flex-col justify-center z-20 sticky top-0 flex-shrink-0">
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
                            {t('superadmin.mediaManager', 'Libreria de Medios')}
                        </h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <HeaderBackButton onClick={onBack} label="Volver" />
                        </div>
                    </div>
                </header>

                {/* Tabs */}
                <div className="px-4 md:px-8 py-4 border-b border-q-border bg-q-surface/50">
                    <div className="flex space-x-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
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
                <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
                    {activeTab === 'library' && (
                        <UnifiedMediaLibrary onBack={onBack} />
                    )}
                    {activeTab === 'kit' && (
                        <div className="h-full overflow-auto">
                            <VisualIdentityKitManager
                                projectId={ADMIN_VISUAL_KIT_PROJECT_ID}
                                kitScope="admin"
                            />
                        </div>
                    )}
                    {activeTab === 'tenants' && (
                        <TenantMediaAuditor />
                    )}
                    {activeTab === 'content' && (
                        <ContentAssetMapper />
                    )}
                </div>
            </div>
        </div>
    );
}
