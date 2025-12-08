
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    // --- REAL SCRAPING LOGIC WITH RETRY ---
    // Note: If you have an Outscraper API key, you would use it here.
    // Since we don't, we upgrade the Google Places logic to be more "scraper-like"
    // by using Text Search which provides more comprehensive lists for specific sectors
    // than Nearby Search which is strictly proximity based.

    let results = [];
    let success = false;
    const maxRetries = 2; // Total 3 attempts
    const startTime = Date.now();
    let finalError = null;

    // Radius in meters (default 5000m = 5km)
    // The radius parameter from frontend is in km, convert to meters
    const searchRadius = (radius || 5) * 1000;
    
    // Construct text search query: "keyword near lat,lng" logic
    // Google Places Text Search doesn't take lat/lng directly in query string easily for centering without bias
    // We use location & radius parameters with query.
    // Query Example: "Restaurant" 
    const query = keyword || 'establishment';
    
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${latitude},${longitude}&radius=${searchRadius}&key=${googlePlacesKey}`;

    console.log(`Scanning competitors: ${query} around ${latitude},${longitude} (r=${searchRadius}m)...`);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`Retry attempt ${attempt}...`);
                await sleep(1500 * attempt); // Backoff strategy
            }

            const googleRes = await fetch(url);
            
            if (!googleRes.ok) {
                throw new Error(`API Error ${googleRes.status}: ${await googleRes.text()}`);
            }

            const googleData = await googleRes.json();

            if (googleData.status === 'OK' && googleData.results?.length > 0) {
                results = googleData.results;
                success = true;
                break; // Success!
            } else if (googleData.status === 'ZERO_RESULTS') {
                // Not an error per se, but retrying might help if API flaked, 
                // though usually ZERO_RESULTS is definitive. We stop to save quota.
                console.log("Zero results found.");
                break;
            } else {
                throw new Error(`API Status: ${googleData.status} - ${googleData.error_message || ''}`);
            }

        } catch (e: any) {
            console.error(`Scan attempt ${attempt} failed:`, e.message);
            finalError = e.message;
        }
    }

    const durationMs = Date.now() - startTime;

    // 4. Transform & Analyze Data
    const competitors = results.map((place: any) => {
        // Calculate "Threat Level" (0-100)
        const rating = place.rating || 0;
        const count = place.user_ratings_total || 0;
        
        let threat = 0;
        if (count > 0) {
            // High rating (4.5+) is dangerous.
            threat += (rating / 5) * 60; 
            // Volume
            threat += Math.min(count, 500) / 500 * 40; 
        }

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
            address: place.formatted_address || place.vicinity, // Text Search returns formatted_address
            rating: rating,
            review_count: count,
            types: place.types,
            location: place.geometry.location,
            threat_level: Math.round(threat),
            strengths: strengths.length > 0 ? strengths : ["Localisation"],
            weaknesses: weaknesses.length > 0 ? weaknesses : ["Potentiel inexploité"],
            // Construct Google Maps URL using Place ID for reliability
            url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`
        };
    });

    // Sort by threat level descending
    competitors.sort((a: any, b: any) => b.threat_level - a.threat_level);

    // 5. Log the Scan (Fire and Forget)
    try {
        await supabase.from('competitor_scans').insert({
            user_id: user.id,
            query: keyword,
            radius: radius,
            center_lat: latitude,
            center_lng: longitude,
            results_count: competitors.length,
            status: success ? 'success' : 'failure',
            error_message: finalError,
            execution_time_ms: durationMs,
            created_at: new Date().toISOString()
        });
    } catch (logErr) {
        console.error("Failed to log scan:", logErr);
        // Don't fail the request if logging fails
    }

    if (!success && competitors.length === 0) {
        return new Response(
            JSON.stringify({ error: finalError || "Aucun résultat trouvé après plusieurs tentatives." }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, results: competitors.slice(0, 20) }), // Top 20 relevant
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
