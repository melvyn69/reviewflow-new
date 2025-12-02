
import Stripe from 'stripe';

// Initialisation de Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { plan, successUrl, cancelUrl } = JSON.parse(req.body);

    // --- IMPORTANT : CONFIGURATION DES PRIX ---
    // Vous devez définir ces variables dans Vercel (Settings > Environment Variables)
    // STRIPE_PRICE_ID_STARTER = price_xxxxxx
    // STRIPE_PRICE_ID_PRO = price_yyyyyy
    // Si vous ne les avez pas encore, remplacez les valeurs par défaut ci-dessous par vos IDs en dur temporairement (ex: 'price_1P...')
    
    const prices: Record<string, string | undefined> = {
      'starter': process.env.STRIPE_PRICE_ID_STARTER, 
      'pro': process.env.STRIPE_PRICE_ID_PRO
    };

    const priceId = prices[plan];

    if (!priceId) {
      console.error(`Erreur: Aucun ID de prix trouvé pour le plan '${plan}'. Vérifiez vos variables d'environnement.`);
      return res.status(400).json({ error: "Configuration du plan invalide coté serveur." });
    }

    // Création de la session de paiement
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Metadata optionnelles pour le webhook
      // metadata: { plan: plan }
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
