
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

    if (!supabaseUrl || !serviceRoleKey || !googleClientId || !googleClientSecret) {
        throw new Error("Server Config Error: Missing secrets (DB or Google)");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 2. Récupérer le Refresh Token de l'organisation
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('google_refresh_token')
        .eq('id', organizationId)
        .single();

    if (orgError || !org?.google_refresh_token) {
        throw new Error("No Google Refresh Token found for this organization. Please reconnect Google Account.");
    }

    // 3. Echanger le Refresh Token contre un Access Token
    console.log("Refreshing Google Token...");
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: org.google_refresh_token,
            grant_type: 'refresh_token'
        })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
        throw new Error(`Google Token Refresh Failed: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;
    console.log("Access Token Refreshed successfully.");

    // 4. Fetch Reviews using the new Access Token
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
    
    // 5. Upsert Reviews into Supabase
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
