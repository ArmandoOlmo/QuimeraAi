/**
 * Stripe Types Declaration
 * Types for @stripe/stripe-js and @stripe/react-stripe-js
 */

declare module '@stripe/stripe-js' {
    export interface Stripe {
        redirectToCheckout(options: { sessionId: string }): Promise<{ error?: StripeError }>;
        confirmPayment(options: {
            elements: StripeElements;
            confirmParams: { return_url: string };
            redirect?: 'always' | 'if_required';
        }): Promise<{ error?: StripeError; paymentIntent?: PaymentIntent }>;
        confirmCardPayment(
            clientSecret: string,
            options: { payment_method: string }
        ): Promise<{ error?: StripeError; paymentIntent?: PaymentIntent }>;
    }

    export interface StripeElements {
        getElement(type: string): any;
        create(type: string, options?: any): any;
    }

    export interface StripeError {
        type: string;
        message?: string;
        code?: string;
    }

    export interface PaymentIntent {
        id: string;
        status: string;
        amount: number;
        currency: string;
    }

    export interface StripeElementsOptions {
        mode?: 'payment' | 'setup' | 'subscription';
        amount?: number;
        currency?: string;
        appearance?: {
            theme?: 'stripe' | 'night' | 'flat';
            variables?: Record<string, string>;
            rules?: Record<string, Record<string, string>>;
        };
        clientSecret?: string;
    }

    export function loadStripe(publishableKey: string): Promise<Stripe | null>;
}

declare module '@stripe/react-stripe-js' {
    import { ReactNode, ComponentType } from 'react';
    import { Stripe, StripeElements, StripeElementsOptions } from '@stripe/stripe-js';

    export interface ElementsProps {
        stripe: Promise<Stripe | null> | Stripe | null;
        options?: StripeElementsOptions;
        children?: ReactNode;
    }

    export const Elements: ComponentType<ElementsProps>;

    export function useStripe(): Stripe | null;
    export function useElements(): StripeElements | null;

    // Payment Element
    export interface PaymentElementProps {
        options?: {
            layout?: 'tabs' | 'accordion' | 'auto';
            defaultValues?: any;
            business?: { name?: string };
            paymentMethodOrder?: string[];
            fields?: any;
            wallets?: any;
        };
        onReady?: () => void;
        onChange?: (event: any) => void;
        onFocus?: (event: any) => void;
        onBlur?: (event: any) => void;
        onEscape?: () => void;
        onLoaderStart?: () => void;
    }
    export const PaymentElement: ComponentType<PaymentElementProps>;

    // Address Element
    export interface AddressElementProps {
        options: {
            mode: 'shipping' | 'billing';
            allowedCountries?: string[];
            blockPoBox?: boolean;
            fields?: {
                phone?: 'always' | 'never' | 'auto';
            };
            validation?: {
                phone?: {
                    required?: 'always' | 'never' | 'auto';
                };
            };
            defaultValues?: any;
            contacts?: any[];
            display?: any;
        };
        onChange?: (event: { complete: boolean; value: { name?: string; phone?: string; address: any } }) => void;
        onReady?: () => void;
    }
    export const AddressElement: ComponentType<AddressElementProps>;

    // Express Checkout Element
    export interface ExpressCheckoutElementProps {
        options?: {
            buttonType?: {
                applePay?: 'plain' | 'buy' | 'check-out' | 'book' | 'donate' | 'subscribe' | 'reload' | 'add-money' | 'contribute' | 'order' | 'support' | 'tip' | 'rent';
                googlePay?: 'plain' | 'buy' | 'book' | 'checkout' | 'donate' | 'order' | 'pay' | 'subscribe';
            };
            buttonTheme?: {
                applePay?: 'black' | 'white' | 'white-outline';
                googlePay?: 'black' | 'white';
            };
            buttonHeight?: number;
            paymentMethods?: {
                applePay?: 'auto' | 'never';
                googlePay?: 'auto' | 'never';
                link?: 'auto' | 'never';
            };
            layout?: {
                maxColumns?: number;
                maxRows?: number;
                overflow?: 'auto' | 'never';
            };
        };
        onReady?: (event: any) => void;
        onClick?: (event: any) => void;
        onConfirm?: (event: any) => void;
        onCancel?: () => void;
        onShippingAddressChange?: (event: any) => void;
        onShippingRateChange?: (event: any) => void;
    }
    export const ExpressCheckoutElement: ComponentType<ExpressCheckoutElementProps>;

    // Card Element
    export interface CardElementProps {
        options?: any;
        onChange?: (event: any) => void;
        onReady?: (element: any) => void;
        onFocus?: () => void;
        onBlur?: () => void;
        onEscape?: () => void;
    }
    export const CardElement: ComponentType<CardElementProps>;

    // Link Authentication Element
    export interface LinkAuthenticationElementProps {
        options?: {
            defaultValues?: { email?: string };
        };
        onChange?: (event: { complete: boolean; value: { email: string } }) => void;
        onReady?: () => void;
    }
    export const LinkAuthenticationElement: ComponentType<LinkAuthenticationElementProps>;
}
