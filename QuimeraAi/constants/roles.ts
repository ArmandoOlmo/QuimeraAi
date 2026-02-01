import { RolePermissions } from '../types';

// ============================================
// OWNER EMAIL - FROM ENVIRONMENT VARIABLE
// Set VITE_OWNER_EMAIL in your .env file
// This is more secure than hardcoding the email
// ============================================
export const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL || '';

// Definición de permisos por rol
export const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
    owner: {
        // Gestión de usuarios
        canViewUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        canManageRoles: true,
        canCreateSuperAdmin: true, // ¡SOLO EL OWNER!

        // Gestión de tenants
        canViewTenants: true,
        canEditTenants: true,
        canDeleteTenants: true,
        canManageTenantLimits: true,

        // Configuración global
        canEditGlobalSettings: true,
        canEditPrompts: true,
        canEditDesignTokens: true,
        canViewBilling: true,
        canEditBilling: true,

        // Contenido y proyectos
        canViewAllProjects: true,
        canEditAllProjects: true,
        canDeleteAllProjects: true,

        // Estadísticas
        canViewUsageStats: true,
        canExportData: true,
    },
    superadmin: {
        // Gestión de usuarios
        canViewUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        canManageRoles: true,
        canCreateSuperAdmin: false, // NO puede crear otros superadmins

        // Gestión de tenants
        canViewTenants: true,
        canEditTenants: true,
        canDeleteTenants: true,
        canManageTenantLimits: true,

        // Configuración global
        canEditGlobalSettings: true,
        canEditPrompts: true,
        canEditDesignTokens: true,
        canViewBilling: true,
        canEditBilling: true,

        // Contenido y proyectos
        canViewAllProjects: true,
        canEditAllProjects: true,
        canDeleteAllProjects: true,

        // Estadísticas
        canViewUsageStats: true,
        canExportData: true,
    },
    admin: {
        // Gestión de usuarios - puede gestionar pero no roles críticos
        canViewUsers: true,
        canEditUsers: true,
        canDeleteUsers: false, // No puede eliminar usuarios
        canManageRoles: false, // No puede cambiar roles
        canCreateSuperAdmin: false,

        // Gestión de tenants - solo ver
        canViewTenants: true,
        canEditTenants: false,
        canDeleteTenants: false,
        canManageTenantLimits: false,

        // Configuración global - limitado
        canEditGlobalSettings: false,
        canEditPrompts: true, // Puede editar prompts
        canEditDesignTokens: true, // Puede editar design tokens
        canViewBilling: true,
        canEditBilling: false,

        // Contenido y proyectos - acceso completo
        canViewAllProjects: true,
        canEditAllProjects: true,
        canDeleteAllProjects: true,

        // Estadísticas
        canViewUsageStats: true,
        canExportData: true,
    },
    manager: {
        // Gestión de usuarios - solo ver
        canViewUsers: true,
        canEditUsers: false,
        canDeleteUsers: false,
        canManageRoles: false,
        canCreateSuperAdmin: false,

        // Gestión de tenants - sin acceso
        canViewTenants: false,
        canEditTenants: false,
        canDeleteTenants: false,
        canManageTenantLimits: false,

        // Configuración global - sin acceso
        canEditGlobalSettings: false,
        canEditPrompts: false,
        canEditDesignTokens: false,
        canViewBilling: true, // Solo ver
        canEditBilling: false,

        // Contenido y proyectos - puede ver y editar
        canViewAllProjects: true,
        canEditAllProjects: true,
        canDeleteAllProjects: false, // No puede eliminar

        // Estadísticas
        canViewUsageStats: true,
        canExportData: false,
    },
    user: {
        // Gestión de usuarios - sin acceso
        canViewUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canManageRoles: false,
        canCreateSuperAdmin: false,

        // Gestión de tenants - sin acceso
        canViewTenants: false,
        canEditTenants: false,
        canDeleteTenants: false,
        canManageTenantLimits: false,

        // Configuración global - sin acceso
        canEditGlobalSettings: false,
        canEditPrompts: false,
        canEditDesignTokens: false,
        canViewBilling: false,
        canEditBilling: false,

        // Contenido y proyectos - solo sus propios proyectos
        canViewAllProjects: false,
        canEditAllProjects: false,
        canDeleteAllProjects: false,

        // Estadísticas - sin acceso
        canViewUsageStats: false,
        canExportData: false,
    },
};

// Helper para obtener permisos
export const getPermissions = (role: string = 'user'): RolePermissions => {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
};

// Helper para verificar si es owner
export const isOwner = (emailOrUid: string): boolean => {
    if (!emailOrUid || !OWNER_EMAIL) return false;
    return emailOrUid.toLowerCase() === OWNER_EMAIL.toLowerCase();
};

// Helper para determinar el rol correcto (owner siempre es owner)
export const determineRole = (email: string, assignedRole: string = 'user'): string => {
    if (isOwner(email)) return 'owner';
    return assignedRole;
};

// Labels en español
export const ROLE_LABELS: Record<string, string> = {
    owner: 'Owner (Creador)',
    superadmin: 'Super Admin',
    admin: 'Administrador',
    manager: 'Gestor',
    user: 'Usuario'
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
    owner: 'Acceso total y único que puede crear Super Admins',
    superadmin: 'Acceso total excepto crear otros Super Admins',
    admin: 'Puede gestionar usuarios y contenido, pero no configuraciones críticas',
    manager: 'Puede ver y editar contenido, sin acceso administrativo',
    user: 'Usuario estándar sin accesos administrativos'
};

export const ROLE_COLORS: Record<string, string> = {
    owner: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
    superadmin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    manager: 'bg-green-500/20 text-green-400 border-green-500/30',
    user: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};
