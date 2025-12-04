
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 1. Initialisation Admin
    // Utilisation de PROJECT_URL/SERVICE_ROLE ou des noms par défaut Supabase
    const supabaseUrl = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Server Config Error: Missing SUPABASE_URL or SERVICE_ROLE");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("⏰ CRON START: Starting global reviews sync...");

    // 2. Récupérer tous les établissements qui ont un lien Google ET dont l'org a un Refresh Token
    // Note: On filtre côté code si la jointure complexe pose problème, mais ici on tente de sélectionner les bons candidats.
    const { data: locations, error } = await supabase
        .from('locations')
        .select(`
            id, 
            name, 
            external_reference, 
            organization_id, 
            organization:organizations!inner(id, google_refresh_token)
        `)
        .not('external_reference', 'is', null)
        .not('organization.google_refresh_token', 'is', null);

    if (error) {
        throw new Error(`Database Error: ${error.message}`);
    }

    if (!locations || locations.length === 0) {
        console.log("No locations to sync.");
        return new Response(JSON.stringify({ message: "No locations found to sync" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Found ${locations.length} locations to sync.`);

    // 3. Boucler et déclencher la sync pour chacun
    const results = [];
    const functionUrl = `${supabaseUrl}/functions/v1/fetch_google_reviews`;

    for (const loc of locations) {
        try {
            console.log(`Triggering sync for ${loc.name} (${loc.id})...`);
            
            // Appel HTTP interne vers l'autre fonction Edge
            const res = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`, // On utilise la clé Service Role pour l'appel entre fonctions
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    locationId: loc.id,
                    googleLocationName: loc.external_reference,
                    organizationId: loc.organization_id
                })
            });

            const resultJson = await res.json();
            
            if (res.ok) {
                results.push({ id: loc.id, status: 'success', imported: resultJson.count });
            } else {
                console.error(`Failed to sync ${loc.name}:`, resultJson);
                results.push({ id: loc.id, status: 'error', error: resultJson.error });
            }

        } catch (err: any) {
            console.error(`Exception syncing ${loc.name}:`, err.message);
            results.push({ id: loc.id, status: 'error', error: err.message });
        }
    }

    console.log("⏰ CRON END: Report:", results);

    return new Response(
      JSON.stringify({ success: true, report: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Cron Error:", error.message);
    return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
