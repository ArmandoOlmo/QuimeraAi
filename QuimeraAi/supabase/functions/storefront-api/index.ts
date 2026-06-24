import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...payload } = await req.json();
    let result;

    switch (action) {
      case "createStoreCashOrder":
        result = await createStoreCashOrder(payload);
        break;
      case "getStoreOrderStatus":
      case "trackOrder":
        result = await getStoreOrderStatus(payload);
        break;
      case "markStoreReviewHelpful":
        result = await markStoreReviewHelpful(payload);
        break;
      case "storeStockNotifications-list":
        result = await listStoreStockNotifications(payload);
        break;
      case "storeStockNotifications-subscribe":
        result = await subscribeStoreStockNotification(payload);
        break;
      case "storeStockNotifications-unsubscribe":
        result = await unsubscribeStoreStockNotification(payload);
        break;
      default:
        throw new Error("Unknown action");
    }

    return json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Storefront API error";
    console.error("[storefront-api]", error);
    return json({ error: message }, 400);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email: unknown) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeMoney(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? Math.max(0, numberValue) : 0;
}

function randomToken(prefix = "ord_") {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const raw = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${prefix}${raw}`;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function makeStockNotificationId(storeId: string, productId: string, email: string) {
  return `${storeId}_${productId}_${email.replace(/[^a-z0-9]/g, "_")}`;
}

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  const image = images[0];
  if (typeof image === "string") return image;
  if (image && typeof image === "object" && "url" in image) return String((image as { url?: unknown }).url || "");
  return null;
}

async function getStoreContext(storeId: string) {
  if (!storeId) throw new Error("storeId is required");

  const { data: publicStore, error: publicStoreError } = await supabase
    .from("public_stores")
    .select("id, user_id, data")
    .eq("id", storeId)
    .maybeSingle();

  if (publicStoreError) throw publicStoreError;

  const projectId = String(publicStore?.data?.projectId || publicStore?.id || storeId);
  const { data: settings, error: settingsError } = await supabase
    .from("store_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (settingsError) throw settingsError;
  if (!settings) throw new Error("Store settings not found");

  return {
    storeId,
    projectId,
    ownerId: publicStore?.user_id || null,
    settings: {
      cashOnDeliveryEnabled: settings.cash_on_delivery_enabled ?? settings.data?.cashOnDeliveryEnabled ?? false,
      currency: settings.currency || settings.data?.currency || "USD",
      shippingZones: settings.shipping_zones || settings.data?.shippingZones || [],
      freeShippingThreshold: settings.free_shipping_threshold ?? settings.data?.freeShippingThreshold,
      taxEnabled: settings.tax_enabled ?? settings.data?.taxEnabled ?? false,
      taxRate: Number(settings.tax_rate ?? settings.data?.taxRate ?? 0),
    },
  };
}

function normalizeProduct(row: any) {
  const data = row?.data || {};
  return {
    id: row.id,
    name: row.name || data.name || "Product",
    status: row.status || data.status || "draft",
    price: normalizeMoney(row.price ?? data.price),
    quantity: Number(row.quantity ?? data.quantity ?? 0),
    trackInventory: row.track_inventory ?? data.trackInventory ?? data.track_inventory ?? true,
    hasVariants: row.has_variants ?? data.hasVariants ?? false,
    variants: Array.isArray(row.variants || data.variants) ? row.variants || data.variants : [],
    images: row.images || data.images || [],
  };
}

async function getStoreProduct(projectId: string, productId: string) {
  const { data, error } = await supabase
    .from("store_products")
    .select("*")
    .eq("id", productId)
    .or(`project_id.eq.${projectId},store_id.eq.${projectId}`)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Product ${productId} not found`);
  return normalizeProduct(data);
}

