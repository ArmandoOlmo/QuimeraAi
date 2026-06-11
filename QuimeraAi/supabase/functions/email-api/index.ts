import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_FROM_EMAIL = Deno.env.get("EMAIL_FROM") || "Quimera Ai <no-reply@quimera.ai>";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid token");

    const { action, ...payload } = await req.json();
    let result;

    switch (action) {
      case "sendTestEmail":
        result = await sendTestEmail(user.id, payload);
        break;
      case "sendCampaign":
        result = await sendCampaign(user.id, payload);
        break;
      default:
        throw new Error(`Unknown email action: ${action || "missing"}`);
    }

    return json({ success: true, ...result });
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

async function sendViaResend(input: {
  to: string[];
  subject: string;
  html: string;
  from?: string;
}) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: input.from || DEFAULT_FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Email provider request failed");
  }
  return data;
}

async function requireCampaignAccess(userId: string, storeId: string) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,user_id,tenant_id")
    .eq("id", storeId)
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

async function loadCampaign(storeId: string, campaignId: string) {
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", campaignId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function resolveHtml(payload: Record<string, unknown>, campaign?: Record<string, unknown> | null) {
  const html = String(payload.htmlContent || campaign?.html_content || "");
  if (html.trim()) return html;

  const doc = (payload.emailDocument || campaign?.email_document) as Record<string, unknown> | null;
  if (doc && typeof doc === "object") {
    const subject = String(payload.subject || campaign?.subject || doc.subject || "Quimera AI");
    return `<div style="font-family:Arial,sans-serif;line-height:1.6"><h1>${escapeHtml(subject)}</h1></div>`;
  }

  throw new Error("Email HTML content is missing");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendTestEmail(userId: string, payload: Record<string, unknown>) {
  const storeId = String(payload.storeId || "");
  const campaignId = String(payload.campaignId || "");
  const testEmail = String(payload.testEmail || "");

  if (!storeId || !testEmail) throw new Error("storeId and testEmail are required");
  await requireCampaignAccess(userId, storeId);

  const campaign = campaignId && campaignId !== "test" ? await loadCampaign(storeId, campaignId) : null;
  const subject = String(payload.subject || campaign?.subject || "Email de prueba");
  const html = resolveHtml(payload, campaign);

  const providerResponse = await sendViaResend({ to: [testEmail], subject, html });

  await supabase.from("email_logs").insert({
    store_id: storeId,
    type: "test",
    campaign_id: campaignId !== "test" ? campaignId : null,
    recipient_email: testEmail,
    subject,
    status: "sent",
    provider: "resend",
    provider_message_id: providerResponse?.id || null,
    sent_at: new Date().toISOString(),
    metadata: { test: true },
  });

  return { sent: 1 };
}

async function getCampaignRecipients(campaign: Record<string, any>) {
  const direct = Array.isArray(campaign.custom_recipient_emails)
    ? campaign.custom_recipient_emails
    : [];

  const audienceId = campaign.audience_segment_id || campaign.audience_id;
  if (!audienceId) return direct.map(String).filter(Boolean);

  const { data: audience, error } = await supabase
    .from("email_audiences")
    .select("static_members,source")
    .eq("id", audienceId)
    .maybeSingle();

  if (error) throw error;

  const staticMembers = Array.isArray(audience?.static_members) ? audience.static_members : [];
  const sourceMembers = Array.isArray(audience?.source) ? audience.source : [];
  const emails = [...direct, ...staticMembers, ...sourceMembers]
    .map((item) => typeof item === "string" ? item : item?.email)
    .filter(Boolean);

  return Array.from(new Set(emails.map((email: string) => email.toLowerCase())));
}

async function sendCampaign(userId: string, payload: Record<string, unknown>) {
  const storeId = String(payload.storeId || "");
  const campaignId = String(payload.campaignId || "");

  if (!storeId || !campaignId) throw new Error("storeId and campaignId are required");
  await requireCampaignAccess(userId, storeId);

  const campaign = await loadCampaign(storeId, campaignId);
  if (!campaign) throw new Error("Campaign not found");

  const recipients = await getCampaignRecipients(campaign);
  if (recipients.length === 0) throw new Error("No recipients found for this campaign");

  const subject = String(campaign.subject || "Quimera AI");
  const html = resolveHtml({}, campaign);
  let sent = 0;

  for (const recipient of recipients) {
    const providerResponse = await sendViaResend({ to: [recipient], subject, html });
    sent += 1;

    await supabase.from("email_logs").insert({
      store_id: storeId,
      type: "campaign",
      campaign_id: campaignId,
      recipient_email: recipient,
      subject,
      status: "sent",
      provider: "resend",
      provider_message_id: providerResponse?.id || null,
      sent_at: new Date().toISOString(),
      metadata: { campaignId },
    });
  }

  await supabase
    .from("email_campaigns")
    .update({
      status: "sent",
      stats: { ...(campaign.stats || {}), sent },
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return { sent };
}
