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

export const useCart = (userId: string, storeId?: string, options: UseCartOptions = {}) => {
    const { persistToSupabase = true } = options;
    
    const effectiveStoreId = storeId || '';

    const [cart, setCart] = useState<Cart>({
        id: userId,
        userId,
        storeId,
        items: [],
        subtotal: 0,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
    });
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
                query = query.eq('project_id', effectiveStoreId);
            }

            const { data, error } = await query.maybeSingle();

            if (error) {
                console.error('Error loading cart:', error);
                setError(error.message);
            } else if (data) {
                setCart({
                    id: data.id,
                    userId: data.user_id,
                    storeId: data.project_id,
                    items: data.items as CartItem[],
                    subtotal: Number(data.subtotal),
                    discountCode: data.discount_code,
                    discountAmount: Number(data.discount_amount),
                    createdAt: { seconds: new Date(data.created_at).getTime() / 1000, nanoseconds: 0 } as any,
                    updatedAt: { seconds: new Date(data.updated_at).getTime() / 1000, nanoseconds: 0 } as any,
                });
            } else {
                // Initialize empty cart state
                setCart({
                    id: userId,
                    userId,
                    storeId: effectiveStoreId,
                    items: [],
                    subtotal: 0,
                    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
                    updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
                });
            }
            setIsLoading(false);
        };

        fetchCart();

        // Real-time listener for cart changes
        const channelFilter = effectiveStoreId 
            ? `project_id=eq.${effectiveStoreId}` 
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
                    setCart({
                        id: data.id,
                        userId: data.user_id,
                        storeId: data.project_id,
                        items: data.items as CartItem[],
                        subtotal: Number(data.subtotal),
                        discountCode: data.discount_code,
                        discountAmount: Number(data.discount_amount),
                        createdAt: { seconds: new Date(data.created_at).getTime() / 1000, nanoseconds: 0 } as any,
                        updatedAt: { seconds: new Date(data.updated_at).getTime() / 1000, nanoseconds: 0 } as any,
                    });
                } else if (payload.eventType === 'DELETE') {
                    setCart({
                        id: userId,
                        userId,
                        storeId: effectiveStoreId,
                        items: [],
                        subtotal: 0,
                        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
                        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, effectiveStoreId, persistToSupabase]);

    // Save cart to Supabase
    const saveCart = useCallback(async (updatedCart: Cart) => {
        if (!persistToSupabase) return;

        try {
            const upsertData = {
                user_id: updatedCart.userId,
                project_id: updatedCart.storeId || null,
                items: updatedCart.items,
                subtotal: updatedCart.subtotal,
                discount_code: updatedCart.discountCode || null,
                discount_amount: updatedCart.discountAmount || 0,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('store_carts')
                .upsert(upsertData, { onConflict: 'user_id,project_id' }); // Require an index/unique constraint later

            if (error) throw error;
        } catch (err: any) {
            console.error('Error saving cart:', err);
            setError(err.message);
        }
    }, [persistToSupabase]);

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
            };

            saveCart(updatedCart);
            return updatedCart;
        });
    }, [calculateSubtotal, removeItem, saveCart]);

    // Clear cart
    const clearCart = useCallback(async () => {
        const emptyCart: Cart = {
            id: userId,
            userId,
            storeId,
            items: [],
            subtotal: 0,
            createdAt: cart.createdAt,
            updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        };

        setCart(emptyCart);

        if (persistToSupabase) {
            try {
                let query = supabase.from('store_carts').delete().eq('user_id', userId);
                if (effectiveStoreId) {
                    query = query.eq('project_id', effectiveStoreId);
                }
                await query;
            } catch (err: any) {
                console.error('Error clearing cart:', err);
            }
        }
    }, [userId, storeId, effectiveStoreId, cart.createdAt, persistToSupabase]);

    // Apply discount code
    const applyDiscount = useCallback(async (discountCode: string, discountAmount: number) => {
        setCart((prevCart) => {
            const updatedCart = {
                ...prevCart,
                discountCode,
                discountAmount,
            };

            saveCart(updatedCart);
            return updatedCart;
        });
    }, [saveCart]);

    // Remove discount
    const removeDiscount = useCallback(async () => {
        setCart((prevCart) => {
            const { discountCode, discountAmount, ...rest } = prevCart;
            const updatedCart = rest as Cart;

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
