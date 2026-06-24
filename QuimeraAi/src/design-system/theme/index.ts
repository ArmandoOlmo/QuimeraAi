import { quimeraDesignTokens } from '../tokens';

export type ThemeMode = 'light' | 'dark' | 'black';

export const quimeraTheme = {
  name: 'Quimera Design System',
  version: '0.1.0',
  defaultMode: 'light' as ThemeMode,
  tokens: quimeraDesignTokens,
  cssEntryPoints: ['src/styles/tokens.css', 'src/styles/theme.css', 'src/styles/main.css'],
};
