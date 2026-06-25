/**
 * useServiceAvailability Hook
 * Hook para gestionar la disponibilidad global de servicios de la plataforma
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { useSafeAuth } from '../contexts/core/AuthContext';
import {
    GlobalServiceAvailability,
    ServiceStatus,
    PlatformServiceId,
    ServiceConfig,
    ServiceAuditEntry,
    getInitialServiceAvailability,
    canRoleAccessService,
    PLATFORM_SERVICES,
} from '../types/serviceAvailability';

// =============================================================================
// HOOK
// =============================================================================

export interface UseServiceAvailabilityReturn {
    // State
    availability: GlobalServiceAvailability | null;
    isLoading: boolean;
    error: string | null;
    auditLog: ServiceAuditEntry[];
    isLoadingAuditLog: boolean;

    // Actions
    updateServiceStatus: (
        serviceId: PlatformServiceId,
        newStatus: ServiceStatus,
        reason?: string
    ) => Promise<boolean>;
    refreshAuditLog: () => Promise<void>;

    // Helpers
    getServiceStatus: (serviceId: PlatformServiceId) => ServiceStatus;
    canAccessService: (serviceId: PlatformServiceId) => boolean;
    isServicePublic: (serviceId: PlatformServiceId) => boolean;
}

export function useServiceAvailability(): UseServiceAvailabilityReturn {
    const authContext = useSafeAuth();
    const user = authContext?.user ?? null;
    const userDocument = authContext?.userDocument ?? null;
    const [availability, setAvailability] = useState<GlobalServiceAvailability | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [auditLog, setAuditLog] = useState<ServiceAuditEntry[]>([]);
    const [isLoadingAuditLog, setIsLoadingAuditLog] = useState(false);

    const userRole = userDocument?.role || 'user';

    // =========================================================================
    // LOAD AVAILABILITY (one-shot fetch — no realtime needed for admin config)
    // =========================================================================
    useEffect(() => {
        const fetchAvailability = async () => {
            try {
                const { data, error } = await supabase
                    .from('settings')
                    .select('config')
                    .eq('id', 'serviceAvailability')
                    .maybeSingle();

                if (error) throw error;

                if (data?.config) {
                    setAvailability(data.config as GlobalServiceAvailability);
                } else {
                    setAvailability(null);
                }
            } catch (err) {
                console.error('Error loading service availability:', err);
                setError('Error loading service availability');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAvailability();
    }, []);

    // =========================================================================
    // LOAD AUDIT LOG
    // =========================================================================
    const refreshAuditLog = useCallback(async () => {
        setIsLoadingAuditLog(true);
        try {
            const { data, error } = await supabase
                .from('service_audit_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(50);

            if (error) throw error;

            const entries: ServiceAuditEntry[] = (data || []).map(row => ({
                id: row.id,
                serviceId: row.service_id,
                previousStatus: row.previous_status,
                newStatus: row.new_status,
                reason: row.reason,
                userId: row.user_id,
                userEmail: row.user_email,
                timestamp: row.timestamp,
            } as any));

            setAuditLog(entries);
        } catch (err) {
            console.error('Error loading audit log:', err);
        } finally {
            setIsLoadingAuditLog(false);
        }
    }, []);

    // Load audit log on mount (only for super admins who have read access)
    useEffect(() => {
        if (userRole === 'owner' || userRole === 'superadmin') {
            refreshAuditLog();
        }
    }, [refreshAuditLog, userRole]);

    // =========================================================================
    // UPDATE SERVICE STATUS
    // =========================================================================
    const updateServiceStatus = useCallback(async (
        serviceId: PlatformServiceId,
        newStatus: ServiceStatus,
        reason?: string
    ): Promise<boolean> => {
        if (!user || !userDocument) {
            setError('User not authenticated');
            return false;
        }

        try {
            if (import.meta.env.DEV) {
                console.log('[ServiceAvailability] Starting update:', {
                    serviceId,
                    newStatus,
                    userId: user.id,
                    userEmail: user.email,
                    userRole: userDocument?.role
                });
            }

            // Get current state for audit log
            const { data: currentSnap, error: currentError } = await supabase
                .from('settings')
                .select('config')
                .eq('id', 'serviceAvailability')
                .maybeSingle();

            if (currentError) throw currentError;

            let currentAvailability: GlobalServiceAvailability;

            if (currentSnap?.config) {
                currentAvailability = currentSnap.config as GlobalServiceAvailability;
            } else {
                currentAvailability = getInitialServiceAvailability(user.id);
            }

            const previousStatus = currentAvailability.services[serviceId]?.status || 'public';
            
            // Update service config
            const updatedServices = {
                ...currentAvailability.services,
                [serviceId]: {
                    status: newStatus,
                    statusReason: reason || null,
                    updatedAt: new Date().toISOString(),
                    updatedBy: user.id,
                } as ServiceConfig,
            };

            const updatedConfig = {
                services: updatedServices,
                lastUpdated: new Date().toISOString(),
                updatedBy: user.id,
            };

            // Save updated availability
            const { error: updateError } = await supabase
                .from('settings')
                .upsert({
                    id: 'serviceAvailability',
                    config: updatedConfig,
                    updated_at: new Date().toISOString(),
                    updated_by: user.id
                });

            if (updateError) throw updateError;
            setAvailability(updatedConfig as GlobalServiceAvailability);

            if (import.meta.env.DEV) {
                console.log('[ServiceAvailability] Main document saved successfully');
            }

            // Create audit log entry
            try {
                if (import.meta.env.DEV) {
                    console.log('[ServiceAvailability] Attempting to write audit log...');
                }
                
                await supabase.from('service_audit_logs').insert({
                    service_id: serviceId,
                    previous_status: previousStatus,
                    new_status: newStatus,
                    reason: reason || null,
                    user_id: user.id,
                    user_email: user.email || 'unknown'
                });

                if (import.meta.env.DEV) {
                    console.log('[ServiceAvailability] Audit log saved successfully');
                }
                await refreshAuditLog();
            } catch (auditErr) {
                console.warn('[ServiceAvailability] Audit log write failed (non-critical):', auditErr);
            }

            setError(null);
            return true;
        } catch (err: any) {
            console.error('[ServiceAvailability] Error updating service status:', err);
            setError('Error updating service status');
            return false;
        }
    }, [user, userDocument, refreshAuditLog]);

    // =========================================================================
    // HELPERS
    // =========================================================================
    const getServiceStatus = useCallback((serviceId: PlatformServiceId): ServiceStatus => {
        if (!availability?.services[serviceId]) {
            return 'public'; // Default to public if not configured
        }
        return availability.services[serviceId].status;
    }, [availability]);

    const canAccessService = useCallback((serviceId: PlatformServiceId): boolean => {
        const status = getServiceStatus(serviceId);
        return canRoleAccessService(status, userRole);
    }, [getServiceStatus, userRole]);

    const isServicePublic = useCallback((serviceId: PlatformServiceId): boolean => {
        return getServiceStatus(serviceId) === 'public';
    }, [getServiceStatus]);

    return {
        availability,
        isLoading,
        error,
        auditLog,
        isLoadingAuditLog,
        updateServiceStatus,
        refreshAuditLog,
        getServiceStatus,
        canAccessService,
        isServicePublic,
    };
}

// =============================================================================
// SIMPLE HOOK FOR CHECKING SERVICE ACCESS (for use across app)
// =============================================================================

/**
 * Hook simplificado para verificar si el usuario actual puede acceder a un servicio
 * Uso: const canAccessCMS = useCanAccessService('cms');
 */
export function useCanAccessService(serviceId: PlatformServiceId): boolean {
    const { canAccessService, isLoading } = useServiceAvailability();

    // While loading, assume public access
    if (isLoading) return true;

    return canAccessService(serviceId);
}

/**
 * Hook para obtener todos los servicios que el usuario puede acceder
 */
export function useAccessibleServices(): PlatformServiceId[] {
    const { canAccessService, isLoading } = useServiceAvailability();

    return useMemo(() => {
        if (isLoading) {
            return PLATFORM_SERVICES.map(s => s.id);
        }
        return PLATFORM_SERVICES.filter(s => canAccessService(s.id)).map(s => s.id);
    }, [canAccessService, isLoading]);
}
