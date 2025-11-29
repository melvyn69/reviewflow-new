import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Récupération sécurisée de la clé
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
        throw new Error('Clé STRIPE_SECRET_KEY introuvable dans les secrets Supabase.');
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const { plan, successUrl, cancelUrl } = await req.json()

    // --- CONFIGURATION DES PRIX ---
    // Vous devez créer ces produits dans Stripe et récupérer leur 'API ID' (ex: price_1P...)
    const prices: Record<string, string> = {
        'starter': 'price_starter_monthly', 
        'pro': 'price_pro_monthly'
    }

    const priceId = prices[plan]

    if (!priceId) {
         throw new Error(`Le plan '${plan}' n'a pas d'ID de prix configuré dans la fonction.`);
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl ?? 'https://example.com/success',
      cancel_url: cancelUrl ?? 'https://example.com/cancel',
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error("Stripe Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})