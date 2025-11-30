import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request: any, response: any) {
  console.log("🤖 Robot Reviewflow : Démarrage de la séquence...");

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const API_KEY = process.env.API_KEY || process.env.VITE_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
    console.error("❌ Configuration manquante");
    return response.status(500).json({ 
        error: 'Variables d\'environnement manquantes sur le serveur.',
        debug: { hasUrl: !!SUPABASE_URL, hasKey: !!SUPABASE_KEY, hasAi: !!API_KEY }
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
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

    if (error) {
        console.error("Erreur Supabase:", error);
        throw new Error(`Erreur DB: ${error.message}`);
    }

    // CASTING EXPLICTE POUR EVITER LES ERREURS TS
    const reviews: any[] = reviewsData || [];

    if (reviews.length === 0) {
      console.log("✅ Aucun avis en attente.");
      return response.status(200).json({ success: true, message: 'Aucun avis à traiter', processed: 0 });
    }

    console.log(`🚀 ${reviews.length} avis trouvés. Traitement IA en cours...`);

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const results = [];

    for (const review of reviews) {
        // GESTION ROBUSTE DE LA RELATION (Tableau ou Objet)
        let org = null;
        if (review.location) {
            // Supabase peut renvoyer un tableau ou un objet selon la version/config
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
            Ton: ${brand.tone}. Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}.
            Tâche: Réponds à cet avis client (${review.rating}/5): "${review.text}".
            Réponse courte, polie et professionnelle. Pas de guillemets.
        `;

        try {
            const aiResult = await model.generateContent(prompt);
            const replyText = aiResult.response.text();

            if (!replyText) throw new Error("Réponse vide de l'IA");

            const { error: updateError } = await supabase
                .from('reviews')
                .update({
                    status: 'draft',
                    ai_reply: {
                        text: replyText,
                        created_at: new Date().toISOString(),
                        needs_manual_validation: true
                    }
                })
                .eq('id', review.id);

            if (updateError) throw updateError;

            results.push({ id: review.id, status: 'success' });
            console.log(`✅ Avis ${review.id} traité.`);

        } catch (e: any) {
            console.error(`❌ Erreur sur l'avis ${review.id}:`, e.message);
            results.push({ id: review.id, status: 'error', error: e.message });
        }
    }

    return response.status(200).json({ 
        success: true, 
        message: `Traitement terminé. ${results.length} avis traités.`,
        details: results 
    });

  } catch (err: any) {
    console.error("❌ Erreur Critique Script:", err);
    return response.status(500).json({ error: err.message });
  }
}