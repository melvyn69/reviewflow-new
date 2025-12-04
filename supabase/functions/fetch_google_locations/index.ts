
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { accessToken } = await req.json()

    if (!accessToken) {
      throw new Error("Missing Google Access Token")
    }

    console.log("Fetching Google Accounts...")

    // 1. Récupérer les comptes (Accounts)
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

    // 2. Récupérer les établissements (Locations) pour TOUS les comptes avec PAGINATION
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
