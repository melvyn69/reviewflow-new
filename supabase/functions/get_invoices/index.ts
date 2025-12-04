
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!stripeKey) {
        throw new Error("STRIPE_SECRET_KEY manquante");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any })

    // 1. Auth Check
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) throw new Error('Unauthorized')

    // 2. Get Stripe Customer ID from Org
    const { data: userProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
    if (!userProfile?.organization_id) throw new Error('No organization linked')

    const { data: org } = await supabase.from('organizations').select('stripe_customer_id').eq('id', userProfile.organization_id).single()
    
    if (!org?.stripe_customer_id) {
        // Pas encore de client Stripe => renvoyer liste vide
        return new Response(JSON.stringify({ invoices: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Fetch Invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: org.stripe_customer_id,
      limit: 10,
    });

    // 4. Format for Frontend
    const formattedInvoices = invoices.data.map((inv: any) => ({
        id: inv.id,
        date: new Date(inv.created * 1000).toLocaleDateString(),
        amount: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: inv.currency }).format(inv.total / 100),
        status: inv.status,
        pdf_url: inv.invoice_pdf,
        number: inv.number
    }));

    return new Response(
      JSON.stringify({ invoices: formattedInvoices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Get Invoices Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
