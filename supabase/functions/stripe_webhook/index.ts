

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { Resend } from "npm:resend@2.0.0"

declare const Deno: any;

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

const log = (event: string, data: any) => {
    console.log(JSON.stringify({ event, timestamp: new Date().toISOString(), data }));
};

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!endpointSecret) {
        throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    }

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

    log('WEBHOOK_RECEIVED', { type: event.type, id: event.id });

    // Prices mapping from env
    const PLAN_MAP: Record<string, string> = {
        [Deno.env.get('STRIPE_PRICE_ID_STARTER') || '']: 'starter',
        [Deno.env.get('STRIPE_PRICE_ID_PRO') || '']: 'pro'
    };

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        let userId = session.client_reference_id
        
        // Fallback search by email
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
                const amount = session.amount_total || 0;
                let plan = 'starter';
                if (amount > 6000) plan = 'pro'; // Simple threshold logic

                await supabase.from('organizations').update({
                    subscription_plan: plan,
                    stripe_customer_id: session.customer,
                    subscription_status: 'active'
                }).eq('id', profile.organization_id)
                
                log('SUBSCRIPTION_ACTIVATED', { orgId: profile.organization_id, plan });
            }
        }
        break
      }

      case 'invoice.paid': 
      case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          const customerId = invoice.customer as string;
          
          // 1. Update Org Status & Dates
          const { data: org } = await supabase.from('organizations').select('id').eq('stripe_customer_id', customerId).single();
          
          if (org) {
              await supabase.from('organizations').update({ 
                  subscription_status: 'active',
                  // Ensure we have current period end from subscription if available
              }).eq('id', org.id);

              // 2. Insert into billing_invoices table
              await supabase.from('billing_invoices').upsert({
                  organization_id: org.id,
                  stripe_invoice_id: invoice.id,
                  amount: invoice.amount_paid,
                  currency: invoice.currency,
                  status: invoice.status,
                  date: new Date(invoice.created * 1000).toISOString(),
                  pdf_url: invoice.invoice_pdf,
                  number: invoice.number
              }, { onConflict: 'stripe_invoice_id' });
              
              log('INVOICE_STORED', { customerId, invoiceId: invoice.id });
          }
          break;
      }

      case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const customerId = invoice.customer as string;

          // Mark as past_due
          await supabase.from('organizations')
            .update({ subscription_status: 'past_due' })
            .eq('stripe_customer_id', customerId);

          // Alert Org Admin
          const { data: org } = await supabase.from('organizations').select('id, name, users(email)').eq('stripe_customer_id', customerId).single();
          if (org && resendApiKey) {
              const resend = new Resend(resendApiKey);
              const emails = org.users.map((u:any) => u.email).filter(Boolean);
              if (emails.length > 0) {
                  await resend.emails.send({
                      from: 'Reviewflow Billing <billing@resend.dev>',
                      to: emails,
                      subject: '❌ Échec du paiement de votre abonnement',
                      html: `<p>Le paiement pour <strong>${org.name}</strong> a échoué. Votre abonnement risque d'être suspendu. <a href="https://reviewflow.vercel.app/#/billing">Mettre à jour</a></p>`
                  });
                  // Log alert in billing_alerts if table exists
                  // await supabase.from('billing_alerts').insert({...}) 
              }
          }
          log('PAYMENT_FAILED', { customerId, reason: invoice.billing_reason });
          break;
      }

      case 'customer.subscription.updated': {
          const subscription = event.data.object;
          const priceId = subscription.items.data[0].price.id;
          const newPlan = PLAN_MAP[priceId];
          const status = subscription.status; // active, past_due, canceled, trialing

          if (newPlan) {
              await supabase.from('organizations').update({
                  subscription_plan: newPlan,
                  subscription_status: status,
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  cancel_at_period_end: subscription.cancel_at_period_end
              }).eq('stripe_customer_id', subscription.customer);
              
              log('PLAN_UPDATED', { customerId: subscription.customer, newPlan, status });
          }
          break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer
        
        await supabase.from('organizations')
            .update({ subscription_plan: 'free', subscription_status: 'canceled' })
            .eq('stripe_customer_id', customerId)
            
        log('SUBSCRIPTION_CANCELED', { customerId });
        break
      }
      
      case 'customer.source.expiring': {
          const source = event.data.object;
          log('CARD_EXPIRING', { customerId: source.customer });
          // Logic handled in previous iteration (email alert logic could be here too)
          const { data: org } = await supabase.from('organizations').select('id, name, users(email)').eq('stripe_customer_id', source.customer).single();
          if (org && resendApiKey) {
              const resend = new Resend(resendApiKey);
              const emails = org.users.map((u:any) => u.email).filter(Boolean);
              if (emails.length > 0) {
                  await resend.emails.send({
                      from: 'Reviewflow Billing <billing@resend.dev>',
                      to: emails,
                      subject: '⚠️ Votre carte expire bientôt',
                      html: `<p>Attention, la carte associée à <strong>${org.name}</strong> expire bientôt. <a href="https://reviewflow.vercel.app/#/billing">Mettre à jour</a></p>`
                  });
              }
          }
          break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error(`❌ Webhook Error: ${err.message}`)
    return new Response(err.message, { status: 400 })
  }
})