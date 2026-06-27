/**
 * Service Availability Types
 * Sistema de control global de disponibilidad de servicios de la plataforma
 */

// =============================================================================
// SERVICE STATUS
// =============================================================================

/**
 * Estados posibles de un servicio:
 * - public: Visible para todos según su plan de suscripción
 * - not_public: Oculto completamente de la plataforma
 * - development: Oculto para usuarios finales y navegación general
 */
export type ServiceStatus = 'public' | 'not_public' | 'development';

// =============================================================================
// PLATFORM SERVICES
// =============================================================================

/**
 * IDs de servicios de la plataforma.
 * EXTENSIBLE: Agregar nuevos IDs aquí cuando se creen nuevos servicios.
 */
export type PlatformServiceId =
    | 'agency'           // Agency Operating System
    | 'cms'              // Content Management System
    | 'crm'              // Customer Relationship Management
    | 'ecommerce'        // Tienda online
    | 'chatbot'          // Chatbot de proyecto
    | 'emailMarketing'   // Email Marketing
    | 'aiFeatures'       // Funciones de IA (generación de contenido, imágenes)
    | 'analytics'        // Analytics avanzados
    | 'appointments'     // Sistema de citas
    | 'bioPage'          // Bio Page pública y editor
    | 'domains'          // Dominios personalizados
    | 'templates'        // Plantillas de sitio
    | 'finance'          // Herramientas financieras
    | 'realEstate'       // Bienes Raíces
    | 'restaurants';     // Restaurantes

/**
 * Metadata de un servicio para la UI
 */
export interface ServiceMetadata {
    id: PlatformServiceId;
    nameKey: string;           // Translation key for name
    descriptionKey: string;    // Translation key for description
    icon: string;              // Lucide icon name
    category: 'core' | 'marketing' | 'tools' | 'advanced';
}

/**
 * Catálogo de servicios disponibles
 * EXTENSIBLE: Agregar nuevos servicios aquí
 */
export const PLATFORM_SERVICES: ServiceMetadata[] = [
    { id: 'agency', nameKey: 'services.agency', descriptionKey: 'services.agencyDesc', icon: 'Building2', category: 'advanced' },
    { id: 'cms', nameKey: 'services.cms', descriptionKey: 'services.cmsDesc', icon: 'FileText', category: 'core' },
    { id: 'crm', nameKey: 'services.crm', descriptionKey: 'services.crmDesc', icon: 'Users', category: 'core' },
    { id: 'ecommerce', nameKey: 'services.ecommerce', descriptionKey: 'services.ecommerceDesc', icon: 'ShoppingCart', category: 'core' },
    { id: 'chatbot', nameKey: 'services.chatbot', descriptionKey: 'services.chatbotDesc', icon: 'Bot', category: 'marketing' },
    { id: 'emailMarketing', nameKey: 'services.emailMarketing', descriptionKey: 'services.emailMarketingDesc', icon: 'Mail', category: 'marketing' },
    { id: 'aiFeatures', nameKey: 'services.aiFeatures', descriptionKey: 'services.aiFeaturesDesc', icon: 'Sparkles', category: 'advanced' },
    { id: 'analytics', nameKey: 'services.analytics', descriptionKey: 'services.analyticsDesc', icon: 'BarChart3', category: 'advanced' },
    { id: 'appointments', nameKey: 'services.appointments', descriptionKey: 'services.appointmentsDesc', icon: 'Calendar', category: 'tools' },
    { id: 'bioPage', nameKey: 'services.bioPage', descriptionKey: 'services.bioPageDesc', icon: 'Link2', category: 'marketing' },
    { id: 'domains', nameKey: 'services.domains', descriptionKey: 'services.domainsDesc', icon: 'Globe', category: 'tools' },
    { id: 'templates', nameKey: 'services.templates', descriptionKey: 'services.templatesDesc', icon: 'LayoutTemplate', category: 'core' },
    { id: 'finance', nameKey: 'services.finance', descriptionKey: 'services.financeDesc', icon: 'Wallet', category: 'tools' },
    { id: 'realEstate', nameKey: 'services.realEstate', descriptionKey: 'services.realEstateDesc', icon: 'Home', category: 'tools' },
    { id: 'restaurants', nameKey: 'services.restaurants', descriptionKey: 'services.restaurantsDesc', icon: 'Utensils', category: 'tools' },
];

// =============================================================================
// SERVICE CONFIGURATION
// =============================================================================

/**
 * Configuración de un servicio individual
 */
export interface ServiceConfig {
    status: ServiceStatus;
    statusReason?: string | null;
    updatedAt: { seconds: number; nanoseconds: number } | string;
    updatedBy: string;
}

/**
 * Estado global de disponibilidad de servicios
 * Almacenado en: globalSettings/serviceAvailability
 */
export interface GlobalServiceAvailability {
    services: Record<PlatformServiceId, ServiceConfig>;
    lastUpdated: { seconds: number; nanoseconds: number } | string;
    updatedBy: string;
}

// =============================================================================
// AUDIT LOG
// =============================================================================

/**
 * Entrada del audit log
 * Almacenado en: globalSettings/serviceAvailability/auditLog/{entryId}
 */
export interface ServiceAuditEntry {
    id: string;
    serviceId: PlatformServiceId;
    previousStatus: ServiceStatus;
    newStatus: ServiceStatus;
    reason?: string;
    userId: string;
    userEmail: string;
    timestamp: { seconds: number; nanoseconds: number } | string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Obtiene el color del badge según el estado
 */
export function getStatusColor(status: ServiceStatus): string {
    switch (status) {
        case 'public':
            return '#10b981'; // Green
        case 'not_public':
            return '#ef4444'; // Red
        case 'development':
            return '#f59e0b'; // Amber
    }
}

/**
 * Obtiene el label del estado para UI
 */
export function getStatusLabel(status: ServiceStatus): string {
    switch (status) {
        case 'public':
            return 'Público';
        case 'not_public':
            return 'No Público';
        case 'development':
            return 'Desarrollo';
    }
}

/**
 * Verifica si un rol puede acceder a un servicio según su estado
 */
export function canRoleAccessService(
    status: ServiceStatus,
    _userRole: string
): boolean {
    return status === 'public';
}

/**
 * Configuración por defecto para un nuevo servicio
 */
export function getDefaultServiceConfig(userId: string): ServiceConfig {
    return {
        status: 'public',
        updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        updatedBy: userId,
    };
}

/**
 * Genera configuración inicial para todos los servicios
 */
export function getInitialServiceAvailability(userId: string): GlobalServiceAvailability {
    const services: Partial<Record<PlatformServiceId, ServiceConfig>> = {};

    PLATFORM_SERVICES.forEach(service => {
        services[service.id] = getDefaultServiceConfig(userId);
    });

    return {
        services: services as Record<PlatformServiceId, ServiceConfig>,
        lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        updatedBy: userId,
    };
}
