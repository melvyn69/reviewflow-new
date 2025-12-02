import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Configuration CORS pour autoriser les requêtes depuis le frontend
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Utilisation de la clé SERVICE_ROLE pour avoir les droits d'écriture
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Configuration Supabase manquante sur le serveur.");
    return res.status(500).json({ error: 'Configuration serveur incomplète (Clés Supabase).' });
  }

  // Création d'un client propre pour chaque requête sans persistance de session
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
      }
  });

  try {
    // Parsing manuel du body si nécessaire
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            return res.status(400).json({ error: "Invalid JSON body" });
        }
    }

    const { locationId, rating, feedback, contact, tags } = body || {};

    if (!locationId || !rating) {
        return res.status(400).json({ error: 'Données manquantes (locationId, rating)' });
    }

    // Construction de l'objet Review
    const tagString = tags && tags.length > 0 ? `\n\n[Points clés: ${tags.join(', ')}]` : '';
    const finalBody = `${feedback || ''}${tagString}`;

    // CORRECTION MAJEURE: On utilise uniquement 'text' qui est la colonne standard Supabase.
    // On ne passe PAS 'body' ici car la colonne n'existe pas en base.
    const newReview = {
        location_id: locationId,
        rating: rating,
        text: finalBody,
        author_name: contact || 'Client Anonyme (Funnel)',
        source: 'direct',
        status: 'pending',
        received_at: new Date().toISOString(),
        language: 'fr',
        analysis: { 
            sentiment: rating >= 4 ? 'positive' : 'negative', 
            themes: tags || [], 
            keywords: [], 
            flags: { hygiene: false, security: false } 
        },
    };

    const { data, error } = await supabase.from('reviews').insert(newReview).select();

    if (error) {
        console.error("Supabase Insert Error:", error);
        return res.status(500).json({ error: `Erreur Base de données: ${error.message}` });
    }

    return res.status(200).json({ success: true, data });

  } catch (error: any) {
    console.error('Erreur insertion avis handler:', error);
    return res.status(500).json({ error: error.message || "Erreur interne du serveur." });
  }
}