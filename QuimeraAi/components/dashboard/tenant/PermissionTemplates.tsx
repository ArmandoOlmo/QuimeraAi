/**
 * PermissionTemplates
 * Manage permission templates for team members
 */

import React, { useState, useEffect } from 'react';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { db } from '../../../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import type { PermissionTemplate } from '../../../types/permissionTemplates';
import {
    SYSTEM_PERMISSION_TEMPLATES,
    getCategoryLabel,
    getCategoryColor,
    getGrantedPermissions,
    calculateRiskLevel,
} from '../../../types/permissionTemplates';
import {
    Shield,
    Plus,
    Edit2,
    Trash2,
    Copy,
    Star,
    Users,
    AlertTriangle,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import { PermissionTemplateEditor } from './PermissionTemplateEditor';

export function PermissionTemplates() {
    const { currentTenant, user } = useTenant();
    const [systemTemplates] = useState(SYSTEM_PERMISSION_TEMPLATES);
    const [customTemplates, setCustomTemplates] = useState<PermissionTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<PermissionTemplate | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

    useEffect(() => {
        loadCustomTemplates();
    }, [currentTenant]);

    const loadCustomTemplates = async () => {
        if (!currentTenant) return;

        setLoading(true);
        setError(null);

        try {
            const templatesQuery = query(
                collection(db, 'permissionTemplates'),
                where('tenantId', '==', currentTenant.id),
                where('isSystem', '==', false)
            );

            const snapshot = await getDocs(templatesQuery);
            const templates: PermissionTemplate[] = [];

            snapshot.forEach((doc) => {
                templates.push({
                    id: doc.id,
                    ...doc.data(),
                } as PermissionTemplate);
            });

            setCustomTemplates(templates);
        } catch (err: any) {
            console.error('Error loading templates:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTemplate = () => {
        setSelectedTemplate(null);
        setIsCreating(true);
        setIsEditing(true);
    };

    const handleEditTemplate = (template: PermissionTemplate) => {
        setSelectedTemplate(template);
        setIsCreating(false);
        setIsEditing(true);
    };

    const handleDuplicateTemplate = async (template: PermissionTemplate) => {
        if (!currentTenant || !user) return;

        try {
            const newTemplate = {
                ...template,
                id: undefined,
                name: `${template.name} (Copia)`,
                isSystem: false,
                tenantId: currentTenant.id,
                createdBy: user.uid,
                createdAt: Timestamp.now(),
                usageCount: 0,
            };

            delete (newTemplate as any).id;

            await addDoc(collection(db, 'permissionTemplates'), newTemplate);
            await loadCustomTemplates();
        } catch (err: any) {
            console.error('Error duplicating template:', err);
            setError(err.message);
        }
    };

    const handleDeleteTemplate = (templateId: string) => {
        setDeleteTemplateId(templateId);
    };

    const confirmDeleteTemplate = async () => {
        if (!deleteTemplateId) return;
        const id = deleteTemplateId;
        setDeleteTemplateId(null);

        try {
            await deleteDoc(doc(db, 'permissionTemplates', id));
            await loadCustomTemplates();
        } catch (err: any) {
            console.error('Error deleting template:', err);
            setError(err.message);
        }
    };

    const handleSaveTemplate = async (templateData: any) => {
        if (!currentTenant || !user) return;

        try {
            if (isCreating) {
                // Create new template
                await addDoc(collection(db, 'permissionTemplates'), {
                    ...templateData,
                    tenantId: currentTenant.id,
                    isSystem: false,
                    createdBy: user.uid,
                    createdAt: Timestamp.now(),
                    usageCount: 0,
                });
            } else if (selectedTemplate) {
                // Update existing template
                await updateDoc(doc(db, 'permissionTemplates', selectedTemplate.id), {
                    ...templateData,
                    updatedAt: Timestamp.now(),
                });
            }

            await loadCustomTemplates();
            setIsEditing(false);
            setSelectedTemplate(null);
        } catch (err: any) {
            console.error('Error saving template:', err);
            throw err;
        }
    };

    const getRiskBadge = (riskLevel: 'low' | 'medium' | 'high') => {
        const styles = {
            low: {
                bg: 'bg-green-100 dark:bg-green-900/20',
                text: 'text-green-800 dark:text-green-400',
                label: 'Riesgo Bajo',
            },
            medium: {
                bg: 'bg-yellow-100 dark:bg-yellow-900/20',
                text: 'text-yellow-800 dark:text-yellow-400',
                label: 'Riesgo Medio',
            },
            high: {
                bg: 'bg-red-100 dark:bg-red-900/20',
                text: 'text-red-800 dark:text-red-400',
                label: 'Riesgo Alto',
            },
        };

        const style = styles[riskLevel];

        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
            >
                {riskLevel === 'high' && <AlertTriangle className="h-3 w-3" />}
                {riskLevel === 'medium' && <Shield className="h-3 w-3" />}
                {riskLevel === 'low' && <CheckCircle className="h-3 w-3" />}
                {style.label}
            </span>
        );
    };

    if (isEditing) {
        return (
            <PermissionTemplateEditor
                template={selectedTemplate}
                isCreating={isCreating}
                onSave={handleSaveTemplate}
                onCancel={() => {
                    setIsEditing(false);
                    setSelectedTemplate(null);
                }}
            />
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Plantillas de Permisos
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Crea plantillas reutilizables para roles específicos
                    </p>
                </div>
                <button
                    onClick={handleCreateTemplate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    Nueva Plantilla
                </button>
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

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* System Templates */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-500" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Plantillas del Sistema
                            </h2>
                        </div>

                        <div className="space-y-3">
                            {systemTemplates.map((template, index) => {
                                const grantedPerms = getGrantedPermissions(template.permissions);
                                const riskLevel = calculateRiskLevel(template.permissions);

                                return (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setSelectedTemplate({
                                                id: `system-${index}`,
                                                tenantId: currentTenant?.id || '',
                                                createdBy: 'system',
                                                createdAt: Timestamp.now(),
                                                ...template,
                                            });
                                        }}
                                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedTemplate?.name === template.name
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {template.name}
                                            </h3>
                                            <span
                                                className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(
                                                    template.category
                                                )}`}
                                            >
                                                {getCategoryLabel(template.category)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                            {template.description}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500 dark:text-gray-500">
                                                {grantedPerms.length} permisos
                                            </span>
                                            {getRiskBadge(riskLevel)}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-900 dark:text-blue-200">
                                <strong>Tip:</strong> Puedes duplicar plantillas del sistema para
                                personalizarlas
                            </p>
                        </div>
                    </div>

                    {/* Custom Templates */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Plantillas Personalizadas ({customTemplates.length})
                            </h2>
                        </div>

                        {customTemplates.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12">
                                <div className="text-center">
                                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        No hay plantillas personalizadas
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                                        Crea tu primera plantilla o duplica una del sistema
                                    </p>
                                    <button
                                        onClick={handleCreateTemplate}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <Plus className="h-5 w-5" />
                                        Crear Primera Plantilla
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {customTemplates.map((template) => {
                                    const grantedPerms = getGrantedPermissions(template.permissions);
                                    const riskLevel = calculateRiskLevel(template.permissions);

                                    return (
                                        <div
                                            key={template.id}
                                            className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-4 transition-all ${selectedTemplate?.id === template.id
                                                    ? 'border-blue-500'
                                                    : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                                            {template.name}
                                                        </h3>
                                                        {template.category && (
                                                            <span
                                                                className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(
                                                                    template.category
                                                                )}`}
                                                            >
                                                                {getCategoryLabel(template.category)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                        {template.description}
                                                    </p>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs text-gray-500 dark:text-gray-500">
                                                            {grantedPerms.length} permisos activos
                                                        </span>
                                                        {getRiskBadge(riskLevel)}
                                                        {template.usageCount && template.usageCount > 0 && (
                                                            <span className="text-xs text-gray-500 dark:text-gray-500">
                                                                Usado {template.usageCount} veces
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditTemplate(template)}
                                                        className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDuplicateTemplate(template)}
                                                        className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                                                        title="Duplicar"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTemplate(template.id)}
                                                        className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Permission Preview */}
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                <button
                                                    onClick={() => setSelectedTemplate(template)}
                                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                                                >
                                                    Ver detalles →
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Selected Template Details */}
            {selectedTemplate && !isEditing && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Detalles de la Plantilla
                        </h3>
                        <div className="flex items-center gap-2">
                            {!selectedTemplate.isSystem && (
                                <button
                                    onClick={() => handleEditTemplate(selectedTemplate)}
                                    className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                                >
                                    Editar Plantilla
                                </button>
                            )}
                            <button
                                onClick={() => handleDuplicateTemplate(selectedTemplate)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Duplicar
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                Permisos Otorgados
                            </h4>
                            <ul className="space-y-2">
                                {getGrantedPermissions(selectedTemplate.permissions).map((perm, i) => (
                                    <li
                                        key={i}
                                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                                    >
                                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                        {perm}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                Información
                            </h4>
                            <dl className="space-y-2 text-sm">
                                <div>
                                    <dt className="text-gray-600 dark:text-gray-400">Rol:</dt>
                                    <dd className="font-medium text-gray-900 dark:text-white">
                                        {selectedTemplate.role}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-600 dark:text-gray-400">
                                        Nivel de Riesgo:
                                    </dt>
                                    <dd className="mt-1">
                                        {getRiskBadge(calculateRiskLevel(selectedTemplate.permissions))}
                                    </dd>
                                </div>
                                {selectedTemplate.usageCount && selectedTemplate.usageCount > 0 && (
                                    <div>
                                        <dt className="text-gray-600 dark:text-gray-400">Uso:</dt>
                                        <dd className="font-medium text-gray-900 dark:text-white">
                                            {selectedTemplate.usageCount} veces
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmationModal
                isOpen={!!deleteTemplateId}
                onConfirm={confirmDeleteTemplate}
                onCancel={() => setDeleteTemplateId(null)}
                title="¿Eliminar plantilla?"
                message="¿Estás seguro de eliminar esta plantilla? Esta acción no se puede deshacer."
                variant="danger"
            />
        </div>
    );
}
