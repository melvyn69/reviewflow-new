import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const ALLOWED_ORIGINS = new Set([
  "https://reviewflow2.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
]);

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://reviewflow2.vercel.app";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

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
  const corsHeaders = buildCorsHeaders(req);

  // ✅ Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ✅ Auth (uniquement sur POST)
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized (missing bearer token)" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: authError } = await supabase.auth.getUser(jwt);
    const user = userData?.user;

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Org
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    if (!userProfile?.organization_id) throw new Error("No organization linked");

    const body = await req.json().catch(() => ({}));
    const { action, platform, code, redirectUri } = body;

    if (action !== "exchange") throw new Error("Action inconnue");
    if (!platform || !CONFIG[platform]) throw new Error("Plateforme non supportée");
    if (!code) throw new Error("Missing code");
    if (!redirectUri) throw new Error("Missing redirectUri");

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
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
