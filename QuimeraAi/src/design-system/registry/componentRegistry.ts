export type ComponentRegistryCategory =
  | 'foundation'
  | 'layout'
  | 'navigation'
  | 'form'
  | 'feedback'
  | 'data-display'
  | 'editor-control'
  | 'website-section'
  | 'storefront-section'
  | 'ecommerce'
  | 'crm'
  | 'marketing'
  | 'analytics';

export type ComponentRegistryStatus = 'stable' | 'beta' | 'deprecated';

export type QuimeraModule =
  | 'ai-studio'
  | 'dashboard'
  | 'website-builder'
  | 'website-landing-page-studio'
  | 'storefront-builder'
  | 'ecommerce-admin'
  | 'product-management'
  | 'orders'
  | 'customers'
  | 'crm-leads'
  | 'email-marketing'
  | 'chatbot'
  | 'media-ai'
  | 'appointments'
  | 'restaurant'
  | 'real-estate'
  | 'finance'
  | 'analytics'
  | 'settings'
  | 'super-admin'
  | 'auth-onboarding';

export interface ComponentRegistryItem {
  id: string;
  name: string;
  category: ComponentRegistryCategory;
  description: string;
  componentPath: string;
  allowedModules: QuimeraModule[];
  variants: string[];
  tokensUsed: string[];
  requiredFeature?: string;
  requiredPlan?: string;
  editorSupport: boolean;
  aiSelectable: boolean;
  status: ComponentRegistryStatus;
  notes?: string;
}

const allAdminModules: QuimeraModule[] = [
  'dashboard',
  'ecommerce-admin',
  'product-management',
  'orders',
  'customers',
  'crm-leads',
  'email-marketing',
  'chatbot',
  'media-ai',
  'appointments',
  'restaurant',
  'real-estate',
  'finance',
  'analytics',
  'settings',
  'super-admin',
];

const builderModules: QuimeraModule[] = [
  'ai-studio',
  'website-builder',
  'website-landing-page-studio',
  'storefront-builder',
];

