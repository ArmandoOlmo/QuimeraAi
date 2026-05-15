/**
 * VisualIdentityKitManager
 * Dashboard section to manage project visual identity references.
 * Embedded in AssetsDashboard and accessible from ImageGeneratorPanel.
 */

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useProject } from '../../../contexts/project';
import { useVisualIdentityKit } from '../../../hooks/useVisualIdentityKit';
import {
    IMAGE_REFERENCE_CATEGORY_LABELS,
    IMAGE_REFERENCE_CATEGORY_COLORS,
} from '../../../types/visualIdentity';
import type { ImageReferenceCategory, VisualReference } from '../../../types/visualIdentity';
import {
    X, Plus, Trash2, Edit3, Palette, Star, Tag,
    Zap, Image as ImageIcon, Layers, ArrowUpDown, CheckCircle2
} from 'lucide-react';
import ImagePicker from '../../ui/ImagePicker';

interface VisualIdentityKitManagerProps {
    /** Called when user wants to close/return */
    onBack?: () => void;
    /** Optional project ID override */
    projectId?: string;
    /** `admin` = platform admin kit (templates / admin content), default `project` */
    kitScope?: 'project' | 'admin';
}

const CATEGORIES: ImageReferenceCategory[] = [
    'character', 'background', 'product', 'element',
    'style', 'environment', 'prop', 'lighting'
];

const USAGE_OPTIONS = [
    { value: 'always', label: 'Siempre', desc: 'Se incluye en toda generacion' },
    { value: 'optional', label: 'Opcional', desc: 'Disponible pero no automatico' },
    { value: 'contextual', label: 'Contextual', desc: 'Solo si el prompt lo menciona' },
] as const;

