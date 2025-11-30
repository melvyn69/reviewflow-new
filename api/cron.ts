import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Ajout explicite des types 'any' pour request et response afin de satisfaire TypeScript
export default async function handler(request: any, response: any) {
  console.log("🤖 Robot Reviewflow : Démarrage...");

  // TENTATIVE 1 : Noms standards (Backend)
  // TENTATIVE 2 : Noms Vite (Frontend, parfois injectés)
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const API_KEY = process.env.API_KEY || process.env.VITE_API_KEY;

  // Debug log (sans afficher les valeurs secrètes)
  console.log("Env Check:", {
      url: !!SUPABASE_URL,
      key: !!SUPABASE_KEY,
      ai: !!API_KEY
  });

  if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
    console.error("❌ Configuration manquante");
    return response.status(500).json({ 
        error: 'Variables manquantes.',
        details: { hasUrl: !!SUPABASE_URL, hasKey: !!SUPABASE_KEY, hasAi: !!API_KEY }
    });
  }

  try {
    // Connexion
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const genAI = new GoogleGenerativeAI(API_KEY);

    // Stratégie de modèle IA (2.5 Flash -> 3 Pro -> 1.5 Flash)
    // On instancie le modèle "par défaut" ici, mais on gérera le fallback dans la boucle
    let model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Récupération des avis en attente
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
      .limit(10); // On augmente un peu la limite pour être efficace

    if (error) {
        console.error("Erreur Supabase:", error);
        throw new Error(`Erreur DB: ${error.message}`);
    }

    // Casting explicite pour TypeScript
    const reviews: any[] = reviewsData || [];

    if (reviews.length === 0) {
      console.log("✅ Aucun avis en attente.");
      return response.status(200).json({ message: 'Tout est à jour (Connexion OK)' });
    }

    console.log(`🚀 ${reviews.length} avis trouvés. Traitement IA en cours...`);

    const results = [];

    for (const review of reviews) {
        // Gestion robuste de la relation organization (Tableau ou Objet)
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
            Ton: ${brand.tone}. Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}.
            Tâche: Réponds à cet avis client (${review.rating}/5): "${review.text}".
            Réponse courte, polie et professionnelle. Pas de guillemets.
        `;

        let replyText = "";
        let usedModel = "";

        try {
            // ESSAI 1: Gemini 2.5 Flash
            try {
                const m = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const res = await m.generateContent(prompt);
                replyText = res.response.text();
                usedModel = "2.5-flash";
            } catch (e1: any) {
                console.warn(`Echec 2.5 Flash (${e1.message}), essai 3 Pro...`);
                // ESSAI 2: Gemini 3 Pro
                try {
                    const m = genAI.getGenerativeModel({ model: "gemini-3-pro" });
                    const res = await m.generateContent(prompt);
                    replyText = res.response.text();
                    usedModel = "3-pro";
                } catch (e2: any) {
                    console.warn(`Echec 3 Pro (${e2.message}), essai 1.5 Flash...`);
                    // ESSAI 3: Gemini 1.5 Flash (Le plus stable)
                    const m = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    const res = await m.generateContent(prompt);
                    replyText = res.response.text();
                    usedModel = "1.5-flash";
                }
            }

            if (!replyText) throw new Error("Réponse vide de l'IA");

            // Mise à jour DB
            const { error: updateError } = await supabase
                .from('reviews')
                .update({
                    status: 'draft', // On met en brouillon par sécurité
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
            console.log(`✅ Avis ${review.id} traité avec ${usedModel}.`);

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