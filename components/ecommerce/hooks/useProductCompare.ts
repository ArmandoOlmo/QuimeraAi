/**
 * useProductCompare Hook
 * Hook para comparar productos
 */

import { useState, useCallback, useMemo } from 'react';
import { PublicProduct } from './usePublicProduct';

const STORAGE_KEY = 'quimera_compare_products';
const MAX_PRODUCTS = 4;

export interface UseProductCompareReturn {
    products: PublicProduct[];
    count: number;
    maxProducts: number;
    canAdd: boolean;
    isComparing: (productId: string) => boolean;
    addProduct: (product: PublicProduct) => void;
    removeProduct: (productId: string) => void;
    toggleProduct: (product: PublicProduct) => void;
    clearAll: () => void;
}

export const useProductCompare = (storeId: string): UseProductCompareReturn => {
    const [products, setProducts] = useState<PublicProduct[]>(() => {
        try {
            const stored = localStorage.getItem(`${STORAGE_KEY}_${storeId}`);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // Save to localStorage
    const saveProducts = useCallback(
        (newProducts: PublicProduct[]) => {
            setProducts(newProducts);
            try {
                localStorage.setItem(`${STORAGE_KEY}_${storeId}`, JSON.stringify(newProducts));
            } catch {
                // Ignore storage errors
            }
        },
        [storeId]
    );

    const isComparing = useCallback(
        (productId: string) => {
            return products.some((p) => p.id === productId);
        },
        [products]
    );

    const addProduct = useCallback(
        (product: PublicProduct) => {
            if (products.length >= MAX_PRODUCTS) return;
            if (isComparing(product.id)) return;

            saveProducts([...products, product]);
        },
        [products, isComparing, saveProducts]
    );

    const removeProduct = useCallback(
        (productId: string) => {
            saveProducts(products.filter((p) => p.id !== productId));
        },
        [products, saveProducts]
    );

    const toggleProduct = useCallback(
        (product: PublicProduct) => {
            if (isComparing(product.id)) {
                removeProduct(product.id);
            } else {
                addProduct(product);
            }
        },
        [isComparing, addProduct, removeProduct]
    );

    const clearAll = useCallback(() => {
        saveProducts([]);
    }, [saveProducts]);

    return {
        products,
        count: products.length,
        maxProducts: MAX_PRODUCTS,
        canAdd: products.length < MAX_PRODUCTS,
        isComparing,
        addProduct,
        removeProduct,
        toggleProduct,
        clearAll,
    };
};

export default useProductCompare;











