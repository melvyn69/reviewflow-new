import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration Map
const CONFIG: any = {
    facebook: {
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        clientIdEnv: 'FACEBOOK_CLIENT_ID',
        clientSecretEnv: 'FACEBOOK_CLIENT_SECRET',
    },
    instagram: {
        tokenUrl: 'https://api.instagram.com/oauth/access_token', 
        clientIdEnv: 'INSTAGRAM_CLIENT_ID',
        clientSecretEnv: 'INSTAGRAM_CLIENT_SECRET',
    },
    linkedin: {
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        clientIdEnv: 'LINKEDIN_CLIENT_ID',
        clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    },
    google: {
        tokenUrl: 'https://oauth2.googleapis.com/token',
        clientIdEnv: 'GOOGLE_CLIENT_ID',
        clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    }
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const OAUTH_REDIRECT_URI = Deno.env.get('OAUTH_REDIRECT_URI')

        if (!OAUTH_REDIRECT_URI) {
            return new Response(JSON.stringify({ error: 'OAUTH_REDIRECT_URI_NOT_SET' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey)

        // 1. Auth Check (accept Authorization or authorization)
        const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Unauthorized (missing bearer token)' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const token = authHeader.replace(/^Bearer\s+/i, '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        // 2. Get User Org
        const { data: userProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
        if (!userProfile?.organization_id) return new Response(JSON.stringify({ error: 'No organization linked' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const body = await req.json().catch(() => ({}))
        let { action, platform, code } = body
        if (action === 'exchange') action = 'callback'

        if (!action || (action !== 'start' && action !== 'callback')) {
            return new Response(JSON.stringify({ error: 'Action inconnue' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        if (!CONFIG[platform]) return new Response(JSON.stringify({ error: 'Plateforme non supportée' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        // START: return provider auth URL
        if (action === 'start') {
            const clientId = Deno.env.get(CONFIG[platform].clientIdEnv)
            if (!clientId) return new Response(JSON.stringify({ error: `Configuration serveur manquante pour ${platform}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

            // Minimal state: random UUID or timestamp
            let state = ''
            try { state = crypto.randomUUID(); } catch (e) { state = `${user.id}-${Date.now()}` }

            try {
                await supabase.from('oauth_states').insert({ state, user_id: user.id, created_at: new Date().toISOString() })
            } catch (e) {
                // ignore storage errors
            }

            let authUrl = ''
            if (platform === 'google') {
                const params = new URLSearchParams({
                    client_id: clientId,
                    redirect_uri: OAUTH_REDIRECT_URI,
                    response_type: 'code',
                    scope: 'https://www.googleapis.com/auth/business.manage openid email profile',
                    access_type: 'offline',
                    prompt: 'consent',
                    state,
                })
                authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
            } else {
                return new Response(JSON.stringify({ error: 'Start not implemented for this platform' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            return new Response(JSON.stringify({ authUrl }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // CALLBACK: exchange code using server redirect URI
        const clientId = Deno.env.get(CONFIG[platform].clientIdEnv)
        const clientSecret = Deno.env.get(CONFIG[platform].clientSecretEnv)
        if (!clientId || !clientSecret) return new Response(JSON.stringify({ error: `Configuration serveur manquante pour ${platform}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        if (!code) return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const payload: any = {
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            redirect_uri: OAUTH_REDIRECT_URI,
            grant_type: 'authorization_code',
        }

        const tokenRes = await fetch(CONFIG[platform].tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(payload),
        })

        const tokenJson = await tokenRes.json().catch(() => ({}))
        if (!tokenRes.ok || tokenJson.error || !tokenJson.access_token) {
            console.error('OAuth token exchange failed:', tokenJson)
            return new Response(JSON.stringify({ error: tokenJson.error_description || tokenJson.error?.message || 'Échec échange token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        let accessToken = tokenJson.access_token as string
        let refreshToken = (tokenJson.refresh_token as string) || null
        let expiresIn = (tokenJson.expires_in as number) || null

        if (platform === 'facebook' || platform === 'instagram') {
            const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${accessToken}`
            const longRes = await fetch(longLivedUrl)
            const longJson = await longRes.json().catch(() => ({}))
            if (longJson?.access_token) {
                accessToken = longJson.access_token
                expiresIn = longJson.expires_in || 60 * 60 * 24 * 60
            }
        }

        const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null

        // Identify account
        let accountId = 'unknown'
        let accountName = platform
        let avatarUrl = ''
        if (platform === 'linkedin') {
            const meRes = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } })
            const me = await meRes.json().catch(() => ({}))
            accountId = me.sub || 'linkedin'
            accountName = me.name || 'LinkedIn'
            avatarUrl = me.picture || ''
        } else if (platform === 'facebook') {
            const meRes = await fetch(`https://graph.facebook.com/me?fields=id,name,picture&access_token=${accessToken}`)
            const me = await meRes.json().catch(() => ({}))
            accountId = me.id || 'facebook'
            accountName = me.name || 'Facebook'
            avatarUrl = me.picture?.data?.url || ''
        } else if (platform === 'google') {
            accountId = 'google_business'
            accountName = 'Google Business Profile'
        }

        const { error: dbError } = await supabase.from('social_accounts').upsert(
            {
                organization_id: userProfile.organization_id,
                platform,
                access_token: accessToken,
                refresh_token: refreshToken,
                token_expires_at: expiresAt,
                external_id: accountId,
                name: accountName,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'organization_id, platform' }
        )

        if (dbError) return new Response(JSON.stringify({ error: dbError.message || 'DB error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        return new Response(JSON.stringify({ success: true, name: accountName }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error("Social OAuth Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})