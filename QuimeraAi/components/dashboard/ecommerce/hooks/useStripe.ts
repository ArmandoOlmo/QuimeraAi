/**
 * useStripe Hook
 * Hook para integración con Stripe y procesamiento de pagos
 */

import { useState, useCallback } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../../firebase';
import { Order, OrderItem, Address } from '../../../../types/ecommerce';

// Types
interface CreatePaymentIntentParams {
    userId: string;
    storeId?: string;
    orderId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    customerName: string;
    metadata?: Record<string, string>;
}

interface CreatePaymentIntentResponse {
    clientSecret: string;
    paymentIntentId: string;
    customerId: string;
}

interface CreateCheckoutSessionParams {
    userId: string;
    storeId?: string;
    items: OrderItem[];
    customerEmail: string;
    customerName: string;
    shippingCost: number;
    taxAmount: number;
    discountCode?: string;
    successUrl: string;
    cancelUrl: string;
}

interface CreateCheckoutSessionResponse {
    sessionId: string;
    url: string;
}

interface CreateRefundParams {
    userId: string;
    storeId?: string;
    orderId: string;
    amount?: number;
    reason?: string;
}

interface CreateRefundResponse {
    refundId: string;
    amount: number;
    status: string;
}

interface PaymentStatusResponse {
    id: string;
    status: string;
    amount: number;
    currency: string;
    created: number;
}

// Initialize Stripe
let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = (publishableKey: string) => {
    if (!stripePromise) {
        stripePromise = loadStripe(publishableKey);
    }
    return stripePromise;
};

export const useStripe = (publishableKey?: string) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stripe, setStripe] = useState<Stripe | null>(null);

    // Initialize Stripe
    const initializeStripe = useCallback(async (key?: string) => {
        const keyToUse = key || publishableKey;
        if (!keyToUse) {
            setError('Stripe publishable key not provided');
            return null;
        }

        try {
            const stripeInstance = await getStripe(keyToUse);
            setStripe(stripeInstance);
            return stripeInstance;
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    }, [publishableKey]);

    // Create Payment Intent
    const createPaymentIntent = useCallback(async (
        params: CreatePaymentIntentParams
    ): Promise<CreatePaymentIntentResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const createPaymentIntentFn = httpsCallable<CreatePaymentIntentParams, CreatePaymentIntentResponse>(
                functions,
                'createPaymentIntent'
            );
            
            const result = await createPaymentIntentFn(params);
            return result.data;
        } catch (err: any) {
            console.error('Error creating payment intent:', err);
            setError(err.message || 'Failed to create payment intent');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Create Checkout Session
    const createCheckoutSession = useCallback(async (
        params: CreateCheckoutSessionParams
    ): Promise<CreateCheckoutSessionResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const createCheckoutSessionFn = httpsCallable<CreateCheckoutSessionParams, CreateCheckoutSessionResponse>(
                functions,
                'createCheckoutSession'
            );
            
            const result = await createCheckoutSessionFn(params);
            return result.data;
        } catch (err: any) {
            console.error('Error creating checkout session:', err);
            setError(err.message || 'Failed to create checkout session');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Redirect to Checkout
    const redirectToCheckout = useCallback(async (sessionId: string) => {
        if (!stripe) {
            setError('Stripe not initialized');
            return;
        }

        try {
            const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
            if (stripeError) {
                setError(stripeError.message || 'Redirect to checkout failed');
            }
        } catch (err: any) {
            setError(err.message || 'Redirect to checkout failed');
        }
    }, [stripe]);

    // Confirm Payment
    const confirmPayment = useCallback(async (
        clientSecret: string,
        elements: StripeElements,
        returnUrl: string
    ) => {
        if (!stripe) {
            setError('Stripe not initialized');
            return { error: 'Stripe not initialized' };
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: returnUrl,
                },
            });

            if (result.error) {
                setError(result.error.message || 'Payment failed');
                return { error: result.error.message };
            }

            return { paymentIntent: result.paymentIntent };
        } catch (err: any) {
            setError(err.message || 'Payment failed');
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, [stripe]);

    // Confirm Card Payment (for custom card forms)
    const confirmCardPayment = useCallback(async (
        clientSecret: string,
        paymentMethodId: string
    ) => {
        if (!stripe) {
            setError('Stripe not initialized');
            return { error: 'Stripe not initialized' };
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: paymentMethodId,
            });

            if (result.error) {
                setError(result.error.message || 'Payment failed');
                return { error: result.error.message };
            }

            return { paymentIntent: result.paymentIntent };
        } catch (err: any) {
            setError(err.message || 'Payment failed');
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, [stripe]);

    // Create Refund
    const createRefund = useCallback(async (
        params: CreateRefundParams
    ): Promise<CreateRefundResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const createRefundFn = httpsCallable<CreateRefundParams, CreateRefundResponse>(
                functions,
                'createRefund'
            );
            
            const result = await createRefundFn(params);
            return result.data;
        } catch (err: any) {
            console.error('Error creating refund:', err);
            setError(err.message || 'Failed to create refund');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Get Payment Status
    const getPaymentStatus = useCallback(async (
        paymentIntentId: string
    ): Promise<PaymentStatusResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const getPaymentStatusFn = httpsCallable<{ paymentIntentId: string }, PaymentStatusResponse>(
                functions,
                'getPaymentStatus'
            );
            
            const result = await getPaymentStatusFn({ paymentIntentId });
            return result.data;
        } catch (err: any) {
            console.error('Error getting payment status:', err);
            setError(err.message || 'Failed to get payment status');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        // State
        stripe,
        isLoading,
        error,
        
        // Functions
        initializeStripe,
        createPaymentIntent,
        createCheckoutSession,
        redirectToCheckout,
        confirmPayment,
        confirmCardPayment,
        createRefund,
        getPaymentStatus,
    };
};














