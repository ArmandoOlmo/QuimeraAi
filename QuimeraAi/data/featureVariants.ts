export const FEATURE_VARIANT_VALUES = [
  'classic',
  'modern',
  'bento-premium',
  'bento-overlay',
  'image-overlay',
  'neon-glow',
  'press-release',
  'editorial-mosaic',
  'gallery-strip',
  'visual-proof-grid',
  'strategy-cards',
  'offer-showcase',
  'product-highlights',
  'icon-columns',
  'dark-showcase',
  'split-list',
  'app-showcase',
  'metrics-panel',
  'checklist-cards',
  'dark-capability-grid',
  'cinematic-gym',
] as const;

export type FeatureVariant = typeof FEATURE_VARIANT_VALUES[number];

export interface FeatureVariantMeta {
  value: FeatureVariant;
  label: string;
  group: 'Core' | 'Media' | 'Editorial' | 'Product' | 'Technical';
  description: string;
  recommendedColumns: 2 | 3 | 4;
  recommendedImageHeight: number;
}

export const FEATURE_VARIANTS: FeatureVariantMeta[] = [
  { value: 'classic', label: 'Classic Grid', group: 'Core', description: 'Uniform image cards for simple benefits.', recommendedColumns: 3, recommendedImageHeight: 430 },
  { value: 'modern', label: 'Bento', group: 'Core', description: 'Asymmetric bento cards with richer media.', recommendedColumns: 3, recommendedImageHeight: 340 },
  { value: 'bento-premium', label: 'Premium Bento', group: 'Core', description: 'Featured bento cards with strong visual hierarchy.', recommendedColumns: 3, recommendedImageHeight: 340 },
  { value: 'bento-overlay', label: 'Overlay Bento', group: 'Media', description: 'Full-bleed media cards with text over images.', recommendedColumns: 3, recommendedImageHeight: 380 },
  { value: 'image-overlay', label: 'Image Overlay', group: 'Media', description: 'Edge-to-edge image tiles with overlay copy.', recommendedColumns: 4, recommendedImageHeight: 420 },
  { value: 'gallery-strip', label: 'Gallery Strip', group: 'Media', description: 'Large headline with a row of visual feature cards.', recommendedColumns: 4, recommendedImageHeight: 440 },
  { value: 'visual-proof-grid', label: 'Proof Grid', group: 'Media', description: 'Screenshot or product visuals with short captions.', recommendedColumns: 3, recommendedImageHeight: 210 },
  { value: 'dark-showcase', label: 'Dark Showcase', group: 'Media', description: 'Dark image cards with premium separators.', recommendedColumns: 4, recommendedImageHeight: 380 },
  { value: 'editorial-mosaic', label: 'Editorial Mosaic', group: 'Editorial', description: 'Magazine-style image and text tiles.', recommendedColumns: 4, recommendedImageHeight: 430 },
  { value: 'press-release', label: 'Press Release', group: 'Editorial', description: 'Dynamic curved cards for announcements.', recommendedColumns: 3, recommendedImageHeight: 380 },
  { value: 'split-list', label: 'Split List', group: 'Editorial', description: 'Stacked image and copy rows for detailed traits.', recommendedColumns: 2, recommendedImageHeight: 260 },
  { value: 'icon-columns', label: 'Icon Columns', group: 'Editorial', description: 'Minimal icon-led columns for trust and capabilities.', recommendedColumns: 3, recommendedImageHeight: 260 },
  { value: 'strategy-cards', label: 'Strategy Cards', group: 'Product', description: 'Large conceptual cards with icons and contrast.', recommendedColumns: 3, recommendedImageHeight: 320 },
  { value: 'offer-showcase', label: 'Offer Showcase', group: 'Product', description: 'Tall offer cards with imagery and compact CTAs.', recommendedColumns: 3, recommendedImageHeight: 520 },
  { value: 'product-highlights', label: 'Product Highlights', group: 'Product', description: 'Feature image cards with descriptions and links.', recommendedColumns: 4, recommendedImageHeight: 320 },
  { value: 'app-showcase', label: 'App Showcase', group: 'Product', description: 'Alternating product visuals and text blocks.', recommendedColumns: 2, recommendedImageHeight: 420 },
  { value: 'metrics-panel', label: 'Metrics Panel', group: 'Product', description: 'Large interface visual with supporting feature tabs.', recommendedColumns: 3, recommendedImageHeight: 520 },
  { value: 'checklist-cards', label: 'Checklist Cards', group: 'Product', description: 'Cards with image headers and concise bullet lists.', recommendedColumns: 3, recommendedImageHeight: 230 },
  { value: 'neon-glow', label: 'Neon Glow', group: 'Technical', description: 'Dark cards with strong glow effects.', recommendedColumns: 3, recommendedImageHeight: 340 },
  { value: 'dark-capability-grid', label: 'Capability Grid', group: 'Technical', description: 'Dark compact cards for product capabilities.', recommendedColumns: 3, recommendedImageHeight: 260 },
  { value: 'cinematic-gym', label: 'Cinematic Split', group: 'Technical', description: 'Asymmetric cinematic layout for intense brands.', recommendedColumns: 3, recommendedImageHeight: 420 },
];

export const ACTIVE_FEATURE_VARIANT_VALUES = FEATURE_VARIANT_VALUES
  .filter(value => value !== 'cinematic-gym');

export const ACTIVE_FEATURE_VARIANTS = FEATURE_VARIANTS
  .filter(variant => variant.value !== 'cinematic-gym');

export const FEATURE_VARIANT_OPTIONS = ACTIVE_FEATURE_VARIANTS.map(({ value, label }) => ({ value, label }));

export const FEATURE_VARIANT_GROUPS = (['Core', 'Media', 'Editorial', 'Product', 'Technical'] as const).map(group => ({
  label: group,
  options: ACTIVE_FEATURE_VARIANTS
    .filter(variant => variant.group === group)
    .map(({ value, label }) => ({ value, label })),
}));

export const FEATURE_VARIANT_PROMPT_VALUES = ACTIVE_FEATURE_VARIANT_VALUES
  .join('|');

export const IMAGE_LED_FEATURE_VARIANTS: FeatureVariant[] = [
  'image-overlay',
  'editorial-mosaic',
  'gallery-strip',
  'visual-proof-grid',
  'dark-showcase',
  'split-list',
  'offer-showcase',
  'product-highlights',
  'app-showcase',
  'metrics-panel',
  'checklist-cards',
];

export const getFeatureVariantMeta = (value?: string): FeatureVariantMeta => {
  return FEATURE_VARIANTS.find(variant => variant.value === value) || FEATURE_VARIANTS[0];
};
