import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { buffer } from 'micro'; 

export const config = {
  api: {
    bodyParser: false, 
  },
};

// Gestion robuste des variables d'environnement
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!STRIPE_SECRET || !WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ERREUR CONFIG: Variables d'environnement manquantes pour le Webhook Stripe.");
}

const stripe = new Stripe(STRIPE_SECRET!, {
  apiVersion: '2023-10-16' as any,
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    event = stripe.webhooks.constructEvent(buf, sig as string, WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error(`⚠️  Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

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
            // Stripe peut mettre l'email à deux endroits selon le contexte
            const customerEmail = session.customer_details?.email || session.customer_email;
            
            // On vérifie aussi si l'email a été pré-rempli via notre lien
            const prefilledEmail = session.custom_fields?.find((f:any) => f.key === 'email')?.text?.value;

            const emailToSearch = customerEmail || prefilledEmail;

            if (emailToSearch) {
                console.log(`🔎 Recherche utilisateur par email : ${emailToSearch}`);
                const { data: user } = await supabase.from('users').select('id, organization_id').eq('email', emailToSearch).single();
                
                if (user) {
                    userId = user.id;
                    console.log(`✅ Utilisateur retrouvé : ${userId} (Org: ${user.organization_id})`);
                } else {
                    console.warn(`⚠️ Aucun utilisateur trouvé pour l'email ${emailToSearch}`);
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