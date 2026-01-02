/**
 * useTenantMembers Hook
 * Manages tenant members (listing, adding, removing, updating roles/permissions)
 */

import { useState, useEffect, useCallback } from 'react';
import {
    db,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
} from '../firebase';
import { useTenant } from '../contexts/tenant';
import {
    TenantMembership,
    TenantPermissions,
    AgencyRole,
    DEFAULT_PERMISSIONS,
    getMembershipId,
    AGENCY_ROLE_LABELS,
    AGENCY_ROLE_COLORS,
    hasMinimumRole,
} from '../types/multiTenant';

// =============================================================================
// TYPES
// =============================================================================

export interface TenantMemberWithDetails extends TenantMembership {
    isCurrentUser: boolean;
    isOwner: boolean;
    canBeEdited: boolean;
    canBeRemoved: boolean;
}

export interface UseTenantMembersReturn {
    members: TenantMemberWithDetails[];
    isLoading: boolean;
    error: string | null;
    
    // Actions
    updateMemberRole: (userId: string, role: AgencyRole) => Promise<void>;
    updateMemberPermissions: (userId: string, permissions: Partial<TenantPermissions>) => Promise<void>;
    removeMember: (userId: string) => Promise<void>;
    
    // Helpers
    getMemberById: (userId: string) => TenantMemberWithDetails | undefined;
    canManageMembers: boolean;
    canInviteMembers: boolean;
    
    // Refresh
    refreshMembers: () => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useTenantMembers(): UseTenantMembersReturn {
    const { 
        currentTenant, 
        currentMembership, 
        canPerformInTenant,
        updateMemberRole: contextUpdateRole,
        updateMemberPermissions: contextUpdatePermissions,
        removeMember: contextRemoveMember,
    } = useTenant();
    
    const [members, setMembers] = useState<TenantMemberWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // =========================================================================
    // LOAD MEMBERS
    // =========================================================================
    
    useEffect(() => {
        if (!currentTenant) {
            setMembers([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const membersQuery = query(
            collection(db, 'tenantMembers'),
            where('tenantId', '==', currentTenant.id)
        );

        const unsubscribe = onSnapshot(
            membersQuery,
            (snapshot) => {
                const memberList = snapshot.docs.map(docSnap => {
                    const data = docSnap.data() as TenantMembership;
                    const isCurrentUser = data.userId === currentMembership?.userId;
                    const isOwner = data.userId === currentTenant.ownerUserId;
                    
                    // Determine if current user can manage this member
                    const currentUserIsOwner = currentMembership?.role === 'agency_owner';
                    const currentUserIsAdmin = currentMembership?.role === 'agency_admin';
                    
                    // Can edit: owner can edit anyone except self, admin can edit members/clients
                    const canBeEdited = !isCurrentUser && !isOwner && (
                        currentUserIsOwner || 
                        (currentUserIsAdmin && hasMinimumRole(currentMembership?.role || 'client', data.role))
                    );
                    
                    // Can remove: owner can remove anyone except self
                    const canBeRemoved = !isCurrentUser && !isOwner && currentUserIsOwner;
                    
                    return {
                        id: docSnap.id,
                        ...data,
                        isCurrentUser,
                        isOwner,
                        canBeEdited,
                        canBeRemoved,
                    } as TenantMemberWithDetails;
                });
                
                // Sort: owner first, then by role, then by name
                memberList.sort((a, b) => {
                    if (a.isOwner && !b.isOwner) return -1;
                    if (!a.isOwner && b.isOwner) return 1;
                    
                    const roleOrder: AgencyRole[] = ['agency_owner', 'agency_admin', 'agency_member', 'client'];
                    const aIndex = roleOrder.indexOf(a.role);
                    const bIndex = roleOrder.indexOf(b.role);
                    if (aIndex !== bIndex) return aIndex - bIndex;
                    
                    return (a.userName || '').localeCompare(b.userName || '');
                });
                
                setMembers(memberList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading tenant members:', err);
                setError('Error cargando miembros');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentTenant, currentMembership]);

    // =========================================================================
    // UPDATE MEMBER ROLE
    // =========================================================================
    
    const updateMemberRole = useCallback(async (userId: string, role: AgencyRole) => {
        try {
            await contextUpdateRole(userId, role);
        } catch (err: any) {
            setError(err.message || 'Error actualizando rol');
            throw err;
        }
    }, [contextUpdateRole]);

    // =========================================================================
    // UPDATE MEMBER PERMISSIONS
    // =========================================================================
    
    const updateMemberPermissions = useCallback(async (
        userId: string, 
        permissions: Partial<TenantPermissions>
    ) => {
        try {
            await contextUpdatePermissions(userId, permissions);
        } catch (err: any) {
            setError(err.message || 'Error actualizando permisos');
            throw err;
        }
    }, [contextUpdatePermissions]);

    // =========================================================================
    // REMOVE MEMBER
    // =========================================================================
    
    const removeMember = useCallback(async (userId: string) => {
        try {
            await contextRemoveMember(userId);
        } catch (err: any) {
            setError(err.message || 'Error removiendo miembro');
            throw err;
        }
    }, [contextRemoveMember]);

    // =========================================================================
    // HELPERS
    // =========================================================================
    
    const getMemberById = useCallback((userId: string): TenantMemberWithDetails | undefined => {
        return members.find(m => m.userId === userId);
    }, [members]);

    const canManageMembers = canPerformInTenant('canRemoveMembers');
    const canInviteMembers = canPerformInTenant('canInviteMembers');

    // =========================================================================
    // REFRESH
    // =========================================================================
    
    const refreshMembers = useCallback(async () => {
        // The onSnapshot handles real-time updates
    }, []);

    return {
        members,
        isLoading,
        error,
        updateMemberRole,
        updateMemberPermissions,
        removeMember,
        getMemberById,
        canManageMembers,
        canInviteMembers,
        refreshMembers,
    };
}

// =============================================================================
// HELPER HOOKS
// =============================================================================

/**
 * Hook to get member count for display
 */
export function useTenantMemberCount(): { count: number; maxCount: number; isAtLimit: boolean } {
    const { currentTenant } = useTenant();
    const count = currentTenant?.usage.userCount || 0;
    const maxCount = currentTenant?.limits.maxUsers || 1;
    
    return {
        count,
        maxCount,
        isAtLimit: count >= maxCount,
    };
}

/**
 * Hook to get role display helpers
 */
export function useRoleDisplay(): { 
    getRoleLabel: (role: AgencyRole) => string; 
    getRoleColor: (role: AgencyRole) => string;
} {
    return {
        getRoleLabel: (role: AgencyRole) => AGENCY_ROLE_LABELS[role] || role,
        getRoleColor: (role: AgencyRole) => AGENCY_ROLE_COLORS[role] || 'bg-gray-500/20 text-gray-400',
    };
}

/**
 * Hook to get available roles for assignment
 * (Current user can only assign roles below their own level)
 */
export function useAvailableRoles(): AgencyRole[] {
    const { currentMembership } = useTenant();
    
    const allRoles: AgencyRole[] = ['agency_admin', 'agency_member', 'client'];
    
    if (!currentMembership) return [];
    
    if (currentMembership.role === 'agency_owner') {
        return allRoles;
    }
    
    if (currentMembership.role === 'agency_admin') {
        return ['agency_member', 'client'];
    }
    
    return [];
}






