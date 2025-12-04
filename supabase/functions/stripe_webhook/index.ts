
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

declare const Deno: any;

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string

    if (!endpointSecret) {
        throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    }

    // Verify signature using the raw body
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      endpointSecret,
      undefined,
      cryptoProvider
    )

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    )

    console.log(`🔔 Event received: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        
        // 1. Try to find user via client_reference_id
        let userId = session.client_reference_id
        
        // 2. Fallback: Try to find via email
        if (!userId) {
            const customerEmail = session.customer_details?.email || session.customer_email;
            if (customerEmail) {
                const { data: user } = await supabase.from('users').select('id').eq('email', customerEmail).single();
                if (user) userId = user.id;
            }
        }

        if (userId) {
            const { data: profile } = await supabase.from('users').select('organization_id').eq('id', userId).single()
            
            if (profile?.organization_id) {
                // Logic: Price based plan determination or Metadata
                // Simple logic: If amount > 5000 (50.00), assume Pro, else Starter
                const amount = session.amount_total || 0;
                const plan = amount > 6000 ? 'pro' : 'starter';

                await supabase.from('organizations').update({
                    subscription_plan: plan,
                    stripe_customer_id: session.customer
                }).eq('id', profile.organization_id)
                
                console.log(`✅ Organization ${profile.organization_id} upgraded to ${plan}`)
            }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer
        
        await supabase.from('organizations')
            .update({ subscription_plan: 'free' })
            .eq('stripe_customer_id', customerId)
            
        console.log(`⚠️ Subscription deleted for customer ${customerId}`)
        break
      }
      
      case 'invoice.payment_succeeded': {
          // Optional: Extend expiry date or log invoice
          break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error(`❌ Error: ${err.message}`)
    return new Response(err.message, { status: 400 })
  }
})
