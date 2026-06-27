/**
 * Types Index
 * Punto de entrada principal para todos los tipos de la aplicación
 * Este archivo exporta todos los tipos para mantener compatibilidad con imports existentes
 */

// UI & Basic Types
export * from './ui';

// Component Types
export * from './components';

// Business Logic Types
export * from './business';

// Advanced Features Types
export * from './features';

// AI Assistant Types
export * from './ai-assistant';
export * from './globalAssistant';

// Navigation Types
export * from './navigation';

// SEO Types
export * from './seo';

// Domain & Deployment Types
export * from './domains';

// Project Types
export * from './project';

// Appointment Types
export * from './appointments';

// Onboarding Types
export * from './onboarding';

// Meta OAuth Types
export * from './metaOAuth';

// Social Chat Types
export * from './socialChat';

// Multi-Tenant Types
export * from './multiTenant';

// Subscription & AI Credits Types
export * from './subscription';

// App Content Types (Landing page de Quimera)
export * from './appContent';

// Landing Chatbot Types (Chatbot público de Quimera.ai)
export * from './landingChatbot';

// News & Updates Types (Dashboard news feed)
export * from './news';

// Agency Plans Types (Plans that agencies create for their clients)
export * from './agencyPlans';

// Quimera Realty Suite Types
export * from './realty';

// Restaurants Types
export * from './restaurants';

// AI Website Studio plan contract
export * from './websitePlan';
export * from './componentRegistry';
export * from './componentAnatomy';
export * from './colorSystem';
export * from './businessBlueprint';
export * from './versionHistory';
export * from './agencyBlueprint';
export * from './integrationEvents';
export type {
    WebsiteEcommerceBlockCTA,
    WebsiteEcommerceBlockDefinition,
    WebsiteEcommerceBlockEntity,
    WebsiteEcommerceBlockLayout,
    WebsiteEcommerceBlockSeed,
    WebsiteEcommerceBlockSourceConfig,
    WebsiteEcommerceBlockValidationInput,
    WebsiteEcommerceBlockValidationIssue,
} from './websiteEcommerceBlocks';
export type {
    ProductCardBadge,
    ProductCardDisplayOptions,
    ProductCardImage,
    ProductCardImageInput,
    ProductCardImageQuality,
    ProductCardReadiness,
    ProductCardRating,
    ProductCardValidationCode,
    ProductCardValidationIssue,
    ProductCardValidationSeverity,
    ProductCardViewModel,
    ProductCardVisualVariant,
} from './productCard';
export * from './storefrontTheme';
export * from './storefrontRenderer';
