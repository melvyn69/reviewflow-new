
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Twilio from "npm:twilio@4.19.0";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Auth Check
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) throw new Error('Unauthorized');

    // 2. Get Org Settings
    const { data: userProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
    if (!userProfile?.organization_id) throw new Error('No organization linked');

    const { data: org } = await supabase
        .from('organizations')
        .select('twilio_settings')
        .eq('id', userProfile.organization_id)
        .single();

    const twilioConfig = org?.twilio_settings;

    if (!twilioConfig?.account_sid || !twilioConfig?.auth_token || !twilioConfig?.phone_number) {
        throw new Error("Twilio non configuré. Veuillez ajouter vos clés dans les paramètres.");
    }

    // 3. Parse Body
    const { to, body } = await req.json();

    if (!to || !body) throw new Error("Missing 'to' or 'body'");

    const client = new Twilio(twilioConfig.account_sid, twilioConfig.auth_token);

    // 4. Send SMS
    // Note: In a real batch scenario, 'to' might be an array or a segment ID.
    // Here we handle a single recipient for simplicity or a loop if array.
    
    // Check if 'to' starts with 'list:' to handle bulk sending (mock implementation)
    // Real implementation would fetch customers from DB based on segment
    if (to.startsWith('list:')) {
        // Mock bulk send
        return new Response(JSON.stringify({ success: true, count: 50, message: "Mock Bulk Send" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const message = await client.messages.create({
        body: body,
        from: twilioConfig.phone_number,
        to: to
    });

    // 5. Log
    // await supabase.from('campaign_logs').insert(...)

    return new Response(JSON.stringify({ success: true, sid: message.sid }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("SMS Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
