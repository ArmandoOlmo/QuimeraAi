/**
 * UserSegmentsManager
 * Componente para gestionar segmentos de usuarios de tienda
 * Permite crear, editar y eliminar segmentos
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Tag,
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    Users,
    Loader2,
    AlertTriangle,
} from 'lucide-react';
import { UserSegment } from '../../../../types/storeUsers';

interface UserSegmentsManagerProps {
    segments: UserSegment[];
    onCreateSegment: (segment: Omit<UserSegment, 'id' | 'userCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onUpdateSegment: (segmentId: string, updates: Partial<UserSegment>) => Promise<void>;
    onDeleteSegment: (segmentId: string) => Promise<void>;
    primaryColor?: string;
}

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

const UserSegmentsManager: React.FC<UserSegmentsManagerProps> = ({
    segments,
    onCreateSegment,
    onUpdateSegment,
    onDeleteSegment,
    primaryColor = '#6366f1',
}) => {
    const { t } = useTranslation();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingSegment, setEditingSegment] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: PRESET_COLORS[0],
        type: 'manual' as 'manual' | 'automatic',
    });

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            color: PRESET_COLORS[0],
            type: 'manual',
        });
    };

    const handleCreate = async () => {
        if (!formData.name.trim()) return;

        setIsLoading(true);
        try {
            await onCreateSegment({
                name: formData.name.trim(),
                description: formData.description.trim(),
                color: formData.color,
                type: formData.type,
            });
            setShowCreateForm(false);
            resetForm();
        } catch (err) {
            console.error('Error creating segment:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async (segmentId: string) => {
        if (!formData.name.trim()) return;

        setIsLoading(true);
        try {
            await onUpdateSegment(segmentId, {
                name: formData.name.trim(),
                description: formData.description.trim(),
                color: formData.color,
            });
            setEditingSegment(null);
            resetForm();
        } catch (err) {
            console.error('Error updating segment:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (segmentId: string) => {
        setIsLoading(true);
        try {
            await onDeleteSegment(segmentId);
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Error deleting segment:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const startEditing = (segment: UserSegment) => {
        setEditingSegment(segment.id);
        setFormData({
            name: segment.name,
            description: segment.description || '',
            color: segment.color,
            type: segment.type,
        });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                    {t('storeUsers.segmentsTitle', 'Segmentos de Usuarios')}
                </h3>
                <button
                    onClick={() => {
                        resetForm();
                        setShowCreateForm(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Plus size={16} />
                    {t('storeUsers.createSegment', 'Crear Segmento')}
                </button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <div className="bg-card rounded-xl border border-primary p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-foreground">
                            {t('storeUsers.newSegment', 'Nuevo Segmento')}
                        </h4>
                        <button
                            onClick={() => setShowCreateForm(false)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                                {t('storeUsers.segmentName', 'Nombre')}
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t('storeUsers.segmentNamePlaceholder', 'Ej: Clientes frecuentes')}
                                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent"
                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                                {t('storeUsers.segmentDescription', 'Descripción')}
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t('storeUsers.segmentDescriptionPlaceholder', 'Descripción opcional')}
                                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent"
                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                {t('storeUsers.segmentColor', 'Color')}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setFormData({ ...formData, color })}
                                        className={`w-8 h-8 rounded-lg transition-transform ${
                                            formData.color === color ? 'scale-110 ring-2 ring-offset-2' : ''
                                        }`}
                                        style={{ backgroundColor: color, '--tw-ring-color': color } as React.CSSProperties}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-lg hover:bg-muted/80"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!formData.name.trim() || isLoading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {isLoading && <Loader2 className="animate-spin" size={14} />}
                                {t('common.create', 'Crear')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Segments List */}
            {segments.length === 0 && !showCreateForm ? (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                    <Tag className="mx-auto text-muted-foreground/50 mb-4" size={48} />
                    <h4 className="text-lg font-medium text-foreground mb-2">
                        {t('storeUsers.noSegments', 'No hay segmentos')}
                    </h4>
                    <p className="text-muted-foreground mb-4">
                        {t('storeUsers.createFirstSegment', 'Crea segmentos para organizar tus usuarios')}
                    </p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Plus size={16} />
                        {t('storeUsers.createSegment', 'Crear Segmento')}
                    </button>
                </div>
            ) : (
                <div className="grid gap-3">
                    {segments.map((segment) => {
                        const isEditing = editingSegment === segment.id;

                        if (isEditing) {
                            return (
                                <div
                                    key={segment.id}
                                    className="bg-card rounded-xl border border-primary p-4"
                                >
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                                                {t('storeUsers.segmentName', 'Nombre')}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-1">
                                                {t('storeUsers.segmentDescription', 'Descripción')}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                                {t('storeUsers.segmentColor', 'Color')}
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {PRESET_COLORS.map((color) => (
                                                    <button
                                                        key={color}
                                                        onClick={() => setFormData({ ...formData, color })}
                                                        className={`w-6 h-6 rounded-lg ${
                                                            formData.color === color ? 'ring-2 ring-offset-1' : ''
                                                        }`}
                                                        style={{ backgroundColor: color, '--tw-ring-color': color } as React.CSSProperties}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <button
                                                onClick={() => {
                                                    setEditingSegment(null);
                                                    resetForm();
                                                }}
                                                className="px-3 py-1.5 text-sm font-medium text-muted-foreground bg-muted rounded-lg"
                                            >
                                                {t('common.cancel', 'Cancelar')}
                                            </button>
                                            <button
                                                onClick={() => handleUpdate(segment.id)}
                                                disabled={!formData.name.trim() || isLoading}
                                                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                {isLoading && <Loader2 className="animate-spin" size={14} />}
                                                <Save size={14} />
                                                {t('common.save', 'Guardar')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={segment.id}
                                className="bg-card rounded-xl border border-border p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: `${segment.color}20` }}
                                    >
                                        <Tag size={20} style={{ color: segment.color }} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-foreground">{segment.name}</h4>
                                            <span
                                                className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                                                style={{ backgroundColor: segment.color }}
                                            >
                                                {segment.type === 'automatic' ? 'Auto' : 'Manual'}
                                            </span>
                                        </div>
                                        {segment.description && (
                                            <p className="text-sm text-muted-foreground">{segment.description}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            <Users size={12} />
                                            {segment.userCount} {t('storeUsers.users', 'usuarios')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => startEditing(segment)}
                                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(segment.id)}
                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <>
                    <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setDeleteConfirm(null)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-xl border border-border shadow-2xl z-50 p-6">
                        <div className="flex items-center gap-3 mb-4 text-red-500">
                            <AlertTriangle size={24} />
                            <h3 className="text-lg font-semibold">
                                {t('storeUsers.deleteSegment', 'Eliminar Segmento')}
                            </h3>
                        </div>
                        <p className="text-muted-foreground mb-6">
                            {t('storeUsers.deleteSegmentWarning', '¿Estás seguro de que deseas eliminar este segmento? Los usuarios asignados perderán este segmento.')}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80"
                            >
                                {t('common.cancel', 'Cancelar')}
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600"
                            >
                                {isLoading && <Loader2 className="animate-spin" size={14} />}
                                {t('common.delete', 'Eliminar')}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default UserSegmentsManager;











