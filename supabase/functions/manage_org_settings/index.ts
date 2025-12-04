
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Server Config Error: Missing Supabase keys");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Auth Check
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) throw new Error('Unauthorized')

    // 2. Get User's Organization
    const { data: userProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
    if (!userProfile?.organization_id) throw new Error('No organization linked to this user')

    const orgId = userProfile.organization_id;

    // 3. Fetch current Org Data
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('api_keys, webhooks')
        .eq('id', orgId)
        .single();

    if (orgError) throw orgError;

    // 4. Handle Actions
    const { action, data } = await req.json()
    let updates: any = {};

    switch (action) {
        case 'generate_api_key': {
            const name = data.name || 'Default Key';
            const newKey = {
                id: crypto.randomUUID(),
                name: name,
                // Secure random key generation
                key: 'sk_live_' + btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/[+/=]/g, '').substring(0, 24),
                created_at: new Date().toISOString(),
                last_used: null
            };
            const currentKeys = org.api_keys || [];
            updates.api_keys = [...currentKeys, newKey];
            break;
        }

        case 'revoke_api_key': {
            const keyId = data.id;
            const currentKeys = org.api_keys || [];
            updates.api_keys = currentKeys.filter((k: any) => k.id !== keyId);
            break;
        }

        case 'save_webhook': {
            const { url, events } = data;
            const newWebhook = {
                id: crypto.randomUUID(),
                url: url,
                events: events || ['review.created'],
                active: true,
                // Secure random secret generation
                secret: 'whsec_' + btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/[+/=]/g, '').substring(0, 32),
                created_at: new Date().toISOString()
            };
            const currentHooks = org.webhooks || [];
            updates.webhooks = [...currentHooks, newWebhook];
            break;
        }

        case 'delete_webhook': {
            const hookId = data.id;
            const currentHooks = org.webhooks || [];
            updates.webhooks = currentHooks.filter((w: any) => w.id !== hookId);
            break;
        }

        default:
            throw new Error(`Unknown action: ${action}`);
    }

    // 5. Apply Updates
    const { error: updateError } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', orgId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, updates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Manage Settings Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
