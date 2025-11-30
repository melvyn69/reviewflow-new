import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request: any, response: any) {
  console.log("🤖 Robot Reviewflow : Démarrage...");

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const API_KEY = process.env.VITE_API_KEY || process.env.API_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
    console.error("❌ Configuration manquante");
    return response.status(500).json({ 
        error: 'Variables manquantes.',
        details: { hasUrl: !!SUPABASE_URL, hasKey: !!SUPABASE_KEY, hasAi: !!API_KEY }
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`*, location:locations ( organization:organizations ( name, industry, brand, workflows ) )`)
      .eq('status', 'pending')
      .limit(5);

    if (error) throw error;

    if (!reviews || reviews.length === 0) {
      return response.status(200).json({ message: 'Tout est à jour' });
    }

    const results = [];

    for (const review of reviews) {
        const org = review.location?.organization;
        const brand = org?.brand || { tone: 'professionnel' };
        
        const prompt = `
            Agis comme le service client.
            Ton: ${brand.tone}.
            Tâche: Réponds à cet avis client (${review.rating}/5): "${review.text}".
        `;

        try {
            const aiResult = await model.generateContent(prompt);
            const replyText = aiResult.response.text();

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
        } catch (e: any) {
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