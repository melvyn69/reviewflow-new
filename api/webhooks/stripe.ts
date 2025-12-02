import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { buffer } from 'micro'; 

export const config = {
  api: {
    bodyParser: false, 
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    if (!webhookSecret) {
        console.error("❌ STRIPE_WEBHOOK_SECRET manquant dans les variables d'environnement Vercel.");
        return res.status(500).send("Server Configuration Error");
    }

    event = stripe.webhooks.constructEvent(buf, sig as string, webhookSecret);
  } catch (err: any) {
    console.error(`⚠️  Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log(`🔔 Événement Stripe reçu : ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // 1. Essayer de récupérer l'ID utilisateur (si passé manuellement)
        let userId = session.client_reference_id; 
        
        // 2. STRATÉGIE DE SECOURS (Payment Links) : 
        // Si pas d'ID, on cherche l'utilisateur par son EMAIL dans Supabase
        if (!userId) {
            const customerEmail = session.customer_details?.email || session.customer_email;
            if (customerEmail) {
                console.log(`🔎 Recherche utilisateur par email : ${customerEmail}`);
                const { data: user } = await supabase.from('users').select('id, organization_id').eq('email', customerEmail).single();
                
                if (user) {
                    userId = user.id;
                    console.log(`✅ Utilisateur retrouvé : ${userId} (Org: ${user.organization_id})`);
                } else {
                    console.warn(`⚠️ Aucun utilisateur trouvé pour l'email ${customerEmail}`);
                }
            }
        }

        // 3. Activation du plan
        if (userId) {
            // Re-vérification de l'organisation
            const { data: user } = await supabase.from('users').select('organization_id').eq('id', userId).single();

            if (user?.organization_id) {
                const amount = session.amount_total || 0;
                // Logique simple : > 50€ = Pro, sinon Starter
                const planId = amount > 5000 ? 'pro' : 'starter'; 

                await supabase.from('organizations').update({
                    subscription_plan: planId,
                    stripe_customer_id: session.customer as string
                }).eq('id', user.organization_id);
                
                console.log(`🎉 Abonnement ${planId.toUpperCase()} activé pour l'organisation ${user.organization_id}`);
            }
        } else {
            console.error("❌ Impossible d'identifier le client pour activer l'abonnement.");
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase.from('organizations')
            .update({ subscription_plan: 'free' })
            .eq('stripe_customer_id', subscription.customer as string);
        console.log(`⚠️ Abonnement résilié pour le client Stripe ${subscription.customer}`);
        break;
      }

      default:
        console.log(`ℹ️ Type d'événement ignoré : ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('❌ Erreur processing webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}