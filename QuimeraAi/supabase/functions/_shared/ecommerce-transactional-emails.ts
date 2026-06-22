import {
  createResendEcommerceEmailProvider,
  createSupabaseEcommerceEmailRepository,
  normalizeEcommerceEmailEvent,
  sendFulfillmentConfirmationEmail,
  sendLowStockAlert,
  sendMerchantNewOrderAlert,
  sendOrderConfirmation,
  sendPaymentFailedEmail,
  sendRefundConfirmationEmail,
} from "../../../utils/ecommerce/ecommerceEmailService.ts";
import type {
  EcommerceEmailDeliveryResult,
  EcommerceEmailEvent,
  EcommerceEmailRenderContext,
} from "../../../types/ecommerceEmail.ts";

type SupabaseClient = any;

interface PaidOrderEmailArgs {
  supabase: SupabaseClient;
  order: Record<string, any>;
  paidAt: string;
  providerEventId?: string | null;
  resendApiKey?: string | null;
  defaultFromEmail: string;
}

interface PaymentFailedEmailArgs {
  supabase: SupabaseClient;
  order: Record<string, any>;
  failedAt: string;
  eventId?: string | null;
  resendApiKey?: string | null;
  defaultFromEmail: string;
}

interface OrderLifecycleEmailArgs {
  supabase: SupabaseClient;
  order: Record<string, any>;
  occurredAt: string;
  eventId?: string | null;
  providerEventId?: string | null;
  resendApiKey?: string | null;
  defaultFromEmail: string;
}

export type EcommerceTransactionalEmailResult = EcommerceEmailDeliveryResult;

export async function sendPaidOrderTransactionalEmails({
  supabase,
  order,
  paidAt,
  providerEventId,
  resendApiKey,
  defaultFromEmail,
}: PaidOrderEmailArgs): Promise<EcommerceTransactionalEmailResult[]> {
  const repository = createSupabaseEcommerceEmailRepository(supabase);
  const provider = createResendEcommerceEmailProvider(resendApiKey);
  const context = await buildOrderEmailContext(supabase, order, {
    status: "paid",
    paymentIntentId: readPaymentIntentId(order),
  });
  const event = createOrderEmailEvent(order, "payment_succeeded", {
    createdAt: paidAt,
    providerEventId: providerEventId || readPaymentIntentId(order),
    payload: {
      paymentIntentId: readPaymentIntentId(order),
      orderId: order.id,
    },
  });
  const eventId = event.eventId;
  const eventContext = { ...context, event };
  const results: EcommerceTransactionalEmailResult[] = [];

  results.push(await sendOrderConfirmation({
    repository,
    provider,
    defaultFromEmail,
    context: eventContext,
    eventId,
    now: paidAt,
  }));
  results.push(await sendMerchantNewOrderAlert({
    repository,
    provider,
    defaultFromEmail,
    context: eventContext,
    eventId,
    now: paidAt,
  }));

  const lowStockProducts = await loadLowStockProductsForOrder(supabase, order);
  for (const product of lowStockProducts) {
    results.push(await sendLowStockAlert({
      repository,
      provider,
      defaultFromEmail,
      context: {
        ...eventContext,
        products: [product],
        event: createOrderEmailEvent(order, "low_stock", {
          createdAt: paidAt,
          providerEventId: `${eventId}:${product.id || product.product_id || "product"}`,
          payload: {
            productId: product.id || product.product_id,
            currentQuantity: readQuantity(product),
            threshold: readLowStockThreshold(product),
          },
        }),
      },
      product,
      currentQuantity: readQuantity(product),
      threshold: readLowStockThreshold(product),
      eventId,
      now: paidAt,
    }));
  }

  return results;
}

export async function sendPaymentFailedTransactionalEmail({
  supabase,
  order,
  failedAt,
  eventId,
  resendApiKey,
  defaultFromEmail,
}: PaymentFailedEmailArgs): Promise<EcommerceTransactionalEmailResult> {
  const repository = createSupabaseEcommerceEmailRepository(supabase);
  const provider = createResendEcommerceEmailProvider(resendApiKey);
  const context = await buildOrderEmailContext(supabase, order, {
    status: "failed",
    paymentIntentId: readPaymentIntentId(order),
    failureCode: order.stripe?.failureCode || order.data?.stripe?.failureCode || null,
    failureMessage: order.stripe?.failureMessage || order.data?.stripe?.failureMessage || null,
  });
  const event = createOrderEmailEvent(order, "payment_failed", {
    createdAt: failedAt,
    providerEventId: eventId || readPaymentIntentId(order),
    payload: {
      paymentIntentId: readPaymentIntentId(order),
      failureCode: order.stripe?.failureCode || order.data?.stripe?.failureCode || null,
    },
  });

  return sendPaymentFailedEmail({
    repository,
    provider,
    defaultFromEmail,
    context: { ...context, event },
    eventId: event.eventId,
    now: failedAt,
  });
}

