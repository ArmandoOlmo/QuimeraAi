import React, { useState } from 'react';
import { CustomComponent, ComponentVariant } from '../../../types';
import { Plus, Edit2, Trash2, Check, X, Copy, Sparkles } from 'lucide-react';

interface VariantsManagerProps {
  component: CustomComponent;
  onUpdateVariants: (variants: ComponentVariant[], activeVariant?: string) => Promise<void>;
}

export const VariantsManager: React.FC<VariantsManagerProps> = ({
  component,
  onUpdateVariants,
}) => {
  const variants = component.variants || [];
  const activeVariantId = component.activeVariant || 'default';

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantDescription, setNewVariantDescription] = useState('');

  const handleCreateVariant = async () => {
    if (!newVariantName.trim()) {
      alert('Variant name is required');
      return;
    }

    const newVariant: ComponentVariant = {
      id: `variant-${Date.now()}`,
      name: newVariantName.trim(),
      description: newVariantDescription.trim() || undefined,
      styles: { ...component.styles }, // Copy current styles
      createdAt: new Date().toISOString(),
    };

    await onUpdateVariants([...variants, newVariant]);
    setIsCreating(false);
    setNewVariantName('');
    setNewVariantDescription('');
  };

  const handleUpdateVariant = async (variantId: string, updates: Partial<ComponentVariant>) => {
    const updatedVariants = variants.map(v =>
      v.id === variantId ? { ...v, ...updates } : v
    );
    await onUpdateVariants(updatedVariants);
    setEditingId(null);
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!window.confirm('Are you sure you want to delete this variant?')) return;
    
    const updatedVariants = variants.filter(v => v.id !== variantId);
    const newActiveVariant = activeVariantId === variantId ? 'default' : activeVariantId;
    await onUpdateVariants(updatedVariants, newActiveVariant);
  };

  const handleDuplicateVariant = async (variant: ComponentVariant) => {
    const duplicated: ComponentVariant = {
      ...variant,
      id: `variant-${Date.now()}`,
      name: `${variant.name} Copy`,
      createdAt: new Date().toISOString(),
    };
    await onUpdateVariants([...variants, duplicated]);
  };

  const handleSetActive = async (variantId: string) => {
    await onUpdateVariants(variants, variantId);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Variants
          </h3>
          <p className="text-sm text-editor-text-secondary mt-1">
            Create different style variations of this component
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Variant
          </button>
        )}
      </div>

      {/* Create New Variant Form */}
      {isCreating && (
        <div className="bg-editor-panel-bg border-2 border-purple-600 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-editor-text-primary">Create New Variant</h4>
          <div>
            <label className="block text-sm text-editor-text-secondary mb-1">Name *</label>
            <input
              type="text"
              value={newVariantName}
              onChange={(e) => setNewVariantName(e.target.value)}
              placeholder="e.g., Primary, Outline, Ghost"
              className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-600"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-editor-text-secondary mb-1">Description</label>
            <textarea
              value={newVariantDescription}
              onChange={(e) => setNewVariantDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsCreating(false);
                setNewVariantName('');
                setNewVariantDescription('');
              }}
              className="px-3 py-1.5 bg-editor-border text-editor-text-primary rounded-lg hover:bg-editor-border/80 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateVariant}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Default Variant */}
      <div
        className={`bg-editor-panel-bg border rounded-lg p-4 ${
          activeVariantId === 'default' ? 'border-purple-600 bg-purple-600/5' : 'border-editor-border'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-editor-text-primary">Default</h4>
              {activeVariantId === 'default' && (
                <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-medium rounded-full">
                  Active
                </span>
              )}
            </div>
            <p className="text-sm text-editor-text-secondary mt-1">
              Base component styles
            </p>
          </div>
          {activeVariantId !== 'default' && (
            <button
              onClick={() => handleSetActive('default')}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              Set Active
            </button>
          )}
        </div>
      </div>

      {/* Variant List */}
      <div className="space-y-3">
        {variants.map((variant) => {
          const isActive = variant.id === activeVariantId;
          const isEditing = editingId === variant.id;

          return (
            <div
              key={variant.id}
              className={`bg-editor-panel-bg border rounded-lg p-4 transition-all ${
                isActive ? 'border-purple-600 bg-purple-600/5' : 'border-editor-border'
              }`}
            >
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-editor-text-secondary mb-1">Name</label>
                    <input
                      type="text"
                      defaultValue={variant.name}
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          handleUpdateVariant(variant.id, { name: e.target.value.trim() });
                        }
                      }}
                      className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-editor-text-secondary mb-1">Description</label>
                    <textarea
                      defaultValue={variant.description || ''}
                      onBlur={(e) => {
                        handleUpdateVariant(variant.id, { description: e.target.value.trim() || undefined });
                      }}
                      rows={2}
                      className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-editor-text-primary">{variant.name}</h4>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-medium rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    {variant.description && (
                      <p className="text-sm text-editor-text-secondary">{variant.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-editor-text-secondary">
                      <span>Created: {formatDate(variant.createdAt)}</span>
                      {variant.isDefault && (
                        <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!isActive && (
                      <button
                        onClick={() => handleSetActive(variant.id)}
                        title="Set as active variant"
                        className="p-2 text-purple-600 hover:bg-purple-600/10 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDuplicateVariant(variant)}
                      title="Duplicate variant"
                      className="p-2 text-editor-text-secondary hover:bg-editor-border rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(variant.id)}
                      title="Edit variant"
                      className="p-2 text-editor-text-secondary hover:bg-editor-border rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVariant(variant.id)}
                      title="Delete variant"
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {variants.length === 0 && !isCreating && (
        <div className="text-center py-8 bg-editor-panel-bg border border-editor-border rounded-lg">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-editor-text-secondary mb-2">No variants yet</p>
          <p className="text-sm text-editor-text-secondary mb-4">
            Create variants to have different styles for this component
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create First Variant
          </button>
        </div>
      )}

    </div>
  );
};

