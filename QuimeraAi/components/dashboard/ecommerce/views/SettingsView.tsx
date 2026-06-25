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
import { useEcommerceContext } from '../EcommerceContext';
import { useStripeConnect } from '../hooks/useStripeConnect';
import { useEmailSettings } from '../../../../hooks/useEmailSettings';
import {
    TransactionalEmailSettings,
    EmailSocialLinks,
    AppointmentEmailTemplateKey,
    AppointmentEmailTemplateOverride,
} from '../../../../types/email';
import AppSelect from '../../../ui/AppSelect';
import ColorControl from '../../../ui/ColorControl';

type SettingsTab = 'general' | 'payment' | 'shipping' | 'notifications' | 'email';

const APPOINTMENT_EMAIL_TEMPLATE_KEYS: AppointmentEmailTemplateKey[] = [
    'appointment_request_received',
    'appointment_confirmation',
    'appointment_cancellation',
    'appointment_follow_up',
    'appointment_reminder',
];

const emptyAppointmentTemplateDrafts = (): Record<AppointmentEmailTemplateKey, AppointmentEmailTemplateOverride> =>
    APPOINTMENT_EMAIL_TEMPLATE_KEYS.reduce((acc, key) => {
        acc[key] = { enabled: true };
        return acc;
    }, {} as Record<AppointmentEmailTemplateKey, AppointmentEmailTemplateOverride>);

