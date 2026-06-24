export type TokenGroup =
  | 'color'
  | 'typography'
  | 'spacing'
  | 'radius'
  | 'border'
  | 'shadow'
  | 'icon'
  | 'motion'
  | 'layout';

export interface DesignToken {
  name: string;
  cssVariable: string;
  group: TokenGroup;
  value: string;
  usage: string;
}

export const quimeraDesignTokens = {
  color: {
    background: 'var(--q-color-background)',
    surface: 'var(--q-color-surface)',
    surfaceElevated: 'var(--q-color-surface-elevated)',
    surfaceMuted: 'var(--q-color-surface-muted)',
    border: 'var(--q-color-border)',
    borderSubtle: 'var(--q-color-border-subtle)',
    textPrimary: 'var(--q-color-text-primary)',
    textSecondary: 'var(--q-color-text-secondary)',
    textMuted: 'var(--q-color-text-muted)',
    textInverse: 'var(--q-color-text-inverse)',
    primary: 'var(--q-color-primary)',
    primaryHover: 'var(--q-color-primary-hover)',
    primaryActive: 'var(--q-color-primary-active)',
    accent: 'var(--q-color-accent)',
    success: 'var(--q-color-success)',
    warning: 'var(--q-color-warning)',
    danger: 'var(--q-color-danger)',
    info: 'var(--q-color-info)',
  },
  typography: {
    fontSans: 'var(--q-font-sans)',
    fontMono: 'var(--q-font-mono)',
    caption: 'var(--q-font-size-caption)',
    label: 'var(--q-font-size-label)',
    body: 'var(--q-font-size-body)',
    bodyLarge: 'var(--q-font-size-body-lg)',
    headingSmall: 'var(--q-font-size-heading-sm)',
    headingMedium: 'var(--q-font-size-heading-md)',
    headingLarge: 'var(--q-font-size-heading-lg)',
    lineHeightTight: 'var(--q-line-height-tight)',
    lineHeightBody: 'var(--q-line-height-body)',
  },
  spacing: {
    '0': 'var(--q-space-0)',
    '2': 'var(--q-space-0-5)',
    '4': 'var(--q-space-1)',
    '6': 'var(--q-space-1-5)',
    '8': 'var(--q-space-2)',
    '10': 'var(--q-space-2-5)',
    '12': 'var(--q-space-3)',
    '16': 'var(--q-space-4)',
    '20': 'var(--q-space-5)',
    '24': 'var(--q-space-6)',
    '32': 'var(--q-space-8)',
    '40': 'var(--q-space-10)',
    '48': 'var(--q-space-12)',
    '64': 'var(--q-space-16)',
  },
  radius: {
    none: 'var(--q-radius-none)',
    xs: 'var(--q-radius-xs)',
    sm: 'var(--q-radius-sm)',
    md: 'var(--q-radius-md)',
    lg: 'var(--q-radius-lg)',
    xl: 'var(--q-radius-xl)',
    '2xl': 'var(--q-radius-2xl)',
    full: 'var(--q-radius-full)',
  },
  border: {
    width: 'var(--q-border-width)',
    divider: 'var(--q-border-divider)',
    panel: 'var(--q-border-panel)',
    card: 'var(--q-border-card)',
    input: 'var(--q-border-input)',
    focusRing: 'var(--q-focus-ring)',
  },
  shadow: {
    none: 'var(--q-shadow-none)',
    subtle: 'var(--q-shadow-subtle)',
    card: 'var(--q-shadow-card)',
    dropdown: 'var(--q-shadow-dropdown)',
    modal: 'var(--q-shadow-modal)',
    floatingPanel: 'var(--q-shadow-floating-panel)',
  },
  icon: {
    xs: 'var(--q-icon-xs)',
    sm: 'var(--q-icon-sm)',
    md: 'var(--q-icon-md)',
    lg: 'var(--q-icon-lg)',
    xl: 'var(--q-icon-xl)',
  },
  motion: {
    durationFast: 'var(--q-duration-fast)',
    durationNormal: 'var(--q-duration-normal)',
    durationSlow: 'var(--q-duration-slow)',
    easingStandard: 'var(--q-ease-standard)',
    easingEmphasized: 'var(--q-ease-emphasized)',
  },
  layout: {
    sidebarWidth: 'var(--q-layout-sidebar-width)',
    topbarHeight: 'var(--q-layout-topbar-height)',
    inspectorWidth: 'var(--q-layout-inspector-width)',
    builderLeftPanelWidth: 'var(--q-layout-builder-left-panel-width)',
    builderRightPanelWidth: 'var(--q-layout-builder-right-panel-width)',
    contentMaxWidth: 'var(--q-layout-content-max-width)',
    dashboardGap: 'var(--q-layout-dashboard-gap)',
  },
} as const;

export type QuimeraDesignTokens = typeof quimeraDesignTokens;

export const tokenInventory: DesignToken[] = [
  { name: 'color.background', cssVariable: '--q-color-background', group: 'color', value: quimeraDesignTokens.color.background, usage: 'App and dashboard page backgrounds.' },
  { name: 'color.surface', cssVariable: '--q-color-surface', group: 'color', value: quimeraDesignTokens.color.surface, usage: 'Cards, panels, popovers, and inputs.' },
  { name: 'color.primary', cssVariable: '--q-color-primary', group: 'color', value: quimeraDesignTokens.color.primary, usage: 'Primary actions and selected editor controls.' },
  { name: 'color.textPrimary', cssVariable: '--q-color-text-primary', group: 'color', value: quimeraDesignTokens.color.textPrimary, usage: 'Main readable UI text.' },
  { name: 'spacing.16', cssVariable: '--q-space-4', group: 'spacing', value: quimeraDesignTokens.spacing['16'], usage: 'Default component gap/padding step.' },
  { name: 'radius.md', cssVariable: '--q-radius-md', group: 'radius', value: quimeraDesignTokens.radius.md, usage: 'Buttons, inputs, compact controls.' },
  { name: 'radius.xl', cssVariable: '--q-radius-xl', group: 'radius', value: quimeraDesignTokens.radius.xl, usage: 'Panels and grouped editor surfaces.' },
  { name: 'shadow.card', cssVariable: '--q-shadow-card', group: 'shadow', value: quimeraDesignTokens.shadow.card, usage: 'Default card elevation.' },
  { name: 'icon.md', cssVariable: '--q-icon-md', group: 'icon', value: quimeraDesignTokens.icon.md, usage: 'Default app/navigation icons.' },
  { name: 'layout.inspectorWidth', cssVariable: '--q-layout-inspector-width', group: 'layout', value: quimeraDesignTokens.layout.inspectorWidth, usage: 'Right inspector panel width in builders.' },
];
