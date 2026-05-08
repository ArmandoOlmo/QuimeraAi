/**
 * useAgencyNotifications
 * Real-time notifications for agency dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

// =============================================================================
// TYPES
// =============================================================================

export type NotificationType =
    | 'new_lead'
    | 'project_published'
    | 'ai_credits_low'
    | 'payment_received'
    | 'client_created'
    | 'client_invited'
    | 'invoice_due'
    | 'storage_warning'
    | 'system';

export interface AgencyNotification {
    id: string;
    tenantId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    read: boolean;
    createdAt: any;
    expiresAt?: any;
    link?: string;
    clientId?: string;
    clientName?: string;
}

// =============================================================================
// HOOK
// =============================================================================

export function useAgencyNotifications(tenantId: string | undefined) {
    const [notifications, setNotifications] = useState<AgencyNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to real-time notifications
    useEffect(() => {
        if (!tenantId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        let isMounted = true;

        const fetchNotifications = async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from('agency_notifications')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (!isMounted) return;

                if (fetchError) throw fetchError;

                const notifs: AgencyNotification[] = [];
                let unread = 0;
                const now = new Date();

                if (data) {
                    data.forEach((doc: any) => {
                        const notif: AgencyNotification = {
                            id: doc.id,
                            tenantId: doc.tenant_id,
                            type: doc.type,
                            title: doc.title,
                            message: doc.message,
                            data: doc.data,
                            read: doc.read,
                            createdAt: doc.created_at,
                            expiresAt: doc.expires_at,
                            link: doc.link,
                            clientId: doc.client_id,
                            clientName: doc.client_name,
                        };

                        // Filter out expired notifications
                        if (notif.expiresAt && new Date(notif.expiresAt) < now) {
                            return;
                        }

                        notifs.push(notif);
                        if (!notif.read) unread++;
                    });
                }

                setNotifications(notifs);
                setUnreadCount(unread);
                setIsLoading(false);
            } catch (err) {
                if (!isMounted) return;
                console.error('Error subscribing to notifications:', err);
                setError('Error cargando notificaciones');
                setIsLoading(false);
            }
        };

        fetchNotifications();

        const channelId = `agency_notifications_${tenantId}_${Math.random().toString(36).substring(2, 9)}`;
        const subscription = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'agency_notifications', filter: `tenant_id=eq.${tenantId}` },
                () => {
                    if (isMounted) fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(subscription);
        };
    }, [tenantId]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            await supabase
                .from('agency_notifications')
                .update({
                    read: true,
                    read_at: new Date().toISOString(),
                })
                .eq('id', notificationId);
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        if (!tenantId) return;

        try {
            const unreadNotifs = notifications.filter((n) => !n.read);
            if (unreadNotifs.length === 0) return;

            const ids = unreadNotifs.map(n => n.id);
            
            // Note: Supabase supports update with 'in' filter for multiple rows
            await supabase
                .from('agency_notifications')
                .update({
                    read: true,
                    read_at: new Date().toISOString(),
                })
                .in('id', ids);
                
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    }, [tenantId, notifications]);

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
    };
}

// =============================================================================
// NOTIFICATION HELPERS
// =============================================================================

/**
 * Create a new notification
 */
export async function createAgencyNotification(
    notification: Omit<AgencyNotification, 'id' | 'createdAt' | 'read'>
): Promise<string | null> {
    try {
        // Map camelCase to snake_case for Supabase
        const dbPayload = {
            tenant_id: notification.tenantId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            read: false,
            created_at: new Date().toISOString(),
            expires_at: notification.expiresAt ? new Date(notification.expiresAt).toISOString() : null,
            link: notification.link,
            client_id: notification.clientId,
            client_name: notification.clientName,
        };

        const { data, error } = await supabase
            .from('agency_notifications')
            .insert(dbPayload)
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    } catch (err) {
        console.error('Error creating notification:', err);
        return null;
    }
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
        new_lead: '👤',
        project_published: '🚀',
        ai_credits_low: '⚡',
        payment_received: '💰',
        client_created: '🏢',
        client_invited: '✉️',
        invoice_due: '📄',
        storage_warning: '💾',
        system: 'ℹ️',
    };
    return icons[type] || '🔔';
}

/**
 * Get notification color based on type
 */
export function getNotificationColor(type: NotificationType): string {
    const colors: Record<NotificationType, string> = {
        new_lead: 'text-blue-500',
        project_published: 'text-green-500',
        ai_credits_low: 'text-yellow-500',
        payment_received: 'text-emerald-500',
        client_created: 'text-purple-500',
        client_invited: 'text-indigo-500',
        invoice_due: 'text-orange-500',
        storage_warning: 'text-red-500',
        system: 'text-gray-500',
    };
    return colors[type] || 'text-gray-500';
}

export default useAgencyNotifications;
