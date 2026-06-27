import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/core/AuthContext';
import { useProject } from '../../contexts/project';
import { useSafeTenant } from '../../contexts/tenant';
import { usePlanAccess } from '../usePlanFeatures';
import { useServiceAvailability } from '../useServiceAvailability';
import { supabase } from '../../supabase';
import type { RealtyModuleFlags, RealtyPermissionKey } from '../../types/realty';
import { DEFAULT_REALTY_FLAGS } from '../../utils/realty';

interface ModuleAccessRow {
    enabled: boolean;
    flags?: Partial<RealtyModuleFlags> | null;
}

export const useRealtyAccess = () => {
    const { userDocument, isUserOwner } = useAuth();
    const { activeProjectId } = useProject();
    const tenantContext = useSafeTenant();
    const { hasAccess: hasPlanFeature, isLoading: isLoadingPlan } = usePlanAccess();
    const { isServicePublic, isLoading: isLoadingService } = useServiceAvailability();
    const [projectModule, setProjectModule] = useState<ModuleAccessRow | null>(null);
    const [isLoadingModule, setIsLoadingModule] = useState(false);

    const permissions = tenantContext?.currentMembership?.permissions as Record<string, any> | undefined;
    const role = userDocument?.role;
    const isAdmin = isUserOwner || role === 'owner' || role === 'superadmin' || role === 'admin' || role === 'manager' || tenantContext?.currentRole === 'agency_owner' || tenantContext?.currentRole === 'agency_admin';
    const enabledTenantFeatures = tenantContext?.currentTenant?.settings?.enabledFeatures;
    const tenantSettingsAllows = !Array.isArray(enabledTenantFeatures) || enabledTenantFeatures.includes('realEstate') || isAdmin;

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoadingModule(true);
            try {
                const projectResult = activeProjectId
                    ? await supabase.from('projects').select('data').eq('id', activeProjectId).maybeSingle()
                    : { data: null, error: null };

                if (cancelled) return;

                const shouldIgnore = (error: any) => !error || error.code === 'PGRST205' || error.code === '42P01';
                if (!shouldIgnore(projectResult.error)) throw projectResult.error;

                const realtyModule = ((projectResult.data as any)?.data || {})?.realtyModule;
                setProjectModule(realtyModule ? {
                    enabled: realtyModule.enabled ?? realtyModule.flags?.real_estate_enabled ?? true,
                    flags: realtyModule.flags || {},
                } : null);
            } catch (err) {
                console.warn('[useRealtyAccess] Module access lookup failed; falling back to plan/service gating.', err);
                if (!cancelled) {
                    setProjectModule(null);
                }
            } finally {
                if (!cancelled) setIsLoadingModule(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [activeProjectId]);

    const flags = useMemo<RealtyModuleFlags>(() => ({
        ...DEFAULT_REALTY_FLAGS,
        ...((projectModule?.flags || {}) as Partial<RealtyModuleFlags>),
        real_estate_enabled: projectModule?.enabled ?? true,
    }), [projectModule]);

    const hasPermission = useCallback((permission: RealtyPermissionKey) => {
        if (isAdmin) return true;
        if (!permissions) return true;
        if (permissions[permission] === true) return true;
        if (permissions.real_estate?.[permission.split('.').pop() || ''] === true) return true;
        if (permission === 'real_estate.view') return permissions.canManageProjects !== false;
        if (permission === 'real_estate.leads') return permissions.canManageLeads === true || permissions.canManageRealEstate === true;
        if (permission === 'real_estate.properties') return permissions.canManageProjects === true || permissions.canManageRealEstate === true;
        return permissions.canManageRealEstate === true;
    }, [isAdmin, permissions]);

    const planAllows = hasPlanFeature('realEstateModule');
    const serviceAllows = !isLoadingService && isServicePublic('realEstate');
    const moduleAllows = flags.real_estate_enabled;
    const canView = planAllows && serviceAllows && tenantSettingsAllows && moduleAllows && hasPermission('real_estate.view');

    return {
        flags,
        canView,
        canManage: canView && hasPermission('real_estate.manage'),
        canManageProperties: canView && hasPermission('real_estate.properties'),
        canManageLeads: canView && hasPermission('real_estate.leads'),
        canUseAi: canView && flags.real_estate_ai_enabled && hasPermission('real_estate.ai'),
        canManageSettings: canView && hasPermission('real_estate.settings'),
        planAllows,
        serviceAllows,
        tenantSettingsAllows,
        moduleAllows,
        isAdmin,
        isLoading: isLoadingPlan || isLoadingService || isLoadingModule,
    };
};
