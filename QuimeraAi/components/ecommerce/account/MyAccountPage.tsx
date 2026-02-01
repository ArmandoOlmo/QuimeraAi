/**
 * MyAccountPage
 * Página de cuenta para usuarios autenticados de la tienda
 * Incluye: Perfil, Pedidos, Direcciones, Preferencias
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    User,
    ShoppingBag,
    MapPin,
    Settings,
    LogOut,
    ChevronRight,
    Edit2,
    Phone,
    Mail,
    Calendar,
    Award,
    ArrowLeft,
    Loader2,
} from 'lucide-react';
import { useStoreAuth } from '../context';
import OrderHistoryPage from '../OrderHistoryPage';
import { DEFAULT_ROLE_CONFIGS } from '../../../types/storeUsers';

type AccountTab = 'profile' | 'orders' | 'addresses' | 'preferences';

interface MyAccountPageProps {
    storeId: string;
    onBack?: () => void;
    onNavigateToProduct?: (productSlug: string) => void;
    primaryColor?: string;
    currencySymbol?: string;
}

const MyAccountPage: React.FC<MyAccountPageProps> = ({
    storeId,
    onBack,
    onNavigateToProduct,
    primaryColor = '#6366f1',
    currencySymbol = '$',
}) => {
    const { t } = useTranslation();
    const { user, logout, isLoading } = useStoreAuth();
    const [activeTab, setActiveTab] = useState<AccountTab>('profile');
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            if (onBack) onBack();
        } catch (error) {
            console.error('Error logging out:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="animate-spin" size={48} style={{ color: primaryColor }} />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <User className="mx-auto text-gray-300 mb-4" size={64} />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('storeAuth.notLoggedIn', 'No has iniciado sesión')}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {t('storeAuth.loginToViewAccount', 'Inicia sesión para ver tu cuenta')}
                    </p>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="px-4 py-2 rounded-lg text-white"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {t('common.goBack', 'Volver')}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const roleConfig = DEFAULT_ROLE_CONFIGS[user.role];

    const tabs = [
        { id: 'profile' as AccountTab, label: t('storeAuth.profile', 'Perfil'), icon: User },
        { id: 'orders' as AccountTab, label: t('storeAuth.orders', 'Pedidos'), icon: ShoppingBag },
        { id: 'addresses' as AccountTab, label: t('storeAuth.addresses', 'Direcciones'), icon: MapPin },
        { id: 'preferences' as AccountTab, label: t('storeAuth.preferences', 'Preferencias'), icon: Settings },
    ];

    const formatDate = (timestamp?: { seconds: number }) => {
        if (!timestamp) return '-';
        return new Date(timestamp.seconds * 1000).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <ArrowLeft size={24} />
                            </button>
                        )}
                        <div className="flex items-center gap-4 flex-1">
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.displayName}
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                            ) : (
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {user.displayName?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {user.displayName}
                                </h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-gray-500 dark:text-gray-400">{user.email}</span>
                                    {user.role !== 'customer' && (
                                        <span
                                            className="px-2 py-0.5 text-xs font-medium rounded-full text-white capitalize"
                                            style={{ backgroundColor: roleConfig?.color || primaryColor }}
                                        >
                                            {roleConfig?.name || user.role}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            {isLoggingOut ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
                            {t('storeAuth.logout', 'Cerrar Sesión')}
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-6 overflow-x-auto pb-2 -mb-2">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                        isActive
                                            ? 'text-white'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                    style={isActive ? { backgroundColor: primaryColor } : {}}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Personal Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('storeAuth.personalInfo', 'Información Personal')}
                                </h3>
                                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <Edit2 size={18} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <User className="text-gray-400" size={20} />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('storeAuth.name', 'Nombre')}
                                        </p>
                                        <p className="text-gray-900 dark:text-white">{user.displayName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="text-gray-400" size={20} />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('storeAuth.email', 'Email')}
                                        </p>
                                        <p className="text-gray-900 dark:text-white">{user.email}</p>
                                    </div>
                                </div>
                                {user.phone && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="text-gray-400" size={20} />
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {t('storeAuth.phone', 'Teléfono')}
                                            </p>
                                            <p className="text-gray-900 dark:text-white">{user.phone}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <Calendar className="text-gray-400" size={20} />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('storeAuth.memberSince', 'Miembro desde')}
                                        </p>
                                        <p className="text-gray-900 dark:text-white">{formatDate(user.createdAt)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Account Stats */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                {t('storeAuth.accountStats', 'Estadísticas de Cuenta')}
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {user.totalOrders}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('storeAuth.totalOrders', 'Pedidos')}
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {currencySymbol}{user.totalSpent.toFixed(2)}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('storeAuth.totalSpent', 'Total Gastado')}
                                    </p>
                                </div>
                            </div>

                            {/* Role Benefits */}
                            {user.role !== 'customer' && roleConfig && (
                                <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: `${roleConfig.color}10` }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Award size={20} style={{ color: roleConfig.color }} />
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {t('storeAuth.membershipBenefits', 'Beneficios de {{role}}', { role: roleConfig.name })}
                                        </span>
                                    </div>
                                    {roleConfig.discount && (
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            {roleConfig.discount.type === 'percentage'
                                                ? `${roleConfig.discount.value}% ${t('storeAuth.discountOnPurchases', 'de descuento en compras')}`
                                                : `${currencySymbol}${roleConfig.discount.value} ${t('storeAuth.discountOnPurchases', 'de descuento en compras')}`
                                            }
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <OrderHistoryPage
                        storeId={storeId}
                        customerEmail={user.email}
                        onViewProduct={onNavigateToProduct}
                        currencySymbol={currencySymbol}
                        primaryColor={primaryColor}
                    />
                )}

                {/* Addresses Tab */}
                {activeTab === 'addresses' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('storeAuth.savedAddresses', 'Direcciones Guardadas')}
                            </h3>
                            <button
                                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {t('storeAuth.addAddress', 'Agregar Dirección')}
                            </button>
                        </div>
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <MapPin className="mx-auto mb-4 text-gray-300" size={48} />
                            <p>{t('storeAuth.noAddresses', 'No tienes direcciones guardadas')}</p>
                            <p className="text-sm mt-1">
                                {t('storeAuth.addAddressHint', 'Las direcciones de tus pedidos se guardarán aquí')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                    <div className="space-y-6">
                        {/* Marketing Preferences */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                {t('storeAuth.marketingPreferences', 'Preferencias de Marketing')}
                            </h3>
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <p className="text-gray-900 dark:text-white">
                                        {t('storeAuth.receiveEmails', 'Recibir emails promocionales')}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('storeAuth.receiveEmailsHint', 'Ofertas exclusivas y novedades')}
                                    </p>
                                </div>
                                <div
                                    className={`w-12 h-6 rounded-full relative transition-colors ${
                                        user.acceptsMarketing ? '' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                    style={user.acceptsMarketing ? { backgroundColor: primaryColor } : {}}
                                >
                                    <div
                                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                            user.acceptsMarketing ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                    />
                                </div>
                            </label>
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-6">
                            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
                                {t('storeAuth.dangerZone', 'Zona de Peligro')}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                {t('storeAuth.deleteAccountWarning', 'Esta acción no se puede deshacer. Se eliminarán todos tus datos.')}
                            </p>
                            <button className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                {t('storeAuth.deleteAccount', 'Eliminar Cuenta')}
                            </button>
                        </div>

                        {/* Mobile Logout */}
                        <div className="sm:hidden">
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg"
                            >
                                {isLoggingOut ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
                                {t('storeAuth.logout', 'Cerrar Sesión')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyAccountPage;











