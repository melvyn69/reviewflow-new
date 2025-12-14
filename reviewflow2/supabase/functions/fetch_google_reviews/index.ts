import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    let body;
    try { body = await req.json(); } catch (e) { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders }); }

    const { locationId, googleLocationName, organizationId } = body;

    if (!googleLocationName || !organizationId) {
        return new Response(JSON.stringify({ error: "Missing googleLocationName or organizationId" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Initialisation Supabase
    const supabaseUrl = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Google Secrets
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Server Config Error: Missing secrets");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 2. Fetch Token from social_accounts
    const { data: socialAcc } = await supabase
        .from('social_accounts')
        .select('access_token, refresh_token, token_expires_at')
        .eq('organization_id', organizationId)
        .eq('platform', 'google')
        .single();

    if (!socialAcc) {
        throw new Error("No Google Social Account found for this organization.");
    }

    let accessToken = socialAcc.access_token;

    // Check expiration and refresh
    const now = new Date();
    const expiresAt = socialAcc.token_expires_at ? new Date(socialAcc.token_expires_at) : new Date(0);

    if (expiresAt < now && socialAcc.refresh_token) {
        console.log("Refreshing Google Token...");
        if (!googleClientId || !googleClientSecret) throw new Error("Missing Google Client ID/Secret for refresh");

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: googleClientId,
                client_secret: googleClientSecret,
                refresh_token: socialAcc.refresh_token,
                grant_type: 'refresh_token'
            })
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) {
            throw new Error(`Google Token Refresh Failed: ${tokenData.error_description || tokenData.error}`);
        }

        accessToken = tokenData.access_token;
        const newExpiresIn = tokenData.expires_in || 3600;
        const newExpiresAt = new Date(now.getTime() + newExpiresIn * 1000).toISOString();

        await supabase.from('social_accounts').update({
            access_token: accessToken,
            token_expires_at: newExpiresAt
        }).eq('organization_id', organizationId).eq('platform', 'google');
    }

    // 3. Fetch Reviews
    console.log(`Fetching reviews for: ${googleLocationName}`);
    const googleUrl = `https://mybusiness.googleapis.com/v4/${googleLocationName}/reviews?pageSize=50`;
    
    const googleRes = await fetch(googleUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!googleRes.ok) {
        const errText = await googleRes.text();
        throw new Error(`Google API Error: ${errText}`);
    }

    const googleData = await googleRes.json();
    const googleReviews = googleData.reviews || [];
    
    // 4. Upsert Reviews into Supabase
    let importedCount = 0;
    for (const gReview of googleReviews) {
        const ratingMap: any = { "ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5, "STAR_RATING_UNSPECIFIED": 0 };
        const rating = ratingMap[gReview.starRating] || 0;
        const reviewId = gReview.reviewId || gReview.name.split('/').pop();

        const reviewPayload = {
            location_id: locationId,
            source: 'google',
            rating: rating,
            text: gReview.comment || "(Pas de commentaire)",
            author_name: gReview.reviewer?.displayName || "Anonyme",
            received_at: gReview.createTime,
            status: 'pending',
            external_id: reviewId,
            language: 'fr',
            analysis: { 
                sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral',
                themes: [],
                keywords: [],
                flags: { hygiene: false, security: false }
            }
        };

        const { error } = await supabase
            .from('reviews')
            .upsert(reviewPayload, { onConflict: 'external_id', ignoreDuplicates: false });

        if (!error) importedCount++;
    }

    return new Response(
      JSON.stringify({ success: true, count: importedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Function Error:", error.message);
    return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})