export const componentRegistry: ComponentRegistryItem[] = [
  {
    id: 'ds.button',
    name: 'Button',
    category: 'foundation',
    description: 'Canonical action button for app, dashboard, forms, and editor surfaces.',
    componentPath: 'src/design-system/components/Button.tsx',
    allowedModules: [...allAdminModules, ...builderModules, 'auth-onboarding'],
    variants: ['primary', 'secondary', 'ghost', 'subtle', 'destructive', 'link', 'icon'],
    tokensUsed: ['color.primary', 'color.surface', 'radius.md', 'motion.durationFast', 'icon.sm'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
  },
  {
    id: 'ds.icon-button',
    name: 'IconButton',
    category: 'foundation',
    description: 'Icon-only action with controlled sizing and optional frame.',
    componentPath: 'src/design-system/components/Button.tsx',
    allowedModules: [...allAdminModules, ...builderModules],
    variants: ['unframed', 'framed'],
    tokensUsed: ['icon.sm', 'icon.md', 'radius.md', 'color.surfaceMuted'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
    notes: 'Use a frame only when an icon needs contrast against a dense surface.',
  },
  {
    id: 'ds.input',
    name: 'Input',
    category: 'form',
    description: 'Text input with label, helper text, error state, prefix, suffix, disabled and required states.',
    componentPath: 'src/design-system/components/Form.tsx',
    allowedModules: [...allAdminModules, ...builderModules, 'auth-onboarding'],
    variants: ['default', 'error', 'disabled', 'prefix', 'suffix'],
    tokensUsed: ['color.surface', 'color.border', 'color.textPrimary', 'radius.md', 'border.focusRing'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
  },
  {
    id: 'ds.select',
    name: 'Select',
    category: 'form',
    description: 'Native select wrapper for simple option sets.',
    componentPath: 'src/design-system/components/Form.tsx',
    allowedModules: [...allAdminModules, ...builderModules],
    variants: ['default', 'error', 'disabled'],
    tokensUsed: ['color.surface', 'color.border', 'radius.md'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
  },
  {
    id: 'ds.textarea',
    name: 'Textarea',
    category: 'form',
    description: 'Multi-line form field for settings, descriptions, prompts, and editor text controls.',
    componentPath: 'src/design-system/components/Form.tsx',
    allowedModules: [...allAdminModules, ...builderModules, 'auth-onboarding'],
    variants: ['default', 'error', 'disabled'],
    tokensUsed: ['color.surface', 'color.border', 'radius.md'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
  },
  {
    id: 'ds.toggle',
    name: 'Toggle',
    category: 'form',
    description: 'Binary switch for visibility, enablement, and settings flags.',
    componentPath: 'src/design-system/components/Form.tsx',
    allowedModules: [...allAdminModules, ...builderModules],
    variants: ['on', 'off', 'disabled'],
    tokensUsed: ['color.primary', 'color.surfaceMuted', 'radius.full', 'motion.durationFast'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
  },
  {
    id: 'ds.slider',
    name: 'Slider',
    category: 'form',
    description: 'Range control for intensity, size, opacity, radius, and editor values.',
    componentPath: 'src/design-system/components/Form.tsx',
    allowedModules: builderModules,
    variants: ['percentage', 'pixel', 'unitless'],
    tokensUsed: ['color.primary', 'color.surfaceMuted'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
  },
  {
    id: 'ds.color-picker-field',
    name: 'ColorPickerField',
    category: 'editor-control',
    description: 'Canonical wrapper around the existing Quimera ColorControl picker.',
    componentPath: 'src/design-system/components/Form.tsx',
    allowedModules: builderModules,
    variants: ['editor'],
    tokensUsed: ['color.surface', 'color.border', 'radius.md'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
    notes: 'Do not introduce a second color picker without replacing ColorControl globally.',
  },
  {
    id: 'ds.card',
    name: 'Card',
    category: 'layout',
    description: 'Reusable content container for dashboards, settings, ecommerce admin, and editor groups.',
    componentPath: 'src/design-system/components/Card.tsx',
    allowedModules: [...allAdminModules, ...builderModules, 'auth-onboarding'],
    variants: ['default', 'elevated', 'interactive', 'selected', 'muted', 'danger', 'dashboard', 'editor'],
    tokensUsed: ['color.surface', 'color.borderSubtle', 'radius.xl', 'shadow.card'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
  },
  {
    id: 'ds.panel',
    name: 'Panel',
    category: 'layout',
    description: 'Settings, inspector, sidebar, and floating panel surface.',
    componentPath: 'src/design-system/components/Card.tsx',
    allowedModules: [...allAdminModules, ...builderModules],
    variants: ['settings', 'inspector', 'sidebar', 'floating'],
    tokensUsed: ['layout.inspectorWidth', 'color.surface', 'border.panel', 'shadow.floatingPanel'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
  },
  {
    id: 'ds.app-shell',
    name: 'AppShell',
    category: 'layout',
    description: 'Canonical application shell frame for sidebar, topbar, main region, and scrollable content.',
    componentPath: 'src/design-system/components/AppShell.tsx',
    allowedModules: allAdminModules,
    variants: ['shell', 'main', 'topbar', 'content'],
    tokensUsed: ['layout.sidebarWidth', 'layout.topbarHeight', 'color.background', 'color.textPrimary'],
    editorSupport: false,
    aiSelectable: false,
    status: 'stable',
    notes: 'Adopted by Dashboard and SettingsPage in DS-04 without changing routes or navigation state.',
  },
  {
    id: 'ds.page-header',
    name: 'PageHeader',
    category: 'layout',
    description: 'Page-level header pattern with icon, title, subtitle, back action, and action slots.',
    componentPath: 'components/ui/system/PageHeader.tsx',
    allowedModules: allAdminModules,
    variants: ['default', 'withIcon', 'withBackAction', 'withActions'],
    tokensUsed: ['color.textPrimary', 'color.textMuted', 'color.border', 'icon.md'],
    editorSupport: false,
    aiSelectable: true,
    status: 'stable',
    notes: 'Use for new dashboard/settings/admin pages instead of hand-rolled page title rows.',
  },
  {
    id: 'dashboard.sidebar-nav',
    name: 'SidebarNav',
    category: 'navigation',
    description: 'Primary dashboard navigation sidebar with mobile, collapsed, sectioned, locked, and active states.',
    componentPath: 'components/dashboard/DashboardSidebar.tsx',
    allowedModules: allAdminModules,
    variants: ['expanded', 'collapsed', 'mobile', 'sectioned', 'locked', 'active'],
    tokensUsed: ['layout.sidebarWidth', 'layout.sidebarCollapsedWidth', 'color.sidebar', 'color.border', 'radius.md', 'icon.md'],
    editorSupport: false,
    aiSelectable: false,
    status: 'beta',
    notes: 'DS-04 normalized visible navigation actions, icon sizing, active/hover surfaces, and layout widths while preserving permissions, route handling, DnD order, and mobile gestures.',
  },
  {
    id: 'ds.section-card',
    name: 'SectionCard',
    category: 'website-section',
    description: 'Builder section item for website, landing page, and storefront structure panels.',
    componentPath: 'src/design-system/components/Card.tsx',
    allowedModules: ['website-builder', 'website-landing-page-studio', 'storefront-builder', 'ai-studio'],
    variants: ['default', 'selected', 'hidden'],
    tokensUsed: ['color.surface', 'color.primary', 'radius.xl', 'icon.md'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
    notes: 'Available for future builder adoption. ComponentTree keeps its legacy visual treatment for now to preserve the editor look.',
  },
  {
    id: 'ds.inspector-group',
    name: 'InspectorGroup',
    category: 'editor-control',
    description: 'Grouped controls for right-side builder panels.',
    componentPath: 'src/design-system/components/Card.tsx',
    allowedModules: builderModules,
    variants: ['default', 'collapsible'],
    tokensUsed: ['color.border', 'spacing.16', 'typography.label'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
    notes: 'Available for future inspector adoption. Existing editor controls keep their legacy visual treatment for now.',
  },
  {
    id: 'ds.builder-control',
    name: 'BuilderControl',
    category: 'editor-control',
    description: 'Canonical wrapper for color, gradient, spacing, radius, typography, layout, visibility, and responsive controls.',
    componentPath: 'src/design-system/components/Card.tsx',
    allowedModules: builderModules,
    variants: ['content', 'color', 'gradient', 'intensity', 'spacing', 'radius', 'typography', 'layout', 'visibility', 'responsive'],
    tokensUsed: ['color.surfaceMuted', 'radius.md', 'spacing.12'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
    notes: 'Now supports helper text, error, required, disabled, action slot, tooltip help and compact density.',
  },
  {
    id: 'ds.background-controls',
    name: 'BackgroundControls',
    category: 'editor-control',
    description: 'Gradient/background editor controls with Soft Aurora, Radial Glow, Linear Premium, and Mesh Soft presets.',
    componentPath: 'src/design-system/backgrounds/backgroundControls.tsx',
    allowedModules: ['website-builder', 'website-landing-page-studio', 'storefront-builder', 'ai-studio'],
    variants: ['softAurora', 'radialGlow', 'linearPremium', 'meshSoft'],
    tokensUsed: ['color.primary', 'color.surface', 'radius.lg'],
    editorSupport: true,
    aiSelectable: true,
    status: 'beta',
    notes: 'Available directly from src/design-system/backgrounds. Legacy editor primitives keep their existing visual controls for now.',
  },
  {
    id: 'ds.gradient-controls',
    name: 'GradientControls',
    category: 'editor-control',
    description: 'Alias for BackgroundControls when editing reusable gradient layers.',
    componentPath: 'src/design-system/backgrounds/backgroundControls.tsx',
    allowedModules: ['website-builder', 'website-landing-page-studio', 'storefront-builder', 'ai-studio'],
    variants: ['softAurora', 'radialGlow', 'linearPremium', 'meshSoft'],
    tokensUsed: ['color.primary', 'color.surface', 'radius.lg'],
    editorSupport: true,
    aiSelectable: true,
    status: 'beta',
    notes: 'Shares implementation with BackgroundControls; do not fork gradient logic.',
  },
  {
    id: 'builder.ecommerce-controls',
    name: 'EcommerceControls',
    category: 'editor-control',
    description: 'Shared ecommerce/storefront section controls for builder/editor surfaces.',
    componentPath: 'components/ui/EcommerceControls.tsx',
    allowedModules: ['website-builder', 'website-landing-page-studio', 'storefront-builder', 'ai-studio'],
    variants: ['featured-products', 'category-grid', 'product-hero', 'trust-badges', 'sale-countdown', 'announcement-bar', 'collection-banner', 'product-bundle', 'store-settings'],
    tokensUsed: ['color.surface', 'color.border', 'radius.md', 'spacing.12'],
    requiredFeature: 'ecommerceEnabled',
    editorSupport: true,
    aiSelectable: false,
    status: 'beta',
    notes: 'Visual migration was rolled back to preserve the existing editor design. Storefront rendering logic remains unchanged.',
  },
  {
    id: 'ds.badge',
    name: 'Badge',
    category: 'feedback',
    description: 'Compact status label for records, plans, products, and AI states.',
    componentPath: 'src/design-system/components/Feedback.tsx',
    allowedModules: [...allAdminModules, ...builderModules, 'auth-onboarding'],
    variants: ['default', 'success', 'warning', 'danger', 'info', 'primary', 'muted'],
    tokensUsed: ['color.success', 'color.warning', 'color.danger', 'color.info', 'radius.full'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
  },
  {
    id: 'ds.alert',
    name: 'Alert',
    category: 'feedback',
    description: 'Inline feedback banner for information, success, warning, and danger states.',
    componentPath: 'src/design-system/components/Feedback.tsx',
    allowedModules: [...allAdminModules, ...builderModules, 'auth-onboarding'],
    variants: ['info', 'success', 'warning', 'danger'],
    tokensUsed: ['color.info', 'color.success', 'color.warning', 'color.danger', 'radius.lg'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
  },
  {
    id: 'ds.empty-state',
    name: 'EmptyState',
    category: 'feedback',
    description: 'Consistent empty, loading-result, and no-data state container.',
    componentPath: 'src/design-system/components/Feedback.tsx',
    allowedModules: [...allAdminModules, ...builderModules],
    variants: ['default'],
    tokensUsed: ['color.surface', 'color.primary', 'radius.xl', 'shadow.card'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
  },
  {
    id: 'ds.modal',
    name: 'Modal',
    category: 'feedback',
    description: 'Radix Dialog modal with Quimera tokens.',
    componentPath: 'src/design-system/components/Overlay.tsx',
    allowedModules: [...allAdminModules, ...builderModules, 'auth-onboarding'],
    variants: ['sm', 'md', 'lg', 'xl'],
    tokensUsed: ['color.surface', 'shadow.modal', 'radius.xl'],
    editorSupport: true,
    aiSelectable: false,
    status: 'stable',
  },
  {
    id: 'ds.drawer',
    name: 'Drawer',
    category: 'feedback',
    description: 'Side drawer for details, carts, settings, and mobile panels.',
    componentPath: 'src/design-system/components/Overlay.tsx',
    allowedModules: [...allAdminModules, 'storefront-builder'],
    variants: ['left', 'right'],
    tokensUsed: ['color.surface', 'shadow.floatingPanel'],
    editorSupport: true,
    aiSelectable: false,
    status: 'stable',
  },
  {
    id: 'ds.tabs',
    name: 'Tabs',
    category: 'navigation',
    description: 'Tokenized tab list, trigger and content primitives for settings, dashboards and editor panels.',
    componentPath: 'src/design-system/components/Tabs.tsx',
    allowedModules: [...allAdminModules, ...builderModules, 'auth-onboarding'],
    variants: ['default'],
    tokensUsed: ['color.surface', 'color.surfaceMuted', 'color.primary', 'radius.lg', 'shadow.card'],
    editorSupport: true,
    aiSelectable: true,
    status: 'stable',
  },
  {
    id: 'ds.tooltip',
    name: 'Tooltip',
    category: 'feedback',
    description: 'Radix tooltip wrapper using Quimera surface, border, radius and shadow tokens.',
    componentPath: 'src/design-system/components/Overlay.tsx',
    allowedModules: [...allAdminModules, ...builderModules, 'auth-onboarding'],
    variants: ['default'],
    tokensUsed: ['color.surfaceElevated', 'color.borderSubtle', 'radius.md', 'shadow.dropdown'],
    editorSupport: true,
    aiSelectable: false,
    status: 'stable',
  },
  {
    id: 'ds.table',
    name: 'Table',
    category: 'data-display',
    description: 'Data table with header, rows, empty state, and loading state.',
    componentPath: 'src/design-system/components/DataDisplay.tsx',
    allowedModules: ['dashboard', 'ecommerce-admin', 'orders', 'customers', 'crm-leads', 'finance', 'analytics', 'settings', 'super-admin'],
    variants: ['default', 'loading', 'empty'],
    tokensUsed: ['color.surface', 'color.borderSubtle', 'radius.xl'],
    editorSupport: false,
    aiSelectable: true,
    status: 'stable',
  },
  {
    id: 'ds.product-card',
    name: 'ProductCard',
    category: 'ecommerce',
    description: 'Storefront product display with controlled visual variants.',
    componentPath: 'src/design-system/components/ProductCard.tsx',
    allowedModules: ['storefront-builder', 'ecommerce-admin', 'product-management', 'ai-studio'],
    variants: ['minimal', 'marketplace', 'luxury', 'compact', 'imageFirst', 'quickBuy'],
    tokensUsed: ['color.surface', 'color.borderSubtle', 'radius.xl', 'shadow.card'],
    requiredFeature: 'ecommerceEnabled',
    editorSupport: true,
    aiSelectable: true,
    status: 'beta',
    notes: 'Existing storefront variants include more aliases; normalize through utils/productCard before rendering.',
  },
];

export const aiSelectableComponents = componentRegistry.filter((item) => item.aiSelectable);

export function getComponentRegistryItem(id: string): ComponentRegistryItem | undefined {
  return componentRegistry.find((item) => item.id === id);
}

export function getComponentsForModule(module: QuimeraModule): ComponentRegistryItem[] {
  return componentRegistry.filter((item) => item.allowedModules.includes(module));
}
