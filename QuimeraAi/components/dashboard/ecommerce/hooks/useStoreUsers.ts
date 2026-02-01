/**
 * useStoreUsers Hook
 * Hook para gestión de usuarios de tienda en el dashboard
 * Incluye: CRUD, filtros, estadísticas, exportación
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    where,
    getDocs,
    addDoc,
    getDoc,
    limit,
    Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../../firebase';
import {
    StoreUser,
    StoreUserRole,
    StoreUserStatus,
    StoreUsersStats,
    StoreUsersFilterOptions,
    StoreUsersSortOptions,
    UserSegment,
    UserActivity,
    ExportOptions,
    ExportFormat,
} from '../../../../types/storeUsers';

interface UseStoreUsersOptions extends StoreUsersFilterOptions {
    sort?: StoreUsersSortOptions;
    limitCount?: number;
}

export const useStoreUsers = (storeId: string, options?: UseStoreUsersOptions) => {
    const [users, setUsers] = useState<StoreUser[]>([]);
    const [segments, setSegments] = useState<UserSegment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const usersPath = `storeUsers/${storeId}/users`;
    const segmentsPath = `storeUsers/${storeId}/segments`;
    const activitiesPath = `storeUsers/${storeId}/activities`;

    // Cloud Functions
    const updateRoleFn = httpsCallable(functions, 'storeUsers-updateRole');
    const updateStatusFn = httpsCallable(functions, 'storeUsers-updateStatus');
    const resetPasswordFn = httpsCallable(functions, 'storeUsers-resetPassword');
    const deleteUserFn = httpsCallable(functions, 'storeUsers-delete');

    // Fetch users with real-time updates
    useEffect(() => {
        if (!storeId) {
            setIsLoading(false);
            return;
        }

        const usersRef = collection(db, usersPath);
        const sortField = options?.sort?.field || 'createdAt';
        const sortDirection = options?.sort?.direction || 'desc';

        let q = query(usersRef, orderBy(sortField, sortDirection));

        if (options?.limitCount) {
            q = query(q, limit(options.limitCount));
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                let data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as StoreUser[];

                // Apply filters in memory
                data = applyFilters(data, options);

                setUsers(data);
                setIsLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching store users:', err);
                setError(err.message);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [storeId, usersPath, options?.sort?.field, options?.sort?.direction, options?.limitCount]);

    // Fetch segments
    useEffect(() => {
        if (!storeId) return;

        const segmentsRef = collection(db, segmentsPath);
        const q = query(segmentsRef, orderBy('name', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as UserSegment[];
            setSegments(data);
        });

        return () => unsubscribe();
    }, [storeId, segmentsPath]);

    // Apply filters helper
    const applyFilters = (data: StoreUser[], filters?: UseStoreUsersOptions): StoreUser[] => {
        if (!filters) return data;

        let filtered = [...data];

        // Search term
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(
                (u) =>
                    u.email.toLowerCase().includes(term) ||
                    u.displayName.toLowerCase().includes(term) ||
                    u.firstName?.toLowerCase().includes(term) ||
                    u.lastName?.toLowerCase().includes(term) ||
                    u.phone?.toLowerCase().includes(term)
            );
        }

        // Roles
        if (filters.roles && filters.roles.length > 0) {
            filtered = filtered.filter((u) => filters.roles!.includes(u.role));
        }

        // Statuses
        if (filters.statuses && filters.statuses.length > 0) {
            filtered = filtered.filter((u) => filters.statuses!.includes(u.status));
        }

        // Segments
        if (filters.segments && filters.segments.length > 0) {
            filtered = filtered.filter((u) =>
                filters.segments!.some((s) => u.segments?.includes(s))
            );
        }

        // Marketing
        if (filters.acceptsMarketing !== undefined) {
            filtered = filtered.filter((u) => u.acceptsMarketing === filters.acceptsMarketing);
        }

        // Spent range
        if (filters.minTotalSpent !== undefined) {
            filtered = filtered.filter((u) => u.totalSpent >= filters.minTotalSpent!);
        }
        if (filters.maxTotalSpent !== undefined) {
            filtered = filtered.filter((u) => u.totalSpent <= filters.maxTotalSpent!);
        }

        // Orders range
        if (filters.minTotalOrders !== undefined) {
            filtered = filtered.filter((u) => u.totalOrders >= filters.minTotalOrders!);
        }
        if (filters.maxTotalOrders !== undefined) {
            filtered = filtered.filter((u) => u.totalOrders <= filters.maxTotalOrders!);
        }

        // Date filters
        if (filters.createdAfter) {
            const afterTs = Timestamp.fromDate(filters.createdAfter);
            filtered = filtered.filter(
                (u) => u.createdAt && u.createdAt.seconds >= afterTs.seconds
            );
        }
        if (filters.createdBefore) {
            const beforeTs = Timestamp.fromDate(filters.createdBefore);
            filtered = filtered.filter(
                (u) => u.createdAt && u.createdAt.seconds <= beforeTs.seconds
            );
        }

        return filtered;
    };

    // Computed stats
    const stats = useMemo<StoreUsersStats>(() => {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const thisMonthStartTs = thisMonthStart.getTime() / 1000;
        const lastMonthStartTs = lastMonthStart.getTime() / 1000;
        const lastMonthEndTs = lastMonthEnd.getTime() / 1000;

        const usersByRole: Record<StoreUserRole, number> = {
            customer: 0,
            vip: 0,
            wholesale: 0,
        };

        let activeUsers = 0;
        let inactiveUsers = 0;
        let bannedUsers = 0;
        let newUsersThisMonth = 0;
        let newUsersLastMonth = 0;
        let totalOrders = 0;
        let totalSpent = 0;

        users.forEach((user) => {
            // By role
            usersByRole[user.role]++;

            // By status
            if (user.status === 'active') activeUsers++;
            else if (user.status === 'inactive') inactiveUsers++;
            else if (user.status === 'banned') bannedUsers++;

            // New users
            if (user.createdAt) {
                if (user.createdAt.seconds >= thisMonthStartTs) {
                    newUsersThisMonth++;
                } else if (
                    user.createdAt.seconds >= lastMonthStartTs &&
                    user.createdAt.seconds <= lastMonthEndTs
                ) {
                    newUsersLastMonth++;
                }
            }

            // Totals
            totalOrders += user.totalOrders || 0;
            totalSpent += user.totalSpent || 0;
        });

        // Top segments
        const segmentCounts: Record<string, number> = {};
        users.forEach((user) => {
            user.segments?.forEach((s) => {
                segmentCounts[s] = (segmentCounts[s] || 0) + 1;
            });
        });

        const topSegments = Object.entries(segmentCounts)
            .map(([segmentId, count]) => {
                const segment = segments.find((s) => s.id === segmentId);
                return {
                    segmentId,
                    segmentName: segment?.name || segmentId,
                    count,
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            totalUsers: users.length,
            activeUsers,
            inactiveUsers,
            bannedUsers,
            newUsersThisMonth,
            newUsersLastMonth,
            usersByRole,
            averageOrdersPerUser: users.length > 0 ? totalOrders / users.length : 0,
            averageSpentPerUser: users.length > 0 ? totalSpent / users.length : 0,
            topSegments,
        };
    }, [users, segments]);

    // Update user role
    const updateUserRole = useCallback(
        async (userId: string, role: StoreUserRole): Promise<void> => {
            try {
                await updateRoleFn({ storeId, userId, role });
            } catch (err: any) {
                console.error('Error updating user role:', err);
                throw new Error(err.message || 'Failed to update role');
            }
        },
        [storeId, updateRoleFn]
    );

    // Update user status
    const updateUserStatus = useCallback(
        async (userId: string, status: StoreUserStatus, reason?: string): Promise<void> => {
            try {
                await updateStatusFn({ storeId, userId, status, reason });
            } catch (err: any) {
                console.error('Error updating user status:', err);
                throw new Error(err.message || 'Failed to update status');
            }
        },
        [storeId, updateStatusFn]
    );

    // Reset user password
    const resetUserPassword = useCallback(
        async (userId: string): Promise<void> => {
            try {
                await resetPasswordFn({ storeId, userId });
            } catch (err: any) {
                console.error('Error resetting password:', err);
                throw new Error(err.message || 'Failed to reset password');
            }
        },
        [storeId, resetPasswordFn]
    );

    // Delete user
    const deleteUser = useCallback(
        async (userId: string): Promise<void> => {
            try {
                await deleteUserFn({ storeId, userId });
            } catch (err: any) {
                console.error('Error deleting user:', err);
                throw new Error(err.message || 'Failed to delete user');
            }
        },
        [storeId, deleteUserFn]
    );

    // Update user profile (direct Firestore update for non-sensitive fields)
    const updateUserProfile = useCallback(
        async (userId: string, updates: Partial<StoreUser>): Promise<void> => {
            const userRef = doc(db, usersPath, userId);
            await updateDoc(userRef, {
                ...updates,
                updatedAt: serverTimestamp(),
            });
        },
        [usersPath]
    );

    // Add/remove segments
    const updateUserSegments = useCallback(
        async (userId: string, segmentIds: string[]): Promise<void> => {
            const userRef = doc(db, usersPath, userId);
            await updateDoc(userRef, {
                segments: segmentIds,
                updatedAt: serverTimestamp(),
            });
        },
        [usersPath]
    );

    // Add/remove tags
    const updateUserTags = useCallback(
        async (userId: string, tags: string[]): Promise<void> => {
            const userRef = doc(db, usersPath, userId);
            await updateDoc(userRef, {
                tags,
                updatedAt: serverTimestamp(),
            });
        },
        [usersPath]
    );

    // Get user activities
    const getUserActivities = useCallback(
        async (userId: string, limitCount: number = 50): Promise<UserActivity[]> => {
            const activitiesRef = collection(db, activitiesPath);
            const q = query(
                activitiesRef,
                where('userId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as UserActivity[];
        },
        [activitiesPath]
    );

    // Segment management
    const createSegment = useCallback(
        async (segment: Omit<UserSegment, 'id' | 'userCount' | 'createdAt' | 'updatedAt'>): Promise<string> => {
            const segmentsRef = collection(db, segmentsPath);
            const docRef = await addDoc(segmentsRef, {
                ...segment,
                userCount: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return docRef.id;
        },
        [segmentsPath]
    );

    const updateSegment = useCallback(
        async (segmentId: string, updates: Partial<UserSegment>): Promise<void> => {
            const segmentRef = doc(db, segmentsPath, segmentId);
            await updateDoc(segmentRef, {
                ...updates,
                updatedAt: serverTimestamp(),
            });
        },
        [segmentsPath]
    );

    const deleteSegment = useCallback(
        async (segmentId: string): Promise<void> => {
            const segmentRef = doc(db, segmentsPath, segmentId);
            await deleteDoc(segmentRef);

            // Remove segment from all users
            const usersWithSegment = users.filter((u) => u.segments?.includes(segmentId));
            await Promise.all(
                usersWithSegment.map((user) =>
                    updateUserSegments(user.id, user.segments.filter((s) => s !== segmentId))
                )
            );
        },
        [segmentsPath, users, updateUserSegments]
    );

    // Export users
    const exportUsers = useCallback(
        async (exportOptions: ExportOptions): Promise<string> => {
            let dataToExport = users;

            // Apply filters if specified
            if (exportOptions.filters) {
                dataToExport = applyFilters(users, exportOptions.filters);
            }

            // Select fields
            const exportData = dataToExport.map((user) => {
                const row: Record<string, any> = {};
                exportOptions.fields.forEach((field) => {
                    row[field] = user[field];
                });
                return row;
            });

            if (exportOptions.format === 'json') {
                return JSON.stringify(exportData, null, 2);
            }

            if (exportOptions.format === 'csv') {
                const headers = exportOptions.fields.join(',');
                const rows = exportData.map((row) =>
                    exportOptions.fields
                        .map((field) => {
                            const value = row[field];
                            if (typeof value === 'string' && value.includes(',')) {
                                return `"${value}"`;
                            }
                            return value ?? '';
                        })
                        .join(',')
                );
                return [headers, ...rows].join('\n');
            }

            return '';
        },
        [users]
    );

    // Get user by ID
    const getUserById = useCallback(
        (userId: string): StoreUser | undefined => {
            return users.find((u) => u.id === userId);
        },
        [users]
    );

    // Get users by role
    const getUsersByRole = useCallback(
        (role: StoreUserRole): StoreUser[] => {
            return users.filter((u) => u.role === role);
        },
        [users]
    );

    // Get users by segment
    const getUsersBySegment = useCallback(
        (segmentId: string): StoreUser[] => {
            return users.filter((u) => u.segments?.includes(segmentId));
        },
        [users]
    );

    return {
        // Data
        users,
        segments,
        stats,
        isLoading,
        error,

        // User actions
        updateUserRole,
        updateUserStatus,
        resetUserPassword,
        deleteUser,
        updateUserProfile,
        updateUserSegments,
        updateUserTags,
        getUserActivities,

        // Segment actions
        createSegment,
        updateSegment,
        deleteSegment,

        // Helpers
        getUserById,
        getUsersByRole,
        getUsersBySegment,
        exportUsers,
    };
};

export default useStoreUsers;











