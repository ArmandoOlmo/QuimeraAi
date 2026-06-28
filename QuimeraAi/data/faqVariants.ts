export const FAQ_VARIANT_VALUES = [
  'classic',
  'cards',
  'gradient',
  'minimal',
  'editorial-split',
  'boxed-list',
  'dark-panel',
  'image-split',
  'stacked-cards',
  'answer-panel',
  'contact-card',
] as const;

export type FaqVariant = typeof FAQ_VARIANT_VALUES[number];

export interface FaqVariantMeta {
  value: FaqVariant;
  label: string;
  group: 'Core' | 'Editorial' | 'Visual' | 'Support';
  description: string;
}

export const FAQ_VARIANTS: FaqVariantMeta[] = [
  { value: 'classic', label: 'Classic', group: 'Core', description: 'Simple accordion with dividers.' },
  { value: 'cards', label: 'Cards', group: 'Core', description: 'Compact card accordion for dense answers.' },
  { value: 'gradient', label: 'Gradient', group: 'Core', description: 'Accent-led cards with soft gradient states.' },
  { value: 'minimal', label: 'Minimal', group: 'Core', description: 'Icon-led rows with open answers.' },
  { value: 'editorial-split', label: 'Editorial Split', group: 'Editorial', description: 'Large left headline with right-side question list.' },
  { value: 'boxed-list', label: 'Boxed List', group: 'Editorial', description: 'Centered framed FAQ list with strong hierarchy.' },
  { value: 'image-split', label: 'Image Split', group: 'Visual', description: 'Large media panel paired with concise FAQs.' },
  { value: 'stacked-cards', label: 'Stacked Cards', group: 'Visual', description: 'Left intro with stacked answer cards.' },
  { value: 'dark-panel', label: 'Dark Panel', group: 'Support', description: 'Contained dark support panel with card rows.' },
  { value: 'answer-panel', label: 'Answer Panel', group: 'Support', description: 'Question selector with a persistent answer panel.' },
  { value: 'contact-card', label: 'Contact Card', group: 'Support', description: 'FAQ list with an adjacent support card.' },
];

export const FAQ_VARIANT_OPTIONS = FAQ_VARIANTS.map(({ value, label }) => ({ value, label }));

export const FAQ_VARIANT_GROUPS = (['Core', 'Editorial', 'Visual', 'Support'] as const).map(group => ({
  label: group,
  options: FAQ_VARIANTS
    .filter(variant => variant.group === group)
    .map(({ value, label }) => ({ value, label })),
}));

export const FAQ_VARIANT_PROMPT_VALUES = FAQ_VARIANT_VALUES.join('|');

export const FAQ_IMAGE_VARIANTS: FaqVariant[] = ['image-split', 'contact-card'];

export const getFaqVariantMeta = (value?: string): FaqVariantMeta => (
  FAQ_VARIANTS.find(variant => variant.value === value) || FAQ_VARIANTS[0]
);
