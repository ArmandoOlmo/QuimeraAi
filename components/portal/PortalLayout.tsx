/**
 * PortalLayout
 * Main layout wrapper for white-label client portals
 */

import React, { useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortal } from './PortalContext';
import PortalSidebar from './PortalSidebar';
import { Menu, Bell, User, LogOut, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/core/AuthContext';
import { auth, signOut } from '../../firebase';
import { useRouter } from '../../hooks/useRouter';

interface PortalLayoutProps {
    children: ReactNode;
}

const PortalLayout: React.FC<PortalLayoutProps> = ({ children }) => {
    const { t } = useTranslation();
    const { portalConfig, theme, isLoadingPortal, error } = usePortal();
    const { user, userDocument } = useAuth();
    const { navigate } = useRouter();
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut(auth);
        navigate('/login');
    };

    // Loading state
    if (isLoadingPortal) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={40} className="animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('common.loading', 'Cargando...')}</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !portalConfig) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center p-8">
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        {t('portal.error', 'Error')}
                    </h1>
                    <p className="text-muted-foreground">
                        {error || t('portal.notFound', 'Portal no encontrado')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="min-h-screen bg-background"
            style={{
                '--primary': theme.primaryColor,
                '--portal-primary': theme.primaryColor,
                '--portal-secondary': theme.secondaryColor,
            } as React.CSSProperties}
        >
            {/* Mobile menu overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <PortalSidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main content area */}
            <div className="lg:pl-64">
                {/* Top header */}
                <header className="sticky top-0 z-30 h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6">
                    {/* Left side */}
                    <div className="flex items-center gap-4">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                            <Menu size={24} />
                        </button>

                        {/* Page title - can be passed via context or props */}
                        <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                            {portalConfig.branding.companyName || portalConfig.tenant.name}
                        </h1>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        {/* Notifications */}
                        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative">
                            <Bell size={20} />
                            {/* Notification badge */}
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                        </button>

                        {/* User menu */}
                        <div className="relative">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary transition-colors"
                            >
                                {user?.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt="User"
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User size={18} className="text-primary" />
                                    </div>
                                )}
                                <span className="hidden sm:block text-sm font-medium text-foreground">
                                    {userDocument?.name || user?.email?.split('@')[0]}
                                </span>
                            </button>

                            {/* User dropdown */}
                            {isUserMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsUserMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 z-20 w-56 bg-popover border border-border rounded-xl shadow-xl py-1">
                                        <div className="px-4 py-3 border-b border-border">
                                            <p className="text-sm font-medium text-foreground">
                                                {userDocument?.name || 'Usuario'}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user?.email}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setIsUserMenuOpen(false);
                                                navigate('/portal/settings');
                                            }}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                                        >
                                            <Settings size={16} className="text-muted-foreground" />
                                            {t('common.settings', 'Configuración')}
                                        </button>
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                        >
                                            <LogOut size={16} />
                                            {t('auth.logout', 'Cerrar sesión')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-6">
                    {children}
                </main>

                {/* Footer */}
                {theme.footerText && (
                    <footer className="px-4 lg:px-6 py-4 text-center text-sm text-muted-foreground border-t border-border">
                        {theme.footerText}
                    </footer>
                )}
            </div>
        </div>
    );
};

export default PortalLayout;






