type SupabaseClient = any;

export type EcommerceTransactionalTemplateId = "order-confirmation" | "new-order-admin";

export interface EcommerceTransactionalEmailResult {
  templateId: EcommerceTransactionalTemplateId;
  recipientEmail?: string;
  status: "sent" | "failed" | "skipped";
  reason?: string;
  providerMessageId?: string;
}

interface SendPaidOrderTransactionalEmailsArgs {
  supabase: SupabaseClient;
  order: Record<string, any>;
  paidAt: string;
  resendApiKey?: string | null;
  defaultFromEmail: string;
}

interface EmailRenderContext {
  order: Record<string, any>;
  orderData: Record<string, any>;
  storeSettings: Record<string, any>;
  emailSettings: Record<string, any>;
  projectId: string;
}

const DEFAULT_PRIMARY_COLOR = "#4f46e5";

export async function sendPaidOrderTransactionalEmails({
  supabase,
  order,
  paidAt,
  resendApiKey,
  defaultFromEmail,
}: SendPaidOrderTransactionalEmailsArgs): Promise<EcommerceTransactionalEmailResult[]> {
  const projectId = String(order.project_id || order.projectId || order.data?.projectId || "");
  if (!projectId) {
    return [{ templateId: "order-confirmation", status: "skipped", reason: "Missing project id" }];
  }

  const [storeSettings, emailSettings] = await Promise.all([
    loadStoreSettings(supabase, projectId),
    loadEmailSettings(supabase, projectId),
  ]);
  const orderData = readObject(order.data);
  const context: EmailRenderContext = { order, orderData, storeSettings, emailSettings, projectId };
  const results: EcommerceTransactionalEmailResult[] = [];

  if (shouldSendOrderConfirmation(context)) {
    results.push(await sendTransactionalTemplate({
      supabase,
      context,
      paidAt,
      resendApiKey,
      defaultFromEmail,
      templateId: "order-confirmation",
      recipientEmail: readCustomerEmail(context),
      recipientName: readCustomerName(context),
      subject: `Pedido ${readOrderNumber(context)} confirmado`,
      html: renderCustomerOrderConfirmation(context),
    }));
  } else {
    results.push({ templateId: "order-confirmation", status: "skipped", reason: "Order confirmation disabled" });
  }

  const adminEmail = readAdminNotificationEmail(context);
  if (shouldSendAdminOrderNotification(context) && adminEmail) {
    results.push(await sendTransactionalTemplate({
      supabase,
      context,
      paidAt,
      resendApiKey,
      defaultFromEmail,
      templateId: "new-order-admin",
      recipientEmail: adminEmail,
      recipientName: readStoreName(context),
      subject: `Nueva orden ${readOrderNumber(context)}`,
      html: renderAdminOrderNotification(context),
    }));
  } else {
    results.push({
      templateId: "new-order-admin",
      status: "skipped",
      reason: adminEmail ? "Admin notification disabled" : "Missing admin notification email",
    });
  }

  return results;
}

