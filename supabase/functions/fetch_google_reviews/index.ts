
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { locationId, googleLocationName, accessToken } = await req.json()

    if (!accessToken) throw new Error("Google Access Token missing")
    if (!googleLocationName) throw new Error("Google Location Name missing")

    // 1. Fetch Reviews from Google API
    // Documentation: https://developers.google.com/my-business/content/review-data#list_reviews
    const googleUrl = `https://mybusiness.googleapis.com/v4/${googleLocationName}/reviews?pageSize=50`
    
    const googleRes = await fetch(googleUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    if (!googleRes.ok) {
        const err = await googleRes.text()
        console.error("Google API Error:", err)
        throw new Error(`Google API Error: ${googleRes.statusText}`)
    }

    const googleData = await googleRes.json()
    const googleReviews = googleData.reviews || []

    // 2. Init Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    let importedCount = 0

    // 3. Upsert Reviews
    for (const gReview of googleReviews) {
        // Map Google data to our Schema
        // Google Format: { starRating: "FIVE", comment: "...", createTime: "...", name: "accounts/X/locations/Y/reviews/Z" }
        
        const ratingMap: any = { "ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5 }
        const rating = ratingMap[gReview.starRating] || 0
        const reviewId = gReview.reviewId || gReview.name.split('/').pop()

        const reviewPayload = {
            location_id: locationId,
            source: 'google',
            rating: rating,
            text: gReview.comment || "", // Note: API v4 uses 'comment', API v1 'review'
            author_name: gReview.reviewer?.displayName || "Anonyme",
            received_at: gReview.createTime, // ISO format
            status: 'pending', // Default status for new reviews
            external_id: reviewId, // Store the Google ID to prevent duplicates
            language: 'fr', // Default, ideally detected via AI later
            // We use 'analysis' default jsonb structure
            analysis: { 
                sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral',
                themes: [],
                keywords: [],
                flags: { hygiene: false, security: false }
            }
        }

        // Upsert based on external_id AND location_id to avoid duplicates
        // Note: You need a unique constraint on (location_id, external_id) in SQL usually, 
        // or we check existence. Here using simple insert for demo logic, realistically use upsert.
        
        const { error } = await supabase
            .from('reviews')
            .upsert(reviewPayload, { onConflict: 'external_id' })
            .select()

        if (!error) importedCount++
    }

    return new Response(
      JSON.stringify({ success: true, count: importedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
