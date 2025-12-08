
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

    // Batch Process in chunks of 100 (Resend limit per call, or just loop for personalization)
    // To handle personalization {{name}}, we MUST loop or use Resend's batch endpoint properly.
    // Here we loop to keep it simple and ensure substitution works.
    
    let sentCount = 0;
    let errorCount = 0;

    // Limit to 50 for safety in this function execution time
    const batch = recipients.slice(0, 50);

    const emailBatch = batch.map((r: any) => {
        let personalizedHtml = html;
        let personalizedSubject = subject;

        // Simple Variable Replacement
        if (r.name) {
            personalizedHtml = personalizedHtml.replace(/{{name}}/g, r.name).replace(/{{prénom}}/g, r.name.split(' ')[0]);
            personalizedSubject = personalizedSubject.replace(/{{name}}/g, r.name).replace(/{{prénom}}/g, r.name.split(' ')[0]);
        }
        
        // Link replacement if provided in recipient object or global context (simplified here)
        if (r.link) {
             personalizedHtml = personalizedHtml.replace(/{{link}}/g, r.link).replace(/{{lien_avis}}/g, r.link);
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
