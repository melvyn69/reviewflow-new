
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    // 1. Initialize Clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
        throw new Error("Server Configuration Error: Missing keys.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resend = new Resend(resendApiKey);

    // 2. Fetch Due Reports
    // Logic: Get enabled reports where next_run_at is null (never run) or <= now()
    // In a real production DB, this would be a SQL query on a `reports` table.
    // For this context, we'll simulate fetching all configs stored in organizations
    // and filtering them in memory (less efficient but compatible with the JSON structure).
    
    const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, reports_config, users(id, email, role)');

    if (orgError) throw orgError;

    let processedCount = 0;
    const now = new Date();

    for (const org of orgs || []) {
        const reports = org.reports_config || []; // Assuming JSONB column for reports
        let orgUpdated = false;

        for (const report of reports) {
            if (!report.enabled) continue;

            // Check timing logic
            // Simple check: Is it due?
            // Note: next_run_at logic should ideally be managed by the scheduler.
            // Here we assume if it's "Time" to run based on a cron trigger running hourly.
            
            // For Demo/Robustness: We force run if no next_run_at set, or if passed.
            const nextRun = report.next_run_at ? new Date(report.next_run_at) : new Date(0);
            
            if (nextRun <= now) {
                console.log(`Processing report ${report.name} for ${org.name}`);

                // 3. Resolve Recipients
                const recipientsSet = new Set<string>();
                
                // a. Specific Emails
                if (report.distribution?.emails) {
                    report.distribution.emails.forEach((e: string) => recipientsSet.add(e));
                }

                // b. Roles
                if (report.distribution?.roles && org.users) {
                    const roles = report.distribution.roles;
                    org.users.forEach((u: any) => {
                        if (roles.includes(u.role) && u.email) recipientsSet.add(u.email);
                    });
                }

                // c. Specific Users
                if (report.distribution?.userIds && org.users) {
                    const ids = report.distribution.userIds;
                    org.users.forEach((u: any) => {
                        if (ids.includes(u.id) && u.email) recipientsSet.add(u.email);
                    });
                }

                const recipientList = Array.from(recipientsSet);

                if (recipientList.length > 0) {
                    try {
                        // 4. Generate & Send Email
                        // Since we can't generate PDF easily in Edge Runtime without heavy libs,
                        // we'll send a rich HTML email summary.
                        
                        await resend.emails.send({
                            from: 'Reviewflow Reporting <reports@resend.dev>',
                            to: recipientList,
                            subject: `📊 Votre Rapport ${report.name} - ${org.name}`,
                            html: `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                    <h1 style="color: #4f46e5;">${report.name}</h1>
                                    <p>Bonjour,</p>
                                    <p>Voici votre rapport automatique généré pour <strong>${org.name}</strong>.</p>
                                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                                    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px;">
                                        <h3 style="margin-top: 0;">Synthèse Rapide</h3>
                                        <p>Les données complètes sont disponibles sur votre tableau de bord.</p>
                                        <a href="https://reviewflow.vercel.app/reports" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Voir le rapport complet</a>
                                    </div>
                                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                                        Vous recevez cet email car vous êtes abonné aux rapports de ${org.name}.
                                        Fréquence : ${report.schedule.frequency}.
                                    </p>
                                </div>
                            `
                        });

                        report.last_run_status = 'success';
                        processedCount++;
                    } catch (err) {
                        console.error(`Failed to send report ${report.id}`, err);
                        report.last_run_status = 'failure';
                    }
                }

                // 5. Update Schedule (Next Run)
                report.last_sent = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                
                const nextDate = new Date();
                if (report.schedule.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                else if (report.schedule.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                else if (report.schedule.frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
                
                // Reset to scheduled time if possible, or just preserve simplified logic
                report.next_run_at = nextDate.toISOString();
                
                orgUpdated = true;
            }
        }

        if (orgUpdated) {
            // Save updated config back to DB
            await supabase.from('organizations').update({ reports_config: reports }).eq('id', org.id);
        }
    }

    return new Response(
      JSON.stringify({ success: true, processed: processedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Cron Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
