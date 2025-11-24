import { RolePermissions } from '../types';

// EMAIL DEL SUPER ADMIN OWNER
export const OWNER_EMAIL = 'armandoolmomiranda@gmail.com';

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
        // TODOS LOS PERMISOS HABILITADOS
        canViewUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        canManageRoles: true,
        canCreateSuperAdmin: true,
        
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
    manager: {
        // TODOS LOS PERMISOS HABILITADOS
        canViewUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        canManageRoles: true,
        canCreateSuperAdmin: true,
        
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
    user: {
        // TODOS LOS PERMISOS HABILITADOS PARA TODOS LOS USUARIOS
        canViewUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        canManageRoles: true,
        canCreateSuperAdmin: true,
        
        canViewTenants: true,
        canEditTenants: true,
        canDeleteTenants: true,
        canManageTenantLimits: true,
        
        canEditGlobalSettings: true,
        canEditPrompts: true,
        canEditDesignTokens: true,
        canViewBilling: true,
        canEditBilling: true,
        
        canViewAllProjects: true,
        canEditAllProjects: true,
        canDeleteAllProjects: true,
        
        canViewUsageStats: true,
        canExportData: true,
    },
};

// Helper para obtener permisos
export const getPermissions = (role: string = 'user'): RolePermissions => {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
};

// Helper para verificar si es owner
export const isOwner = (email: string): boolean => {
    return email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
};

// Helper para determinar el rol correcto (owner siempre es owner)
export const determineRole = (email: string, assignedRole: string): string => {
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
    admin: 'Puede gestionar usuarios y tenants, pero no configuraciones críticas',
    manager: 'Solo puede ver y gestionar contenido básico',
    user: 'Usuario estándar sin accesos administrativos'
};

export const ROLE_COLORS: Record<string, string> = {
    owner: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
    superadmin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    manager: 'bg-green-500/20 text-green-400 border-green-500/30',
    user: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};

