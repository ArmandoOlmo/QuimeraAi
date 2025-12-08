/**
 * useCustomers Hook
 * Hook para gestión de clientes en Firestore
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    where,
    getDocs,
    increment,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Customer, Address } from '../../../../types/ecommerce';

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
    const customersPath = `users/${userId}/stores/${effectiveStoreId}/customers`;

    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        const customersRef = collection(db, customersPath);
        let q = query(customersRef, orderBy('createdAt', 'desc'));

        if (options?.acceptsMarketing !== undefined) {
            q = query(customersRef, where('acceptsMarketing', '==', options.acceptsMarketing), orderBy('createdAt', 'desc'));
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                let data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Customer[];

                // Filter by search term in memory
                if (options?.searchTerm) {
                    const term = options.searchTerm.toLowerCase();
                    data = data.filter(
                        (c) =>
                            c.email.toLowerCase().includes(term) ||
                            c.firstName.toLowerCase().includes(term) ||
                            c.lastName.toLowerCase().includes(term) ||
                            c.phone?.toLowerCase().includes(term)
                    );
                }

                // Filter by tags in memory
                if (options?.tags && options.tags.length > 0) {
                    data = data.filter((c) =>
                        options.tags!.some((tag) => c.tags?.includes(tag))
                    );
                }

                setCustomers(data);
                setIsLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching customers:', err);
                setError(err.message);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, effectiveStoreId, options?.acceptsMarketing, options?.searchTerm, options?.tags, customersPath]);

    // Add customer
    const addCustomer = useCallback(
        async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalOrders' | 'totalSpent'>): Promise<string> => {
            const customersRef = collection(db, customersPath);

            const docRef = await addDoc(customersRef, {
                ...customerData,
                totalOrders: 0,
                totalSpent: 0,
                addresses: customerData.addresses || [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [customersPath]
    );

    // Update customer
    const updateCustomer = useCallback(
        async (customerId: string, updates: Partial<Customer>) => {
            const customerRef = doc(db, customersPath, customerId);
            await updateDoc(customerRef, {
                ...updates,
                updatedAt: serverTimestamp(),
            });
        },
        [customersPath]
    );

    // Delete customer
    const deleteCustomer = useCallback(
        async (customerId: string) => {
            const customerRef = doc(db, customersPath, customerId);
            await deleteDoc(customerRef);
        },
        [customersPath]
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
            const customersRef = collection(db, customersPath);
            const q = query(customersRef, where('email', '==', customerData.email.toLowerCase()));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                return snapshot.docs[0].id;
            }

            return await addCustomer({
                ...customerData,
                email: customerData.email.toLowerCase(),
                acceptsMarketing: customerData.acceptsMarketing || false,
                addresses: [],
            });
        },
        [customersPath, addCustomer]
    );

    // Update customer stats after order
    const updateCustomerStats = useCallback(
        async (customerId: string, orderTotal: number) => {
            const customerRef = doc(db, customersPath, customerId);
            await updateDoc(customerRef, {
                totalOrders: increment(1),
                totalSpent: increment(orderTotal),
                lastOrderAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [customersPath]
    );

    // Add address to customer
    const addAddress = useCallback(
        async (customerId: string, address: Address, setAsDefault?: 'shipping' | 'billing') => {
            const customer = customers.find((c) => c.id === customerId);
            if (!customer) return;

            const updatedAddresses = [...customer.addresses, address];
            const updateData: any = {
                addresses: updatedAddresses,
                updatedAt: serverTimestamp(),
            };

            if (setAsDefault === 'shipping') {
                updateData.defaultShippingAddress = address;
            } else if (setAsDefault === 'billing') {
                updateData.defaultBillingAddress = address;
            }

            const customerRef = doc(db, customersPath, customerId);
            await updateDoc(customerRef, updateData);
        },
        [customersPath, customers]
    );

    // Remove address from customer
    const removeAddress = useCallback(
        async (customerId: string, addressIndex: number) => {
            const customer = customers.find((c) => c.id === customerId);
            if (!customer) return;

            const updatedAddresses = customer.addresses.filter((_, i) => i !== addressIndex);
            
            const customerRef = doc(db, customersPath, customerId);
            await updateDoc(customerRef, {
                addresses: updatedAddresses,
                updatedAt: serverTimestamp(),
            });
        },
        [customersPath, customers]
    );

    // Add tags to customer
    const addTags = useCallback(
        async (customerId: string, tags: string[]) => {
            const customer = customers.find((c) => c.id === customerId);
            if (!customer) return;

            const existingTags = customer.tags || [];
            const newTags = [...new Set([...existingTags, ...tags])];

            const customerRef = doc(db, customersPath, customerId);
            await updateDoc(customerRef, {
                tags: newTags,
                updatedAt: serverTimestamp(),
            });
        },
        [customersPath, customers]
    );

    // Remove tag from customer
    const removeTag = useCallback(
        async (customerId: string, tag: string) => {
            const customer = customers.find((c) => c.id === customerId);
            if (!customer) return;

            const updatedTags = (customer.tags || []).filter((t) => t !== tag);

            const customerRef = doc(db, customersPath, customerId);
            await updateDoc(customerRef, {
                tags: updatedTags,
                updatedAt: serverTimestamp(),
            });
        },
        [customersPath, customers]
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

