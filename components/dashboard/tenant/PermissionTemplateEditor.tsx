/**
 * PermissionTemplateEditor
 * Editor for creating and modifying permission templates
 */

import React, { useState, useEffect } from 'react';
import type { PermissionTemplate } from '../../../types/permissionTemplates';
import type { TenantPermissions, AgencyRole } from '../../../types/multiTenant';
import {
    getPermissionLabels,
    calculateRiskLevel,
    getGrantedPermissions,
    getRestrictedPermissions,
    isValidTemplateName,
} from '../../../types/permissionTemplates';
import {
    Shield,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Save,
    X,
    Info,
} from 'lucide-react';

interface PermissionTemplateEditorProps {
    template: PermissionTemplate | null;
    isCreating: boolean;
    onSave: (templateData: any) => Promise<void>;
    onCancel: () => void;
}

export function PermissionTemplateEditor({
    template,
    isCreating,
    onSave,
    onCancel,
}: PermissionTemplateEditorProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [role, setRole] = useState<AgencyRole>('agency_member');
    const [category, setCategory] = useState<PermissionTemplate['category']>('custom');
    const [permissions, setPermissions] = useState<TenantPermissions>({
        canManageProjects: false,
        canManageLeads: false,
        canManageCMS: false,
        canManageEcommerce: false,
        canManageFiles: false,
        canManageDomains: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canViewAnalytics: false,
        canManageBilling: false,
        canManageSettings: false,
        canExportData: false,
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (template) {
            setName(template.name);
            setDescription(template.description);
            setRole(template.role);
            setCategory(template.category || 'custom');
            setPermissions(template.permissions);
        }
    }, [template]);

    const permissionLabels = getPermissionLabels();
    const riskLevel = calculateRiskLevel(permissions);
    const grantedPerms = getGrantedPermissions(permissions);
    const restrictedPerms = getRestrictedPermissions(permissions);

    const handlePermissionToggle = (permKey: keyof TenantPermissions) => {
        setPermissions({
            ...permissions,
            [permKey]: !permissions[permKey],
        });
    };

    const handleSave = async () => {
        setError(null);

        // Validation
        if (!isValidTemplateName(name)) {
            setError('El nombre debe tener entre 3 y 50 caracteres');
            return;
        }

        if (!description || description.length < 10) {
            setError('La descripción debe tener al menos 10 caracteres');
            return;
        }

        if (grantedPerms.length === 0) {
            setError('Debes otorgar al menos un permiso');
            return;
        }

        setSaving(true);

        try {
            await onSave({
                name,
                description,
                role,
                category,
                permissions,
            });
        } catch (err: any) {
            setError(err.message || 'Error al guardar plantilla');
        } finally {
            setSaving(false);
        }
    };

    const permissionCategories = [
        {
            name: 'Contenido',
            permissions: ['canManageProjects', 'canManageCMS', 'canManageFiles'] as const,
        },
        {
            name: 'Ventas y Marketing',
            permissions: ['canManageLeads', 'canManageEcommerce', 'canExportData'] as const,
        },
        {
            name: 'Administración',
            permissions: [
                'canInviteMembers',
                'canRemoveMembers',
                'canManageSettings',
                'canManageBilling',
            ] as const,
        },
        {
            name: 'Técnico',
            permissions: ['canManageDomains', 'canViewAnalytics'] as const,
        },
    ];

    const getRiskBadge = () => {
        const styles = {
            low: {
                bg: 'bg-green-100 dark:bg-green-900/20',
                text: 'text-green-800 dark:text-green-400',
                label: 'Riesgo Bajo',
                icon: CheckCircle,
            },
            medium: {
                bg: 'bg-yellow-100 dark:bg-yellow-900/20',
                text: 'text-yellow-800 dark:text-yellow-400',
                label: 'Riesgo Medio',
                icon: AlertTriangle,
            },
            high: {
                bg: 'bg-red-100 dark:bg-red-900/20',
                text: 'text-red-800 dark:text-red-400',
                label: 'Riesgo Alto',
                icon: XCircle,
            },
        };

        const style = styles[riskLevel];
        const Icon = style.icon;

        return (
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${style.bg}`}>
                <Icon className={`h-5 w-5 ${style.text}`} />
                <span className={`font-medium ${style.text}`}>{style.label}</span>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {isCreating ? 'Nueva Plantilla' : 'Editar Plantilla'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {isCreating
                            ? 'Crea una plantilla personalizada de permisos'
                            : 'Modifica los permisos de esta plantilla'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Guardar Plantilla
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-900 dark:text-red-200">Error</h3>
                            <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Información Básica
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nombre de la Plantilla *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Editor de Contenido"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    {name.length}/50 caracteres
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Descripción *
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe para qué tipo de usuario es esta plantilla"
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Rol
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as AgencyRole)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="agency_member">Miembro</option>
                                        <option value="agency_admin">Admin</option>
                                        <option value="client">Cliente</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Categoría
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) =>
                                            setCategory(e.target.value as PermissionTemplate['category'])
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="content">Contenido</option>
                                        <option value="sales">Ventas</option>
                                        <option value="technical">Técnico</option>
                                        <option value="management">Gestión</option>
                                        <option value="custom">Personalizado</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Permissions */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Configurar Permisos
                        </h3>

                        <div className="space-y-6">
                            {permissionCategories.map((cat) => (
                                <div key={cat.name}>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                        {cat.name}
                                    </h4>
                                    <div className="space-y-2">
                                        {cat.permissions.map((permKey) => (
                                            <label
                                                key={permKey}
                                                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={permissions[permKey]}
                                                    onChange={() => handlePermissionToggle(permKey)}
                                                    className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                                                        {permissionLabels[permKey]}
                                                    </div>
                                                </div>
                                                {permissions[permKey] && (
                                                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Risk Level */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Análisis de Riesgo
                        </h3>
                        <div className="space-y-4">
                            {getRiskBadge()}

                            {riskLevel === 'high' && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-900 dark:text-red-200">
                                            Esta plantilla incluye permisos de alto riesgo. Úsala solo
                                            para usuarios de confianza.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {riskLevel === 'medium' && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-yellow-900 dark:text-yellow-200">
                                            Revisa cuidadosamente los permisos antes de asignar esta
                                            plantilla.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Resumen
                        </h3>
                        <dl className="space-y-3 text-sm">
                            <div>
                                <dt className="text-gray-600 dark:text-gray-400 mb-1">
                                    Permisos Activos
                                </dt>
                                <dd className="font-semibold text-gray-900 dark:text-white text-2xl">
                                    {grantedPerms.length}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-gray-600 dark:text-gray-400 mb-1">
                                    Permisos Restringidos
                                </dt>
                                <dd className="font-semibold text-gray-900 dark:text-white text-2xl">
                                    {restrictedPerms.length}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Granted Permissions */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Permisos Activos
                        </h3>
                        {grantedPerms.length > 0 ? (
                            <ul className="space-y-2">
                                {grantedPerms.map((perm, i) => (
                                    <li
                                        key={i}
                                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                                    >
                                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                        {perm}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                                No hay permisos activos
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
