import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeAccessError, requireServiceAccess } from "../_shared/access.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, token, tenantName, role, inviterName, tenantId } = await req.json();

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing");
    }

    const resolvedTenantId = await resolveInviteTenantId(tenantId, token);
    if (!resolvedTenantId) {
      throw new Error("Tenant ID is required to send invite email");
    }

    await requireServiceAccess(req, {
      tenantId: resolvedTenantId,
      requiredPermission: "canInviteMembers",
      action: "send_invite_email",
    });

    const inviteUrl = `https://app.quimera.ai/invite/${token}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Quimera Ai <no-reply@quimera.ai>",
        to: [email],
        subject: `${inviterName || "Alguien"} te ha invitado a ${tenantName || "un workspace"}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://quimera.ai/logos/quimera-full-dark.png" alt="Quimera Ai" style="max-height: 40px;" />
            </div>
            <h2 style="color: #333;">Has sido invitado a unirte a un workspace</h2>
            <p style="color: #555; line-height: 1.6;">
              <strong>${inviterName || "Un usuario"}</strong> te ha invitado a unirte al workspace <strong>${tenantName}</strong> 
              con el rol de <strong>${role}</strong>.
            </p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${inviteUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Aceptar Invitación
              </a>
            </div>
            <p style="color: #888; font-size: 12px; text-align: center;">
              Si no esperabas esta invitación, puedes ignorar este correo.
            </p>
          </div>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof EdgeAccessError) {
      return new Response(JSON.stringify({ error: error.message, decision: error.decision }), {
        status: error.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function resolveInviteTenantId(tenantId?: string | null, token?: string | null): Promise<string | null> {
  if (tenantId) return tenantId;
  if (!token) return null;
  const { data } = await supabase
    .from("tenant_invites")
    .select("tenant_id")
    .eq("token", token)
    .maybeSingle();
  return data?.tenant_id || null;
}
