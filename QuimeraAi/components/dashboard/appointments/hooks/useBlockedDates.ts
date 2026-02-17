/**
 * useBlockedDates Hook
 * Hook para gestionar fechas/horas bloqueadas en el calendario de citas
 * Las fechas bloqueadas están sincronizadas por proyecto (projectId)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BlockedDate } from '../../../../types';
import { useProject } from '../../../../contexts/project';
import { useAuth } from '../../../../contexts/core/AuthContext';
import {
    db,
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
} from '../../../../firebase';
import { dateToTimestamp, timestampToDate } from '../utils/appointmentHelpers';

// =============================================================================
// TYPES
// =============================================================================

interface UseBlockedDatesReturn {
    blockedDates: BlockedDate[];
    isLoading: boolean;
    error: string | null;

    // CRUD
    createBlockedDate: (data: Omit<BlockedDate, 'id' | 'createdAt' | 'createdBy' | 'projectId'>) => Promise<BlockedDate>;
    updateBlockedDate: (id: string, data: Partial<BlockedDate>) => Promise<void>;
    deleteBlockedDate: (id: string) => Promise<void>;

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
    const { user } = useAuth();
    const { activeProjectId } = useProject();

    const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ==========================================================================
    // FIREBASE LISTENER
    // ==========================================================================

    useEffect(() => {
        if (!user || !activeProjectId) {
            setBlockedDates([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const blockedRef = collection(
            db, 'users', user.uid, 'projects', activeProjectId, 'blockedDates'
        );
        const q = query(blockedRef, orderBy('startDate', 'asc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data: BlockedDate[] = [];
                snapshot.forEach((doc) => {
                    data.push({
                        id: doc.id,
                        ...doc.data(),
                        projectId: activeProjectId,
                    } as BlockedDate);
                });
                setBlockedDates(data);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error fetching blocked dates:', err);
                setError('Error al cargar las fechas bloqueadas');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user, activeProjectId]);

    // ==========================================================================
    // CRUD OPERATIONS
    // ==========================================================================

    const createBlockedDate = useCallback(async (
        data: Omit<BlockedDate, 'id' | 'createdAt' | 'createdBy' | 'projectId'>
    ): Promise<BlockedDate> => {
        if (!user) throw new Error('Usuario no autenticado');
        if (!activeProjectId) throw new Error('No hay proyecto seleccionado');

        const now = dateToTimestamp(new Date());

        const newBlockedDate: Record<string, any> = {
            title: data.title,
            startDate: data.startDate,
            endDate: data.endDate,
            allDay: data.allDay,
            createdAt: now,
            createdBy: user.uid,
            projectId: activeProjectId,
        };

        if (data.reason) newBlockedDate.reason = data.reason;
        if (data.color) newBlockedDate.color = data.color;
        if (data.recurring) newBlockedDate.recurring = data.recurring;

        const blockedRef = collection(
            db, 'users', user.uid, 'projects', activeProjectId, 'blockedDates'
        );
        const docRef = await addDoc(blockedRef, newBlockedDate);

        return {
            id: docRef.id,
            ...newBlockedDate,
        } as BlockedDate;
    }, [user, activeProjectId]);

    const updateBlockedDate = useCallback(async (id: string, data: Partial<BlockedDate>): Promise<void> => {
        if (!user) throw new Error('Usuario no autenticado');
        if (!activeProjectId) throw new Error('No hay proyecto seleccionado');

        const docRef = doc(
            db, 'users', user.uid, 'projects', activeProjectId, 'blockedDates', id
        );
        await updateDoc(docRef, { ...data });
    }, [user, activeProjectId]);

    const deleteBlockedDate = useCallback(async (id: string): Promise<void> => {
        if (!user) throw new Error('Usuario no autenticado');
        if (!activeProjectId) throw new Error('No hay proyecto seleccionado');

        const docRef = doc(
            db, 'users', user.uid, 'projects', activeProjectId, 'blockedDates', id
        );
        await deleteDoc(docRef);
    }, [user, activeProjectId]);

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
        isLoading,
        error,
        createBlockedDate,
        updateBlockedDate,
        deleteBlockedDate,
        isDateBlocked,
        isHourBlocked,
        getBlockedDatesForRange,
        getBlockedDateForSlot,
    };
};

export default useBlockedDates;
