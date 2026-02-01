/**
 * StorefrontCartContext
 * Context para manejar el carrito en el storefront publico
 * Usa localStorage para persistencia sin necesidad de autenticacion
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { CartItem, Product, ProductVariant } from '../../../types/ecommerce';
import { PublicProduct, PublicProductVariant } from '../hooks/usePublicProduct';

interface CartContextValue {
    // State
    items: CartItem[];
    subtotal: number;
    itemCount: number;
    discountCode: string | null;
    discountAmount: number;
    isCartOpen: boolean;
    
    // Actions
    addItem: (product: PublicProduct, quantity?: number, variant?: PublicProductVariant) => void;
    removeItem: (productId: string, variantId?: string) => void;
    updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
    clearCart: () => void;
    applyDiscount: (code: string) => Promise<{ valid: boolean; amount?: number; error?: string }>;
    removeDiscount: () => void;
    openCart: () => void;
    closeCart: () => void;
    toggleCart: () => void;
    
    // Helpers
    isInCart: (productId: string, variantId?: string) => boolean;
    getItemQuantity: (productId: string, variantId?: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

interface StorefrontCartProviderProps {
    storeId: string;
    children: React.ReactNode;
}

export const StorefrontCartProvider: React.FC<StorefrontCartProviderProps> = ({
    storeId,
    children,
}) => {
    const storageKey = `cart_${storeId}`;
    
    const [items, setItems] = useState<CartItem[]>([]);
    const [discountCode, setDiscountCode] = useState<string | null>(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load cart from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                setItems(parsed.items || []);
                setDiscountCode(parsed.discountCode || null);
                setDiscountAmount(parsed.discountAmount || 0);
            }
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
        }
        setIsInitialized(true);
    }, [storageKey]);

    // Save cart to localStorage on changes
    useEffect(() => {
        if (!isInitialized) return;
        
        try {
            localStorage.setItem(storageKey, JSON.stringify({
                items,
                discountCode,
                discountAmount,
            }));
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
        }
    }, [items, discountCode, discountAmount, storageKey, isInitialized]);

    // Calculate subtotal
    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [items]);

    // Calculate item count
    const itemCount = useMemo(() => {
        return items.reduce((sum, item) => sum + item.quantity, 0);
    }, [items]);

    // Add item to cart
    const addItem = useCallback((
        product: PublicProduct,
        quantity: number = 1,
        variant?: PublicProductVariant
    ) => {
        setItems((prevItems) => {
            const existingIndex = prevItems.findIndex(
                (item) => item.productId === product.id && item.variantId === variant?.id
            );

            if (existingIndex >= 0) {
                // Update existing item
                const newItems = [...prevItems];
                newItems[existingIndex] = {
                    ...newItems[existingIndex],
                    quantity: newItems[existingIndex].quantity + quantity,
                };
                return newItems;
            }

            // Add new item
            const imageUrl = product.images?.[0]?.url;
            const newItem: CartItem = {
                productId: product.id,
                variantId: variant?.id,
                productName: product.name,
                name: product.name,
                variantName: variant?.name,
                price: variant?.price || product.price,
                quantity,
                image: imageUrl,
                imageUrl: imageUrl,
            };

            return [...prevItems, newItem];
        });

        // Open cart drawer when item is added
        setIsCartOpen(true);
    }, []);

    // Remove item from cart
    const removeItem = useCallback((productId: string, variantId?: string) => {
        setItems((prevItems) =>
            prevItems.filter((item) => {
                // Normalize variantId: treat undefined, null, and empty string as equivalent
                const itemVariantId = item.variantId || undefined;
                const targetVariantId = variantId || undefined;
                const shouldRemove = item.productId === productId && itemVariantId === targetVariantId;
                return !shouldRemove;
            })
        );
    }, []);

    // Update item quantity
    const updateQuantity = useCallback((productId: string, quantity: number, variantId?: string) => {
        if (quantity <= 0) {
            removeItem(productId, variantId);
            return;
        }

        setItems((prevItems) =>
            prevItems.map((item) => {
                // Normalize variantId comparison
                const itemVariantId = item.variantId || undefined;
                const targetVariantId = variantId || undefined;
                if (item.productId === productId && itemVariantId === targetVariantId) {
                    return { ...item, quantity };
                }
                return item;
            })
        );
    }, [removeItem]);

    // Clear cart
    const clearCart = useCallback(() => {
        setItems([]);
        setDiscountCode(null);
        setDiscountAmount(0);
    }, []);

    // Apply discount code
    const applyDiscount = useCallback(async (code: string): Promise<{ valid: boolean; amount?: number; error?: string }> => {
        const upperCode = code.toUpperCase();
        
        // Simple discount validation (in production, this should call a backend API)
        if (upperCode === 'WELCOME10') {
            const amount = subtotal * 0.1;
            setDiscountCode(upperCode);
            setDiscountAmount(amount);
            return { valid: true, amount };
        } else if (upperCode === 'SAVE20') {
            const amount = subtotal * 0.2;
            setDiscountCode(upperCode);
            setDiscountAmount(amount);
            return { valid: true, amount };
        } else if (upperCode === 'FREESHIP') {
            setDiscountCode(upperCode);
            setDiscountAmount(0);
            return { valid: true, amount: 0 };
        }

        return { valid: false, error: 'Codigo de descuento invalido' };
    }, [subtotal]);

    // Remove discount
    const removeDiscount = useCallback(() => {
        setDiscountCode(null);
        setDiscountAmount(0);
    }, []);

    // Cart drawer controls
    const openCart = useCallback(() => setIsCartOpen(true), []);
    const closeCart = useCallback(() => setIsCartOpen(false), []);
    const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

    // Check if product is in cart
    const isInCart = useCallback((productId: string, variantId?: string): boolean => {
        return items.some(
            (item) => item.productId === productId && item.variantId === variantId
        );
    }, [items]);

    // Get item quantity
    const getItemQuantity = useCallback((productId: string, variantId?: string): number => {
        const item = items.find(
            (i) => i.productId === productId && i.variantId === variantId
        );
        return item?.quantity || 0;
    }, [items]);

    const value: CartContextValue = {
        items,
        subtotal,
        itemCount,
        discountCode,
        discountAmount,
        isCartOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        applyDiscount,
        removeDiscount,
        openCart,
        closeCart,
        toggleCart,
        isInCart,
        getItemQuantity,
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};

export const useStorefrontCart = (): CartContextValue => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useStorefrontCart must be used within a StorefrontCartProvider');
    }
    return context;
};

// Safe version that returns default values when not in provider
const defaultCartValue: CartContextValue = {
    items: [],
    subtotal: 0,
    itemCount: 0,
    discountCode: null,
    discountAmount: 0,
    isCartOpen: false,
    addItem: () => {},
    removeItem: () => {},
    updateQuantity: () => {},
    clearCart: () => {},
    applyDiscount: async () => ({ valid: false, error: 'No cart provider' }),
    removeDiscount: () => {},
    openCart: () => {},
    closeCart: () => {},
    toggleCart: () => {},
    isInCart: () => false,
    getItemQuantity: () => 0,
};

export const useSafeStorefrontCart = (): CartContextValue => {
    const context = useContext(CartContext);
    return context || defaultCartValue;
};

export default CartContext;
