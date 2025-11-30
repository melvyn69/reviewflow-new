import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Ces variables d'environnement sont accessibles automatiquement sur Vercel
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const API_KEY = process.env.VITE_API_KEY || process.env.API_KEY;

export default async function handler(request, response) {
  // Sécurité basique : Seul le Cron Vercel peut appeler cette fonction
  // (Ou vous manuellement pour tester)
  
  console.log("🤖 Robot d'automatisation : Démarrage...");

  if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
    return response.status(500).json({ error: 'Configuration manquante (Variables Env)' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    // 1. Récupérer les avis en attente (Batch de 10 pour être rapide et économe)
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        locations (
          organization_id,
          organizations (
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

    if (!reviews || reviews.length === 0) {
      console.log("✅ Aucun avis en attente.");
      return response.status(200).json({ message: 'Aucun avis à traiter' });
    }

    console.log(`🔄 Traitement de ${reviews.length} avis...`);
    const results = [];

    // 2. Traiter chaque avis
    for (const review of reviews) {
      const org = review.locations?.organizations;
      if (!org) continue;

      // Configuration de la marque
      const brand = org.brand || { tone: 'professionnel' };
      const industry = org.industry || 'commerce';
      
      // Prompt optimisé pour économiser des tokens
      const prompt = `
        Agis comme le service client de "${org.name}" (${industry}).
        Ton: ${brand.tone}.
        Avis client (${review.rating}/5): "${review.text}".
        Rédige une réponse courte, professionnelle et empathique.
        Réponds uniquement avec le texte de la réponse.
      `;

      // Appel IA
      const result = await model.generateContent(prompt);
      const replyText = result.response.text();

      // Mise à jour en base (Mode Brouillon par sécurité)
      const { error: updateError } = await supabase
        .from('reviews')
        .update({
          status: 'draft', // On met en brouillon pour validation humaine (best practice)
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
    }

    console.log("✅ Terminé.", results);
    return response.status(200).json({ processed: results.length, details: results });

  } catch (err) {
    console.error("❌ Erreur Robot:", err);
    return response.status(500).json({ error: err.message });
  }
}