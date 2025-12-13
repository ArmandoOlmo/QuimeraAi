/**
 * TemplateGallery Component
 * 
 * Displays available templates for manual selection during onboarding.
 * Uses dynamic templates from Firestore (Super Admin) - NOT hardcoded templates.
 * Features compact horizontal card design, search, and filtering.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Project } from '../../types';
import { 
  Search, 
  Filter, 
  Check, 
  Eye, 
  X,
  Star,
  Sparkles,
  ArrowRight,
  Layout
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface TemplateGalleryProps {
  templates: Project[];  // Templates from Firestore (Super Admin)
  onSelect: (templateId: string) => void;
  onSkip?: () => void;
  currentIndustry?: string;
  currentAesthetic?: string;
  suggestedTemplateId?: string;
  suggestedReasoning?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Safe getter for template colors
const getTemplateColors = (template: Project) => {
  const gc = template.theme?.globalColors;
  return {
    primary: gc?.primary || '#6366f1',
    secondary: gc?.secondary || '#8b5cf6',
    accent: gc?.accent || '#f59e0b',
    background: gc?.background || '#0d0514',
    text: gc?.text || '#ffffff'
  };
};

// Safe getter for template properties
const getTemplateTone = (template: Project): string => {
  return template.brandIdentity?.toneOfVoice || 'Professional';
};

const getTemplateIndustry = (template: Project): string => {
  return template.brandIdentity?.industry || template.category || 'General';
};

const getTemplateTags = (template: Project): string[] => {
  return template.tags || [];
};

// ============================================================================
// COMPACT TEMPLATE CARD COMPONENT (Horizontal Layout)
// ============================================================================

interface TemplateCardProps {
  template: Project;
  isSuggested: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isSuggested,
  onSelect,
  onPreview
}) => {
  const colors = getTemplateColors(template);
  const tone = getTemplateTone(template);
  const tags = getTemplateTags(template);

  return (
    <div
      onClick={onSelect}
      className={`
        relative flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer
        transition-all duration-200 hover:bg-white/5 group
        ${isSuggested
          ? 'border-green-500/50 bg-green-500/5'
          : 'border-white/10 hover:border-white/20'
        }
      `}
    >
      {/* Badge sugerido */}
      {isSuggested && (
        <div className="absolute -top-2 left-3 bg-green-500 text-white text-[10px] 
                        font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 z-10">
          <Star size={8} />
          Recomendado
        </div>
      )}

      {/* Thumbnail cuadrado pequeño */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
        {template.thumbnailUrl ? (
          <img
            src={template.thumbnailUrl}
            alt={template.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600/30 to-blue-600/30">
            <Layout size={20} className="text-white/50" />
          </div>
        )}
        {/* Botón preview en hover */}
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
                     flex items-center justify-center transition-opacity"
        >
          <Eye size={16} className="text-white" />
        </button>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Nombre */}
        <h3 className="font-semibold text-white text-sm truncate">
          {template.name}
        </h3>
        
        {/* Categoría + Tono */}
        <p className="text-xs text-gray-500 truncate">
          {template.category || 'General'} · {tone}
        </p>
        
        {/* Colores + Tags en una línea */}
        <div className="flex items-center gap-2 mt-1.5">
          {/* Colores */}
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: colors.primary }} />
            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: colors.secondary }} />
            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: colors.accent }} />
            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: colors.background }} />
          </div>
          
          {/* Tags (máximo 2) */}
          <div className="flex gap-1 overflow-hidden">
            {tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded whitespace-nowrap">
                {tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="text-[10px] text-gray-500">+{tags.length - 2}</span>
            )}
          </div>
        </div>
      </div>

      {/* Flecha indicador */}
      <ArrowRight size={14} className="text-gray-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

// ============================================================================
// TEMPLATE PREVIEW MODAL
// ============================================================================

