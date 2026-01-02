/**
 * useTenantInvites Hook
 * Manages tenant invitations (creating, listing, cancelling, accepting)
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
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
} from '../firebase';
import { useTenant } from '../contexts/tenant';
import { useAuth } from '../contexts/core/AuthContext';
import {
    TenantInvite,
    InviteStatus,
    AgencyRole,
    TenantPermissions,
    InviteMemberData,
    DEFAULT_PERMISSIONS,
    getMembershipId,
    TenantMembership,
} from '../types/multiTenant';

// =============================================================================
// TYPES
// =============================================================================

export interface TenantInviteWithActions extends TenantInvite {
    canCancel: boolean;
    canResend: boolean;
    isExpired: boolean;
    daysUntilExpiration: number;
}

export interface UseTenantInvitesReturn {
    invites: TenantInviteWithActions[];
    isLoading: boolean;
    error: string | null;
    
    // Actions for tenant admins
    createInvite: (data: InviteMemberData) => Promise<string>;
    cancelInvite: (inviteId: string) => Promise<void>;
    resendInvite: (inviteId: string) => Promise<void>;
    
    // Stats
    pendingCount: number;
    
    // Refresh
    refreshInvites: () => Promise<void>;
}

export interface UseMyInvitesReturn {
    invites: TenantInvite[];
    isLoading: boolean;
    error: string | null;
    acceptInvite: (inviteId: string) => Promise<void>;
    declineInvite: (inviteId: string) => Promise<void>;
    refreshInvites: () => Promise<void>;
}

// =============================================================================
// TENANT INVITES HOOK (For tenant admins)
// =============================================================================

export function useTenantInvites(): UseTenantInvitesReturn {
    const { currentTenant, currentMembership, canPerformInTenant, inviteMember } = useTenant();
    const [invites, setInvites] = useState<TenantInviteWithActions[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // =========================================================================
    // LOAD INVITES
    // =========================================================================
    
    useEffect(() => {
        if (!currentTenant || !canPerformInTenant('canInviteMembers')) {
            setInvites([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const invitesQuery = query(
            collection(db, 'tenantInvites'),
            where('tenantId', '==', currentTenant.id),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            invitesQuery,
            (snapshot) => {
                const now = Date.now() / 1000;
                
                const inviteList = snapshot.docs.map(docSnap => {
                    const data = docSnap.data() as TenantInvite;
                    const expiresAtSeconds = data.expiresAt?.seconds || 0;
                    const isExpired = expiresAtSeconds < now;
                    const daysUntilExpiration = Math.max(0, Math.ceil((expiresAtSeconds - now) / 86400));
                    
                    return {
                        id: docSnap.id,
                        ...data,
                        canCancel: data.status === 'pending' && !isExpired,
                        canResend: data.status === 'pending' || data.status === 'expired',
                        isExpired,
                        daysUntilExpiration,
                    } as TenantInviteWithActions;
                });
                
                setInvites(inviteList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading tenant invites:', err);
                setError('Error cargando invitaciones');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentTenant, canPerformInTenant]);

    // =========================================================================
    // CREATE INVITE
    // =========================================================================
    
    const createInvite = useCallback(async (data: InviteMemberData): Promise<string> => {
        if (!currentTenant || !canPerformInTenant('canInviteMembers')) {
            throw new Error('No tienes permiso para invitar miembros');
        }
        
        setError(null);
        
        // Check if user is already a member
        const membershipId = getMembershipId(currentTenant.id, data.email);
        
        // Check for existing pending invite to same email
        const existingInvites = await getDocs(
            query(
                collection(db, 'tenantInvites'),
                where('tenantId', '==', currentTenant.id),
                where('email', '==', data.email.toLowerCase()),
                where('status', '==', 'pending')
            )
        );
        
        if (!existingInvites.empty) {
            throw new Error('Ya existe una invitación pendiente para este email');
        }
        
        try {
            const inviteId = await inviteMember(data);
            return inviteId;
        } catch (err: any) {
            setError(err.message || 'Error creando invitación');
            throw err;
        }
    }, [currentTenant, canPerformInTenant, inviteMember]);

    // =========================================================================
    // CANCEL INVITE
    // =========================================================================
    
    const cancelInvite = useCallback(async (inviteId: string) => {
        if (!canPerformInTenant('canInviteMembers')) {
            throw new Error('No tienes permiso para cancelar invitaciones');
        }
        
        setError(null);
        
        try {
            await updateDoc(doc(db, 'tenantInvites', inviteId), {
                status: 'cancelled' as InviteStatus,
            });
        } catch (err: any) {
            setError(err.message || 'Error cancelando invitación');
            throw err;
        }
    }, [canPerformInTenant]);

    // =========================================================================
    // RESEND INVITE
    // =========================================================================
    
    const resendInvite = useCallback(async (inviteId: string) => {
        if (!canPerformInTenant('canInviteMembers')) {
            throw new Error('No tienes permiso para reenviar invitaciones');
        }
        
        setError(null);
        
        try {
            // Generate new token and extend expiration
            const newToken = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;
            const newExpiration = { 
                seconds: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, 
                nanoseconds: 0 
            };
            
            await updateDoc(doc(db, 'tenantInvites', inviteId), {
                token: newToken,
                expiresAt: newExpiration,
                status: 'pending' as InviteStatus,
            });
            
            // Note: Email sending would be handled by Cloud Function
        } catch (err: any) {
            setError(err.message || 'Error reenviando invitación');
            throw err;
        }
    }, [canPerformInTenant]);

    // =========================================================================
    // STATS
    // =========================================================================
    
    const pendingCount = invites.filter(i => i.status === 'pending' && !i.isExpired).length;

    // =========================================================================
    // REFRESH
    // =========================================================================
    
    const refreshInvites = useCallback(async () => {
        // The onSnapshot handles real-time updates
    }, []);

    return {
        invites,
        isLoading,
        error,
        createInvite,
        cancelInvite,
        resendInvite,
        pendingCount,
        refreshInvites,
    };
}

// =============================================================================
// MY INVITES HOOK (For invited users)
// =============================================================================

export function useMyInvites(): UseMyInvitesReturn {
    const { user } = useAuth();
    const { refreshTenants } = useTenant();
    const [invites, setInvites] = useState<TenantInvite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // =========================================================================
    // LOAD MY INVITES
    // =========================================================================
    
    useEffect(() => {
        if (!user?.email) {
            setInvites([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const invitesQuery = query(
            collection(db, 'tenantInvites'),
            where('email', '==', user.email.toLowerCase()),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(
            invitesQuery,
            (snapshot) => {
                const now = Date.now() / 1000;
                
                const inviteList = snapshot.docs
                    .map(docSnap => ({
                        id: docSnap.id,
                        ...docSnap.data(),
                    } as TenantInvite))
                    .filter(invite => {
                        // Filter out expired invites
                        const expiresAt = invite.expiresAt?.seconds || 0;
                        return expiresAt > now;
                    });
                
                setInvites(inviteList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading my invites:', err);
                setError('Error cargando invitaciones');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.email]);

    // =========================================================================
    // ACCEPT INVITE
    // =========================================================================
    
    const acceptInvite = useCallback(async (inviteId: string) => {
        if (!user) throw new Error('Usuario no autenticado');
        
        setError(null);
        
        try {
            // Get the invite
            const inviteDoc = await getDoc(doc(db, 'tenantInvites', inviteId));
            if (!inviteDoc.exists()) {
                throw new Error('Invitación no encontrada');
            }
            
            const invite = inviteDoc.data() as TenantInvite;
            
            // Check expiration
            const now = Date.now() / 1000;
            if (invite.expiresAt.seconds < now) {
                throw new Error('La invitación ha expirado');
            }
            
            // Check if already a member
            const membershipId = getMembershipId(invite.tenantId, user.uid);
            const existingMembership = await getDoc(doc(db, 'tenantMembers', membershipId));
            
            if (existingMembership.exists()) {
                throw new Error('Ya eres miembro de este workspace');
            }
            
            // Get tenant to update usage count
            const tenantDoc = await getDoc(doc(db, 'tenants', invite.tenantId));
            if (!tenantDoc.exists()) {
                throw new Error('Workspace no encontrado');
            }
            const tenant = tenantDoc.data();
            
            // Create membership
            const permissions = invite.customPermissions 
                ? { ...DEFAULT_PERMISSIONS[invite.role], ...invite.customPermissions }
                : DEFAULT_PERMISSIONS[invite.role];
            
            const membershipData: Omit<TenantMembership, 'id' | 'tenant'> = {
                tenantId: invite.tenantId,
                userId: user.uid,
                role: invite.role,
                permissions,
                invitedBy: invite.invitedBy,
                joinedAt: serverTimestamp() as any,
                userName: user.displayName || '',
                userEmail: user.email || '',
                userPhotoURL: user.photoURL || '',
            };
            
            await setDoc(doc(db, 'tenantMembers', membershipId), membershipData);
            
            // Update invite status
            await updateDoc(doc(db, 'tenantInvites', inviteId), {
                status: 'accepted' as InviteStatus,
                acceptedAt: serverTimestamp(),
                acceptedByUserId: user.uid,
            });
            
            // Update tenant user count
            await updateDoc(doc(db, 'tenants', invite.tenantId), {
                'usage.userCount': (tenant.usage?.userCount || 1) + 1,
                updatedAt: serverTimestamp(),
            });
            
            // Refresh user's tenant list
            await refreshTenants();
            
        } catch (err: any) {
            setError(err.message || 'Error aceptando invitación');
            throw err;
        }
    }, [user, refreshTenants]);

    // =========================================================================
    // DECLINE INVITE
    // =========================================================================
    
    const declineInvite = useCallback(async (inviteId: string) => {
        setError(null);
        
        try {
            await updateDoc(doc(db, 'tenantInvites', inviteId), {
                status: 'cancelled' as InviteStatus,
            });
        } catch (err: any) {
            setError(err.message || 'Error rechazando invitación');
            throw err;
        }
    }, []);

    // =========================================================================
    // REFRESH
    // =========================================================================
    
    const refreshInvites = useCallback(async () => {
        // The onSnapshot handles real-time updates
    }, []);

    return {
        invites,
        isLoading,
        error,
        acceptInvite,
        declineInvite,
        refreshInvites,
    };
}

// =============================================================================
// INVITE BY TOKEN HOOK
// =============================================================================

export interface UseInviteByTokenReturn {
    invite: TenantInvite | null;
    isLoading: boolean;
    error: string | null;
    isValid: boolean;
    isExpired: boolean;
    acceptInvite: () => Promise<void>;
}

export function useInviteByToken(token: string | null): UseInviteByTokenReturn {
    const { user } = useAuth();
    const { refreshTenants } = useTenant();
    const [invite, setInvite] = useState<TenantInvite | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // =========================================================================
    // LOAD INVITE BY TOKEN
    // =========================================================================
    
    useEffect(() => {
        if (!token) {
            setInvite(null);
            setIsLoading(false);
            return;
        }

        const loadInvite = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const invitesQuery = query(
                    collection(db, 'tenantInvites'),
                    where('token', '==', token)
                );
                
                const snapshot = await getDocs(invitesQuery);
                
                if (snapshot.empty) {
                    setError('Invitación no encontrada');
                    setInvite(null);
                } else {
                    const inviteData = {
                        id: snapshot.docs[0].id,
                        ...snapshot.docs[0].data(),
                    } as TenantInvite;
                    setInvite(inviteData);
                }
            } catch (err: any) {
                console.error('Error loading invite by token:', err);
                setError('Error cargando invitación');
            } finally {
                setIsLoading(false);
            }
        };

        loadInvite();
    }, [token]);

    // =========================================================================
    // COMPUTED VALUES
    // =========================================================================
    
    const now = Date.now() / 1000;
    const isExpired = invite ? (invite.expiresAt?.seconds || 0) < now : false;
    const isValid = invite !== null && invite.status === 'pending' && !isExpired;

    // =========================================================================
    // ACCEPT INVITE
    // =========================================================================
    
    const acceptInvite = useCallback(async () => {
        if (!user) throw new Error('Usuario no autenticado');
        if (!invite) throw new Error('Invitación no encontrada');
        if (!isValid) throw new Error('Invitación inválida o expirada');
        
        setError(null);
        
        try {
            // Check if email matches (optional - for better UX)
            if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
                throw new Error('Esta invitación fue enviada a otro email');
            }
            
            // Check if already a member
            const membershipId = getMembershipId(invite.tenantId, user.uid);
            const existingMembership = await getDoc(doc(db, 'tenantMembers', membershipId));
            
            if (existingMembership.exists()) {
                throw new Error('Ya eres miembro de este workspace');
            }
            
            // Get tenant
            const tenantDoc = await getDoc(doc(db, 'tenants', invite.tenantId));
            if (!tenantDoc.exists()) {
                throw new Error('Workspace no encontrado');
            }
            const tenant = tenantDoc.data();
            
            // Create membership
            const permissions = invite.customPermissions 
                ? { ...DEFAULT_PERMISSIONS[invite.role], ...invite.customPermissions }
                : DEFAULT_PERMISSIONS[invite.role];
            
            const membershipData: Omit<TenantMembership, 'id' | 'tenant'> = {
                tenantId: invite.tenantId,
                userId: user.uid,
                role: invite.role,
                permissions,
                invitedBy: invite.invitedBy,
                joinedAt: serverTimestamp() as any,
                userName: user.displayName || '',
                userEmail: user.email || '',
                userPhotoURL: user.photoURL || '',
            };
            
            await setDoc(doc(db, 'tenantMembers', membershipId), membershipData);
            
            // Update invite status
            await updateDoc(doc(db, 'tenantInvites', invite.id), {
                status: 'accepted' as InviteStatus,
                acceptedAt: serverTimestamp(),
                acceptedByUserId: user.uid,
            });
            
            // Update tenant user count
            await updateDoc(doc(db, 'tenants', invite.tenantId), {
                'usage.userCount': (tenant.usage?.userCount || 1) + 1,
                updatedAt: serverTimestamp(),
            });
            
            // Refresh tenants
            await refreshTenants();
            
        } catch (err: any) {
            setError(err.message || 'Error aceptando invitación');
            throw err;
        }
    }, [user, invite, isValid, refreshTenants]);

    return {
        invite,
        isLoading,
        error,
        isValid,
        isExpired,
        acceptInvite,
    };
}






