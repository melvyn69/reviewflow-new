
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
          name,
          city,
          organization:organizations (
            id,
            name,
            industry,
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
      let loc = null;
      
      if (review.location) {
        loc = review.location;
        const orgData = review.location.organization;
        org = Array.isArray(orgData) ? orgData[0] : orgData;
      }

      const brand = org?.brand || { tone: 'professionnel', language_style: 'formal' };
      
      // Logique conditionnelle basée sur la note
      const isPositive = review.rating >= 4;

      const prompt = `
        Rôle : Tu es le service client pour "${org?.name || loc?.name || 'notre entreprise'}" (${org?.industry || 'commerce'}) situé à ${loc?.city || 'votre ville'}.
        
        Tâche : Rédige une réponse à cet avis Google.
        
        Avis Client (${review.rating}/5) de ${review.author_name || 'Client'} :
        "${review.text}"

        OBJECTIFS & STYLE :
        1. **SEO Local** : Mentionne naturellement "${loc?.name || org?.name}" et la ville "${loc?.city}" si possible.
        2. **Ton** : ${brand.tone}. Français naturel, fluide, chaleureux. Pas de phrases robotiques comme "Nous prenons note".
        3. **Format** : Pas de guillemets. Court (2-3 phrases).

        LOGIQUE :
        ${isPositive ? 
            "C'est un bon avis : Remercie et valorise le compliment." : 
            "C'est un avis mitigé/négatif : Sois empathique, excuse-toi sincèrement, et propose une ouverture (contact direct)."
        }
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
