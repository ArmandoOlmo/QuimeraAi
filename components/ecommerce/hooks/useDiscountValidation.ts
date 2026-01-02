/**
 * useDiscountValidation Hook
 * Hook para validar y aplicar cupones de descuento en el checkout
 */

import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { Discount, CartItem, DiscountType } from '../../../types/ecommerce';

// Types
export interface DiscountValidationResult {
    valid: boolean;
    discount?: Discount;
    discountAmount: number;
    message: string;
    eligibleItems?: CartItem[];
    freeItems?: CartItem[];
}

export interface CartContext {
    items: CartItem[];
    subtotal: number;
    customerId?: string;
    customerEmail?: string;
    isFirstPurchase?: boolean;
    customerTags?: string[];
}

export interface UseDiscountValidationReturn {
    isValidating: boolean;
    appliedDiscount: Discount | null;
    discountAmount: number;
    freeItems: CartItem[];
    error: string | null;
    validateDiscount: (code: string, cart: CartContext) => Promise<DiscountValidationResult>;
    applyDiscount: (discount: Discount, cart: CartContext) => DiscountValidationResult;
    removeDiscount: () => void;
}

export const useDiscountValidation = (storeId: string): UseDiscountValidationReturn => {
    const [isValidating, setIsValidating] = useState(false);
    const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [freeItems, setFreeItems] = useState<CartItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Check if discount is expired
    const isExpired = (discount: Discount): boolean => {
        const now = Math.floor(Date.now() / 1000);
        
        if (discount.startsAt && discount.startsAt.seconds > now) {
            return true; // Not started yet
        }
        
        if (discount.endsAt && discount.endsAt.seconds < now) {
            return true; // Already ended
        }
        
        return false;
    };

    // Check usage limits
    const checkUsageLimits = (discount: Discount, customerId?: string): boolean => {
        if (discount.maxUses && discount.usedCount >= discount.maxUses) {
            return false; // Max uses reached
        }
        
        // TODO: Check per-customer usage from Firestore if customerId provided
        // This would require querying the customer's discount usage history
        
        return true;
    };

    // Check customer eligibility
    const checkCustomerEligibility = (
        discount: Discount,
        cart: CartContext
    ): boolean => {
        switch (discount.customerEligibility) {
            case 'everyone':
                return true;
                
            case 'first_purchase':
                return cart.isFirstPurchase === true;
                
            case 'specific_customers':
                if (!cart.customerId || !discount.customerIds) return false;
                return discount.customerIds.includes(cart.customerId);
                
            case 'customer_groups':
                if (!cart.customerTags || !discount.customerTags) return false;
                return cart.customerTags.some(tag => discount.customerTags?.includes(tag));
                
            default:
                return true;
        }
    };

    // Get eligible items based on discount rules
    const getEligibleItems = (discount: Discount, items: CartItem[]): CartItem[] => {
        return items.filter(item => {
            // Check exclusions first
            if (discount.excludeProductIds?.includes(item.productId)) {
                return false;
            }
            
            // Check applies to
            switch (discount.appliesTo) {
                case 'all':
                    return true;
                    
                case 'specific_products':
                    return discount.productIds?.includes(item.productId);
                    
                case 'specific_categories':
                    // Would need category info on cart items
                    // For now, assume all items are eligible if no specific check
                    return true;
                    
                default:
                    return true;
            }
        });
    };

    // Calculate discount amount
    const calculateDiscountAmount = (
        discount: Discount,
        cart: CartContext,
        eligibleItems: CartItem[]
    ): { amount: number; freeItems: CartItem[] } => {
        const eligibleSubtotal = eligibleItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        let amount = 0;
        let resultFreeItems: CartItem[] = [];

        switch (discount.type) {
            case 'percentage':
                amount = (eligibleSubtotal * discount.value) / 100;
                break;

            case 'fixed_amount':
                amount = Math.min(discount.value, eligibleSubtotal);
                break;

            case 'free_shipping':
                // This is handled separately in checkout
                amount = 0;
                break;

            case 'buy_x_get_y':
                if (discount.buyXGetY) {
                    const { buyQuantity, getQuantity, getDiscountPercent, getProductIds } = discount.buyXGetY;
                    
                    // Count total eligible items
                    const totalQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
                    
                    // Calculate how many "sets" of buy X get Y
                    const sets = Math.floor(totalQuantity / (buyQuantity + getQuantity));
                    
                    if (sets > 0) {
                        // Find cheapest items for the "get" part
                        const sortedItems = [...eligibleItems].sort((a, b) => a.price - b.price);
                        let remainingFreeItems = sets * getQuantity;
                        
                        for (const item of sortedItems) {
                            if (remainingFreeItems <= 0) break;
                            
                            // Check if this item is eligible for "get"
                            if (getProductIds && !getProductIds.includes(item.productId)) {
                                continue;
                            }
                            
                            const freeQty = Math.min(item.quantity, remainingFreeItems);
                            amount += (item.price * freeQty * getDiscountPercent) / 100;
                            
                            if (freeQty > 0) {
                                resultFreeItems.push({
                                    ...item,
                                    quantity: freeQty,
                                });
                            }
                            
                            remainingFreeItems -= freeQty;
                        }
                    }
                }
                break;
        }

        return { amount: Math.round(amount * 100) / 100, freeItems: resultFreeItems };
    };

    // Validate discount
    const validateDiscount = useCallback(
        async (code: string, cart: CartContext): Promise<DiscountValidationResult> => {
            if (!code.trim()) {
                return {
                    valid: false,
                    discountAmount: 0,
                    message: 'Por favor ingresa un código de descuento',
                };
            }

            setIsValidating(true);
            setError(null);

            try {
                // Fetch discount from Firestore
                const discountsRef = collection(db, 'publicStores', storeId, 'discounts');
                const q = query(
                    discountsRef,
                    where('code', '==', code.toUpperCase().trim()),
                    where('isActive', '==', true)
                );

                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    const result: DiscountValidationResult = {
                        valid: false,
                        discountAmount: 0,
                        message: 'Código de descuento no válido',
                    };
                    setError(result.message);
                    setIsValidating(false);
                    return result;
                }

                const discountDoc = snapshot.docs[0];
                const discount = { ...discountDoc.data(), id: discountDoc.id } as Discount;

                // Validate discount
                const validationResult = applyDiscount(discount, cart);
                
                setIsValidating(false);
                return validationResult;
            } catch (err: any) {
                console.error('Error validating discount:', err);
                const result: DiscountValidationResult = {
                    valid: false,
                    discountAmount: 0,
                    message: 'Error al validar el código',
                };
                setError(result.message);
                setIsValidating(false);
                return result;
            }
        },
        [storeId]
    );

    // Apply discount (validation logic)
    const applyDiscount = useCallback(
        (discount: Discount, cart: CartContext): DiscountValidationResult => {
            // Check if active
            if (!discount.isActive) {
                return {
                    valid: false,
                    discountAmount: 0,
                    message: 'Este código ya no está activo',
                };
            }

            // Check expiration
            if (isExpired(discount)) {
                return {
                    valid: false,
                    discountAmount: 0,
                    message: 'Este código ha expirado',
                };
            }

            // Check usage limits
            if (!checkUsageLimits(discount, cart.customerId)) {
                return {
                    valid: false,
                    discountAmount: 0,
                    message: 'Este código ha alcanzado su límite de uso',
                };
            }

            // Check customer eligibility
            if (!checkCustomerEligibility(discount, cart)) {
                if (discount.customerEligibility === 'first_purchase') {
                    return {
                        valid: false,
                        discountAmount: 0,
                        message: 'Este código es solo para primera compra',
                    };
                }
                return {
                    valid: false,
                    discountAmount: 0,
                    message: 'No eres elegible para este descuento',
                };
            }

            // Check minimum purchase
            if (discount.minimumPurchase && cart.subtotal < discount.minimumPurchase) {
                return {
                    valid: false,
                    discountAmount: 0,
                    message: `El pedido mínimo es de $${discount.minimumPurchase.toFixed(2)}`,
                };
            }

            // Check minimum quantity
            const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
            if (discount.minimumQuantity && totalQuantity < discount.minimumQuantity) {
                return {
                    valid: false,
                    discountAmount: 0,
                    message: `Necesitas al menos ${discount.minimumQuantity} productos`,
                };
            }

            // Get eligible items
            const eligibleItems = getEligibleItems(discount, cart.items);

            if (eligibleItems.length === 0) {
                return {
                    valid: false,
                    discountAmount: 0,
                    message: 'Ningún producto en tu carrito es elegible para este descuento',
                };
            }

            // Calculate discount
            const { amount, freeItems: resultFreeItems } = calculateDiscountAmount(discount, cart, eligibleItems);

            // Update state
            setAppliedDiscount(discount);
            setDiscountAmount(amount);
            setFreeItems(resultFreeItems);
            setError(null);

            // Build success message
            let message = '';
            switch (discount.type) {
                case 'percentage':
                    message = `¡${discount.value}% de descuento aplicado!`;
                    break;
                case 'fixed_amount':
                    message = `¡$${discount.value} de descuento aplicado!`;
                    break;
                case 'free_shipping':
                    message = '¡Envío gratis aplicado!';
                    break;
                case 'buy_x_get_y':
                    message = `¡Compra ${discount.buyXGetY?.buyQuantity} lleva ${discount.buyXGetY?.getQuantity} con descuento!`;
                    break;
            }

            return {
                valid: true,
                discount,
                discountAmount: amount,
                message,
                eligibleItems,
                freeItems: resultFreeItems,
            };
        },
        []
    );

    // Remove discount
    const removeDiscount = useCallback(() => {
        setAppliedDiscount(null);
        setDiscountAmount(0);
        setFreeItems([]);
        setError(null);
    }, []);

    return {
        isValidating,
        appliedDiscount,
        discountAmount,
        freeItems,
        error,
        validateDiscount,
        applyDiscount,
        removeDiscount,
    };
};

export default useDiscountValidation;











