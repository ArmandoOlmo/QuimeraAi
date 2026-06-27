import { useMemo } from 'react';
import { useServiceAccess } from './useServiceAccess';
import type { ServiceAccessDecision } from '../services/access/serviceAccessEngine';

export interface UseAgencyAccessResult {
    isLoading: boolean;
    decision: ServiceAccessDecision;
    canAccessAgency: boolean;
    hasPlatformOverride: boolean;
}

export function useAgencyAccess(): UseAgencyAccessResult {
    const serviceAccess = useServiceAccess();

    const decision = useMemo(() => serviceAccess.canAccessModule('agency-engine', {
        serviceId: 'agency',
        featureKey: 'agencyModule',
        requiredPermission: 'canManageSettings',
    }), [serviceAccess]);

    return {
        isLoading: serviceAccess.isLoading,
        decision,
        canAccessAgency: decision.allowed,
        hasPlatformOverride: decision.adminOverride === true,
    };
}

export default useAgencyAccess;
