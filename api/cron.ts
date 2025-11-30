import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request: any, response: any) {
  console.log("🤖 Robot Reviewflow : Démarrage de la séquence...");

  // 1. CHARGEMENT DES VARIABLES (Supporte VITE_ et standard)
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const API_KEY = process.env.API_KEY || process.env.VITE_API_KEY;

  // 2. VÉRIFICATION CONFIGURATION
  if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
    console.error("❌ Configuration manquante");
    return response.status(500).json({ 
        error: 'Variables d\'environnement manquantes sur le serveur.',
        debug: { 
            hasUrl: !!SUPABASE_URL, 
            hasKey: !!SUPABASE_KEY, 
            hasAi: !!API_KEY,
            envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('API'))
        }
    });
  }

  try {
    // 3. CONNEXION SUPABASE
    console.log("🔌 Connexion à Supabase...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // 4. RÉCUPÉRATION DES AVIS EN ATTENTE
    // On sélectionne uniquement les champs nécessaires pour éviter les erreurs de jointure
    const { data: reviews, error } = await supabase
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
      .limit(5); // Petit lot pour commencer

    if (error) {
        console.error("Erreur Supabase:", error);
        throw new Error(`Erreur DB: ${error.message}`);
    }

    if (!reviews || reviews.length === 0) {
      console.log("✅ Aucun avis en attente.");
      return response.status(200).json({ success: true, message: 'Aucun avis à traiter', processed: 0 });
    }

    console.log(`🚀 ${reviews.length} avis trouvés. Traitement IA en cours...`);

    // 5. INITIALISATION IA
    const genAI = new GoogleGenerativeAI(API_KEY);
    // Utilisation du modèle flash avec fallback (géré dans le try/catch)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const results = [];

    // 6. BOUCLE DE TRAITEMENT
    for (const review of reviews) {
        const org = review.location?.organization;
        // Réglages par défaut si pas de marque configurée
        const brand = org?.brand || { tone: 'professionnel', language_style: 'formal' };
        
        // Construction du prompt
        const prompt = `
            Agis comme le service client de "${org?.name || 'notre entreprise'}".
            Ton: ${brand.tone}. Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}.
            Tâche: Réponds à cet avis client (${review.rating}/5): "${review.text}".
            Réponse courte, polie et professionnelle. Pas de guillemets.
        `;

        try {
            // Appel IA
            const aiResult = await model.generateContent(prompt);
            const replyText = aiResult.response.text();

            if (!replyText) throw new Error("Réponse vide de l'IA");

            // Mise à jour DB
            const { error: updateError } = await supabase
                .from('reviews')
                .update({
                    status: 'draft', // On met en brouillon par sécurité
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
            // On continue la boucle même si un avis plante
            results.push({ id: review.id, status: 'error', error: e.message });
            
            // Si l'erreur est critique (quota ou auth), on arrête tout
            if (e.message.includes('403') || e.message.includes('API key')) break;
        }
    }

    return response.status(200).json({ 
        success: true, 
        message: `Traitement terminé. ${results.length} avis traités.`,
        details: results 
    });

  } catch (err: any) {
    console.error("❌ Erreur Critique Script:", err);
    return response.status(500).json({ error: err.message, stack: err.stack });
  }
}