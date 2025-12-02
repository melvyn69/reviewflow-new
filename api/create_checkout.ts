import Stripe from 'stripe';

// Initialisation sécurisée de Stripe
const stripeSecret = process.env.STRIPE_SECRET_KEY;

export default async function handler(req: any, res: any) {
  // Headers CORS pour autoriser les requêtes depuis le frontend
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Gestion de la requête pré-vol (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!stripeSecret) {
    console.error("ERREUR CRITIQUE: STRIPE_SECRET_KEY manquant.");
    return res.status(500).json({ error: "Server Configuration Error: Stripe Key Missing" });
  }

  const stripe = new Stripe(stripeSecret, {
    apiVersion: '2023-10-16',
  });

  try {
    let body = req.body;
    
    // Parsing manuel sécurisé si Vercel n'a pas parsé le body
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            return res.status(400).json({ error: "Invalid JSON body" });
        }
    }

    const { plan, successUrl, cancelUrl } = body || {};

    if (!plan) {
        return res.status(400).json({ error: "Plan parameter is required" });
    }

    const prices: Record<string, string | undefined> = {
      'starter': process.env.STRIPE_PRICE_ID_STARTER, 
      'pro': process.env.STRIPE_PRICE_ID_PRO
    };

    const priceId = prices[plan];

    if (!priceId) {
      console.error(`Erreur Configuration: ID manquant pour le plan '${plan}'.`);
      return res.status(400).json({ 
          error: `Erreur de configuration: Aucun prix défini pour le plan '${plan}'. Vérifiez les variables d'environnement.` 
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || 'https://example.com/success',
      cancel_url: cancelUrl || 'https://example.com/cancel',
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return res.status(500).json({ error: error.message || "Erreur interne Stripe" });
  }
}