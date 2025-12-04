
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // Try specific key first, fallback to generic API_KEY if configured for multiple services
    const googlePlacesKey = Deno.env.get('GOOGLE_PLACES_API_KEY') || Deno.env.get('API_KEY')!

    if (!googlePlacesKey) {
        throw new Error("Server Config Error: Missing GOOGLE_PLACES_API_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Verify User
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    // 2. Parse Inputs
    const { latitude, longitude, radius, keyword } = await req.json()

    if (!latitude || !longitude) {
        throw new Error("Latitude and Longitude are required");
    }

    // 3. Call Google Places API (Nearby Search)
    // Radius in meters (default 5000m = 5km)
    const searchRadius = (radius || 5) * 1000;
    const typeQuery = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '&type=establishment';
    
    // Using standard Places Nearby Search
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${searchRadius}${typeQuery}&key=${googlePlacesKey}`;
    
    console.log(`Fetching places: ${latitude},${longitude} r=${searchRadius} q=${keyword}`);

    const googleRes = await fetch(url);
    const googleData = await googleRes.json();

    if (googleData.status !== 'OK' && googleData.status !== 'ZERO_RESULTS') {
        console.error("Google API Error", googleData);
        throw new Error(`Google Places Error: ${googleData.status} - ${googleData.error_message || ''}`);
    }

    const results = googleData.results || [];

    // 4. Transform & Analyze Data
    const competitors = results.map((place: any) => {
        // Calculate "Threat Level" (0-100)
        // Logic: Rating (0-5) contributes 60% of threat. Volume contributes 40%.
        const rating = place.rating || 0;
        const count = place.user_ratings_total || 0;
        
        let threat = 0;
        if (count > 0) {
            // High rating (4.5+) is dangerous. Low rating is less threat.
            threat += (rating / 5) * 60; 
            // High volume means established competitor. Cap at 500 reviews for max score.
            threat += Math.min(count, 500) / 500 * 40; 
        }

        // Basic sentiment inference based on rating for "Strengths/Weaknesses"
        const strengths = [];
        const weaknesses = [];
        
        if (rating >= 4.5) strengths.push("Réputation Excellence");
        else if (rating >= 4.0) strengths.push("Bonne popularité");
        else if (rating < 3.5) weaknesses.push("Satisfaction client");
        
        if (count > 100) strengths.push("Volume d'avis");
        else weaknesses.push("Visibilité faible");

        return {
            place_id: place.place_id,
            name: place.name,
            address: place.vicinity,
            rating: rating,
            review_count: count,
            types: place.types,
            location: place.geometry.location,
            threat_level: Math.round(threat),
            strengths: strengths.length > 0 ? strengths : ["Localisation"],
            weaknesses: weaknesses.length > 0 ? weaknesses : ["Potentiel inexploité"]
        };
    });

    // Sort by threat level descending
    competitors.sort((a: any, b: any) => b.threat_level - a.threat_level);

    return new Response(
      JSON.stringify({ success: true, results: competitors.slice(0, 15) }), // Limit to top 15 results
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Fetch Places Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
