import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  checkEmailProviderReadiness,
  createEmailProviderRegistry,
  createResendEmailProvider,
  isValidEmail,
  normalizeEmail,
  provisionEmailProviderDomain,
} from "../../../services/email/emailProviderService.ts";
import { createEmailMarketingEngine } from "../../../services/email/emailMarketingEngineService.ts";
import { verifySendGridWebhookSignature } from "../../../services/email/emailWebhookSignature.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const EMAIL_WEBHOOK_SECRET = Deno.env.get("EMAIL_WEBHOOK_SECRET") || Deno.env.get("RESEND_WEBHOOK_SECRET");
const SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY = Deno.env.get("SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY")
  || Deno.env.get("SENDGRID_WEBHOOK_PUBLIC_KEY");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const BIO_PAGE_ANALYTICS_METADATA_ALLOWED_KEYS = new Set([
  "bioPageId",
  "bioSlug",
  "blockId",
  "linkId",
  "source",
  "sourceModule",
  "sourceComponent",
  "sourceEvent",
  "emailMarketingSource",
  "audienceId",
  "audienceSync",
  "crmWrite",
  "duplicate",
  "consentRequired",
]);

const BIO_PAGE_ANALYTICS_METADATA_BLOCKED_KEY_RE = /(email|phone|name|message|note|address|recipient|dedupe|canonical|sourceEntity|subscriberId|leadId|audienceError|leadForm)/i;

function sanitizeBioPageAnalyticsValue(value: unknown): unknown {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.trim().slice(0, 160);
  return undefined;
}

function sanitizeBioPageAnalyticsMetadata(metadata: Record<string, unknown> = {}): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  Object.entries(metadata).forEach(([key, value]) => {
    if (!BIO_PAGE_ANALYTICS_METADATA_ALLOWED_KEYS.has(key)) return;
    if (key !== "emailMarketingSource" && BIO_PAGE_ANALYTICS_METADATA_BLOCKED_KEY_RE.test(key)) return;
    const sanitizedValue = sanitizeBioPageAnalyticsValue(value);
    if (sanitizedValue !== undefined) sanitized[key] = sanitizedValue;
  });

  return sanitized;
}

