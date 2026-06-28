import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

import ColorControl from '../../ui/ColorControl';
import ImagePicker from '../../ui/ImagePicker';
import AnimationControls from '../../ui/AnimationControls';
import TabbedControls from '../../ui/TabbedControls';
import {
  BorderRadiusSelector,
  FontSizeSelector,
  I18nInput,
  I18nTextArea,
  Input,
  PaddingSelector,
  Select,
  SliderControl,
  ToggleControl,
} from '../../ui/EditorControlPrimitives';
import { BackgroundImageControl, CornerGradientControl, type ControlsDeps } from '../ControlsShared';

const SHOWCASE_VARIANTS = [
  { value: 'recent-work', label: 'Recent Work' },
  { value: 'featured-device', label: 'Featured Device' },
  { value: 'curated-row', label: 'Curated Row' },
  { value: 'editorial-stack', label: 'Editorial Stack' },
  { value: 'vertical-strips', label: 'Vertical Strips' },
  { value: 'dark-carousel', label: 'Dark Carousel' },
  { value: 'minimal-index', label: 'Minimal Index' },
  { value: 'case-grid-dark', label: 'Case Grid Dark' },
];

const OBJECT_FIT_OPTIONS = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill', label: 'Fill' },
  { value: 'scale-down', label: 'Scale Down' },
];

const splitCategories = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.map(item => String(item).trim()).filter(Boolean)
    : String(value || '').split(',').map(item => item.trim()).filter(Boolean)
);

