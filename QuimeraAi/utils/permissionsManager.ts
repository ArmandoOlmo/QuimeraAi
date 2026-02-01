import { ComponentPermissions, CustomComponent } from '../types';

/**
 * Permissions Manager
 * Handles component-level permissions and access control
 */

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

/**
 * Check if user role has admin/owner privileges
 */
function hasAdminPrivileges(userRole: string): boolean {
    return userRole === 'owner' || userRole === 'superadmin';
}

/**
 * Check if user has permission to view a component
 */
export function canViewComponent(
    component: CustomComponent,
    userId: string,
    userRole: string
): boolean {
    // Owner and Super admins can always view
    if (hasAdminPrivileges(userRole)) return true;
    
    // Public components can be viewed by anyone
    if (component.isPublic || component.permissions?.isPublic) return true;
    
    // Check if user is in canView or canEdit list
    if (component.permissions) {
        if (component.permissions.canView.includes(userId)) return true;
        if (component.permissions.canEdit.includes(userId)) return true;
    }
    
    // Component creator can always view
    if (component.createdBy === userId) return true;
    
    return false;
}

/**
 * Check if user has permission to edit a component
 */
export function canEditComponent(
    component: CustomComponent,
    userId: string,
    userRole: string
): boolean {
    // Owner and Super admins can always edit
    if (hasAdminPrivileges(userRole)) return true;
    
    // Component creator can edit
    if (component.createdBy === userId) return true;
    
    // Check if user is in canEdit list
    if (component.permissions?.canEdit.includes(userId)) return true;
    
    return false;
}

/**
 * Check if user can delete a component
 */
export function canDeleteComponent(
    component: CustomComponent,
    userId: string,
    userRole: string
): boolean {
    // Owner, super admins and creators can delete
    if (hasAdminPrivileges(userRole)) return true;
    if (component.createdBy === userId) return true;
    
    return false;
}

/**
 * Check if user can manage permissions of a component
 */
export function canManagePermissions(
    component: CustomComponent,
    userId: string,
    userRole: string
): boolean {
    // Owner, super admins and creators can manage permissions
    if (hasAdminPrivileges(userRole)) return true;
    if (component.createdBy === userId) return true;
    
    return false;
}

/**
 * Get user's permission level for a component
 */
export function getPermissionLevel(
    component: CustomComponent,
    userId: string,
    userRole: string
): PermissionLevel {
    if (hasAdminPrivileges(userRole) || component.createdBy === userId) {
        return 'admin';
    }
    
    if (component.permissions?.canEdit.includes(userId)) {
        return 'edit';
    }
    
    if (canViewComponent(component, userId, userRole)) {
        return 'view';
    }
    
    return 'none';
}

/**
 * Add user to component permissions
 */
export function addUserPermission(
    permissions: ComponentPermissions,
    userId: string,
    level: 'view' | 'edit'
): ComponentPermissions {
    const updated = { ...permissions };
    
    if (level === 'edit') {
        // Edit permission includes view
        if (!updated.canEdit.includes(userId)) {
            updated.canEdit = [...updated.canEdit, userId];
        }
        // Remove from view-only if present
        updated.canView = updated.canView.filter(id => id !== userId);
    } else {
        // Add to view if not already in edit
        if (!updated.canEdit.includes(userId) && !updated.canView.includes(userId)) {
            updated.canView = [...updated.canView, userId];
        }
    }
    
    return updated;
}

/**
 * Remove user from component permissions
 */
export function removeUserPermission(
    permissions: ComponentPermissions,
    userId: string
): ComponentPermissions {
    return {
        ...permissions,
        canView: permissions.canView.filter(id => id !== userId),
        canEdit: permissions.canEdit.filter(id => id !== userId)
    };
}

/**
 * Make component public or private
 */
export function setComponentPublic(
    permissions: ComponentPermissions,
    isPublic: boolean
): ComponentPermissions {
    return {
        ...permissions,
        isPublic
    };
}

/**
 * Get all users with access to a component
 */
export function getUsersWithAccess(component: CustomComponent): {
    userId: string;
    level: PermissionLevel;
}[] {
    const users: { userId: string; level: PermissionLevel }[] = [];
    
    // Creator has admin access
    if (component.createdBy) {
        users.push({ userId: component.createdBy, level: 'admin' });
    }
    
    // Users with edit permission
    if (component.permissions) {
        component.permissions.canEdit.forEach(userId => {
            if (userId !== component.createdBy) {
                users.push({ userId, level: 'edit' });
            }
        });
        
        // Users with view permission
        component.permissions.canView.forEach(userId => {
            if (userId !== component.createdBy && !component.permissions!.canEdit.includes(userId)) {
                users.push({ userId, level: 'view' });
            }
        });
    }
    
    return users;
}

/**
 * Filter components by user permissions
 */
export function filterComponentsByPermission(
    components: CustomComponent[],
    userId: string,
    userRole: string,
    minPermission: PermissionLevel = 'view'
): CustomComponent[] {
    return components.filter(component => {
        const level = getPermissionLevel(component, userId, userRole);
        
        switch (minPermission) {
            case 'admin':
                return level === 'admin';
            case 'edit':
                return level === 'edit' || level === 'admin';
            case 'view':
                return level !== 'none';
            case 'none':
                return true;
            default:
                return false;
        }
    });
}

/**
 * Check if component can be shared
 */
export function canShareComponent(
    component: CustomComponent,
    userId: string,
    userRole: string
): boolean {
    return canManagePermissions(component, userId, userRole);
}

/**
 * Get sharing URL for component (for future marketplace)
 */
export function getComponentSharingUrl(componentId: string): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/marketplace/component/${componentId}`;
}

/**
 * Validate permissions update
 */
export function validatePermissionsUpdate(
    permissions: ComponentPermissions,
    userId: string,
    userRole: string
): { isValid: boolean; error?: string } {
    // Owner and Super admin can do anything
    if (hasAdminPrivileges(userRole)) {
        return { isValid: true };
    }
    
    // Check if trying to grant more permissions than they have
    // (Only applicable for team features - future)
    
    return { isValid: true };
}

/**
 * Create default permissions for new component
 */
export function createDefaultPermissions(creatorId: string): ComponentPermissions {
    return {
        canEdit: [],
        canView: [],
        isPublic: false
    };
}

/**
 * Clone permissions (useful for duplicating components)
 */
export function clonePermissions(
    permissions: ComponentPermissions,
    newCreatorId: string
): ComponentPermissions {
    return {
        canEdit: [],
        canView: [],
        isPublic: permissions.isPublic
    };
}

/**
 * Merge permissions (useful for component imports)
 */
export function mergePermissions(
    base: ComponentPermissions,
    override: Partial<ComponentPermissions>
): ComponentPermissions {
    return {
        canEdit: override.canEdit ?? base.canEdit,
        canView: override.canView ?? base.canView,
        isPublic: override.isPublic ?? base.isPublic
    };
}

