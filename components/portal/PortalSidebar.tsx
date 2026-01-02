/**
 * PortalSidebar
 * Sidebar navigation for white-label client portals
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePortal } from './PortalContext';
import { useRouter } from '../../hooks/useRouter';
import {
    LayoutDashboard,
    Globe,
    FileText,
    Users,
    ShoppingBag,
    MessageSquare,
    BarChart3,
    Settings,
    X,
    Folder,
} from 'lucide-react';
import { TenantFeature } from '../../types/multiTenant';

interface PortalSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NavItem {
    id: string;
    icon: React.ElementType;
    label: string;
    path: string;
    feature?: TenantFeature;
    permission?: string;
}

const PortalSidebar: React.FC<PortalSidebarProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { portalConfig, theme, hasFeature, hasPermission } = usePortal();
    const { navigate, path } = useRouter();

    // Navigation items based on enabled features
    const navItems: NavItem[] = [
        {
            id: 'dashboard',
            icon: LayoutDashboard,
            label: t('portal.dashboard', 'Dashboard'),
            path: '/portal',
        },
        {
            id: 'projects',
            icon: Globe,
            label: t('portal.projects', 'Mis Proyectos'),
            path: '/portal/projects',
            feature: 'projects',
        },
        {
            id: 'cms',
            icon: FileText,
            label: t('portal.cms', 'Contenido'),
            path: '/portal/cms',
            feature: 'cms',
        },
        {
            id: 'leads',
            icon: Users,
            label: t('portal.leads', 'Leads'),
            path: '/portal/leads',
            feature: 'leads',
        },
        {
            id: 'ecommerce',
            icon: ShoppingBag,
            label: t('portal.ecommerce', 'E-commerce'),
            path: '/portal/ecommerce',
            feature: 'ecommerce',
        },
        {
            id: 'chat',
            icon: MessageSquare,
            label: t('portal.chat', 'Chat'),
            path: '/portal/chat',
            feature: 'chat',
        },
        {
            id: 'files',
            icon: Folder,
            label: t('portal.files', 'Archivos'),
            path: '/portal/files',
        },
        {
            id: 'analytics',
            icon: BarChart3,
            label: t('portal.analytics', 'Analytics'),
            path: '/portal/analytics',
            feature: 'analytics',
        },
    ];

    // Filter nav items based on enabled features
    const visibleNavItems = navItems.filter(item => {
        if (item.feature && !hasFeature(item.feature)) {
            return false;
        }
        if (item.permission && !hasPermission(item.permission as any)) {
            return false;
        }
        return true;
    });

    const handleNavClick = (itemPath: string) => {
        navigate(itemPath);
        onClose();
    };

    const isActive = (itemPath: string) => {
        if (itemPath === '/portal') {
            return path === '/portal' || path === '/portal/';
        }
        return path.startsWith(itemPath);
    };

    return (
        <>
            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border
                    transform transition-transform duration-300 ease-in-out
                    lg:translate-x-0
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        {theme.logoUrl ? (
                            <img
                                src={theme.logoUrl}
                                alt={theme.companyName}
                                className="h-8 w-auto object-contain"
                            />
                        ) : (
                            <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: theme.primaryColor }}
                            >
                                {theme.companyName?.[0]?.toUpperCase() || 'P'}
                            </div>
                        )}
                        <span className="font-bold text-foreground">
                            {theme.companyName}
                        </span>
                    </div>

                    {/* Mobile close button */}
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.path)}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                                    transition-all duration-200
                                    ${active
                                        ? 'text-white font-medium shadow-lg'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                                    }
                                `}
                                style={active ? { backgroundColor: theme.primaryColor } : undefined}
                            >
                                <Icon size={20} />
                                <span className="text-sm">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Settings at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
                    <button
                        onClick={() => handleNavClick('/portal/settings')}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                            transition-all duration-200
                            ${isActive('/portal/settings')
                                ? 'text-white font-medium shadow-lg'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                            }
                        `}
                        style={isActive('/portal/settings') ? { backgroundColor: theme.primaryColor } : undefined}
                    >
                        <Settings size={20} />
                        <span className="text-sm">{t('common.settings', 'Configuración')}</span>
                    </button>

                    {/* Tenant info */}
                    <div className="mt-4 px-3 py-2 bg-secondary/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                            {t('portal.workspace', 'Workspace')}
                        </p>
                        <p className="text-sm font-medium text-foreground truncate">
                            {portalConfig?.tenant.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                            {portalConfig?.tenant.subscriptionPlan} plan
                        </p>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default PortalSidebar;






