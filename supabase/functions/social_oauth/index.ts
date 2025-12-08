
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration Map
const CONFIG = {
    facebook: {
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        clientIdEnv: 'FACEBOOK_CLIENT_ID',
        clientSecretEnv: 'FACEBOOK_CLIENT_SECRET',
    },
    instagram: {
        tokenUrl: 'https://api.instagram.com/oauth/access_token', // Basic display or Graph API depending on setup
        clientIdEnv: 'INSTAGRAM_CLIENT_ID',
        clientSecretEnv: 'INSTAGRAM_CLIENT_SECRET',
    },
    linkedin: {
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        clientIdEnv: 'LINKEDIN_CLIENT_ID',
        clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    }
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Auth Check
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) throw new Error('Unauthorized')

    // 2. Get User Org
    const { data: userProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
    if (!userProfile?.organization_id) throw new Error('No organization linked')

    const { action, platform, code, redirectUri } = await req.json()
    
    // --- ACTION: EXCHANGE CODE ---
    if (action === 'exchange') {
        if (!CONFIG[platform]) throw new Error("Plateforme non supportée");

        const clientId = Deno.env.get(CONFIG[platform].clientIdEnv);
        const clientSecret = Deno.env.get(CONFIG[platform].clientSecretEnv);

        if (!clientId || !clientSecret) throw new Error(`Configuration serveur manquante pour ${platform}`);

        let payload: any = {
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        };

        // LinkedIn & Instagram need form-urlencoded usually, but let's try standard fetch first
        let response = await fetch(CONFIG[platform].tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(payload)
        });

        const data = await response.json();

        if (data.error || !data.access_token) {
            console.error("OAuth Error", data);
            throw new Error(data.error_description || data.error?.message || "Échec de l'échange de token");
        }

        let accessToken = data.access_token;
        let refreshToken = data.refresh_token || null;
        let expiresIn = data.expires_in; // Seconds

        // --- FACEBOOK/INSTA: EXCHANGE FOR LONG-LIVED TOKEN ---
        if (platform === 'facebook' || platform === 'instagram') {
            const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${accessToken}`;
            const longRes = await fetch(longLivedUrl);
            const longData = await longRes.json();
            
            if (longData.access_token) {
                accessToken = longData.access_token;
                expiresIn = longData.expires_in || (60 * 60 * 24 * 60); // Default 60 days
            }
        }

        // Calculate Expiration Date
        const expiresAt = expiresIn ? new Date(Date.now() + (expiresIn * 1000)).toISOString() : null;

        // Fetch User Info to identify account
        let accountId = 'unknown';
        let accountName = platform;
        let avatarUrl = '';

        if (platform === 'linkedin') {
            const meRes = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
            const meData = await meRes.json();
            accountId = meData.sub;
            accountName = meData.name;
            avatarUrl = meData.picture;
        } else if (platform === 'facebook') {
            const meRes = await fetch(`https://graph.facebook.com/me?fields=id,name,picture&access_token=${accessToken}`);
            const meData = await meRes.json();
            accountId = meData.id;
            accountName = meData.name;
            avatarUrl = meData.picture?.data?.url;
        }

        // Save to DB
        const { error: dbError } = await supabase.from('social_accounts').upsert({
            organization_id: userProfile.organization_id,
            platform,
            access_token: accessToken,
            refresh_token: refreshToken,
            token_expires_at: expiresAt,
            external_id: accountId,
            name: accountName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id, platform, external_id' });

        if (dbError) throw dbError;

        // Update Org Integrations flag
        const integrationField = `${platform}_posting`;
        await supabase.from('organizations').update({
            integrations: { [integrationField]: true } // Note: Need to merge carefully in real app (using jsonb_set or fetch-update)
        }).eq('id', userProfile.organization_id);

        return new Response(JSON.stringify({ success: true, name: accountName }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error("Action inconnue");

  } catch (error: any) {
    console.error("Social OAuth Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
