
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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    // Configure recipient email in env vars, default to a generic one
    const supportEmail = Deno.env.get('SUPPORT_EMAIL') || 'support@reviewflow.com';

    if (!resendApiKey) {
        throw new Error("Server Config Error: RESEND_API_KEY missing");
    }

    const { name, email, subject, message, urgency } = await req.json();

    if (!email || !message) {
        throw new Error("Missing required fields");
    }

    const resend = new Resend(resendApiKey);

    // Subject Prefix based on urgency
    let subjectPrefix = '';
    if (urgency === 'critical') subjectPrefix = '🔴 [CRITIQUE] ';
    else if (urgency === 'high') subjectPrefix = '🟠 [URGENT] ';
    else subjectPrefix = '🔵 [SUPPORT] ';

    const finalSubject = `${subjectPrefix}${subject || 'Nouvelle demande'}`;

    // Send to Support Team
    await resend.emails.send({
        from: 'Reviewflow App <app@resend.dev>',
        to: supportEmail,
        reply_to: email,
        subject: finalSubject,
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #4f46e5;">Nouveau Ticket Support</h2>
                <p><strong>De :</strong> ${name} (${email})</p>
                <p><strong>Urgence :</strong> ${urgency.toUpperCase()}</p>
                <hr/>
                <h3>Message :</h3>
                <p style="white-space: pre-wrap; background-color: #f9fafb; padding: 15px; border-radius: 6px;">${message}</p>
            </div>
        `
    });

    // Send Auto-Confirmation to User
    await resend.emails.send({
        from: 'Reviewflow Support <support@resend.dev>',
        to: email,
        subject: `Réception de votre demande : ${subject}`,
        html: `
            <p>Bonjour ${name},</p>
            <p>Nous avons bien reçu votre demande de support concernant "<strong>${subject}</strong>".</p>
            <p>Notre équipe va l'analyser dans les plus brefs délais.</p>
            <p>Cordialement,<br/>L'équipe Reviewflow</p>
        `
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Support Ticket Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
