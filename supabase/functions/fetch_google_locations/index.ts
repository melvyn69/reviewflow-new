
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
        return new Response(JSON.stringify({ locations: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Récupérer les établissements (Locations) pour chaque compte
    // Pour simplifier, on prend le premier compte, mais idéalement on boucle sur tous.
    // API: https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list
    
    let allLocations: any[] = []

    for (const account of accounts) {
        console.log(`Fetching locations for account: ${account.name}`)
        
        // readMask est obligatoire dans la v1 pour optimiser la réponse
        const locationsUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storeCode,metadata,latlng`;
        
        const locRes = await fetch(locationsUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (locRes.ok) {
            const locData = await locRes.json()
            if (locData.locations) {
                allLocations = [...allLocations, ...locData.locations]
            }
        } else {
            console.error(`Error fetching locations for ${account.name}:`, await locRes.text())
        }
    }

    // Transform data for frontend
    const mappedLocations = allLocations.map((loc: any) => ({
        name: loc.name, // resource name (ex: accounts/X/locations/Y)
        title: loc.title,
        storeCode: loc.storeCode || 'N/A'
    }))

    return new Response(
      JSON.stringify(mappedLocations),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
