/**
 * UserRolesManager
 * Componente para gestionar roles de usuarios de tienda
 * Permite configurar beneficios y umbrales por rol
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Shield,
    Crown,
    User,
    Percent,
    DollarSign,
    ShoppingBag,
    Check,
    X,
    Edit2,
    Save,
    Loader2,
} from 'lucide-react';
import {
    StoreUserRole,
    RoleConfig,
    DEFAULT_ROLE_CONFIGS,
} from '../../../../types/storeUsers';

interface UserRolesManagerProps {
    roleConfigs?: Record<StoreUserRole, RoleConfig>;
    onSaveConfig?: (configs: Record<StoreUserRole, RoleConfig>) => Promise<void>;
    primaryColor?: string;
    readOnly?: boolean;
}

const UserRolesManager: React.FC<UserRolesManagerProps> = ({
    roleConfigs = DEFAULT_ROLE_CONFIGS,
    onSaveConfig,
    primaryColor = '#6366f1',
    readOnly = false,
}) => {
    const { t } = useTranslation();
    const [editingRole, setEditingRole] = useState<StoreUserRole | null>(null);
    const [configs, setConfigs] = useState<Record<StoreUserRole, RoleConfig>>(roleConfigs);
    const [isSaving, setIsSaving] = useState(false);

    const roleIcons: Record<StoreUserRole, React.ElementType> = {
        customer: User,
        vip: Crown,
        wholesale: Shield,
    };

    const handleEditRole = (role: StoreUserRole) => {
        setEditingRole(role);
    };

    const handleSaveRole = async () => {
        if (!onSaveConfig || !editingRole) return;

        setIsSaving(true);
        try {
            await onSaveConfig(configs);
            setEditingRole(null);
        } catch (err) {
            console.error('Error saving role config:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const updateConfig = (role: StoreUserRole, updates: Partial<RoleConfig>) => {
        setConfigs((prev) => ({
            ...prev,
            [role]: {
                ...prev[role],
                ...updates,
            },
        }));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                    {t('storeUsers.rolesConfiguration', 'Configuración de Roles')}
                </h3>
            </div>

            <div className="grid gap-4">
                {(['customer', 'vip', 'wholesale'] as StoreUserRole[]).map((role) => {
                    const config = configs[role];
                    const Icon = roleIcons[role];
                    const isEditing = editingRole === role;

                    return (
                        <div
                            key={role}
                            className={`bg-card rounded-xl border ${
                                isEditing ? 'border-primary' : 'border-border'
                            } overflow-hidden`}
                        >
                            {/* Header */}
                            <div
                                className="flex items-center justify-between p-4"
                                style={{ backgroundColor: `${config.color}10` }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="p-2 rounded-lg text-white"
                                        style={{ backgroundColor: config.color }}
                                    >
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground">{config.name}</h4>
                                        <p className="text-sm text-muted-foreground">{config.description}</p>
                                    </div>
                                </div>
                                {!readOnly && (
                                    <button
                                        onClick={() => isEditing ? handleSaveRole() : handleEditRole(role)}
                                        disabled={isSaving}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                                        style={isEditing ? { backgroundColor: primaryColor, color: 'white' } : {}}
                                    >
                                        {isSaving && isEditing ? (
                                            <Loader2 className="animate-spin" size={14} />
                                        ) : isEditing ? (
                                            <>
                                                <Save size={14} />
                                                {t('common.save', 'Guardar')}
                                            </>
                                        ) : (
                                            <>
                                                <Edit2 size={14} />
                                                {t('common.edit', 'Editar')}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-4">
                                {/* Discount */}
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                                        <Percent size={14} className="inline mr-1" />
                                        {t('storeUsers.discount', 'Descuento')}
                                    </label>
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={config.discount?.value || 0}
                                                onChange={(e) =>
                                                    updateConfig(role, {
                                                        discount: {
                                                            ...config.discount!,
                                                            type: 'percentage',
                                                            value: Number(e.target.value),
                                                            appliesTo: 'all',
                                                        },
                                                    })
                                                }
                                                className="w-20 px-3 py-1.5 bg-muted border border-border rounded-lg text-foreground"
                                                min={0}
                                                max={100}
                                            />
                                            <span className="text-muted-foreground">%</span>
                                        </div>
                                    ) : (
                                        <span className="text-foreground">
                                            {config.discount?.value || 0}% {t('storeUsers.onAllPurchases', 'en todas las compras')}
                                        </span>
                                    )}
                                </div>

                                {/* Upgrade Thresholds (only for customer to VIP) */}
                                {role === 'customer' && (
                                    <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                                <DollarSign size={14} className="inline mr-1" />
                                                {t('storeUsers.vipSpentThreshold', 'Gasto para VIP')}
                                            </label>
                                            {isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground">$</span>
                                                    <input
                                                        type="number"
                                                        value={configs.vip.minSpentForUpgrade || 0}
                                                        onChange={(e) =>
                                                            updateConfig('vip', {
                                                                minSpentForUpgrade: Number(e.target.value),
                                                            })
                                                        }
                                                        className="w-24 px-3 py-1.5 bg-muted border border-border rounded-lg text-foreground"
                                                        min={0}
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-foreground">
                                                    ${configs.vip.minSpentForUpgrade || 0}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                                <ShoppingBag size={14} className="inline mr-1" />
                                                {t('storeUsers.vipOrdersThreshold', 'Pedidos para VIP')}
                                            </label>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={configs.vip.minOrdersForUpgrade || 0}
                                                    onChange={(e) =>
                                                        updateConfig('vip', {
                                                            minOrdersForUpgrade: Number(e.target.value),
                                                        })
                                                    }
                                                    className="w-24 px-3 py-1.5 bg-muted border border-border rounded-lg text-foreground"
                                                    min={0}
                                                />
                                            ) : (
                                                <span className="text-foreground">
                                                    {configs.vip.minOrdersForUpgrade || 0} {t('storeUsers.orders', 'pedidos')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Permissions */}
                                <div className="pt-4 border-t border-border">
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                                        {t('storeUsers.permissions', 'Permisos')}
                                    </label>
                                    <div className="space-y-2">
                                        {Object.entries(config.permissions).map(([key, value]) => {
                                            const permissionLabels: Record<string, string> = {
                                                canViewWholesalePrices: t('storeUsers.permViewWholesale', 'Ver precios mayoristas'),
                                                canRequestQuotes: t('storeUsers.permRequestQuotes', 'Solicitar cotizaciones'),
                                                canAccessExclusiveProducts: t('storeUsers.permExclusiveProducts', 'Productos exclusivos'),
                                            };
                                            return (
                                                <div key={key} className="flex items-center justify-between">
                                                    <span className="text-sm text-foreground">
                                                        {permissionLabels[key] || key}
                                                    </span>
                                                    {isEditing ? (
                                                        <button
                                                            onClick={() =>
                                                                updateConfig(role, {
                                                                    permissions: {
                                                                        ...config.permissions,
                                                                        [key]: !value,
                                                                    },
                                                                })
                                                            }
                                                            className={`w-10 h-5 rounded-full relative transition-colors ${
                                                                value ? '' : 'bg-muted'
                                                            }`}
                                                            style={value ? { backgroundColor: primaryColor } : {}}
                                                        >
                                                            <span
                                                                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                                                    value ? 'translate-x-5' : 'translate-x-0.5'
                                                                }`}
                                                            />
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className={`p-1 rounded ${
                                                                value ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                                                            }`}
                                                        >
                                                            {value ? <Check size={14} /> : <X size={14} />}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default UserRolesManager;











