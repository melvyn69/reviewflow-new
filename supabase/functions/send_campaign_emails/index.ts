
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
    const { recipients, subject, html } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !subject || !html) {
      throw new Error("Missing required fields (recipients array, subject, html)");
    }

    // Batch Process in chunks of 50 to respect Resend constraints and execution time
    const batch = recipients.slice(0, 50);

    const emailBatch = batch.map((r: any) => {
        let personalizedHtml = html;
        let personalizedSubject = subject;

        // Common Variables Replacement
        // Handles: {{name}}, {{prénom}}, {{lien_avis}}, {{nom_etablissement}}
        const variables: any = {
            '{{name}}': r.name || 'Client',
            '{{prénom}}': r.name ? r.name.split(' ')[0] : 'Client',
            '{{prenom}}': r.name ? r.name.split(' ')[0] : 'Client', // Fallback
            '{{lien_avis}}': r.link || '#',
            '{{link}}': r.link || '#',
            '{{nom_etablissement}}': r.businessName || 'Notre Établissement'
        };

        // Replace all occurrences
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(key, 'g');
            personalizedHtml = personalizedHtml.replace(regex, value);
            personalizedSubject = personalizedSubject.replace(regex, value);
        }

        return {
            from: 'Reviewflow <onboarding@resend.dev>',
            to: r.email,
            subject: personalizedSubject,
            html: personalizedHtml,
        };
    });

    const { data, error } = await resend.batch.send(emailBatch);

    if (error) {
        console.error("Resend Batch Error:", error);
        throw error;
    }

    return new Response(JSON.stringify({ success: true, count: emailBatch.length, data }), {
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