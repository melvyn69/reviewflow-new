import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request: any, response: any) {
  console.log("🤖 Robot Reviewflow : Démarrage...");

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const API_KEY = process.env.API_KEY || process.env.VITE_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
    return response.status(500).json({ error: 'Config manquante' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // 1. Récupérer TOUS les avis pending (sans jointure complexe pour commencer)
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('status', 'pending')
      .limit(10);

    if (error) throw error;

    console.log(`🔎 Audit Base: ${reviews?.length || 0} avis 'pending' trouvés au total.`);

    if (!reviews || reviews.length === 0) {
      return response.status(200).json({ message: 'Aucun avis en attente.' });
    }

    const results = [];

    // 2. Pour chaque avis, récupérer les infos nécessaires manuellement (plus sûr)
    for (const review of reviews) {
        console.log(`Traitement avis ${review.id}...`);
        
        // Récupérer le lieu et l'organisation
        const { data: location } = await supabase
            .from('locations')
            .select('*, organization:organizations(*)')
            .eq('id', review.location_id)
            .single();

        if (!location || !location.organization) {
            console.warn(`Avis ${review.id} ignoré: Pas d'organisation liée.`);
            continue;
        }

        const org = location.organization;
        // Conversion forcée si c'est un tableau
        const workflows = Array.isArray(org.workflows) ? org.workflows : [];
        const brand = org.brand || { tone: 'professionnel' };
        
        console.log(`Org: ${org.name}, Workflows actifs: ${workflows.length}`);

        // Si aucun workflow, on ne fait rien (sauf si on veut un fallback)
        if (workflows.length === 0) {
            console.log("Aucun workflow configuré pour cette organisation.");
            continue;
        }

        // ... Logique IA ...
        const prompt = `
            Rôle: Service Client "${org.name}".
            Ton: ${brand.tone}.
            Avis (${review.rating}/5): "${review.text}".
            Réponds en français, court et pro.
        `;

        try {
            // Stratégie Modèle (1.5 Flash)
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const aiResult = await model.generateContent(prompt);
            const replyText = aiResult.response.text();

            await supabase
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

            results.push({ id: review.id, status: 'processed' });

        } catch (e: any) {
            console.error(`Erreur IA avis ${review.id}:`, e.message);
            // Essai modèle Pro en fallback
            try {
                const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
                const aiResult = await modelPro.generateContent(prompt);
                // ... update ...
                 await supabase.from('reviews').update({ status: 'draft', ai_reply: { text: aiResult.response.text(), created_at: new Date().toISOString(), needs_manual_validation: true } }).eq('id', review.id);
                 results.push({ id: review.id, status: 'processed_fallback' });
            } catch (e2) {
                results.push({ id: review.id, error: e.message });
            }
        }
    }

    return response.status(200).json({ success: true, processed: results });

  } catch (err: any) {
    return response.status(500).json({ error: err.message });
  }
}