export async function sendFulfillmentTransactionalEmail({
  supabase,
  order,
  occurredAt,
  eventId,
  providerEventId,
  resendApiKey,
  defaultFromEmail,
}: OrderLifecycleEmailArgs): Promise<EcommerceTransactionalEmailResult> {
  const repository = createSupabaseEcommerceEmailRepository(supabase);
  const provider = createResendEcommerceEmailProvider(resendApiKey);
  const context = await buildOrderEmailContext(supabase, order, {
    status: "paid",
    paymentIntentId: readPaymentIntentId(order),
  });
  const event = createOrderEmailEvent(order, "order_fulfilled", {
    createdAt: occurredAt,
    providerEventId: providerEventId || eventId || order.shipped_at || order.delivered_at || occurredAt,
    payload: {
      trackingNumber: order.tracking_number || order.data?.trackingNumber || null,
      trackingUrl: order.tracking_url || order.data?.trackingUrl || null,
      carrier: order.carrier || order.data?.carrier || null,
    },
  });

  return sendFulfillmentConfirmationEmail({
    repository,
    provider,
    defaultFromEmail,
    context: { ...context, event },
    eventId: event.eventId,
    now: occurredAt,
  });
}

export async function sendRefundTransactionalEmail({
  supabase,
  order,
  occurredAt,
  eventId,
  providerEventId,
  resendApiKey,
  defaultFromEmail,
}: OrderLifecycleEmailArgs): Promise<EcommerceTransactionalEmailResult> {
  const repository = createSupabaseEcommerceEmailRepository(supabase);
  const provider = createResendEcommerceEmailProvider(resendApiKey);
  const context = await buildOrderEmailContext(supabase, order, {
    status: "refunded",
    paymentIntentId: readPaymentIntentId(order),
  });
  const event = createOrderEmailEvent(order, "order_refunded", {
    createdAt: occurredAt,
    providerEventId: providerEventId || eventId || order.data?.stripe?.lastRefundId || occurredAt,
    payload: {
      refundId: order.data?.stripe?.lastRefundId || null,
      refundedAmount: order.refunded_amount || order.data?.refundedAmount || null,
    },
  });

  return sendRefundConfirmationEmail({
    repository,
    provider,
    defaultFromEmail,
    context: { ...context, event },
    eventId: event.eventId,
    now: occurredAt,
  });
}

function createOrderEmailEvent(
  order: Record<string, any>,
  eventType: EcommerceEmailEvent["eventType"],
  options: {
    createdAt: string;
    providerEventId?: string | null;
    payload?: Record<string, unknown>;
  },
): EcommerceEmailEvent {
  const orderData = readObject(order.data);
  const projectId = String(order.project_id || order.projectId || orderData.projectId || "");

  return normalizeEcommerceEmailEvent({
    eventType,
    projectId,
    tenantId: order.tenant_id || order.tenantId || orderData.tenantId || null,
    storeId: order.store_id || order.storeId || orderData.storeId || projectId || null,
    engineStoreId: order.store_id || order.storeId || orderData.engineStoreId || orderData.storeId || null,
    orderId: order.id || order.orderId || null,
    checkoutSessionId: order.checkout_session_id || order.checkoutSessionId || orderData.checkoutSessionId || null,
    customerId: order.customer_id || order.customerId || orderData.customerId || null,
    recipientEmail: order.customer_email || orderData.customerEmail || null,
    recipientName: order.customer_name || orderData.customerName || null,
    providerEventId: options.providerEventId,
    payload: {
      orderId: order.id || order.orderId || null,
      orderNumber: order.order_number || order.orderNumber || null,
      ...(options.payload || {}),
    },
    createdAt: options.createdAt,
  });
}

