import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

export default async function handler(request: any, response: any) {
  console.log("🤖 Robot Reviewflow : Démarrage...");

  // 🔐 BACKEND UNIQUEMENT
  // Conformément aux directives, on utilise exclusivement process.env.API_KEY pour Google GenAI
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const API_KEY = process.env.API_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
    return response.status(500).json({
      error: 'Variables manquantes. Assurez-vous que SUPABASE_SERVICE_ROLE_KEY et API_KEY sont définies.',
    });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);
    // Initialisation avec le nouveau SDK @google/genai en utilisant la clé nommée
    const ai = new GoogleGenAI({ apiKey: API_KEY });

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
      return response.status(200).json({ message: 'Tout est à jour (Aucun avis pending)' });
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
        const usedModel = 'gemini-2.5-flash';

        // Utilisation de gemini-2.5-flash avec la nouvelle méthode
        const res = await ai.models.generateContent({
             model: usedModel,
             contents: prompt
        });
        
        replyText = res.text || "";

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
      } catch (e: any) {
        console.error(`❌ Erreur sur l'avis ${review.id}:`, e.message);
        results.push({ id: review.id, status: 'error', error: e.message });
      }
    }

    return response.status(200).json({ success: true, processed: results });
  } catch (err: any) {
    return response.status(500).json({ error: err.message });
  }
}