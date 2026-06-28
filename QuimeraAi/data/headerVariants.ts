export const HEADER_VARIANT_VALUES = [
  'sticky-solid',
  'edge-solid',
  'edge-bordered',
  'sticky-transparent',
  'edge-minimal',
  'floating',
  'floating-pill',
  'floating-glass',
  'floating-shadow',
  'transparent-blur',
  'transparent-bordered',
  'transparent-gradient',
  'transparent-gradient-dark',
  'tabbed',
  'mega-panel',
  'rounded-shell',
  'split-cta',
  'dark-dock',
  'center-stage',
] as const;

export type HeaderVariant = typeof HEADER_VARIANT_VALUES[number];

export interface HeaderVariantMeta {
  value: HeaderVariant;
  label: string;
  group: 'Core' | 'Floating' | 'Transparent' | 'Editorial' | 'Utility';
  description: string;
  recommendedLayout: 'minimal' | 'center' | 'stack' | 'classic';
}

export const HEADER_VARIANTS: HeaderVariantMeta[] = [
  { value: 'sticky-solid', label: 'Solid Bar', group: 'Core', description: 'Stable full-width header for broad compatibility.', recommendedLayout: 'minimal' },
  { value: 'edge-solid', label: 'Edge Solid', group: 'Core', description: 'Edge-to-edge brand bar with direct navigation.', recommendedLayout: 'classic' },
  { value: 'edge-bordered', label: 'Bordered Edge', group: 'Core', description: 'Solid header with a crisp accent rule.', recommendedLayout: 'minimal' },
  { value: 'sticky-transparent', label: 'Transparent', group: 'Transparent', description: 'Overlay header for image-led hero sections.', recommendedLayout: 'minimal' },
  { value: 'edge-minimal', label: 'Minimal Edge', group: 'Core', description: 'Low-chrome full-width navigation.', recommendedLayout: 'classic' },
  { value: 'floating', label: 'Floating Bar', group: 'Floating', description: 'Contained floating shell with balanced spacing.', recommendedLayout: 'minimal' },
  { value: 'floating-pill', label: 'Floating Pill', group: 'Floating', description: 'Rounded pill navbar with compact actions.', recommendedLayout: 'minimal' },
  { value: 'floating-glass', label: 'Glass Float', group: 'Floating', description: 'Translucent floating shell for modern landing pages.', recommendedLayout: 'minimal' },
  { value: 'floating-shadow', label: 'Soft Shadow', group: 'Floating', description: 'Raised floating bar with a softer surface.', recommendedLayout: 'minimal' },
  { value: 'transparent-blur', label: 'Blur Overlay', group: 'Transparent', description: 'Blurred overlay header for visual hero pages.', recommendedLayout: 'minimal' },
  { value: 'transparent-bordered', label: 'Border Overlay', group: 'Transparent', description: 'Transparent header with a thin separator.', recommendedLayout: 'classic' },
  { value: 'transparent-gradient', label: 'Fade Overlay', group: 'Transparent', description: 'Header with a controlled gradient fade.', recommendedLayout: 'minimal' },
  { value: 'transparent-gradient-dark', label: 'Dark Fade', group: 'Transparent', description: 'Darkened overlay for high-contrast hero images.', recommendedLayout: 'minimal' },
  { value: 'tabbed', label: 'Tabbed Menu', group: 'Utility', description: 'Navigation links rendered as compact tabs.', recommendedLayout: 'classic' },
  { value: 'mega-panel', label: 'Mega Panel', group: 'Editorial', description: 'Desktop mega-menu panel for rich navigation groups.', recommendedLayout: 'minimal' },
  { value: 'rounded-shell', label: 'Rounded Shell', group: 'Floating', description: 'Large rounded navbar shell with strong CTAs.', recommendedLayout: 'minimal' },
  { value: 'split-cta', label: 'Split CTA', group: 'Utility', description: 'Links and actions arranged for conversion-heavy pages.', recommendedLayout: 'classic' },
  { value: 'dark-dock', label: 'Dark Dock', group: 'Floating', description: 'Dark floating dock for premium SaaS and product pages.', recommendedLayout: 'minimal' },
  { value: 'center-stage', label: 'Center Stage', group: 'Editorial', description: 'Centered brand navigation with balanced side links.', recommendedLayout: 'center' },
];

export const HEADER_VARIANT_GROUPS = (['Core', 'Floating', 'Transparent', 'Editorial', 'Utility'] as const).map(group => ({
  label: group,
  options: HEADER_VARIANTS
    .filter(variant => variant.group === group)
    .map(({ value, label }) => ({ value, label })),
}));

export const HEADER_VARIANT_PROMPT_VALUES = HEADER_VARIANT_VALUES.join('|');

export const HEADER_SOLID_VARIANT_VALUES: HeaderVariant[] = ['sticky-solid', 'edge-solid', 'edge-bordered', 'split-cta', 'center-stage'];

export const HEADER_FLOATING_VARIANT_VALUES: HeaderVariant[] = ['floating', 'floating-pill', 'floating-glass', 'floating-shadow', 'rounded-shell', 'dark-dock'];

export const HEADER_GRADIENT_VARIANT_VALUES: HeaderVariant[] = ['transparent-gradient', 'transparent-gradient-dark'];

export const HEADER_SPECIAL_COLOR_VARIANT_VALUES: HeaderVariant[] = ['tabbed', 'mega-panel', 'rounded-shell', 'dark-dock'];

export const getHeaderVariantMeta = (value?: string): HeaderVariantMeta => (
  HEADER_VARIANTS.find(variant => variant.value === value) || HEADER_VARIANTS[0]
);

export const isHeaderVariant = (value?: string): value is HeaderVariant => (
  Boolean(value && (HEADER_VARIANT_VALUES as readonly string[]).includes(value))
);
