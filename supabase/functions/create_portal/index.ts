
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')

    if (!supabaseUrl || !serviceRoleKey || !stripeKey) {
        throw new Error('Server Config Error: Missing secrets')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any })

    // 1. Get User from Auth Header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) throw new Error('Unauthorized')

    // 2. Get Organization and Stripe Customer ID
    const { data: userProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
    if (!userProfile?.organization_id) throw new Error('No organization linked')

    const { data: org } = await supabase.from('organizations').select('stripe_customer_id').eq('id', userProfile.organization_id).single()
    
    if (!org?.stripe_customer_id) throw new Error('Aucun abonnement actif trouvé (Stripe Customer ID manquant). Veuillez souscrire à un plan.')

    // 3. Create Portal Session
    // We expect the frontend to pass the return URL, otherwise default
    const body = await req.json().catch(() => ({}));
    const returnUrl = body.returnUrl || 'https://reviewflow.vercel.app/#/billing';

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Portal Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
