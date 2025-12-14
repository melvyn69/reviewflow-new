
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Server Config Error");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Verify API Key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "Missing x-api-key header" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Find organization with this key
    // Assuming organization table has api_keys column as JSONB array of objects { id, key, name, ... }
    const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id, api_keys')
        .contains('api_keys', JSON.stringify([{ key: apiKey }])); // JSONB contain search might need adjustment based on exact schema structure, using a query that finds rows where api_keys contains an element with key=apiKey

    // Alternative simpler approach if JSONB contains query is tricky: fetch all orgs (not efficient for prod but ok for demo) or better, specific query
    // Optimisation: use a Postgres function or a dedicated api_keys table. 
    // Here we will rely on fetching the org that matches. 
    // Since RLS is bypassed with service_role, we must be careful.
    
    // Efficient query for JSONB array contains
    // Note: This query assumes `api_keys` is `[{ "key": "..." }]`
    const { data: matchedOrgs, error } = await supabase
        .from('organizations')
        .select('id')
        .filter('api_keys', 'cs', `[{"key": "${apiKey}"}]`)
        .single();

    if (error || !matchedOrgs) {
        return new Response(JSON.stringify({ error: "Invalid API Key" }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const orgId = matchedOrgs.id;

    // 2. Route Request
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop(); // simplistic routing

    if (path === 'reviews') {
        const { data: reviews } = await supabase
            .from('reviews')
            .select('id, author_name, rating, text, source, received_at, location_id')
            .eq('location_id', orgId) // Assuming location_id links to org, or do join. Here strictly: we need to join locations.
            // Better: Get all location IDs for this org first.
            
        const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', orgId);
        const locationIds = locations?.map((l: any) => l.id) || [];
        
        if (locationIds.length === 0) {
             return new Response(JSON.stringify({ data: [], meta: { total: 0 } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data: reviewsData, count } = await supabase
            .from('reviews')
            .select('*', { count: 'exact' })
            .in('location_id', locationIds)
            .order('received_at', { ascending: false })
            .range(from, to);

        return new Response(
            JSON.stringify({ 
                data: reviewsData, 
                meta: { 
                    total: count, 
                    page, 
                    limit 
                } 
            }), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (path === 'stats') {
        // Mock simple stats calculation or fetch from a materialized view
        // 1. Get location IDs
        const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', orgId);
        const locationIds = locations?.map((l: any) => l.id) || [];

        if (locationIds.length === 0) {
             return new Response(JSON.stringify({ average_rating: 0, total_reviews: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .in('location_id', locationIds);
        
        const total = reviews?.length || 0;
        const average = total > 0 ? (reviews?.reduce((acc: number, r: any) => acc + r.rating, 0) / total) : 0;

        return new Response(
            JSON.stringify({ 
                average_rating: parseFloat(average.toFixed(2)),
                total_reviews: total
            }), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(JSON.stringify({ error: "Endpoint not found" }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error("API Gateway Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
