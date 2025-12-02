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
        
        // userId doit être passé dans metadata lors de la création de la session checkout
        const userId = session.client_reference_id; 
        
        // On récupère le plan depuis les metadata ou le line_item (selon implémentation create_checkout)
        // Ici on suppose que create_checkout a envoyé le plan dans metadata
        // ATTENTION : Stripe met parfois les metadatas à différents endroits
        
        // Pour simplifier, on va dire que si le montant > 5000 (50€), c'est PRO, sinon STARTER
        // Dans une vraie app, on mappe le price_id reçu.
        const amount = session.amount_total || 0;
        const planId = amount > 5000 ? 'pro' : 'starter'; 

        if (userId) {
            const { data: user } = await supabase.from('users').select('organization_id').eq('id', userId).single();
            
            if (user?.organization_id) {
                await supabase.from('organizations').update({
                    subscription_plan: planId,
                    stripe_customer_id: session.customer as string
                }).eq('id', user.organization_id);
                console.log(`✅ Abonnement activé pour l'org ${user.organization_id} : ${planId}`);
            } else {
                console.error(`❌ User ${userId} trouvé mais pas d'organisation liée.`);
            }
        } else {
            console.error("❌ Pas de client_reference_id (userId) dans la session Stripe.");
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase.from('organizations')
            .update({ subscription_plan: 'free' })
            .eq('stripe_customer_id', subscription.customer as string);
        console.log(`⚠️ Abonnement supprimé pour le customer ${subscription.customer}`);
        break;
      }

      default:
        console.log(`ℹ️ Type d'événement non géré : ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('❌ Erreur processing webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}