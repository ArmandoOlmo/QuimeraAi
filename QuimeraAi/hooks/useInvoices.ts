/**
 * useInvoices
 * Tenant-aware Supabase hook for invoice management.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { useProject } from '../contexts/project';
import type { Invoice, InvoiceStatus } from '../types/finance';

// ---------------------------------------------------------------------------
// Auto-increment invoice number
// ---------------------------------------------------------------------------
const generateInvoiceNumber = async (projectId: string): Promise<string> => {
    try {
        const { count, error } = await supabase
            .from('accounting_invoices')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId);

        if (error) throw error;
        
        return `INV-${String((count || 0) + 1).padStart(4, '0')}`;
    } catch {
        return `INV-${String(Date.now()).slice(-4)}`;
    }
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useInvoices() {
    const { activeProjectId } = useProject();

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ---------------------------------------------------------------------------
    // Fetch and Subscription
    // ---------------------------------------------------------------------------
    const fetchInvoices = useCallback(async () => {
        if (!activeProjectId) {
            setInvoices([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from('accounting_invoices')
                .select('*')
                .eq('project_id', activeProjectId)
                .order('issue_date', { ascending: false });

            if (error) throw error;

            setInvoices(data.map((d: any) => ({
                id: d.id,
                invoiceNumber: d.invoice_number,
                status: d.status as InvoiceStatus,
                issueDate: d.issue_date,
                dueDate: d.due_date,
                paidDate: d.paid_date,
                customerName: d.customer_name,
                customerEmail: d.customer_email,
                customerAddress: d.customer_address,
                items: d.items,
                subtotal: d.subtotal,
                taxTotal: d.tax_total,
                discountTotal: d.discount_total,
                total: d.total,
                notes: d.notes,
                createdAt: d.created_at,
                updatedAt: d.updated_at
            })));
        } catch (err: any) {
            console.error('[useInvoices] fetch error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [activeProjectId]);

    useEffect(() => {
        fetchInvoices();

        if (!activeProjectId) return;

        const channel = supabase.channel(`public:accounting_invoices:project_id=eq.${activeProjectId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'accounting_invoices',
                    filter: `project_id=eq.${activeProjectId}`,
                },
                () => {
                    fetchInvoices();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeProjectId, fetchInvoices]);

    // ---------------------------------------------------------------------------
    // CRUD operations
    // ---------------------------------------------------------------------------
    const createInvoice = useCallback(
        async (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>) => {
            if (!activeProjectId) throw new Error('No active project');
            
            const invoiceNumber = await generateInvoiceNumber(activeProjectId);
            
            const { data: doc, error } = await supabase
                .from('accounting_invoices')
                .insert({
                    project_id: activeProjectId,
                    invoice_number: invoiceNumber,
                    status: data.status,
                    issue_date: data.issueDate,
                    due_date: data.dueDate,
                    paid_date: data.paidDate,
                    customer_name: data.customerName,
                    customer_email: data.customerEmail,
                    customer_address: data.customerAddress,
                    items: data.items,
                    subtotal: data.subtotal,
                    tax_total: data.taxTotal,
                    discount_total: data.discountTotal,
                    total: data.total,
                    notes: data.notes
                })
                .select('id')
                .single();

            if (error) throw error;
            return doc.id;
        },
        [activeProjectId],
    );

    const updateInvoice = useCallback(
        async (id: string, data: Partial<Invoice>) => {
            if (!activeProjectId) throw new Error('No active project');
            
            const updatePayload: any = { updated_at: new Date().toISOString() };
            if (data.status !== undefined) updatePayload.status = data.status;
            if (data.issueDate !== undefined) updatePayload.issue_date = data.issueDate;
            if (data.dueDate !== undefined) updatePayload.due_date = data.dueDate;
            if (data.paidDate !== undefined) updatePayload.paid_date = data.paidDate;
            if (data.customerName !== undefined) updatePayload.customer_name = data.customerName;
            if (data.customerEmail !== undefined) updatePayload.customer_email = data.customerEmail;
            if (data.customerAddress !== undefined) updatePayload.customer_address = data.customerAddress;
            if (data.items !== undefined) updatePayload.items = data.items;
            if (data.subtotal !== undefined) updatePayload.subtotal = data.subtotal;
            if (data.taxTotal !== undefined) updatePayload.tax_total = data.taxTotal;
            if (data.discountTotal !== undefined) updatePayload.discount_total = data.discountTotal;
            if (data.total !== undefined) updatePayload.total = data.total;
            if (data.notes !== undefined) updatePayload.notes = data.notes;

            const { error } = await supabase
                .from('accounting_invoices')
                .update(updatePayload)
                .eq('id', id);
                
            if (error) throw error;
        },
        [activeProjectId],
    );

    const deleteInvoice = useCallback(
        async (id: string) => {
            if (!activeProjectId) throw new Error('No active project');
            
            const { error } = await supabase
                .from('accounting_invoices')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
        },
        [activeProjectId],
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
