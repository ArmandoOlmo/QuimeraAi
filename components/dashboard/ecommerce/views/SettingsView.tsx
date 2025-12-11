/**
 * SettingsView
 * Vista de configuración de la tienda
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Settings,
    Store,
    CreditCard,
    Truck,
    Mail,
    DollarSign,
    Save,
    Plus,
    Trash2,
    Loader2,
    Check,
    Globe,
    Bell,
    Package,
    Send,
    Palette,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
    Clock,
    Unlink,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { StoreSettings, ShippingZone } from '../../../../types/ecommerce';
import { useEcommerceTheme, withOpacity } from '../hooks/useEcommerceTheme';
import { useEcommerceContext } from '../EcommerceDashboard';
import { useStripeConnect } from '../hooks/useStripeConnect';
import { useEmailSettings } from '../../../../hooks/useEmailSettings';
import { TransactionalEmailSettings, EmailSocialLinks } from '../../../../types/email';

type SettingsTab = 'general' | 'payment' | 'shipping' | 'notifications' | 'email';

const SettingsView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const theme = useEcommerceTheme();
    const { 
        settings, 
        isLoading, 
        isSaving, 
        updateSettings, 
        addShippingZone, 
        updatePaymentSettings,
    } = useStoreSettings(user?.uid || '', storeId);

    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [localSettings, setLocalSettings] = useState<Partial<StoreSettings>>({});
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    const handleSave = async () => {
        await updateSettings(localSettings);
        setHasChanges(false);
    };

    const handleChange = (field: keyof StoreSettings, value: any) => {
        setLocalSettings((prev) => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
        { id: 'general', label: t('ecommerce.general', 'General'), icon: Store },
        { id: 'payment', label: t('ecommerce.payment', 'Pagos'), icon: CreditCard },
        { id: 'shipping', label: t('ecommerce.shipping', 'Envío'), icon: Truck },
        { id: 'notifications', label: t('ecommerce.notifications', 'Notificaciones'), icon: Bell },
        { id: 'email', label: t('ecommerce.email', 'Email'), icon: Mail },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin" style={{ color: theme.primary }} size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">
                        {t('ecommerce.settings', 'Configuración')}
                    </h2>
                    <p className="text-muted-foreground">
                        {t('ecommerce.settingsSubtitle', 'Configura tu tienda')}
                    </p>
                </div>

                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 disabled:opacity-50 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90"
                    >
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        {t('common.saveChanges', 'Guardar Cambios')}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-card/50 text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="bg-card/50 rounded-xl border border-border p-6">
                {activeTab === 'general' && (
                    <GeneralSettings
                        settings={localSettings}
                        onChange={handleChange}
                    />
                )}
                {activeTab === 'payment' && (
                    <PaymentSettings
                        settings={localSettings}
                        onChange={handleChange}
                        onSavePayment={updatePaymentSettings}
                        userId={user?.uid || ''}
                        storeId={storeId}
                    />
                )}
                {activeTab === 'shipping' && (
                    <ShippingSettings
                        settings={localSettings}
                        onChange={handleChange}
                        onAddZone={addShippingZone}
                    />
                )}
                {activeTab === 'notifications' && (
                    <NotificationSettings
                        settings={localSettings}
                        onChange={handleChange}
                    />
                )}
                {activeTab === 'email' && (
                    <EmailSettingsSection
                        userId={user?.uid || ''}
                        storeId={storeId}
                    />
                )}
            </div>
        </div>
    );
};

// General Settings Component
interface SettingsSectionProps {
    settings: Partial<StoreSettings>;
    onChange: (field: keyof StoreSettings, value: any) => void;
}

const GeneralSettings: React.FC<SettingsSectionProps> = ({ settings, onChange }) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">
                {t('ecommerce.generalSettings', 'Configuración General')}
            </h3>

            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                        {t('ecommerce.storeName', 'Nombre de la Tienda')}
                    </label>
                    <input
                        type="text"
                        value={settings.storeName || ''}
                        onChange={(e) => onChange('storeName', e.target.value)}
                        className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                        {t('ecommerce.storeEmail', 'Email de la Tienda')}
                    </label>
                    <input
                        type="email"
                        value={settings.storeEmail || ''}
                        onChange={(e) => onChange('storeEmail', e.target.value)}
                        className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                        {t('ecommerce.currency', 'Moneda')}
                    </label>
                    <select
                        value={settings.currency || 'USD'}
                        onChange={(e) => onChange('currency', e.target.value)}
                        className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="USD">USD - Dólar Estadounidense</option>
                        <option value="MXN">MXN - Peso Mexicano</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - Libra Esterlina</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                        {t('ecommerce.currencySymbol', 'Símbolo de Moneda')}
                    </label>
                    <input
                        type="text"
                        value={settings.currencySymbol || '$'}
                        onChange={(e) => onChange('currencySymbol', e.target.value)}
                        className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
            </div>

            <div className="border-t border-border pt-6">
                <h4 className="text-md font-medium text-foreground mb-4">
                    {t('ecommerce.taxSettings', 'Configuración de Impuestos')}
                </h4>

                <div className="flex items-center gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.taxEnabled || false}
                            onChange={(e) => onChange('taxEnabled', e.target.checked)}
                            className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-ring"
                        />
                        <span className="text-muted-foreground">{t('ecommerce.enableTax', 'Habilitar impuestos')}</span>
                    </label>
                </div>

                {settings.taxEnabled && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                                {t('ecommerce.taxRate', 'Tasa de Impuesto (%)')}
                            </label>
                            <input
                                type="number"
                                value={settings.taxRate || 0}
                                onChange={(e) => onChange('taxRate', parseFloat(e.target.value) || 0)}
                                min="0"
                                max="100"
                                step="0.01"
                                className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                                {t('ecommerce.taxName', 'Nombre del Impuesto')}
                            </label>
                            <input
                                type="text"
                                value={settings.taxName || 'IVA'}
                                onChange={(e) => onChange('taxName', e.target.value)}
                                className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.taxIncludedInPrice || false}
                                onChange={(e) => onChange('taxIncludedInPrice', e.target.checked)}
                                className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-ring"
                            />
                            <span className="text-muted-foreground">
                                {t('ecommerce.taxIncluded', 'Precios incluyen impuesto')}
                            </span>
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
};

// Payment Settings Component
interface PaymentSettingsProps extends SettingsSectionProps {
    onSavePayment: (settings: any) => Promise<void>;
    userId: string;
    storeId: string;
}

const PaymentSettings: React.FC<PaymentSettingsProps> = ({ settings, onChange, userId, storeId }) => {
    const { t } = useTranslation();
    const theme = useEcommerceTheme();
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
    const [connectEmail, setConnectEmail] = useState('');
    const [connectBusinessName, setConnectBusinessName] = useState('');
    const [showConnectForm, setShowConnectForm] = useState(false);

    const {
        isLoading: connectLoading,
        error: connectError,
        connectStatus,
        isConnected,
        isActive,
        canAcceptPayments,
        startOnboarding,
        openDashboard,
        disconnectAccount,
        refreshAccountStatus,
    } = useStripeConnect(userId, storeId);

    // Handle starting the Connect onboarding
    const handleStartConnect = async () => {
        if (!connectEmail || !connectBusinessName) return;
        
        const success = await startOnboarding(connectEmail, connectBusinessName);
        if (success) {
            setShowConnectForm(false);
            setConnectEmail('');
            setConnectBusinessName('');
        }
    };

    // Handle disconnect
    const handleDisconnect = async () => {
        await disconnectAccount();
        setShowDisconnectConfirm(false);
    };

    // Get status badge
    const getStatusBadge = () => {
        if (!isConnected) return null;
        
        if (isActive && canAcceptPayments) {
            return (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                    <CheckCircle2 size={12} />
                    Activo
                </span>
            );
        } else if (connectStatus?.detailsSubmitted) {
            return (
                <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
                    <AlertCircle size={12} />
                    Restringido
                </span>
            );
        } else {
            return (
                <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                    <Clock size={12} />
                    Pendiente
                </span>
            );
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">
                {t('ecommerce.paymentSettings', 'Métodos de Pago')}
            </h3>

            {/* Stripe Connect - Main Payment Method */}
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <CreditCard className="text-purple-400" size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-foreground font-medium">Stripe Connect</h4>
                                {getStatusBadge()}
                            </div>
                            <p className="text-muted-foreground text-sm">
                                {t('ecommerce.stripeConnectDesc', 'Recibe pagos directamente en tu cuenta de Stripe')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Connect Status & Actions */}
                <div className="mt-4 pt-4 border-t border-border/50">
                    {connectError && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-red-400 text-sm">{connectError}</p>
                        </div>
                    )}

                    {!isConnected ? (
                        // Not connected - Show connect button or form
                        <div className="space-y-4">
                            <p className="text-muted-foreground text-sm">
                                Conecta tu cuenta de Stripe para empezar a recibir pagos. 
                                El proceso es guiado y solo toma unos minutos.
                            </p>

                            {!showConnectForm ? (
                                <button
                                    onClick={() => setShowConnectForm(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                                >
                                    <CreditCard size={18} />
                                    Conectar con Stripe
                                </button>
                            ) : (
                                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Email de tu negocio
                                        </label>
                                        <input
                                            type="email"
                                            value={connectEmail}
                                            onChange={(e) => setConnectEmail(e.target.value)}
                                            placeholder="negocio@ejemplo.com"
                                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Nombre de tu tienda
                                        </label>
                                        <input
                                            type="text"
                                            value={connectBusinessName}
                                            onChange={(e) => setConnectBusinessName(e.target.value)}
                                            placeholder="Mi Tienda Online"
                                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleStartConnect}
                                            disabled={connectLoading || !connectEmail || !connectBusinessName}
                                            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {connectLoading ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <ExternalLink size={18} />
                                            )}
                                            Iniciar configuración
                                        </button>
                                        <button
                                            onClick={() => setShowConnectForm(false)}
                                            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Se abrirá una nueva pestaña con el proceso guiado de Stripe.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Connected - Show status and actions
                        <div className="space-y-4">
                            {/* Account Info */}
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div>
                                    <p className="text-sm text-muted-foreground">ID de cuenta</p>
                                    <p className="text-foreground font-mono text-sm">
                                        {connectStatus?.accountId}
                                    </p>
                                </div>
                                <button
                                    onClick={refreshAccountStatus}
                                    disabled={connectLoading}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    title="Actualizar estado"
                                >
                                    <Loader2 
                                        size={16} 
                                        className={connectLoading ? 'animate-spin text-primary' : 'text-muted-foreground'} 
                                    />
                                </button>
                            </div>

                            {/* Capabilities */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className={`p-3 rounded-lg ${canAcceptPayments ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                                    <div className="flex items-center gap-2">
                                        {canAcceptPayments ? (
                                            <CheckCircle2 size={16} className="text-green-400" />
                                        ) : (
                                            <AlertCircle size={16} className="text-yellow-400" />
                                        )}
                                        <span className="text-sm font-medium text-foreground">
                                            Recibir pagos
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {canAcceptPayments ? 'Habilitado' : 'Pendiente de verificación'}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-lg ${connectStatus?.payoutsEnabled ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                                    <div className="flex items-center gap-2">
                                        {connectStatus?.payoutsEnabled ? (
                                            <CheckCircle2 size={16} className="text-green-400" />
                                        ) : (
                                            <AlertCircle size={16} className="text-yellow-400" />
                                        )}
                                        <span className="text-sm font-medium text-foreground">
                                            Transferencias
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {connectStatus?.payoutsEnabled ? 'Habilitado' : 'Pendiente de verificación'}
                                    </p>
                                </div>
                            </div>

                            {/* Pending requirements warning */}
                            {connectStatus?.requirements?.currentlyDue && connectStatus.requirements.currentlyDue.length > 0 && (
                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle size={16} className="text-yellow-400" />
                                        <span className="text-sm font-medium text-yellow-400">
                                            Información pendiente
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Completa la información faltante para activar tu cuenta:
                                    </p>
                                    <button
                                        onClick={() => startOnboarding(settings.storeEmail || '', settings.storeName || '')}
                                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                    >
                                        Completar información <ExternalLink size={12} />
                                    </button>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={openDashboard}
                                    disabled={connectLoading}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                                >
                                    <ExternalLink size={16} />
                                    Ver Dashboard de Stripe
                                </button>
                                <button
                                    onClick={() => setShowDisconnectConfirm(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                >
                                    <Unlink size={16} />
                                    Desconectar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Disconnect confirmation modal */}
                {showDisconnectConfirm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card rounded-xl border border-border w-full max-w-md p-6">
                            <h3 className="text-lg font-bold text-foreground mb-2">
                                ¿Desconectar Stripe?
                            </h3>
                            <p className="text-muted-foreground text-sm mb-4">
                                Si desconectas tu cuenta de Stripe, no podrás recibir pagos en tu tienda. 
                                Puedes volver a conectarla en cualquier momento.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDisconnectConfirm(false)}
                                    className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDisconnect}
                                    disabled={connectLoading}
                                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                >
                                    {connectLoading ? (
                                        <Loader2 size={16} className="animate-spin mx-auto" />
                                    ) : (
                                        'Desconectar'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* PayPal */}
            <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <DollarSign className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h4 className="text-foreground font-medium">PayPal</h4>
                            <p className="text-muted-foreground text-sm">
                                {t('ecommerce.paypalDesc', 'Acepta pagos con PayPal')}
                            </p>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.paypalEnabled || false}
                            onChange={(e) => onChange('paypalEnabled', e.target.checked)}
                            className="w-5 h-5 rounded border-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>
                </div>

                {settings.paypalEnabled && (
                    <div className="grid gap-4 mt-4 pt-4 border-t border-border">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                                PayPal Client ID
                            </label>
                            <input
                                type="text"
                                value={settings.paypalClientId || ''}
                                onChange={(e) => onChange('paypalClientId', e.target.value)}
                                className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Cash on Delivery */}
            <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <Truck className="text-green-400" size={24} />
                        </div>
                        <div>
                            <h4 className="text-foreground font-medium">
                                {t('ecommerce.cod', 'Pago Contra Entrega')}
                            </h4>
                            <p className="text-muted-foreground text-sm">
                                {t('ecommerce.codDesc', 'Cobra al momento de la entrega')}
                            </p>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.cashOnDeliveryEnabled || false}
                            onChange={(e) => onChange('cashOnDeliveryEnabled', e.target.checked)}
                            className="w-5 h-5 rounded border-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

// Shipping Settings Component
interface ShippingSettingsProps extends SettingsSectionProps {
    onAddZone: (zone: Omit<ShippingZone, 'id'>) => Promise<string>;
}

const ShippingSettings: React.FC<ShippingSettingsProps> = ({ settings, onChange, onAddZone }) => {
    const { t } = useTranslation();
    const theme = useEcommerceTheme();
    const [showAddZone, setShowAddZone] = useState(false);
    const [newZone, setNewZone] = useState({
        name: '',
        countries: '',
        rates: [] as { name: string; price: number; minOrder?: number }[],
    });

    const handleAddZone = async () => {
        if (!newZone.name || !newZone.countries) return;

        await onAddZone({
            name: newZone.name,
            countries: newZone.countries.split(',').map((c) => c.trim()),
            rates: newZone.rates.map((r, i) => ({
                id: `rate-${Date.now()}-${i}`,
                ...r,
            })),
        });

        setNewZone({ name: '', countries: '', rates: [] });
        setShowAddZone(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                    {t('ecommerce.shippingSettings', 'Configuración de Envío')}
                </h3>
                <button
                    onClick={() => setShowAddZone(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg transition-colors text-sm hover:bg-primary/90"
                >
                    <Plus size={16} />
                    {t('ecommerce.addZone', 'Agregar Zona')}
                </button>
            </div>

            {/* Shipping Zones */}
            {settings.shippingZones && settings.shippingZones.length > 0 ? (
                <div className="space-y-4">
                    {settings.shippingZones.map((zone) => (
                        <div key={zone.id} className="p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-foreground font-medium">{zone.name}</h4>
                                <div className="flex items-center gap-2">
                                    <Globe size={16} className="text-muted-foreground" />
                                    <span className="text-muted-foreground text-sm">
                                        {zone.countries.join(', ')}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 space-y-2">
                                {zone.rates.map((rate) => (
                                    <div key={rate.id} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{rate.name}</span>
                                        <span className="text-green-400">
                                            ${rate.price.toFixed(2)}
                                            {rate.minOrder && (
                                                <span className="text-muted-foreground ml-2">
                                                    (min. ${rate.minOrder})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                    {t('ecommerce.noShippingZones', 'No hay zonas de envío configuradas')}
                </div>
            )}

            {/* Free Shipping Threshold */}
            <div className="border-t border-border pt-6">
                <h4 className="text-md font-medium text-foreground mb-4">
                    {t('ecommerce.freeShippingThreshold', 'Envío Gratis')}
                </h4>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            {t('ecommerce.minOrderFreeShipping', 'Mínimo para envío gratis ($)')}
                        </label>
                        <input
                            type="number"
                            value={settings.freeShippingThreshold || 0}
                            onChange={(e) => onChange('freeShippingThreshold', parseFloat(e.target.value) || 0)}
                            min="0"
                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                    {t('ecommerce.freeShippingNote', 'Deja en 0 para desactivar el envío gratis automático')}
                </p>
            </div>

            {/* Add Zone Modal */}
            {showAddZone && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl border border-border w-full max-w-md">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-lg font-bold text-foreground">
                                {t('ecommerce.addShippingZone', 'Agregar Zona de Envío')}
                            </h3>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('ecommerce.zoneName', 'Nombre de la Zona')} *
                                </label>
                                <input
                                    type="text"
                                    value={newZone.name}
                                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                                    placeholder="Nacional, Internacional, etc."
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    {t('ecommerce.countries', 'Países (separados por coma)')} *
                                </label>
                                <input
                                    type="text"
                                    value={newZone.countries}
                                    onChange={(e) => setNewZone({ ...newZone, countries: e.target.value })}
                                    placeholder="México, USA, Canadá"
                                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddZone(false)}
                                    className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                                >
                                    {t('common.cancel', 'Cancelar')}
                                </button>
                                <button
                                    onClick={handleAddZone}
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90"
                                >
                                    {t('common.add', 'Agregar')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Notification Settings Component
const NotificationSettings: React.FC<SettingsSectionProps> = ({ settings, onChange }) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">
                {t('ecommerce.notificationSettings', 'Configuración de Notificaciones')}
            </h3>

            <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Mail className="text-muted-foreground" size={20} />
                        <div>
                            <p className="text-foreground font-medium">
                                {t('ecommerce.notifyNewOrder', 'Nuevo pedido')}
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {t('ecommerce.notifyNewOrderDesc', 'Recibe un email cuando haya un nuevo pedido')}
                            </p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.notifyOnNewOrder ?? true}
                        onChange={(e) => onChange('notifyOnNewOrder', e.target.checked)}
                        className="w-5 h-5 rounded border-border bg-muted text-primary focus:ring-ring"
                    />
                </label>

                <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Package className="text-muted-foreground" size={20} />
                        <div>
                            <p className="text-foreground font-medium">
                                {t('ecommerce.notifyLowStock', 'Stock bajo')}
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {t('ecommerce.notifyLowStockDesc', 'Alerta cuando un producto tiene stock bajo')}
                            </p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.notifyOnLowStock ?? true}
                        onChange={(e) => onChange('notifyOnLowStock', e.target.checked)}
                        className="w-5 h-5 rounded border-border bg-muted text-primary focus:ring-ring"
                    />
                </label>

                <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Bell className="text-muted-foreground" size={20} />
                        <div>
                            <p className="text-foreground font-medium">
                                {t('ecommerce.sendOrderConfirmation', 'Confirmación de pedido')}
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {t('ecommerce.sendOrderConfirmationDesc', 'Envía confirmación por email al cliente')}
                            </p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.sendOrderConfirmation ?? true}
                        onChange={(e) => onChange('sendOrderConfirmation', e.target.checked)}
                        className="w-5 h-5 rounded border-border bg-muted text-primary focus:ring-ring"
                    />
                </label>

                <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Truck className="text-muted-foreground" size={20} />
                        <div>
                            <p className="text-foreground font-medium">
                                {t('ecommerce.sendShippingNotification', 'Notificación de envío')}
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {t('ecommerce.sendShippingNotificationDesc', 'Notifica al cliente cuando se envía su pedido')}
                            </p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.sendShippingNotification ?? true}
                        onChange={(e) => onChange('sendShippingNotification', e.target.checked)}
                        className="w-5 h-5 rounded border-border bg-muted text-primary focus:ring-ring"
                    />
                </label>
            </div>
        </div>
    );
};

// Email Settings Component
interface EmailSettingsSectionProps {
    userId: string;
    storeId: string;
}

const EmailSettingsSection: React.FC<EmailSettingsSectionProps> = ({ userId, storeId }) => {
    const { t } = useTranslation();
    const {
        settings: emailSettings,
        isLoading,
        isSaving,
        updateSettings,
        updateSenderInfo,
        updateBranding,
        toggleTransactionalEmail,
    } = useEmailSettings(userId, storeId);

    const [localEmailSettings, setLocalEmailSettings] = useState({
        fromEmail: '',
        fromName: '',
        replyTo: '',
        logoUrl: '',
        primaryColor: '#4f46e5',
        footerText: '',
    });

    useEffect(() => {
        if (emailSettings) {
            setLocalEmailSettings({
                fromEmail: emailSettings.fromEmail || '',
                fromName: emailSettings.fromName || '',
                replyTo: emailSettings.replyTo || '',
                logoUrl: emailSettings.logoUrl || '',
                primaryColor: emailSettings.primaryColor || '#4f46e5',
                footerText: emailSettings.footerText || '',
            });
        }
    }, [emailSettings]);

    const handleSaveSenderInfo = async () => {
        await updateSenderInfo({
            fromEmail: localEmailSettings.fromEmail,
            fromName: localEmailSettings.fromName,
            replyTo: localEmailSettings.replyTo,
        });
    };

    const handleSaveBranding = async () => {
        await updateBranding({
            logoUrl: localEmailSettings.logoUrl,
            primaryColor: localEmailSettings.primaryColor,
            footerText: localEmailSettings.footerText,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="animate-spin text-primary" size={24} />
            </div>
        );
    }

    const transactionalSettings = emailSettings?.transactional;

    return (
        <div className="space-y-8">
            <h3 className="text-lg font-semibold text-foreground">
                {t('ecommerce.emailSettings', 'Configuración de Email')}
            </h3>

            {/* Sender Information */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Send className="text-muted-foreground" size={18} />
                    <h4 className="text-md font-medium text-foreground">
                        {t('ecommerce.senderInfo', 'Información del Remitente')}
                    </h4>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            {t('ecommerce.fromEmail', 'Email de Envío')}
                        </label>
                        <input
                            type="email"
                            value={localEmailSettings.fromEmail}
                            onChange={(e) => setLocalEmailSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                            placeholder="orders@tutienda.com"
                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            {t('ecommerce.fromName', 'Nombre del Remitente')}
                        </label>
                        <input
                            type="text"
                            value={localEmailSettings.fromName}
                            onChange={(e) => setLocalEmailSettings(prev => ({ ...prev, fromName: e.target.value }))}
                            placeholder="Mi Tienda"
                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            {t('ecommerce.replyTo', 'Email de Respuesta')}
                        </label>
                        <input
                            type="email"
                            value={localEmailSettings.replyTo}
                            onChange={(e) => setLocalEmailSettings(prev => ({ ...prev, replyTo: e.target.value }))}
                            placeholder="soporte@tutienda.com"
                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('ecommerce.replyToDesc', 'Las respuestas de clientes llegarán a este email')}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSaveSenderInfo}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {t('common.save', 'Guardar')}
                </button>
            </div>

            <hr className="border-border" />

            {/* Branding */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Palette className="text-muted-foreground" size={18} />
                    <h4 className="text-md font-medium text-foreground">
                        {t('ecommerce.emailBranding', 'Diseño de Emails')}
                    </h4>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            {t('ecommerce.logoUrl', 'URL del Logo')}
                        </label>
                        <input
                            type="url"
                            value={localEmailSettings.logoUrl}
                            onChange={(e) => setLocalEmailSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                            placeholder="https://..."
                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            {t('ecommerce.primaryColor', 'Color Principal')}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={localEmailSettings.primaryColor}
                                onChange={(e) => setLocalEmailSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                                className="w-12 h-10 rounded border border-border cursor-pointer"
                            />
                            <input
                                type="text"
                                value={localEmailSettings.primaryColor}
                                onChange={(e) => setLocalEmailSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                                className="flex-1 px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            {t('ecommerce.footerText', 'Texto del Pie')}
                        </label>
                        <textarea
                            value={localEmailSettings.footerText}
                            onChange={(e) => setLocalEmailSettings(prev => ({ ...prev, footerText: e.target.value }))}
                            placeholder="Gracias por comprar con nosotros..."
                            rows={2}
                            className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSaveBranding}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {t('common.save', 'Guardar')}
                </button>
            </div>

            <hr className="border-border" />

            {/* Transactional Email Toggles */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Mail className="text-muted-foreground" size={18} />
                    <h4 className="text-md font-medium text-foreground">
                        {t('ecommerce.transactionalEmails', 'Emails Transaccionales')}
                    </h4>
                </div>

                <p className="text-sm text-muted-foreground">
                    {t('ecommerce.transactionalEmailsDesc', 'Configura qué emails se envían automáticamente a tus clientes')}
                </p>

                <div className="space-y-3">
                    {/* Order Confirmation */}
                    <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Check className="text-green-500" size={20} />
                            <div>
                                <p className="text-foreground font-medium">
                                    {t('ecommerce.orderConfirmation', 'Confirmación de Pedido')}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {t('ecommerce.orderConfirmationDesc', 'Email al cliente cuando realiza un pedido')}
                                </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={transactionalSettings?.orderConfirmation ?? true}
                            onChange={(e) => toggleTransactionalEmail('orderConfirmation', e.target.checked)}
                            className="w-5 h-5 rounded border-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>

                    {/* Order Shipped */}
                    <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Truck className="text-blue-500" size={20} />
                            <div>
                                <p className="text-foreground font-medium">
                                    {t('ecommerce.orderShipped', 'Pedido Enviado')}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {t('ecommerce.orderShippedDesc', 'Email con número de seguimiento cuando se envía')}
                                </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={transactionalSettings?.orderShipped ?? true}
                            onChange={(e) => toggleTransactionalEmail('orderShipped', e.target.checked)}
                            className="w-5 h-5 rounded border-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>

                    {/* Order Delivered */}
                    <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Package className="text-emerald-500" size={20} />
                            <div>
                                <p className="text-foreground font-medium">
                                    {t('ecommerce.orderDelivered', 'Pedido Entregado')}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {t('ecommerce.orderDeliveredDesc', 'Email de confirmación cuando el pedido llega')}
                                </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={transactionalSettings?.orderDelivered ?? true}
                            onChange={(e) => toggleTransactionalEmail('orderDelivered', e.target.checked)}
                            className="w-5 h-5 rounded border-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>

                    {/* Review Request */}
                    <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Send className="text-amber-500" size={20} />
                            <div>
                                <p className="text-foreground font-medium">
                                    {t('ecommerce.reviewRequest', 'Solicitud de Reseña')}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {t('ecommerce.reviewRequestDesc', 'Pide una reseña días después de la entrega')}
                                </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={transactionalSettings?.reviewRequest ?? true}
                            onChange={(e) => toggleTransactionalEmail('reviewRequest', e.target.checked)}
                            className="w-5 h-5 rounded border-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>
                </div>
            </div>

            <hr className="border-border" />

            {/* Admin Notifications */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Bell className="text-muted-foreground" size={18} />
                    <h4 className="text-md font-medium text-foreground">
                        {t('ecommerce.adminNotifications', 'Notificaciones de Administrador')}
                    </h4>
                </div>

                <div className="space-y-3">
                    {/* New Order */}
                    <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                            <DollarSign className="text-green-500" size={20} />
                            <div>
                                <p className="text-foreground font-medium">
                                    {t('ecommerce.newOrderNotification', 'Nueva Orden')}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {t('ecommerce.newOrderNotificationDesc', 'Recibe email cuando llega un pedido')}
                                </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={transactionalSettings?.newOrderNotification ?? true}
                            onChange={(e) => toggleTransactionalEmail('newOrderNotification', e.target.checked)}
                            className="w-5 h-5 rounded border-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>

                    {/* Low Stock */}
                    <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Package className="text-red-500" size={20} />
                            <div>
                                <p className="text-foreground font-medium">
                                    {t('ecommerce.lowStockNotification', 'Stock Bajo')}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {t('ecommerce.lowStockNotificationDesc', 'Alerta cuando un producto tiene stock bajo')}
                                </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={transactionalSettings?.lowStockNotification ?? true}
                            onChange={(e) => toggleTransactionalEmail('lowStockNotification', e.target.checked)}
                            className="w-5 h-5 rounded border-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
