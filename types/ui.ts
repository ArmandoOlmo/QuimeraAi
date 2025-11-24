/**
 * UI Basic Types
 * Tipos básicos para elementos de interfaz de usuario
 */

// Size Types
export type PaddingSize = 'sm' | 'md' | 'lg';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type BorderRadiusSize = 'none' | 'md' | 'xl' | 'full';
export type BorderSize = 'none' | 'sm' | 'md' | 'lg';

// Layout Types
export type JustifyContent = 'start' | 'center' | 'end';
export type ImagePosition = 'left' | 'right';
export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
export type AspectRatio = 'auto' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
export type ObjectFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

// Theme Types
export type ThemeMode = 'light' | 'dark' | 'black';
export type ImageStyle = 'default' | 'rounded-full' | 'glow' | 'float' | 'hexagon' | 'polaroid';

// Font Families
export type FontFamily = 
  'roboto' | 'open-sans' | 'lato' | 'slabo-27px' | 'oswald' | 'source-sans-pro' |
  'montserrat' | 'raleway' | 'pt-sans' | 'merriweather' | 'lora' | 'ubuntu' |
  'playfair-display' | 'crimson-text' | 'poppins' | 'arvo' | 'mulish' |
  'noto-sans' | 'noto-serif' | 'inconsolata' | 'indie-flower' | 'cabin' |
  'fira-sans' | 'pacifico' | 'josefin-sans' | 'anton' | 'yanone-kaffeesatz' |
  'arimo' | 'lobster' | 'bree-serif' | 'vollkorn' | 'abel' | 'archivo-narrow' |
  'francois-one' | 'signika' | 'oxygen' | 'quicksand' | 'pt-serif' | 'bitter' |
  'exo-2' | 'varela-round' | 'dosis' | 'noticia-text' | 'titillium-web' |
  'nobile' | 'cardo' | 'asap' | 'questrial' | 'dancing-script' | 'amatic-sc';

// View Types
export type View = 'editor' | 'dashboard' | 'websites' | 'superadmin' | 'assets' | 'cms' | 'navigation' | 'ai-assistant' | 'leads' | 'domains' | 'seo';
export type AdminView = 'main' | 'admins' | 'tenants' | 'languages' | 'prompts' | 'stats' | 'billing' | 'templates' | 'components' | 'marketplace' | 'images' | 'global-assistant' | 'design-tokens' | 'analytics' | 'conditional-rules' | 'ab-testing' | 'accessibility' | 'global-seo';

// Page Section Types
export type PageSection = 'hero' | 'features' | 'testimonials' | 'pricing' | 'faq' | 'cta' | 'services' | 'team' | 'video' | 'slideshow' | 'portfolio' | 'leads' | 'newsletter' | 'howItWorks' | 'chatbot' | 'footer' | 'header' | 'typography';

// Theme Data
export interface ThemeData {
    cardBorderRadius: BorderRadiusSize;
    buttonBorderRadius: BorderRadiusSize;
    fontFamilyHeader: FontFamily;
    fontFamilyBody: FontFamily;
    fontFamilyButton: FontFamily;
}

