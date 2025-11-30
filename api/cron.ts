import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request: any, response: any) {
  console.log("🤖 Robot Reviewflow : Démarrage Diagnostique...");

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const API_KEY = process.env.API_KEY || process.env.VITE_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
    return response.status(500).json({ error: 'Variables manquantes' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // 1. TEST BRUT : Récupérer tous les avis pending SANS JOINTURE
    // Cela permet de voir si la base est accessible et si les avis existent
    const { data: rawReviews, error: rawError } = await supabase
      .from('reviews')
      .select('id, rating, status, location_id')
      .eq('status', 'pending');

    if (rawError) {
        console.error("Erreur lecture brute:", rawError);
        return response.status(500).json({ error: rawError.message });
    }

    console.log(`📊 DIAGNOSTIC: ${rawReviews?.length || 0} avis 'pending' trouvés au total.`);
    
    if (rawReviews && rawReviews.length > 0) {
        console.log("IDs trouvés:", rawReviews.map(r => r.id));
    } else {
        return response.status(200).json({ message: "Aucun avis 'pending' trouvé dans la table reviews." });
    }

    // 2. Traitement (avec récupération manuelle des infos pour éviter les échecs de jointure)
    const results = [];
    
    // Modèle avec fallback
    let model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    for (const reviewStub of rawReviews || []) {
        console.log(`Traitement ID ${reviewStub.id}...`);
        
        // Récupérer l'organisation liée
        const { data: location } = await supabase
            .from('locations')
            .select('organization_id, organization:organizations(*)')
            .eq('id', reviewStub.location_id)
            .single();
            
        if (!location || !location.organization) {
            console.warn(`⚠️ Avis ${reviewStub.id} orphelin : Pas d'organisation trouvée pour location ${reviewStub.location_id}`);
            results.push({ id: reviewStub.id, status: 'ignored_no_org' });
            continue;
        }

        const org = location.organization;
        // Récupérer le texte complet de l'avis maintenant
        const { data: fullReview } = await supabase
            .from('reviews')
            .select('*')
            .eq('id', reviewStub.id)
            .single();
            
        if (!fullReview) continue;

        // Logique IA
        const brand = org.brand || { tone: 'professionnel' };
        const prompt = `Réponds à cet avis (${fullReview.rating}/5): "${fullReview.text}". Ton: ${brand.tone}.`;

        try {
            const res = await model.generateContent(prompt);
            const replyText = res.response.text();

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
                .eq('id', fullReview.id);
                
            results.push({ id: fullReview.id, status: 'success' });
            console.log(`✅ Avis ${fullReview.id} traité.`);
            
        } catch (e: any) {
            console.error(`Erreur IA ${fullReview.id}:`, e);
            results.push({ id: fullReview.id, error: e.message });
        }
    }

    return response.status(200).json({ 
        success: true, 
        diagnostic: `${rawReviews?.length} avis vus`,
        results 
    });

  } catch (err: any) {
    return response.status(500).json({ error: err.message });
  }
}