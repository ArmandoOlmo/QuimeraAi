/**
 * useAgencyNotifications
 * Real-time notifications for agency dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

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
    createdAt: Timestamp;
    expiresAt?: Timestamp;
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

        const q = query(
            collection(db, 'agencyNotifications'),
            where('tenantId', '==', tenantId),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const notifs: AgencyNotification[] = [];
                let unread = 0;

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const notif: AgencyNotification = {
                        id: doc.id,
                        tenantId: data.tenantId,
                        type: data.type,
                        title: data.title,
                        message: data.message,
                        data: data.data,
                        read: data.read,
                        createdAt: data.createdAt,
                        expiresAt: data.expiresAt,
                        link: data.link,
                        clientId: data.clientId,
                        clientName: data.clientName,
                    };

                    // Filter out expired notifications
                    if (notif.expiresAt && notif.expiresAt.toDate() < new Date()) {
                        return;
                    }

                    notifs.push(notif);
                    if (!notif.read) unread++;
                });

                setNotifications(notifs);
                setUnreadCount(unread);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error subscribing to notifications:', err);
                setError('Error cargando notificaciones');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [tenantId]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            await updateDoc(doc(db, 'agencyNotifications', notificationId), {
                read: true,
                readAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        if (!tenantId) return;

        try {
            const unreadNotifs = notifications.filter((n) => !n.read);
            await Promise.all(
                unreadNotifs.map((n) =>
                    updateDoc(doc(db, 'agencyNotifications', n.id), {
                        read: true,
                        readAt: serverTimestamp(),
                    })
                )
            );
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
        const docRef = await addDoc(collection(db, 'agencyNotifications'), {
            ...notification,
            read: false,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
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
