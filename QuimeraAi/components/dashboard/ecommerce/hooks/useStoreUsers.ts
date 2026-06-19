import { getTimestampSeconds, timestampToDate } from '../../../../utils/timestampUtils';
/**
 * useStoreUsers Hook
 * Hook para gestión de usuarios de tienda en el dashboard usando Supabase
 * Incluye: CRUD, filtros, estadísticas, exportación
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../../supabase';
import { createRealtimeChannelName } from './realtimeChannel';
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
} from '../../../../types/storeUsers';
import { mapStoreUserFromDB, mapStoreUserSegmentFromDB, mapStoreUserActivityFromDB, mapStoreUserToDB, mapStoreUserSegmentToDB } from '../../../../utils/ecommerceMappers';

interface UseStoreUsersOptions extends StoreUsersFilterOptions {
    sort?: StoreUsersSortOptions;
    limitCount?: number;
}

export const useStoreUsers = (storeId: string, options?: UseStoreUsersOptions) => {
    const [users, setUsers] = useState<StoreUser[]>([]);
    const [segments, setSegments] = useState<UserSegment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch users with real-time updates
    const fetchUsers = useCallback(async () => {
        if (!storeId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const sortField = options?.sort?.field || 'created_at';
        const sortDirection = options?.sort?.direction || 'desc';

        // Map frontend sort fields to DB columns
        const sortMap: Record<string, string> = {
            'displayName': 'display_name',
            'email': 'email',
            'createdAt': 'created_at',
            'lastLoginAt': 'last_login_at',
            'totalSpent': 'total_spent',
            'totalOrders': 'total_orders',
        };

        const dbSortField = sortMap[sortField] || 'created_at';

        let query = supabase
            .from('store_users')
            .select('*')
            .eq('project_id', storeId)
            .order(dbSortField, { ascending: sortDirection === 'asc' });

        if (options?.limitCount) {
            query = query.limit(options.limitCount);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
            console.error('Error fetching store users:', fetchError);
            setError(fetchError.message);
        } else {
            let mappedData = (data || []).map(mapStoreUserFromDB);
            mappedData = applyFilters(mappedData, options);
            setUsers(mappedData);
            setError(null);
        }
        setIsLoading(false);
    }, [storeId, options?.sort?.field, options?.sort?.direction, options?.limitCount, options]);

    useEffect(() => {
        if (!storeId) return;

        fetchUsers();

        const channel = supabase.channel(createRealtimeChannelName('store_users_changes', storeId))
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'store_users',
                    filter: `project_id=eq.${storeId}`
                },
                () => {
                    fetchUsers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [storeId, fetchUsers]);

    // Fetch segments
    const fetchSegments = useCallback(async () => {
        if (!storeId) return;

        const { data, error } = await supabase
            .from('store_user_segments')
            .select('*')
            .eq('project_id', storeId)
            .order('name', { ascending: true });

        if (!error && data) {
            setSegments(data.map(mapStoreUserSegmentFromDB));
        }
    }, [storeId]);

    useEffect(() => {
        if (!storeId) return;

        fetchSegments();

        const channel = supabase.channel(createRealtimeChannelName('store_user_segments_changes', storeId))
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'store_user_segments',
                    filter: `project_id=eq.${storeId}`
                },
                () => {
                    fetchSegments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [storeId, fetchSegments]);

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
            const afterTs = filters.createdAfter.getTime() / 1000;
            filtered = filtered.filter(
                (u) => u.createdAt && getTimestampSeconds(u.createdAt) >= afterTs
            );
        }
        if (filters.createdBefore) {
            const beforeTs = filters.createdBefore.getTime() / 1000;
            filtered = filtered.filter(
                (u) => u.createdAt && getTimestampSeconds(u.createdAt) <= beforeTs
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
            if (usersByRole[user.role] !== undefined) {
                usersByRole[user.role]++;
            }

            // By status
            if (user.status === 'active') activeUsers++;
            else if (user.status === 'inactive') inactiveUsers++;
            else if (user.status === 'banned') bannedUsers++;

            // New users
            if (user.createdAt) {
                if (getTimestampSeconds(user.createdAt) >= thisMonthStartTs) {
                    newUsersThisMonth++;
                } else if (
                    getTimestampSeconds(user.createdAt) >= lastMonthStartTs &&
                    getTimestampSeconds(user.createdAt) <= lastMonthEndTs
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

    const updateUserRole = useCallback(
        async (userId: string, role: StoreUserRole): Promise<void> => {
            try {
                // Realmente este proceso debería ir a través de un Edge Function si involucra roles
                // de Auth de Supabase (user.user_metadata), pero para el contexto de e-commerce
                // actualizamos directamente la base de datos de usuarios
                const { error } = await supabase
                    .from('store_users')
                    .update({ role })
                    .eq('id', userId)
                    .eq('project_id', storeId);

                if (error) throw error;
            } catch (err: any) {
                console.error('Error updating user role:', err);
                throw new Error(err.message || 'Failed to update role');
            }
        },
        [storeId]
    );

    const updateUserStatus = useCallback(
        async (userId: string, status: StoreUserStatus, reason?: string): Promise<void> => {
            try {
                const { error } = await supabase
                    .from('store_users')
                    .update({ 
                        status,
                        internal_notes: reason ? `Status changed to ${status}. Reason: ${reason}` : undefined
                    })
                    .eq('id', userId)
                    .eq('project_id', storeId);

                if (error) throw error;
            } catch (err: any) {
                console.error('Error updating user status:', err);
                throw new Error(err.message || 'Failed to update status');
            }
        },
        [storeId]
    );

    const resetUserPassword = useCallback(
        async (userId: string): Promise<void> => {
            try {
                const result = await supabase.functions.invoke('stripe-api', {
                    body: { action: 'storeUsers-resetPassword', storeId, userId }
                });
                if (result.error) throw result.error;
            } catch (err: any) {
                console.error('Error resetting password:', err);
                throw new Error(err.message || 'Failed to reset password');
            }
        },
        [storeId]
    );

    const deleteUser = useCallback(
        async (userId: string): Promise<void> => {
            try {
                // Needs to delete auth user probably, using Edge function, but for store user we just delete row
                const { error } = await supabase
                    .from('store_users')
                    .delete()
                    .eq('id', userId)
                    .eq('project_id', storeId);

                if (error) throw error;
            } catch (err: any) {
                console.error('Error deleting user:', err);
                throw new Error(err.message || 'Failed to delete user');
            }
        },
        [storeId]
    );

    // Update user profile
    const updateUserProfile = useCallback(
        async (userId: string, updates: Partial<StoreUser>): Promise<void> => {
            const dbData = mapStoreUserToDB(updates);
            const { error } = await supabase
                .from('store_users')
                .update(dbData)
                .eq('id', userId)
                .eq('project_id', storeId);

            if (error) {
                console.error('Error updating user profile:', error);
                throw new Error(error.message);
            }
        },
        [storeId]
    );

    // Add/remove segments
    const updateUserSegments = useCallback(
        async (userId: string, segmentIds: string[]): Promise<void> => {
            const { error } = await supabase
                .from('store_users')
                .update({ segments: segmentIds })
                .eq('id', userId)
                .eq('project_id', storeId);

            if (error) {
                console.error('Error updating user segments:', error);
                throw new Error(error.message);
            }
        },
        [storeId]
    );

    // Add/remove tags
    const updateUserTags = useCallback(
        async (userId: string, tags: string[]): Promise<void> => {
            const { error } = await supabase
                .from('store_users')
                .update({ tags })
                .eq('id', userId)
                .eq('project_id', storeId);

            if (error) {
                console.error('Error updating user tags:', error);
                throw new Error(error.message);
            }
        },
        [storeId]
    );

    // Get user activities
    const getUserActivities = useCallback(
        async (userId: string, limitCount: number = 50): Promise<UserActivity[]> => {
            const { data, error } = await supabase
                .from('store_user_activities')
                .select('*')
                .eq('user_id', userId)
                .eq('project_id', storeId)
                .order('created_at', { ascending: false })
                .limit(limitCount);

            if (error) {
                console.error('Error fetching activities:', error);
                return [];
            }

            return data.map(mapStoreUserActivityFromDB);
        },
        [storeId]
    );

    // Segment management
    const createSegment = useCallback(
        async (segment: Omit<UserSegment, 'id' | 'userCount' | 'createdAt' | 'updatedAt'>): Promise<string> => {
            const dbData = mapStoreUserSegmentToDB(segment);
            dbData.project_id = storeId;
            dbData.user_count = 0;

            const { data, error } = await supabase
                .from('store_user_segments')
                .insert(dbData)
                .select('id')
                .single();

            if (error) {
                console.error('Error creating segment:', error);
                throw new Error(error.message);
            }

            return data.id;
        },
        [storeId]
    );

    const updateSegment = useCallback(
        async (segmentId: string, updates: Partial<UserSegment>): Promise<void> => {
            const dbData = mapStoreUserSegmentToDB(updates);

            const { error } = await supabase
                .from('store_user_segments')
                .update(dbData)
                .eq('id', segmentId)
                .eq('project_id', storeId);

            if (error) {
                console.error('Error updating segment:', error);
                throw new Error(error.message);
            }
        },
        [storeId]
    );

    const deleteSegment = useCallback(
        async (segmentId: string): Promise<void> => {
            const { error } = await supabase
                .from('store_user_segments')
                .delete()
                .eq('id', segmentId)
                .eq('project_id', storeId);

            if (error) {
                console.error('Error deleting segment:', error);
                throw new Error(error.message);
            }

            // Note: In Supabase we should use triggers or Edge Functions for this, but for now we do client side
            const usersWithSegment = users.filter((u) => u.segments?.includes(segmentId));
            await Promise.all(
                usersWithSegment.map((user) =>
                    updateUserSegments(user.id, user.segments.filter((s) => s !== segmentId))
                )
            );
        },
        [storeId, users, updateUserSegments]
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










