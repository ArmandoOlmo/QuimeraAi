export const PRICING_VARIANT_VALUES = [
  'dark-saas-cards',
  'featured-plan',
  'voice-credit-columns',
  'dark-plan-cards',
  'finance-comparison',
  'subscription-shop',
  'bi-panels',
  'grouped-plan-grid',
  'workflow-rows',
  'addon-cards',
] as const;

export type PricingVariant = typeof PRICING_VARIANT_VALUES[number];

export interface PricingVariantMeta {
  value: PricingVariant;
  label: string;
  group: 'SaaS' | 'Commerce' | 'Finance' | 'Services';
  description: string;
  recommendedColumns: 2 | 3 | 4;
}

export const PRICING_VARIANTS: PricingVariantMeta[] = [
  { value: 'dark-saas-cards', label: 'Dark SaaS Cards', group: 'SaaS', description: 'Dark annual-plan cards with a strong featured middle plan and enterprise strip.', recommendedColumns: 3 },
  { value: 'featured-plan', label: 'Featured Plan', group: 'SaaS', description: 'Light pricing cards with one elevated dark featured plan and optional enterprise band.', recommendedColumns: 3 },
  { value: 'voice-credit-columns', label: 'Credit Columns', group: 'SaaS', description: 'Tall column comparison with plan credits, dense feature rows, and one visual featured card.', recommendedColumns: 4 },
  { value: 'dark-plan-cards', label: 'Dark Plan Cards', group: 'SaaS', description: 'Minimal dark cards with large prices, checklists, and high-contrast CTAs.', recommendedColumns: 3 },
  { value: 'finance-comparison', label: 'Finance Comparison', group: 'Finance', description: 'Large two-card financing comparison with oversize monthly payment numbers.', recommendedColumns: 2 },
  { value: 'subscription-shop', label: 'Subscription Shop', group: 'Commerce', description: 'Image-led subscription cards over a storefront or product background.', recommendedColumns: 2 },
  { value: 'bi-panels', label: 'BI Panels', group: 'SaaS', description: 'Business intelligence style panels with sharp dividers and a highlighted center plan.', recommendedColumns: 3 },
  { value: 'grouped-plan-grid', label: 'Grouped Plan Grid', group: 'SaaS', description: 'Individual and team plan groups with clean cards and optional accent wash.', recommendedColumns: 3 },
  { value: 'workflow-rows', label: 'Workflow Rows', group: 'Services', description: 'Stacked horizontal service packages with price, CTA, and feature checklist columns.', recommendedColumns: 2 },
  { value: 'addon-cards', label: 'Add-on Cards', group: 'SaaS', description: 'Compact dark add-on cards with vivid CTA accents for optional upgrades.', recommendedColumns: 3 },
];

export const PRICING_VARIANT_OPTIONS = PRICING_VARIANTS.map(({ value, label }) => ({ value, label }));

export const PRICING_VARIANT_GROUPS = (['SaaS', 'Commerce', 'Finance', 'Services'] as const).map(group => ({
  label: group,
  options: PRICING_VARIANTS
    .filter(variant => variant.group === group)
    .map(({ value, label }) => ({ value, label })),
}));

export const PRICING_VARIANT_PROMPT_VALUES = PRICING_VARIANT_VALUES.join('|');

export const LEGACY_PRICING_VARIANT_MAP: Record<string, PricingVariant> = {
  classic: 'featured-plan',
  default: 'featured-plan',
  gradient: 'bi-panels',
  glassmorphism: 'dark-saas-cards',
  minimalist: 'grouped-plan-grid',
  'neon-glow': 'dark-plan-cards',
  comparison: 'bi-panels',
};

export const normalizePricingVariant = (value?: string | null): PricingVariant => {
  if (value && (PRICING_VARIANT_VALUES as readonly string[]).includes(value)) {
    return value as PricingVariant;
  }
  return LEGACY_PRICING_VARIANT_MAP[value || ''] || 'featured-plan';
};

export const getPricingVariantMeta = (value?: string | null): PricingVariantMeta => {
  const normalized = normalizePricingVariant(value);
  return PRICING_VARIANTS.find(variant => variant.value === normalized) || PRICING_VARIANTS[1];
};
