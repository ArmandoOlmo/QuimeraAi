import { getTimestampSeconds, timestampToDate } from '../../../../utils/timestampUtils';
/**
 * useDiscounts Hook
 * Hook para gestión de descuentos en Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabase';
import { Discount, DiscountType } from '../../../../types/ecommerce';
import { mapDiscountFromDB, mapDiscountToDB } from '../../../../utils/ecommerceMappers';
import { createRealtimeChannelName } from './realtimeChannelName';

interface UseDiscountsOptions {
    activeOnly?: boolean;
}

export const useDiscounts = (userId: string, storeId?: string, options?: UseDiscountsOptions) => {
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const effectiveStoreId = storeId || '';

    const fetchDiscounts = useCallback(async () => {
        if (!effectiveStoreId) return;

        setIsLoading(true);
        let query = supabase
            .from('store_discounts')
            .select('*')
            .eq('project_id', effectiveStoreId)
            .order('created_at', { ascending: false });

        if (options?.activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
            console.error('Error fetching discounts:', fetchError);
            setError(fetchError.message);
        } else {
            setDiscounts((data || []).map(mapDiscountFromDB));
            setError(null);
        }
        setIsLoading(false);
    }, [effectiveStoreId, options?.activeOnly]);

    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        fetchDiscounts();

        const channel = supabase.channel(createRealtimeChannelName('store_discounts_changes', effectiveStoreId))
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'store_discounts',
                    filter: `project_id=eq.${effectiveStoreId}`
                },
                () => {
                    fetchDiscounts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, effectiveStoreId, fetchDiscounts]);

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
            const code = discountData.code?.toUpperCase() || generateCode();

            // Check if code already exists
            const { data: existingData } = await supabase
                .from('store_discounts')
                .select('id')
                .eq('project_id', effectiveStoreId)
                .eq('code', code)
                .limit(1);

            if (existingData && existingData.length > 0) {
                throw new Error('El código de descuento ya existe');
            }

            const dbData = mapDiscountToDB({
                code,
                type: discountData.type,
                value: discountData.value,
                minimumPurchase: discountData.minimumPurchase || 0,
                maxUses: discountData.maxUses,
                usedCount: 0,
                isActive: true,
            });

            dbData.project_id = effectiveStoreId;
            dbData.starts_at = discountData.startsAt.toISOString();
            if (discountData.endsAt) {
                dbData.ends_at = discountData.endsAt.toISOString();
            }

            const { data: insertedDoc, error } = await supabase
                .from('store_discounts')
                .insert(dbData)
                .select()
                .single();

            if (error) throw error;
            return insertedDoc.id;
        },
        [effectiveStoreId]
    );

    // Update discount
    const updateDiscount = useCallback(
        async (discountId: string, updates: Partial<Omit<Discount, 'id' | 'createdAt' | 'usedCount'>>) => {
            const updateData: any = mapDiscountToDB(updates);

            if (updates.code) {
                updateData.code = updates.code.toUpperCase();
            }

            if (updates.startsAt && updates.startsAt instanceof Date) {
                updateData.starts_at = (updates.startsAt as unknown as Date).toISOString();
            }

            if (updates.endsAt && updates.endsAt instanceof Date) {
                updateData.ends_at = (updates.endsAt as unknown as Date).toISOString();
            } else if (updates.endsAt === null) {
                updateData.ends_at = null;
            }

            const { error } = await supabase
                .from('store_discounts')
                .update(updateData)
                .eq('id', discountId);

            if (error) throw error;
        },
        []
    );

    // Delete discount
    const deleteDiscount = useCallback(
        async (discountId: string) => {
            const { error } = await supabase
                .from('store_discounts')
                .delete()
                .eq('id', discountId);

            if (error) throw error;
        },
        []
    );

    // Toggle discount active status
    const toggleDiscountStatus = useCallback(
        async (discountId: string) => {
            const discount = discounts.find((d) => d.id === discountId);
            if (!discount) return;

            const { error } = await supabase
                .from('store_discounts')
                .update({ is_active: !discount.isActive })
                .eq('id', discountId);

            if (error) throw error;
        },
        [discounts]
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
            if (getTimestampSeconds(discount.startsAt) > now) {
                return { valid: false, error: 'Este código de descuento aún no está disponible' };
            }

            if (discount.endsAt && getTimestampSeconds(discount.endsAt) < now) {
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
            const discount = discounts.find(d => d.id === discountId);
            if (!discount) return;

            const { error } = await supabase
                .from('store_discounts')
                .update({ used_count: discount.usedCount + 1 })
                .eq('id', discountId);

            if (error) throw error;
        },
        [discounts]
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
            if (getTimestampSeconds(d.startsAt) > now) return false;
            if (d.endsAt && getTimestampSeconds(d.endsAt) < now) return false;
            if (d.maxUses && d.usedCount >= d.maxUses) return false;
            return true;
        });
    }, [discounts]);

    // Get expired discounts
    const getExpiredDiscounts = useCallback((): Discount[] => {
        const now = Date.now() / 1000;
        return discounts.filter((d) => d.endsAt && getTimestampSeconds(d.endsAt) < now);
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