export default function VisualIdentityKitManager({ onBack, projectId, kitScope = 'project' }: VisualIdentityKitManagerProps) {
    const { t } = useTranslation();
    const { activeProjectId } = useProject();
    const effectiveProjectId = projectId || activeProjectId;
    const {
        kit, isLoading, error,
        defaultReferences, addReference, updateReference, deleteReference, reload
    } = useVisualIdentityKit(effectiveProjectId);

    const [editingRef, setEditingRef] = useState<VisualReference | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCategory, setNewCategory] = useState<ImageReferenceCategory>('character');
    const [newLabel, setNewLabel] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newHint, setNewHint] = useState('');
    const [newUsage, setNewUsage] = useState<'always' | 'optional' | 'contextual'>('optional');
    const [newTriggers, setNewTriggers] = useState('');
    const [newPosition, setNewPosition] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [selectedForAdd, setSelectedForAdd] = useState(false);

    // Edit modal state
    const [editLabel, setEditLabel] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editHint, setEditHint] = useState('');
    const [editUsage, setEditUsage] = useState<'always' | 'optional' | 'contextual'>('optional');
    const [editTriggers, setEditTriggers] = useState('');
    const [editPosition, setEditPosition] = useState('');
    const [editImageUrl, setEditImageUrl] = useState('');
    const [editIsDefault, setEditIsDefault] = useState(false);
    const [editCategory, setEditCategory] = useState<ImageReferenceCategory>('character');

    const openEditModal = useCallback((ref: VisualReference) => {
        setEditingRef(ref);
        setEditLabel(ref.label);
        setEditDescription(ref.description || '');
        setEditHint(ref.aiPromptHint || '');
        setEditUsage(ref.usage);
        setEditTriggers(ref.contextualTriggers?.join(', ') || '');
        setEditPosition(ref.position || '');
        setEditImageUrl(ref.imageUrl);
        setEditIsDefault(ref.isDefault);
        setEditCategory(ref.category);
    }, []);

    const handleSaveEdit = useCallback(async () => {
        if (!editingRef) return;
        await updateReference(editingRef.id, {
            label: editLabel,
            description: editDescription || undefined,
            aiPromptHint: editHint || undefined,
            usage: editUsage,
            contextualTriggers: editUsage === 'contextual' ? editTriggers.split(',').map(s => s.trim()).filter(Boolean) : undefined,
            position: editPosition || undefined,
            imageUrl: editImageUrl,
            isDefault: editIsDefault,
            category: editCategory,
        });
        setEditingRef(null);
    }, [editingRef, editLabel, editDescription, editHint, editUsage, editTriggers, editPosition, editImageUrl, editIsDefault, editCategory, updateReference]);

    const handleAdd = useCallback(async () => {
        if (!newImageUrl || !newLabel.trim()) return;
        await addReference({
            projectId: effectiveProjectId || '',
            category: newCategory,
            label: newLabel.trim(),
            description: newDescription || undefined,
            imageUrl: newImageUrl,
            aiPromptHint: newHint || undefined,
            usage: newUsage,
            contextualTriggers: newUsage === 'contextual' ? newTriggers.split(',').map(s => s.trim()).filter(Boolean) : undefined,
            position: newPosition || undefined,
            isDefault: false,
            sortOrder: (kit?.references.length || 0),
        });
        setShowAddModal(false);
        setNewLabel('');
        setNewDescription('');
        setNewHint('');
        setNewUsage('optional');
        setNewTriggers('');
        setNewPosition('');
        setNewImageUrl('');
        setSelectedForAdd(false);
    }, [newImageUrl, newLabel, newDescription, newHint, newUsage, newTriggers, newPosition, newCategory, effectiveProjectId, kit, addReference]);

    const handleDelete = useCallback(async (id: string) => {
        if (window.confirm('Delete this reference? This cannot be undone.')) {
            await deleteReference(id);
        }
    }, [deleteReference]);

    const toggleDefault = useCallback(async (ref: VisualReference) => {
        await updateReference(ref.id, { isDefault: !ref.isDefault });
    }, [updateReference]);

    // Group references by category
    const groupedRefs = new Map<ImageReferenceCategory, VisualReference[]>();
    CATEGORIES.forEach(cat => groupedRefs.set(cat, []));
    kit?.references.forEach(ref => {
        const group = groupedRefs.get(ref.category);
        if (group) group.push(ref);
    });

    const totalRefs = kit?.references.length || 0;
    const activeRefs = defaultReferences.length;

    return (
        <div className="h-full flex flex-col bg-q-bg">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-q-border bg-q-surface/80 backdrop-blur-md px-6 py-4 shrink-0">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="p-1.5 hover:bg-q-bg rounded-lg text-q-text-secondary hover:text-q-text transition-colors">
                            <X size={20} />
                        </button>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-q-accent/10 flex items-center justify-center">
                            <Palette size={18} className="text-q-accent" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-q-text">
                                {kitScope === 'admin'
                                    ? t('visualKit.adminTitle', { defaultValue: 'Kit visual de administración' })
                                    : t('visualKit.title', { defaultValue: 'Kit Visual del Proyecto' })}
                            </h2>
                            <p className="text-xs text-q-text-secondary">
                                {kitScope === 'admin'
                                    ? t('visualKit.adminSubtitle', {
                                        defaultValue: 'Referencias para plantillas, artículos y contenido de la plataforma.',
                                    })
                                    : `${totalRefs} ${t('visualKit.references', { defaultValue: 'referencias' })} (${activeRefs} ${t('visualKit.active', { defaultValue: 'activas' })})`}
                            </p>
                            {kitScope === 'admin' && (
                                <p className="text-[11px] text-q-text-secondary/80 mt-0.5">
                                    {totalRefs} {t('visualKit.references', { defaultValue: 'referencias' })} · {activeRefs} {t('visualKit.active', { defaultValue: 'activas' })}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-q-accent hover:bg-q-accent/80 text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                    >
                        <Plus size={16} />
                        <span>{t('visualKit.addReference', { defaultValue: 'Añadir Referencia' })}</span>
                    </button>
                </div>
            </header>

            {kitScope === 'admin' && (
                <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-200/90">
                    {t('visualKit.adminScopeBanner', {
                        defaultValue: 'Estas referencias se usan al generar imágenes en esta librería de administración.',
                    })}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-q-text-secondary">
                        <span>{t('common.loading', { defaultValue: 'Loading...' })}</span>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full text-red-400">
                        <span>{error}</span>
                    </div>
                ) : totalRefs === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-20">
                        <div className="w-20 h-20 rounded-3xl bg-q-surface flex items-center justify-center">
                            <Layers size={36} className="text-q-text-secondary/40" />
                        </div>
                        <h3 className="text-lg font-semibold text-q-text">
                            {t('visualKit.emptyTitle', { defaultValue: 'Sin referencias visuales' })}
                        </h3>
                        <p className="text-sm text-q-text-secondary max-w-md">
                            {t('visualKit.emptyDesc', { defaultValue: 'Añade referencias visuales para mantener consistencia en todas las imagenes generadas. Define personajes, fondos, elementos y estilos que el AI usara como guia.' })}
                        </p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 bg-q-accent hover:bg-q-accent/80 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-colors mt-2"
                        >
                            <Plus size={18} />
                            <span>{t('visualKit.addFirst', { defaultValue: 'Añadir Primera Referencia' })}</span>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {CATEGORIES.map(category => {
                            const refs = groupedRefs.get(category) || [];
                            if (refs.length === 0) return null;
                            return (
                                <div key={category}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${IMAGE_REFERENCE_CATEGORY_COLORS[category]}`}>
                                            {IMAGE_REFERENCE_CATEGORY_LABELS[category]}
                                        </span>
                                        <span className="text-xs text-q-text-secondary">({refs.length})</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {refs.map(ref => {
                                            const isActive = defaultReferences.some(r => r.id === ref.id);
                                            return (
                                                <div
                                                    key={ref.id}
                                                    className={`bg-q-surface rounded-xl border overflow-hidden transition-all group hover:border-q-accent/30 ${isActive ? 'ring-1 ring-q-accent/40' : 'border-q-border'}`}
                                                >
                                                    {/* Thumbnail */}
                                                    <div className="aspect-video bg-q-bg relative overflow-hidden">
                                                        <img
                                                            src={ref.thumbnailUrl || ref.imageUrl}
                                                            alt={ref.label}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => openEditModal(ref)}
                                                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(ref.id)}
                                                                className="p-2 rounded-lg bg-white/10 hover:bg-red-500/50 text-white opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                        {/* Usage badge */}
                                                        <span className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                            ref.usage === 'always' ? 'bg-green-500/80 text-white' :
                                                            ref.usage === 'contextual' ? 'bg-blue-500/80 text-white' :
                                                            'bg-q-surface/80 text-q-text-secondary'
                                                        }`}>
                                                            {ref.usage === 'always' ? 'Siempre' : ref.usage === 'contextual' ? 'Contextual' : 'Opcional'}
                                                        </span>
                                                    </div>
                                                    {/* Info */}
                                                    <div className="p-3">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <h4 className="text-sm font-semibold text-q-text truncate">{ref.label}</h4>
                                                            <button
                                                                onClick={() => toggleDefault(ref)}
                                                                className={`shrink-0 ${ref.isDefault ? 'text-q-accent' : 'text-q-text-secondary/30 hover:text-q-text-secondary'}`}
                                                                title={ref.isDefault ? 'Default reference' : 'Set as default'}
                                                            >
                                                                <Star size={14} fill={ref.isDefault ? 'currentColor' : 'none'} />
                                                            </button>
                                                        </div>
                                                        {ref.aiPromptHint && (
                                                            <p className="text-[11px] text-q-text-secondary mt-1 line-clamp-2 leading-tight">
                                                                <Tag size={10} className="inline mr-1" />
                                                                {ref.aiPromptHint}
                                                            </p>
                                                        )}
                                                        {ref.position && (
                                                            <p className="text-[10px] text-q-accent/70 mt-1">
                                                                Posicion: {ref.position}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
                    <div
                        className="bg-q-surface border border-q-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-q-border">
                            <h3 className="text-lg font-bold text-q-text">
                                {t('visualKit.addReference', { defaultValue: 'Añadir Referencia' })}
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-q-bg rounded-lg text-q-text-secondary hover:text-q-text transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Image */}
                            <div>
                                <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">
                                    {t('visualKit.image', { defaultValue: 'Imagen' })}
                                </label>
                                {!selectedForAdd ? (
                                    <div className="space-y-3">
                                        <ImagePicker
                                            label=""
                                            value={newImageUrl}
                                            onChange={(url) => { setNewImageUrl(url); setSelectedForAdd(true); }}
                                            destination="user"
                                        />
                                        <input
                                            type="text"
                                            value={newImageUrl}
                                            onChange={(e) => { setNewImageUrl(e.target.value); if (e.target.value) setSelectedForAdd(true); }}
                                            placeholder={t('visualKit.pasteUrl', { defaultValue: 'O pega URL...' })}
                                            className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-xs text-q-text focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <img src={newImageUrl} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-q-border" />
                                        <button
                                            onClick={() => { setNewImageUrl(''); setSelectedForAdd(false); }}
                                            className="text-xs text-q-text-secondary hover:text-q-text"
                                        >
                                            {t('visualKit.changeImage', { defaultValue: 'Cambiar imagen' })}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">Categoria</label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setNewCategory(cat)}
                                            className={`text-[10px] font-medium px-2 py-1.5 rounded-lg border transition-colors ${newCategory === cat ? IMAGE_REFERENCE_CATEGORY_COLORS[cat] + ' ring-1 ring-current/30' : 'border-q-border text-q-text-secondary hover:border-q-accent/30'}`}
                                        >
                                            {IMAGE_REFERENCE_CATEGORY_LABELS[cat]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Label */}
                            <div>
                                <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">Etiqueta</label>
                                <input
                                    type="text"
                                    value={newLabel}
                                    onChange={e => setNewLabel(e.target.value)}
                                    placeholder="Ej: Mascota de marca frontal"
                                    className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-sm text-q-text focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">Descripcion</label>
                                <textarea
                                    value={newDescription}
                                    onChange={e => setNewDescription(e.target.value)}
                                    placeholder="Descripcion opcional de la referencia..."
                                    rows={2}
                                    className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-xs text-q-text focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none resize-none"
                                />
                            </div>

                            {/* AI Prompt Hint */}
                            <div>
                                <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">
                                    Instruccion para AI (Prompt Hint)
                                </label>
                                <textarea
                                    value={newHint}
                                    onChange={e => setNewHint(e.target.value)}
                                    placeholder="Ej: This character MUST appear in the image. Blue chimera with golden wings, friendly expression."
                                    rows={2}
                                    className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-xs text-q-text focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none resize-none"
                                />
                            </div>

                            {/* Usage */}
                            <div>
                                <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">Uso</label>
                                <div className="space-y-1.5">
                                    {USAGE_OPTIONS.map(opt => (
                                        <label key={opt.value} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${newUsage === opt.value ? 'border-q-accent bg-q-accent/5' : 'border-q-border hover:border-q-accent/30'}`}>
                                            <input
                                                type="radio"
                                                name="usage-add"
                                                value={opt.value}
                                                checked={newUsage === opt.value}
                                                onChange={() => setNewUsage(opt.value as typeof newUsage)}
                                                className="accent-q-accent"
                                            />
                                            <div>
                                                <span className="text-sm font-medium text-q-text">{opt.label}</span>
                                                <p className="text-[10px] text-q-text-secondary">{opt.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Contextual triggers (only if contextual) */}
                            {newUsage === 'contextual' && (
                                <div>
                                    <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">Palabras clave (separadas por coma)</label>
                                    <input
                                        type="text"
                                        value={newTriggers}
                                        onChange={e => setNewTriggers(e.target.value)}
                                        placeholder="Ej: oficina, corporativo, interior"
                                        className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-xs text-q-text focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none"
                                    />
                                </div>
                            )}

                            {/* Position */}
                            <div>
                                <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">Posicion (opcional)</label>
                                <input
                                    type="text"
                                    value={newPosition}
                                    onChange={e => setNewPosition(e.target.value)}
                                    placeholder="Ej: right-third, center, bottom-left"
                                    className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-xs text-q-text focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-q-border">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-sm text-q-text-secondary hover:text-q-text transition-colors"
                            >
                                {t('common.cancel', { defaultValue: 'Cancelar' })}
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={!newImageUrl || !newLabel.trim()}
                                className="flex items-center gap-2 bg-q-accent hover:bg-q-accent/80 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold transition-colors"
                            >
                                <CheckCircle2 size={16} />
                                <span>{t('visualKit.addReference', { defaultValue: 'Añadir' })}</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Modal */}
            {editingRef && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingRef(null)}>
                    <div
                        className="bg-q-surface border border-q-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-q-border">
                            <h3 className="text-lg font-bold text-q-text">Editar Referencia</h3>
                            <button onClick={() => setEditingRef(null)} className="p-1.5 hover:bg-q-bg rounded-lg text-q-text-secondary hover:text-q-text transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Preview */}
                            <div className="flex items-center gap-3 p-3 bg-q-bg rounded-xl">
                                <img src={editImageUrl} alt="Preview" className="w-14 h-14 rounded-lg object-cover border border-q-border" />
                                <div>
                                    <span className="text-sm font-semibold text-q-text block">{editLabel}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border mt-1 inline-block ${IMAGE_REFERENCE_CATEGORY_COLORS[editCategory]}`}>
                                        {IMAGE_REFERENCE_CATEGORY_LABELS[editCategory]}
                                    </span>
                                </div>
                            </div>

                            {/* Label */}
                            <div>
                                <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">Etiqueta</label>
                                <input type="text" value={editLabel} onChange={e => setEditLabel(e.target.value)} className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-sm text-q-text focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none" />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">Descripcion</label>
                                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-xs text-q-text focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none resize-none" />
                            </div>

                            {/* AI Prompt Hint */}
                            <div>
                                <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">Instruccion para AI (Prompt Hint)</label>
                                <textarea value={editHint} onChange={e => setEditHint(e.target.value)} rows={2} className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-xs text-q-text focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none resize-none" />
                            </div>

                            {/* Usage */}
                            <div>
                                <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">Uso</label>
                                <div className="space-y-1.5">
                                    {USAGE_OPTIONS.map(opt => (
                                        <label key={opt.value} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${editUsage === opt.value ? 'border-q-accent bg-q-accent/5' : 'border-q-border hover:border-q-accent/30'}`}>
                                            <input type="radio" name="usage-edit" value={opt.value} checked={editUsage === opt.value} onChange={() => setEditUsage(opt.value as typeof editUsage)} className="accent-q-accent" />
                                            <div>
                                                <span className="text-sm font-medium text-q-text">{opt.label}</span>
                                                <p className="text-[10px] text-q-text-secondary">{opt.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {editUsage === 'contextual' && (
                                <div>
                                    <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">Palabras clave</label>
                                    <input type="text" value={editTriggers} onChange={e => setEditTriggers(e.target.value)} placeholder="oficina, corporativo, interior" className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-xs text-q-text focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none" />
                                </div>
                            )}

                            {/* Position */}
                            <div>
                                <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide block mb-2">Posicion (opcional)</label>
                                <input type="text" value={editPosition} onChange={e => setEditPosition(e.target.value)} placeholder="right-third, center" className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-xs text-q-text focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none" />
                            </div>

                            {/* Default toggle */}
                            <label className="flex items-center gap-3 p-3 bg-q-bg rounded-xl cursor-pointer">
                                <input type="checkbox" checked={editIsDefault} onChange={e => setEditIsDefault(e.target.checked)} className="accent-q-accent rounded" />
                                <div>
                                    <span className="text-sm font-medium text-q-text">Referencia por defecto</span>
                                    <p className="text-[10px] text-q-text-secondary">Se carga automaticamente al abrir el generador</p>
                                </div>
                            </label>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-q-border">
                            <button onClick={() => setEditingRef(null)} className="px-4 py-2 text-sm text-q-text-secondary hover:text-q-text transition-colors">Cancelar</button>
                            <button onClick={handleSaveEdit} className="flex items-center gap-2 bg-q-accent hover:bg-q-accent/80 text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold transition-colors">
                                <CheckCircle2 size={16} />
                                <span>Guardar</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
