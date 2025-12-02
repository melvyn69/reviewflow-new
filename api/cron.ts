import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request: any, response: any) {
  console.log("🤖 Robot Reviewflow : Démarrage...");

  // 🔐 BACKEND UNIQUEMENT
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_API_KEY;

  // Debug log
  console.log("Env Check:", {
    url: !!SUPABASE_URL,
    key: !!SUPABASE_KEY,
    ai: !!GEMINI_API_KEY,
  });

  if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
    return response.status(500).json({
      error: 'Variables manquantes. Ajoutez SUPABASE_SERVICE_ROLE_KEY et API_KEY dans Vercel.',
    });
  }

  try {
    // On utilise la clé (idéalement Service Role pour contourner RLS, sinon Anon)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);
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
      .limit(10);

    if (error) throw error;

    const reviews: any[] = reviewsData || [];

    if (reviews.length === 0) {
      return response.status(200).json({ message: 'Tout est à jour (Connexion OK, aucun avis pending)' });
    }

    console.log(`🚀 ${reviews.length} avis trouvés. Traitement IA en cours...`);

    const results: any[] = [];

    for (const review of reviews) {
      let org = null;
      if (review.location) {
        const orgData = review.location.organization;
        org = Array.isArray(orgData) ? orgData[0] : orgData;
      }

      const brand = org?.brand || { tone: 'professionnel', language_style: 'formal' };
      
      // CORRECTION : Injection de la Base de Connaissance (Knowledge Base)
      const context = brand.knowledge_base ? `\n[INFORMATIONS CLÉS ENTREPRISE]:\n${brand.knowledge_base}\nUtilise ces informations pour répondre aux questions spécifiques.` : '';

      const prompt = `
        Rôle: Tu es le service client pour "${org?.name || 'notre entreprise'}" (${org?.industry || 'commerce'}).
        Ton: ${brand.tone}.
        Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}.
        ${context}

        Tâche: Rédige une réponse à cet avis client Google.
        Note: ${review.rating}/5
        Auteur: ${review.author_name || 'Client'}
        Avis: "${review.text}"

        Contraintes:
        - Réponse courte (2-4 phrases).
        - Ton positif, poli, et professionnel.
        - Pas de guillemets.
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
              console.warn(`Échec 1.5 Flash (${e3.message}), dernier recours gemini-pro...`);
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