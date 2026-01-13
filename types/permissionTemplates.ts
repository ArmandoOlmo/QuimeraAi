/**
 * Permission Templates Types
 * Types for customizable permission templates system
 */

import type { AgencyRole, TenantPermissions } from './multiTenant';

// =============================================================================
// PERMISSION TEMPLATE TYPES
// =============================================================================

export interface ProjectPermissions {
    canView: boolean;
    canEdit: boolean;
    canPublish: boolean;
    canDelete: boolean;
    canManageSettings: boolean;
}

export interface PermissionTemplate {
    id: string;
    tenantId: string;
    name: string;
    description: string;
    role: AgencyRole;

    // Global tenant permissions
    permissions: TenantPermissions;

    // Project-level permissions (optional)
    projectLevelPermissions?: {
        [projectId: string]: ProjectPermissions;
    };

    // System vs custom
    isSystem: boolean;  // true for predefined templates
    category?: 'content' | 'sales' | 'technical' | 'management' | 'custom';

    // Metadata
    createdBy: string;
    createdByName?: string;
    createdAt: { seconds: number; nanoseconds: number };
    updatedAt?: { seconds: number; nanoseconds: number };

    // Usage tracking
    usageCount?: number;
    lastUsedAt?: { seconds: number; nanoseconds: number };
}

// =============================================================================
// SYSTEM PERMISSION TEMPLATES
// =============================================================================

/**
 * Predefined system templates that agencies can use
 */
export const SYSTEM_PERMISSION_TEMPLATES: Omit<PermissionTemplate, 'id' | 'tenantId' | 'createdAt' | 'createdBy'>[] = [
    {
        name: 'Editor de Blog Únicamente',
        description: 'Solo puede editar contenido del blog/CMS. Ideal para escritores de contenido.',
        role: 'agency_member',
        category: 'content',
        permissions: {
            canManageProjects: false,
            canManageLeads: false,
            canManageCMS: true,
            canManageEcommerce: false,
            canManageFiles: true,
            canManageDomains: false,
            canInviteMembers: false,
            canRemoveMembers: false,
            canViewAnalytics: false,
            canManageBilling: false,
            canManageSettings: false,
            canExportData: false,
        },
        isSystem: true,
    },
    {
        name: 'Especialista en CRM',
        description: 'Solo acceso a leads y CRM. Perfecto para equipos de ventas.',
        role: 'agency_member',
        category: 'sales',
        permissions: {
            canManageProjects: false,
            canManageLeads: true,
            canManageCMS: false,
            canManageEcommerce: false,
            canManageFiles: false,
            canManageDomains: false,
            canInviteMembers: false,
            canRemoveMembers: false,
            canViewAnalytics: true,
            canManageBilling: false,
            canManageSettings: false,
            canExportData: true,
        },
        isSystem: true,
    },
    {
        name: 'Gerente de E-commerce',
        description: 'Gestión completa de tienda online, productos, órdenes y clientes.',
        role: 'agency_member',
        category: 'sales',
        permissions: {
            canManageProjects: false,
            canManageLeads: true,
            canManageCMS: false,
            canManageEcommerce: true,
            canManageFiles: true,
            canManageDomains: false,
            canInviteMembers: false,
            canRemoveMembers: false,
            canViewAnalytics: true,
            canManageBilling: false,
            canManageSettings: false,
            canExportData: true,
        },
        isSystem: true,
    },
    {
        name: 'Diseñador Web',
        description: 'Puede editar diseño y contenido visual, pero no configuraciones.',
        role: 'agency_member',
        category: 'technical',
        permissions: {
            canManageProjects: true,
            canManageLeads: false,
            canManageCMS: true,
            canManageEcommerce: false,
            canManageFiles: true,
            canManageDomains: false,
            canInviteMembers: false,
            canRemoveMembers: false,
            canViewAnalytics: false,
            canManageBilling: false,
            canManageSettings: false,
            canExportData: false,
        },
        isSystem: true,
    },
    {
        name: 'Analista de Datos',
        description: 'Solo visualización de analytics y exportación de datos.',
        role: 'agency_member',
        category: 'management',
        permissions: {
            canManageProjects: false,
            canManageLeads: false,
            canManageCMS: false,
            canManageEcommerce: false,
            canManageFiles: false,
            canManageDomains: false,
            canInviteMembers: false,
            canRemoveMembers: false,
            canViewAnalytics: true,
            canManageBilling: false,
            canManageSettings: false,
            canExportData: true,
        },
        isSystem: true,
    },
    {
        name: 'Soporte al Cliente',
        description: 'Puede ver contenido y responder a leads, pero no modificar.',
        role: 'client',
        category: 'management',
        permissions: {
            canManageProjects: false,
            canManageLeads: true,
            canManageCMS: false,
            canManageEcommerce: false,
            canManageFiles: false,
            canManageDomains: false,
            canInviteMembers: false,
            canRemoveMembers: false,
            canViewAnalytics: true,
            canManageBilling: false,
            canManageSettings: false,
            canExportData: false,
        },
        isSystem: true,
    },
    {
        name: 'Gestor de Contenido Completo',
        description: 'Control total sobre contenido: CMS, productos, archivos.',
        role: 'agency_admin',
        category: 'content',
        permissions: {
            canManageProjects: true,
            canManageLeads: true,
            canManageCMS: true,
            canManageEcommerce: true,
            canManageFiles: true,
            canManageDomains: false,
            canInviteMembers: false,
            canRemoveMembers: false,
            canViewAnalytics: true,
            canManageBilling: false,
            canManageSettings: false,
            canExportData: true,
        },
        isSystem: true,
    },
    {
        name: 'Gerente de Proyecto',
        description: 'Puede gestionar proyectos, miembros y ver analytics.',
        role: 'agency_admin',
        category: 'management',
        permissions: {
            canManageProjects: true,
            canManageLeads: true,
            canManageCMS: true,
            canManageEcommerce: true,
            canManageFiles: true,
            canManageDomains: true,
            canInviteMembers: true,
            canRemoveMembers: false,
            canViewAnalytics: true,
            canManageBilling: false,
            canManageSettings: false,
            canExportData: true,
        },
        isSystem: true,
    },
];

