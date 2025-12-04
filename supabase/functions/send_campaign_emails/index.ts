
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is missing");
    }

    const resend = new Resend(RESEND_API_KEY);
    const { emails, subject, html } = await req.json();

    if (!emails || !subject || !html) {
      throw new Error("Missing required fields (emails, subject, html)");
    }

    // Envoi via Resend
    // Note: 'onboarding@resend.dev' est le domaine de test gratuit de Resend.
    // En production, il faudrait configurer un domaine vérifié.
    const { data, error } = await resend.emails.send({
      from: 'Reviewflow <onboarding@resend.dev>', 
      to: emails,
      subject: subject,
      html: html,
    });

    if (error) {
        console.error("Resend Error:", error);
        throw error;
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
