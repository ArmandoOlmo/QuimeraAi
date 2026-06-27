import { getRegistryItem } from '../../data/componentRegistry';
import type { AssistantModuleTarget } from '../../types/globalAssistant';
import type { PlatformServiceId } from '../../types/serviceAvailability';
import type { PageSection, View } from '../../types/ui';
import type { GlobalAssistantGuideTarget } from './globalAssistantModuleGuide';

const MODULE_SERVICE_MAP: Partial<Record<AssistantModuleTarget, PlatformServiceId>> = {
    aiStudio: 'aiFeatures',
    storefront: 'ecommerce',
    ecommerce: 'ecommerce',
    media: 'aiFeatures',
    appointments: 'appointments',
    restaurants: 'restaurants',
    realEstate: 'realEstate',
    crm: 'crm',
    emailMarketing: 'emailMarketing',
    chatbot: 'chatbot',
    bioPage: 'bioPage',
    analytics: 'analytics',
    finance: 'finance',
    agency: 'agency',
};

const GUIDE_TARGET_SERVICE_MAP: Partial<Record<GlobalAssistantGuideTarget | string, PlatformServiceId>> = {
    aiStudio: 'aiFeatures',
    media: 'aiFeatures',
    image: 'aiFeatures',
    video: 'aiFeatures',
    storefront: 'ecommerce',
    ecommerce: 'ecommerce',
    leads: 'crm',
    email: 'emailMarketing',
    cms: 'cms',
    domains: 'domains',
    templates: 'templates',
    blogHub: 'cms',
    chatcore: 'chatbot',
    appointments: 'appointments',
    bioPage: 'bioPage',
    analytics: 'analytics',
    finance: 'finance',
    agency: 'agency',
    restaurants: 'restaurants',
    realEstate: 'realEstate',
};

const VIEW_SERVICE_MAP: Partial<Record<View | string, PlatformServiceId>> = {
    assets: 'aiFeatures',
    templates: 'templates',
    cms: 'cms',
    'ai-assistant': 'chatbot',
    leads: 'crm',
    appointments: 'appointments',
    domains: 'domains',
    finance: 'finance',
    ecommerce: 'ecommerce',
    email: 'emailMarketing',
    biopage: 'bioPage',
    'blog-hub': 'cms',
    restaurants: 'restaurants',
    'real-estate': 'realEstate',
    agency: 'agency',
};

const TARGET_LABELS: Partial<Record<GlobalAssistantGuideTarget | string, { en: string; es: string }>> = {
    aiStudio: { en: 'AI Studio', es: 'AI Studio' },
    media: { en: 'Media AI', es: 'Media AI' },
    image: { en: 'Images', es: 'Imágenes' },
    video: { en: 'Videos', es: 'Videos' },
    storefront: { en: 'Storefront', es: 'Storefront' },
    ecommerce: { en: 'Ecommerce', es: 'Ecommerce' },
    crm: { en: 'Leads', es: 'Leads' },
    leads: { en: 'Leads', es: 'Leads' },
    emailMarketing: { en: 'Email Marketing', es: 'Email Marketing' },
    email: { en: 'Email', es: 'Email' },
    cms: { en: 'CMS', es: 'CMS' },
    domains: { en: 'Domains', es: 'Dominios' },
    templates: { en: 'Templates', es: 'Templates' },
    blogHub: { en: 'Blog Hub', es: 'Blog' },
    chatcore: { en: 'ChatCore', es: 'ChatCore' },
    appointments: { en: 'Appointments', es: 'Citas' },
    bioPage: { en: 'Bio Page', es: 'Página bio' },
    analytics: { en: 'Analytics', es: 'Analíticas' },
    aiFeatures: { en: 'AI', es: 'IA' },
    finance: { en: 'Finance', es: 'Finance' },
    agency: { en: 'Agency', es: 'Agencia' },
    restaurants: { en: 'Restaurants', es: 'Restaurants' },
    realEstate: { en: 'Realty', es: 'Realty' },
    assets: { en: 'Media AI', es: 'Media AI' },
    'ai-assistant': { en: 'ChatCore', es: 'ChatCore' },
    biopage: { en: 'Bio Page', es: 'Bio Page' },
    'blog-hub': { en: 'Blog', es: 'Blog' },
    menu: { en: 'Menu', es: 'Menú' },
    restaurantReservation: { en: 'Restaurant Reservation', es: 'Reservas del restaurante' },
    appointmentBooking: { en: 'Appointments', es: 'Citas' },
    newsletter: { en: 'Newsletter', es: 'Newsletter' },
    featuredProducts: { en: 'Featured Products', es: 'Productos destacados' },
    products: { en: 'Products', es: 'Productos' },
    categoryGrid: { en: 'Categories', es: 'Categorías' },
    chatbot: { en: 'ChatCore', es: 'ChatCore' },
    cmsFeed: { en: 'CMS Feed', es: 'CMS' },
    articleContent: { en: 'Article Content', es: 'CMS' },
};

export const resolveAssistantServiceIdForModule = (
    module?: AssistantModuleTarget | string | null,
): PlatformServiceId | null => {
    if (!module) return null;
    return MODULE_SERVICE_MAP[module as AssistantModuleTarget] || null;
};

export const resolveAssistantServiceIdForGuideTarget = (
    target?: GlobalAssistantGuideTarget | string | null,
): PlatformServiceId | null => {
    if (!target) return null;
    return GUIDE_TARGET_SERVICE_MAP[target] || resolveAssistantServiceIdForModule(target);
};

export const resolveAssistantServiceIdForView = (
    view?: View | string | null,
): PlatformServiceId | null => {
    if (!view) return null;
    return VIEW_SERVICE_MAP[view] || null;
};

export const resolveAssistantServiceIdForEditorSection = (
    section?: PageSection | string | null,
): PlatformServiceId | null => {
    if (!section) return null;
    return getRegistryItem(section as PageSection)?.requiredService || null;
};

export const formatUnavailableAssistantServiceMessage = (input: {
    target?: GlobalAssistantGuideTarget | string | null;
    targetName?: string | null;
    request?: string | null;
    locale?: string | null;
}): string => {
    const locale = (input.locale || '').toLowerCase();
    const spanish = locale.startsWith('es')
        || /\b(quiero|necesito|abre|abrir|crear|revisar|cita|correo|tienda|imagen)\b/i.test(input.request || '');
    const targetLabel = TARGET_LABELS[input.target || ''];
    const targetName = targetLabel
        ? (spanish ? targetLabel.es : targetLabel.en)
        : (input.targetName || (spanish ? 'este servicio' : 'this service'));

    return spanish
        ? `${targetName} no está disponible ahora. Usa un servicio activo o pide a un admin que lo active.`
        : `${targetName} is not available right now. Use an active service or ask an admin to enable it.`;
};