interface TemplatePreviewModalProps {
  template: Project;
  onClose: () => void;
  onSelect: () => void;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  template,
  onClose,
  onSelect
}) => {
  const colors = getTemplateColors(template);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-[#0d0514] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden
                   border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h3 className="text-xl font-bold text-white">{template.name}</h3>
            <p className="text-sm text-gray-400">{template.category || 'General'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Preview Image */}
            <div>
              {template.thumbnailUrl ? (
                <img
                  src={template.thumbnailUrl}
                  alt={template.name}
                  className="w-full rounded-lg shadow-lg"
                />
              ) : (
                <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center">
                  <Layout size={48} className="text-white/30" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-5">
              {/* Descripción */}
              {template.description && (
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Descripción
                  </h4>
                  <p className="text-white">{template.description}</p>
                </div>
              )}

              {/* Ideal para */}
              {template.brandIdentity?.targetAudience && (
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Ideal para
                  </h4>
                  <p className="text-white">{template.brandIdentity.targetAudience}</p>
                </div>
              )}

              {/* Valores del template */}
              {template.brandIdentity?.coreValues && (
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Valores que transmite
                  </h4>
                  <p className="text-white">{template.brandIdentity.coreValues}</p>
                </div>
              )}

              {/* Paleta de colores */}
              <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Paleta de Colores
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Primary', color: colors.primary },
                    { name: 'Secondary', color: colors.secondary },
                    { name: 'Background', color: colors.background },
                    { name: 'Accent', color: colors.accent },
                    { name: 'Text', color: colors.text },
                  ].map(({ name, color }) => (
                    <div key={name} className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border border-white/20"
                        style={{ backgroundColor: color }}
                      />
                      <div>
                        <p className="text-xs text-gray-500">{name}</p>
                        <p className="text-xs text-white font-mono">{color}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tipografía */}
              {(template.theme?.fontFamilyHeader || template.theme?.fontFamilyBody) && (
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Tipografía
                  </h4>
                  <div className="flex gap-6">
                    {template.theme?.fontFamilyHeader && (
                      <div>
                        <p className="text-xs text-gray-500">Headers</p>
                        <p className="text-white capitalize">
                          {template.theme.fontFamilyHeader.replace(/-/g, ' ')}
                        </p>
                      </div>
                    )}
                    {template.theme?.fontFamilyBody && (
                      <div>
                        <p className="text-xs text-gray-500">Body</p>
                        <p className="text-white capitalize">
                          {template.theme.fontFamilyBody.replace(/-/g, ' ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Secciones incluidas */}
              {template.componentOrder && template.componentOrder.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Secciones Incluidas
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {template.componentOrder
                      .filter(c => !['colors', 'typography'].includes(c))
                      .slice(0, 8)
                      .map(section => (
                        <span
                          key={section}
                          className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded capitalize"
                        >
                          {section}
                        </span>
                      ))
                    }
                    {template.componentOrder.length > 8 && (
                      <span className="text-xs text-gray-500">
                        +{template.componentOrder.length - 8} más
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-black/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSelect}
            className="px-6 py-2.5 bg-yellow-500 text-black font-bold rounded-lg 
                       hover:bg-yellow-400 transition-colors flex items-center gap-2"
          >
            <Check size={18} />
            Usar este template
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  templates,
  onSelect,
  onSkip,
  currentIndustry,
  currentAesthetic,
  suggestedTemplateId,
  suggestedReasoning
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Project | null>(null);

  // Extraer categorías únicas de los templates
  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category || 'General'));
    return Array.from(cats).filter(Boolean).sort();
  }, [templates]);

  // Filtrar templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      // Filtro de búsqueda
      const searchLower = searchTerm.toLowerCase();
      const industry = getTemplateIndustry(template);
      const tags = getTemplateTags(template);
      
      const matchesSearch = searchTerm === '' || 
        template.name.toLowerCase().includes(searchLower) ||
        tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        industry.toLowerCase().includes(searchLower) ||
        (template.description || '').toLowerCase().includes(searchLower);
      
      // Filtro de categoría
      const templateCategory = template.category || 'General';
      const matchesCategory = !selectedCategory || templateCategory === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchTerm, selectedCategory]);

  // Ordenar: sugerido primero, luego por relevancia a la industria del usuario
  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => {
      // Sugerido primero
      if (a.id === suggestedTemplateId) return -1;
      if (b.id === suggestedTemplateId) return 1;
      
      // Luego por match de industria
      const industryLower = (currentIndustry || '').toLowerCase();
      const aIndustry = getTemplateIndustry(a);
      const bIndustry = getTemplateIndustry(b);
      const aTags = getTemplateTags(a);
      const bTags = getTemplateTags(b);
      
      const aIndustryMatch = aIndustry.toLowerCase().includes(industryLower) ||
                            aTags.some(t => t.toLowerCase().includes(industryLower));
      const bIndustryMatch = bIndustry.toLowerCase().includes(industryLower) ||
                            bTags.some(t => t.toLowerCase().includes(industryLower));
      if (aIndustryMatch && !bIndustryMatch) return -1;
      if (!aIndustryMatch && bIndustryMatch) return 1;
      
      // Luego por featured
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      
      return 0;
    });
  }, [filteredTemplates, suggestedTemplateId, currentIndustry]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">
          Elige un Template
        </h2>
        <p className="text-gray-400 text-sm">
          Selecciona el diseño que mejor represente tu negocio. 
          Personalizaremos los colores y contenido para ti.
        </p>
      </div>

      {/* Suggested template highlight */}
      {suggestedTemplateId && suggestedReasoning && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-green-400 font-medium text-xs">Template recomendado para tu negocio</p>
            <p className="text-green-300/70 text-xs mt-0.5">{suggestedReasoning}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, industria o tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#130a1d] border border-white/10 rounded-lg pl-9 pr-3 py-2 
                       text-white text-sm placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-500/50 
                       focus:border-yellow-500/50 outline-none transition-all"
          />
        </div>

        {/* Filtro de categoría */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="bg-[#130a1d] border border-white/10 rounded-lg pl-9 pr-6 py-2 
                       text-white text-sm appearance-none cursor-pointer focus:ring-2 
                       focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none
                       min-w-[160px]"
          >
            <option value="">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contador de resultados */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {sortedTemplates.length} template{sortedTemplates.length !== 1 ? 's' : ''} disponible{sortedTemplates.length !== 1 ? 's' : ''}
        </span>
        
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-xs text-gray-400 hover:text-yellow-400 transition-colors flex items-center gap-1"
          >
            Generar diseño único con IA
            <ArrowRight size={12} />
          </button>
        )}
      </div>

      {/* Grid de Templates - 2 columnas con layout horizontal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
        {sortedTemplates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            isSuggested={template.id === suggestedTemplateId}
            onSelect={() => onSelect(template.id)}
            onPreview={() => setPreviewTemplate(template)}
          />
        ))}
      </div>

      {/* Empty State */}
      {sortedTemplates.length === 0 && (
        <div className="text-center py-8">
          <Layout className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-2">No se encontraron templates</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory(null);
            }}
            className="text-yellow-400 hover:text-yellow-300 text-xs transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Modal de Preview */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onSelect={() => {
            onSelect(previewTemplate.id);
            setPreviewTemplate(null);
          }}
        />
      )}
    </div>
  );
};

export default TemplateGallery;