export const renderShowcaseControlsWithTabs = (deps: ControlsDeps) => {
  const { data, setNestedData, t, activeProject } = deps;
  if (!data?.showcase) return null;

  const showcase = data.showcase as any;
  const items = Array.isArray(showcase.items) ? showcase.items : [];
  const colors = showcase.colors || {};

  const contentTab = (
    <div className="space-y-4">
      <Select
        label="Showcase style"
        value={showcase.showcaseVariant || 'recent-work'}
        onChange={(value) => setNestedData('showcase.showcaseVariant', value)}
        options={SHOWCASE_VARIANTS}
      />

      <I18nInput
        label={t('editor.controls.common.eyebrow', 'Eyebrow')}
        value={showcase.eyebrow}
        onChange={(value) => setNestedData('showcase.eyebrow', value)}
      />
      <I18nInput
        label={t('editor.controls.common.title')}
        value={showcase.title}
        onChange={(value) => setNestedData('showcase.title', value)}
      />
      <I18nTextArea
        label={t('editor.controls.common.description')}
        value={showcase.description}
        onChange={(value) => setNestedData('showcase.description', value)}
        rows={3}
      />

      <Input
        label="Filters"
        value={(showcase.categories || []).join(', ')}
        onChange={(event) => setNestedData('showcase.categories', splitCategories(event.target.value))}
        placeholder="All, Brand, Product, Editorial"
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">Items</label>
          <button
            type="button"
            onClick={() => {
              setNestedData('showcase.items', [
                ...items,
                {
                  title: { es: 'Nuevo item', en: 'New item' },
                  description: { es: 'Descripcion breve', en: 'Short description' },
                  category: 'Brand',
                  meta: '# Brand',
                  imageUrl: 'pending:placeholder',
                },
              ]);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-q-accent/40 px-2 py-1 text-xs font-bold text-q-accent hover:bg-q-accent/10"
          >
            <Plus size={13} />
            Add
          </button>
        </div>

        {items.map((item: any, index: number) => (
          <div key={index} className="rounded-lg border border-q-border bg-q-bg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-q-text-secondary">Item #{index + 1}</span>
              <button
                type="button"
                onClick={() => setNestedData('showcase.items', items.filter((_: any, itemIndex: number) => itemIndex !== index))}
                className="text-q-text-secondary hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <ImagePicker
              label="Image"
              value={item.imageUrl || ''}
              onChange={(url) => setNestedData(`showcase.items.${index}.imageUrl`, url)}
              storeId={activeProject?.id}
              aspectRatio="4:3"
            />
            <I18nInput
              label="Title"
              value={item.title}
              onChange={(value) => setNestedData(`showcase.items.${index}.title`, value)}
            />
            <I18nTextArea
              label="Description"
              value={item.description}
              onChange={(value) => setNestedData(`showcase.items.${index}.description`, value)}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Category"
                value={item.category || ''}
                onChange={(event) => setNestedData(`showcase.items.${index}.category`, event.target.value)}
              />
              <Input
                label="Meta"
                value={item.meta || ''}
                onChange={(event) => setNestedData(`showcase.items.${index}.meta`, event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <I18nInput
                label="Link text"
                value={item.linkText}
                onChange={(value) => setNestedData(`showcase.items.${index}.linkText`, value)}
              />
              <Input
                label="Link URL"
                value={item.linkUrl || ''}
                onChange={(event) => setNestedData(`showcase.items.${index}.linkUrl`, event.target.value)}
                placeholder="#contact"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      <BackgroundImageControl sectionKey="showcase" data={data} setNestedData={setNestedData} />

      <div className="rounded-lg border border-q-border bg-q-surface/50 p-4 space-y-3">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">Layout</label>
        <ToggleControl label="Show section header" checked={showcase.showSectionHeader !== false} onChange={(value) => setNestedData('showcase.showSectionHeader', value)} />
        <ToggleControl label="Show filters" checked={showcase.showFilters !== false} onChange={(value) => setNestedData('showcase.showFilters', value)} />
        <ToggleControl label="Show meta labels" checked={showcase.showMeta !== false} onChange={(value) => setNestedData('showcase.showMeta', value)} />
        <ToggleControl label="Floating CTA" checked={showcase.showFloatingCta === true} onChange={(value) => setNestedData('showcase.showFloatingCta', value)} />
        <SliderControl label="Columns" value={showcase.gridColumns || 4} onChange={(value) => setNestedData('showcase.gridColumns', value)} min={2} max={5} step={1} />
        <SliderControl label="Image height" value={showcase.imageHeight || 340} onChange={(value) => setNestedData('showcase.imageHeight', value)} min={180} max={720} step={10} suffix="px" />
        <Select label="Image fit" value={showcase.imageObjectFit || 'cover'} onChange={(value) => setNestedData('showcase.imageObjectFit', value)} options={OBJECT_FIT_OPTIONS} />
        <BorderRadiusSelector label="Corners" value={showcase.borderRadius || 'lg'} onChange={(value) => setNestedData('showcase.borderRadius', value)} extended />
      </div>

      <div className="rounded-lg border border-q-border bg-q-surface/50 p-4 space-y-3">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">Typography</label>
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={showcase.titleFontSize || 'lg'} onChange={(value) => setNestedData('showcase.titleFontSize', value)} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={showcase.descriptionFontSize || 'md'} onChange={(value) => setNestedData('showcase.descriptionFontSize', value)} />
        <PaddingSelector label="Vertical padding" value={showcase.paddingY || 'lg'} onChange={(value) => setNestedData('showcase.paddingY', value)} showXl />
        <PaddingSelector label="Horizontal padding" value={showcase.paddingX || 'md'} onChange={(value) => setNestedData('showcase.paddingX', value)} showNone showXl />
      </div>

      <div className="rounded-lg border border-q-border bg-q-surface/50 p-4 space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">Colors</label>
        <ColorControl label="Background" value={colors.background || '#f8fafc'} onChange={(value) => setNestedData('showcase.colors.background', value)} />
        <ColorControl label="Heading" value={colors.heading || '#111827'} onChange={(value) => setNestedData('showcase.colors.heading', value)} />
        <ColorControl label="Text" value={colors.text || '#1f2937'} onChange={(value) => setNestedData('showcase.colors.text', value)} />
        <ColorControl label="Description" value={colors.description || '#4b5563'} onChange={(value) => setNestedData('showcase.colors.description', value)} />
        <ColorControl label="Accent" value={colors.accent || '#111827'} onChange={(value) => setNestedData('showcase.colors.accent', value)} />
        <ColorControl label="Border" value={colors.borderColor || '#e5e7eb'} onChange={(value) => setNestedData('showcase.colors.borderColor', value)} />
        <ColorControl label="Card background" value={colors.cardBackground || '#ffffff'} onChange={(value) => setNestedData('showcase.colors.cardBackground', value)} />
        <ColorControl label="Card heading" value={colors.cardHeading || '#111827'} onChange={(value) => setNestedData('showcase.colors.cardHeading', value)} />
        <ColorControl label="Card text" value={colors.cardText || '#374151'} onChange={(value) => setNestedData('showcase.colors.cardText', value)} />
        <ColorControl label="Muted text" value={colors.mutedText || '#6b7280'} onChange={(value) => setNestedData('showcase.colors.mutedText', value)} />
        <ColorControl label="Pill background" value={colors.pillBackground || '#111827'} onChange={(value) => setNestedData('showcase.colors.pillBackground', value)} />
        <ColorControl label="Pill text" value={colors.pillText || '#ffffff'} onChange={(value) => setNestedData('showcase.colors.pillText', value)} />
        <ColorControl label="Overlay start" value={colors.overlayStart || 'rgba(0,0,0,0)'} onChange={(value) => setNestedData('showcase.colors.overlayStart', value)} />
        <ColorControl label="Overlay end" value={colors.overlayEnd || 'rgba(0,0,0,0.7)'} onChange={(value) => setNestedData('showcase.colors.overlayEnd', value)} />
        <ColorControl label="Button background" value={colors.buttonBackground || '#111827'} onChange={(value) => setNestedData('showcase.colors.buttonBackground', value)} />
        <ColorControl label="Button text" value={colors.buttonText || '#ffffff'} onChange={(value) => setNestedData('showcase.colors.buttonText', value)} />
      </div>

      <CornerGradientControl
        enabled={showcase.cornerGradient?.enabled || false}
        position={showcase.cornerGradient?.position || 'top-left'}
        color={showcase.cornerGradient?.color || '#4f46e5'}
        opacity={showcase.cornerGradient?.opacity || 30}
        size={showcase.cornerGradient?.size || 50}
        onEnabledChange={(value) => setNestedData('showcase.cornerGradient.enabled', value)}
        onPositionChange={(value) => setNestedData('showcase.cornerGradient.position', value)}
        onColorChange={(value) => setNestedData('showcase.cornerGradient.color', value)}
        onOpacityChange={(value) => setNestedData('showcase.cornerGradient.opacity', value)}
        onSizeChange={(value) => setNestedData('showcase.cornerGradient.size', value)}
      />

      <div className="rounded-lg border border-q-border bg-q-surface/50 p-4">
        <AnimationControls
          animationType={showcase.animationType || 'fade-in-up'}
          enableCardAnimation={showcase.enableCardAnimation !== false}
          onChangeAnimationType={(value) => setNestedData('showcase.animationType', value)}
          onToggleAnimation={(value) => setNestedData('showcase.enableCardAnimation', value)}
        />
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
