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
 * - development: Solo Super Admin puede acceder (para desarrollo/testing)
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
    | 'cms'              // Content Management System
    | 'crm'              // Customer Relationship Management
    | 'ecommerce'        // Tienda online
    | 'chatbot'          // Chatbot de proyecto
    | 'emailMarketing'   // Email Marketing
    | 'aiFeatures'       // Funciones de IA (generación de contenido, imágenes)
    | 'analytics'        // Analytics avanzados
    | 'appointments'     // Sistema de citas
    | 'domains'          // Dominios personalizados
    | 'templates'        // Plantillas de sitio
    | 'finance';         // Herramientas financieras

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
    { id: 'cms', nameKey: 'services.cms', descriptionKey: 'services.cmsDesc', icon: 'FileText', category: 'core' },
    { id: 'crm', nameKey: 'services.crm', descriptionKey: 'services.crmDesc', icon: 'Users', category: 'core' },
    { id: 'ecommerce', nameKey: 'services.ecommerce', descriptionKey: 'services.ecommerceDesc', icon: 'ShoppingCart', category: 'core' },
    { id: 'chatbot', nameKey: 'services.chatbot', descriptionKey: 'services.chatbotDesc', icon: 'Bot', category: 'marketing' },
    { id: 'emailMarketing', nameKey: 'services.emailMarketing', descriptionKey: 'services.emailMarketingDesc', icon: 'Mail', category: 'marketing' },
    { id: 'aiFeatures', nameKey: 'services.aiFeatures', descriptionKey: 'services.aiFeaturesDesc', icon: 'Sparkles', category: 'advanced' },
    { id: 'analytics', nameKey: 'services.analytics', descriptionKey: 'services.analyticsDesc', icon: 'BarChart3', category: 'advanced' },
    { id: 'appointments', nameKey: 'services.appointments', descriptionKey: 'services.appointmentsDesc', icon: 'Calendar', category: 'tools' },
    { id: 'domains', nameKey: 'services.domains', descriptionKey: 'services.domainsDesc', icon: 'Globe', category: 'tools' },
    { id: 'templates', nameKey: 'services.templates', descriptionKey: 'services.templatesDesc', icon: 'LayoutTemplate', category: 'core' },
    { id: 'finance', nameKey: 'services.finance', descriptionKey: 'services.financeDesc', icon: 'Wallet', category: 'tools' },
];

// =============================================================================
// SERVICE CONFIGURATION
// =============================================================================

/**
 * Configuración de un servicio individual
 */
export interface ServiceConfig {
    status: ServiceStatus;
    statusReason?: string;
    updatedAt: { seconds: number; nanoseconds: number };
    updatedBy: string;
}

/**
 * Estado global de disponibilidad de servicios
 * Almacenado en: globalSettings/serviceAvailability
 */
export interface GlobalServiceAvailability {
    services: Record<PlatformServiceId, ServiceConfig>;
    lastUpdated: { seconds: number; nanoseconds: number };
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
    timestamp: { seconds: number; nanoseconds: number };
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
    userRole: string
): boolean {
    const role = userRole?.toLowerCase() || '';
    switch (status) {
        case 'public':
            return true; // Visible según plan
        case 'not_public':
            return false; // Nadie puede acceder
        case 'development':
            return role === 'superadmin' || role === 'owner';
    }
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
