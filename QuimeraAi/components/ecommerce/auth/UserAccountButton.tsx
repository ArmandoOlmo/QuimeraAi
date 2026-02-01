/**
 * UserAccountButton
 * Botón de cuenta de usuario para el header del storefront
 * Muestra estado de login/logout y menú de opciones
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    User,
    LogOut,
    ChevronDown,
    ShoppingBag,
    Heart,
    Settings,
    UserCircle,
} from 'lucide-react';
import { useStoreAuthOptional } from '../context';
import StoreAuthModal from './StoreAuthModal';

interface UserAccountButtonProps {
    primaryColor?: string;
    storeName?: string;
    logoUrl?: string;
    onNavigateToAccount?: () => void;
    onNavigateToOrders?: () => void;
    onNavigateToWishlist?: () => void;
    variant?: 'icon' | 'text' | 'full';
    className?: string;
}

const UserAccountButton: React.FC<UserAccountButtonProps> = ({
    primaryColor = '#6366f1',
    storeName = 'Tienda',
    logoUrl,
    onNavigateToAccount,
    onNavigateToOrders,
    onNavigateToWishlist,
    variant = 'icon',
    className = '',
}) => {
    const { t } = useTranslation();
    const auth = useStoreAuthOptional();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle logout
    const handleLogout = async () => {
        if (auth) {
            await auth.logout();
            setIsMenuOpen(false);
        }
    };

    // If auth context is not available, show simple login button
    if (!auth) {
        return (
            <>
                <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
                >
                    <User size={20} className="text-gray-600 dark:text-gray-300" />
                    {variant !== 'icon' && (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {t('storeAuth.login', 'Iniciar Sesión')}
                        </span>
                    )}
                </button>
                <StoreAuthModal
                    isOpen={isAuthModalOpen}
                    onClose={() => setIsAuthModalOpen(false)}
                    primaryColor={primaryColor}
                    storeName={storeName}
                    logoUrl={logoUrl}
                />
            </>
        );
    }

    const { user, isAuthenticated, isLoading } = auth;

    // Loading state
    if (isLoading) {
        return (
            <div className={`flex items-center gap-2 px-3 py-2 ${className}`}>
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
        );
    }

    // Not authenticated
    if (!isAuthenticated || !user) {
        return (
            <>
                <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
                >
                    <User size={20} className="text-gray-600 dark:text-gray-300" />
                    {variant !== 'icon' && (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {t('storeAuth.login', 'Iniciar Sesión')}
                        </span>
                    )}
                </button>
                <StoreAuthModal
                    isOpen={isAuthModalOpen}
                    onClose={() => setIsAuthModalOpen(false)}
                    primaryColor={primaryColor}
                    storeName={storeName}
                    logoUrl={logoUrl}
                />
            </>
        );
    }

    // Authenticated - show user menu
    return (
        <div ref={menuRef} className={`relative ${className}`}>
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
                {user.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                ) : (
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </div>
                )}
                {variant === 'full' && (
                    <>
                        <div className="text-left hidden sm:block">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
                                {user.displayName || user.email}
                            </p>
                            {user.role && user.role !== 'customer' && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                    {user.role}
                                </p>
                            )}
                        </div>
                        <ChevronDown
                            size={16}
                            className={`text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                        />
                    </>
                )}
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.displayName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                        </p>
                        {user.role && user.role !== 'customer' && (
                            <span
                                className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full text-white capitalize"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {user.role}
                            </span>
                        )}
                    </div>

                    {/* Menu items */}
                    <div className="py-2">
                        {onNavigateToAccount && (
                            <button
                                onClick={() => {
                                    onNavigateToAccount();
                                    setIsMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <UserCircle size={18} className="text-gray-400" />
                                {t('storeAuth.myAccount', 'Mi Cuenta')}
                            </button>
                        )}

                        {onNavigateToOrders && (
                            <button
                                onClick={() => {
                                    onNavigateToOrders();
                                    setIsMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <ShoppingBag size={18} className="text-gray-400" />
                                {t('storeAuth.myOrders', 'Mis Pedidos')}
                            </button>
                        )}

                        {onNavigateToWishlist && (
                            <button
                                onClick={() => {
                                    onNavigateToWishlist();
                                    setIsMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Heart size={18} className="text-gray-400" />
                                {t('storeAuth.wishlist', 'Lista de Deseos')}
                            </button>
                        )}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-200 dark:border-gray-700 py-2">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <LogOut size={18} />
                            {t('storeAuth.logout', 'Cerrar Sesión')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserAccountButton;











