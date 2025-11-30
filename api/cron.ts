import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request: any, response: any) {
  console.log("🤖 Robot Reviewflow : Démarrage...");

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const API_KEY = process.env.API_KEY || process.env.VITE_API_KEY;

  // Debug log
  console.log("Env Check:", {
      url: !!SUPABASE_URL,
      key: !!SUPABASE_KEY,
      ai: !!API_KEY
  });

  if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
    return response.status(500).json({ error: 'Variables manquantes' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // Récupération des avis
    const { data: reviewsData, error } = await supabase
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
      return response.status(200).json({ message: 'Tout est à jour (Connexion OK)' });
    }

    console.log(`🚀 ${reviews.length} avis trouvés. Traitement IA en cours...`);

    const results = [];

    for (const review of reviews) {
        let org = null;
        if (review.location) {
            const orgData = review.location.organization;
            if (Array.isArray(orgData)) {
                org = orgData[0];
            } else {
                org = orgData;
            }
        }

        const brand = org?.brand || { tone: 'professionnel', language_style: 'formal' };
        
        const prompt = `
            Agis comme le service client de "${org?.name || 'notre entreprise'}".
            Ton: ${brand.tone}.
            Tâche: Réponds à cet avis client (${review.rating}/5): "${review.text}".
            Réponse courte, polie et professionnelle.
        `;

        try {
            let replyText = "";
            let usedModel = "";

            // STRATÉGIE DE CASCADE COMPLÈTE (2.5 -> 3 -> 1.5 -> Pro)
            try {
                console.log("Essai 2.5 Flash...");
                const m = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const res = await m.generateContent(prompt);
                replyText = res.response.text();
                usedModel = "2.5-flash";
            } catch (e1: any) {
                console.warn(`Echec 2.5 (${e1.message}), essai 3 Pro...`);
                try {
                    const m = genAI.getGenerativeModel({ model: "gemini-3-pro" });
                    const res = await m.generateContent(prompt);
                    replyText = res.response.text();
                    usedModel = "3-pro";
                } catch (e2: any) {
                    console.warn(`Echec 3 Pro (${e2.message}), essai 1.5 Flash...`);
                    try {
                        const m = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                        const res = await m.generateContent(prompt);
                        replyText = res.response.text();
                        usedModel = "1.5-flash";
                    } catch (e3: any) {
                        console.warn(`Echec 1.5 Flash, dernier recours Pro...`);
                        const m = genAI.getGenerativeModel({ model: "gemini-pro" });
                        const res = await m.generateContent(prompt);
                        replyText = res.response.text();
                        usedModel = "pro";
                    }
                }
            }

            if (!replyText) throw new Error("Réponse vide de l'IA");

            const { error: updateError } = await supabase
                .from('reviews')
                .update({
                    status: 'draft',
                    ai_reply: {
                        text: replyText,
                        created_at: new Date().toISOString(),
                        needs_manual_validation: true,
                        model_used: usedModel
                    }
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
    console.error("❌ Erreur Critique Script:", err);
    return response.status(500).json({ error: err.message });
  }
}