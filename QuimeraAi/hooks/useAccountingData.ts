/**
 * useAccountingData
 * Tenant-aware Supabase hook for accounting transactions, vendors and products/services.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { useProject } from '../contexts/project';
import type { Transaction, Vendor, ProductService } from '../types/finance';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAccountingData() {
    const { activeProjectId } = useProject();
    const realtimeInstanceId = useMemo(() => Math.random().toString(36).slice(2), []);

    // State
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [productsServices, setProductsServices] = useState<ProductService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ---------------------------------------------------------------------------
    // Fetch Data
    // ---------------------------------------------------------------------------
    const fetchData = useCallback(async () => {
        if (!activeProjectId) {
            setTransactions([]);
            setVendors([]);
            setProductsServices([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Fetch Transactions
            const txPromise = supabase
                .from('accounting_transactions')
                .select('*')
                .eq('project_id', activeProjectId)
                .order('date', { ascending: false });

            // Fetch Vendors
            const vendorsPromise = supabase
                .from('accounting_vendors')
                .select('*')
                .eq('project_id', activeProjectId)
                .order('name', { ascending: true });

            // Fetch Products/Services
            const psPromise = supabase
                .from('accounting_products_services')
                .select('*')
                .eq('project_id', activeProjectId)
                .order('name', { ascending: true });

            const [txRes, vendorsRes, psRes] = await Promise.all([txPromise, vendorsPromise, psPromise]);

            if (txRes.error) throw txRes.error;
            if (vendorsRes.error) throw vendorsRes.error;
            if (psRes.error) throw psRes.error;

            setTransactions(txRes.data.map((d: any) => ({
                id: d.id,
                type: d.type,
                category: d.category,
                amount: d.amount,
                date: d.date,
                description: d.description,
                vendorId: d.vendor_id,
                invoiceId: d.invoice_id,
                referenceNumber: d.reference_number,
                paymentMethod: d.payment_method,
                status: d.status,
                receiptUrl: d.receipt_url,
                createdAt: d.created_at,
                updatedAt: d.updated_at
            })));

            setVendors(vendorsRes.data.map((d: any) => ({
                id: d.id,
                name: d.name,
                email: d.email,
                phone: d.phone,
                address: d.address,
                taxId: d.tax_id,
                website: d.website,
                notes: d.notes,
                totalSpent: d.total_spent,
                createdAt: d.created_at,
                updatedAt: d.updated_at
            })));

            setProductsServices(psRes.data.map((d: any) => ({
                id: d.id,
                name: d.name,
                description: d.description,
                type: d.type,
                price: d.price,
                taxRate: d.tax_rate,
                sku: d.sku,
                isActive: d.is_active,
                createdAt: d.created_at,
                updatedAt: d.updated_at
            })));

        } catch (err: any) {
            console.error('[useAccountingData] fetch error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [activeProjectId]);

    // ---------------------------------------------------------------------------
    // Real-time subscriptions
    // ---------------------------------------------------------------------------
    useEffect(() => {
        fetchData();

        if (!activeProjectId) return;

        const txChannel = supabase.channel(`public:accounting_transactions:project_id=eq.${activeProjectId}:instance=${realtimeInstanceId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'accounting_transactions', filter: `project_id=eq.${activeProjectId}` },
                () => fetchData()
            )
            .subscribe();

        const vChannel = supabase.channel(`public:accounting_vendors:project_id=eq.${activeProjectId}:instance=${realtimeInstanceId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'accounting_vendors', filter: `project_id=eq.${activeProjectId}` },
                () => fetchData()
            )
            .subscribe();

        const psChannel = supabase.channel(`public:accounting_products_services:project_id=eq.${activeProjectId}:instance=${realtimeInstanceId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'accounting_products_services', filter: `project_id=eq.${activeProjectId}` },
                () => fetchData()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(txChannel);
            supabase.removeChannel(vChannel);
            supabase.removeChannel(psChannel);
        };
    }, [activeProjectId, fetchData, realtimeInstanceId]);

    // ---------------------------------------------------------------------------
    // CRUD — Transactions
    // ---------------------------------------------------------------------------
    const addTransaction = useCallback(
        async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
            if (!activeProjectId) throw new Error('No active project');
            
            const { data: doc, error } = await supabase
                .from('accounting_transactions')
                .insert({
                    project_id: activeProjectId,
                    type: data.type,
                    category: data.category,
                    amount: data.amount,
                    date: data.date,
                    description: data.description,
                    vendor_id: data.vendorId,
                    invoice_id: data.invoiceId,
                    reference_number: data.referenceNumber,
                    payment_method: data.paymentMethod,
                    status: data.status,
                    receipt_url: data.receiptUrl
                })
                .select('id')
                .single();
                
            if (error) throw error;
            return doc.id;
        },
        [activeProjectId],
    );

    const updateTransaction = useCallback(
        async (id: string, data: Partial<Transaction>) => {
            if (!activeProjectId) throw new Error('No active project');
            
            const payload: any = { updated_at: new Date().toISOString() };
            if (data.type !== undefined) payload.type = data.type;
            if (data.category !== undefined) payload.category = data.category;
            if (data.amount !== undefined) payload.amount = data.amount;
            if (data.date !== undefined) payload.date = data.date;
            if (data.description !== undefined) payload.description = data.description;
            if (data.vendorId !== undefined) payload.vendor_id = data.vendorId;
            if (data.invoiceId !== undefined) payload.invoice_id = data.invoiceId;
            if (data.referenceNumber !== undefined) payload.reference_number = data.referenceNumber;
            if (data.paymentMethod !== undefined) payload.payment_method = data.paymentMethod;
            if (data.status !== undefined) payload.status = data.status;
            if (data.receiptUrl !== undefined) payload.receipt_url = data.receiptUrl;

            const { error } = await supabase
                .from('accounting_transactions')
                .update(payload)
                .eq('id', id);
                
            if (error) throw error;
        },
        [activeProjectId],
    );

    const deleteTransaction = useCallback(
        async (id: string) => {
            if (!activeProjectId) throw new Error('No active project');
            
            const { error } = await supabase
                .from('accounting_transactions')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
        },
        [activeProjectId],
    );

    // ---------------------------------------------------------------------------
    // CRUD — Vendors
    // ---------------------------------------------------------------------------
    const addVendor = useCallback(
        async (data: Omit<Vendor, 'id' | 'createdAt' | 'totalSpent'>) => {
            if (!activeProjectId) throw new Error('No active project');
            
            const { data: doc, error } = await supabase
                .from('accounting_vendors')
                .insert({
                    project_id: activeProjectId,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    address: data.address,
                    tax_id: data.taxId,
                    website: data.website,
                    notes: data.notes,
                    total_spent: 0
                })
                .select('id')
                .single();
                
            if (error) throw error;
            return doc.id;
        },
        [activeProjectId],
    );

    const updateVendor = useCallback(
        async (id: string, data: Partial<Vendor>) => {
            if (!activeProjectId) throw new Error('No active project');
            
            const payload: any = { updated_at: new Date().toISOString() };
            if (data.name !== undefined) payload.name = data.name;
            if (data.email !== undefined) payload.email = data.email;
            if (data.phone !== undefined) payload.phone = data.phone;
            if (data.address !== undefined) payload.address = data.address;
            if (data.taxId !== undefined) payload.tax_id = data.taxId;
            if (data.website !== undefined) payload.website = data.website;
            if (data.notes !== undefined) payload.notes = data.notes;
            if (data.totalSpent !== undefined) payload.total_spent = data.totalSpent;

            const { error } = await supabase
                .from('accounting_vendors')
                .update(payload)
                .eq('id', id);
                
            if (error) throw error;
        },
        [activeProjectId],
    );

    const deleteVendor = useCallback(
        async (id: string) => {
            if (!activeProjectId) throw new Error('No active project');
            
            const { error } = await supabase
                .from('accounting_vendors')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
        },
        [activeProjectId],
    );

    // ---------------------------------------------------------------------------
    // CRUD — Products & Services
    // ---------------------------------------------------------------------------
    const addProductService = useCallback(
        async (data: Omit<ProductService, 'id' | 'createdAt'>) => {
            if (!activeProjectId) throw new Error('No active project');
            
            const { data: doc, error } = await supabase
                .from('accounting_products_services')
                .insert({
                    project_id: activeProjectId,
                    name: data.name,
                    description: data.description,
                    type: data.type,
                    price: data.price,
                    tax_rate: data.taxRate,
                    sku: data.sku,
                    is_active: data.isActive !== undefined ? data.isActive : true
                })
                .select('id')
                .single();
                
            if (error) throw error;
            return doc.id;
        },
        [activeProjectId],
    );

    const updateProductService = useCallback(
        async (id: string, data: Partial<ProductService>) => {
            if (!activeProjectId) throw new Error('No active project');
            
            const payload: any = { updated_at: new Date().toISOString() };
            if (data.name !== undefined) payload.name = data.name;
            if (data.description !== undefined) payload.description = data.description;
            if (data.type !== undefined) payload.type = data.type;
            if (data.price !== undefined) payload.price = data.price;
            if (data.taxRate !== undefined) payload.tax_rate = data.taxRate;
            if (data.sku !== undefined) payload.sku = data.sku;
            if (data.isActive !== undefined) payload.is_active = data.isActive;

            const { error } = await supabase
                .from('accounting_products_services')
                .update(payload)
                .eq('id', id);
                
            if (error) throw error;
        },
        [activeProjectId],
    );

    const deleteProductService = useCallback(
        async (id: string) => {
            if (!activeProjectId) throw new Error('No active project');
            
            const { error } = await supabase
                .from('accounting_products_services')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
        },
        [activeProjectId],
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
