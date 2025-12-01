import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request: any, response: any) {
  console.log("🤖 Robot Reviewflow : Démarrage...");

  // 🔐 BACKEND UNIQUEMENT
  const SUPABASE_URL =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; // on garde le fallback URL si tu l'avais déjà
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // clé ultra sensible, serveur only
  const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.VITE_API_KEY; // on tolère d'anciens noms si tu les as déjà

  // Debug log (juste pour voir si les vars existent, sans afficher les valeurs)
  console.log("Env Check:", {
    url: !!SUPABASE_URL,
    serviceRole: !!SUPABASE_SERVICE_ROLE_KEY,
    ai: !!GEMINI_API_KEY,
  });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
    return response.status(500).json({
      error:
        'Variables manquantes : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou GEMINI_API_KEY',
    });
  }

  try {
    // ⚠️ Ici on utilise la SERVICE ROLE, jamais l’anon
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // Récupération des avis en attente
    const { data: reviewsData, error } = await supabaseAdmin
      .from('reviews')
      .select(`
        id, 
        rating, 
        text, 
        author_name, 
        status,
        location_id,
        location:locations (
          id,
          organization:organizations (
            id,
            name,
            brand,
            workflows
          )
        )
      `)
      .eq('status', 'pending')
      .limit(5);

    if (error) throw error;

    const reviews: any[] = reviewsData || [];

    if (reviews.length === 0) {
      return response
        .status(200)
        .json({ message: 'Tout est à jour (Connexion OK, aucun avis pending)' });
    }

    console.log(`🚀 ${reviews.length} avis trouvés. Traitement IA en cours...`);

    const results: any[] = [];

    for (const review of reviews) {
      let org = null;
      if (review.location) {
        const orgData = review.location.organization;
        org = Array.isArray(orgData) ? orgData[0] : orgData;
      }

      const brand =
        org?.brand || { tone: 'professionnel', language_style: 'formal' };

      const prompt = `
        Agis comme le service client de "${org?.name || 'notre entreprise'}".
        Ton: ${brand.tone}.
        Style: ${
          brand.language_style === 'casual' ? 'plus détendu' : 'formel / professionnel'
        }.
        Tâche: Réponds à cet avis client (${review.rating}/5): "${review.text}".
        Réponse courte, polie et professionnelle.
      `;

      try {
        let replyText = '';
        let usedModel = '';

        // 🎯 STRATÉGIE DE CASCADE GEMINI (2.5 -> 3 -> 1.5 -> pro)
        try {
          console.log('Essai 2.5 Flash...');
          const m = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const res = await m.generateContent(prompt);
          replyText = res.response.text();
          usedModel = '2.5-flash';
        } catch (e1: any) {
          console.warn(`Échec 2.5 (${e1.message}), essai 3 Pro...`);
          try {
            const m = genAI.getGenerativeModel({ model: 'gemini-3-pro' });
            const res = await m.generateContent(prompt);
            replyText = res.response.text();
            usedModel = '3-pro';
          } catch (e2: any) {
            console.warn(`Échec 3 Pro (${e2.message}), essai 1.5 Flash...`);
            try {
              const m = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
              const res = await m.generateContent(prompt);
              replyText = res.response.text();
              usedModel = '1.5-flash';
            } catch (e3: any) {
              console.warn(
                `Échec 1.5 Flash (${e3.message}), dernier recours gemini-pro...`
              );
              const m = genAI.getGenerativeModel({ model: 'gemini-pro' });
              const res = await m.generateContent(prompt);
              replyText = res.response.text();
              usedModel = 'pro';
            }
          }
        }

        if (!replyText) throw new Error("Réponse vide de l'IA");

        const { error: updateError } = await supabaseAdmin
          .from('reviews')
          .update({
            status: 'draft',
            ai_reply: {
              text: replyText,
              created_at: new Date().toISOString(),
              needs_manual_validation: true,
              model_used: usedModel,
            },
          })
          .eq('id', review.id);

        if (updateError) throw updateError;

        results.push({ id: review.id, status: 'success', model: usedModel });
        console.log(`✅ Avis ${review.id} traité avec succès (${usedModel}).`);
      } catch (e: any) {
        console.error(`❌ Erreur sur l'avis ${review.id}:`, e.message);
        results.push({ id: review.id, status: 'error', error: e.message });
      }
    }

    return response.status(200).json({ success: true, processed: results });
  } catch (err: any) {
    console.error('❌ Erreur Critique Script:', err);
    return response.status(500).json({ error: err.message });
  }
}
