/**
 * useStockNotification Hook
 * Hook para gestionar notificaciones de vuelta a stock
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../firebase';

// Types
export interface StockNotificationRequest {
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    productImage?: string;
    email: string;
    notified: boolean;
    createdAt: { seconds: number; nanoseconds: number };
}

export interface UseStockNotificationReturn {
    subscriptions: StockNotificationRequest[];
    isLoading: boolean;
    error: string | null;
    isSubscribed: (productId: string) => boolean;
    subscribe: (
        productId: string,
        productName: string,
        productSlug: string,
        email: string,
        productImage?: string
    ) => Promise<{ success: boolean; error?: string }>;
    unsubscribe: (productId: string) => Promise<void>;
}

const STORAGE_KEY = 'quimera_stock_notifications';

export const useStockNotification = (storeId: string): UseStockNotificationReturn => {
    const [subscriptions, setSubscriptions] = useState<StockNotificationRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get email from local storage or session
    const getStoredEmail = useCallback(() => {
        try {
            const stored = localStorage.getItem(`${STORAGE_KEY}_email`);
            return stored || '';
        } catch {
            return '';
        }
    }, []);

    const saveStoredEmail = useCallback((email: string) => {
        try {
            localStorage.setItem(`${STORAGE_KEY}_email`, email);
        } catch {
            // Ignore
        }
    }, []);

    // Load subscriptions
    useEffect(() => {
        if (!storeId) {
            setIsLoading(false);
            return;
        }

        const email = getStoredEmail();
        if (!email) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const notificationsRef = collection(db, 'publicStores', storeId, 'stockNotifications');
        const q = query(notificationsRef, where('email', '==', email.toLowerCase()));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    ...doc.data(),
                    id: doc.id,
                })) as StockNotificationRequest[];
                setSubscriptions(data);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading stock notifications:', err);
                setError(err.message);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [storeId, getStoredEmail]);

    // Check if subscribed
    const isSubscribed = useCallback(
        (productId: string) => {
            return subscriptions.some((s) => s.productId === productId);
        },
        [subscriptions]
    );

    // Subscribe to stock notification
    const subscribe = useCallback(
        async (
            productId: string,
            productName: string,
            productSlug: string,
            email: string,
            productImage?: string
        ): Promise<{ success: boolean; error?: string }> => {
            if (!storeId || !email) {
                return { success: false, error: 'Store ID y email son requeridos' };
            }

            const normalizedEmail = email.toLowerCase().trim();

            // Validate email
            if (!normalizedEmail.includes('@')) {
                return { success: false, error: 'Email inválido' };
            }

            // Check if already subscribed
            if (subscriptions.some((s) => s.productId === productId && s.email === normalizedEmail)) {
                return { success: false, error: 'Ya estás suscrito a este producto' };
            }

            try {
                const notificationId = `${productId}_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`;
                const notificationRef = doc(
                    db,
                    'publicStores',
                    storeId,
                    'stockNotifications',
                    notificationId
                );

                await setDoc(notificationRef, {
                    productId,
                    productName,
                    productSlug,
                    productImage: productImage || null,
                    email: normalizedEmail,
                    notified: false,
                    createdAt: serverTimestamp(),
                });

                // Save email for future use
                saveStoredEmail(normalizedEmail);

                return { success: true };
            } catch (err: any) {
                console.error('Error subscribing to stock notification:', err);
                return { success: false, error: err.message || 'Error al suscribirse' };
            }
        },
        [storeId, subscriptions, saveStoredEmail]
    );

    // Unsubscribe
    const unsubscribe = useCallback(
        async (productId: string) => {
            const email = getStoredEmail();
            if (!storeId || !email) return;

            const notificationId = `${productId}_${email.replace(/[^a-z0-9]/g, '_')}`;
            const notificationRef = doc(
                db,
                'publicStores',
                storeId,
                'stockNotifications',
                notificationId
            );

            try {
                await deleteDoc(notificationRef);
            } catch (err) {
                console.error('Error unsubscribing:', err);
            }
        },
        [storeId, getStoredEmail]
    );

    return {
        subscriptions,
        isLoading,
        error,
        isSubscribed,
        subscribe,
        unsubscribe,
    };
};

export default useStockNotification;











