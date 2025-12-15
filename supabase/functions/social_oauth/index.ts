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
    if (!supabaseUrl || !anonKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
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

      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let organizationId: string | null = null;

    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      // si ta table users/RLS pose souci, on ne bloque pas le flow OAuth
      organizationId = null;
    } else {
      organizationId = userProfile?.organization_id ?? null;
    }

    // ✅ fallback pour débloquer le flow tout de suite
    const ownerKey = organizationId ?? user.id;

    const body = await req.json().catch(() => ({}));
    const { action, platform, code, redirectUri } = body;

    if (!action || (action !== "start" && action !== "callback")) throw new Error("Action inconnue");
    // Simplified: only Google supported for now
    if (platform !== "google") throw new Error("Plateforme non supportée");
    if (action === "callback" && !code) throw new Error("Missing code");
    if (action === "callback" && !redirectUri) throw new Error("Missing redirectUri");

      // START: return provider auth URL
      if (action === "start") {
        if (!redirectUri) throw new Error("Missing redirectUri");
        const clientId = Deno.env.get(CONFIG[platform].clientIdEnv);
        if (!clientId) throw new Error(`Configuration serveur manquante pour ${platform}`);

        let authUrl = "";
        if (platform === "google") {
          const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "https://www.googleapis.com/auth/business.manage openid email profile",
            access_type: "offline",
            prompt: "consent",
          });
          authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        } else if (platform === "facebook" || platform === "instagram") {
          const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "pages_read_engagement,pages_manage_posts",
          });
          authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
        } else if (platform === "linkedin") {
          const params = new URLSearchParams({
            response_type: "code",
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: "r_liteprofile r_emailaddress w_member_social",
          });
          authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
        } else {
          throw new Error("Start not implemented for this platform");
        }

        return new Response(JSON.stringify({ authUrl }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

    const clientId = Deno.env.get(CONFIG[platform].clientIdEnv);
    const clientSecret = Deno.env.get(CONFIG[platform].clientSecretEnv);
    if (!clientId || !clientSecret) throw new Error(`Configuration serveur manquante pour ${platform}`);

    // Exchange code -> token
    const payload: Record<string, string> = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
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
