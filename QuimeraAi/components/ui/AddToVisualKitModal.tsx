/**
 * AddToVisualKitModal
 * Quick modal to categorize and save a generated image as a visual identity reference.
 * Opens from ImageGeneratorPanel results.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useProject } from '../../contexts/project';
import { useVisualIdentityKit } from '../../hooks/useVisualIdentityKit';
import {
    IMAGE_REFERENCE_CATEGORY_LABELS,
    IMAGE_REFERENCE_CATEGORY_COLORS,
} from '../../types/visualIdentity';
import type { ImageReferenceCategory } from '../../types/visualIdentity';
import { X, CheckCircle2 } from 'lucide-react';

interface AddToVisualKitModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Pre-populated image URL (from generation result) */
    imageUrl: string;
    /** Optional project ID */
    projectId?: string;
}

const CATEGORIES: ImageReferenceCategory[] = [
    'character', 'background', 'product', 'element',
    'style', 'environment', 'prop', 'lighting'
];

export default function AddToVisualKitModal({ isOpen, onClose, imageUrl, projectId }: AddToVisualKitModalProps) {
    const { t } = useTranslation();
    const { activeProjectId } = useProject();
    const { addReference } = useVisualIdentityKit(projectId || activeProjectId);

    const [category, setCategory] = useState<ImageReferenceCategory>('character');
    const [label, setLabel] = useState('');
    const [aiPromptHint, setAiPromptHint] = useState('');
    const [usage, setUsage] = useState<'always' | 'optional' | 'contextual'>('optional');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!imageUrl || !label.trim()) return;
        setIsSaving(true);
        try {
            await addReference({
                projectId: projectId || activeProjectId || '',
                category,
                label: label.trim(),
                imageUrl,
                aiPromptHint: aiPromptHint || undefined,
                usage,
                isDefault: usage === 'always',
                sortOrder: 0,
            });
            onClose();
        } catch (err) {
            console.error('[AddToVisualKitModal] Failed to save:', err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-q-text/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-q-surface border border-q-border rounded-2xl shadow-2xl w-full max-w-sm mx-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-q-border">
                    <h3 className="text-sm font-bold text-q-text">
                        {t('visualKit.saveToKit', { defaultValue: 'Guardar en Kit Visual' })}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-q-bg rounded-lg text-q-text-secondary hover:text-q-text transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    {/* Preview */}
                    <div className="aspect-video bg-q-bg rounded-xl overflow-hidden border border-q-border">
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wide block mb-1.5">Categoria</label>
                        <div className="grid grid-cols-4 gap-1">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`text-[9px] font-medium px-1.5 py-1 rounded-md border transition-colors ${category === cat ? IMAGE_REFERENCE_CATEGORY_COLORS[cat] + ' ring-1 ring-current/30' : 'border-q-border text-q-text-secondary hover:border-q-accent/30'}`}
                                >
                                    {IMAGE_REFERENCE_CATEGORY_LABELS[cat]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Label */}
                    <div>
                        <label className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wide block mb-1.5">Etiqueta</label>
                        <input
                            type="text"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder={t('visualKit.labelPlaceholder', { defaultValue: 'Ej: Personaje principal' })}
                            className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-xs text-q-text focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none"
                        />
                    </div>

                    {/* AI Prompt Hint */}
                    <div>
                        <label className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wide block mb-1.5">Instruccion para AI</label>
                        <textarea
                            value={aiPromptHint}
                            onChange={e => setAiPromptHint(e.target.value)}
                            placeholder={t('visualKit.hintPlaceholder', { defaultValue: 'Ej: This character MUST appear...' })}
                            rows={2}
                            className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-[11px] text-q-text focus:ring-1 focus:ring-q-accent focus:border-q-accent outline-none resize-none"
                        />
                    </div>

                    {/* Usage */}
                    <div>
                        <label className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wide block mb-1.5">Uso</label>
                        <div className="flex gap-1.5">
                            {(['always', 'optional', 'contextual'] as const).map(u => (
                                <button
                                    key={u}
                                    onClick={() => setUsage(u)}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${usage === u ? 'bg-q-accent/10 border-q-accent text-q-accent' : 'border-q-border text-q-text-secondary hover:border-q-accent/30'}`}
                                >
                                    {u === 'always' ? 'Siempre' : u === 'optional' ? 'Opcional' : 'Contextual'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-q-border">
                    <button onClick={onClose} className="px-3 py-2 text-xs text-q-text-secondary hover:text-q-text transition-colors">
                        {t('common.cancel', { defaultValue: 'Cancelar' })}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!label.trim() || isSaving}
                        className="flex items-center gap-1.5 bg-q-accent hover:bg-q-accent/80 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                    >
                        <CheckCircle2 size={14} />
                        <span>{isSaving ? t('common.saving', { defaultValue: 'Guardando...' }) : t('visualKit.save', { defaultValue: 'Guardar' })}</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
