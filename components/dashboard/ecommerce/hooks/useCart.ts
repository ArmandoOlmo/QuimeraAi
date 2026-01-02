/**
 * useCart Hook
 * Hook para gestión del carrito de compras
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { doc, setDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Cart, CartItem, Product, ProductVariant } from '../../../../types/ecommerce';

interface UseCartOptions {
    persistToFirebase?: boolean;
}

export const useCart = (userId: string, storeId?: string, options: UseCartOptions = {}) => {
    const { persistToFirebase = true } = options;
    
    const [cart, setCart] = useState<Cart>({
        id: '',
        userId,
        storeId,
        items: [],
        subtotal: 0,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cart path in Firestore
    const cartPath = storeId
        ? `users/${userId}/stores/${storeId}/carts/${userId}`
        : `users/${userId}/carts/${userId}`;

    // Load cart from Firestore
    useEffect(() => {
        if (!userId || !persistToFirebase) {
            setIsLoading(false);
            return;
        }

        const cartRef = doc(db, cartPath);
        
        const unsubscribe = onSnapshot(
            cartRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setCart(docSnap.data() as Cart);
                } else {
                    // Initialize empty cart
                    setCart({
                        id: userId,
                        userId,
                        storeId,
                        items: [],
                        subtotal: 0,
                        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
                        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
                    });
                }
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading cart:', err);
                setError(err.message);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, storeId, cartPath, persistToFirebase]);

    // Save cart to Firestore
    const saveCart = useCallback(async (updatedCart: Cart) => {
        if (!persistToFirebase) return;

        try {
            const cartRef = doc(db, cartPath);
            await setDoc(cartRef, {
                ...updatedCart,
                updatedAt: new Date(),
            });
        } catch (err: any) {
            console.error('Error saving cart:', err);
            setError(err.message);
        }
    }, [cartPath, persistToFirebase]);

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

        if (persistToFirebase) {
            try {
                const cartRef = doc(db, cartPath);
                await deleteDoc(cartRef);
            } catch (err: any) {
                console.error('Error clearing cart:', err);
            }
        }
    }, [userId, storeId, cart.createdAt, cartPath, persistToFirebase]);

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

    // Get item quantity
    const getItemQuantity = useCallback((productId: string, variantId?: string): number => {
        const item = cart.items.find(
            (item) => item.productId === productId && item.variantId === variantId
        );
        return item?.quantity || 0;
    }, [cart.items]);

    return {
        cart,
        items: cart.items,
        subtotal: cart.subtotal,
        total,
        itemCount,
        discountCode: cart.discountCode,
        discountAmount: cart.discountAmount,
        isLoading,
        error,
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














