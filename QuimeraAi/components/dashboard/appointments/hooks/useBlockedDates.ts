/**
 * useBlockedDates Hook
 * Hook para gestionar fechas/horas bloqueadas en el calendario de citas
 * Las fechas bloqueadas están sincronizadas por proyecto (projectId)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BlockedDate } from '../../../../types';
import { useProject } from '../../../../contexts/project';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useSafeTenant } from '../../../../contexts/tenant';
import { supabase } from '../../../../supabase';
import {
    db,
    collection,
    query,
    orderBy,
    getDocs,
} from '@/utils/compatData';
import { timestampToDate } from '../utils/appointmentHelpers';
import {
    createBlockedTimeCanonical,
    deleteBlockedTimeCanonical,
    getBlockedTimesByProject,
    updateBlockedTimeCanonical,
} from '../../../../services/appointments/appointmentEngineService';
import type { LegacyBlockedDateMigrationResult } from '../../../../services/appointments/appointmentBlockedDateMigrationService';
import { migrateLegacyBlockedDatesToCanonical } from '../../../../services/appointments/appointmentBlockedDateMigrationService';

// =============================================================================
// TYPES
// =============================================================================

interface UseBlockedDatesReturn {
    blockedDates: BlockedDate[];
    canonicalBlockedDates: BlockedDate[];
    legacyBlockedDates: BlockedDate[];
    hasLegacyBlockedDates: boolean;
    isLoading: boolean;
    isMigratingLegacyBlockedDates: boolean;
    error: string | null;

    // CRUD
    createBlockedDate: (data: Omit<BlockedDate, 'id' | 'createdAt' | 'createdBy' | 'projectId'>) => Promise<BlockedDate>;
    updateBlockedDate: (id: string, data: Partial<BlockedDate>) => Promise<void>;
    deleteBlockedDate: (id: string) => Promise<void>;
    migrateLegacyBlockedDates: () => Promise<LegacyBlockedDateMigrationResult>;

    // Helpers
    isDateBlocked: (date: Date) => boolean;
    isHourBlocked: (date: Date, hour: number) => boolean;
    getBlockedDatesForRange: (start: Date, end: Date) => BlockedDate[];
    getBlockedDateForSlot: (date: Date, hour: number) => BlockedDate | null;
}

// =============================================================================
// HOOK
// =============================================================================

export const useBlockedDates = (): UseBlockedDatesReturn => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { activeProjectId } = useProject();
    const tenantContext = useSafeTenant();
    const currentTenantId = tenantContext?.currentTenant?.id || null;

    const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
    const [canonicalBlockedDates, setCanonicalBlockedDates] = useState<BlockedDate[]>([]);
    const [legacyBlockedDates, setLegacyBlockedDates] = useState<BlockedDate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMigratingLegacyBlockedDates, setIsMigratingLegacyBlockedDates] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ==========================================================================
    // DATA LISTENER
    // ==========================================================================

    const fetchBlockedDates = useCallback(async () => {
        if (!user || !activeProjectId) {
            setBlockedDates([]);
            setCanonicalBlockedDates([]);
            setLegacyBlockedDates([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const canonical = await getBlockedTimesByProject(supabase, activeProjectId);
            const migratedLegacySources = new Set<string>();
            canonical.forEach((block) => {
                const metadata = block.metadata || {};
                const legacySource = typeof metadata.legacy_source === 'string'
                    ? metadata.legacy_source
                    : typeof metadata.legacySource === 'string'
                        ? metadata.legacySource
                        : null;
                if (legacySource) migratedLegacySources.add(legacySource);
            });
            const legacy: BlockedDate[] = [];

            try {
                const blockedRef = collection(
                    db, 'users', user.id, 'projects', activeProjectId, 'blockedDates'
                );
                const q = query(blockedRef, orderBy('startDate', 'asc'));
                const snapshot = await getDocs(q);
                snapshot.forEach((doc) => {
                    const legacySource = `users/${user.id}/projects/${activeProjectId}/blockedDates/${doc.id}`;
                    if (migratedLegacySources.has(legacySource)) return;
                    legacy.push({
                        id: `legacy:${doc.id}`,
                        ...doc.data(),
                        projectId: activeProjectId,
                        source: 'legacy_firestore',
                        metadata: {
                            legacyId: doc.id,
                            legacySource,
                            legacy_id: doc.id,
                            legacy_source: legacySource,
                            deprecated: true,
                        },
                    } as unknown as BlockedDate);
                });
            } catch (legacyError) {
                console.warn('[useBlockedDates] Legacy blockedDates fallback unavailable:', legacyError);
            }

            setCanonicalBlockedDates(canonical);
            setLegacyBlockedDates(legacy);
            setBlockedDates([...canonical, ...legacy]);
            setIsLoading(false);
        } catch (err) {
            console.error('Error fetching blocked dates:', err);
            setError(t('appointments.errors.loadBlockedDates'));
            setIsLoading(false);
        }
    }, [user, activeProjectId, t]);

    useEffect(() => {
        if (!user || !activeProjectId) {
            setBlockedDates([]);
            setCanonicalBlockedDates([]);
            setLegacyBlockedDates([]);
            setIsLoading(false);
            return;
        }

        fetchBlockedDates();

        const channel = supabase.channel(`public:appointment-blocks:project_id=eq.${activeProjectId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'project_appointment_blocks',
                filter: `project_id=eq.${activeProjectId}`
            }, () => {
                fetchBlockedDates();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, activeProjectId, fetchBlockedDates]);

    // ==========================================================================
    // CRUD OPERATIONS
    // ==========================================================================

    const createBlockedDate = useCallback(async (
        data: Omit<BlockedDate, 'id' | 'createdAt' | 'createdBy' | 'projectId'>
    ): Promise<BlockedDate> => {
        if (!user) throw new Error(t('appointments.errors.unauthenticated'));
        if (!activeProjectId) throw new Error(t('appointments.errors.noProjectSelected'));

        return createBlockedTimeCanonical(supabase, {
            tenantId: currentTenantId,
            projectId: activeProjectId,
            title: data.title,
            startDate: data.startDate,
            endDate: data.endDate,
            allDay: data.allDay,
            reason: data.reason,
            color: data.color,
            recurrence: data.recurring as any,
            source: 'dashboard',
            createdBy: user.id,
        });
    }, [user, activeProjectId, currentTenantId, t]);

    const updateBlockedDate = useCallback(async (id: string, data: Partial<BlockedDate>): Promise<void> => {
        if (!user) throw new Error(t('appointments.errors.unauthenticated'));
        if (!activeProjectId) throw new Error(t('appointments.errors.noProjectSelected'));

        if (id.startsWith('legacy:')) {
            throw new Error(t('appointments.blockedDates.legacyEditRequired'));
        }

        await updateBlockedTimeCanonical(supabase, id, {
            title: data.title,
            startDate: data.startDate,
            endDate: data.endDate,
            allDay: data.allDay,
            reason: data.reason,
            color: data.color,
            recurrence: data.recurring as any,
            updatedBy: user.id,
        });
    }, [user, activeProjectId, t]);

    const deleteBlockedDate = useCallback(async (id: string): Promise<void> => {
        if (!user) throw new Error(t('appointments.errors.unauthenticated'));
        if (!activeProjectId) throw new Error(t('appointments.errors.noProjectSelected'));

        if (id.startsWith('legacy:')) {
            throw new Error(t('appointments.blockedDates.legacyDeleteRequired'));
        }

        await deleteBlockedTimeCanonical(supabase, id);
    }, [user, activeProjectId, t]);

    const migrateLegacyBlockedDates = useCallback(async (): Promise<LegacyBlockedDateMigrationResult> => {
        if (!user) throw new Error(t('appointments.errors.unauthenticated'));
        if (!activeProjectId) throw new Error(t('appointments.errors.noProjectSelected'));

        setIsMigratingLegacyBlockedDates(true);
        try {
            const result = await migrateLegacyBlockedDatesToCanonical(supabase, {
                tenantId: currentTenantId,
                projectId: activeProjectId,
                userId: user.id,
                createdBy: user.id,
                legacyBlocks: legacyBlockedDates,
                fallbackTitle: t('appointments.blockedDates.migratedTitle'),
            });
            await fetchBlockedDates();
            return result;
        } finally {
            setIsMigratingLegacyBlockedDates(false);
        }
    }, [user, activeProjectId, currentTenantId, legacyBlockedDates, t, fetchBlockedDates]);

    // ==========================================================================
    // HELPER FUNCTIONS
    // ==========================================================================

    const isDateBlocked = useCallback((date: Date): boolean => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        return blockedDates.some(bd => {
            const bdStart = timestampToDate(bd.startDate);
            const bdEnd = timestampToDate(bd.endDate);
            // Check if the blocked range overlaps with this day
            return bdStart <= dayEnd && bdEnd >= dayStart;
        });
    }, [blockedDates]);

    const isHourBlocked = useCallback((date: Date, hour: number): boolean => {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(date);
        slotEnd.setHours(hour, 59, 59, 999);

        return blockedDates.some(bd => {
            if (bd.allDay) {
                // For allDay blocks, check if the day overlaps
                const bdStart = timestampToDate(bd.startDate);
                bdStart.setHours(0, 0, 0, 0);
                const bdEnd = timestampToDate(bd.endDate);
                bdEnd.setHours(23, 59, 59, 999);
                return bdStart <= slotEnd && bdEnd >= slotStart;
            }
            // For partial blocks, check the exact time range
            const bdStart = timestampToDate(bd.startDate);
            const bdEnd = timestampToDate(bd.endDate);
            return bdStart <= slotEnd && bdEnd >= slotStart;
        });
    }, [blockedDates]);

    const getBlockedDatesForRange = useCallback((start: Date, end: Date): BlockedDate[] => {
        return blockedDates.filter(bd => {
            const bdStart = timestampToDate(bd.startDate);
            const bdEnd = timestampToDate(bd.endDate);
            return bdStart <= end && bdEnd >= start;
        });
    }, [blockedDates]);

    const getBlockedDateForSlot = useCallback((date: Date, hour: number): BlockedDate | null => {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(date);
        slotEnd.setHours(hour, 59, 59, 999);

        return blockedDates.find(bd => {
            if (bd.allDay) {
                const bdStart = timestampToDate(bd.startDate);
                bdStart.setHours(0, 0, 0, 0);
                const bdEnd = timestampToDate(bd.endDate);
                bdEnd.setHours(23, 59, 59, 999);
                return bdStart <= slotEnd && bdEnd >= slotStart;
            }
            const bdStart = timestampToDate(bd.startDate);
            const bdEnd = timestampToDate(bd.endDate);
            return bdStart <= slotEnd && bdEnd >= slotStart;
        }) || null;
    }, [blockedDates]);

    // ==========================================================================
    // RETURN
    // ==========================================================================

    return {
        blockedDates,
        canonicalBlockedDates,
        legacyBlockedDates,
        hasLegacyBlockedDates: legacyBlockedDates.length > 0,
        isLoading,
        isMigratingLegacyBlockedDates,
        error,
        createBlockedDate,
        updateBlockedDate,
        deleteBlockedDate,
        migrateLegacyBlockedDates,
        isDateBlocked,
        isHourBlocked,
        getBlockedDatesForRange,
        getBlockedDateForSlot,
    };
};

export default useBlockedDates;
