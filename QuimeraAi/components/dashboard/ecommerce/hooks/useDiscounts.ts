/**
 * useDiscounts Hook
 * Hook para gestión de descuentos en Firestore
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    where,
    getDocs,
    increment,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Discount, DiscountType } from '../../../../types/ecommerce';

interface UseDiscountsOptions {
    activeOnly?: boolean;
}

export const useDiscounts = (userId: string, storeId?: string, options?: UseDiscountsOptions) => {
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const effectiveStoreId = storeId || '';
    const discountsPath = `users/${userId}/stores/${effectiveStoreId}/discounts`;

    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        const discountsRef = collection(db, discountsPath);
        let q = query(discountsRef, orderBy('createdAt', 'desc'));

        if (options?.activeOnly) {
            q = query(discountsRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Discount[];
                setDiscounts(data);
                setIsLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching discounts:', err);
                setError(err.message);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, effectiveStoreId, options?.activeOnly, discountsPath]);

    // Generate unique code
    const generateCode = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    // Add discount
    const addDiscount = useCallback(
        async (discountData: {
            code?: string;
            type: DiscountType;
            value: number;
            minimumPurchase?: number;
            maxUses?: number;
            startsAt: Date;
            endsAt?: Date;
        }): Promise<string> => {
            const discountsRef = collection(db, discountsPath);
            
            const code = discountData.code?.toUpperCase() || generateCode();

            // Check if code already exists
            const existingQuery = query(discountsRef, where('code', '==', code));
            const existingSnapshot = await getDocs(existingQuery);
            if (!existingSnapshot.empty) {
                throw new Error('El código de descuento ya existe');
            }

            const docRef = await addDoc(discountsRef, {
                code,
                type: discountData.type,
                value: discountData.value,
                minimumPurchase: discountData.minimumPurchase || 0,
                maxUses: discountData.maxUses,
                usedCount: 0,
                startsAt: Timestamp.fromDate(discountData.startsAt),
                endsAt: discountData.endsAt ? Timestamp.fromDate(discountData.endsAt) : null,
                isActive: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [discountsPath]
    );

    // Update discount
    const updateDiscount = useCallback(
        async (discountId: string, updates: Partial<Omit<Discount, 'id' | 'createdAt' | 'usedCount'>>) => {
            const discountRef = doc(db, discountsPath, discountId);
            
            const updateData: any = {
                ...updates,
                updatedAt: serverTimestamp(),
            };

            if (updates.code) {
                updateData.code = updates.code.toUpperCase();
            }

            if (updates.startsAt && updates.startsAt instanceof Date) {
                updateData.startsAt = Timestamp.fromDate(updates.startsAt as unknown as Date);
            }

            if (updates.endsAt && updates.endsAt instanceof Date) {
                updateData.endsAt = Timestamp.fromDate(updates.endsAt as unknown as Date);
            }

            await updateDoc(discountRef, updateData);
        },
        [discountsPath]
    );

    // Delete discount
    const deleteDiscount = useCallback(
        async (discountId: string) => {
            const discountRef = doc(db, discountsPath, discountId);
            await deleteDoc(discountRef);
        },
        [discountsPath]
    );

    // Toggle discount active status
    const toggleDiscountStatus = useCallback(
        async (discountId: string) => {
            const discount = discounts.find((d) => d.id === discountId);
            if (!discount) return;

            const discountRef = doc(db, discountsPath, discountId);
            await updateDoc(discountRef, {
                isActive: !discount.isActive,
                updatedAt: serverTimestamp(),
            });
        },
        [discountsPath, discounts]
    );

    // Validate discount code
    const validateDiscount = useCallback(
        (code: string, cartTotal: number): { valid: boolean; discount?: Discount; error?: string } => {
            const discount = discounts.find((d) => d.code === code.toUpperCase());

            if (!discount) {
                return { valid: false, error: 'Código de descuento no válido' };
            }

            if (!discount.isActive) {
                return { valid: false, error: 'Este código de descuento no está activo' };
            }

            const now = Date.now() / 1000;
            if (discount.startsAt.seconds > now) {
                return { valid: false, error: 'Este código de descuento aún no está disponible' };
            }

            if (discount.endsAt && discount.endsAt.seconds < now) {
                return { valid: false, error: 'Este código de descuento ha expirado' };
            }

            if (discount.maxUses && discount.usedCount >= discount.maxUses) {
                return { valid: false, error: 'Este código de descuento ha alcanzado su límite de uso' };
            }

            if (discount.minimumPurchase && cartTotal < discount.minimumPurchase) {
                return {
                    valid: false,
                    error: `El pedido mínimo para este código es $${discount.minimumPurchase}`,
                };
            }

            return { valid: true, discount };
        },
        [discounts]
    );

    // Calculate discount amount
    const calculateDiscountAmount = useCallback(
        (discount: Discount, subtotal: number, shippingCost: number): number => {
            switch (discount.type) {
                case 'percentage':
                    return (subtotal * discount.value) / 100;
                case 'fixed_amount':
                    return Math.min(discount.value, subtotal);
                case 'free_shipping':
                    return shippingCost;
                default:
                    return 0;
            }
        },
        []
    );

    // Increment usage count
    const incrementUsage = useCallback(
        async (discountId: string) => {
            const discountRef = doc(db, discountsPath, discountId);
            await updateDoc(discountRef, {
                usedCount: increment(1),
                updatedAt: serverTimestamp(),
            });
        },
        [discountsPath]
    );

    // Get discount by ID
    const getDiscountById = useCallback(
        (discountId: string): Discount | undefined => {
            return discounts.find((d) => d.id === discountId);
        },
        [discounts]
    );

    // Get discount by code
    const getDiscountByCode = useCallback(
        (code: string): Discount | undefined => {
            return discounts.find((d) => d.code === code.toUpperCase());
        },
        [discounts]
    );

    // Get active discounts
    const getActiveDiscounts = useCallback((): Discount[] => {
        const now = Date.now() / 1000;
        return discounts.filter((d) => {
            if (!d.isActive) return false;
            if (d.startsAt.seconds > now) return false;
            if (d.endsAt && d.endsAt.seconds < now) return false;
            if (d.maxUses && d.usedCount >= d.maxUses) return false;
            return true;
        });
    }, [discounts]);

    // Get expired discounts
    const getExpiredDiscounts = useCallback((): Discount[] => {
        const now = Date.now() / 1000;
        return discounts.filter((d) => d.endsAt && d.endsAt.seconds < now);
    }, [discounts]);

    return {
        discounts,
        isLoading,
        error,
        addDiscount,
        updateDiscount,
        deleteDiscount,
        toggleDiscountStatus,
        validateDiscount,
        calculateDiscountAmount,
        incrementUsage,
        getDiscountById,
        getDiscountByCode,
        getActiveDiscounts,
        getExpiredDiscounts,
        generateCode,
    };
};

