
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// CONFIGURATION DES CLÉS (Mapping dynamique vers les Env Vars)
const PLATFORM_CONFIG: any = {
    facebook: {
        clientId: 'FACEBOOK_CLIENT_ID',
        clientSecret: 'FACEBOOK_CLIENT_SECRET',
        refreshUrl: 'https://graph.facebook.com/v18.0/oauth/access_token'
    },
    instagram: {
        clientId: 'INSTAGRAM_CLIENT_ID', // Souvent le même que FB pour Instagram Graph API
        clientSecret: 'INSTAGRAM_CLIENT_SECRET',
        refreshUrl: 'https://graph.facebook.com/v18.0/oauth/access_token'
    },
    linkedin: {
        clientId: 'LINKEDIN_CLIENT_ID',
        clientSecret: 'LINKEDIN_CLIENT_SECRET',
        refreshUrl: 'https://www.linkedin.com/oauth/v2/accessToken'
    }
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    console.log("🔄 Starting Social Token Refresh Cron...");

    // 1. Récupérer les comptes qui expirent dans les 5 prochains jours
    // On utilise une requête SQL raw ou un filtre postgrest.
    // 'token_expires_at' doit être < now() + 5 jours
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + 5);

    const { data: accounts, error } = await supabase
        .from('social_accounts')
        .select('*')
        .lt('token_expires_at', expiryThreshold.toISOString())
        .not('refresh_token', 'is', null); // On a besoin d'un moyen de refresh (refresh_token ou ancien access_token pour FB)

    if (error) throw error;

    console.log(`Found ${accounts?.length || 0} accounts to refresh.`);

    const results = [];

    for (const account of accounts || []) {
        try {
            let newTokenData: any = null;

            if (account.platform === 'facebook' || account.platform === 'instagram') {
                newTokenData = await refreshMetaToken(account.platform, account.access_token);
            } else if (account.platform === 'linkedin') {
                newTokenData = await refreshLinkedinToken(account.refresh_token);
            }

            if (newTokenData) {
                // Mise à jour en base
                const { error: updateError } = await supabase
                    .from('social_accounts')
                    .update({
                        access_token: newTokenData.access_token,
                        refresh_token: newTokenData.refresh_token || account.refresh_token, // Garder l'ancien si pas de nouveau
                        token_expires_at: newTokenData.expires_at,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', account.id);

                if (updateError) throw updateError;
                
                results.push({ id: account.id, status: 'refreshed', platform: account.platform });
            } else {
                results.push({ id: account.id, status: 'skipped', reason: 'No data returned' });
            }

        } catch (err: any) {
            console.error(`Failed to refresh ${account.platform} for account ${account.id}:`, err.message);
            // Optionnel: Marquer le compte comme "disconnected" si erreur critique (ex: permissions révoquées)
            if (err.message.includes('Error validating access token')) {
                 await supabase.from('social_accounts').update({ refresh_token: null }).eq('id', account.id); // Désactive le refresh auto
            }
            results.push({ id: account.id, status: 'error', error: err.message });
        }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Cron Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// --- HELPERS ---

async function refreshMetaToken(platform: string, currentToken: string) {
    const config = PLATFORM_CONFIG[platform];
    const clientId = Deno.env.get(config.clientId);
    const clientSecret = Deno.env.get(config.clientSecret);

    if (!clientId || !clientSecret) throw new Error(`Missing env vars for ${platform}`);

    // Facebook "Exchange" flow: extend short-lived or refresh long-lived
    const url = `${config.refreshUrl}?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${currentToken}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    const expiresIn = data.expires_in || (60 * 60 * 24 * 60); // Default 60 days
    const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();

    return {
        access_token: data.access_token,
        refresh_token: null, // FB doesn't strictly use refresh tokens for this flow, the access_token itself is rotated
        expires_at: expiresAt
    };
}

async function refreshLinkedinToken(refreshToken: string) {
    const config = PLATFORM_CONFIG.linkedin;
    const clientId = Deno.env.get(config.clientId);
    const clientSecret = Deno.env.get(config.clientSecret);

    if (!clientId || !clientSecret) throw new Error(`Missing env vars for LinkedIn`);

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const res = await fetch(config.refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    const data = await res.json();

    if (data.error) {
        throw new Error(data.error_description || data.error);
    }

    const expiresIn = data.expires_in; // Seconds (usually 60 days)
    const refreshExpiresIn = data.refresh_token_expires_in; // Seconds (usually 1 year)
    
    const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token, // LinkedIn rotates the refresh token too usually
        expires_at: expiresAt
    };
}
