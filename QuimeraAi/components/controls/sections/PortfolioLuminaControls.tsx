import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { Input, TextArea, Select, ToggleControl } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import ImagePicker from '../../ui/ImagePicker';
import { ControlsDeps, BackgroundImageControl } from '../ControlsShared';
import { renderLuminaAnimationControls } from './LuminaSharedControls';
import { Type, LayoutGrid, Plus, Trash2, Settings, Layers, RotateCcw } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';
import { SingleProductSelector, SingleCollectionSelector, SingleContentSelector } from '../../ui/EcommerceControls';

export const renderPortfolioLuminaControls = (deps: ControlsDeps) => {
  const { data, setNestedData, setAiAssistField, t, activeProject } = deps;
  if (!data?.portfolioLumina) return null;

  const projects = data.portfolioLumina.projects || [];

  const contentTab = (
    <div className="space-y-4">
      {/* Text Content */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('editor.portfolioLumina.content', 'Header Content')}
        </label>
        
        <div className="space-y-4">
          <AIFormControl 
            label={t('editor.portfolioLumina.headline', 'Headline')} 
            onAssistClick={() => setAiAssistField({ path: 'portfolioLumina.headline', value: data.portfolioLumina.headline, context: 'Portfolio Lumina Headline' })}
          >
            <Input 
              label=""
              value={data.portfolioLumina.headline || ''} 
              onChange={(e) => setNestedData('portfolioLumina.headline', e.target.value)} 
            />
          </AIFormControl>

          <AIFormControl 
            label={t('editor.portfolioLumina.subheadline', 'Subheadline')} 
            onAssistClick={() => setAiAssistField({ path: 'portfolioLumina.subheadline', value: data.portfolioLumina.subheadline || '', context: 'Portfolio Lumina Subheadline' })}
          >
            <TextArea 
              value={data.portfolioLumina.subheadline || ''} 
              onChange={(e) => setNestedData('portfolioLumina.subheadline', e.target.value)} 
              rows={2}
            />
          </AIFormControl>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <LayoutGrid size={14} />
          {t('editor.portfolioLumina.projects', 'Projects')}
        </label>

        {projects.map((project: any, idx: number) => (
          <div key={idx} className="bg-q-bg p-3 rounded-lg border border-q-border mb-3 space-y-3 relative group">
            <button
              onClick={() => {
                const newProjects = projects.filter((_: any, i: number) => i !== idx);
                setNestedData('portfolioLumina.projects', newProjects);
              }}
              className="absolute top-2 right-2 p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100 z-10"
            >
              <Trash2 size={14} />
            </button>
            
            <span className="text-[10px] font-bold text-q-accent uppercase block mb-2">Project #{idx + 1}</span>

            <ImagePicker
              label={t('editor.portfolioLumina.projectImage', 'Image')}
              value={project.image || ''}
              onChange={(url) => setNestedData(`portfolioLumina.projects.${idx}.image`, url)}
              onRemove={() => setNestedData(`portfolioLumina.projects.${idx}.image`, '')}
            />

            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input 
                label={t('editor.portfolioLumina.projectTitle', 'Title')} 
                value={project.title || ''} 
                onChange={(e) => setNestedData(`portfolioLumina.projects.${idx}.title`, e.target.value)} 
              />
              <Input 
                label={t('editor.portfolioLumina.projectCategory', 'Category')} 
                value={project.category || ''} 
                onChange={(e) => setNestedData(`portfolioLumina.projects.${idx}.category`, e.target.value)} 
              />
            </div>

            {/* Link Controls */}
            <div className="mt-3 pt-3 border-t border-q-border/50">
              <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.link')}</label>
              
              <div className="flex bg-q-surface rounded-md border border-q-border p-1 mb-2">
                {[
                  { value: 'manual', label: 'URL' },
                  { value: 'product', label: 'Producto' },
                  { value: 'collection', label: 'Colección' },
                  { value: 'content', label: 'Contenido' }
                ].map((type) => (
                  <button type="button"                     key={type.value}
                    onClick={() => {
                        setNestedData(`portfolioLumina.projects.${idx}.linkType`, type.value);
                        setNestedData(`portfolioLumina.projects.${idx}.link`, '');
                    }}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(project.linkType || 'manual') === type.value
                      ? 'bg-q-accent text-q-bg'
                      : 'text-q-text-secondary hover:text-q-text-primary hover:bg-q-bg'
                      }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              {(project.linkType === 'manual' || !project.linkType) && (
                <>
                  <input
                    placeholder="https://example.com or #section"
                    value={project.link || ''}
                    onChange={(e) => setNestedData(`portfolioLumina.projects.${idx}.link`, e.target.value)}
                    className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent"
                  />
                  <p className="text-xs text-q-text-secondary mt-1">
                    Use URLs for external links or # for page sections
                  </p>
                </>
              )}
              {project.linkType === 'product' && (
                <SingleProductSelector
                  storeId={activeProject?.id || ''}
                  selectedProductId={project.link?.startsWith('/product/') ? project.link.split('/product/')[1] : undefined}
                  onSelect={(id) => {
                    if (id) {
                      setNestedData(`portfolioLumina.projects.${idx}.link`, `/product/${id}`);
                    } else {
                      setNestedData(`portfolioLumina.projects.${idx}.link`, '');
                    }
                  }}
                  label={t('editor.controls.common.selectProduct')}
                />
              )}
              {project.linkType === 'collection' && (
                <SingleCollectionSelector
                  storeId={activeProject?.id || ''}
                  selectedCollectionId={project.link?.startsWith('/collection/') ? project.link.split('/collection/')[1] : undefined}
                  onSelect={(id) => {
                    if (id) {
                      setNestedData(`portfolioLumina.projects.${idx}.link`, `/collection/${id}`);
                    } else {
                      setNestedData(`portfolioLumina.projects.${idx}.link`, '');
                    }
                  }}
                  label={t('editor.controls.common.selectCollection')}
                />
              )}
              {project.linkType === 'content' && (
                <SingleContentSelector
                  selectedContentPath={project.link}
                  onSelect={(path) => {
                    setNestedData(`portfolioLumina.projects.${idx}.link`, path || '');
                  }}
                  label={t('editor.controls.common.selectContent')}
                />
              )}
            </div>

          </div>
        ))}

        <button
          onClick={() => {
            const newProject = { title: 'New Project', category: 'Category', image: '', link: '#' };
            setNestedData('portfolioLumina.projects', [...projects, newProject]);
          }}
          className="w-full py-2 bg-q-accent text-q-bg rounded-md hover:bg-q-accent/90 transition-colors flex items-center justify-center gap-2 font-medium text-sm mt-2"
        >
          <Plus size={16} /> {t('editor.portfolioLumina.addProject', 'Add Project')}
        </button>
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* ========== GLASSMORPHISM ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efecto Cristal
        </label>
        <ToggleControl
          label={t('controls.glassmorphismTransparencia', 'Transparencia (Glassmorphism)')}
          checked={data?.portfolioLumina?.glassEffect ?? true}
          onChange={(v) => setNestedData('portfolioLumina.glassEffect', v)}
        />
      </div>

      <BackgroundImageControl sectionKey="portfolioLumina" data={data} setNestedData={setNestedData} />
      
      {renderLuminaAnimationControls(data.portfolioLumina, (key, value) => setNestedData(`portfolioLumina.${key}`, value))}
      
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2">
            <Settings size={14} />
            {t('editor.controls.common.colors', 'Colors')}
          </label>
          <button
            onClick={() => {
              setNestedData('portfolioLumina.colors', {});
              setNestedData('portfolioLumina.glassEffect', true);
            }}
            className="flex items-center gap-1.5 px-2 py-1 bg-q-bg border border-q-border rounded text-[10px] text-q-text-secondary hover:text-q-accent hover:border-q-accent/30 transition-colors"
            title="Restaurar a los colores originales de Lumina"
          >
            <RotateCcw size={10} />
            Restaurar Original
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">{t('editor.controls.colors.panel', 'Panel')}</p>
            <ColorControl label={t('editor.controls.common.background', 'Background')} value={data.portfolioLumina.colors?.panelBackground} onChange={(v) => setNestedData('portfolioLumina.colors.panelBackground', v)} />
            <ColorControl label={t('editor.controls.colors.border', 'Border')} value={data.portfolioLumina.colors?.panelBorder} onChange={(v) => setNestedData('portfolioLumina.colors.panelBorder', v)} />
          </div>

          <div className="space-y-2 pt-2 border-t border-q-border/50">
            <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Textos</p>
            <ColorControl label="Fondo de Sección" value={data.portfolioLumina.colors?.background} onChange={(v) => setNestedData('portfolioLumina.colors.background', v)} />
            <ColorControl label={t('editor.controls.common.title', 'Heading')} value={data.portfolioLumina.colors?.heading} onChange={(v) => setNestedData('portfolioLumina.colors.heading', v)} />
            <ColorControl label={t('editor.controls.common.text', 'Text')} value={data.portfolioLumina.colors?.text} onChange={(v) => setNestedData('portfolioLumina.colors.text', v)} />
          </div>
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