async function loadStoreSettings(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("project_id", projectId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return readObject(data);
}

async function loadEmailSettings(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("email_settings")
    .select("*")
    .or(`project_id.eq.${projectId},store_id.eq.${projectId}`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return readObject(data);
}

function readObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function readJsonObject(row: Record<string, any>) {
  return readObject(row.data);
}

function readField(row: Record<string, any>, ...keys: string[]) {
  const data = readJsonObject(row);
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
    if (data[key] !== undefined && data[key] !== null) return data[key];
  }
  return undefined;
}

function readTransactionalSettings(context: EmailRenderContext) {
  return readObject(readField(context.emailSettings, "transactional"));
}

function shouldSendOrderConfirmation(context: EmailRenderContext) {
  const transactional = readTransactionalSettings(context);
  const storeToggle = readField(context.storeSettings, "send_order_confirmation", "sendOrderConfirmation");
  return storeToggle !== false && transactional.orderConfirmation !== false && Boolean(readCustomerEmail(context));
}

function shouldSendAdminOrderNotification(context: EmailRenderContext) {
  const transactional = readTransactionalSettings(context);
  const storeToggle = readField(context.storeSettings, "notify_on_new_order", "notifyOnNewOrder");
  return storeToggle !== false && transactional.newOrderNotification !== false;
}

function readOrderItems(context: EmailRenderContext): any[] {
  if (Array.isArray(context.order.items)) return context.order.items;
  if (Array.isArray(context.orderData.items)) return context.orderData.items;
  return [];
}

function readOrderNumber(context: EmailRenderContext) {
  return String(context.order.order_number || context.orderData.orderNumber || context.order.id || "");
}

function readCustomerEmail(context: EmailRenderContext) {
  return String(context.order.customer_email || context.orderData.customerEmail || "").trim().toLowerCase();
}

function readCustomerName(context: EmailRenderContext) {
  return String(context.order.customer_name || context.orderData.customerName || readCustomerEmail(context) || "Cliente");
}

function readStoreName(context: EmailRenderContext) {
  return String(readField(context.storeSettings, "store_name", "storeName") || "Quimera Store");
}

function readAdminNotificationEmail(context: EmailRenderContext) {
  return String(
    readField(context.storeSettings, "order_notification_email", "orderNotificationEmail")
      || readField(context.storeSettings, "store_email", "storeEmail")
      || readField(context.emailSettings, "reply_to", "replyTo")
      || readField(context.emailSettings, "from_email", "fromEmail")
      || "",
  ).trim().toLowerCase();
}

function readCurrency(context: EmailRenderContext) {
  return String(context.order.currency || context.orderData.currency || readField(context.storeSettings, "currency") || "USD").toUpperCase();
}

function readCurrencySymbol(context: EmailRenderContext) {
  return String(readField(context.storeSettings, "currency_symbol", "currencySymbol") || "$");
}

function readTotal(context: EmailRenderContext) {
  return Number(context.order.total ?? context.orderData.total ?? context.orderData.pricing?.total ?? 0);
}

function readSubtotal(context: EmailRenderContext) {
  return Number(context.order.subtotal ?? context.orderData.subtotal ?? context.orderData.pricing?.subtotal ?? 0);
}

function readShipping(context: EmailRenderContext) {
  return Number(context.order.shipping_cost ?? context.orderData.shippingCost ?? context.orderData.pricing?.shippingTotal ?? 0);
}

function readTax(context: EmailRenderContext) {
  return Number(context.order.tax_amount ?? context.orderData.taxAmount ?? context.orderData.pricing?.taxTotal ?? 0);
}

function readDiscount(context: EmailRenderContext) {
  return Number(context.order.discount_amount ?? context.order.discount ?? context.orderData.discountAmount ?? context.orderData.discount ?? 0);
}

function money(value: number, context: EmailRenderContext) {
  const currency = readCurrency(context);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch (_error) {
    return `${readCurrencySymbol(context)}${value.toFixed(2)}`;
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveFrom(context: EmailRenderContext, defaultFromEmail: string) {
  const fromEmail = String(readField(context.emailSettings, "from_email", "fromEmail") || "").trim();
  const fromName = String(readField(context.emailSettings, "from_name", "fromName") || readStoreName(context)).trim();
  if (!fromEmail) return defaultFromEmail;
  return fromName ? `${fromName} <${fromEmail}>` : fromEmail;
}

function readReplyTo(context: EmailRenderContext) {
  return String(readField(context.emailSettings, "reply_to", "replyTo") || "").trim() || undefined;
}

function renderBaseEmail(title: string, body: string, context: EmailRenderContext) {
  const primaryColor = String(readField(context.emailSettings, "primary_color", "primaryColor") || DEFAULT_PRIMARY_COLOR);
  const footerText = String(readField(context.emailSettings, "footer_text", "footerText") || `Gracias por comprar en ${readStoreName(context)}.`);
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:24px;border-bottom:1px solid #e5e7eb;">
                <div style="font-size:14px;color:#6b7280;">${escapeHtml(readStoreName(context))}</div>
                <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25;color:#111827;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">${body}</td>
            </tr>
            <tr>
              <td style="padding:18px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
                <div style="border-left:4px solid ${escapeHtml(primaryColor)};padding-left:12px;">${escapeHtml(footerText)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderItemsTable(context: EmailRenderContext) {
  const rows = readOrderItems(context).map((item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice ?? item.unit_price ?? item.price ?? 0);
    const totalPrice = Number(item.totalPrice ?? item.total_price ?? unitPrice * quantity);
    const name = item.name || item.productName || item.product_name || "Producto";
    const variant = item.variantName || item.variant_name;
    return `<tr>
      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
        <div style="font-weight:600;color:#111827;">${escapeHtml(name)}</div>
        ${variant ? `<div style="font-size:12px;color:#6b7280;">${escapeHtml(variant)}</div>` : ""}
      </td>
      <td align="center" style="padding:12px 8px;border-bottom:1px solid #e5e7eb;color:#374151;">${quantity}</td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#111827;">${money(totalPrice, context)}</td>
    </tr>`;
  }).join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <thead>
      <tr>
        <th align="left" style="padding:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;">Producto</th>
        <th align="center" style="padding:0 8px 8px;color:#6b7280;font-size:12px;text-transform:uppercase;">Qty</th>
        <th align="right" style="padding:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderTotals(context: EmailRenderContext) {
  const discount = readDiscount(context);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
    <tr><td style="padding:4px 0;color:#6b7280;">Subtotal</td><td align="right" style="padding:4px 0;">${money(readSubtotal(context), context)}</td></tr>
    ${discount > 0 ? `<tr><td style="padding:4px 0;color:#6b7280;">Descuento</td><td align="right" style="padding:4px 0;">-${money(discount, context)}</td></tr>` : ""}
    <tr><td style="padding:4px 0;color:#6b7280;">Envio</td><td align="right" style="padding:4px 0;">${money(readShipping(context), context)}</td></tr>
    <tr><td style="padding:4px 0;color:#6b7280;">Impuestos</td><td align="right" style="padding:4px 0;">${money(readTax(context), context)}</td></tr>
    <tr><td style="padding:12px 0 0;font-weight:700;border-top:1px solid #e5e7eb;">Total</td><td align="right" style="padding:12px 0 0;font-weight:700;border-top:1px solid #e5e7eb;">${money(readTotal(context), context)}</td></tr>
  </table>`;
}

function renderCustomerOrderConfirmation(context: EmailRenderContext) {
  const body = `
    <p style="margin:0 0 16px;">Hola ${escapeHtml(readCustomerName(context))}, recibimos tu pago y estamos preparando tu orden.</p>
    <p style="margin:0 0 20px;color:#374151;">Orden <strong>${escapeHtml(readOrderNumber(context))}</strong></p>
    ${renderItemsTable(context)}
    ${renderTotals(context)}
  `;
  return renderBaseEmail("Tu orden esta confirmada", body, context);
}

function renderAdminOrderNotification(context: EmailRenderContext) {
  const body = `
    <p style="margin:0 0 16px;">Hay una nueva orden pagada lista para procesar.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td style="padding:4px 0;color:#6b7280;">Orden</td><td align="right">${escapeHtml(readOrderNumber(context))}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Cliente</td><td align="right">${escapeHtml(readCustomerName(context))}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Email</td><td align="right">${escapeHtml(readCustomerEmail(context))}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280;">Total</td><td align="right"><strong>${money(readTotal(context), context)}</strong></td></tr>
    </table>
    ${renderItemsTable(context)}
  `;
  return renderBaseEmail("Nueva orden pagada", body, context);
}

async function claimOrderEmailNotification(
  supabase: SupabaseClient,
  orderId: string,
  templateId: EcommerceTransactionalTemplateId,
  recipientEmail: string,
  at: string,
) {
  const current = await loadLatestOrderData(supabase, orderId);
  const notifications = readObject(current.emailNotifications);
  const existing = readObject(notifications[templateId]);
  if (["sending", "sent"].includes(String(existing.status || ""))) {
    return { claimed: false, reason: `Already ${existing.status}` };
  }

  await updateOrderEmailNotification(supabase, orderId, current, templateId, {
    status: "sending",
    recipientEmail,
    startedAt: at,
  }, at);
  return { claimed: true };
}

async function loadLatestOrderData(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from("store_orders")
    .select("data")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return readObject(data?.data);
}

async function updateOrderEmailNotification(
  supabase: SupabaseClient,
  orderId: string,
  orderData: Record<string, any>,
  templateId: EcommerceTransactionalTemplateId,
  update: Record<string, unknown>,
  at: string,
) {
  const notifications = readObject(orderData.emailNotifications);
  const previous = readObject(notifications[templateId]);
  const nextData = {
    ...orderData,
    emailNotifications: {
      ...notifications,
      [templateId]: {
        ...previous,
        ...update,
      },
    },
    updatedAt: at,
  };
  const { error } = await supabase
    .from("store_orders")
    .update({ data: nextData, updated_at: at })
    .eq("id", orderId);
  if (error) throw error;
}

async function sendTransactionalTemplate(input: {
  supabase: SupabaseClient;
  context: EmailRenderContext;
  paidAt: string;
  resendApiKey?: string | null;
  defaultFromEmail: string;
  templateId: EcommerceTransactionalTemplateId;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  html: string;
}): Promise<EcommerceTransactionalEmailResult> {
  const orderId = String(input.context.order.id || "");
  if (!orderId) return { templateId: input.templateId, status: "skipped", reason: "Missing order id" };
  if (!input.recipientEmail) return { templateId: input.templateId, status: "skipped", reason: "Missing recipient" };

  const claim = await claimOrderEmailNotification(input.supabase, orderId, input.templateId, input.recipientEmail, input.paidAt);
  if (!claim.claimed) {
    return { templateId: input.templateId, recipientEmail: input.recipientEmail, status: "skipped", reason: claim.reason };
  }

  try {
    const providerResponse = await sendViaResend({
      apiKey: input.resendApiKey,
      from: resolveFrom(input.context, input.defaultFromEmail),
      replyTo: readReplyTo(input.context),
      to: [input.recipientEmail],
      subject: input.subject,
      html: input.html,
    });
    const providerMessageId = String(providerResponse?.id || "");
    let logError: string | undefined;

    try {
      await insertEmailLog(input.supabase, input.context, {
        templateId: input.templateId,
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName,
        subject: input.subject,
        status: "sent",
        providerMessageId,
        sentAt: input.paidAt,
      });
    } catch (error) {
      logError = error instanceof Error ? error.message : String(error);
      console.error("[ecommerce-emails] failed to insert sent log:", logError);
    }

    const latest = await loadLatestOrderData(input.supabase, orderId);
    await updateOrderEmailNotification(input.supabase, orderId, latest, input.templateId, {
      status: "sent",
      sentAt: input.paidAt,
      provider: "resend",
      providerMessageId,
      logError,
    }, input.paidAt);

    return { templateId: input.templateId, recipientEmail: input.recipientEmail, status: "sent", providerMessageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ecommerce-emails] ${input.templateId} failed:`, message);

    try {
      await insertEmailLog(input.supabase, input.context, {
        templateId: input.templateId,
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName,
        subject: input.subject,
        status: "failed",
        errorMessage: message,
        sentAt: input.paidAt,
      });
    } catch (logError) {
      console.error("[ecommerce-emails] failed to insert failed log:", logError);
    }

    const latest = await loadLatestOrderData(input.supabase, orderId);
    await updateOrderEmailNotification(input.supabase, orderId, latest, input.templateId, {
      status: "failed",
      failedAt: input.paidAt,
      errorMessage: message,
    }, input.paidAt);

    return { templateId: input.templateId, recipientEmail: input.recipientEmail, status: "failed", reason: message };
  }
}

async function sendViaResend(input: {
  apiKey?: string | null;
  from: string;
  replyTo?: string;
  to: string[];
  subject: string;
  html: string;
}) {
  if (!input.apiKey) throw new Error("RESEND_API_KEY is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Email provider request failed");
  }
  return data;
}

async function insertEmailLog(
  supabase: SupabaseClient,
  context: EmailRenderContext,
  input: {
    templateId: EcommerceTransactionalTemplateId;
    recipientEmail: string;
    recipientName: string;
    subject: string;
    status: "sent" | "failed";
    providerMessageId?: string;
    errorMessage?: string;
    sentAt: string;
  },
) {
  const orderId = String(context.order.id || "");
  const payload = {
    project_id: context.projectId,
    store_id: context.projectId,
    type: "transactional",
    template_id: input.templateId,
    recipient_email: input.recipientEmail,
    recipient_name: input.recipientName,
    customer_id: context.order.customer_id || context.orderData.customerId || null,
    subject: input.subject,
    status: input.status,
    provider: "resend",
    provider_message_id: input.providerMessageId || null,
    error_message: input.errorMessage || null,
    order_id: orderId,
    metadata: {
      source: "ecommerce",
      trigger: "payment_intent.succeeded",
      orderNumber: readOrderNumber(context),
      paymentIntentId: context.order.payment_intent_id || context.orderData.stripe?.paymentIntentId || null,
    },
    sent_at: input.sentAt,
  };

  const { error } = await supabase.from("email_logs").insert(payload);
  if (error) throw error;
}
