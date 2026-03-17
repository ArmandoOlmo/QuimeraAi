/**
 * useAccountingData
 * Tenant-aware Firestore hook for accounting transactions, vendors and products/services.
 * Follows the same multi-tenant path resolution as ProjectContext:
 *   - Personal tenant (tenant_{uid}) → users/{uid}/projects/{pid}/accounting_*
 *   - Team tenant                    → tenants/{tenantId}/projects/{pid}/accounting_*
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    db,
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
} from '../firebase';
import { useAuth } from '../contexts/core/AuthContext';
import { useSafeTenant } from '../contexts/tenant/TenantContext';
import { useProject } from '../contexts/project';
import type { Transaction, Vendor, ProductService } from '../types/finance';

// ---------------------------------------------------------------------------
// Path resolution (mirrors ProjectContext.getProjectsCollectionPath)
// ---------------------------------------------------------------------------
const resolveBasePath = (
    userId: string,
    projectId: string,
    tenantId: string | null | undefined,
): string => {
    const isPersonalTenant = tenantId && tenantId.startsWith(`tenant_${userId}`);
    if (tenantId && !isPersonalTenant) {
        return `tenants/${tenantId}/projects/${projectId}`;
    }
    return `users/${userId}/projects/${projectId}`;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAccountingData() {
    const { user } = useAuth();
    const tenantContext = useSafeTenant();
    const { activeProjectId } = useProject();
    const tenantId = tenantContext?.currentTenant?.id ?? null;

    // State
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [productsServices, setProductsServices] = useState<ProductService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Base path segments
    const basePath = useMemo(() => {
        if (!user?.uid || !activeProjectId) return null;
        return resolveBasePath(user.uid, activeProjectId, tenantId);
    }, [user?.uid, activeProjectId, tenantId]);

    // ---------------------------------------------------------------------------
    // Real-time subscriptions
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!basePath) {
            setTransactions([]);
            setVendors([]);
            setProductsServices([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const unsubscribers: (() => void)[] = [];

        // Transactions
        try {
            const txCol = collection(db, `${basePath}/accounting_transactions`);
            const txQuery = query(txCol, orderBy('date', 'desc'));
            const unsubTx = onSnapshot(
                txQuery,
                (snap) => {
                    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
                    setTransactions(items);
                    setIsLoading(false);
                },
                (err) => {
                    console.warn('[useAccountingData] transactions listener error:', err);
                    setError(err.message);
                    setIsLoading(false);
                },
            );
            unsubscribers.push(unsubTx);
        } catch (e: any) {
            console.warn('[useAccountingData] could not subscribe to transactions:', e);
        }

        // Vendors
        try {
            const vendorCol = collection(db, `${basePath}/accounting_vendors`);
            const vendorQuery = query(vendorCol, orderBy('name', 'asc'));
            const unsubV = onSnapshot(
                vendorQuery,
                (snap) => {
                    setVendors(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor)));
                },
                (err) => console.warn('[useAccountingData] vendors listener error:', err),
            );
            unsubscribers.push(unsubV);
        } catch (e: any) {
            console.warn('[useAccountingData] could not subscribe to vendors:', e);
        }

        // Products & Services
        try {
            const psCol = collection(db, `${basePath}/accounting_products_services`);
            const psQuery = query(psCol, orderBy('name', 'asc'));
            const unsubPS = onSnapshot(
                psQuery,
                (snap) => {
                    setProductsServices(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductService)));
                },
                (err) => console.warn('[useAccountingData] products_services listener error:', err),
            );
            unsubscribers.push(unsubPS);
        } catch (e: any) {
            console.warn('[useAccountingData] could not subscribe to products_services:', e);
        }

        return () => unsubscribers.forEach((fn) => fn());
    }, [basePath]);

    // ---------------------------------------------------------------------------
    // CRUD — Transactions
    // ---------------------------------------------------------------------------
    const addTransaction = useCallback(
        async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
            if (!basePath) throw new Error('No active project');
            const colRef = collection(db, `${basePath}/accounting_transactions`);
            const docRef = await addDoc(colRef, { ...data, createdAt: serverTimestamp() });
            return docRef.id;
        },
        [basePath],
    );

    const updateTransaction = useCallback(
        async (id: string, data: Partial<Transaction>) => {
            if (!basePath) throw new Error('No active project');
            const docRef = doc(db, `${basePath}/accounting_transactions/${id}`);
            await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
        },
        [basePath],
    );

    const deleteTransaction = useCallback(
        async (id: string) => {
            if (!basePath) throw new Error('No active project');
            const docRef = doc(db, `${basePath}/accounting_transactions/${id}`);
            await deleteDoc(docRef);
        },
        [basePath],
    );

    // ---------------------------------------------------------------------------
    // CRUD — Vendors
    // ---------------------------------------------------------------------------
    const addVendor = useCallback(
        async (data: Omit<Vendor, 'id' | 'createdAt' | 'totalSpent'>) => {
            if (!basePath) throw new Error('No active project');
            const colRef = collection(db, `${basePath}/accounting_vendors`);
            const docRef = await addDoc(colRef, { ...data, totalSpent: 0, createdAt: serverTimestamp() });
            return docRef.id;
        },
        [basePath],
    );

    const updateVendor = useCallback(
        async (id: string, data: Partial<Vendor>) => {
            if (!basePath) throw new Error('No active project');
            const docRef = doc(db, `${basePath}/accounting_vendors/${id}`);
            await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
        },
        [basePath],
    );

    const deleteVendor = useCallback(
        async (id: string) => {
            if (!basePath) throw new Error('No active project');
            const docRef = doc(db, `${basePath}/accounting_vendors/${id}`);
            await deleteDoc(docRef);
        },
        [basePath],
    );

    // ---------------------------------------------------------------------------
    // CRUD — Products & Services
    // ---------------------------------------------------------------------------
    const addProductService = useCallback(
        async (data: Omit<ProductService, 'id' | 'createdAt'>) => {
            if (!basePath) throw new Error('No active project');
            const colRef = collection(db, `${basePath}/accounting_products_services`);
            const docRef = await addDoc(colRef, { ...data, createdAt: serverTimestamp() });
            return docRef.id;
        },
        [basePath],
    );

    const updateProductService = useCallback(
        async (id: string, data: Partial<ProductService>) => {
            if (!basePath) throw new Error('No active project');
            const docRef = doc(db, `${basePath}/accounting_products_services/${id}`);
            await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
        },
        [basePath],
    );

    const deleteProductService = useCallback(
        async (id: string) => {
            if (!basePath) throw new Error('No active project');
            const docRef = doc(db, `${basePath}/accounting_products_services/${id}`);
            await deleteDoc(docRef);
        },
        [basePath],
    );

    return {
        // Data
        transactions,
        vendors,
        productsServices,
        isLoading,
        error,
        // Transaction ops
        addTransaction,
        updateTransaction,
        deleteTransaction,
        // Vendor ops
        addVendor,
        updateVendor,
        deleteVendor,
        // Product/Service ops
        addProductService,
        updateProductService,
        deleteProductService,
    };
}