const defaultTransactionalEmailSettings = (): TransactionalEmailSettings => ({
    orderConfirmation: true,
    orderShipped: true,
    orderDelivered: true,
    orderCancelled: true,
    orderRefunded: true,
    reviewRequest: true,
    reviewRequestDelayDays: 3,
    newOrderNotification: true,
    lowStockNotification: true,
    appointments: true,
    appointmentEmails: true,
    appointmentRequestReceived: true,
    appointmentConfirmation: true,
    appointmentCancellation: true,
    appointmentFollowUp: true,
    appointmentReminder: true,
    appointmentTemplates: {},
});

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
    } = useStoreSettings(user?.id || '', storeId);

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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-foreground">
                        {t('ecommerce.settings', 'Configuración')}
                    </h2>
                    <p className="text-q-text-muted">
                        {t('ecommerce.settingsSubtitle', 'Configura tu tienda')}
                    </p>
                </div>

                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex w-full items-center justify-center gap-2 px-4 py-2 disabled:opacity-50 bg-primary text-primary-foreground rounded-lg transition-colors hover:bg-primary/90 sm:w-auto"
                    >
                        {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        {t('common.saveChanges', 'Guardar Cambios')}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
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
                                    : 'bg-q-surface/50 text-q-text-muted hover:text-foreground'
                            }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="min-w-0 bg-q-surface/50 rounded-xl border border-q-border p-4 sm:p-6">
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
                        userId={user?.id || ''}
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
                        userId={user?.id || ''}
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
                    <label className="block text-sm font-medium text-q-text-muted mb-1">
                        {t('ecommerce.storeName', 'Nombre de la Tienda')}
                    </label>
                    <input
                        type="text"
                        value={settings.storeName || ''}
                        onChange={(e) => onChange('storeName', e.target.value)}
                        className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-q-text-muted mb-1">
                        {t('ecommerce.storeEmail', 'Email de la Tienda')}
                    </label>
                    <input
                        type="email"
                        value={settings.storeEmail || ''}
                        onChange={(e) => onChange('storeEmail', e.target.value)}
                        className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-q-text-muted mb-1">
                        {t('ecommerce.currency', 'Moneda')}
                    </label>
                    <AppSelect
                        value={settings.currency || 'USD'}
                        onChange={(e) => onChange('currency', e.target.value)}
                        className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="USD">USD - Dólar Estadounidense</option>
                        <option value="MXN">MXN - Peso Mexicano</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - Libra Esterlina</option>
                    </AppSelect>
                </div>

                <div>
                    <label className="block text-sm font-medium text-q-text-muted mb-1">
                        {t('ecommerce.currencySymbol', 'Símbolo de Moneda')}
                    </label>
                    <input
                        type="text"
                        value={settings.currencySymbol || '$'}
                        onChange={(e) => onChange('currencySymbol', e.target.value)}
                        className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
            </div>

            <div className="border-t border-q-border pt-6">
                <h4 className="text-md font-medium text-foreground mb-4">
                    {t('ecommerce.taxSettings', 'Configuración de Impuestos')}
                </h4>

                <div className="flex items-center gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.taxEnabled || false}
                            onChange={(e) => onChange('taxEnabled', e.target.checked)}
                            className="w-4 h-4 rounded border-q-border bg-muted text-primary focus:ring-ring"
                        />
                        <span className="text-q-text-muted">{t('ecommerce.enableTax', 'Habilitar impuestos')}</span>
                    </label>
                </div>

                {settings.taxEnabled && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-q-text-muted mb-1">
                                {t('ecommerce.taxRate', 'Tasa de Impuesto (%)')}
                            </label>
                            <input
                                type="number"
                                value={settings.taxRate || 0}
                                onChange={(e) => onChange('taxRate', parseFloat(e.target.value) || 0)}
                                min="0"
                                max="100"
                                step="0.01"
                                className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-q-text-muted mb-1">
                                {t('ecommerce.taxName', 'Nombre del Impuesto')}
                            </label>
                            <input
                                type="text"
                                value={settings.taxName || 'IVA'}
                                onChange={(e) => onChange('taxName', e.target.value)}
                                className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.taxIncludedInPrice || false}
                                onChange={(e) => onChange('taxIncludedInPrice', e.target.checked)}
                                className="w-4 h-4 rounded border-q-border bg-muted text-primary focus:ring-ring"
                            />
                            <span className="text-q-text-muted">
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
                <span className="flex items-center gap-1 px-2 py-1 bg-q-success/20 text-q-success rounded-full text-xs font-medium">
                    <CheckCircle2 size={12} />
                    Activo
                </span>
            );
        } else if (connectStatus?.detailsSubmitted) {
            return (
                <span className="flex items-center gap-1 px-2 py-1 bg-q-accent/20 text-q-accent rounded-full text-xs font-medium">
                    <AlertCircle size={12} />
                    Restringido
                </span>
            );
        } else {
            return (
                <span className="flex items-center gap-1 px-2 py-1 bg-q-accent/20 text-q-accent rounded-full text-xs font-medium">
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
            <div className="p-4 bg-gradient-to-r from-q-accent/10 to-q-accent/10 rounded-lg border border-q-accent/20">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex-shrink-0 p-2 rounded-lg bg-q-accent/20">
                            <CreditCard className="text-q-accent" size={24} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-foreground font-medium">Stripe Connect</h4>
                                {getStatusBadge()}
                            </div>
                            <p className="text-q-text-muted text-sm">
                                {t('ecommerce.stripeConnectDesc', 'Recibe pagos directamente en tu cuenta de Stripe')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Connect Status & Actions */}
                <div className="mt-4 pt-4 border-t border-q-border/50">
                    {connectError && (
                        <div className="mb-4 p-3 bg-q-error/10 border border-q-error/20 rounded-lg">
                            <p className="text-q-error text-sm">{connectError}</p>
                        </div>
                    )}

                    {!isConnected ? (
                        // Not connected - Show connect button or form
                        <div className="space-y-4">
                            <p className="text-q-text-muted text-sm">
                                Conecta tu cuenta de Stripe para empezar a recibir pagos.
                                El proceso es guiado y solo toma unos minutos.
                            </p>

                            {!showConnectForm ? (
                                <button
                                    onClick={() => setShowConnectForm(true)}
                                    className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-q-accent hover:bg-q-accent text-q-text-on-accent rounded-lg transition-colors sm:w-auto"
                                >
                                    <CreditCard size={18} />
                                    Conectar con Stripe
                                </button>
                            ) : (
                                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-q-text-muted mb-1">
                                            Email de tu negocio
                                        </label>
                                        <input
                                            type="email"
                                            value={connectEmail}
                                            onChange={(e) => setConnectEmail(e.target.value)}
                                            placeholder="negocio@ejemplo.com"
                                            className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-q-text-muted mb-1">
                                            Nombre de tu tienda
                                        </label>
                                        <input
                                            type="text"
                                            value={connectBusinessName}
                                            onChange={(e) => setConnectBusinessName(e.target.value)}
                                            placeholder="Mi Tienda Online"
                                            className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <button
                                            onClick={handleStartConnect}
                                            disabled={connectLoading || !connectEmail || !connectBusinessName}
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-q-accent hover:bg-q-accent text-q-text-on-accent rounded-lg transition-colors disabled:opacity-50"
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
                                    <p className="text-xs text-q-text-muted">
                                        Se abrirá una nueva pestaña con el proceso guiado de Stripe.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Connected - Show status and actions
                        <div className="space-y-4">
                            {/* Account Info */}
                            <div className="flex items-start justify-between gap-3 p-3 bg-muted/30 rounded-lg">
                                <div className="min-w-0">
                                    <p className="text-sm text-q-text-muted">ID de cuenta</p>
                                    <p className="break-all text-foreground font-mono text-sm">
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
                                        className={connectLoading ? 'animate-spin text-primary' : 'text-q-text-muted'}
                                    />
                                </button>
                            </div>

                            {/* Capabilities */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className={`p-3 rounded-lg ${canAcceptPayments ? 'bg-q-success/10' : 'bg-q-accent/10'}`}>
                                    <div className="flex items-center gap-2">
                                        {canAcceptPayments ? (
                                            <CheckCircle2 size={16} className="text-q-success" />
                                        ) : (
                                            <AlertCircle size={16} className="text-q-accent" />
                                        )}
                                        <span className="text-sm font-medium text-foreground">
                                            Recibir pagos
                                        </span>
                                    </div>
                                    <p className="text-xs text-q-text-muted mt-1">
                                        {canAcceptPayments ? 'Habilitado' : 'Pendiente de verificación'}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-lg ${connectStatus?.payoutsEnabled ? 'bg-q-success/10' : 'bg-q-accent/10'}`}>
                                    <div className="flex items-center gap-2">
                                        {connectStatus?.payoutsEnabled ? (
                                            <CheckCircle2 size={16} className="text-q-success" />
                                        ) : (
                                            <AlertCircle size={16} className="text-q-accent" />
                                        )}
                                        <span className="text-sm font-medium text-foreground">
                                            Transferencias
                                        </span>
                                    </div>
                                    <p className="text-xs text-q-text-muted mt-1">
                                        {connectStatus?.payoutsEnabled ? 'Habilitado' : 'Pendiente de verificación'}
                                    </p>
                                </div>
                            </div>

                            {/* Pending requirements warning */}
                            {connectStatus?.requirements?.currentlyDue && connectStatus.requirements.currentlyDue.length > 0 && (
                                <div className="p-3 bg-q-accent/10 border border-q-accent/20 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle size={16} className="text-q-accent" />
                                        <span className="text-sm font-medium text-q-accent">
                                            Información pendiente
                                        </span>
                                    </div>
                                    <p className="text-xs text-q-text-muted mb-2">
                                        Completa la información faltante para activar tu cuenta:
                                    </p>
                                    <button
                                        onClick={() => startOnboarding(settings.storeEmail || '', settings.storeName || '')}
                                        className="text-xs text-q-accent hover:text-q-accent flex items-center gap-1"
                                    >
                                        Completar información <ExternalLink size={12} />
                                    </button>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                                <button
                                    onClick={openDashboard}
                                    disabled={connectLoading}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                                >
                                    <ExternalLink size={16} />
                                    Ver Dashboard de Stripe
                                </button>
                                <button
                                    onClick={() => setShowDisconnectConfirm(true)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-q-error/10 hover:bg-q-error/20 text-q-error rounded-lg transition-colors"
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
                    <div className="fixed inset-0 bg-q-text/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                        <div className="bg-q-surface rounded-xl border border-q-border w-full max-w-md p-4 sm:p-6">
                            <h3 className="text-lg font-bold text-foreground mb-2">
                                ¿Desconectar Stripe?
                            </h3>
                            <p className="text-q-text-muted text-sm mb-4">
                                Si desconectas tu cuenta de Stripe, no podrás recibir pagos en tu tienda.
                                Puedes volver a conectarla en cualquier momento.
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    onClick={() => setShowDisconnectConfirm(false)}
                                    className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDisconnect}
                                    disabled={connectLoading}
                                    className="flex-1 px-4 py-2 bg-q-error hover:bg-q-error text-white rounded-lg transition-colors"
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
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <DollarSign className="text-q-accent flex-shrink-0" size={24} strokeWidth={2} />
                        <div className="min-w-0">
                            <h4 className="text-foreground font-medium">PayPal</h4>
                            <p className="text-q-text-muted text-sm">
                                {t('ecommerce.paypalDesc', 'Acepta pagos con PayPal')}
                            </p>
                        </div>
                    </div>
                    <label className="flex flex-shrink-0 items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.paypalEnabled || false}
                            onChange={(e) => onChange('paypalEnabled', e.target.checked)}
                            className="w-5 h-5 rounded border-q-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>
                </div>

                {settings.paypalEnabled && (
                    <div className="grid gap-4 mt-4 pt-4 border-t border-q-border">
                        <div>
                            <label className="block text-sm font-medium text-q-text-muted mb-1">
                                PayPal Client ID
                            </label>
                            <input
                                type="text"
                                value={settings.paypalClientId || ''}
                                onChange={(e) => onChange('paypalClientId', e.target.value)}
                                className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Cash on Delivery */}
            <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <Truck className="text-q-success flex-shrink-0" size={24} strokeWidth={2} />
                        <div className="min-w-0">
                            <h4 className="text-foreground font-medium">
                                {t('ecommerce.cod', 'Pago Contra Entrega')}
                            </h4>
                            <p className="text-q-text-muted text-sm">
                                {t('ecommerce.codDesc', 'Cobra al momento de la entrega')}
                            </p>
                        </div>
                    </div>
                    <label className="flex flex-shrink-0 items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.cashOnDeliveryEnabled || false}
                            onChange={(e) => onChange('cashOnDeliveryEnabled', e.target.checked)}
                            className="w-5 h-5 rounded border-q-border bg-muted text-primary focus:ring-ring"
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                    {t('ecommerce.shippingSettings', 'Configuración de Envío')}
                </h3>
                <button
                    onClick={() => setShowAddZone(true)}
                    className="flex w-full items-center justify-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg transition-colors text-sm hover:bg-primary/90 sm:w-auto"
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
                            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <h4 className="text-foreground font-medium">{zone.name}</h4>
                                <div className="flex min-w-0 items-center gap-2">
                                    <Globe size={16} className="flex-shrink-0 text-q-text-muted" />
                                    <span className="truncate text-q-text-muted text-sm">
                                        {zone.countries.join(', ')}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 space-y-2">
                                {zone.rates.map((rate) => (
                                    <div key={rate.id} className="flex items-center justify-between gap-3 text-sm">
                                        <span className="min-w-0 truncate text-q-text-muted">{rate.name}</span>
                                        <span className="flex-shrink-0 text-q-success">
                                            ${rate.price.toFixed(2)}
                                            {rate.minOrder && (
                                                <span className="text-q-text-muted ml-2">
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
                <div className="text-center py-8 text-q-text-muted">
                    {t('ecommerce.noShippingZones', 'No hay zonas de envío configuradas')}
                </div>
            )}

            {/* Free Shipping Threshold */}
            <div className="border-t border-q-border pt-6">
                <h4 className="text-md font-medium text-foreground mb-4">
                    {t('ecommerce.freeShippingThreshold', 'Envío Gratis')}
                </h4>
                <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <label className="block text-sm font-medium text-q-text-muted mb-1">
                            {t('ecommerce.minOrderFreeShipping', 'Mínimo para envío gratis ($)')}
                        </label>
                        <input
                            type="number"
                            value={settings.freeShippingThreshold || 0}
                            onChange={(e) => onChange('freeShippingThreshold', parseFloat(e.target.value) || 0)}
                            min="0"
                            className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                </div>
                <p className="text-sm text-q-text-muted mt-2">
                    {t('ecommerce.freeShippingNote', 'Deja en 0 para desactivar el envío gratis automático')}
                </p>
            </div>

            {/* Add Zone Modal */}
            {showAddZone && (
                <div className="fixed inset-0 bg-q-text/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-q-surface rounded-xl border border-q-border w-full max-w-md max-h-[92vh] overflow-y-auto">
                        <div className="p-4 border-b border-q-border sm:p-6">
                            <h3 className="text-lg font-bold text-foreground">
                                {t('ecommerce.addShippingZone', 'Agregar Zona de Envío')}
                            </h3>
                        </div>

                        <div className="p-4 space-y-4 sm:p-6">
                            <div>
                                <label className="block text-sm font-medium text-q-text-muted mb-1">
                                    {t('ecommerce.zoneName', 'Nombre de la Zona')} *
                                </label>
                                <input
                                    type="text"
                                    value={newZone.name}
                                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                                    placeholder="Nacional, Internacional, etc."
                                    className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-q-text-muted mb-1">
                                    {t('ecommerce.countries', 'Países (separados por coma)')} *
                                </label>
                                <input
                                    type="text"
                                    value={newZone.countries}
                                    onChange={(e) => setNewZone({ ...newZone, countries: e.target.value })}
                                    placeholder="México, USA, Canadá"
                                    className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
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
                        <Mail className="text-q-text-muted" size={20} />
                        <div>
                            <p className="text-foreground font-medium">
                                {t('ecommerce.notifyNewOrder', 'Nuevo pedido')}
                            </p>
                            <p className="text-q-text-muted text-sm">
                                {t('ecommerce.notifyNewOrderDesc', 'Recibe un email cuando haya un nuevo pedido')}
                            </p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.notifyOnNewOrder ?? true}
                        onChange={(e) => onChange('notifyOnNewOrder', e.target.checked)}
                        className="w-5 h-5 rounded border-q-border bg-muted text-primary focus:ring-ring"
                    />
                </label>

                <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Package className="text-q-text-muted" size={20} />
                        <div>
                            <p className="text-foreground font-medium">
                                {t('ecommerce.notifyLowStock', 'Stock bajo')}
                            </p>
                            <p className="text-q-text-muted text-sm">
                                {t('ecommerce.notifyLowStockDesc', 'Alerta cuando un producto tiene stock bajo')}
                            </p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.notifyOnLowStock ?? true}
                        onChange={(e) => onChange('notifyOnLowStock', e.target.checked)}
                        className="w-5 h-5 rounded border-q-border bg-muted text-primary focus:ring-ring"
                    />
                </label>

                <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Bell className="text-q-text-muted" size={20} />
                        <div>
                            <p className="text-foreground font-medium">
                                {t('ecommerce.sendOrderConfirmation', 'Confirmación de pedido')}
                            </p>
                            <p className="text-q-text-muted text-sm">
                                {t('ecommerce.sendOrderConfirmationDesc', 'Envía confirmación por email al cliente')}
                            </p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.sendOrderConfirmation ?? true}
                        onChange={(e) => onChange('sendOrderConfirmation', e.target.checked)}
                        className="w-5 h-5 rounded border-q-border bg-muted text-primary focus:ring-ring"
                    />
                </label>

                <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Truck className="text-q-text-muted" size={20} />
                        <div>
                            <p className="text-foreground font-medium">
                                {t('ecommerce.sendShippingNotification', 'Notificación de envío')}
                            </p>
                            <p className="text-q-text-muted text-sm">
                                {t('ecommerce.sendShippingNotificationDesc', 'Notifica al cliente cuando se envía su pedido')}
                            </p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.sendShippingNotification ?? true}
                        onChange={(e) => onChange('sendShippingNotification', e.target.checked)}
                        className="w-5 h-5 rounded border-q-border bg-muted text-primary focus:ring-ring"
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
    const [appointmentTemplateDrafts, setAppointmentTemplateDrafts] = useState<Record<AppointmentEmailTemplateKey, AppointmentEmailTemplateOverride>>(
        emptyAppointmentTemplateDrafts()
    );

    useEffect(() => {
        if (emailSettings) {
            const appointmentTemplates = emailSettings.transactional?.appointmentTemplates || {};
            setLocalEmailSettings({
                fromEmail: emailSettings.fromEmail || '',
                fromName: emailSettings.fromName || '',
                replyTo: emailSettings.replyTo || '',
                logoUrl: emailSettings.logoUrl || '',
                primaryColor: emailSettings.primaryColor || '#4f46e5',
                footerText: emailSettings.footerText || '',
            });
            setAppointmentTemplateDrafts({
                ...emptyAppointmentTemplateDrafts(),
                ...appointmentTemplates,
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

    const handleAppointmentTemplateChange = (
        flowKey: AppointmentEmailTemplateKey,
        field: keyof AppointmentEmailTemplateOverride,
        value: string | boolean,
    ) => {
        setAppointmentTemplateDrafts(prev => ({
            ...prev,
            [flowKey]: {
                ...(prev[flowKey] || { enabled: true }),
                [field]: value,
            },
        }));
    };

    const handleSaveAppointmentTemplates = async () => {
        await updateSettings({
            transactional: {
                ...defaultTransactionalEmailSettings(),
                ...(emailSettings?.transactional || {}),
                appointmentTemplates: appointmentTemplateDrafts,
            },
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
                    <Send className="text-q-text-muted" size={18} />
                    <h4 className="text-md font-medium text-foreground">
                        {t('ecommerce.senderInfo', 'Información del Remitente')}
                    </h4>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-q-text-muted mb-1">
                            {t('ecommerce.fromEmail', 'Email de Envío')}
                        </label>
                        <input
                            type="email"
                            value={localEmailSettings.fromEmail}
                            onChange={(e) => setLocalEmailSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                            placeholder="orders@tutienda.com"
                            className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-q-text-muted mb-1">
                            {t('ecommerce.fromName', 'Nombre del Remitente')}
                        </label>
                        <input
                            type="text"
                            value={localEmailSettings.fromName}
                            onChange={(e) => setLocalEmailSettings(prev => ({ ...prev, fromName: e.target.value }))}
                            placeholder="Mi Tienda"
                            className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-q-text-muted mb-1">
                            {t('ecommerce.replyTo', 'Email de Respuesta')}
                        </label>
                        <input
                            type="email"
                            value={localEmailSettings.replyTo}
                            onChange={(e) => setLocalEmailSettings(prev => ({ ...prev, replyTo: e.target.value }))}
                            placeholder="soporte@tutienda.com"
                            className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <p className="text-xs text-q-text-muted mt-1">
                            {t('ecommerce.replyToDesc', 'Las respuestas de clientes llegarán a este email')}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSaveSenderInfo}
                    disabled={isSaving}
                    className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {t('common.save', 'Guardar')}
                </button>
            </div>

            <hr className="border-q-border" />

            {/* Branding */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Palette className="text-q-text-muted" size={18} />
                    <h4 className="text-md font-medium text-foreground">
                        {t('ecommerce.emailBranding', 'Diseño de Emails')}
                    </h4>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-q-text-muted mb-1">
                            {t('ecommerce.logoUrl', 'URL del Logo')}
                        </label>
                        <input
                            type="url"
                            value={localEmailSettings.logoUrl}
                            onChange={(e) => setLocalEmailSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                            placeholder="https://..."
                            className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div>
                        <ColorControl
                            label={t('ecommerce.primaryColor', 'Color Principal')}
                            value={localEmailSettings.primaryColor}
                            onChange={(value) => setLocalEmailSettings(prev => ({ ...prev, primaryColor: value }))}
                            variant="dashboard"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-q-text-muted mb-1">
                            {t('ecommerce.footerText', 'Texto del Pie')}
                        </label>
                        <textarea
                            value={localEmailSettings.footerText}
                            onChange={(e) => setLocalEmailSettings(prev => ({ ...prev, footerText: e.target.value }))}
                            placeholder="Gracias por comprar con nosotros..."
                            rows={2}
                            className="w-full px-4 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSaveBranding}
                    disabled={isSaving}
                    className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {t('common.save', 'Guardar')}
                </button>
            </div>

            <hr className="border-q-border" />

            {/* Transactional Email Toggles */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Mail className="text-q-text-muted" size={18} />
                    <h4 className="text-md font-medium text-foreground">
                        {t('ecommerce.transactionalEmails', 'Emails Transaccionales')}
                    </h4>
                </div>

                <p className="text-sm text-q-text-muted">
                    {t('ecommerce.transactionalEmailsDesc', 'Configura qué emails se envían automáticamente a tus clientes')}
                </p>

                <div className="space-y-3">
                    {/* Order Confirmation */}
                    <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Check className="text-q-success" size={20} />
                            <div>
                                <p className="text-foreground font-medium">
                                    {t('ecommerce.orderConfirmation', 'Confirmación de Pedido')}
                                </p>
                                <p className="text-q-text-muted text-sm">
                                    {t('ecommerce.orderConfirmationDesc', 'Email al cliente cuando realiza un pedido')}
                                </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={transactionalSettings?.orderConfirmation ?? true}
                            onChange={(e) => toggleTransactionalEmail('orderConfirmation', e.target.checked)}
                            className="w-5 h-5 rounded border-q-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>

                    {/* Order Shipped */}
                    <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Truck className="text-q-accent" size={20} />
                            <div>
                                <p className="text-foreground font-medium">
                                    {t('ecommerce.orderShipped', 'Pedido Enviado')}
                                </p>
                                <p className="text-q-text-muted text-sm">
                                    {t('ecommerce.orderShippedDesc', 'Email con número de seguimiento cuando se envía')}
                                </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={transactionalSettings?.orderShipped ?? true}
                            onChange={(e) => toggleTransactionalEmail('orderShipped', e.target.checked)}
                            className="w-5 h-5 rounded border-q-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>

                    {/* Order Delivered */}
                    <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Package className="text-q-success" size={20} />
                            <div>
                                <p className="text-foreground font-medium">
                                    {t('ecommerce.orderDelivered', 'Pedido Entregado')}
                                </p>
                                <p className="text-q-text-muted text-sm">
                                    {t('ecommerce.orderDeliveredDesc', 'Email de confirmación cuando el pedido llega')}
                                </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={transactionalSettings?.orderDelivered ?? true}
                            onChange={(e) => toggleTransactionalEmail('orderDelivered', e.target.checked)}
                            className="w-5 h-5 rounded border-q-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>

                    {/* Review Request */}
                    <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Send className="text-q-accent" size={20} />
                            <div>
                                <p className="text-foreground font-medium">
                                    {t('ecommerce.reviewRequest', 'Solicitud de Reseña')}
                                </p>
                                <p className="text-q-text-muted text-sm">
                                    {t('ecommerce.reviewRequestDesc', 'Pide una reseña días después de la entrega')}
                                </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={transactionalSettings?.reviewRequest ?? true}
                            onChange={(e) => toggleTransactionalEmail('reviewRequest', e.target.checked)}
                            className="w-5 h-5 rounded border-q-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>
                </div>
            </div>

            <hr className="border-q-border" />

            {/* Appointment Email Templates */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Mail className="text-q-text-muted" size={18} />
                    <h4 className="text-md font-medium text-foreground">
                        {t('ecommerce.appointmentEmailTemplates', 'Plantillas de citas')}
                    </h4>
                </div>
                <p className="text-sm text-q-text-muted">
                    {t('ecommerce.appointmentEmailTemplatesDesc', 'Personaliza los emails transaccionales del Appointments Engine por flujo. Variables: {{title}}, {{name}}, {{start}}, {{end}}, {{timezone}}, {{paymentStatus}}.')}
                </p>

                <div className="space-y-3">
                    {APPOINTMENT_EMAIL_TEMPLATE_KEYS.map((flowKey) => {
                        const draft = appointmentTemplateDrafts[flowKey] || { enabled: true };
                        return (
                            <details key={flowKey} className="rounded-lg border border-q-border bg-muted/30">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {t(`ecommerce.appointmentTemplateFlows.${flowKey}`, flowKey)}
                                        </p>
                                        <p className="text-xs text-q-text-muted">
                                            {draft.subject || t('ecommerce.defaultTemplate', 'Plantilla default')}
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={draft.enabled !== false}
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={(event) => handleAppointmentTemplateChange(flowKey, 'enabled', event.target.checked)}
                                        className="h-5 w-5 rounded border-q-border bg-muted text-primary focus:ring-ring"
                                    />
                                </summary>
                                <div className="space-y-3 border-t border-q-border px-4 py-4">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-q-text-muted">
                                                {t('ecommerce.templateSubject', 'Asunto')}
                                            </label>
                                            <input
                                                type="text"
                                                value={draft.subject || ''}
                                                onChange={(event) => handleAppointmentTemplateChange(flowKey, 'subject', event.target.value)}
                                                className="w-full rounded-lg border border-q-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                placeholder={t('ecommerce.templateSubjectPlaceholder', 'Ej. Tu cita {{title}} está confirmada')}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-q-text-muted">
                                                {t('ecommerce.templatePreheader', 'Preheader')}
                                            </label>
                                            <input
                                                type="text"
                                                value={draft.preheader || ''}
                                                onChange={(event) => handleAppointmentTemplateChange(flowKey, 'preheader', event.target.value)}
                                                className="w-full rounded-lg border border-q-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                placeholder={t('ecommerce.templatePreheaderPlaceholder', 'Texto corto antes de abrir el email')}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-3">
                                        <textarea
                                            value={draft.intro || ''}
                                            onChange={(event) => handleAppointmentTemplateChange(flowKey, 'intro', event.target.value)}
                                            rows={3}
                                            className="w-full resize-none rounded-lg border border-q-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            placeholder={t('ecommerce.templateIntro', 'Intro')}
                                        />
                                        <textarea
                                            value={draft.nextStep || ''}
                                            onChange={(event) => handleAppointmentTemplateChange(flowKey, 'nextStep', event.target.value)}
                                            rows={3}
                                            className="w-full resize-none rounded-lg border border-q-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            placeholder={t('ecommerce.templateNextStep', 'Siguiente paso')}
                                        />
                                        <textarea
                                            value={draft.footer || ''}
                                            onChange={(event) => handleAppointmentTemplateChange(flowKey, 'footer', event.target.value)}
                                            rows={3}
                                            className="w-full resize-none rounded-lg border border-q-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            placeholder={t('ecommerce.templateFooter', 'Footer')}
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-q-text-muted">
                                            {t('ecommerce.templateHtml', 'HTML visual')}
                                        </label>
                                        <textarea
                                            value={draft.html || ''}
                                            onChange={(event) => handleAppointmentTemplateChange(flowKey, 'html', event.target.value)}
                                            rows={4}
                                            className="w-full resize-y rounded-lg border border-q-border bg-muted/50 px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            placeholder="<main><h1>{{title}}</h1><p>{{name}} - {{start}}</p></main>"
                                        />
                                    </div>
                                </div>
                            </details>
                        );
                    })}
                </div>

                <button
                    onClick={handleSaveAppointmentTemplates}
                    disabled={isSaving}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {t('ecommerce.saveAppointmentTemplates', 'Guardar plantillas de citas')}
                </button>
            </div>

            <hr className="border-q-border" />

            {/* Admin Notifications */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Bell className="text-q-text-muted" size={18} />
                    <h4 className="text-md font-medium text-foreground">
                        {t('ecommerce.adminNotifications', 'Notificaciones de Administrador')}
                    </h4>
                </div>

                <div className="space-y-3">
                    {/* New Order */}
                    <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                            <DollarSign className="text-q-success" size={20} />
                            <div>
                                <p className="text-foreground font-medium">
                                    {t('ecommerce.newOrderNotification', 'Nueva Orden')}
                                </p>
                                <p className="text-q-text-muted text-sm">
                                    {t('ecommerce.newOrderNotificationDesc', 'Recibe email cuando llega un pedido')}
                                </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={transactionalSettings?.newOrderNotification ?? true}
                            onChange={(e) => toggleTransactionalEmail('newOrderNotification', e.target.checked)}
                            className="w-5 h-5 rounded border-q-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>

                    {/* Low Stock */}
                    <label className="flex items-center justify-between p-4 bg-muted/30 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Package className="text-q-error" size={20} />
                            <div>
                                <p className="text-foreground font-medium">
                                    {t('ecommerce.lowStockNotification', 'Stock Bajo')}
                                </p>
                                <p className="text-q-text-muted text-sm">
                                    {t('ecommerce.lowStockNotificationDesc', 'Alerta cuando un producto tiene stock bajo')}
                                </p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={transactionalSettings?.lowStockNotification ?? true}
                            onChange={(e) => toggleTransactionalEmail('lowStockNotification', e.target.checked)}
                            className="w-5 h-5 rounded border-q-border bg-muted text-primary focus:ring-ring"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
