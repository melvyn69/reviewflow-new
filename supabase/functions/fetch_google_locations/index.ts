
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Server Config Error: Missing Supabase keys")
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Get User info from Auth Header (to find Org)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) throw new Error('Unauthorized')

    // 2. Determine Access Token
    let accessToken = null;
    
    // Check if passed in body
    const body = await req.json().catch(() => ({}));
    if (body.accessToken) {
        accessToken = body.accessToken;
    } else {
        // Fallback: Refresh from DB
        if (!googleClientId || !googleClientSecret) {
            throw new Error("Server Config Error: Missing Google Client ID/Secret for refresh");
        }

        const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
        if (!profile?.organization_id) throw new Error("User has no organization");

        const { data: org } = await supabase.from('organizations').select('google_refresh_token').eq('id', profile.organization_id).single();
        
        if (!org?.google_refresh_token) {
            throw new Error("Google account not connected (No Refresh Token). Please reconnect in Settings.");
        }

        console.log("Refreshing Google Token server-side...");
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
        accessToken = tokenData.access_token;
    }

    if (!accessToken) {
      throw new Error("Could not obtain Google Access Token")
    }

    console.log("Fetching Google Accounts...")

    // 3. Récupérer les comptes (Accounts)
    // API: https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts
    const accountsRes = await fetch('https://mybusinessbusinessinformation.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!accountsRes.ok) {
        const err = await accountsRes.text()
        console.error("Google Accounts API Error:", err)
        throw new Error(`Google API Error: ${err}`)
    }

    const accountsData = await accountsRes.json()
    const accounts = accountsData.accounts || []

    if (accounts.length === 0) {
        return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 4. Récupérer les établissements (Locations) pour TOUS les comptes avec PAGINATION
    let allLocations: any[] = []

    for (const account of accounts) {
        console.log(`Fetching locations for account: ${account.name}`)
        
        let nextPageToken = undefined;
        let pageCount = 0;

        do {
            // readMask indispensable pour la v1. On ajoute storefrontAddress pour l'affichage UI.
            let locationsUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storeCode,metadata,storefrontAddress&pageSize=100`;
            
            if (nextPageToken) {
                locationsUrl += `&pageToken=${nextPageToken}`;
            }

            const locRes = await fetch(locationsUrl, {
                headers: { Authorization: `Bearer ${accessToken}` }
            })

            if (locRes.ok) {
                const locData = await locRes.json()
                if (locData.locations && locData.locations.length > 0) {
                    allLocations = [...allLocations, ...locData.locations];
                }
                nextPageToken = locData.nextPageToken;
                pageCount++;
                console.log(`Page ${pageCount} fetched for ${account.name}. Total so far: ${allLocations.length}`);
            } else {
                console.error(`Error fetching locations for ${account.name}:`, await locRes.text())
                nextPageToken = undefined; // Stop loop on error
            }
        } while (nextPageToken);
    }

    // Transform data for frontend
    const mappedLocations = allLocations.map((loc: any) => {
        // Format address roughly for display
        const addr = loc.storefrontAddress;
        let addressStr = "Adresse inconnue";
        if (addr) {
            const lines = addr.addressLines ? addr.addressLines.join(', ') : '';
            addressStr = `${lines}, ${addr.locality || ''} ${addr.postalCode || ''}`.replace(/^, /, '');
        }

        return {
            name: loc.name, // resource name (ex: accounts/X/locations/Y) -> used as ID for mapping
            title: loc.title,
            storeCode: loc.storeCode || 'N/A',
            address: addressStr
        }
    })

    return new Response(
      JSON.stringify(mappedLocations),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error("Function Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