// =============================================================================
// TEMPLATE APPLICATION
// =============================================================================

export interface ApplyTemplateRequest {
    templateId: string;
    userId: string;
    tenantId: string;
    projectIds?: string[];  // Optional: apply only to specific projects
    override?: Partial<TenantPermissions>;  // Optional: override specific permissions
}

export interface ApplyTemplateResponse {
    success: boolean;
    appliedPermissions: TenantPermissions;
    appliedProjects?: string[];
    error?: string;
}

// =============================================================================
// TEMPLATE CREATION/EDITING
// =============================================================================

export interface CreateTemplateRequest {
    tenantId: string;
    name: string;
    description: string;
    role: AgencyRole;
    permissions: TenantPermissions;
    category?: PermissionTemplate['category'];
    projectLevelPermissions?: PermissionTemplate['projectLevelPermissions'];
}

export interface UpdateTemplateRequest {
    templateId: string;
    name?: string;
    description?: string;
    permissions?: Partial<TenantPermissions>;
    projectLevelPermissions?: PermissionTemplate['projectLevelPermissions'];
}

// =============================================================================
// TEMPLATE PREVIEW
// =============================================================================

export interface PermissionPreview {
    template: PermissionTemplate;
    grantedPermissions: string[];  // Human-readable list
    restrictedPermissions: string[];  // Human-readable list
    riskLevel: 'low' | 'medium' | 'high';  // Based on granted permissions
    recommendations?: string[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get human-readable permission names
 */
export function getPermissionLabels(): Record<keyof TenantPermissions, string> {
    return {
        canManageProjects: 'Gestionar Proyectos',
        canManageLeads: 'Gestionar Leads',
        canManageCMS: 'Gestionar CMS/Blog',
        canManageEcommerce: 'Gestionar E-commerce',
        canManageFiles: 'Gestionar Archivos',
        canManageDomains: 'Gestionar Dominios',
        canInviteMembers: 'Invitar Miembros',
        canRemoveMembers: 'Remover Miembros',
        canViewAnalytics: 'Ver Analytics',
        canManageBilling: 'Gestionar Facturación',
        canManageSettings: 'Gestionar Configuración',
        canExportData: 'Exportar Datos',
    };
}

/**
 * Calculate risk level of a permission set
 */
export function calculateRiskLevel(permissions: TenantPermissions): 'low' | 'medium' | 'high' {
    const highRiskPermissions = [
        'canRemoveMembers',
        'canManageBilling',
        'canManageSettings',
        'canManageDomains',
    ];

    const grantedHighRisk = highRiskPermissions.filter(
        (perm) => permissions[perm as keyof TenantPermissions]
    );

    if (grantedHighRisk.length >= 2) return 'high';
    if (grantedHighRisk.length === 1) return 'medium';
    return 'low';
}

/**
 * Get granted permissions list
 */
export function getGrantedPermissions(permissions: TenantPermissions): string[] {
    const labels = getPermissionLabels();
    return Object.entries(permissions)
        .filter(([_, value]) => value === true)
        .map(([key, _]) => labels[key as keyof TenantPermissions]);
}

/**
 * Get restricted permissions list
 */
export function getRestrictedPermissions(permissions: TenantPermissions): string[] {
    const labels = getPermissionLabels();
    return Object.entries(permissions)
        .filter(([_, value]) => value === false)
        .map(([key, _]) => labels[key as keyof TenantPermissions]);
}

/**
 * Compare two permission sets
 */
export function comparePermissions(
    current: TenantPermissions,
    proposed: TenantPermissions
): {
    added: string[];
    removed: string[];
    unchanged: string[];
} {
    const labels = getPermissionLabels();
    const added: string[] = [];
    const removed: string[] = [];
    const unchanged: string[] = [];

    Object.keys(current).forEach((key) => {
        const permKey = key as keyof TenantPermissions;
        const label = labels[permKey];

        if (current[permKey] === proposed[permKey]) {
            unchanged.push(label);
        } else if (!current[permKey] && proposed[permKey]) {
            added.push(label);
        } else if (current[permKey] && !proposed[permKey]) {
            removed.push(label);
        }
    });

    return { added, removed, unchanged };
}

/**
 * Validate template name
 */
export function isValidTemplateName(name: string): boolean {
    return name.length >= 3 && name.length <= 50;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
    templates: PermissionTemplate[],
    category: PermissionTemplate['category']
): PermissionTemplate[] {
    return templates.filter((t) => t.category === category);
}

/**
 * Get most used templates
 */
export function getMostUsedTemplates(
    templates: PermissionTemplate[],
    limit: number = 5
): PermissionTemplate[] {
    return templates
        .filter((t) => !t.isSystem)
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, limit);
}

/**
 * Get category label
 */
export function getCategoryLabel(category: PermissionTemplate['category']): string {
    const labels: Record<NonNullable<PermissionTemplate['category']>, string> = {
        content: 'Contenido',
        sales: 'Ventas',
        technical: 'Técnico',
        management: 'Gestión',
        custom: 'Personalizado',
    };
    return category ? labels[category] : 'Sin categoría';
}

/**
 * Get category color
 */
export function getCategoryColor(category: PermissionTemplate['category']): string {
    const colors: Record<NonNullable<PermissionTemplate['category']>, string> = {
        content: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        sales: 'bg-green-500/20 text-green-400 border-green-500/30',
        technical: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        management: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        custom: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return category ? colors[category] : colors.custom;
}
