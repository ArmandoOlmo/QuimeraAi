/**
 * TenantContext
 * Manages multi-tenant state, workspace switching, and tenant-level permissions
 */

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import {
    Tenant,
    TenantMembership,
    TenantBilling,
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
    resolveTenantEffectiveLimits,
    resolveTenantEffectivePlan,
    normalizeTenantSubscriptionPlanForType,
} from '../../types/multiTenant';
import { supabase } from '../../supabase';
import { useAuth } from '../core/AuthContext';
import { resolveProjectName } from '../../utils/resolveProjectName';
import {
    getCanonicalPlanFeatures,
    normalizePlanId,
    normalizePlanLimits,
} from '../../services/billing/planCatalog';
import { resolveServiceAccess } from '../../services/access/serviceAccessEngine';
import { assignPlanToClient, getAgencyPlanById } from '../../services/agencyPlansService';

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

function isMissingAgencyEngineTable(error: unknown): boolean {
    const err = error as { code?: string; message?: string } | null;
    const message = String(err?.message || '').toLowerCase();
    return err?.code === '42P01' ||
        err?.code === 'PGRST205' ||
        message.includes('agency_clients') ||
        message.includes('could not find the table');
}

function parseTenantJsonField<T>(value: T | string | null | undefined, fallback: T): T {
    if (!value) return fallback;
    if (typeof value !== 'string') return value as T;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}

