/**
 * MyAccountPage
 * Página de cuenta para usuarios autenticados de la tienda
 * Incluye: Perfil, Pedidos, Direcciones, Preferencias
 */

import React, { useEffect, useState } from 'react';
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
    Plus,
    Save,
    Trash2,
} from 'lucide-react';
import { useStoreAuth } from '../context';
import type { Address, StoredTimestamp } from '../../../types/ecommerce';
import { timestampToDate } from '../../../utils/timestampUtils';
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

const emptyAddressForm: Address = {
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phone: '',
};

const MyAccountPage: React.FC<MyAccountPageProps> = ({
    storeId,
    onBack,
    onNavigateToProduct,
    primaryColor = '#6366f1',
    currencySymbol = '$',
}) => {
    const { t } = useTranslation();
    const { user, logout, updateProfile, deleteAccount, isLoading } = useStoreAuth();
    const [activeTab, setActiveTab] = useState<AccountTab>('profile');
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPreferences, setIsSavingPreferences] = useState(false);
    const [isAddingAddress, setIsAddingAddress] = useState(false);
    const [isSavingAddress, setIsSavingAddress] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [profileForm, setProfileForm] = useState({
        displayName: '',
        firstName: '',
        lastName: '',
        phone: '',
    });
    const [addressForm, setAddressForm] = useState<Address>(emptyAddressForm);

    useEffect(() => {
        if (!user) return;
        setProfileForm({
            displayName: user.displayName || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || '',
        });
        setAddressForm({
            ...emptyAddressForm,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || '',
        });
    }, [user]);

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

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsSavingProfile(true);
        setSaveError(null);

        try {
            const displayName = profileForm.displayName.trim() ||
                [profileForm.firstName, profileForm.lastName].filter(Boolean).join(' ') ||
                user.email;

            await updateProfile({
                displayName,
                firstName: profileForm.firstName.trim(),
                lastName: profileForm.lastName.trim(),
                phone: profileForm.phone.trim(),
            });
            setIsEditingProfile(false);
        } catch (error: any) {
            setSaveError(error.message || 'No se pudo guardar el perfil');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleToggleMarketing = async () => {
        if (!user) return;
        setIsSavingPreferences(true);
        setSaveError(null);

        try {
            await updateProfile({ acceptsMarketing: !user.acceptsMarketing });
        } catch (error: any) {
            setSaveError(error.message || 'No se pudo actualizar la preferencia');
        } finally {
            setIsSavingPreferences(false);
        }
    };

    const handleAddAddress = async () => {
        if (!user) return;
        if (!addressForm.address1.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.zipCode.trim()) {
            setSaveError('Completa dirección, ciudad, estado y código postal.');
            return;
        }

        setIsSavingAddress(true);
        setSaveError(null);

        try {
            const nextAddress: Address = {
                ...addressForm,
                firstName: addressForm.firstName.trim() || user.firstName || user.displayName || 'Customer',
                lastName: addressForm.lastName.trim() || user.lastName || '',
                address1: addressForm.address1.trim(),
                address2: addressForm.address2?.trim() || undefined,
                city: addressForm.city.trim(),
                state: addressForm.state.trim(),
                zipCode: addressForm.zipCode.trim(),
                country: addressForm.country.trim() || 'US',
                phone: addressForm.phone?.trim() || user.phone,
            };
            const nextAddresses = [...(user.addresses || []), nextAddress];

            await updateProfile({
                addresses: nextAddresses,
                defaultShippingAddress: user.defaultShippingAddress || nextAddress,
                defaultBillingAddress: user.defaultBillingAddress || nextAddress,
            });
            setAddressForm({
                ...emptyAddressForm,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
            });
            setIsAddingAddress(false);
        } catch (error: any) {
            setSaveError(error.message || 'No se pudo guardar la dirección');
        } finally {
            setIsSavingAddress(false);
        }
    };

    const handleRemoveAddress = async (index: number) => {
        if (!user) return;
        setIsSavingAddress(true);
        setSaveError(null);

        try {
            const nextAddresses = (user.addresses || []).filter((_, itemIndex) => itemIndex !== index);
            await updateProfile({
                addresses: nextAddresses,
                defaultShippingAddress: nextAddresses[0],
                defaultBillingAddress: nextAddresses[0],
            });
        } catch (error: any) {
            setSaveError(error.message || 'No se pudo eliminar la dirección');
        } finally {
            setIsSavingAddress(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;
        const confirmed = window.confirm(t('storeAuth.deleteAccountConfirm', '¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.'));
        if (!confirmed) return;

        setIsDeletingAccount(true);
        setSaveError(null);

        try {
            await deleteAccount();
            if (onBack) onBack();
        } catch (error: any) {
            setSaveError(error.message || 'No se pudo eliminar la cuenta');
            setIsDeletingAccount(false);
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

    const formatDate = (timestamp?: StoredTimestamp) => {
        if (!timestamp) return '-';
        return timestampToDate(timestamp).toLocaleDateString('es-MX', {
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
                {saveError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                        {saveError}
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Personal Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {t('storeAuth.personalInfo', 'Información Personal')}
                                </h3>
                                {!isEditingProfile && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingProfile(true)}
                                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                )}
                            </div>
                            {isEditingProfile ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">
                                            {t('storeAuth.name', 'Nombre')}
                                        </label>
                                        <input
                                            type="text"
                                            value={profileForm.displayName}
                                            onChange={(event) => setProfileForm(prev => ({ ...prev, displayName: event.target.value }))}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                        />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">
                                                {t('storeAuth.firstName', 'Nombre')}
                                            </label>
                                            <input
                                                type="text"
                                                value={profileForm.firstName}
                                                onChange={(event) => setProfileForm(prev => ({ ...prev, firstName: event.target.value }))}
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">
                                                {t('storeAuth.lastName', 'Apellido')}
                                            </label>
                                            <input
                                                type="text"
                                                value={profileForm.lastName}
                                                onChange={(event) => setProfileForm(prev => ({ ...prev, lastName: event.target.value }))}
                                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">
                                            {t('storeAuth.phone', 'Teléfono')}
                                        </label>
                                        <input
                                            type="tel"
                                            value={profileForm.phone}
                                            onChange={(event) => setProfileForm(prev => ({ ...prev, phone: event.target.value }))}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingProfile(false)}
                                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                        >
                                            {t('common.cancel', 'Cancelar')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveProfile}
                                            disabled={isSavingProfile}
                                            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {isSavingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                            {t('common.save', 'Guardar')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
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
                            )}
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
                                type="button"
                                onClick={() => setIsAddingAddress(true)}
                                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Plus size={16} className="mr-2 inline" />
                                {t('storeAuth.addAddress', 'Agregar Dirección')}
                            </button>
                        </div>

                        {isAddingAddress && (
                            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <input
                                        type="text"
                                        value={addressForm.firstName}
                                        onChange={(event) => setAddressForm(prev => ({ ...prev, firstName: event.target.value }))}
                                        placeholder={t('storeAuth.firstName', 'Nombre')}
                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        value={addressForm.lastName}
                                        onChange={(event) => setAddressForm(prev => ({ ...prev, lastName: event.target.value }))}
                                        placeholder={t('storeAuth.lastName', 'Apellido')}
                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        value={addressForm.address1}
                                        onChange={(event) => setAddressForm(prev => ({ ...prev, address1: event.target.value }))}
                                        placeholder={t('storeAuth.addressLine1', 'Dirección')}
                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:col-span-2"
                                    />
                                    <input
                                        type="text"
                                        value={addressForm.address2 || ''}
                                        onChange={(event) => setAddressForm(prev => ({ ...prev, address2: event.target.value }))}
                                        placeholder={t('storeAuth.addressLine2', 'Apartamento, suite, etc.')}
                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:col-span-2"
                                    />
                                    <input
                                        type="text"
                                        value={addressForm.city}
                                        onChange={(event) => setAddressForm(prev => ({ ...prev, city: event.target.value }))}
                                        placeholder={t('storeAuth.city', 'Ciudad')}
                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        value={addressForm.state}
                                        onChange={(event) => setAddressForm(prev => ({ ...prev, state: event.target.value }))}
                                        placeholder={t('storeAuth.state', 'Estado')}
                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        value={addressForm.zipCode}
                                        onChange={(event) => setAddressForm(prev => ({ ...prev, zipCode: event.target.value }))}
                                        placeholder={t('storeAuth.zipCode', 'Código postal')}
                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        value={addressForm.country}
                                        onChange={(event) => setAddressForm(prev => ({ ...prev, country: event.target.value }))}
                                        placeholder={t('storeAuth.country', 'País')}
                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                    />
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingAddress(false)}
                                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                    >
                                        {t('common.cancel', 'Cancelar')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAddAddress}
                                        disabled={isSavingAddress}
                                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {isSavingAddress ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        {t('common.save', 'Guardar')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {(user.addresses || []).length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                {(user.addresses || []).map((address, index) => (
                                    <div
                                        key={`${address.address1}-${address.zipCode}-${index}`}
                                        className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                                    >
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <MapPin className="mt-0.5 text-gray-400" size={20} />
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {[address.firstName, address.lastName].filter(Boolean).join(' ') || user.displayName}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300">{address.address1}</p>
                                                    {address.address2 && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-300">{address.address2}</p>
                                                    )}
                                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                                        {[address.city, address.state, address.zipCode].filter(Boolean).join(', ')}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300">{address.country}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAddress(index)}
                                                disabled={isSavingAddress}
                                                className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <MapPin className="mx-auto mb-4 text-gray-300" size={48} />
                                <p>{t('storeAuth.noAddresses', 'No tienes direcciones guardadas')}</p>
                                <p className="text-sm mt-1">
                                    {t('storeAuth.addAddressHint', 'Las direcciones de tus pedidos se guardarán aquí')}
                                </p>
                            </div>
                        )}
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
                            <button
                                type="button"
                                onClick={handleToggleMarketing}
                                disabled={isSavingPreferences}
                                className="flex w-full items-center justify-between gap-4 text-left disabled:opacity-60"
                            >
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
                            </button>
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 p-6">
                            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
                                {t('storeAuth.dangerZone', 'Zona de Peligro')}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                {t('storeAuth.deleteAccountWarning', 'Esta acción no se puede deshacer. Se eliminarán todos tus datos.')}
                            </p>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={isDeletingAccount}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-900/20"
                            >
                                {isDeletingAccount && <Loader2 className="animate-spin" size={16} />}
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