async function buildOrderEmailContext(
  supabase: SupabaseClient,
  order: Record<string, any>,
  payment: Record<string, unknown>,
): Promise<EcommerceEmailRenderContext> {
  const projectId = String(order.project_id || order.projectId || order.data?.projectId || "");
  const [storeSettings, store] = await Promise.all([
    loadStoreSettings(supabase, projectId, order),
    loadPublicStore(supabase, order),
  ]);
  const orderData = readObject(order.data);
  const items = readItems(order);
  const totals = readTotals(order);

  return {
    store: {
      ...(store || {}),
      name: store?.name || storeSettings?.store_name || storeSettings?.data?.storeName || orderData.storeName,
      storeId: order.store_id || orderData.storeId || store?.id,
      publicStoreId: order.public_store_id || orderData.publicStoreId || store?.id,
    },
    order,
    customer: {
      id: order.customer_id || orderData.customerId || null,
      email: order.customer_email || orderData.customerEmail || null,
      name: order.customer_name || orderData.customerName || null,
    },
    items,
    totals,
    shipping: readObject(order.shipping_address || orderData.shippingAddress),
    payment,
    products: [],
    settings: {
      ...(storeSettings || {}),
      merchantEmail: readMerchantEmail(storeSettings),
      ordersUrl: "/ecommerce/orders",
      productsUrl: "/ecommerce/products",
    },
  };
}

async function loadStoreSettings(supabase: SupabaseClient, projectId: string, order: Record<string, any>) {
  if (!projectId && !order.store_id && !order.public_store_id) return null;
  const filters = [];
  if (projectId) filters.push(`project_id.eq.${projectId}`);
  if (order.store_id) filters.push(`store_id.eq.${order.store_id}`);
  if (order.public_store_id) filters.push(`public_store_id.eq.${order.public_store_id}`);
  if (filters.length === 0) return null;

  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .or(filters.join(","))
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function loadPublicStore(supabase: SupabaseClient, order: Record<string, any>) {
  const publicStoreId = order.public_store_id || order.data?.publicStoreId || order.store_id || null;
  if (!publicStoreId) return null;

  const { data, error } = await supabase
    .from("public_stores")
    .select("*")
    .eq("id", publicStoreId)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

async function loadLowStockProductsForOrder(supabase: SupabaseClient, order: Record<string, any>) {
  const products: Record<string, any>[] = [];
  const seen = new Set<string>();
  const projectId = order.project_id || order.projectId || order.data?.projectId || null;

  for (const item of readItems(order)) {
    const productId = item.productId || item.product_id;
    if (!productId || seen.has(String(productId))) continue;
    seen.add(String(productId));

    let query = supabase
      .from("store_products")
      .select("*")
      .eq("id", String(productId));
    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query.maybeSingle();
    if (error || !data || !isTracked(data)) continue;

    const quantity = readQuantity(data);
    const threshold = readLowStockThreshold(data);
    if (threshold > 0 && quantity <= threshold) {
      products.push(data);
    }
  }

  return products;
}

function readItems(order: Record<string, any>) {
  if (Array.isArray(order.items)) return order.items;
  if (Array.isArray(order.data?.items)) return order.data.items;
  return [];
}

function readTotals(order: Record<string, any>) {
  const data = readObject(order.data);
  const pricing = readObject(order.pricing || data.pricing);
  return {
    subtotal: order.subtotal ?? data.subtotal ?? pricing.subtotal,
    shippingTotal: order.shipping_amount ?? order.shipping_cost ?? data.shippingCost ?? pricing.shippingTotal,
    taxTotal: order.tax_amount ?? data.taxAmount ?? pricing.taxTotal,
    total: order.total_amount ?? order.total ?? data.total ?? pricing.total,
    currency: order.currency ?? data.currency ?? "USD",
  };
}

function readPaymentIntentId(order: Record<string, any>) {
  return order.payment_intent_id
    || order.stripe_payment_intent_id
    || order.data?.stripe?.paymentIntentId
    || null;
}

function readMerchantEmail(settings: Record<string, any> | null) {
  if (!settings) return "";
  const data = readObject(settings.data);
  return String(
    settings.order_notification_email
      || settings.orderNotificationEmail
      || settings.store_email
      || settings.storeEmail
      || settings.contact_email
      || settings.contactEmail
      || data.orderNotificationEmail
      || data.storeEmail
      || data.contactEmail
      || "",
  ).trim().toLowerCase();
}

function readQuantity(product: Record<string, any>) {
  const data = readObject(product.data);
  return toNumber(product.quantity ?? product.inventory_quantity ?? data.quantity ?? data.inventoryQuantity, 0);
}

function readLowStockThreshold(product: Record<string, any>) {
  const data = readObject(product.data);
  return toNumber(product.low_stock_threshold ?? data.lowStockThreshold ?? data.low_stock_threshold, 0);
}

function isTracked(product: Record<string, any>) {
  const data = readObject(product.data);
  return product.track_inventory === true || data.trackInventory === true || data.track_inventory === true;
}

function readObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
