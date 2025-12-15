import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Configuration Map
const CONFIG: Record<string, any> = {
  facebook: {
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    clientIdEnv: "FACEBOOK_CLIENT_ID",
    clientSecretEnv: "FACEBOOK_CLIENT_SECRET",
  },
  instagram: {
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    clientIdEnv: "INSTAGRAM_CLIENT_ID",
    clientSecretEnv: "INSTAGRAM_CLIENT_SECRET",
  },
  linkedin: {
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
  },
  google: {
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  },
};

Deno.serve(async (req: Request) => {
  // ✅ Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const OAUTH_REDIRECT_URI = Deno.env.get("OAUTH_REDIRECT_URI");
    if (!supabaseUrl || !anonKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!OAUTH_REDIRECT_URI) {
      return new Response(JSON.stringify({ error: "OAUTH_REDIRECT_URI_NOT_SET" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized (missing bearer token)" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let organizationId: string | null = null;

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      organizationId = null;
    } else {
      organizationId = userProfile?.organization_id ?? null;
    }

    const ownerKey = organizationId ?? user.id;

    const body = await req.json().catch(() => ({}));
    let { action, platform, code } = body;
    // Backwards compat: accept old 'exchange' name
    if (action === 'exchange') action = 'callback';

    if (!action || (action !== "start" && action !== "callback")) {
      return new Response(JSON.stringify({ error: "Action inconnue" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (platform !== "google") return new Response(JSON.stringify({ error: "Plateforme non supportée" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // START: return provider auth URL
    if (action === "start") {
      const clientId = Deno.env.get(CONFIG[platform].clientIdEnv);
      if (!clientId) return new Response(JSON.stringify({ error: `Configuration serveur manquante pour ${platform}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Minimal state: associate user id (for debug/compatibility). A production app should generate a signed random state.
      const state = user.id;

      // store state to allow server-side verification later (best-effort)
      try {
        await supabase.from('oauth_states').insert({ state, user_id: user.id, created_at: new Date().toISOString() });
      } catch (e) {
        // ignore errors inserting state
        console.warn('Failed to store oauth state', e);
      }

      let authUrl = "";
      if (platform === "google") {
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: OAUTH_REDIRECT_URI,
          response_type: "code",
          scope: "https://www.googleapis.com/auth/business.manage openid email profile",
          access_type: "offline",
          prompt: "consent",
          state,
        });
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      } else {
        return new Response(JSON.stringify({ error: "Start not implemented for this platform" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ authUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For callback: use server-side configured redirect URI
    const clientId = Deno.env.get(CONFIG[platform].clientIdEnv);
    const clientSecret = Deno.env.get(CONFIG[platform].clientSecretEnv);
    if (!clientId || !clientSecret) return new Response(JSON.stringify({ error: `Configuration serveur manquante pour ${platform}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Exchange code -> token
    const payload: Record<string, string> = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: OAUTH_REDIRECT_URI,
      grant_type: "authorization_code",
    };

    const tokenRes = await fetch(CONFIG[platform].tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(payload),
    });

    const tokenJson = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || tokenJson.error || !tokenJson.access_token) {
      console.error("OAuth token exchange failed:", tokenJson);
      throw new Error(tokenJson.error_description || tokenJson.error?.message || "Échec échange token");
    }

    let accessToken = tokenJson.access_token as string;
    let refreshToken = (tokenJson.refresh_token as string) || null;
    let expiresIn = (tokenJson.expires_in as number) || null;

    // Facebook/Instagram long-lived
    if (platform === "facebook" || platform === "instagram") {
      const longLivedUrl =
        `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token` +
        `&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${accessToken}`;

      const longRes = await fetch(longLivedUrl);
      const longJson = await longRes.json().catch(() => ({}));
      if (longJson?.access_token) {
        accessToken = longJson.access_token;
        expiresIn = longJson.expires_in || 60 * 60 * 24 * 60;
      }
    }

    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // Identify account
    let accountId = "unknown";
    let accountName = platform;
    let avatarUrl = "";

    if (platform === "linkedin") {
      const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const me = await meRes.json().catch(() => ({}));
      accountId = me.sub || "linkedin";
      accountName = me.name || "LinkedIn";
      avatarUrl = me.picture || "";
    } else if (platform === "facebook") {
      const meRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,picture&access_token=${accessToken}`
      );
      const me = await meRes.json().catch(() => ({}));
      accountId = me.id || "facebook";
      accountName = me.name || "Facebook";
      avatarUrl = me.picture?.data?.url || "";
    } else if (platform === "google") {
      accountId = "google_business";
      accountName = "Google Business Profile";
    }

    // Save
    const { error: dbError } = await supabase.from("social_accounts").upsert(
      {
        organization_id: ownerKey,
        platform,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        external_id: accountId,
        name: accountName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id, platform" }
    );

    if (dbError) throw dbError;
    return new Response(JSON.stringify({ success: true, name: accountName }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Social OAuth Error:", error?.message || error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
