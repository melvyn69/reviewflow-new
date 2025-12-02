import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    // Vercel parse parfois le body automatiquement, parfois non.
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            console.error("JSON Parse Error:", e);
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
          error: "Erreur de configuration serveur (Price ID manquant)." 
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
      success_url: successUrl || 'https://example.com',
      cancel_url: cancelUrl || 'https://example.com',
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return res.status(500).json({ error: error.message || "Erreur interne Stripe" });
  }
}