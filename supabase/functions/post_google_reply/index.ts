
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { reviewId, replyText } = await req.json();

    if (!reviewId || !replyText) {
        throw new Error("Missing reviewId or replyText");
    }

    // 1. Init Supabase Admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Google Secrets
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!googleClientId || !googleClientSecret) {
        throw new Error("Server Config Error: Missing Google Secrets");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 2. Get Review Details (need external_id and location info)
    const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .select(`
            id, 
            external_id, 
            location_id,
            location:locations (
                id,
                external_reference,
                organization_id,
                organization:organizations (
                    id,
                    google_refresh_token
                )
            )
        `)
        .eq('id', reviewId)
        .single();

    if (reviewError || !review) throw new Error("Review not found or DB Error");
    if (!review.external_id) throw new Error("This review is not linked to Google (Missing external ID)");
    
    // Type assertion hack for nested joins
    const location = review.location as any;
    const org = location?.organization as any;

    if (!location?.external_reference) throw new Error("Location not linked to Google");
    if (!org?.google_refresh_token) throw new Error("Organization not connected to Google");

    // 3. Refresh Google Access Token
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

    // 4. Post Reply to Google
    // Resource Name Format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
    // location.external_reference contains "accounts/{accountId}/locations/{locationId}"
    const reviewResourceName = `${location.external_reference}/reviews/${review.external_id}`;
    const replyUrl = `https://mybusiness.googleapis.com/v4/${reviewResourceName}/reply`;

    console.log(`Posting reply to: ${replyUrl}`);

    const googleRes = await fetch(replyUrl, {
        method: 'PUT', // Use PUT to create or update reply
        headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            comment: replyText
        })
    });

    if (!googleRes.ok) {
        const errText = await googleRes.text();
        throw new Error(`Google API Error: ${errText}`);
    }

    // 5. Update Supabase
    const { error: updateError } = await supabase
        .from('reviews')
        .update({ 
            status: 'sent', 
            posted_reply: replyText,
            replied_at: new Date().toISOString()
        })
        .eq('id', reviewId);

    if (updateError) console.error("Failed to update local DB status", updateError);

    return new Response(
      JSON.stringify({ success: true }),
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
