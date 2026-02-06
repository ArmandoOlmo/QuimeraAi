/**
 * UI Basic Types
 * Tipos básicos para elementos de interfaz de usuario
 */

// Size Types
export type PaddingSize = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type BorderRadiusSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type BorderSize = 'none' | 'sm' | 'md' | 'lg';

// Layout Types
export type JustifyContent = 'start' | 'center' | 'end';
export type ImagePosition = 'left' | 'right';
export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
export type PreviewOrientation = 'portrait' | 'landscape';
export type AspectRatio = 'auto' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
export type ObjectFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

// Theme Types
export type ThemeMode = 'light' | 'dark' | 'black';
export type ImageStyle = 'default' | 'rounded-full' | 'glow' | 'float' | 'hexagon' | 'polaroid';

// Animation Types
export type AnimationType = 'none' | 'fade-in' | 'fade-in-up' | 'fade-in-down' | 'slide-up' | 'slide-down' | 'scale-in' | 'bounce-in';

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
export type View = 'editor' | 'dashboard' | 'websites' | 'superadmin' | 'assets' | 'cms' | 'navigation' | 'ai-assistant' | 'leads' | 'domains' | 'seo' | 'finance' | 'templates' | 'appointments' | 'ecommerce' | 'email' | 'settings' | 'agency' | 'biopage';
export type AdminView = 'main' | 'admins' | 'tenants' | 'languages' | 'prompts' | 'chatbot-prompts' | 'stats' | 'subscriptions' | 'templates' | 'components' | 'images' | 'admin-assets' | 'global-assistant' | 'landing-chatbot' | 'design-tokens' | 'analytics' | 'global-seo' | 'app-info' | 'content' | 'landing-navigation' | 'global-tracking-pixels' | 'changelog' | 'execution-mode' | 'news' | 'landing-editor' | 'service-availability';

// Page Section Types
export type PageSection =
    // Original sections
    | 'hero' | 'heroSplit' | 'features' | 'testimonials' | 'pricing' | 'faq' | 'cta'
    | 'services' | 'team' | 'video' | 'slideshow' | 'portfolio' | 'leads' | 'newsletter'
    | 'howItWorks' | 'chatbot' | 'footer' | 'header' | 'typography' | 'colors' | 'map'
    | 'menu' | 'banner' | 'products'
    // Store settings
    | 'storeSettings'
    // Ecommerce sections (for landing/store pages)
    | 'featuredProducts' | 'categoryGrid' | 'productHero' | 'saleCountdown'
    | 'trustBadges' | 'recentlyViewed' | 'productReviews' | 'collectionBanner'
    | 'productBundle' | 'announcementBar'
    // Dynamic page sections (new multi-page architecture)
    | 'productDetail'      // Section for product detail page (/producto/:slug)
    | 'categoryProducts'   // Section for category page (/categoria/:slug)
    | 'articleContent'     // Section for blog article page (/blog/:slug)
    | 'productGrid'        // Configurable product grid section
    | 'cart'               // Cart section for cart page
    | 'checkout';          // Checkout section for checkout page

// Global Color Palette
export interface GlobalColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    heading: string;
    border: string;
    success: string;
    error: string;
}

// Theme Data
export interface ThemeData {
    // Border Radius
    cardBorderRadius: BorderRadiusSize;
    buttonBorderRadius: BorderRadiusSize;
    // Typography
    fontFamilyHeader: FontFamily;
    fontFamilyBody: FontFamily;
    fontFamilyButton: FontFamily;
    fontFamily?: string;         // Legacy: general font family
    // All Caps options (uppercase transform)
    headingsAllCaps?: boolean;   // Apply to section titles/headings
    buttonsAllCaps?: boolean;    // Apply to buttons
    navLinksAllCaps?: boolean;   // Apply to navigation links
    // Global Colors
    pageBackground: string;
    globalColors: GlobalColors;
    // Legacy color properties (for backward compatibility with deploymentService)
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    headingColor?: string;
    // Palette Colors - colores importados de Coolors.co u otras paletas
    // Se muestran en el selector de colores para acceso rápido
    paletteColors?: string[];
}

