/**
 * useServiceAvailability Hook
 * Hook para gestionar la disponibilidad global de servicios de la plataforma
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/core/AuthContext';
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
// CONSTANTS
// =============================================================================

const SETTINGS_DOC_PATH = 'globalSettings/serviceAvailability';
const AUDIT_LOG_COLLECTION = 'globalSettings/serviceAvailability/auditLog';

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
    const { user, userDocument } = useAuth();
    const [availability, setAvailability] = useState<GlobalServiceAvailability | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [auditLog, setAuditLog] = useState<ServiceAuditEntry[]>([]);
    const [isLoadingAuditLog, setIsLoadingAuditLog] = useState(false);

    const userRole = userDocument?.role || 'user';

    // =========================================================================
    // LOAD AVAILABILITY (with real-time listener)
    // =========================================================================
    useEffect(() => {
        const docRef = doc(db, 'globalSettings', 'serviceAvailability');

        const unsubscribe = onSnapshot(
            docRef,
            (snap) => {
                if (snap.exists()) {
                    setAvailability(snap.data() as GlobalServiceAvailability);
                } else {
                    // Initialize with default values if document doesn't exist
                    setAvailability(null);
                }
                setIsLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error loading service availability:', err);
                setError('Error loading service availability');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // =========================================================================
    // LOAD AUDIT LOG
    // =========================================================================
    const refreshAuditLog = useCallback(async () => {
        setIsLoadingAuditLog(true);
        try {
            const auditRef = collection(db, AUDIT_LOG_COLLECTION);
            const q = query(auditRef, orderBy('timestamp', 'desc'), limit(50));
            const snap = await getDocs(q);

            const entries: ServiceAuditEntry[] = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as ServiceAuditEntry));

            setAuditLog(entries);
        } catch (err) {
            console.error('Error loading audit log:', err);
        } finally {
            setIsLoadingAuditLog(false);
        }
    }, []);

    // Load audit log on mount (only for super admins who have read access)
    useEffect(() => {
        if (userRole === 'owner' || userRole === 'superadmin' || userRole === 'Owner' || userRole === 'Superadmin' || userRole === 'SuperAdmin') {
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

        const docRef = doc(db, 'globalSettings', 'serviceAvailability');

        try {
            console.log('[ServiceAvailability] Starting update:', {
                serviceId,
                newStatus,
                userId: user.uid,
                userEmail: user.email,
                userRole: userDocument?.role
            });

            // Get current state for audit log
            const currentSnap = await getDoc(docRef);
            let currentAvailability: GlobalServiceAvailability;

            if (currentSnap.exists()) {
                currentAvailability = currentSnap.data() as GlobalServiceAvailability;
                console.log('[ServiceAvailability] Current doc exists, reading current state');
            } else {
                // Initialize if doesn't exist
                currentAvailability = getInitialServiceAvailability(user.uid);
                console.log('[ServiceAvailability] No existing doc, using initial state');
            }

            const previousStatus = currentAvailability.services[serviceId]?.status || 'public';
            const now = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };

            // Update service config - ensure no undefined values (Firestore rejects undefined)
            const updatedServices = {
                ...currentAvailability.services,
                [serviceId]: {
                    status: newStatus,
                    statusReason: reason || null, // Firestore doesn't allow undefined
                    updatedAt: now,
                    updatedBy: user.uid,
                } as ServiceConfig,
            };

            // Save updated availability
            console.log('[ServiceAvailability] Attempting to save main document...');
            await setDoc(docRef, {
                services: updatedServices,
                lastUpdated: now,
                updatedBy: user.uid,
            });
            console.log('[ServiceAvailability] Main document saved successfully');

            // Create audit log entry - wrap in separate try-catch to not block main functionality
            try {
                console.log('[ServiceAvailability] Attempting to write audit log...');
                const auditRef = collection(db, AUDIT_LOG_COLLECTION);
                const auditEntry: Omit<ServiceAuditEntry, 'id'> = {
                    serviceId,
                    previousStatus,
                    newStatus,
                    reason: reason || null, // Firestore doesn't allow undefined
                    userId: user.uid,
                    userEmail: user.email || 'unknown',
                    timestamp: now,
                };

                await addDoc(auditRef, auditEntry);
                console.log('[ServiceAvailability] Audit log saved successfully');

                // Refresh audit log
                await refreshAuditLog();
            } catch (auditErr) {
                // Audit log failure should not block the main update
                console.warn('[ServiceAvailability] Audit log write failed (non-critical):', auditErr);
            }

            // Clear any previous error since main operation succeeded
            setError(null);
            return true;
        } catch (err: any) {
            console.error('[ServiceAvailability] Error updating service status:', {
                message: err?.message,
                code: err?.code,
                name: err?.name,
                fullError: err
            });
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
