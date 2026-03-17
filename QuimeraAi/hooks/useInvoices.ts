/**
 * useInvoices
 * Tenant-aware Firestore hook for invoice management.
 * Path resolution mirrors ProjectContext / useAccountingData.
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
    getDocs,
} from '../firebase';
import { useAuth } from '../contexts/core/AuthContext';
import { useSafeTenant } from '../contexts/tenant/TenantContext';
import { useProject } from '../contexts/project';
import type { Invoice, InvoiceStatus } from '../types/finance';

// ---------------------------------------------------------------------------
// Path resolution
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
// Auto-increment invoice number
// ---------------------------------------------------------------------------
const generateInvoiceNumber = async (colRef: any): Promise<string> => {
    try {
        const snap = await getDocs(query(colRef, orderBy('createdAt', 'desc')));
        const count = snap.size;
        return `INV-${String(count + 1).padStart(4, '0')}`;
    } catch {
        return `INV-${String(Date.now()).slice(-4)}`;
    }
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useInvoices() {
    const { user } = useAuth();
    const tenantContext = useSafeTenant();
    const { activeProjectId } = useProject();
    const tenantId = tenantContext?.currentTenant?.id ?? null;

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const basePath = useMemo(() => {
        if (!user?.uid || !activeProjectId) return null;
        return resolveBasePath(user.uid, activeProjectId, tenantId);
    }, [user?.uid, activeProjectId, tenantId]);

    // ---------------------------------------------------------------------------
    // Real-time subscription
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!basePath) {
            setInvoices([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const colRef = collection(db, `${basePath}/accounting_invoices`);
        const q = query(colRef, orderBy('issueDate', 'desc'));

        const unsub = onSnapshot(
            q,
            (snap) => {
                setInvoices(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice)));
                setIsLoading(false);
            },
            (err) => {
                console.warn('[useInvoices] listener error:', err);
                setError(err.message);
                setIsLoading(false);
            },
        );

        return unsub;
    }, [basePath]);

    // ---------------------------------------------------------------------------
    // CRUD operations
    // ---------------------------------------------------------------------------
    const createInvoice = useCallback(
        async (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>) => {
            if (!basePath) throw new Error('No active project');
            const colRef = collection(db, `${basePath}/accounting_invoices`);
            const invoiceNumber = await generateInvoiceNumber(colRef);
            const docRef = await addDoc(colRef, {
                ...data,
                invoiceNumber,
                createdAt: serverTimestamp(),
            });
            return docRef.id;
        },
        [basePath],
    );

    const updateInvoice = useCallback(
        async (id: string, data: Partial<Invoice>) => {
            if (!basePath) throw new Error('No active project');
            const docRef = doc(db, `${basePath}/accounting_invoices/${id}`);
            await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
        },
        [basePath],
    );

    const deleteInvoice = useCallback(
        async (id: string) => {
            if (!basePath) throw new Error('No active project');
            const docRef = doc(db, `${basePath}/accounting_invoices/${id}`);
            await deleteDoc(docRef);
        },
        [basePath],
    );

    // ---------------------------------------------------------------------------
    // Status transitions
    // ---------------------------------------------------------------------------
    const markAsSent = useCallback(
        async (id: string) => {
            await updateInvoice(id, { status: 'sent' as InvoiceStatus });
        },
        [updateInvoice],
    );

    const markAsPaid = useCallback(
        async (id: string) => {
            await updateInvoice(id, {
                status: 'paid' as InvoiceStatus,
                paidDate: new Date().toISOString().split('T')[0],
            });
        },
        [updateInvoice],
    );

    const markAsOverdue = useCallback(
        async (id: string) => {
            await updateInvoice(id, { status: 'overdue' as InvoiceStatus });
        },
        [updateInvoice],
    );

    const cancelInvoice = useCallback(
        async (id: string) => {
            await updateInvoice(id, { status: 'cancelled' as InvoiceStatus });
        },
        [updateInvoice],
    );

    // ---------------------------------------------------------------------------
    // Derived data
    // ---------------------------------------------------------------------------
    const overdueInvoices = useMemo(
        () => invoices.filter((inv) => inv.status === 'overdue'),
        [invoices],
    );

    const totalOutstanding = useMemo(
        () =>
            invoices
                .filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
                .reduce((sum, inv) => sum + inv.total, 0),
        [invoices],
    );

    const totalPaid = useMemo(
        () =>
            invoices
                .filter((inv) => inv.status === 'paid')
                .reduce((sum, inv) => sum + inv.total, 0),
        [invoices],
    );

    return {
        invoices,
        isLoading,
        error,
        // CRUD
        createInvoice,
        updateInvoice,
        deleteInvoice,
        // Status transitions
        markAsSent,
        markAsPaid,
        markAsOverdue,
        cancelInvoice,
        // Derived
        overdueInvoices,
        totalOutstanding,
        totalPaid,
    };
}
