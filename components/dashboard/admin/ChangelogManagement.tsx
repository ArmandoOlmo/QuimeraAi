/**
 * ChangelogManagement
 * Panel de administración para gestionar las entradas del changelog
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Calendar,
  Tag,
  Save,
  X,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useChangelogAdmin, seedChangelog } from '../../../hooks/useChangelog';
import {
  ChangelogEntry,
  ChangelogTag,
  ChangelogFeature,
  CHANGELOG_TAG_COLORS,
  CHANGELOG_TAG_LABELS
} from '../../../types/changelog';

interface ChangelogManagementProps {
  onBack: () => void;
}

// Empty entry template
const createEmptyEntry = (): Omit<ChangelogEntry, 'id' | 'createdAt' | 'updatedAt' | 'slug'> => ({
  date: new Date().toISOString().split('T')[0],
  tag: 'new',
  title: '',
  description: '',
  features: [],
  imageUrl: '',
  imageAlt: '',
  version: '',
  isPublished: false,
});

// Tag selector component
const TagSelector: React.FC<{
  value: ChangelogTag;
  onChange: (tag: ChangelogTag) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const allTags: ChangelogTag[] = ['new', 'improvement', 'fix', 'performance', 'security', 'breaking', 'deprecated', 'beta'];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${CHANGELOG_TAG_COLORS[value].bg} ${CHANGELOG_TAG_COLORS[value].border}`}
      >
        <span className={`font-medium ${CHANGELOG_TAG_COLORS[value].text}`}>
          {CHANGELOG_TAG_LABELS[value].es}
        </span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-48 bg-editor-panel-bg border border-editor-border rounded-lg shadow-xl z-50 py-1">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  onChange(tag);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-white/5 transition-colors ${
                  tag === value ? CHANGELOG_TAG_COLORS[tag].bg : ''
                }`}
              >
                <span className={`font-medium ${CHANGELOG_TAG_COLORS[tag].text}`}>
                  {CHANGELOG_TAG_LABELS[tag].es}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Feature editor component
const FeatureEditor: React.FC<{
  features: ChangelogFeature[];
  onChange: (features: ChangelogFeature[]) => void;
}> = ({ features, onChange }) => {
  const addFeature = () => {
    onChange([
      ...features,
      { id: Date.now().toString(), title: '', description: '' }
    ]);
  };

  const updateFeature = (index: number, field: 'title' | 'description', value: string) => {
    const updated = [...features];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeFeature = (index: number) => {
    onChange(features.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-editor-text-primary">
          Características ({features.length})
        </label>
        <button
          type="button"
          onClick={addFeature}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-editor-accent/10 text-editor-accent rounded-lg hover:bg-editor-accent/20 transition-colors"
        >
          <Plus size={14} />
          Añadir
        </button>
      </div>

      {features.length === 0 ? (
        <p className="text-sm text-editor-text-secondary py-4 text-center border border-dashed border-editor-border rounded-lg">
          No hay características. Añade una para detallar los cambios.
        </p>
      ) : (
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={feature.id} className="flex gap-3 p-3 bg-editor-bg/50 rounded-lg border border-editor-border">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={feature.title}
                  onChange={(e) => updateFeature(index, 'title', e.target.value)}
                  placeholder="Título de la característica"
                  className="w-full px-3 py-2 bg-editor-panel-bg border border-editor-border rounded-lg text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:border-editor-accent"
                />
                <textarea
                  value={feature.description}
                  onChange={(e) => updateFeature(index, 'description', e.target.value)}
                  placeholder="Descripción breve"
                  rows={2}
                  className="w-full px-3 py-2 bg-editor-panel-bg border border-editor-border rounded-lg text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:border-editor-accent resize-none"
                />
              </div>
              <button
                type="button"
                onClick={() => removeFeature(index)}
                className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors self-start"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Entry editor modal
const EntryEditorModal: React.FC<{
  entry: Omit<ChangelogEntry, 'id' | 'createdAt' | 'updatedAt' | 'slug'> | ChangelogEntry;
  isNew: boolean;
  onSave: (entry: Omit<ChangelogEntry, 'id' | 'createdAt' | 'updatedAt' | 'slug'>) => void;
  onClose: () => void;
  isSaving: boolean;
}> = ({ entry, isNew, onSave, onClose, isSaving }) => {
  const [formData, setFormData] = useState(entry);
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = <K extends keyof typeof formData>(field: K, value: typeof formData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-editor-panel-bg border border-editor-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-editor-border">
          <h2 className="text-lg font-bold text-editor-text-primary">
            {isNew ? 'Nueva Entrada' : 'Editar Entrada'}
          </h2>
          <button onClick={onClose} className="p-2 text-editor-text-secondary hover:text-editor-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title and Tag */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-editor-text-primary mb-2">
                Título *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Ej: Nueva funcionalidad de ecommerce"
                required
                className="w-full px-4 py-3 bg-editor-bg border border-editor-border rounded-xl text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:border-editor-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-editor-text-primary mb-2">
                Tipo
              </label>
              <TagSelector value={formData.tag} onChange={(tag) => updateField('tag', tag)} />
            </div>
          </div>

          {/* Date and Version */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-editor-text-primary mb-2">
                Fecha *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => updateField('date', e.target.value)}
                required
                className="w-full px-4 py-3 bg-editor-bg border border-editor-border rounded-xl text-editor-text-primary focus:outline-none focus:border-editor-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-editor-text-primary mb-2">
                Versión (opcional)
              </label>
              <input
                type="text"
                value={formData.version || ''}
                onChange={(e) => updateField('version', e.target.value)}
                placeholder="Ej: 2.0.0"
                className="w-full px-4 py-3 bg-editor-bg border border-editor-border rounded-xl text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:border-editor-accent"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-editor-text-primary mb-2">
              Descripción *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe brevemente esta actualización..."
              required
              rows={4}
              className="w-full px-4 py-3 bg-editor-bg border border-editor-border rounded-xl text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:border-editor-accent resize-none"
            />
          </div>

          {/* Features */}
          <FeatureEditor
            features={formData.features}
            onChange={(features) => updateField('features', features)}
          />

          {/* Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-editor-text-primary mb-2">
                URL de Imagen (opcional)
              </label>
              <input
                type="url"
                value={formData.imageUrl || ''}
                onChange={(e) => updateField('imageUrl', e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 bg-editor-bg border border-editor-border rounded-xl text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:border-editor-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-editor-text-primary mb-2">
                Alt de Imagen
              </label>
              <input
                type="text"
                value={formData.imageAlt || ''}
                onChange={(e) => updateField('imageAlt', e.target.value)}
                placeholder="Descripción de la imagen"
                className="w-full px-4 py-3 bg-editor-bg border border-editor-border rounded-xl text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:border-editor-accent"
              />
            </div>
          </div>

          {/* Preview Image */}
          {formData.imageUrl && (
            <div className="rounded-xl border border-editor-border overflow-hidden">
              <img
                src={formData.imageUrl}
                alt={formData.imageAlt || 'Preview'}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Publish Status */}
          <div className="flex items-center gap-3 p-4 bg-editor-bg/50 rounded-xl border border-editor-border">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => updateField('isPublished', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-editor-accent"></div>
            </label>
            <div>
              <p className="font-medium text-editor-text-primary">
                {formData.isPublished ? 'Publicado' : 'Borrador'}
              </p>
              <p className="text-sm text-editor-text-secondary">
                {formData.isPublished 
                  ? 'Esta entrada es visible para todos los usuarios' 
                  : 'Esta entrada solo es visible para administradores'
                }
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-editor-border bg-editor-bg/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-editor-text-secondary hover:text-editor-text-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving || !formData.title || !formData.description}
            className="flex items-center gap-2 px-6 py-2 bg-editor-accent text-white font-semibold rounded-xl hover:bg-editor-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={16} />
                {isNew ? 'Crear Entrada' : 'Guardar Cambios'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main component
const ChangelogManagement: React.FC<ChangelogManagementProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { entries, isLoading, isSaving, error, createEntry, updateEntry, deleteEntry, togglePublish } = useChangelogAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(search) ||
      entry.description.toLowerCase().includes(search) ||
      CHANGELOG_TAG_LABELS[entry.tag].es.toLowerCase().includes(search)
    );
  });

  // Handlers
  const handleCreate = async (data: Omit<ChangelogEntry, 'id' | 'createdAt' | 'updatedAt' | 'slug'>) => {
    await createEntry(data);
    setIsCreating(false);
  };

  const handleUpdate = async (data: Omit<ChangelogEntry, 'id' | 'createdAt' | 'updatedAt' | 'slug'>) => {
    if (editingEntry) {
      await updateEntry(editingEntry.id, data);
      setEditingEntry(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
    setConfirmDelete(null);
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedChangelog();
    } catch (err) {
      console.error('Error seeding:', err);
    }
    setIsSeeding(false);
  };

  return (
    <div className="h-screen bg-editor-bg flex flex-col">
      {/* Header */}
      <header className="h-14 bg-editor-panel-bg border-b border-editor-border flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-editor-text-secondary hover:text-editor-accent transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Volver</span>
          </button>
          <div className="w-px h-5 bg-editor-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-editor-accent" />
            <h1 className="text-lg font-bold text-editor-text-primary">
              Gestión del Changelog
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/changelog"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-editor-text-secondary hover:text-editor-accent transition-colors"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">Ver Público</span>
          </a>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-editor-accent text-white font-semibold rounded-xl hover:bg-editor-accent/90 transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nueva Entrada</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          {/* Search and Stats */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-editor-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar entradas..."
                className="w-full pl-10 pr-4 py-2.5 bg-editor-panel-bg border border-editor-border rounded-xl text-editor-text-primary placeholder:text-editor-text-secondary/50 focus:outline-none focus:border-editor-accent"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-editor-text-secondary">
              <span>{entries.length} entradas</span>
              <span>{entries.filter(e => e.isPublished).length} publicadas</span>
            </div>
          </div>

          {/* Seed button if no entries */}
          {entries.length === 0 && !isLoading && (
            <div className="text-center py-12 bg-editor-panel-bg border border-editor-border rounded-2xl mb-6">
              <Sparkles className="w-12 h-12 text-editor-accent mx-auto mb-4" />
              <h3 className="text-xl font-bold text-editor-text-primary mb-2">
                No hay entradas todavía
              </h3>
              <p className="text-editor-text-secondary mb-6 max-w-md mx-auto">
                Comienza creando tu primera entrada o genera datos de ejemplo para ver cómo funciona el changelog.
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-editor-accent text-white font-semibold rounded-xl hover:bg-editor-accent/90 transition-colors"
                >
                  <Plus size={18} />
                  Crear Primera Entrada
                </button>
                <button
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="flex items-center gap-2 px-6 py-3 bg-editor-panel-bg border border-editor-border text-editor-text-primary font-semibold rounded-xl hover:bg-editor-bg transition-colors disabled:opacity-50"
                >
                  {isSeeding ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  Generar Ejemplos
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-editor-accent animate-spin" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 mb-6">
              {error}
            </div>
          )}

          {/* Entries List */}
          {!isLoading && filteredEntries.length > 0 && (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-editor-panel-bg border border-editor-border rounded-xl p-5 hover:border-editor-accent/30 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${CHANGELOG_TAG_COLORS[entry.tag].bg} ${CHANGELOG_TAG_COLORS[entry.tag].text}`}>
                          {CHANGELOG_TAG_LABELS[entry.tag].es}
                        </span>
                        {!entry.isPublished && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full">
                            Borrador
                          </span>
                        )}
                        <span className="text-xs text-editor-text-secondary flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(entry.date).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        {entry.version && (
                          <span className="text-xs text-editor-text-secondary bg-editor-bg px-2 py-0.5 rounded">
                            v{entry.version}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-editor-text-primary mb-1 line-clamp-1">
                        {entry.title}
                      </h3>
                      <p className="text-sm text-editor-text-secondary line-clamp-2">
                        {entry.description}
                      </p>
                      {entry.features.length > 0 && (
                        <p className="text-xs text-editor-text-secondary mt-2">
                          {entry.features.length} característica{entry.features.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {/* Thumbnail */}
                    {entry.imageUrl && (
                      <div className="w-24 h-16 rounded-lg overflow-hidden border border-editor-border flex-shrink-0 hidden sm:block">
                        <img
                          src={entry.imageUrl}
                          alt={entry.imageAlt || entry.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => togglePublish(entry.id, !entry.isPublished)}
                        className={`p-2 rounded-lg transition-colors ${
                          entry.isPublished 
                            ? 'text-green-400 hover:bg-green-400/10' 
                            : 'text-gray-400 hover:bg-gray-400/10'
                        }`}
                        title={entry.isPublished ? 'Despublicar' : 'Publicar'}
                      >
                        {entry.isPublished ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="p-2 text-editor-text-secondary hover:text-editor-accent hover:bg-editor-accent/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(entry.id)}
                        className="p-2 text-editor-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {!isLoading && entries.length > 0 && filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-editor-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-bold text-editor-text-primary mb-2">
                No se encontraron resultados
              </h3>
              <p className="text-editor-text-secondary">
                Intenta con otros términos de búsqueda
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isCreating && (
        <EntryEditorModal
          entry={createEmptyEntry()}
          isNew={true}
          onSave={handleCreate}
          onClose={() => setIsCreating(false)}
          isSaving={isSaving}
        />
      )}

      {editingEntry && (
        <EntryEditorModal
          entry={editingEntry}
          isNew={false}
          onSave={handleUpdate}
          onClose={() => setEditingEntry(null)}
          isSaving={isSaving}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-editor-panel-bg border border-editor-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-editor-text-primary mb-2">
              ¿Eliminar esta entrada?
            </h3>
            <p className="text-editor-text-secondary mb-6">
              Esta acción no se puede deshacer. La entrada será eliminada permanentemente.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-editor-text-secondary hover:text-editor-text-primary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
              >
                <Trash2 size={16} />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangelogManagement;

