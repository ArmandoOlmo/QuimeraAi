export const FOOTER_VARIANT_VALUES = [
  'classic',
  'neon-glow',
  'mega-wordmark',
  'compliance-wordmark',
  'grid-newsletter',
  'grid-wordmark',
  'press-landscape',
  'social-waitlist',
  'cta-card',
  'landscape-links',
  'social-directory',
  'super-wordmark',
  'gradient-silhouette',
] as const;

export type FooterVariant = typeof FOOTER_VARIANT_VALUES[number];

export interface FooterVariantMeta {
  value: FooterVariant;
  label: string;
  group: 'Core' | 'Brand' | 'Editorial' | 'Conversion' | 'Visual';
  description: string;
  imageBacked?: boolean;
  wordmarkDriven?: boolean;
}

export const FOOTER_VARIANTS: FooterVariantMeta[] = [
  { value: 'classic', label: 'Classic', group: 'Core', description: 'Balanced brand, links, contact, legal, and social footer.' },
  { value: 'neon-glow', label: 'Neon Glow', group: 'Core', description: 'Dark footer with inner glow and premium depth.' },
  { value: 'mega-wordmark', label: 'Mega Wordmark', group: 'Brand', description: 'Dark editorial footer with navigation above an oversized cropped brand wordmark.', wordmarkDriven: true },
  { value: 'compliance-wordmark', label: 'Compliance Wordmark', group: 'Brand', description: 'Dense legal/social footer with an oversized accent wordmark for bold product brands.', wordmarkDriven: true },
  { value: 'grid-newsletter', label: 'Grid Newsletter', group: 'Conversion', description: 'Structured brand grid with link columns and a horizontal email capture.' },
  { value: 'grid-wordmark', label: 'Grid Wordmark', group: 'Brand', description: 'Blueprint-like grid footer with columns, newsletter, and a large slogan wordmark.', wordmarkDriven: true },
  { value: 'press-landscape', label: 'Press Landscape', group: 'Editorial', description: 'Light editorial footer with press-style navigation, scenic art, and legal disclaimer.', imageBacked: true },
  { value: 'social-waitlist', label: 'Social Waitlist', group: 'Conversion', description: 'Minimal dark footer with a large statement, waitlist CTA, social links, and soft lower artwork.', imageBacked: true },
  { value: 'cta-card', label: 'CTA Card', group: 'Conversion', description: 'Resource columns paired with a large high-contrast call-to-action card.' },
  { value: 'landscape-links', label: 'Landscape Links', group: 'Visual', description: 'Image-led landscape footer with navigation over a scenic background.', imageBacked: true },
  { value: 'social-directory', label: 'Social Directory', group: 'Visual', description: 'Social-heavy directory footer with language selector, many columns, and huge brand type.', wordmarkDriven: true },
  { value: 'super-wordmark', label: 'Super Wordmark', group: 'Brand', description: 'Bright rounded-panel footer with bold gradient wordmark and compact link groups.', wordmarkDriven: true },
  { value: 'gradient-silhouette', label: 'Gradient Silhouette', group: 'Visual', description: 'Dark product footer with structured links over geometric gradient silhouettes.' },
];

export const FOOTER_VARIANT_OPTIONS = FOOTER_VARIANTS.map(({ value, label }) => ({ value, label }));

export const FOOTER_VARIANT_GROUPS = (['Core', 'Brand', 'Editorial', 'Conversion', 'Visual'] as const).map(group => ({
  label: group,
  options: FOOTER_VARIANTS
    .filter(variant => variant.group === group)
    .map(({ value, label }) => ({ value, label })),
}));

export const FOOTER_VARIANT_PROMPT_VALUES = FOOTER_VARIANT_VALUES.join('|');

export const FOOTER_IMAGE_VARIANTS: FooterVariant[] = [
  'press-landscape',
  'social-waitlist',
  'landscape-links',
];

export const FOOTER_WORDMARK_VARIANTS: FooterVariant[] = [
  'mega-wordmark',
  'compliance-wordmark',
  'grid-wordmark',
  'social-directory',
  'super-wordmark',
];

export const getFooterVariantMeta = (value?: string): FooterVariantMeta => (
  FOOTER_VARIANTS.find(variant => variant.value === value) || FOOTER_VARIANTS[0]
);

export const isFooterVariant = (value?: string): value is FooterVariant => (
  Boolean(value && (FOOTER_VARIANT_VALUES as readonly string[]).includes(value))
);
