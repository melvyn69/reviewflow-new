
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'https://esm.sh/@google/genai'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiKey = Deno.env.get('API_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Verify User
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    // 2. Parse Input
    const { competitors, sector, location } = await req.json()

    const hasCompetitors = competitors && competitors.length > 0;

    const ai = new GoogleGenAI({ apiKey: geminiKey })

    // 3. Construct Prompt
    const competitorsList = hasCompetitors 
        ? competitors.slice(0, 10).map((c: any) => `- ${c.name} (${c.rating}★, ${c.review_count} avis): ${c.strengths?.join(', ')} / ${c.weaknesses?.join(', ')}`).join('\n')
        : "Aucun concurrent direct identifié pour le moment. Baser l'analyse sur les standards du secteur.";

    const prompt = `
        Tu es un consultant expert en stratégie d'entreprise spécialisé dans le secteur : "${sector || 'Commerce Local'}".
        
        CONTEXTE:
        Secteur d'activité: ${sector}
        Localisation: ${location || 'Locale'}
        
        DONNÉES CONCURRENTS (Top 10):
        ${competitorsList}
        
        TACHE:
        Réalise un audit stratégique complet et personnalisé.
        
        1. ANALYSE DU MARCHÉ: Résume la dynamique actuelle de ce secteur dans cette zone (ou en général si zone floue). Pression concurrentielle, maturité, attentes clients.
        2. TENDANCES: Ce qui fonctionne actuellement pour ce métier.
        3. SWOT: Matrice des Forces/Faiblesses/Opportunités/Menaces basées sur les concurrents fournis et le secteur.
        4. STRATÉGIE RECOMMANDÉE: 3 à 5 actions concrètes pour gagner des parts de marché.
        
        FORMAT ATTENDU (JSON uniquement, pas de markdown):
        {
            "market_analysis": "Paragraphe de synthèse sur l'état du marché, l'intensité concurrentielle et le niveau d'exigence client observé.",
            "trends": ["Tendance métier 1", "Tendance métier 2", "Tendance métier 3"],
            "swot": {
                "strengths": ["Force observée chez les concurrents ou standard du marché"],
                "weaknesses": ["Faiblesse récurrente des concurrents (Opportunité pour nous)"],
                "opportunities": ["Axe de différenciation spécifique au secteur"],
                "threats": ["Menace externe (régulation, économie, nouveaux entrants)"]
            },
            "strategic_recommendations": [
                "Action 1 : Titre - Explication courte",
                "Action 2 : Titre - Explication courte",
                "Action 3 : Titre - Explication courte"
            ],
            "competitors_detailed": [
                {
                    "name": "Nom du concurrent (si liste fournie)",
                    "last_month_growth": "Estimation (ex: +5%)",
                    "sentiment_trend": "Positif/Négatif/Neutre",
                    "top_complaint": "Leur point faible majeur déduit des notes/secteur"
                }
            ]
        }
    `;

    // 4. Generate
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    })
    
    return new Response(result.text, { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error("Analysis Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
