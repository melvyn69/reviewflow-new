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

    // 1. Get User info from Auth Header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) throw new Error('Unauthorized')

    // 2. Get Organization ID
    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
    if (!profile?.organization_id) throw new Error("User has no organization");

    // 3. Fetch Token from social_accounts
    const { data: socialAcc } = await supabase
        .from('social_accounts')
        .select('access_token, refresh_token, token_expires_at')
        .eq('organization_id', profile.organization_id)
        .eq('platform', 'google')
        .single();
    
    if (!socialAcc) {
        throw new Error("Google account not connected (No entry in social_accounts). Please reconnect in Settings.");
    }

    let accessToken = socialAcc.access_token;

    // Check expiration and refresh if needed
    const now = new Date();
    const expiresAt = socialAcc.token_expires_at ? new Date(socialAcc.token_expires_at) : new Date(0);
    
    if (expiresAt < now && socialAcc.refresh_token) {
        console.log("Refreshing Google Token server-side...");
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

        // Update DB
        await supabase.from('social_accounts').update({
            access_token: accessToken,
            token_expires_at: newExpiresAt
        }).eq('organization_id', profile.organization_id).eq('platform', 'google');
    }

    if (!accessToken) {
      throw new Error("Could not obtain Google Access Token")
    }

    console.log("Fetching Google Accounts...")

    // 4. Fetch Accounts
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

    // 5. Fetch Locations
    let allLocations: any[] = []

    for (const account of accounts) {
        console.log(`Fetching locations for account: ${account.name}`)
        
        let nextPageToken = undefined;
        let pageCount = 0;

        do {
            let locationsUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storeCode,metadata,storefrontAddress&pageSize=100`;
            if (nextPageToken) locationsUrl += `&pageToken=${nextPageToken}`;

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
            } else {
                console.error(`Error fetching locations for ${account.name}:`, await locRes.text())
                nextPageToken = undefined;
            }
        } while (nextPageToken);
    }

    // 6. Map and Save/Return
    // For now we just return them for UI selection/confirmation, UI calls another endpoint to create
    // Or we create them here directly. Let's return mapped data.
    const mappedLocations = allLocations.map((loc: any) => {
        const addr = loc.storefrontAddress;
        let addressStr = "Adresse inconnue";
        if (addr) {
            const lines = addr.addressLines ? addr.addressLines.join(', ') : '';
            addressStr = `${lines}, ${addr.locality || ''} ${addr.postalCode || ''}`.replace(/^, /, '');
        }

        return {
            name: loc.name, // resource name
            title: loc.title,
            storeCode: loc.storeCode || 'N/A',
            address: addressStr
        }
    })
    
    // Automatically Upsert logic if requested (or simple return)
    // Here we perform basic upsert for convenience
    for (const loc of mappedLocations) {
        // Find existing or create
        const { data: existing } = await supabase.from('locations')
            .select('id')
            .eq('organization_id', profile.organization_id)
            .eq('external_reference', loc.name)
            .maybeSingle();
            
        if (!existing) {
             await supabase.from('locations').insert({
                 organization_id: profile.organization_id,
                 name: loc.title,
                 address: loc.address,
                 city: loc.address.split(',').pop()?.trim() || 'Inconnue',
                 country: 'France', // Default
                 external_reference: loc.name,
                 connection_status: 'connected'
             });
        }
    }

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