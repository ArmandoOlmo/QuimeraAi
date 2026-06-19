/**
 * useCart Hook
 * Hook para gestión del carrito de compras usando Supabase
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../../../../supabase';
import { Cart, CartItem, Product, ProductVariant } from '../../../../types/ecommerce';

interface UseCartOptions {
    persistToSupabase?: boolean; // legacy prop, mapped to Supabase
}

type CartRow = Record<string, any>;

const isUuid = (value?: string): boolean =>
    Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

const createCartId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const toTimestamp = (value?: string) => ({
    seconds: value ? new Date(value).getTime() / 1000 : Date.now() / 1000,
    nanoseconds: 0,
}) as any;

export const useCart = (userId: string, storeId?: string, options: UseCartOptions = {}) => {
    const { persistToSupabase = true } = options;
    
    const effectiveStoreId = storeId || '';
    const projectIdForLegacy = isUuid(effectiveStoreId) ? effectiveStoreId : null;

    const buildEmptyCart = useCallback((id: string = createCartId()): Cart => ({
        id,
        userId,
        storeId: effectiveStoreId,
        items: [],
        currency: 'USD',
        status: 'active',
        subtotal: 0,
        discountAmount: 0,
        shippingAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        createdAt: toTimestamp(),
        updatedAt: toTimestamp(),
    }), [userId, effectiveStoreId]);

    const mapCartRow = useCallback((data: CartRow): Cart => ({
        id: data.id,
        userId: data.user_id,
        storeId: data.store_id || data.project_id || effectiveStoreId,
        sessionToken: data.session_token,
        items: (data.items || []) as CartItem[],
        currency: data.currency || 'USD',
        status: data.status || 'active',
        subtotal: Number(data.subtotal || 0),
        discountCode: data.discount_code,
        discountAmount: Number(data.discount_amount || 0),
        shippingAmount: Number(data.shipping_amount || 0),
        taxAmount: Number(data.tax_amount || 0),
        totalAmount: Number(data.total_amount ?? data.subtotal ?? 0),
        cartHash: data.cart_hash,
        data: data.data || {},
        createdAt: toTimestamp(data.created_at),
        updatedAt: toTimestamp(data.updated_at),
        expiresAt: data.expires_at ? toTimestamp(data.expires_at) : undefined,
    }), [effectiveStoreId]);

    const [cart, setCart] = useState<Cart>(() => buildEmptyCart());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load cart from Supabase
    useEffect(() => {
        if (!userId || !persistToSupabase) {
            setIsLoading(false);
            return;
        }

        const fetchCart = async () => {
            setIsLoading(true);
            let query = supabase.from('store_carts').select('*').eq('user_id', userId);
            
            if (effectiveStoreId) {
                const storeFilter = projectIdForLegacy
                    ? `store_id.eq.${effectiveStoreId},project_id.eq.${projectIdForLegacy}`
                    : `store_id.eq.${effectiveStoreId}`;
                query = query.or(storeFilter);
            }

            const { data, error } = await query
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('Error loading cart:', error);
                setError(error.message);
            } else if (data) {
                setCart(mapCartRow(data));
            } else {
                setCart(buildEmptyCart());
            }
            setIsLoading(false);
        };

        fetchCart();

        // Real-time listener for cart changes
        const channelFilter = effectiveStoreId
            ? `store_id=eq.${effectiveStoreId}`
            : `user_id=eq.${userId}`;

        const channel = supabase.channel(`store_carts_${userId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'store_carts', 
                filter: channelFilter 
            }, (payload) => {
                const data = payload.new as Record<string, any>;
                if (data && data.user_id === userId) {
                    setCart(mapCartRow(data));
                } else if (payload.eventType === 'DELETE') {
                    setCart(buildEmptyCart());
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, effectiveStoreId, projectIdForLegacy, persistToSupabase, mapCartRow, buildEmptyCart]);

    // Save cart to Supabase
    const saveCart = useCallback(async (updatedCart: Cart) => {
        if (!persistToSupabase) return;

        try {
            const totalAmount = Math.max(
                0,
                updatedCart.subtotal -
                (updatedCart.discountAmount || 0) +
                (updatedCart.shippingAmount || 0) +
                (updatedCart.taxAmount || 0)
            );
            const upsertData = {
                id: updatedCart.id || createCartId(),
                user_id: updatedCart.userId,
                store_id: updatedCart.storeId || effectiveStoreId || null,
                project_id: projectIdForLegacy,
                items: updatedCart.items,
                currency: updatedCart.currency || 'USD',
                status: updatedCart.status || 'active',
                subtotal: updatedCart.subtotal,
                discount_code: updatedCart.discountCode || null,
                discount_amount: updatedCart.discountAmount || 0,
                shipping_amount: updatedCart.shippingAmount || 0,
                tax_amount: updatedCart.taxAmount || 0,
                total_amount: totalAmount,
                cart_hash: updatedCart.cartHash || null,
                data: updatedCart.data || {},
                updated_at: new Date().toISOString()
            };

            if (updatedCart.id) {
                const { data: updatedRows, error: updateByIdError } = await supabase
                    .from('store_carts')
                    .update(upsertData)
                    .eq('id', updatedCart.id)
                    .select('id')
                    .limit(1);

                if (updateByIdError) throw updateByIdError;
                if (updatedRows && updatedRows.length > 0) return;
            }

            let existingQuery = supabase
                .from('store_carts')
                .select('id')
                .eq('user_id', updatedCart.userId);

            if (effectiveStoreId) {
                const storeFilter = projectIdForLegacy
                    ? `store_id.eq.${effectiveStoreId},project_id.eq.${projectIdForLegacy}`
                    : `store_id.eq.${effectiveStoreId}`;
                existingQuery = existingQuery.or(storeFilter);
            }

            const { data: existingRows, error: lookupError } = await existingQuery
                .order('updated_at', { ascending: false })
                .limit(1);

            if (lookupError) throw lookupError;

            const existingId = existingRows?.[0]?.id;
            if (existingId) {
                const { error: updateError } = await supabase
                    .from('store_carts')
                    .update({ ...upsertData, id: existingId })
                    .eq('id', existingId);

                if (updateError) throw updateError;
                return;
            }

            const { error } = await supabase
                .from('store_carts')
                .insert(upsertData);

            if (error) throw error;
        } catch (err: any) {
            console.error('Error saving cart:', err);
            setError(err.message);
        }
    }, [persistToSupabase, effectiveStoreId, projectIdForLegacy]);

    // Calculate subtotal
    const calculateSubtotal = useCallback((items: CartItem[]): number => {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, []);

    // Add item to cart
    const addItem = useCallback(async (
        product: Product,
        quantity: number = 1,
        variant?: ProductVariant
    ) => {
        setCart((prevCart) => {
            const existingItemIndex = prevCart.items.findIndex(
                (item) => item.productId === product.id && item.variantId === variant?.id
            );

            let newItems: CartItem[];

            if (existingItemIndex >= 0) {
                // Update quantity of existing item
                newItems = [...prevCart.items];
                newItems[existingItemIndex] = {
                    ...newItems[existingItemIndex],
                    quantity: newItems[existingItemIndex].quantity + quantity,
                };
            } else {
                // Add new item
                const newItem: CartItem = {
                    productId: product.id,
                    productName: product.name,
                    variantId: variant?.id,
                    variantName: variant?.name,
                    price: variant?.price || product.price,
                    quantity,
                    image: product.images?.[0]?.url,
                };
                newItems = [...prevCart.items, newItem];
            }

            const newSubtotal = calculateSubtotal(newItems);
            const updatedCart = {
                ...prevCart,
                items: newItems,
                subtotal: newSubtotal,
                totalAmount: Math.max(0, newSubtotal - (prevCart.discountAmount || 0)),
            };

            saveCart(updatedCart);
            return updatedCart;
        });
    }, [calculateSubtotal, saveCart]);

    // Remove item from cart
    const removeItem = useCallback(async (productId: string, variantId?: string) => {
        setCart((prevCart) => {
            const newItems = prevCart.items.filter(
                (item) => !(item.productId === productId && item.variantId === variantId)
            );

            const newSubtotal = calculateSubtotal(newItems);
            const updatedCart = {
                ...prevCart,
                items: newItems,
                subtotal: newSubtotal,
                totalAmount: Math.max(0, newSubtotal - (prevCart.discountAmount || 0)),
            };

            saveCart(updatedCart);
            return updatedCart;
        });
    }, [calculateSubtotal, saveCart]);

    // Update item quantity
    const updateQuantity = useCallback(async (
        productId: string,
        quantity: number,
        variantId?: string
    ) => {
        if (quantity <= 0) {
            return removeItem(productId, variantId);
        }

        setCart((prevCart) => {
            const newItems = prevCart.items.map((item) => {
                if (item.productId === productId && item.variantId === variantId) {
                    return { ...item, quantity };
                }
                return item;
            });

            const newSubtotal = calculateSubtotal(newItems);
            const updatedCart = {
                ...prevCart,
                items: newItems,
                subtotal: newSubtotal,
                totalAmount: Math.max(0, newSubtotal - (prevCart.discountAmount || 0)),
            };

            saveCart(updatedCart);
            return updatedCart;
        });
    }, [calculateSubtotal, removeItem, saveCart]);

    // Clear cart
    const clearCart = useCallback(async () => {
        const emptyCart: Cart = {
            ...buildEmptyCart(cart.id),
            createdAt: cart.createdAt,
        };

        setCart(emptyCart);

        if (persistToSupabase) {
            try {
                let query = supabase.from('store_carts').delete().eq('user_id', userId);
                if (effectiveStoreId) {
                    const storeFilter = projectIdForLegacy
                        ? `store_id.eq.${effectiveStoreId},project_id.eq.${projectIdForLegacy}`
                        : `store_id.eq.${effectiveStoreId}`;
                    query = query.or(storeFilter);
                }
                await query;
            } catch (err: any) {
                console.error('Error clearing cart:', err);
            }
        }
    }, [userId, effectiveStoreId, projectIdForLegacy, cart.id, cart.createdAt, persistToSupabase, buildEmptyCart]);

    // Apply discount code
    const applyDiscount = useCallback(async (discountCode: string, discountAmount: number) => {
        setCart((prevCart) => {
            const updatedCart = {
                ...prevCart,
                discountCode,
                discountAmount,
                totalAmount: Math.max(0, prevCart.subtotal - discountAmount),
            };

            saveCart(updatedCart);
            return updatedCart;
        });
    }, [saveCart]);

    // Remove discount
    const removeDiscount = useCallback(async () => {
        setCart((prevCart) => {
            const { discountCode, discountAmount, ...rest } = prevCart;
            const updatedCart = {
                ...rest,
                totalAmount: rest.subtotal,
            } as Cart;

            saveCart(updatedCart);
            return updatedCart;
        });
    }, [saveCart]);

    // Get item count
    const itemCount = useMemo(() => {
        return cart.items.reduce((sum, item) => sum + item.quantity, 0);
    }, [cart.items]);

    // Get cart total (after discount)
    const total = useMemo(() => {
        const discountAmount = cart.discountAmount || 0;
        return Math.max(0, cart.subtotal - discountAmount);
    }, [cart.subtotal, cart.discountAmount]);

    // Check if product is in cart
    const isInCart = useCallback((productId: string, variantId?: string): boolean => {
        return cart.items.some(
            (item) => item.productId === productId && item.variantId === variantId
        );
    }, [cart.items]);

    // Get item quantity in cart
    const getItemQuantity = useCallback((productId: string, variantId?: string): number => {
        const item = cart.items.find(
            (item) => item.productId === productId && item.variantId === variantId
        );
        return item ? item.quantity : 0;
    }, [cart.items]);

    return {
        // State
        cart,
        isLoading,
        error,
        itemCount,
        total,

        // Actions
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        applyDiscount,
        removeDiscount,

        // Helpers
        isInCart,
        getItemQuantity,
    };
};
