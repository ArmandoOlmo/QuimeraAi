import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, token, tenantName, role, inviterName } = await req.json();

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing");
    }

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
