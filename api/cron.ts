import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request, response) {
  console.log("🤖 Robot Reviewflow : Démarrage...");

  // Récupération des variables d'environnement (Vercel injecte les VITE_ automatiquement)
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const API_KEY = process.env.VITE_API_KEY || process.env.API_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
    console.error("❌ Configuration manquante");
    return response.status(500).json({ 
        error: 'Variables manquantes. Vérifiez Vercel Settings.',
        details: { hasUrl: !!SUPABASE_URL, hasKey: !!SUPABASE_KEY, hasAi: !!API_KEY }
    });
  }

  try {
    // 1. Connexion
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. Récupérer les avis en attente
    // On utilise une jointure pour avoir les infos de l'organisation (ton, règles...)
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        location:locations (
          organization:organizations (
            name,
            industry,
            brand
          )
        )
      `)
      .eq('status', 'pending')
      .limit(5); // On traite 5 par 5 pour être sûr de ne pas dépasser le temps limite gratuit

    if (error) throw error;

    if (!reviews || reviews.length === 0) {
      console.log("✅ Aucun avis en attente.");
      return response.status(200).json({ message: 'Tout est à jour' });
    }

    const results = [];

    // 3. Traitement IA
    for (const review of reviews) {
        const org = review.location?.organization;
        const brand = org?.brand || { tone: 'professionnel' };
        
        const prompt = `
            Agis comme le service client de "${org?.name || 'notre entreprise'}".
            Ton: ${brand.tone}.
            Tâche: Réponds à cet avis client (${review.rating}/5): "${review.text}".
            Réponse courte et professionnelle.
        `;

        try {
            const aiResult = await model.generateContent(prompt);
            const replyText = aiResult.response.text();

            // 4. Sauvegarde en Brouillon
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

            if (!updateError) {
                results.push({ id: review.id, status: 'processed' });
            }
        } catch (e) {
            console.error(`Erreur avis ${review.id}:`, e);
            results.push({ id: review.id, status: 'error', error: e.message });
        }
    }

    return response.status(200).json({ success: true, processed: results });

  } catch (err: any) {
    console.error("❌ Erreur Critique:", err);
    return response.status(500).json({ error: err.message });
  }
}