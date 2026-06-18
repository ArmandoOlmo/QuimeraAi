/**
 * useCustomers Hook
 * Hook para gestión de clientes en Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabase';
import { Customer, Address } from '../../../../types/ecommerce';
import { mapCustomerFromDB, mapCustomerToDB } from '../../../../utils/ecommerceMappers';

interface UseCustomersOptions {
    searchTerm?: string;
    tags?: string[];
    acceptsMarketing?: boolean;
}

export const useCustomers = (userId: string, storeId?: string, options?: UseCustomersOptions) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const effectiveStoreId = storeId || '';

    const fetchCustomers = useCallback(async () => {
        if (!effectiveStoreId) return;

        setIsLoading(true);
        let query = supabase
            .from('store_customers')
            .select('*')
            .eq('project_id', effectiveStoreId)
            .order('created_at', { ascending: false });

        if (options?.acceptsMarketing !== undefined) {
            query = query.eq('accepts_marketing', options.acceptsMarketing);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
            console.error('Error fetching customers:', fetchError);
            setError(fetchError.message);
        } else {
            let mappedData = (data || []).map(mapCustomerFromDB);

            // Filter by search term in memory
            if (options?.searchTerm) {
                const term = options.searchTerm.toLowerCase();
                mappedData = mappedData.filter(
                    (c) =>
                        c.email.toLowerCase().includes(term) ||
                        c.firstName.toLowerCase().includes(term) ||
                        c.lastName.toLowerCase().includes(term) ||
                        c.phone?.toLowerCase().includes(term)
                );
            }

            // Filter by tags in memory
            if (options?.tags && options.tags.length > 0) {
                mappedData = mappedData.filter((c) =>
                    options.tags!.some((tag) => c.tags?.includes(tag))
                );
            }

            setCustomers(mappedData);
            setError(null);
        }
        setIsLoading(false);
    }, [effectiveStoreId, options?.acceptsMarketing, options?.searchTerm, options?.tags]);

    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        fetchCustomers();

        const channelName = `store_customers_changes:${effectiveStoreId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        const channel = supabase.channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'store_customers',
                    filter: `project_id=eq.${effectiveStoreId}`
                },
                () => {
                    fetchCustomers();
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [userId, effectiveStoreId, fetchCustomers]);

    // Add customer
    const addCustomer = useCallback(
        async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalOrders' | 'totalSpent'>): Promise<string> => {
            const dbData = mapCustomerToDB({
                ...customerData,
                totalOrders: 0,
                totalSpent: 0,
                addresses: customerData.addresses || [],
            });

            dbData.project_id = effectiveStoreId;

            const { data: insertedCustomer, error } = await supabase
                .from('store_customers')
                .insert(dbData)
                .select()
                .single();

            if (error) throw error;
            return insertedCustomer.id;
        },
        [effectiveStoreId]
    );

    // Update customer
    const updateCustomer = useCallback(
        async (customerId: string, updates: Partial<Customer>) => {
            const updateData = mapCustomerToDB(updates);

            const { error } = await supabase
                .from('store_customers')
                .update(updateData)
                .eq('id', customerId);

            if (error) throw error;
        },
        []
    );

    // Delete customer
    const deleteCustomer = useCallback(
        async (customerId: string) => {
            const { error } = await supabase
                .from('store_customers')
                .delete()
                .eq('id', customerId);

            if (error) throw error;
        },
        []
    );

    // Find or create customer by email
    const findOrCreateCustomer = useCallback(
        async (customerData: {
            email: string;
            firstName: string;
            lastName: string;
            phone?: string;
            acceptsMarketing?: boolean;
        }): Promise<string> => {
            const { data } = await supabase
                .from('store_customers')
                .select('id')
                .eq('project_id', effectiveStoreId)
                .ilike('email', customerData.email)
                .limit(1);

            if (data && data.length > 0) {
                return data[0].id;
            }

            return await addCustomer({
                ...customerData,
                email: customerData.email.toLowerCase(),
                acceptsMarketing: customerData.acceptsMarketing || false,
                addresses: [],
            });
        },
        [effectiveStoreId, addCustomer]
    );

    // Update customer stats after order
    // Note: Supabase doesn't support increment via standard update in JS, usually requires RPC.
    // We will read first then update, or use RPC. Since this is admin/dashboard hook, we might
    // just rely on a backend trigger in production. For now, read + update.
    const updateCustomerStats = useCallback(
        async (customerId: string, orderTotal: number) => {
            const customer = customers.find(c => c.id === customerId);
            if (!customer) return;

            const { error } = await supabase
                .from('store_customers')
                .update({
                    total_orders: customer.totalOrders + 1,
                    total_spent: customer.totalSpent + orderTotal,
                    last_order_at: new Date().toISOString(),
                })
                .eq('id', customerId);

            if (error) throw error;
        },
        [customers]
    );

    // Add address to customer
    const addAddress = useCallback(
        async (customerId: string, address: Address, setAsDefault?: 'shipping' | 'billing') => {
            const customer = customers.find((c) => c.id === customerId);
            if (!customer) return;

            const updatedAddresses = [...customer.addresses, address];
            const updateData: any = {
                addresses: updatedAddresses,
            };

            if (setAsDefault === 'shipping') {
                updateData.default_shipping_address = address;
            } else if (setAsDefault === 'billing') {
                updateData.default_billing_address = address;
            }

            const { error } = await supabase
                .from('store_customers')
                .update(updateData)
                .eq('id', customerId);

            if (error) throw error;
        },
        [customers]
    );

    // Remove address from customer
    const removeAddress = useCallback(
        async (customerId: string, addressIndex: number) => {
            const customer = customers.find((c) => c.id === customerId);
            if (!customer) return;

            const updatedAddresses = customer.addresses.filter((_, i) => i !== addressIndex);
            
            const { error } = await supabase
                .from('store_customers')
                .update({ addresses: updatedAddresses })
                .eq('id', customerId);

            if (error) throw error;
        },
        [customers]
    );

    // Add tags to customer
    const addTags = useCallback(
        async (customerId: string, tags: string[]) => {
            const customer = customers.find((c) => c.id === customerId);
            if (!customer) return;

            const existingTags = customer.tags || [];
            const newTags = [...new Set([...existingTags, ...tags])];

            const { error } = await supabase
                .from('store_customers')
                .update({ tags: newTags })
                .eq('id', customerId);

            if (error) throw error;
        },
        [customers]
    );

    // Remove tag from customer
    const removeTag = useCallback(
        async (customerId: string, tag: string) => {
            const customer = customers.find((c) => c.id === customerId);
            if (!customer) return;

            const updatedTags = (customer.tags || []).filter((t) => t !== tag);

            const { error } = await supabase
                .from('store_customers')
                .update({ tags: updatedTags })
                .eq('id', customerId);

            if (error) throw error;
        },
        [customers]
    );

    // Get customer by ID
    const getCustomerById = useCallback(
        (customerId: string): Customer | undefined => {
            return customers.find((c) => c.id === customerId);
        },
        [customers]
    );

    // Get customer by email
    const getCustomerByEmail = useCallback(
        (email: string): Customer | undefined => {
            return customers.find((c) => c.email.toLowerCase() === email.toLowerCase());
        },
        [customers]
    );

    // Get top customers by spending
    const getTopCustomers = useCallback(
        (limit: number = 10): Customer[] => {
            return [...customers]
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, limit);
        },
        [customers]
    );

    // Get customers who accept marketing
    const getMarketingCustomers = useCallback((): Customer[] => {
        return customers.filter((c) => c.acceptsMarketing);
    }, [customers]);

    return {
        customers,
        isLoading,
        error,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        findOrCreateCustomer,
        updateCustomerStats,
        addAddress,
        removeAddress,
        addTags,
        removeTag,
        getCustomerById,
        getCustomerByEmail,
        getTopCustomers,
        getMarketingCustomers,
    };
};