const provider = createResendEmailProvider(RESEND_API_KEY);
const providers = createEmailProviderRegistry({
  resendApiKey: RESEND_API_KEY,
  sendGridApiKey: SENDGRID_API_KEY,
});
const emailEngine = createEmailMarketingEngine({ supabase, provider, providers });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rawBodyBytes = new Uint8Array(await req.arrayBuffer());
    const rawBody = new TextDecoder().decode(rawBodyBytes);
    const parsedBody = rawBody ? JSON.parse(rawBody) : {};
    const { action, payload } = readActionPayload(parsedBody);

    if (action === "ingestEmailEvent" || isNativeProviderWebhook(req, parsedBody)) {
      await requireWebhookAccess(req, rawBody, rawBodyBytes);
      return json({ success: true, ...(await ingestProviderWebhook(req, payload)) });
    }

    if (action === "unsubscribe") {
      return json({ success: true, ...(await unsubscribe(readObject(payload))) });
    }

    if (action === "subscribeBioPageEmail") {
      return json({ success: true, ...(await subscribeBioPageEmail(readObject(payload))) });
    }

    const user = await requireUser(req);
    const requestPayload = readObject(payload);
    const projectId = String(requestPayload.projectId || requestPayload.storeId || "");
    if (!projectId) throw new Error("projectId/storeId is required");
    await requireProjectAccess(user.id, projectId);

    switch (action) {
      case "getReadiness":
        return json({ success: true, readiness: await emailEngine.getEmailReadiness(projectId) });
      case "updateSettings":
        return json({
          success: true,
          settings: await emailEngine.updateEmailSettings(
            projectId,
            await normalizeEmailSettingsUpdates(projectId, sanitizeEmailSettingsUpdates(readObject(requestPayload.updates || requestPayload.settings))),
            user.id,
          ),
        });
      case "syncProviderReadiness":
        return json({ success: true, ...(await syncProviderReadiness(projectId, user.id)) });
      case "provisionProviderDomain":
        return json({ success: true, ...(await provisionProviderDomain(projectId, user.id, requestPayload)) });
      case "getAnalytics":
        return json({
          success: true,
          analytics: await emailEngine.getEmailAnalytics({
            projectId,
            since: readOptionalString(requestPayload.since),
            limit: Number(requestPayload.limit || 500),
          }),
        });
      case "getCampaigns":
        return json({ success: true, campaigns: await emailEngine.getCampaigns(projectId) });
      case "createCampaignDraft":
        return json({
          success: true,
          campaign: await emailEngine.createCampaignDraft({
            projectId,
            userId: user.id,
            campaign: sanitizeCampaignInput(readObject(requestPayload.campaign || requestPayload.data)),
          }),
        });
      case "updateCampaign":
        return json({
          success: true,
          campaign: await emailEngine.updateCampaign({
            projectId,
            campaignId: readRequiredString(requestPayload.campaignId || requestPayload.id, "campaignId/id"),
            updates: sanitizeCampaignInput(readObject(requestPayload.updates || requestPayload.campaign || requestPayload.data)),
          }),
        });
      case "duplicateCampaign":
        return json({
          success: true,
          campaign: await emailEngine.duplicateCampaign({
            projectId,
            userId: user.id,
            campaignId: readRequiredString(requestPayload.campaignId || requestPayload.id, "campaignId/id"),
          }),
        });
      case "deleteCampaign":
        return json({
          success: true,
          ...(await emailEngine.deleteCampaign({
            projectId,
            campaignId: readRequiredString(requestPayload.campaignId || requestPayload.id, "campaignId/id"),
          })),
        });
      case "scheduleCampaign":
        return json({
          success: true,
          campaign: await emailEngine.scheduleCampaign({
            projectId,
            campaignId: readRequiredString(requestPayload.campaignId || requestPayload.id, "campaignId/id"),
            scheduledAt: readRequiredString(requestPayload.scheduledAt || requestPayload.scheduled_at, "scheduledAt"),
          }),
        });
      case "getAutomations":
        return json({ success: true, automations: await emailEngine.getAutomations(projectId) });
      case "createAutomationDraft":
        return json({
          success: true,
          automation: await emailEngine.createAutomationDraft({
            projectId,
            userId: user.id,
            automation: sanitizeAutomationInput(readObject(requestPayload.automation || requestPayload.data)),
          }),
        });
      case "updateAutomation":
        return json({
          success: true,
          automation: await emailEngine.updateAutomation({
            projectId,
            automationId: readRequiredString(requestPayload.automationId || requestPayload.id, "automationId/id"),
            updates: sanitizeAutomationInput(readObject(requestPayload.updates || requestPayload.automation || requestPayload.data)),
          }),
        });
      case "duplicateAutomation":
        return json({
          success: true,
          automation: await emailEngine.duplicateAutomation({
            projectId,
            userId: user.id,
            automationId: readRequiredString(requestPayload.automationId || requestPayload.id, "automationId/id"),
          }),
        });
      case "deleteAutomation":
        return json({
          success: true,
          ...(await emailEngine.deleteAutomation({
            projectId,
            automationId: readRequiredString(requestPayload.automationId || requestPayload.id, "automationId/id"),
          })),
        });
      case "sendTestEmail":
        return json({
          success: true,
          ...(await emailEngine.sendTestEmail({
            projectId,
            userId: user.id,
            campaignId: readOptionalString(requestPayload.campaignId),
            recipientEmail: String(requestPayload.testEmail || requestPayload.recipientEmail || ""),
            subject: readOptionalString(requestPayload.subject),
            html: readOptionalString(requestPayload.htmlContent || requestPayload.html),
          })),
        });
      case "sendCampaign":
        return json({
          success: true,
          ...(await emailEngine.sendCampaign({
            projectId,
            userId: user.id,
            campaignId: String(requestPayload.campaignId || ""),
            batchSize: Number(requestPayload.batchSize || 50),
          })),
        });
      case "enqueueCampaignSend":
        return json({
          success: true,
          ...(await emailEngine.enqueueCampaignSend({
            projectId,
            userId: user.id,
            campaignId: String(requestPayload.campaignId || ""),
          })),
        });
      case "getAudiences":
        return json({ success: true, audiences: await emailEngine.getAudiences(projectId) });
      case "createAudience":
        return json({
          success: true,
          audience: await emailEngine.createAudience({
            projectId,
            userId: user.id,
            audience: sanitizeAudienceInput(readObject(requestPayload.audience || requestPayload.data)),
          }),
        });
      case "updateAudience":
        return json({
          success: true,
          audience: await emailEngine.updateAudience({
            projectId,
            audienceId: readRequiredString(requestPayload.audienceId || requestPayload.id, "audienceId/id"),
            updates: sanitizeAudienceInput(readObject(requestPayload.updates || requestPayload.audience || requestPayload.data)),
          }),
        });
      case "deleteAudience":
        return json({
          success: true,
          ...(await emailEngine.deleteAudience({
            projectId,
            audienceId: readRequiredString(requestPayload.audienceId || requestPayload.id, "audienceId/id"),
          })),
        });
      case "addAudienceMembers":
        return json({
          success: true,
          audience: await emailEngine.addAudienceMembers({
            projectId,
            audienceId: readRequiredString(requestPayload.audienceId || requestPayload.id, "audienceId/id"),
            members: buildAudienceMemberInputs(requestPayload),
          }),
        });
      case "removeAudienceMembers":
        return json({
          success: true,
          audience: await emailEngine.removeAudienceMembers({
            projectId,
            audienceId: readRequiredString(requestPayload.audienceId || requestPayload.id, "audienceId/id"),
            emails: readStringArray(requestPayload.emails),
            leadIds: readStringArray(requestPayload.leadIds || requestPayload.lead_ids),
            customerIds: readStringArray(requestPayload.customerIds || requestPayload.customer_ids),
          }),
        });
      case "processOutbox":
        return json({
          success: true,
          ...(await emailEngine.processEmailOutbox({
            projectId,
            campaignId: readOptionalString(requestPayload.campaignId),
            idempotencyKey: readOptionalString(requestPayload.idempotencyKey),
            limit: Number(requestPayload.limit || 50),
          })),
        });
      case "ingestAutomationEvent":
        if (!readOptionalString(requestPayload.eventType || requestPayload.type || requestPayload.event)) {
          throw new Error("eventType/type/event is required");
        }
        return json({
          success: true,
          ...(await emailEngine.ingestAutomationEvent({
            projectId,
            eventType: String(requestPayload.eventType || requestPayload.type || requestPayload.event || ""),
            payload: readObject(requestPayload.payload || requestPayload.data),
            idempotencyKey: readOptionalString(requestPayload.idempotencyKey || requestPayload.eventId || requestPayload.event_id),
          })),
        });
      case "dispatchTransactionalEmail":
        assertReviewedTransactionalPayload(requestPayload);
        return json({
          success: true,
          ...(requestPayload.sendNow === false
            ? await emailEngine.queueCrossModuleTransactionalEmail(buildTransactionalPayload(projectId, user.id, requestPayload))
            : await emailEngine.dispatchCrossModuleTransactionalEmail(buildTransactionalPayload(projectId, user.id, requestPayload))),
        });
      default:
        throw new Error(`Unknown email action: ${action || "missing"}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ success: false, error: message }, 400);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildTransactionalPayload(projectId: string, userId: string, payload: Record<string, unknown>) {
  const type = String(payload.type || payload.templateId || "");
  const recipientEmail = String(payload.recipientEmail || payload.email || "");
  const subject = String(payload.subject || "");
  const html = String(payload.html || payload.htmlContent || "");
  const idempotencyKey = String(payload.idempotencyKey || "");

  if (!type) throw new Error("type/templateId is required");
  if (!recipientEmail) throw new Error("recipientEmail/email is required");
  if (!subject) throw new Error("subject is required");
  if (!html) throw new Error("html/htmlContent is required");
  if (!idempotencyKey) throw new Error("idempotencyKey is required");

  return {
    projectId,
    userId,
    type,
    recipientEmail,
    recipientName: readOptionalString(payload.recipientName),
    subject,
    html,
    text: readOptionalString(payload.text),
    idempotencyKey,
    scheduledAt: readOptionalString(payload.scheduledAt),
    sourceModule: readOptionalString(payload.sourceModule) || "email-api",
    sourceComponent: readOptionalString(payload.sourceComponent),
    sourceEvent: readOptionalString(payload.sourceEvent) || type,
    sourceEntityType: readOptionalString(payload.sourceEntityType),
    sourceEntityId: readOptionalString(payload.sourceEntityId),
    metadata: readObject(payload.metadata),
    skipReason: readOptionalString(payload.skipReason),
  };
}

function assertReviewedTransactionalPayload(payload: Record<string, unknown>) {
  if (
    payload.generatedByAI === true
    || payload.needsReview === true
    || payload.safeToEdit === false
    || payload.sendMode === "draft_only"
  ) {
    throw new Error("AI-generated or draft-only email content must be reviewed before transactional dispatch.");
  }
}

async function syncProviderReadiness(projectId: string, userId: string) {
  const settings = await emailEngine.getEmailSettings(projectId);
  const providerReadiness = await checkEmailProviderReadiness({
    providerName: settings.provider,
    resendApiKey: RESEND_API_KEY,
    sendGridApiKey: SENDGRID_API_KEY,
    sendingDomain: settings.sendingDomain,
    webhookSigningConfigured: hasWebhookSigningConfigured(settings.provider),
  });
  const raw = readObject(settings.raw);
  const metadata = {
    ...readObject(raw.metadata),
    providerReadiness: buildProviderReadinessSnapshot(providerReadiness),
  };

  const updated = await emailEngine.updateEmailSettings(projectId, {
    apiKeyConfigured: providerReadiness.providerConfigured,
    providerStatus: providerReadiness.providerStatus,
    domainStatus: providerReadiness.domainStatus,
    dkimStatus: providerReadiness.dkimStatus,
    spfStatus: providerReadiness.spfStatus,
    dmarcStatus: providerReadiness.dmarcStatus,
    webhookConfigured: providerReadiness.webhookConfigured,
    metadata,
  }, userId);

  return { settings: updated, providerReadiness };
}

async function provisionProviderDomain(projectId: string, userId: string, payload: Record<string, unknown>) {
  const settings = await emailEngine.getEmailSettings(projectId);
  const sendingDomain = readOptionalString(payload.sendingDomain || payload.domain) || settings.sendingDomain;
  const providerDomain = await provisionEmailProviderDomain({
    providerName: settings.provider,
    resendApiKey: RESEND_API_KEY,
    sendGridApiKey: SENDGRID_API_KEY,
    sendingDomain,
  });
  const providerReadiness = {
    ...providerDomain,
    webhookConfigured: hasWebhookSigningConfigured(settings.provider),
  };
  const raw = readObject(settings.raw);
  const metadata = {
    ...readObject(raw.metadata),
    providerReadiness: buildProviderReadinessSnapshot(providerReadiness),
    providerDomainAutomation: {
      provider: providerDomain.provider,
      action: providerDomain.action,
      sendingDomain: providerDomain.sendingDomain,
      matchedDomain: providerDomain.matchedDomain,
      providerDomainId: providerDomain.providerDomainId,
      domainStatus: providerDomain.domainStatus,
      checkedAt: providerDomain.checkedAt,
      providerError: providerDomain.providerError,
      warnings: providerDomain.warnings,
      raw: providerDomain.raw,
    },
  };

  const updated = await emailEngine.updateEmailSettings(projectId, {
    sendingDomain: providerDomain.sendingDomain || sendingDomain,
    apiKeyConfigured: providerDomain.providerConfigured,
    providerStatus: providerDomain.providerStatus,
    domainStatus: providerDomain.domainStatus,
    dkimStatus: providerDomain.dkimStatus,
    spfStatus: providerDomain.spfStatus,
    dmarcStatus: providerDomain.dmarcStatus,
    webhookConfigured: providerReadiness.webhookConfigured,
    metadata,
  }, userId);

  return {
    settings: updated,
    providerReadiness: metadata.providerReadiness,
    providerDomain,
  };
}

function buildProviderReadinessSnapshot(readiness: {
  provider?: unknown;
  providerConfigured?: unknown;
  providerStatus?: unknown;
  domainStatus?: unknown;
  dkimStatus?: unknown;
  spfStatus?: unknown;
  dmarcStatus?: unknown;
  webhookConfigured?: unknown;
  checkedAt?: unknown;
  matchedDomain?: unknown;
  providerError?: unknown;
  warnings?: unknown;
  raw?: unknown;
}) {
  return {
    provider: readiness.provider,
    providerConfigured: readiness.providerConfigured,
    providerStatus: readiness.providerStatus,
    domainStatus: readiness.domainStatus,
    dkimStatus: readiness.dkimStatus,
    spfStatus: readiness.spfStatus,
    dmarcStatus: readiness.dmarcStatus,
    webhookConfigured: readiness.webhookConfigured,
    checkedAt: readiness.checkedAt,
    matchedDomain: readiness.matchedDomain,
    providerError: readiness.providerError,
    warnings: readiness.warnings,
    raw: readiness.raw,
  };
}

async function subscribeBioPageEmail(payload: Record<string, unknown>) {
  const email = normalizeEmail(readOptionalString(payload.email));
  const name = readOptionalString(payload.name);
  const consent = payload.consent === true;
  const blockId = readOptionalString(payload.blockId || payload.block_id);
  const requestedAudienceId = readOptionalString(payload.audienceId || payload.audience_id);
  const metadataInput = readObject(payload.metadata);

  if (!isValidEmail(email)) throw new Error("A valid email is required");
  if (!consent) throw new Error("Consent is required");

  const page = await loadPublishedBioPageForSubscribe(payload);
  const block = await loadBioPageEmailSubscribeBlock(page.id, blockId);
  const pageSettings = readObject(page.settings);
  const blockData = readObject(block?.data);
  const allowedAudienceIds = new Set([
    readOptionalString(blockData.audienceId || blockData.audience_id),
    readOptionalString(pageSettings.audienceId || pageSettings.audience_id),
  ].filter(Boolean) as string[]);

  if (requestedAudienceId && allowedAudienceIds.size > 0 && !allowedAudienceIds.has(requestedAudienceId)) {
    throw new Error("Audience is not configured for this Bio Page subscribe block");
  }
  if (requestedAudienceId && allowedAudienceIds.size === 0) {
    throw new Error("Bio Page subscribe block does not have an Email Marketing audience configured");
  }

  const audienceId = requestedAudienceId || Array.from(allowedAudienceIds)[0] || null;
  const metadata = {
    ...metadataInput,
    bioPageId: page.id,
    bioSlug: page.slug,
    blockId: block?.id || blockId || null,
    sourceModule: "bio-page-engine",
    sourceComponent: readOptionalString(metadataInput.sourceComponent) || "BioPageEmailSubscribeBlock",
    sourceEvent: readOptionalString(metadataInput.sourceEvent) || "bio_page_email_subscribe",
    emailMarketingSource: "bio_page",
  };

  const { data: existingSubscriber, error: existingError } = await supabase
    .from("bio_page_subscribers")
    .select("id")
    .eq("bio_page_id", page.id)
    .eq("email", email)
    .maybeSingle();
  if (existingError) throw existingError;

  const subscriberPayload = {
    tenant_id: page.tenant_id || null,
    project_id: page.project_id,
    bio_page_id: page.id,
    email,
    name: name || null,
    consent: true,
    source: "bio_page",
    audience_id: audienceId,
    metadata,
  };

  const { data: subscriber, error: subscriberError } = await supabase
    .from("bio_page_subscribers")
    .upsert(subscriberPayload, { onConflict: "bio_page_id,email" })
    .select("id")
    .single();
  if (subscriberError) throw subscriberError;

  let audienceSync: "not_configured" | "synced" | "blocked" = audienceId ? "blocked" : "not_configured";
  let audienceError: string | undefined;
  if (audienceId) {
    try {
      await emailEngine.addAudienceMembers({
        projectId: page.project_id,
        audienceId,
        members: [{
          email,
          name,
          source: "bio_page",
          acceptsMarketing: true,
          metadata,
        }],
      });
      audienceSync = "synced";
    } catch (error) {
      audienceError = error instanceof Error ? error.message : String(error);
      console.warn("[email-api] Bio Page audience sync blocked:", audienceError);
      audienceSync = "blocked";
    }
  }

  const { error: eventError } = await supabase
    .from("bio_page_events")
    .insert({
      tenant_id: page.tenant_id || null,
      project_id: page.project_id,
      bio_page_id: page.id,
      block_id: block?.id || blockId || null,
      event_type: "bio_email_subscribed",
      source: "email_subscribe",
      metadata: sanitizeBioPageAnalyticsMetadata({
        ...metadata,
        audienceId,
        audienceSync,
        duplicate: Boolean(existingSubscriber?.id),
      }),
    });
  if (eventError) console.warn("[email-api] Bio Page subscribe event was not recorded:", eventError.message);

  return {
    subscriberId: subscriber?.id || existingSubscriber?.id || null,
    audienceId,
    audienceSync,
    duplicate: Boolean(existingSubscriber?.id),
  };
}

async function loadPublishedBioPageForSubscribe(payload: Record<string, unknown>) {
  const pageId = readOptionalString(payload.bioPageId || payload.bio_page_id || payload.pageId || payload.page_id);
  const slug = normalizeBioPageSlug(readOptionalString(payload.slug || payload.bioSlug || payload.bio_slug));
  if (!pageId && !slug) throw new Error("bioPageId/pageId or slug is required");

  let query = supabase
    .from("bio_pages")
    .select("id,tenant_id,project_id,slug,settings,status")
    .eq("status", "published");

  query = pageId ? query.eq("id", pageId) : query.eq("slug", slug);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Published Bio Page not found");
  return data as Record<string, any>;
}

async function loadBioPageEmailSubscribeBlock(pageId: string, blockId?: string) {
  if (blockId) {
    const { data, error } = await supabase
      .from("bio_page_blocks")
      .select("id,type,visible,data")
      .eq("bio_page_id", pageId)
      .eq("id", blockId)
      .eq("type", "email_subscribe")
      .eq("visible", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Visible Email Subscribe block not found");
    return data as Record<string, unknown>;
  }

  const { data, error } = await supabase
    .from("bio_page_blocks")
    .select("id,type,visible,data")
    .eq("bio_page_id", pageId)
    .eq("type", "email_subscribe")
    .eq("visible", true)
    .order("order_index", { ascending: true })
    .limit(1);
  if (error) throw error;
  return Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;
}

function normalizeBioPageSlug(value?: string) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || undefined;
}

function sanitizeEmailSettingsUpdates(updates: Record<string, unknown>) {
  const allowedScalar = new Set([
    "provider",
    "fromEmail",
    "fromName",
    "replyTo",
    "sendingDomain",
    "logoUrl",
    "primaryColor",
    "footerText",
  ]);
  const allowedObject = new Set(["socialLinks", "transactional", "marketing", "compliance", "tracking", "rateLimits"]);
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (allowedScalar.has(key)) {
      sanitized[key] = typeof value === "string" ? value.trim() : value;
    } else if (allowedObject.has(key)) {
      sanitized[key] = readObject(value);
    }
  }

  if (sanitized.provider && !["resend", "sendgrid", "unset"].includes(String(sanitized.provider))) {
    throw new Error("Invalid email provider");
  }

  return sanitized;
}

function sanitizeAudienceInput(input: Record<string, unknown>) {
  const allowed = new Set([
    "name",
    "description",
    "filters",
    "acceptsMarketing",
    "accepts_marketing",
    "hasOrdered",
    "has_ordered",
    "minOrders",
    "min_orders",
    "maxOrders",
    "max_orders",
    "minTotalSpent",
    "min_total_spent",
    "maxTotalSpent",
    "max_total_spent",
    "tags",
    "excludeTags",
    "exclude_tags",
    "lastOrderDaysAgo",
    "last_order_days_ago",
    "source",
    "members",
    "staticMembers",
    "static_members",
    "staticMemberCount",
    "static_member_count",
    "estimatedCount",
    "estimated_count",
    "isDefault",
    "is_default",
    "generatedByAI",
    "generated_by_ai",
    "needsReview",
    "needs_review",
    "userModified",
    "user_modified",
    "safeToEdit",
    "safe_to_edit",
    "sourceModule",
    "source_module",
    "sourceComponent",
    "source_component",
    "sourceEvent",
    "source_event",
    "sourceEntityType",
    "source_entity_type",
    "sourceEntityId",
    "source_entity_id",
    "correlationId",
    "correlation_id",
    "idempotencyKey",
    "idempotency_key",
    "sourceMap",
    "source_map",
    "readiness",
    "metadata",
  ]);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

function sanitizeCampaignInput(input: Record<string, unknown>) {
  const allowed = new Set([
    "name",
    "subject",
    "subjectDraft",
    "previewText",
    "preview_text",
    "previewTextDraft",
    "type",
    "content",
    "htmlContent",
    "html_content",
    "emailDocument",
    "email_document",
    "audienceType",
    "audience_type",
    "audienceSegmentId",
    "audience_segment_id",
    "customRecipientEmails",
    "custom_recipient_emails",
    "status",
    "stats",
    "tags",
    "scheduledAt",
    "scheduled_at",
    "generatedByAI",
    "generated_by_ai",
    "needsReview",
    "needs_review",
    "userModified",
    "user_modified",
    "safeToEdit",
    "safe_to_edit",
    "sendMode",
    "send_mode",
    "sourceModule",
    "source_module",
    "sourceComponent",
    "source_component",
    "sourceEvent",
    "source_event",
    "sourceEntityType",
    "source_entity_type",
    "sourceEntityId",
    "source_entity_id",
    "correlationId",
    "correlation_id",
    "idempotencyKey",
    "idempotency_key",
    "readiness",
    "metadata",
  ]);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

function sanitizeAutomationInput(input: Record<string, unknown>) {
  const allowed = new Set([
    "name",
    "description",
    "type",
    "category",
    "status",
    "triggerConfig",
    "trigger_config",
    "audienceId",
    "audience_id",
    "steps",
    "templateId",
    "template_id",
    "subject",
    "delayMinutes",
    "delay_minutes",
    "stats",
    "generatedByAI",
    "generated_by_ai",
    "needsReview",
    "needs_review",
    "userModified",
    "user_modified",
    "safeToEdit",
    "safe_to_edit",
    "sendMode",
    "send_mode",
    "sourceModule",
    "source_module",
    "sourceComponent",
    "source_component",
    "sourceEvent",
    "source_event",
    "sourceEntityType",
    "source_entity_type",
    "sourceEntityId",
    "source_entity_id",
    "correlationId",
    "correlation_id",
    "idempotencyKey",
    "idempotency_key",
    "sourceMap",
    "source_map",
    "readiness",
    "metadata",
  ]);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

function sanitizeAudienceMembers(value: unknown) {
  const members = Array.isArray(value) ? value : [];
  return members
    .map((member) => {
      if (typeof member === "string") return { email: member.trim(), source: "manual" };
      const data = readObject(member);
      return {
        email: readOptionalString(data.email),
        name: readOptionalString(data.name),
        source: readOptionalString(data.source),
        leadId: readOptionalString(data.leadId || data.lead_id),
        customerId: readOptionalString(data.customerId || data.customer_id),
        acceptsMarketing: typeof data.acceptsMarketing === "boolean"
          ? data.acceptsMarketing
          : typeof data.accepts_marketing === "boolean"
            ? data.accepts_marketing
            : undefined,
        metadata: readObject(data.metadata),
      };
    })
    .filter((member) => member.email || member.leadId || member.customerId);
}

function buildAudienceMemberInputs(payload: Record<string, unknown>) {
  return [
    ...sanitizeAudienceMembers(payload.members),
    ...readStringArray(payload.emails).map((email) => ({ email, source: "manual" })),
    ...readStringArray(payload.leadIds || payload.lead_ids).map((leadId) => ({ leadId, source: "crm" })),
    ...readStringArray(payload.customerIds || payload.customer_ids).map((customerId) => ({ customerId, source: "ecommerce" })),
  ];
}

function readStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

async function normalizeEmailSettingsUpdates(projectId: string, updates: Record<string, unknown>) {
  if (!updates.rateLimits) return updates;

  const rateLimits = sanitizeRateLimitSettings(readObject(updates.rateLimits));
  const settings = await emailEngine.getEmailSettings(projectId);
  const raw = readObject(settings.raw);
  const metadata = {
    ...readObject(raw.metadata),
    emailRateLimits: rateLimits,
  };
  const { rateLimits: _rateLimits, ...rest } = updates;
  return {
    ...rest,
    metadata,
  };
}

function sanitizeRateLimitSettings(value: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};
  for (const provider of ["default", "resend", "sendgrid"]) {
    const policy = readObject(value[provider]);
    const normalized = sanitizeRateLimitPolicy(policy);
    if (Object.keys(normalized).length > 0) sanitized[provider] = normalized;
  }
  return sanitized;
}

function sanitizeRateLimitPolicy(policy: Record<string, unknown>) {
  return Object.fromEntries(
    [
      ["maxPerRun", readPositiveInt(policy.maxPerRun || policy.max_per_run)],
      ["maxPerMinute", readPositiveInt(policy.maxPerMinute || policy.max_per_minute)],
      ["retryAfterSeconds", readPositiveInt(policy.retryAfterSeconds || policy.retry_after_seconds)],
    ].filter(([, value]) => value !== undefined),
  );
}

function readPositiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function hasWebhookSigningConfigured(providerName: string) {
  if (providerName === "sendgrid") return Boolean(SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY);
  return Boolean(EMAIL_WEBHOOK_SECRET);
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Invalid token");
  return user;
}

async function requireProjectAccess(userId: string, projectId: string) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,user_id,tenant_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) throw new Error("Project not found");
  if (project.user_id === userId) return project;

  if (project.tenant_id) {
    const { data: membership, error: membershipError } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("tenant_id", project.tenant_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) throw membershipError;
    if (membership) return project;
  }

  throw new Error("You do not have access to this email project");
}

async function ingestEmailEvent(payload: Record<string, unknown>) {
  const providerEventId = readProviderEventId(payload);
  const providerMessageId = readProviderMessageId(payload);
  const eventType = String(payload.eventType || payload.type || payload.event || "");

  if (!eventType) throw new Error("eventType is required");

  return emailEngine.ingestEmailEvent({
    projectId: readOptionalString(payload.projectId),
    provider: readOptionalString(payload.provider) || "resend",
    providerEventId,
    providerMessageId,
    emailLogId: readOptionalString(payload.emailLogId || payload.email_log_id),
    eventType,
    recipientEmail: readOptionalString(payload.recipientEmail || payload.email),
    payload,
    receivedAt: readOptionalString(payload.createdAt || payload.created_at),
  });
}

async function ingestProviderWebhook(req: Request, payload: unknown) {
  if (isSendGridWebhook(req)) {
    const events = Array.isArray(payload) ? payload : [readObject(payload)];
    const results = [];
    for (const event of events) {
      results.push(await ingestSendGridEvent(event));
    }
    return {
      provider: "sendgrid",
      events: results.length,
      results,
    };
  }

  return ingestEmailEvent(readObject(payload));
}

async function ingestSendGridEvent(event: Record<string, unknown>) {
  const customArgs = readSendGridCustomArgs(event);
  const eventType = String(event.event || event.eventType || event.type || "");
  if (!eventType) throw new Error("SendGrid event is missing event type");

  return emailEngine.ingestEmailEvent({
    projectId: readOptionalString(customArgs.projectId || customArgs.project_id || event.projectId || event.project_id),
    provider: "sendgrid",
    providerEventId: readOptionalString(event.sg_event_id || event.event_id || event.id),
    providerMessageId: readOptionalString(
      customArgs.providerMessageId
      || customArgs.provider_message_id
      || event.sg_message_id
      || event["smtp-id"]
      || event.smtp_id
    ),
    emailLogId: readOptionalString(customArgs.emailLogId || customArgs.email_log_id),
    eventType,
    recipientEmail: readOptionalString(event.email || event.recipientEmail || event.recipient_email),
    payload: {
      ...event,
      customArgs,
    },
    receivedAt: readSendGridTimestamp(event),
  });
}

async function requireWebhookAccess(req: Request, rawBody: string, rawBodyBytes: Uint8Array) {
  if (await verifySendGridRequest(req, rawBodyBytes)) return;

  if (!EMAIL_WEBHOOK_SECRET) {
    throw new Error("EMAIL_WEBHOOK_SECRET/RESEND_WEBHOOK_SECRET or SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY is required for email webhooks");
  }

  const authSecret = readBearerSecret(req.headers.get("Authorization"));
  const headerSecret = req.headers.get("x-email-webhook-secret") || req.headers.get("x-webhook-secret") || "";
  if (safeEqual(authSecret, EMAIL_WEBHOOK_SECRET) || safeEqual(headerSecret, EMAIL_WEBHOOK_SECRET)) return;

  if (await verifySvixSignature(req.headers, rawBody, EMAIL_WEBHOOK_SECRET)) return;

  const signature = req.headers.get("x-webhook-signature") || "";
  if (signature && await verifyHmacSignature(rawBodyBytes, signature, EMAIL_WEBHOOK_SECRET)) return;

  throw new Error("Invalid email webhook signature");
}

async function unsubscribe(payload: Record<string, unknown>) {
  const projectId = String(payload.projectId || payload.storeId || "");
  const email = String(payload.email || "");
  const emailLogId = readOptionalString(payload.emailLogId);
  if (!projectId || !email) throw new Error("projectId and email are required");
  if (!emailLogId) throw new Error("emailLogId is required");

  const { data: log, error } = await supabase
    .from("email_logs")
    .select("id,project_id,recipient_email,campaign_id")
    .eq("id", emailLogId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!log || String(log.recipient_email || "").toLowerCase() !== email.toLowerCase()) {
    throw new Error("Invalid unsubscribe target");
  }

  const suppression = await emailEngine.addSuppression({
    projectId,
    email,
    reason: "unsubscribe",
    source: "public-unsubscribe",
    campaignId: readOptionalString(payload.campaignId),
    emailLogId,
    metadata: {
      source: "email-api",
      emailLogVerified: true,
    },
  });

  return { suppression };
}

function readProviderEventId(payload: Record<string, unknown>) {
  const data = readObject(payload.data);
  return readOptionalString(
    payload.providerEventId
    || payload.event_id
    || payload.id
    || data.id
  );
}

function readProviderMessageId(payload: Record<string, unknown>) {
  const data = readObject(payload.data);
  const email = readObject(data.email);
  return readOptionalString(
    payload.providerMessageId
    || payload.message_id
    || payload.email_id
    || data.email_id
    || email.id
  );
}

function readActionPayload(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { action: undefined, payload: body };
  }
  const { action, ...payload } = body as Record<string, unknown>;
  return {
    action: readOptionalString(action),
    payload,
  };
}

function isNativeProviderWebhook(req: Request, body: unknown) {
  return isSendGridWebhook(req)
    || Boolean(req.headers.get("svix-id") && req.headers.get("svix-signature"))
    || Array.isArray(body);
}

function isSendGridWebhook(req: Request) {
  return Boolean(
    req.headers.get("x-twilio-email-event-webhook-signature")
    && req.headers.get("x-twilio-email-event-webhook-timestamp")
  );
}

function readSendGridCustomArgs(event: Record<string, unknown>) {
  const customArgs = readObject(event.custom_args);
  const uniqueArgs = readObject(event.unique_args);
  return {
    ...uniqueArgs,
    ...customArgs,
  };
}

function readSendGridTimestamp(event: Record<string, unknown>) {
  const value = event.timestamp || event.createdAt || event.created_at;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    const milliseconds = numeric > 10_000_000_000 ? numeric : numeric * 1000;
    return new Date(milliseconds).toISOString();
  }
  return readOptionalString(value);
}

function readOptionalString(value: unknown) {
  const text = String(value || "").trim();
  return text || undefined;
}

function readRequiredString(value: unknown, name: string) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readBearerSecret(value: string | null) {
  const text = String(value || "");
  return text.startsWith("Bearer ") ? text.slice("Bearer ".length).trim() : "";
}

async function verifyHmacSignature(rawBody: Uint8Array, signature: string, secret: string) {
  const normalizedSignature = signature.trim();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, toArrayBuffer(rawBody));
  const expected = `sha256=${toHex(digest)}`;
  return safeEqual(normalizedSignature, expected);
}

async function verifySendGridRequest(req: Request, rawBodyBytes: Uint8Array) {
  if (!isSendGridWebhook(req)) return false;
  if (!SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY) {
    throw new Error("SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY or SENDGRID_WEBHOOK_PUBLIC_KEY is required for SendGrid webhooks");
  }

  return verifySendGridWebhookSignature({
    publicKey: SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY,
    signature: req.headers.get("x-twilio-email-event-webhook-signature") || "",
    timestamp: req.headers.get("x-twilio-email-event-webhook-timestamp") || "",
    rawBody: rawBodyBytes,
  });
}

async function verifySvixSignature(headers: Headers, rawBody: string, secret: string) {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const timestamp = Number(svixTimestamp);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > 5 * 60) return false;

  const secretBytes = decodeSvixSecret(secret);
  if (!secretBytes) return false;

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = toBase64(digest);
  return svixSignature
    .split(" ")
    .map((part) => part.trim())
    .some((part) => {
      const [, signature] = part.split(",", 2);
      return safeEqual(signature || part, expected);
    });
}

function decodeSvixSecret(secret: string) {
  const value = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : "";
  if (!value) return null;
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch (_error) {
    return null;
  }
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function toArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}
