/**
 * useStripeConnect Hook
 * Hook para integración con Stripe Connect (Multi-tenant)
 * 
 * Permite a cada tenant conectar su propia cuenta de Stripe
 * para recibir pagos directamente
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../../supabase';
import { createRealtimeChannelName } from './realtimeChannel';

// Types
interface CreateConnectAccountParams {
    userId: string;
    storeId: string;
    email: string;
    businessName: string;
    country?: string;
}

interface CreateConnectAccountResponse {
    accountId: string;
    alreadyExists: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
}

interface OnboardingLinkParams {
    userId: string;
    storeId: string;
    returnUrl: string;
    refreshUrl: string;
}

interface OnboardingLinkResponse {
    url: string;
    expiresAt: number;
}

interface LoginLinkResponse {
    url: string;
}

interface ConnectAccountStatus {
    connected: boolean;
    accountId: string | null;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    status?: 'pending' | 'active' | 'restricted';
    requirements?: {
        currentlyDue: string[];
        eventuallyDue: string[];
        pastDue: string[];
        disabledReason?: string;
    };
    capabilities?: {
        cardPayments: string;
        transfers: string;
    };
}

interface CreateConnectPaymentParams {
    userId: string;        // Store owner's userId
    storeId: string;
    orderId: string;
    amount: number;        // in cents
    currency: string;
    customerEmail: string;
    customerName: string;
    metadata?: Record<string, string>;
}

interface CreateConnectPaymentResponse {
    clientSecret: string;
    paymentIntentId: string;
    customerId: string;
    connectedAccountId: string;
    platformFee: number;
}

export const useStripeConnect = (userId: string, storeId: string) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connectStatus, setConnectStatus] = useState<ConnectAccountStatus | null>(null);

    // Fetch initial status and listen to real-time updates from Supabase
    useEffect(() => {
        if (!storeId) return;

        const fetchStatus = async () => {
            const { data, error } = await supabase
                .from('store_settings')
                .select('stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted, stripe_connect_status')
                .eq('project_id', storeId)
                .single();

            if (!error && data) {
                if (data.stripe_connect_account_id) {
                    setConnectStatus({
                        connected: true,
                        accountId: data.stripe_connect_account_id,
                        chargesEnabled: data.stripe_connect_charges_enabled,
                        payoutsEnabled: data.stripe_connect_payouts_enabled,
                        detailsSubmitted: data.stripe_connect_details_submitted,
                        status: data.stripe_connect_status as 'pending' | 'active' | 'restricted',
                    });
                } else {
                    setConnectStatus({
                        connected: false,
                        accountId: null,
                    });
                }
            }
        };

        fetchStatus();

        const channel = supabase.channel(createRealtimeChannelName('store_settings_stripe_connect', storeId))
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'store_settings',
                    filter: `project_id=eq.${storeId}`
                },
                (payload) => {
                    const data = payload.new;
                    if (data.stripe_connect_account_id) {
                        setConnectStatus({
                            connected: true,
                            accountId: data.stripe_connect_account_id,
                            chargesEnabled: data.stripe_connect_charges_enabled,
                            payoutsEnabled: data.stripe_connect_payouts_enabled,
                            detailsSubmitted: data.stripe_connect_details_submitted,
                            status: data.stripe_connect_status as 'pending' | 'active' | 'restricted',
                        });
                    } else {
                        setConnectStatus({
                            connected: false,
                            accountId: null,
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [storeId]);

    /**
     * Creates a new Stripe Connect Express account for the store
     */
    const createAccount = useCallback(async (
        params: Omit<CreateConnectAccountParams, 'userId' | 'storeId'>
    ): Promise<CreateConnectAccountResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: { action: 'createConnectAccount', userId, storeId, ...params }
            });
            if (result.error) throw result.error;
            return result.data?.data || result.data;
        } catch (err: any) {
            console.error('Error creating Connect account:', err);
            setError(err.message || 'Failed to create Connect account');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [userId, storeId]);

    /**
     * Creates an onboarding link for the Express account
     * Opens Stripe's hosted onboarding flow
     */
    const createOnboardingLink = useCallback(async (
        returnUrl: string,
        refreshUrl: string
    ): Promise<OnboardingLinkResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: { action: 'createConnectOnboardingLink', userId, storeId, returnUrl, refreshUrl }
            });
            if (result.error) throw result.error;
            return result.data?.data || result.data;
        } catch (err: any) {
            console.error('Error creating onboarding link:', err);
            setError(err.message || 'Failed to create onboarding link');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [userId, storeId]);

    /**
     * Creates a login link to access the Express dashboard
     */
    const createLoginLink = useCallback(async (): Promise<LoginLinkResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: { action: 'createConnectLoginLink', userId, storeId }
            });
            if (result.error) throw result.error;
            return result.data?.data || result.data;
        } catch (err: any) {
            console.error('Error creating login link:', err);
            setError(err.message || 'Failed to create login link');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [userId, storeId]);

    /**
     * Gets the current status of the Connect account from Stripe
     */
    const refreshAccountStatus = useCallback(async (): Promise<ConnectAccountStatus | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: { action: 'getConnectAccountStatus', userId, storeId }
            });
            if (result.error) throw result.error;
            const data = result.data?.data || result.data;
            setConnectStatus(data);
            return data;
        } catch (err: any) {
            console.error('Error getting account status:', err);
            setError(err.message || 'Failed to get account status');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [userId, storeId]);

    /**
     * Disconnects the Connect account from the platform
     */
    const disconnectAccount = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: { action: 'disconnectConnectAccount', userId, storeId }
            });
            if (result.error) throw result.error;
            
            setConnectStatus({ connected: false, accountId: null });
            return true;
        } catch (err: any) {
            console.error('Error disconnecting account:', err);
            setError(err.message || 'Failed to disconnect account');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [userId, storeId]);

    /**
     * Creates a payment intent that sends funds to the connected account
     * Used for customer purchases in the tenant's store
     */
    const createPaymentIntent = useCallback(async (
        params: Omit<CreateConnectPaymentParams, 'userId' | 'storeId'>
    ): Promise<CreateConnectPaymentResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await supabase.functions.invoke('stripe-api', {
                body: { action: 'createConnectPaymentIntent', userId, storeId, ...params }
            });
            if (result.error) throw result.error;
            return result.data?.data || result.data;
        } catch (err: any) {
            console.error('Error creating Connect payment:', err);
            setError(err.message || 'Failed to create payment');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [userId, storeId]);

    /**
     * Opens the Stripe onboarding flow in a new tab
     */
    const startOnboarding = useCallback(async (
        email: string,
        businessName: string,
        country: string = 'US'
    ) => {
        setIsLoading(true);
        setError(null);

        try {
            // First, create the account if it doesn't exist
            if (!connectStatus?.connected) {
                const account = await createAccount({ email, businessName, country });
                if (!account) {
                    throw new Error('Failed to create account');
                }
            }

            // Generate the current URL for return/refresh
            const baseUrl = window.location.origin;
            const returnUrl = `${baseUrl}/dashboard/ecommerce/settings?stripe_connect=success`;
            const refreshUrl = `${baseUrl}/dashboard/ecommerce/settings?stripe_connect=refresh`;

            // Create the onboarding link
            const link = await createOnboardingLink(returnUrl, refreshUrl);
            if (!link) {
                throw new Error('Failed to create onboarding link');
            }

            // Open in new tab
            window.open(link.url, '_blank');
            
            return true;
        } catch (err: any) {
            console.error('Error starting onboarding:', err);
            setError(err.message || 'Failed to start onboarding');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [connectStatus, createAccount, createOnboardingLink]);

    /**
     * Opens the Stripe Express dashboard in a new tab
     */
    const openDashboard = useCallback(async () => {
        if (!connectStatus?.connected) {
            setError('No Stripe account connected');
            return false;
        }

        const link = await createLoginLink();
        if (link) {
            window.open(link.url, '_blank');
            return true;
        }
        return false;
    }, [connectStatus, createLoginLink]);

    return {
        // State
        isLoading,
        error,
        connectStatus,
        isConnected: connectStatus?.connected ?? false,
        isActive: connectStatus?.status === 'active',
        canAcceptPayments: connectStatus?.chargesEnabled ?? false,
        
        // Functions
        createAccount,
        createOnboardingLink,
        createLoginLink,
        refreshAccountStatus,
        disconnectAccount,
        createPaymentIntent,
        
        // Convenience functions
        startOnboarding,
        openDashboard,
    };
};










