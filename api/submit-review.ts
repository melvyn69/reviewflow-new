import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

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

    const finalBody = feedback || '';

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
            keywords: tags || [], 
            flags: { hygiene: false, security: false } 
        },
    };

    const { data, error } = await supabase.from('reviews').insert(newReview).select();

    if (error) {
        console.error("Supabase Insert Error:", error);
        return res.status(500).json({ error: `Erreur Base de données: ${error.message}` });
    }

    // --- ALERTE EMAIL (Nouveau) ---
    // Si la note est critique (<= 3), on envoie un email via Resend
    if (rating <= 3 && RESEND_KEY) {
        try {
            // 1. Trouver l'email de l'admin de l'organisation
            const { data: location } = await supabase.from('locations').select('organization_id, name').eq('id', locationId).single();
            if (location?.organization_id) {
                const { data: user } = await supabase.from('users').select('email').eq('organization_id', location.organization_id).single();
                
                if (user?.email) {
                    const resend = new Resend(RESEND_KEY);
                    await resend.emails.send({
                        from: 'Reviewflow <alerts@resend.dev>',
                        to: user.email,
                        subject: `⚠️ Alerte Avis Négatif (${rating}/5) - ${location.name}`,
                        html: `
                            <h2>Nouvel avis critique reçu</h2>
                            <p><strong>Note :</strong> ${rating}/5</p>
                            <p><strong>Message :</strong> ${finalBody || "Aucun message"}</p>
                            <p><strong>Contact client :</strong> ${contact || "Non renseigné"}</p>
                            <p><strong>Tags :</strong> ${(tags || []).join(', ')}</p>
                            <br/>
                            <a href="https://reviewflow.vercel.app" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Répondre maintenant</a>
                        `
                    });
                    console.log("Email d'alerte envoyé à", user.email);
                }
            }
        } catch (emailErr) {
            console.error("Erreur envoi email alerte:", emailErr);
            // On ne bloque pas la réponse HTTP pour une erreur d'email secondaire
        }
    }

    return res.status(200).json({ success: true, data });

  } catch (error: any) {
    console.error('Erreur insertion avis handler:', error);
    return res.status(500).json({ error: error.message || "Erreur interne du serveur." });
  }
}