/**
 * TenantContext
 * Manages multi-tenant state, workspace switching, and tenant-level permissions
 */

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import {
    Tenant,
    TenantMembership,
    TenantPermissions,
    AgencyRole,
    CreateTenantData,
    InviteMemberData,
    TenantInvite,
    getMembershipId,
    getDefaultLimitsForPlan,
    getDefaultTenantSettings,
    getDefaultTenantBranding,
    generateSlug,
    DEFAULT_PERMISSIONS,
    hasPermission,
} from '../../types/multiTenant';
import {
    db,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    writeBatch,
    Timestamp,
} from '../../firebase';
import { useAuth } from '../core/AuthContext';

// =============================================================================
// CONTEXT TYPES
// =============================================================================

interface TenantContextType {
    // State
    currentTenant: Tenant | null;
    userTenants: TenantMembership[];
    currentMembership: TenantMembership | null;
    isLoadingTenant: boolean;
    error: string | null;

    // Tenant Actions
    switchTenant: (tenantId: string) => Promise<void>;
    createTenant: (data: CreateTenantData, skipSwitch?: boolean) => Promise<string>;
    updateTenant: (tenantId: string, data: Partial<Tenant>) => Promise<void>;
    deleteTenant: (tenantId: string) => Promise<void>;

    // Membership Actions
    inviteMember: (data: InviteMemberData) => Promise<string>;
    removeMember: (userId: string) => Promise<void>;
    updateMemberRole: (userId: string, role: AgencyRole) => Promise<void>;
    updateMemberPermissions: (userId: string, permissions: Partial<TenantPermissions>) => Promise<void>;

    // Permission Helpers
    canPerformInTenant: (permission: keyof TenantPermissions) => boolean;
    currentRole: AgencyRole | null;

    // Sub-client Actions (for agencies)
    createSubClient: (data: CreateTenantData, initialUsers?: { email: string, name: string, role: AgencyRole }[]) => Promise<string>;
    getSubClients: () => Promise<Tenant[]>;

