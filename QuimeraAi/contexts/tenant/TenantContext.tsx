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
import { supabase } from '../../supabase';
import { useAuth } from '../core/AuthContext';
import { resolveProjectName } from '../../utils/resolveProjectName';

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
        setIsLoadingTenant(true);
        setError(null);

        try {
            const { data: snapshot, error: fetchErr } = await supabase
                .from('tenant_members')
                .select('*, tenant:tenants(*)')
                .eq('user_id', userId);

            if (fetchErr) throw fetchErr;

            const memberships: TenantMembership[] = [];

            for (const row of snapshot || []) {
                const tData = row.tenant;
                if (tData) {
                    const rawTenant = {
                        id: tData.id,
                        name: tData.name,
                        slug: tData.slug,
                        type: tData.type,
                        ownerUserId: tData.owner_user_id,
                        subscriptionPlan: tData.subscription_plan,
                        status: tData.status,
                        limits: typeof tData.limits === 'string' ? JSON.parse(tData.limits) : tData.limits,
                        usage: typeof tData.usage === 'string' ? JSON.parse(tData.usage) : tData.usage,
                        branding: typeof tData.branding === 'string' ? JSON.parse(tData.branding) : tData.branding,
                        settings: typeof tData.settings === 'string' ? JSON.parse(tData.settings) : tData.settings,
                        createdAt: tData.created_at,
                        updatedAt: tData.updated_at
                    };
                    const tenant = {
                        ...rawTenant,
                        name: resolveProjectName(rawTenant.name),
                        branding: rawTenant.branding ? {
                            ...rawTenant.branding,
                            companyName: rawTenant.branding.companyName ? resolveProjectName(rawTenant.branding.companyName) : resolveProjectName(rawTenant.name)
                        } : undefined
                    } as Tenant;
                    memberships.push({
                        id: row.id,
                        tenantId: row.tenant_id,
                        userId: row.user_id,
                        role: row.role,
                        permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
                        invitedBy: row.invited_by,
                        joinedAt: row.joined_at,
                        tenant,
                    } as any);
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
        setIsLoadingTenant(true);
        try {
            const { data: tenantDoc, error: tenantErr } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', tenantId)
                .single();

            if (tenantErr || !tenantDoc) {
                throw new Error('Workspace no encontrado');
            }

            const rawTenant = {
                id: tenantDoc.id,
                name: tenantDoc.name,
                slug: tenantDoc.slug,
                type: tenantDoc.type,
                ownerUserId: tenantDoc.owner_user_id,
                subscriptionPlan: tenantDoc.subscription_plan,
                status: tenantDoc.status,
                limits: typeof tenantDoc.limits === 'string' ? JSON.parse(tenantDoc.limits) : tenantDoc.limits,
                usage: typeof tenantDoc.usage === 'string' ? JSON.parse(tenantDoc.usage) : tenantDoc.usage,
                branding: typeof tenantDoc.branding === 'string' ? JSON.parse(tenantDoc.branding) : tenantDoc.branding,
                settings: typeof tenantDoc.settings === 'string' ? JSON.parse(tenantDoc.settings) : tenantDoc.settings,
                createdAt: tenantDoc.created_at,
                updatedAt: tenantDoc.updated_at
            } as any;

            const tenant = {
                ...rawTenant,
                name: resolveProjectName(rawTenant.name),
                branding: rawTenant.branding ? {
                    ...rawTenant.branding,
                    companyName: rawTenant.branding.companyName ? resolveProjectName(rawTenant.branding.companyName) : resolveProjectName(rawTenant.name)
                } : undefined
            } as Tenant;

            setCurrentTenant(tenant);

            if (user) {
                const { data: membershipDoc } = await supabase
                    .from('tenant_members')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (membershipDoc) {
                    setCurrentMembership({
                        id: membershipDoc.id,
                        tenantId: membershipDoc.tenant_id,
                        userId: membershipDoc.user_id,
                        role: membershipDoc.role,
                        permissions: typeof membershipDoc.permissions === 'string' ? JSON.parse(membershipDoc.permissions) : membershipDoc.permissions,
                        invitedBy: membershipDoc.invited_by,
                        joinedAt: membershipDoc.joined_at,
                        tenant,
                    } as any);
                } else {
                    setCurrentMembership(null);
                }
            } else {
                setCurrentMembership(null);
            }

        } catch (err: any) {
            console.error('Error loading tenant:', err);
            setError(err.message || 'Error cargando el workspace');
            setCurrentTenant(null);
            setCurrentMembership(null);
        } finally {
            setIsLoadingTenant(false);
        }
    }, [user, userDocument]);

    const createPersonalTenant = useCallback(async (authUser: { id: string; email: string | null; displayName?: string | null }): Promise<string> => {
        const userName = authUser.displayName || authUser.email?.split('@')[0] || 'Usuario';
        const tenantName = `${userName}'s Workspace`;
        const slug = generateSlug(tenantName) + '-' + authUser.id.slice(0, 6);

        // Call the SECURITY DEFINER function which bypasses RLS entirely.
        // It handles idempotency: if tenant/membership already exist, it returns the existing tenant ID.
        const { data: tenantId, error } = await supabase.rpc('create_personal_tenant', {
            p_user_id: authUser.id,
            p_tenant_name: tenantName,
            p_slug: slug,
            p_settings: {
                allowPublicSignup: false,
                requireEmailVerification: true,
                defaultRole: 'viewer',
            },
            p_limits: getDefaultLimitsForPlan('free'),
            p_usage: {
                projectCount: 0,
                userCount: 1,
                storageUsedGB: 0,
                aiCreditsUsed: 0,
                subClientCount: 0,
            },
        });

        if (error) throw error;

        console.log('Personal workspace created/recovered via RPC:', tenantId);
        return tenantId;
    }, []);

    // Guard to prevent infinite retry of tenant creation
    const hasAttemptedCreateRef = React.useRef(false);

    useEffect(() => {
        if (!user) {
            setCurrentTenant(null);
            setUserTenants([]);
            setCurrentMembership(null);
            setIsLoadingTenant(false);
            hasAttemptedCreateRef.current = false; // Reset on logout
            return;
        }

        const initializeTenants = async () => {
            setIsLoadingTenant(true);
            setError(null);

            try {
                // Load user's tenants
                const memberships = await loadUserTenants(user.id);

                if (memberships.length === 0) {
                    // Only attempt auto-create ONCE per session
                    if (hasAttemptedCreateRef.current) {
                        console.warn('[TenantContext] Already attempted tenant creation this session, skipping retry.');
                        setIsLoadingTenant(false);
                        return;
                    }
                    hasAttemptedCreateRef.current = true;

                    // Auto-create a personal workspace for the user
                    try {
                        const personalTenantId = await createPersonalTenant(user);
                        // Reload memberships after creating tenant
                        const newMemberships = await loadUserTenants(user.id);
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
    // REFRESH FUNCTIONS
    // ==========================================================================

    const refreshTenants = useCallback(async () => {
        if (user) {
            await loadUserTenants(user.id);
        }
    }, [user, loadUserTenants]);

    const refreshCurrentTenant = useCallback(async () => {
        if (currentTenant) {
            await loadTenant(currentTenant.id);
        }
    }, [currentTenant, loadTenant]);

    // ==========================================================================
    // CREATE TENANT
    // ==========================================================================

    const createTenant = useCallback(async (data: CreateTenantData, skipSwitch = false): Promise<string> => {
        if (!user) throw new Error('Usuario no autenticado');

        // Verify sub-client limit
        if (data.type === 'agency_client') {
            if (!currentTenant || !currentMembership || !hasPermission(currentMembership, 'canManageSettings')) {
                throw new Error('No tienes permiso para crear sub-clientes');
            }
            if ((currentTenant.usage.subClientCount || 0) >= (currentTenant.limits.maxSubClients || 0)) {
                throw new Error('Has alcanzado el límite de sub-clientes para tu plan');
            }
        }

        let slug = generateSlug(data.name);
        let finalSlug = slug;
        let counter = 1;

        while (true) {
            const { data: existingSlug } = await supabase
                .from('tenants')
                .select('id')
                .eq('slug', finalSlug);

            if (existingSlug && existingSlug.length > 0) {
                finalSlug = `${slug}-${counter}`;
                counter++;
            } else {
                break;
            }
        }

        const plan = data.type === 'agency_client' ? 'agency_client' : 'free';

        const tenantRecord = {
            name: data.name,
            slug: finalSlug,
            type: data.type,
            owner_user_id: user.id,
            owner_tenant_id: data.parentTenantId,
            subscription_plan: plan,
            status: 'active',
            limits: getDefaultLimitsForPlan(plan as any),
            usage: {
                projectCount: 0,
                userCount: 1,
                storageUsedGB: 0,
                aiCreditsUsed: 0,
                subClientCount: 0,
            },
            branding: {
                ...getDefaultTenantBranding(),
                ...data.branding,
                companyName: data.name,
            },
            settings: getDefaultTenantSettings(),
        };

        const { data: tenantRes, error: tenantErr } = await supabase
            .from('tenants')
            .insert(tenantRecord)
            .select()
            .single();

        if (tenantErr) throw tenantErr;
        const tenantId = tenantRes.id;

        const membershipData = {
            id: `${tenantId}_${user.id}`,
            tenant_id: tenantId,
            user_id: user.id,
            role: 'agency_owner',
            permissions: DEFAULT_PERMISSIONS.agency_owner,
            invited_by: user.id,
        };

        await supabase.from('tenant_members').insert(membershipData);

        await refreshTenants();

        if (!skipSwitch) {
            await switchTenant(tenantId);
        }

        return tenantId;
    }, [user, currentTenant, currentMembership, switchTenant, refreshTenants]);

    // ==========================================================================
    // UPDATE TENANT
    // ==========================================================================

    const updateTenant = useCallback(async (tenantId: string, data: Partial<Tenant>) => {
        if (!currentMembership || (!isUserOwner && !hasPermission(currentMembership, 'canManageSettings'))) {
            throw new Error('No tienes permiso para actualizar este workspace');
        }

        await supabase.from('tenants').update({
            name: data.name,
            slug: data.slug,
            type: data.type,
            subscription_plan: data.subscriptionPlan,
            status: data.status,
            limits: data.limits,
            usage: data.usage,
            branding: data.branding,
            settings: data.settings,
            updated_at: new Date().toISOString()
        }).eq('id', tenantId);

        if (currentTenant?.id === tenantId) {
            await loadTenant(tenantId);
        }
    }, [currentMembership, isUserOwner, currentTenant, loadTenant]);

    // ==========================================================================
    // DELETE TENANT
    // ==========================================================================

    const deleteTenant = useCallback(async (tenantId: string) => {
        if (!currentMembership || (!isUserOwner && currentMembership.role !== 'agency_owner')) {
            throw new Error('Solo el propietario puede eliminar el workspace');
        }

        // RLS cascade will handle members if setup properly, but let's delete explicitly just in case
        await supabase.from('tenant_members').delete().eq('tenant_id', tenantId);
        await supabase.from('tenants').delete().eq('id', tenantId);

        if (currentTenant?.id === tenantId) {
            setCurrentTenant(null);
            setCurrentMembership(null);
            localStorage.removeItem(ACTIVE_TENANT_KEY);
            await refreshTenants();
        }
    }, [currentMembership, isUserOwner, currentTenant, refreshTenants]);

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
        const inviteData = {
            tenant_id: currentTenant.id,
            email: data.email.toLowerCase(),
            role: data.role,
            custom_permissions: data.customPermissions,
            invited_by: user.id,
            token,
            message: data.message,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            tenant_name: currentTenant.name,
        };

        const { data: inviteRes, error } = await supabase.from('tenant_invites').insert(inviteData).select().single();
        if (error) throw error;

        // Call Edge Function to send email
        try {
            await supabase.functions.invoke('send-invite-email', {
                body: {
                    email: data.email.toLowerCase(),
                    token,
                    tenantName: currentTenant.name,
                    role: data.role,
                    inviterName: userDocument?.name || user.displayName || 'Alguien'
                }
            });
        } catch (emailError) {
            console.error('Failed to send invite email via Edge Function:', emailError);
        }

        return inviteRes.id;
    }, [currentTenant, currentMembership, user, userDocument]);

    // ==========================================================================
    // REMOVE MEMBER
    // ==========================================================================

    const removeMember = useCallback(async (userId: string) => {
        if (!currentTenant || !currentMembership) {
            throw new Error('No hay workspace activo');
        }

        // Can't remove yourself
        if (user?.id === userId) {
            throw new Error('No puedes removerte a ti mismo');
        }

        // Check permissions
        if (!hasPermission(currentMembership, 'canRemoveMembers')) {
            await switchTenant('');
        }
    }, [currentTenant, currentMembership, user, switchTenant]);

    // ==========================================================================
    // UPDATE MEMBER ROLE
    // ==========================================================================

    const updateMemberRole = useCallback(async (userId: string, role: AgencyRole) => {
        if (!currentTenant || !currentMembership || !hasPermission(currentMembership, 'canManageSettings')) {
            throw new Error('No tienes permiso para cambiar roles');
        }

        await supabase.from('tenant_members').update({
            role,
            permissions: DEFAULT_PERMISSIONS[role] as any,
        }).eq('tenant_id', currentTenant.id).eq('user_id', userId);

    }, [currentTenant, currentMembership]);

    // ==========================================================================
    // UPDATE MEMBER PERMISSIONS
    // ==========================================================================

    const updateMemberPermissions = useCallback(async (userId: string, permissions: Partial<TenantPermissions>) => {
        if (!currentTenant || !currentMembership || !hasPermission(currentMembership, 'canManageSettings')) {
            throw new Error('No tienes permiso para cambiar permisos');
        }

        const { data: memDoc } = await supabase.from('tenant_members').select('permissions').eq('tenant_id', currentTenant.id).eq('user_id', userId).single();
        
        if (!memDoc) {
            throw new Error('Miembro no encontrado');
        }

        const currentPermissions = typeof memDoc.permissions === 'string' ? JSON.parse(memDoc.permissions) : memDoc.permissions;

        await supabase.from('tenant_members').update({
            permissions: { ...currentPermissions, ...permissions } as any,
        }).eq('tenant_id', currentTenant.id).eq('user_id', userId);

    }, [currentTenant, currentMembership]);

    // ==========================================================================
    // CREATE SUB-CLIENT (FOR AGENCIES)
    // ==========================================================================

    const createSubClient = useCallback(async (data: CreateTenantData, initialUsers: { email: string, name: string, role: AgencyRole }[] = []): Promise<string> => {
        if (!currentTenant || !currentMembership || !hasPermission(currentMembership, 'canManageSettings')) {
            throw new Error('No tienes permiso para gestionar sub-clientes');
        }

        const subClientCount = currentTenant.usage?.subClientCount || 0;
        const maxSubClients = currentTenant.limits?.maxSubClients || 0;

        if (subClientCount >= maxSubClients) {
            throw new Error('Has alcanzado el límite de sub-clientes permitidos por tu plan');
        }

        // Create sub-client tenant, skip switching
        const subClientId = await createTenant({
            ...data,
            type: 'agency_client',
            parentTenantId: currentTenant.id
        }, true);

        // Invite initial users
        if (initialUsers.length > 0) {
            for (const newUser of initialUsers) {
                const token = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;
                
                const inviteData = {
                    tenant_id: subClientId,
                    email: newUser.email.toLowerCase(),
                    role: newUser.role,
                    invited_by: user?.id || '',
                    token,
                    message: `Bienvenido a ${data.name}`,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'pending',
                    tenant_name: data.name,
                };
                
                await supabase.from('tenant_invites').insert(inviteData);
                
                // Invoke Edge function to send email for the subclient invite
                try {
                    await supabase.functions.invoke('send-invite-email', {
                        body: {
                            email: newUser.email.toLowerCase(),
                            token,
                            tenantName: data.name,
                            role: newUser.role,
                            inviterName: userDocument?.name || user?.displayName || 'Alguien'
                        }
                    });
                } catch (e) {
                    console.error('Failed to send edge function invite for subclient:', e);
                }
            }
        }

        // Update parent tenant's sub-client count
        await supabase.from('tenants').update({
            usage: { ...currentTenant.usage, subClientCount: subClientCount + 1 },
            updated_at: new Date().toISOString()
        }).eq('id', currentTenant.id);

        return subClientId;
    }, [currentTenant, currentMembership, createTenant, user, userDocument]);

    // ==========================================================================
    // GET SUB-CLIENTS
    // ==========================================================================

    const getSubClients = useCallback(async (): Promise<Tenant[]> => {
        if (!currentTenant) return [];

        const { data: snapshot } = await supabase.from('tenants').select('*').eq('owner_tenant_id', currentTenant.id);
        
        return (snapshot || []).map((tData: any) => {
            const raw = {
                id: tData.id,
                name: tData.name,
                slug: tData.slug,
                type: tData.type,
                ownerUserId: tData.owner_user_id,
                subscriptionPlan: tData.subscription_plan,
                status: tData.status,
                limits: typeof tData.limits === 'string' ? JSON.parse(tData.limits) : tData.limits,
                usage: typeof tData.usage === 'string' ? JSON.parse(tData.usage) : tData.usage,
                branding: typeof tData.branding === 'string' ? JSON.parse(tData.branding) : tData.branding,
                settings: typeof tData.settings === 'string' ? JSON.parse(tData.settings) : tData.settings,
                createdAt: tData.created_at,
                updatedAt: tData.updated_at
            } as any;
            return {
                ...raw,
                name: resolveProjectName(raw.name),
                branding: raw.branding ? {
                    ...raw.branding,
                    companyName: raw.branding.companyName ? resolveProjectName(raw.branding.companyName) : resolveProjectName(raw.name)
                } : undefined
            } as Tenant;
        });
    }, [currentTenant]);



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






