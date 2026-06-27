import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@^14.0.0";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { encode as encodeHex } from "https://deno.land/std@0.177.0/encoding/hex.ts";
import { encode as encodeBase64Url } from "https://deno.land/std@0.177.0/encoding/base64url.ts";
import { resolveServiceAccess } from "../../../services/access/serviceAccessEngine.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashAccessToken(token: string) {
    const data = new TextEncoder().encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return new TextDecoder().decode(encodeHex(new Uint8Array(hashBuffer)));
}

async function assertMerchantEcommerceAccess(supabaseClient: ReturnType<typeof createClient>, projectId: string, ownerId?: string | null) {
    const { data: project } = await supabaseClient
        .from("projects")
        .select("tenant_id, user_id")
        .eq("id", projectId)
        .maybeSingle();

    const tenantId = project?.tenant_id;
    if (!tenantId) return;

    const [{ data: tenant }, { data: subscription }, { data: serviceSettings }] = await Promise.all([
        supabaseClient.from("tenants").select("status, subscription_plan, limits, usage").eq("id", tenantId).maybeSingle(),
        supabaseClient.from("subscriptions").select("plan_id, status").eq("tenant_id", tenantId).maybeSingle(),
        supabaseClient.from("settings").select("config").eq("id", "serviceAvailability").maybeSingle(),
    ]);

    const decision = resolveServiceAccess({
        userId: String(ownerId || project?.user_id || "storefront-public-checkout"),
        userRole: "storefront_customer",
        tenantId,
        tenantStatus: tenant?.status,
        projectId,
        planId: subscription?.plan_id || tenant?.subscription_plan || "free",
        subscriptionStatus: subscription?.status || tenant?.status || "active",
        serviceId: "ecommerce",
        featureKey: "ecommerceEnabled",
        serviceAvailability: serviceSettings?.config?.services,
        planLimits: tenant?.limits || undefined,
        currentUsage: tenant?.usage || undefined,
        action: "create_store_checkout_intent",
    });

    if (!decision.allowed) {
        try {
            await supabaseClient.from("service_access_audit_logs").insert({
                tenant_id: tenantId,
                user_id: ownerId || project?.user_id || null,
                user_role: "storefront_customer",
                module_id: "ecommerce-engine",
                service_id: "ecommerce",
                feature_key: "ecommerceEnabled",
                action: "create_store_checkout_intent",
                reason_code: decision.reasonCode,
                allowed: false,
                admin_override: false,
                decision,
            });
        } catch (_error) {
            // Audit logging must not mask the access decision.
        }
        throw new Error(decision.message);
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        });

        const { data: requestData } = await req.json();

        // data holds our request
        const {
            storeId,
            items,
            customerEmail,
            customerName,
            customerPhone,
            shippingAddress,
            billingAddress,
            shippingMethodId,
            idempotencyKey,
            notes
        } = requestData;

        // 1. Fetch Store info
        const { data: storeInfo, error: storeError } = await supabaseClient
            .from('public_stores')
            .select('*')
            .eq('id', storeId)
            .single();

        if (storeError || !storeInfo) {
            throw new Error('Store not found');
        }

        const publicStoreData = storeInfo.data || {};
        const ownerId = storeInfo.user_id || publicStoreData.userId || publicStoreData.user_id;
        const projectId = publicStoreData.projectId || publicStoreData.project_id || storeId;

        // Fetch store settings
        const { data: storeSettingsRecord, error: settingsError } = await supabaseClient
            .from('store_settings')
            .select('*')
            .eq('project_id', projectId)
            .maybeSingle();

        if (settingsError) throw settingsError;
        if (!storeSettingsRecord) throw new Error('Store settings not found');

        const settingsData = (storeSettingsRecord?.data as any) || {};
        await assertMerchantEcommerceAccess(supabaseClient, projectId, ownerId);
        const storeSettings = {
            ...settingsData,
            stripeEnabled: storeSettingsRecord.stripe_enabled ?? settingsData.stripeEnabled,
            stripeConnectAccountId: storeSettingsRecord.stripe_connect_account_id ?? settingsData.stripeConnectAccountId,
            stripeConnectChargesEnabled: storeSettingsRecord.stripe_connect_charges_enabled ?? settingsData.stripeConnectChargesEnabled,
            currency: storeSettingsRecord.currency ?? settingsData.currency,
            shippingZones: storeSettingsRecord.shipping_zones ?? settingsData.shippingZones ?? [],
            freeShippingThreshold: storeSettingsRecord.free_shipping_threshold ?? settingsData.freeShippingThreshold,
            taxEnabled: storeSettingsRecord.tax_enabled ?? settingsData.taxEnabled,
            taxRate: storeSettingsRecord.tax_rate ?? settingsData.taxRate,
        };
        const currency = (storeSettings.currency || 'usd').toLowerCase();
        const connectedAccountId = storeSettings.stripeConnectAccountId;

        if (!storeSettings.stripeEnabled || !connectedAccountId || !storeSettings.stripeConnectChargesEnabled) {
            throw new Error('Store is not ready to accept payments');
        }

        let subtotal = 0;
        const canonicalItems = [];

        for (const item of items) {
            if (item.quantity <= 0) throw new Error('Invalid quantity');

            // Fetch product
            const { data: productRecord } = await supabaseClient
                .from('store_products')
                .select('*')
                .eq('store_id', storeId)
                .eq('id', item.productId)
                .maybeSingle();

            if (!productRecord) {
                throw new Error(`Product ${item.productId} not found`);
            }

            const rawProductData = (productRecord.data as any) || {};
            const productData = {
                ...rawProductData,
                id: productRecord.id,
                name: productRecord.name ?? rawProductData.name,
                status: productRecord.status ?? rawProductData.status,
                price: Number(productRecord.price ?? rawProductData.price ?? 0),
                quantity: Number(productRecord.quantity ?? rawProductData.quantity ?? 0),
                trackInventory: productRecord.track_inventory ?? rawProductData.trackInventory,
                hasVariants: productRecord.has_variants ?? rawProductData.hasVariants,
                variants: productRecord.variants ?? rawProductData.variants ?? [],
                images: productRecord.images ?? rawProductData.images ?? [],
            };
            if (productData.status !== 'active') {
                throw new Error(`Product ${productData.name} is not available`);
            }

            let availableQuantity = productData.quantity || 0;
            let price = productData.price;
            let variantName = null;

            if (item.variantId && productData.hasVariants && productData.variants) {
                const variant = productData.variants.find((v: any) => v.id === item.variantId);
                if (!variant) throw new Error('Variant not found');
                availableQuantity = variant.quantity || 0;
                price = variant.price;
                variantName = variant.name;
            }

            if (productData.trackInventory !== false && availableQuantity < item.quantity) {
                throw new Error(`Insufficient stock for ${productData.name}`);
            }

            const itemTotal = price * item.quantity;
            subtotal += itemTotal;

            canonicalItems.push({
                id: `${item.productId}-${item.variantId || 'default'}`,
                productId: item.productId,
                variantId: item.variantId || null,
                name: variantName ? `${productData.name} - ${variantName}` : productData.name,
                productName: productData.name,
                variantName: variantName,
                imageUrl: productData.images?.[0]?.url || null,
                quantity: item.quantity,
                unitPrice: price,
                totalPrice: itemTotal,
            });
        }

        let shippingTotal = 0;
        let shippingMethodName = 'Standard';

        if (storeSettings.shippingZones && storeSettings.shippingZones.length > 0) {
            const allRates = storeSettings.shippingZones.flatMap((z: any) => z.rates || []);
            const selectedRate = allRates.find((r: any) => r.id === shippingMethodId) || allRates[0];
            
            if (selectedRate) {
                shippingTotal = selectedRate.price || 0;
                shippingMethodName = selectedRate.name || 'Standard';
                
                if (storeSettings.freeShippingThreshold && subtotal >= storeSettings.freeShippingThreshold) {
                    shippingTotal = 0;
                    shippingMethodName = 'Free Shipping';
                }
            }
        }

        let taxTotal = 0;
        if (storeSettings.taxEnabled && storeSettings.taxRate > 0) {
            taxTotal = subtotal * (storeSettings.taxRate / 100);
        }

        const total = Math.max(0, subtotal + shippingTotal + taxTotal);
        const applicationFeeAmount = Math.round(total * 0.01 * 100); // 1%

        const cartString = JSON.stringify({ items, shippingMethodId, total });
        
        const cartHashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cartString));
        const cartHash = new TextDecoder().decode(encodeHex(new Uint8Array(cartHashBuffer)));
        
        const cleanIdempotencyKey = idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 32).toUpperCase();
        const orderId = `ORD-${cleanIdempotencyKey}`;

        // Check if order already exists in Supabase
        const { data: existingOrder } = await supabaseClient
            .from('store_orders')
            .select('*')
            .eq('project_id', projectId)
            .eq('order_number', orderId)
            .maybeSingle();

        if (existingOrder) {
            const orderData = {
                ...existingOrder,
                ...((existingOrder.data as any) || {}),
                cartHash: (existingOrder.data as any)?.cartHash || existingOrder.cart_hash,
                stripe: (existingOrder.data as any)?.stripe || existingOrder.stripe,
                total: existingOrder.total ?? (existingOrder.data as any)?.total,
            };
            if (orderData.cartHash !== cartHash) {
                throw new Error('Checkout already exists for a different cart. Refresh checkout and try again.');
            }
            return new Response(JSON.stringify({
                data: {
                    clientSecret: orderData.stripe?.clientSecret,
                    orderId,
                    orderAccessToken: orderData.orderAccessToken,
                    total: orderData.total,
                    cartHash
                }
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const tokenBytes = new Uint8Array(32);
        crypto.getRandomValues(tokenBytes);
        const orderAccessToken = new TextDecoder().decode(encodeBase64Url(tokenBytes));
        const tokenHash = await hashAccessToken(orderAccessToken);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(total * 100),
            currency: currency,
            automatic_payment_methods: { enabled: true },
            application_fee_amount: applicationFeeAmount > 0 ? applicationFeeAmount : undefined,
            transfer_data: { destination: connectedAccountId },
            metadata: {
                storeId,
                ownerId,
                orderId,
                idempotencyKey,
                cartHash
            },
        }, { idempotencyKey: `pi_${idempotencyKey}` });

        const now = new Date().toISOString();

        const orderData = {
            orderNumber: orderId,
            customerEmail: customerEmail,
            customerName: customerName,
            customerPhone: customerPhone || null,
            items: canonicalItems,
            subtotal,
            discount: 0,
            discountAmount: 0,
            shippingCost: shippingTotal,
            taxAmount: taxTotal,
            total,
            currency,
            pricing: {
                subtotal,
                discountTotal: 0,
                shippingTotal,
                taxTotal,
                platformFeeTotal: applicationFeeAmount / 100,
                total
            },
            shippingAddress,
            billingAddress: billingAddress || shippingAddress,
            status: 'pending',
            paymentStatus: 'pending',
            fulfillmentStatus: 'unfulfilled',
            paymentMethod: 'stripe',
            shippingMethod: shippingMethodName,
            notes: notes || null,
            checkoutIdempotencyKey: idempotencyKey,
            orderAccessToken,
            orderAccessTokenHash: tokenHash,
            cartHash,
            stripe: {
                paymentIntentId: paymentIntent.id,
                connectedAccountId: connectedAccountId,
                clientSecret: paymentIntent.client_secret,
            },
            createdAt: now,
            updatedAt: now,
        };

        const { error: insertError } = await supabaseClient
            .from('store_orders')
            .insert({
                id: orderId,
                store_id: storeId,
                user_id: ownerId,
                project_id: projectId,
                order_number: orderId,
                customer_email: orderData.customerEmail,
                customer_name: orderData.customerName,
                customer_phone: orderData.customerPhone,
                subtotal: orderData.subtotal,
                discount: orderData.discount,
                discount_amount: orderData.discountAmount,
                shipping_cost: orderData.shippingCost,
                tax_amount: orderData.taxAmount,
                total: orderData.total,
                currency: orderData.currency.toUpperCase(),
                items: orderData.items,
                pricing: orderData.pricing,
                checkout_idempotency_key: orderData.checkoutIdempotencyKey,
                cart_hash: orderData.cartHash,
                stripe: orderData.stripe,
                shipping_address: orderData.shippingAddress,
                billing_address: orderData.billingAddress,
                status: 'pending',
                payment_status: 'pending',
                fulfillment_status: 'unfulfilled',
                payment_method: 'stripe',
                payment_intent_id: paymentIntent.id,
                shipping_method: orderData.shippingMethod,
                notes: orderData.notes,
                data: orderData
            });

        if (insertError) {
            throw new Error('Failed to save order: ' + insertError.message);
        }

        return new Response(JSON.stringify({
            data: {
                clientSecret: paymentIntent.client_secret,
                orderId: orderId,
                orderAccessToken,
                total: total,
                cartHash: cartHash
            }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