    // Refresh
    refreshTenants: () => Promise<void>;
    refreshCurrentTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// =============================================================================
// LOCAL STORAGE KEY
// =============================================================================

const ACTIVE_TENANT_KEY = 'quimera_active_tenant_id';

// =============================================================================
// PROVIDER
// =============================================================================

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, userDocument, isUserOwner } = useAuth();

    // State
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [userTenants, setUserTenants] = useState<TenantMembership[]>([]);
    const [currentMembership, setCurrentMembership] = useState<TenantMembership | null>(null);
    const [isLoadingTenant, setIsLoadingTenant] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ==========================================================================
    // LOAD USER TENANTS
    // ==========================================================================

    const loadUserTenants = useCallback(async (userId: string) => {
        try {
            // Query tenantMembers where userId matches
            const membershipsQuery = query(
                collection(db, 'tenantMembers'),
                where('userId', '==', userId)
            );

            const snapshot = await getDocs(membershipsQuery);
            const memberships: TenantMembership[] = [];

            // Load tenant details for each membership
            for (const docSnap of snapshot.docs) {
                const membershipData = docSnap.data() as Omit<TenantMembership, 'id' | 'tenant'>;

                // Fetch the tenant
                const tenantDoc = await getDoc(doc(db, 'tenants', membershipData.tenantId));
                if (tenantDoc.exists()) {
                    const tenant = { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;
                    memberships.push({
                        ...membershipData,
                        id: docSnap.id,
                        tenant,
                    });
                }
            }

            setUserTenants(memberships);
            return memberships;
        } catch (err) {
            console.error('Error loading user tenants:', err);
            setError('Error cargando workspaces');
            return [];
        }
    }, []);

    // ==========================================================================
    // LOAD TENANT
    // ==========================================================================

    const loadTenant = useCallback(async (tenantId: string) => {
        try {
            const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));

            if (!tenantDoc.exists()) {
                throw new Error('Tenant not found');
            }

            const tenant = { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;
            setCurrentTenant(tenant);

            // Find membership for current user
            if (user) {
                const membershipId = getMembershipId(tenantId, user.uid);
                const membershipDoc = await getDoc(doc(db, 'tenantMembers', membershipId));

                if (membershipDoc.exists()) {
                    setCurrentMembership({
                        id: membershipDoc.id,
                        ...membershipDoc.data(),
                        tenant,
                    } as TenantMembership);
                }
            }

            // Save to local storage
            localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);

            return tenant;
        } catch (err) {
            console.error('Error loading tenant:', err);
            setError('Error cargando workspace');
            return null;
        }
    }, [user]);

    // ==========================================================================
    // CREATE PERSONAL TENANT (Auto-creation for new users)
    // ==========================================================================

    const createPersonalTenant = useCallback(async (authUser: { uid: string; email: string | null; displayName?: string | null }): Promise<string> => {
        const userName = authUser.displayName || authUser.email?.split('@')[0] || 'Usuario';
        const tenantName = `${userName}'s Workspace`;
        const slug = generateSlug(tenantName) + '-' + authUser.uid.slice(0, 6);

        const tenantId = `tenant_${authUser.uid}`;
        const membershipId = getMembershipId(tenantId, authUser.uid);
        const now = serverTimestamp();

        const batch = writeBatch(db);

        // Create tenant document
        const tenantRef = doc(db, 'tenants', tenantId);
        batch.set(tenantRef, {
            id: tenantId,
            name: tenantName,
            slug,
            ownerId: authUser.uid,
            ownerUserId: authUser.uid, // Required by Firestore rules
            type: 'personal',
            subscriptionPlan: 'free',
            settings: {
                allowPublicSignup: false,
                requireEmailVerification: true,
                defaultRole: 'viewer',
            },
            limits: getDefaultLimitsForPlan('free'),
            usage: {
                projectCount: 0,
                userCount: 1,
                storageUsedGB: 0,
                aiCreditsUsed: 0,
                subClientCount: 0,
            },
            createdAt: now,
            updatedAt: now,
        });

        // Create owner membership
        const membershipRef = doc(db, 'tenantMembers', membershipId);
        batch.set(membershipRef, {
            id: membershipId,
            tenantId,
            userId: authUser.uid,
            email: authUser.email,
            displayName: userName,
            role: 'agency_owner', // Required by Firestore rules for initial creation
            permissions: DEFAULT_PERMISSIONS.agency_owner,
            status: 'active',
            joinedAt: now,
            invitedBy: authUser.uid,
        });

        await batch.commit();
        console.log('Personal workspace created:', tenantId);

        return tenantId;
    }, []);

    // ==========================================================================
    // INITIAL LOAD
    // ==========================================================================

    useEffect(() => {
        if (!user) {
            setCurrentTenant(null);
            setUserTenants([]);
            setCurrentMembership(null);
            setIsLoadingTenant(false);
            return;
        }

        const initializeTenants = async () => {
            setIsLoadingTenant(true);
            setError(null);

            try {
                // Load user's tenants
                const memberships = await loadUserTenants(user.uid);

                if (memberships.length === 0) {
                    // Auto-create a personal workspace for the user
                    try {
                        const personalTenantId = await createPersonalTenant(user);
                        // Reload memberships after creating tenant
                        const newMemberships = await loadUserTenants(user.uid);
                        if (newMemberships.length > 0) {
                            await loadTenant(personalTenantId);
                        }
                    } catch (createErr) {
                        console.error('Error creating personal tenant:', createErr);
                    }
                    setIsLoadingTenant(false);
                    return;
                }

                // Check for previously active tenant
                const savedTenantId = localStorage.getItem(ACTIVE_TENANT_KEY);
                let tenantToLoad: string | null = null;

                if (savedTenantId) {
                    // Verify user still has access
                    const hasAccess = memberships.some(m => m.tenantId === savedTenantId);
                    if (hasAccess) {
                        tenantToLoad = savedTenantId;
                    }
                }

                // If no saved tenant or no access, use first available
                if (!tenantToLoad && memberships.length > 0) {
                    tenantToLoad = memberships[0].tenantId;
                }

                if (tenantToLoad) {
                    await loadTenant(tenantToLoad);
                }
            } catch (err) {
                console.error('Error initializing tenants:', err);
                setError('Error inicializando workspaces');
            } finally {
                setIsLoadingTenant(false);
            }
        };

        initializeTenants();
    }, [user, loadUserTenants, loadTenant]);

    // ==========================================================================
    // SWITCH TENANT
    // ==========================================================================

    const switchTenant = useCallback(async (tenantId: string) => {
        // Verify user has access
        const membership = userTenants.find(m => m.tenantId === tenantId);
        if (!membership) {
            throw new Error('No tienes acceso a este workspace');
        }

        setIsLoadingTenant(true);
        await loadTenant(tenantId);
        setIsLoadingTenant(false);
    }, [userTenants, loadTenant]);

    // ==========================================================================
    // CREATE TENANT
    // ==========================================================================

    const createTenant = useCallback(async (data: CreateTenantData, skipSwitch = false): Promise<string> => {
        if (!user) throw new Error('User not authenticated');

        const slug = generateSlug(data.name);
        const plan = data.plan || 'free';

        // Check for slug uniqueness
        const existingSlug = await getDocs(
            query(collection(db, 'tenants'), where('slug', '==', slug))
        );

        let finalSlug = slug;
        if (!existingSlug.empty) {
            finalSlug = `${slug}-${Date.now().toString(36)}`;
        }

        const tenantData: Omit<Tenant, 'id'> = {
            name: data.name,
            slug: finalSlug,
            type: data.type,
            ownerUserId: user.uid,
            ownerTenantId: data.parentTenantId,
            subscriptionPlan: plan,
            status: 'active',
            limits: getDefaultLimitsForPlan(plan),
            usage: {
                projectCount: 0,
                userCount: 1,
                storageUsedGB: 0,
                aiCreditsUsed: 0,
            },
            branding: {
                ...getDefaultTenantBranding(),
                ...data.branding,
                companyName: data.name,
            },
            settings: getDefaultTenantSettings(),
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
        };

        // Create tenant document
        const tenantRef = await addDoc(collection(db, 'tenants'), tenantData);
        const tenantId = tenantRef.id;

        // Create membership for owner
        const membershipId = getMembershipId(tenantId, user.uid);
        const membershipData: Omit<TenantMembership, 'id' | 'tenant'> = {
            tenantId,
            userId: user.uid,
            role: 'agency_owner',
            permissions: DEFAULT_PERMISSIONS.agency_owner,
            invitedBy: user.uid,
            joinedAt: serverTimestamp() as any,
            userName: userDocument?.name || user.displayName || '',
            userEmail: user.email || '',
            userPhotoURL: userDocument?.photoURL || user.photoURL || '',
        };

        await setDoc(doc(db, 'tenantMembers', membershipId), membershipData);

        // Refresh user tenants
        await loadUserTenants(user.uid);

        // Switch to new tenant if not skipped
        if (!skipSwitch) {
            await loadTenant(tenantId);
        }

        return tenantId;
    }, [user, userDocument, loadUserTenants, loadTenant]);

    // ==========================================================================
    // UPDATE TENANT
    // ==========================================================================

    const updateTenant = useCallback(async (tenantId: string, data: Partial<Tenant>) => {
        if (!currentMembership || !hasPermission(currentMembership, 'canManageSettings')) {
            throw new Error('No tienes permiso para editar este workspace');
        }

        await updateDoc(doc(db, 'tenants', tenantId), {
            ...data,
            updatedAt: serverTimestamp(),
        });

        // Refresh current tenant if it's the one being updated
        if (currentTenant?.id === tenantId) {
            await loadTenant(tenantId);
        }
    }, [currentMembership, currentTenant, loadTenant]);

    // ==========================================================================
    // DELETE TENANT
    // ==========================================================================

    const deleteTenant = useCallback(async (tenantId: string) => {
        if (!currentMembership || currentMembership.role !== 'agency_owner') {
            throw new Error('Solo el propietario puede eliminar el workspace');
        }

        // Delete all memberships
        const membershipsQuery = query(
            collection(db, 'tenantMembers'),
            where('tenantId', '==', tenantId)
        );
        const memberships = await getDocs(membershipsQuery);

        for (const membership of memberships.docs) {
            await deleteDoc(membership.ref);
        }

        // Delete tenant
        await deleteDoc(doc(db, 'tenants', tenantId));

        // Clear local storage if this was the active tenant
        if (localStorage.getItem(ACTIVE_TENANT_KEY) === tenantId) {
            localStorage.removeItem(ACTIVE_TENANT_KEY);
        }

        // Refresh user tenants and switch to another if available
        if (user) {
            const memberships = await loadUserTenants(user.uid);
            if (memberships.length > 0) {
                await loadTenant(memberships[0].tenantId);
            } else {
                setCurrentTenant(null);
                setCurrentMembership(null);
            }
        }
    }, [user, currentMembership, loadUserTenants, loadTenant]);

    // ==========================================================================
    // INVITE MEMBER
    // ==========================================================================

    const inviteMember = useCallback(async (data: InviteMemberData): Promise<string> => {
        if (!currentTenant || !currentMembership || !hasPermission(currentMembership, 'canInviteMembers')) {
            throw new Error('No tienes permiso para invitar miembros');
        }

        if (!user) throw new Error('User not authenticated');

        // Generate unique token
        const token = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

        // Create invite
        const inviteData: Omit<TenantInvite, 'id'> = {
            tenantId: currentTenant.id,
            email: data.email.toLowerCase(),
            role: data.role,
            customPermissions: data.customPermissions,
            invitedBy: user.uid,
            invitedByName: userDocument?.name || user.displayName || '',
            token,
            message: data.message,
            expiresAt: { seconds: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, nanoseconds: 0 }, // 7 days
            status: 'pending',
            createdAt: serverTimestamp() as any,
            tenantName: currentTenant.name,
            tenantLogo: currentTenant.branding?.logoUrl,
        };

        const inviteRef = await addDoc(collection(db, 'tenantInvites'), inviteData);

        return inviteRef.id;
    }, [currentTenant, currentMembership, user, userDocument]);

    // ==========================================================================
    // REMOVE MEMBER
    // ==========================================================================

    const removeMember = useCallback(async (userId: string) => {
        if (!currentTenant || !currentMembership) {
            throw new Error('No hay workspace activo');
        }

        // Can't remove yourself
        if (user?.uid === userId) {
            throw new Error('No puedes removerte a ti mismo');
        }

        // Check permissions
        if (!hasPermission(currentMembership, 'canRemoveMembers')) {
            throw new Error('No tienes permiso para remover miembros');
        }

        // Can't remove the owner
        if (currentTenant.ownerUserId === userId) {
            throw new Error('No puedes remover al propietario');
        }

        const membershipId = getMembershipId(currentTenant.id, userId);
        await deleteDoc(doc(db, 'tenantMembers', membershipId));

        // Update tenant usage
        await updateDoc(doc(db, 'tenants', currentTenant.id), {
            'usage.userCount': (currentTenant.usage.userCount || 1) - 1,
            updatedAt: serverTimestamp(),
        });
    }, [currentTenant, currentMembership, user]);

    // ==========================================================================
    // UPDATE MEMBER ROLE
    // ==========================================================================

    const updateMemberRole = useCallback(async (userId: string, role: AgencyRole) => {
        if (!currentTenant || !currentMembership) {
            throw new Error('No hay workspace activo');
        }

        // Only owner can change roles
        if (currentMembership.role !== 'agency_owner') {
            throw new Error('Solo el propietario puede cambiar roles');
        }

        // Can't change owner's role
        if (currentTenant.ownerUserId === userId) {
            throw new Error('No puedes cambiar el rol del propietario');
        }

        const membershipId = getMembershipId(currentTenant.id, userId);
        await updateDoc(doc(db, 'tenantMembers', membershipId), {
            role,
            permissions: DEFAULT_PERMISSIONS[role],
        });
    }, [currentTenant, currentMembership]);

    // ==========================================================================
    // UPDATE MEMBER PERMISSIONS
    // ==========================================================================

    const updateMemberPermissions = useCallback(async (userId: string, permissions: Partial<TenantPermissions>) => {
        if (!currentTenant || !currentMembership) {
            throw new Error('No hay workspace activo');
        }

        // Only owner and admin can change permissions
        if (currentMembership.role !== 'agency_owner' && currentMembership.role !== 'agency_admin') {
            throw new Error('No tienes permiso para cambiar permisos');
        }

        const membershipId = getMembershipId(currentTenant.id, userId);
        const membershipDoc = await getDoc(doc(db, 'tenantMembers', membershipId));

        if (!membershipDoc.exists()) {
            throw new Error('Miembro no encontrado');
        }

        const currentPermissions = membershipDoc.data().permissions;

        await updateDoc(doc(db, 'tenantMembers', membershipId), {
            permissions: { ...currentPermissions, ...permissions },
        });
    }, [currentTenant, currentMembership]);

    // ==========================================================================
    // CREATE SUB-CLIENT (FOR AGENCIES)
    // ==========================================================================

    const createSubClient = useCallback(async (
        data: CreateTenantData,
        initialUsers?: { email: string, name: string, role: AgencyRole }[]
    ): Promise<string> => {
        if (!currentTenant || !currentMembership) {
            throw new Error('No hay workspace activo');
        }

        // Check if current tenant is an agency plan
        if (!currentTenant.subscriptionPlan.includes('agency') && currentTenant.subscriptionPlan !== 'enterprise') {
            throw new Error('Necesitas un plan Agency para crear sub-clientes');
        }

        // Check limits
        const subClientCount = currentTenant.usage.subClientCount || 0;
        const maxSubClients = currentTenant.limits.maxSubClients || 0;

        if (subClientCount >= maxSubClients) {
            throw new Error(`Has alcanzado el límite de ${maxSubClients} sub-clientes`);
        }

        // Create the sub-client tenant, skip switching
        const subClientId = await createTenant({
            ...data,
            type: 'agency_client',
            parentTenantId: currentTenant.id,
            plan: 'free', // Sub-clients use parent's resources
        }, true);

        // Handle initial users by creating invitations
        if (initialUsers && initialUsers.length > 0) {
            for (const newUser of initialUsers) {
                const token = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;
                const inviteData: any = {
                    tenantId: subClientId,
                    email: newUser.email.toLowerCase(),
                    role: newUser.role,
                    invitedBy: user?.uid || '',
                    invitedByName: userDocument?.name || user?.displayName || '',
                    token,
                    message: `Bienvenido a ${data.name}`,
                    expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    status: 'pending',
                    createdAt: serverTimestamp(),
                    tenantName: data.name,
                };
                await addDoc(collection(db, 'tenantInvites'), inviteData);
            }
        }

        // Log agency activity (non-blocking - may fail if Firestore rules restrict)
        try {
            await addDoc(collection(db, 'agencyActivity'), {
                agencyTenantId: currentTenant.id,
                type: 'client_created',
                clientTenantId: subClientId,
                clientName: data.name,
                description: `Se creó el nuevo cliente: ${data.name}`,
                timestamp: serverTimestamp(),
                createdBy: user?.uid,
                createdByName: userDocument?.name || user?.displayName || '',
            });
        } catch (activityErr) {
            console.warn('Could not log agency activity (non-critical):', activityErr);
        }

        // Update parent tenant's sub-client count
        await updateDoc(doc(db, 'tenants', currentTenant.id), {
            'usage.subClientCount': subClientCount + 1,
            updatedAt: serverTimestamp(),
        });

        return subClientId;
    }, [currentTenant, currentMembership, createTenant, user, userDocument]);

    // ==========================================================================
    // GET SUB-CLIENTS
    // ==========================================================================

    const getSubClients = useCallback(async (): Promise<Tenant[]> => {
        if (!currentTenant) return [];

        const subClientsQuery = query(
            collection(db, 'tenants'),
            where('ownerTenantId', '==', currentTenant.id)
        );

        const snapshot = await getDocs(subClientsQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
    }, [currentTenant]);

    // ==========================================================================
    // REFRESH FUNCTIONS
    // ==========================================================================

    const refreshTenants = useCallback(async () => {
        if (user) {
            await loadUserTenants(user.uid);
        }
    }, [user, loadUserTenants]);

    const refreshCurrentTenant = useCallback(async () => {
        if (currentTenant) {
            await loadTenant(currentTenant.id);
        }
    }, [currentTenant, loadTenant]);

    // ==========================================================================
    // PERMISSION HELPERS
    // ==========================================================================

    const canPerformInTenant = useCallback((permission: keyof TenantPermissions): boolean => {
        if (isUserOwner) return true;
        return hasPermission(currentMembership, permission);
    }, [currentMembership, isUserOwner]);

    const currentRole = currentMembership?.role || null;

    // ==========================================================================
    // CONTEXT VALUE
    // ==========================================================================

    const value: TenantContextType = {
        // State
        currentTenant,
        userTenants,
        currentMembership,
        isLoadingTenant,
        error,

        // Tenant Actions
        switchTenant,
        createTenant,
        updateTenant,
        deleteTenant,

        // Membership Actions
        inviteMember,
        removeMember,
        updateMemberRole,
        updateMemberPermissions,

        // Permission Helpers
        canPerformInTenant,
        currentRole,

        // Sub-client Actions
        createSubClient,
        getSubClients,

        // Refresh
        refreshTenants,
        refreshCurrentTenant,
    };

    return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

// =============================================================================
// HOOKS
// =============================================================================

export const useTenant = (): TenantContextType => {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
};

export const useSafeTenant = (): TenantContextType | null => {
    return useContext(TenantContext) || null;
};