async function buildCashOrder(data: any) {
  const context = await getStoreContext(String(data.storeId || ""));
  if (!context.settings.cashOnDeliveryEnabled) throw new Error("Cash on delivery is not enabled for this store");

  const email = normalizeEmail(data.customerEmail);
  if (!isValidEmail(email)) throw new Error("A valid customer email is required");
  if (!String(data.customerName || "").trim()) throw new Error("Customer name is required");
  if (!Array.isArray(data.items) || data.items.length === 0) throw new Error("Cart is empty");

  let subtotal = 0;
  const canonicalItems = [];

  for (const item of data.items) {
    const quantity = Number(item.quantity || 0);
    if (!item.productId || quantity <= 0 || quantity > 100) throw new Error("Invalid cart item");

    const product = await getStoreProduct(context.projectId, String(item.productId));
    if (product.status !== "active") throw new Error(`Product ${product.name} is not available`);

    let price = product.price;
    let availableQuantity = product.quantity;
    let variantName: string | null = null;
    if (item.variantId && product.hasVariants) {
      const variant = product.variants.find((candidate: any) => candidate.id === item.variantId);
      if (!variant) throw new Error("Variant not found");
      price = normalizeMoney(variant.price || price);
      availableQuantity = Number(variant.quantity || 0);
      variantName = variant.name || null;
    }

    if (product.trackInventory !== false && availableQuantity < quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    const totalPrice = price * quantity;
    subtotal += totalPrice;
    canonicalItems.push({
      productId: String(item.productId),
      variantId: item.variantId || null,
      name: variantName ? `${product.name} - ${variantName}` : product.name,
      productName: product.name,
      variantName,
      imageUrl: firstImage(product.images),
      quantity,
      unitPrice: price,
      totalPrice,
    });
  }

  const zones = Array.isArray(context.settings.shippingZones) ? context.settings.shippingZones : [];
  const configuredRates = zones.flatMap((zone: any) => Array.isArray(zone.rates) ? zone.rates : []);
  const allRates = configuredRates.length > 0
    ? configuredRates
    : [
      { id: "standard", name: "Envio Estandar", price: 99 },
      { id: "express", name: "Envio Express", price: 199 },
      { id: "overnight", name: "Entrega al Siguiente Dia", price: 349 },
    ];
  const selectedRate = allRates.find((rate: any) => rate.id === data.shippingMethodId) || allRates[0];
  let shippingCost = normalizeMoney(selectedRate?.price);
  let shippingMethod = selectedRate?.name || "Standard";

  if (context.settings.freeShippingThreshold && subtotal >= Number(context.settings.freeShippingThreshold)) {
    shippingCost = 0;
    shippingMethod = "Free Shipping";
  }

  const taxAmount = context.settings.taxEnabled ? subtotal * (Number(context.settings.taxRate || 0) / 100) : 0;
  const total = Math.max(0, subtotal + shippingCost + taxAmount);
  const accessToken = randomToken("ord_");
  const orderAccessTokenHash = await sha256(accessToken);
  const idempotencyKey = String(data.idempotencyKey || `cod_${Date.now()}`);
  const orderNumber = `ORD-${idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 32).toUpperCase()}`;
  const currency = String(context.settings.currency || "USD").toUpperCase();
  const cartHash = await sha256(JSON.stringify({ items: data.items, shippingMethodId: data.shippingMethodId, total }));
  const timestamp = nowIso();

  const orderData = {
    orderNumber,
    customerEmail: email,
    customerName: String(data.customerName || "").trim(),
    customerPhone: data.customerPhone || null,
    items: canonicalItems,
    subtotal,
    discount: 0,
    discountAmount: 0,
    shippingCost,
    taxAmount,
    total,
    currency,
    shippingAddress: data.shippingAddress,
    billingAddress: data.billingAddress || data.shippingAddress,
    status: "confirmed",
    paymentStatus: "pending",
    fulfillmentStatus: "unfulfilled",
    paymentMethod: "cod",
    shippingMethod,
    notes: data.notes || null,
    checkoutIdempotencyKey: idempotencyKey,
    orderAccessTokenHash,
    cartHash,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return { context, orderData, accessToken, cartHash };
}

async function createStoreCashOrder(data: any) {
  const { context, orderData, accessToken, cartHash } = await buildCashOrder(data);
  const { data: inserted, error } = await supabase
    .from("store_orders")
    .insert({
      store_id: context.storeId,
      user_id: context.ownerId,
      project_id: context.projectId,
      order_number: orderData.orderNumber,
      customer_email: orderData.customerEmail,
      customer_name: orderData.customerName,
      customer_phone: orderData.customerPhone,
      subtotal: orderData.subtotal,
      discount: 0,
      discount_amount: 0,
      shipping_cost: orderData.shippingCost,
      tax_amount: orderData.taxAmount,
      total: orderData.total,
      currency: orderData.currency,
      items: orderData.items,
      pricing: {
        subtotal: orderData.subtotal,
        discountTotal: 0,
        shippingTotal: orderData.shippingCost,
        taxTotal: orderData.taxAmount,
        platformFeeTotal: 0,
        total: orderData.total,
      },
      checkout_idempotency_key: orderData.checkoutIdempotencyKey,
      cart_hash: cartHash,
      shipping_address: orderData.shippingAddress,
      billing_address: orderData.billingAddress,
      status: "confirmed",
      payment_status: "pending",
      fulfillment_status: "unfulfilled",
      payment_method: "cod",
      shipping_method: orderData.shippingMethod,
      notes: orderData.notes,
      customer_notes: orderData.notes,
      data: orderData,
    })
    .select("id, order_number, total")
    .single();

  if (error) throw error;
  return {
    success: true,
    orderId: inserted.id,
    orderNumber: inserted.order_number || orderData.orderNumber,
    orderAccessToken: accessToken,
    total: Number(inserted.total ?? orderData.total ?? 0),
    cartHash,
  };
}

async function getStoreOrderStatus(data: any) {
  const storeId = String(data.storeId || "");
  const email = normalizeEmail(data.email || data.customerEmail);
  const providedToken = String(data.orderAccessToken || data.token || "");
  let query = supabase.from("store_orders").select("*");

  if (data.orderId) query = query.eq("id", data.orderId);
  else if (data.orderNumber) query = query.eq("order_number", data.orderNumber);
  else throw new Error("orderId or orderNumber is required");

  if (storeId) query = query.or(`store_id.eq.${storeId},project_id.eq.${storeId}`);

  const { data: order, error } = await query.maybeSingle();
  if (error) throw error;
  if (!order) throw new Error("Order not found");

  const orderData = order.data || order;
  const accessHash = orderData.orderAccessTokenHash;
  const tokenMatches = Boolean(accessHash && providedToken && await sha256(providedToken) === accessHash);
  const emailMatches = Boolean(email && String(order.customer_email || orderData.customerEmail || "").toLowerCase() === email);

  if (accessHash && !tokenMatches && !emailMatches) throw new Error("Invalid order token or email");
  if (!accessHash && !emailMatches) throw new Error("Order email is required");

  return {
    id: order.id,
    storeId: order.store_id || orderData.storeId,
    orderNumber: order.order_number || orderData.orderNumber,
    status: order.status || orderData.status,
    paymentStatus: order.payment_status || orderData.paymentStatus,
    fulfillmentStatus: order.fulfillment_status || orderData.fulfillmentStatus,
    customerEmail: order.customer_email || orderData.customerEmail,
    customerName: order.customer_name || orderData.customerName,
    customerPhone: order.customer_phone || orderData.customerPhone,
    total: Number(order.total ?? orderData.total ?? 0),
    subtotal: Number(order.subtotal ?? orderData.subtotal ?? 0),
    discountAmount: Number(order.discount_amount ?? orderData.discountAmount ?? 0),
    shippingCost: Number(order.shipping_cost ?? orderData.shippingCost ?? 0),
    taxAmount: Number(order.tax_amount ?? orderData.taxAmount ?? 0),
    currency: order.currency || orderData.currency || "USD",
    items: orderData.items || [],
    shippingAddress: order.shipping_address || orderData.shippingAddress,
    billingAddress: order.billing_address || orderData.billingAddress,
    paymentMethod: order.payment_method || orderData.paymentMethod,
    shippingMethod: order.shipping_method || orderData.shippingMethod,
    trackingNumber: order.tracking_number || orderData.trackingNumber,
    trackingUrl: order.tracking_url || orderData.trackingUrl,
    carrier: order.carrier || orderData.carrier,
    createdAt: order.created_at || orderData.createdAt,
    updatedAt: order.updated_at || orderData.updatedAt || order.created_at || orderData.createdAt,
  };
}

async function markStoreReviewHelpful(data: any) {
  const storeId = String(data.storeId || "");
  const reviewId = String(data.reviewId || "");
  if (!storeId || !reviewId) throw new Error("storeId and reviewId are required");

  const { data: review, error: fetchError } = await supabase
    .from("store_reviews")
    .select("id, project_id, status, helpful_votes")
    .eq("id", reviewId)
    .eq("project_id", storeId)
    .eq("status", "approved")
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!review) throw new Error("Review not found");

  const { data: updated, error } = await supabase
    .from("store_reviews")
    .update({ helpful_votes: Number(review.helpful_votes || 0) + 1, updated_at: nowIso() })
    .eq("id", reviewId)
    .eq("project_id", storeId)
    .select("id, helpful_votes")
    .single();

  if (error) throw error;
  return { success: true, reviewId: updated.id, helpfulVotes: Number(updated.helpful_votes || 0) };
}

async function listStoreStockNotifications(data: any) {
  const context = await getStoreContext(String(data.storeId || ""));
  const email = normalizeEmail(data.email);
  if (!isValidEmail(email)) throw new Error("A valid email is required");

  const { data: notifications, error } = await supabase
    .from("store_stock_notifications")
    .select("*")
    .eq("store_id", context.projectId)
    .eq("email", email)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { success: true, notifications: notifications || [] };
}

async function subscribeStoreStockNotification(data: any) {
  const context = await getStoreContext(String(data.storeId || ""));
  const productId = String(data.productId || "");
  const email = normalizeEmail(data.email);
  if (!productId || !isValidEmail(email)) throw new Error("productId and a valid email are required");

  const product = await getStoreProduct(context.projectId, productId);
  if (product.status !== "active") throw new Error("Product is not available");

  const payload = {
    id: makeStockNotificationId(context.storeId, productId, email),
    store_id: context.projectId,
    project_id: context.projectId,
    product_id: productId,
    product_name: data.productName || product.name,
    product_slug: data.productSlug || productId,
    product_image: data.productImage || firstImage(product.images),
    email,
    notified: false,
    updated_at: nowIso(),
  };

  const { data: notification, error } = await supabase
    .from("store_stock_notifications")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return { success: true, notification };
}

async function unsubscribeStoreStockNotification(data: any) {
  const context = await getStoreContext(String(data.storeId || ""));
  const productId = String(data.productId || "");
  const email = normalizeEmail(data.email);
  if (!productId || !isValidEmail(email)) throw new Error("productId and a valid email are required");

  const { error } = await supabase
    .from("store_stock_notifications")
    .delete()
    .eq("id", makeStockNotificationId(context.storeId, productId, email))
    .eq("store_id", context.projectId);

  if (error) throw error;
  return { success: true };
}