function mapTenantRowToTenant(tData: any): Tenant {
    const agencyRelationship = tData.agency_relationship || {};
    const agencyMetadata = parseTenantJsonField(agencyRelationship.metadata, {} as Record<string, any>);
    const parsedBilling = parseTenantJsonField(tData.billing, {} as Tenant['billing']);
    const tenantType = tData.type === 'personal' ? 'individual' : tData.type;
    const agencyTenantId = agencyRelationship.agency_tenant_id || tData.owner_tenant_id || parsedBilling?.agencyTenantId;
    const agencyPlanId = agencyRelationship.agency_plan_id || parsedBilling?.agencyPlanId || agencyMetadata.agencyPlanId;
    const agencyBillingMode = agencyRelationship.billing_mode || parsedBilling?.mode || agencyMetadata.billingMode;
    const agencyEffectivePlanId = parsedBilling?.effectivePlanId || agencyMetadata.effectivePlanId;
    const billing = tenantType === 'agency_client'
        ? {
            ...parsedBilling,
            mode: (agencyBillingMode || 'included_in_parent') as TenantBilling['mode'],
            agencyTenantId,
            agencyPlanId,
            effectivePlanId: agencyEffectivePlanId,
        }
        : parsedBilling;
    const raw = {
        id: tData.id,
        name: tData.name,
        slug: tData.slug,
        type: tenantType,
        ownerUserId: tData.owner_user_id,
        ownerTenantId: tData.owner_tenant_id,
        subscriptionPlan: tData.subscription_plan,
        status: tData.status,
        limits: parseTenantJsonField(tData.limits, {} as Tenant['limits']),
        usage: parseTenantJsonField(tData.usage, {} as Tenant['usage']),
        branding: parseTenantJsonField(tData.branding, {} as Tenant['branding']),
        settings: parseTenantJsonField(tData.settings, {} as Tenant['settings']),
        billing,
        agencyTenantId,
        agencyPlanId,
        agencyBillingMode,
        agencyLifecycleStage: agencyRelationship.lifecycle_stage || agencyRelationship.status || undefined,
        agencyOnboardingStatus: agencyRelationship.onboarding_status || undefined,
        agencyClientMetadata: agencyMetadata,
        agencyOperatingSystem: agencyMetadata.agencyOperatingSystem || null,
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
}

function withAgencyClientEffectiveContext(tenant: Tenant, parentTenant?: Tenant | null): Tenant {
    if (tenant.type !== 'agency_client') return tenant;

    const effectivePlanId = resolveTenantEffectivePlan(tenant, parentTenant);
    const agencyTenantId = tenant.agencyTenantId || tenant.ownerTenantId || tenant.billing?.agencyTenantId;

    return {
        ...tenant,
        limits: resolveTenantEffectiveLimits(tenant, parentTenant),
        billing: {
            ...(tenant.billing || {}),
            mode: tenant.billing?.mode || 'included_in_parent',
            agencyTenantId,
            effectivePlanId,
        },
        agencyTenantId,
    };
}

async function fetchTenantRowById(tenantId: string): Promise<any | null> {
    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

async function fetchTenantRowsByIds(clientIds: string[]): Promise<any[]> {
    const uniqueIds = Array.from(new Set(clientIds.filter(Boolean)));
    const rows: any[] = [];

    for (let i = 0; i < uniqueIds.length; i += 50) {
        const chunk = uniqueIds.slice(i, i + 50);
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .in('id', chunk);

        if (error) throw error;
        rows.push(...(data || []));
    }

    return rows;
}

async function fetchAgencyClientTenantRows(agencyTenantId: string): Promise<any[]> {
    const tenantsById = new Map<string, any>();
    const relationshipsByClientId = new Map<string, any>();

    const { data: relationships, error: relationshipError } = await supabase
        .from('agency_clients')
        .select('agency_tenant_id,client_tenant_id,agency_plan_id,billing_mode,onboarding_status,status,lifecycle_stage,metadata,updated_at')
        .eq('agency_tenant_id', agencyTenantId);

    if (relationshipError && !isMissingAgencyEngineTable(relationshipError)) {
        throw relationshipError;
    }

    if (!relationshipError && relationships?.length) {
        const canonicalClientIds = relationships
            .map(row => {
                if (row.client_tenant_id) relationshipsByClientId.set(row.client_tenant_id, row);
                return row.client_tenant_id;
            })
            .filter(Boolean);
        const canonicalRows = await fetchTenantRowsByIds(canonicalClientIds);
        canonicalRows.forEach(row => {
            const relationship = relationshipsByClientId.get(row.id);
            tenantsById.set(row.id, relationship ? { ...row, agency_relationship: relationship } : row);
        });
    }

    const { data: legacyRows, error: legacyError } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_tenant_id', agencyTenantId);

    if (legacyError) throw legacyError;
    (legacyRows || []).forEach(row => {
        if (!tenantsById.has(row.id)) tenantsById.set(row.id, row);
    });

    return Array.from(tenantsById.values());
}

async function fetchAgencyClientRelationship(clientTenantId: string, agencyTenantId?: string | null): Promise<any | null> {
    let query = supabase
        .from('agency_clients')
        .select('agency_tenant_id,client_tenant_id,agency_plan_id,billing_mode,onboarding_status,status,lifecycle_stage,metadata,updated_at')
        .eq('client_tenant_id', clientTenantId)
        .limit(1);

    if (agencyTenantId) {
        query = query.eq('agency_tenant_id', agencyTenantId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        if (isMissingAgencyEngineTable(error)) return null;
        throw error;
    }

    return data || null;
}

async function hydrateTenantFromRow(tenantDoc: any): Promise<Tenant> {
    let tenantRow = tenantDoc;
    let parentTenant: Tenant | null = null;

    if (tenantDoc.type === 'agency_client' || tenantDoc.owner_tenant_id) {
        const parsedBilling = parseTenantJsonField(tenantDoc.billing, {} as TenantBilling);
        const relationship = await fetchAgencyClientRelationship(
            tenantDoc.id,
            tenantDoc.owner_tenant_id || parsedBilling.agencyTenantId,
        );
        tenantRow = relationship ? { ...tenantDoc, agency_relationship: relationship } : tenantDoc;

        const agencyTenantId = relationship?.agency_tenant_id || tenantDoc.owner_tenant_id || parsedBilling.agencyTenantId;
        if (agencyTenantId) {
            try {
                const parentRow = await fetchTenantRowById(agencyTenantId);
                parentTenant = parentRow ? mapTenantRowToTenant(parentRow) : null;
            } catch (parentErr) {
                console.warn('[TenantContext] Could not load parent agency tenant for agency_client effective plan', parentErr);
            }
        }
    }

    return withAgencyClientEffectiveContext(mapTenantRowToTenant(tenantRow), parentTenant);
}

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

    const assertAgencyClientProvisioningAccess = useCallback(() => {
        const effectivePlanId = normalizePlanId(resolveTenantEffectivePlan(currentTenant));
        const decision = resolveServiceAccess({
            userId: user?.id,
            userRole: userDocument?.role,
            tenantId: currentTenant?.id,
            tenantStatus: currentTenant?.status,
            subscriptionStatus: currentTenant?.status,
            planId: effectivePlanId,
            moduleId: 'agency-client-provisioning',
            serviceId: 'agency',
            featureKey: 'agencyModule',
            permissions: currentMembership?.permissions as unknown as Record<string, unknown> | undefined,
            planFeatures: getCanonicalPlanFeatures(effectivePlanId),
            planLimits: normalizePlanLimits(resolveTenantEffectiveLimits(currentTenant), effectivePlanId),
            currentUsage: currentTenant?.usage as unknown as Record<string, unknown> | undefined,
        });

        if (!decision.allowed) {
            throw new Error(decision.message || 'No tienes permiso para crear sub-clientes');
        }
    }, [currentMembership?.permissions, currentTenant, user?.id, userDocument?.role]);

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
                    const tenant = await hydrateTenantFromRow(tData);
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

            const tenant = await hydrateTenantFromRow(tenantDoc);

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

    const createPersonalTenant = useCallback(async (authUser: { id: string; email?: string | null; displayName?: string | null }): Promise<string> => {
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

        try {
            await supabase
                .from('tenants')
                .update({ type: 'individual', subscription_plan: 'free', updated_at: new Date().toISOString() })
                .eq('id', tenantId)
                .in('type', ['personal', 'individual']);

            await supabase
                .from('tenant_members')
                .update({ permissions: DEFAULT_PERMISSIONS.agency_owner })
                .eq('tenant_id', tenantId)
                .eq('user_id', authUser.id)
                .eq('role', 'agency_owner');
        } catch (normalizeErr) {
            console.warn('[TenantContext] Personal workspace normalization skipped', normalizeErr);
        }

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

        const parentTenant = data.type === 'agency_client' ? currentTenant : null;
        const parentAgencyTenantId = data.parentTenantId || parentTenant?.id;
        const selectedAgencyPlanId = data.type === 'agency_client'
            ? (data.agencyPlanId || data.selectedPlanId || null)
            : null;
        let selectedAgencyPlan: Awaited<ReturnType<typeof getAgencyPlanById>> = null;

        // Verify sub-client limit
        if (data.type === 'agency_client') {
            assertAgencyClientProvisioningAccess();
            if (!parentTenant || !parentAgencyTenantId) throw new Error('No hay agencia activa para crear sub-clientes');
            if ((parentTenant.usage.subClientCount || 0) >= (parentTenant.limits.maxSubClients || 0)) {
                throw new Error('Has alcanzado el límite de sub-clientes para tu plan');
            }
            selectedAgencyPlan = selectedAgencyPlanId
                ? await getAgencyPlanById(selectedAgencyPlanId)
                : null;
            if (selectedAgencyPlanId && !selectedAgencyPlan) {
                throw new Error('Plan de servicio de agencia no encontrado');
            }
            if (selectedAgencyPlan && selectedAgencyPlan.tenantId !== parentAgencyTenantId) {
                throw new Error('El plan seleccionado no pertenece a la agencia activa');
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

        const agencyClientBillingMode: TenantBilling['mode'] = data.useParentCreditsPool === false
            ? 'direct'
            : (data.setupBilling ? 'agency_managed' : 'included_in_parent');
        const requestedClientPlan = data.type === 'agency_client'
            ? normalizeTenantSubscriptionPlanForType('agency_client', data.plan || 'individual')
            : null;
        const inheritedAgencyPlan = data.type === 'agency_client'
            ? normalizePlanId(parentTenant?.subscriptionPlan || 'individual')
            : null;
        const agencyClientEffectivePlan = data.type === 'agency_client'
            ? (agencyClientBillingMode === 'direct' ? requestedClientPlan : inheritedAgencyPlan)
            : null;
        const plan = data.type === 'agency_client'
            ? resolveTenantEffectivePlan({
                type: 'agency_client',
                subscriptionPlan: requestedClientPlan as any,
                billing: {
                    mode: agencyClientBillingMode,
                    effectivePlanId: agencyClientEffectivePlan as any,
                },
            }, parentTenant)
            : normalizeTenantSubscriptionPlanForType(data.type, data.plan);
        const billing: TenantBilling | undefined = data.type === 'agency_client'
            ? {
                mode: agencyClientBillingMode,
                effectivePlanId: plan,
                agencyTenantId: parentAgencyTenantId,
                agencyPlanId: selectedAgencyPlanId || undefined,
                agencyPlanName: selectedAgencyPlan?.name || data.agencyPlanName || undefined,
                monthlyPrice: data.monthlyPrice ?? selectedAgencyPlan?.price,
                status: data.setupBilling ? 'billing_setup_pending' : undefined,
            }
            : undefined;
        const limits = data.type === 'agency_client'
            ? (selectedAgencyPlan ? selectedAgencyPlan.limits : resolveTenantEffectiveLimits({
                type: 'agency_client',
                subscriptionPlan: plan as any,
                limits: data.useParentCreditsPool === false ? undefined : parentTenant?.limits,
                billing,
            }, parentTenant))
            : getDefaultLimitsForPlan(plan as any);

        const tenantRecord = {
            name: data.name,
            slug: finalSlug,
            type: data.type,
            owner_user_id: user.id,
            owner_tenant_id: data.parentTenantId || parentTenant?.id,
            subscription_plan: plan,
            billing,
            status: 'active',
            limits,
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

        if (data.type === 'agency_client' && parentAgencyTenantId) {
            if (selectedAgencyPlanId) {
                const assignment = await assignPlanToClient(tenantId, selectedAgencyPlanId, user.id);
                if (!assignment.success) {
                    throw new Error(assignment.error || 'No se pudo asignar el plan de servicio al cliente');
                }
            } else {
                const { error: relationshipError } = await supabase
                    .from('agency_clients')
                    .upsert({
                        agency_tenant_id: parentAgencyTenantId,
                        client_tenant_id: tenantId,
                        status: 'active',
                        lifecycle_stage: 'onboarding',
                        billing_mode: billing?.mode || 'included_in_parent',
                        onboarding_status: 'active',
                        project_count: 0,
                        client_owner_email: user.email || null,
                        metadata: {
                            source: 'TenantContext.createTenant',
                            effectivePlanId: plan,
                        },
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'agency_tenant_id,client_tenant_id' });

                if (relationshipError && !isMissingAgencyEngineTable(relationshipError)) {
                    throw relationshipError;
                }
            }
        }

        await refreshTenants();

        if (!skipSwitch) {
            await switchTenant(tenantId);
        }

        return tenantId;
    }, [user, currentTenant, assertAgencyClientProvisioningAccess, switchTenant, refreshTenants]);

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
            billing: data.billing,
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
        assertAgencyClientProvisioningAccess();
        if (!currentTenant) throw new Error('No hay agencia activa para gestionar sub-clientes');

        const subClientCount = currentTenant.usage?.subClientCount || 0;
        const maxSubClients = currentTenant.limits?.maxSubClients || 0;

        if (subClientCount >= maxSubClients) {
            throw new Error('Has alcanzado el límite de sub-clientes permitidos por tu plan');
        }

        // Create sub-client tenant, skip switching
        const subClientId = await createTenant({
            ...data,
            type: 'agency_client',
            parentTenantId: currentTenant.id,
            agencyPlanId: data.agencyPlanId || data.selectedPlanId || null,
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
    }, [currentTenant, assertAgencyClientProvisioningAccess, createTenant, user, userDocument]);

    // ==========================================================================
    // GET SUB-CLIENTS
    // ==========================================================================

    const getSubClients = useCallback(async (): Promise<Tenant[]> => {
        if (!currentTenant) return [];

        const rows = await fetchAgencyClientTenantRows(currentTenant.id);

        return rows.map(mapTenantRowToTenant);
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
