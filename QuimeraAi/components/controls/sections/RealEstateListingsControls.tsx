import React from 'react';
import { Building2, Eye, Layout, Palette, Type , Layers } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';
import TabbedControls from '../../ui/TabbedControls';
import { Input, Select, TextArea, ToggleControl } from '../../ui/EditorControlPrimitives';
import { ControlsDeps } from '../ControlsShared';

const SectionHeader = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) => (
  <div className="mb-4">
    <label className="flex items-center gap-2 text-[11px] font-semibold text-editor-text-secondary uppercase tracking-wider">
      <Icon size={14} strokeWidth={1.8} />
      {title}
    </label>
    {description && <p className="mt-2 text-xs leading-5 text-editor-text-secondary/80">{description}</p>}
  </div>
);

export const renderRealEstateListingsControlsWithTabs = (deps: ControlsDeps) => {
  const { data, setNestedData, t } = deps;
  const sectionData = data?.realEstateListings || {};

  const contentTab = (
    <div className="space-y-6">
      {/* ========== GLASSMORPHISM ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efecto Cristal
        </label>
        <ToggleControl
          label={t("controls.glassmorphismTransparencia", "Glassmorphism Background")}
          checked={sectionData?.glassEffect || false}
          onChange={(v) => setNestedData("realEstateListings.glassEffect", v)}
        />
      </div>

      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <SectionHeader icon={Type} title={t('controls.content')} />
        <Input
          label={t('editor.controls.common.title')}
          value={sectionData.title || ''}
          onChange={(e) => setNestedData('realEstateListings.title', e.target.value)}
          placeholder={t('realEstate.websiteListings.defaultTitle')}
        />
        <TextArea
          label={t('editor.controls.common.subtitle')}
          value={sectionData.subtitle || ''}
          onChange={(e) => setNestedData('realEstateListings.subtitle', e.target.value)}
          rows={2}
          placeholder={t('realEstate.websiteListings.defaultSubtitle')}
        />
        <Input
          label={t('realEstate.websiteListings.controls.buttonText')}
          value={sectionData.buttonText || ''}
          onChange={(e) => setNestedData('realEstateListings.buttonText', e.target.value)}
          placeholder={t('realEstate.websiteListings.requestInfo')}
        />
      </div>

      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <SectionHeader
          icon={Building2}
          title={t('realEstate.websiteListings.controls.source')}
          description={t('realEstate.websiteListings.controls.sourceHelp')}
        />
        <ToggleControl
          label={t('realEstate.websiteListings.controls.featuredOnly')}
          checked={sectionData.featuredOnly === true}
          onChange={(v) => setNestedData('realEstateListings.featuredOnly', v)}
        />
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-6">      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <SectionHeader icon={Layout} title={t('controls.layout')} />
        <Select
          label={t('realEstate.websiteListings.controls.maxItems')}
          value={String(sectionData.maxItems || 6)}
          onChange={(v) => setNestedData('realEstateListings.maxItems', parseInt(v))}
          options={[
            { value: '3', label: '3' },
            { value: '6', label: '6' },
            { value: '9', label: '9' },
            { value: '12', label: '12' },
          ]}
        />
      </div>

      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <SectionHeader icon={Eye} title={t('realEstate.websiteListings.controls.cardContent')} />
        <ToggleControl label={t('realEstate.websiteListings.controls.showPrice')} checked={sectionData.showPrice !== false} onChange={(v) => setNestedData('realEstateListings.showPrice', v)} />
        <ToggleControl label={t('realEstate.websiteListings.controls.showLocation')} checked={sectionData.showLocation !== false} onChange={(v) => setNestedData('realEstateListings.showLocation', v)} />
        <ToggleControl label={t('realEstate.websiteListings.controls.showStats')} checked={sectionData.showStats !== false} onChange={(v) => setNestedData('realEstateListings.showStats', v)} />
        <ToggleControl label={t('realEstate.websiteListings.controls.showDescription')} checked={sectionData.showDescription !== false} onChange={(v) => setNestedData('realEstateListings.showDescription', v)} />
      </div>

      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <SectionHeader icon={Palette} title={t('controls.colors')} />
        <ColorControl label={t('editor.controls.common.background')} value={sectionData.colors?.background || '#ffffff'} onChange={(v) => setNestedData('realEstateListings.colors.background', v)} />
        <ColorControl label={t('controls.heading')} value={sectionData.colors?.heading || '#111827'} onChange={(v) => setNestedData('realEstateListings.colors.heading', v)} />
        <ColorControl label={t('controls.text')} value={sectionData.colors?.text || '#374151'} onChange={(v) => setNestedData('realEstateListings.colors.text', v)} />
        <ColorControl label={t('controls.accent')} value={sectionData.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('realEstateListings.colors.accent', v)} />
        <ColorControl label={t('controls.cardBackground')} value={sectionData.colors?.cardBackground || '#ffffff'} onChange={(v) => setNestedData('realEstateListings.colors.cardBackground', v)} />
        <ColorControl label={t('controls.border')} value={sectionData.colors?.border || '#e5e7eb'} onChange={(v) => setNestedData('realEstateListings.colors.border', v)} />
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
