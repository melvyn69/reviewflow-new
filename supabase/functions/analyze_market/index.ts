
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/genai'

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

    if (!competitors || competitors.length === 0) {
        throw new Error("Aucun concurrent fourni pour l'analyse.");
    }

    const ai = new GoogleGenerativeAI({ apiKey: geminiKey })
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // 3. Construct Prompt
    const competitorsList = competitors.slice(0, 10).map((c: any) => 
        `- ${c.name} (${c.rating}★, ${c.review_count} avis): ${c.strengths.join(', ')} / ${c.weaknesses.join(', ')}`
    ).join('\n');

    const prompt = `
        Agis comme un expert en stratégie d'entreprise et analyse de marché locale.
        
        CONTEXTE:
        Secteur: ${sector || 'Non spécifié'}
        Localisation: ${location || 'Locale'}
        
        DONNÉES CONCURRENTS (Top 10):
        ${competitorsList}
        
        TACHE:
        Génère une analyse de marché structurée au format JSON STRICT basé sur ces données.
        
        FORMAT ATTENDU (JSON uniquement, pas de markdown):
        {
            "trends": ["Tendance 1 (ex: Montée des prix)", "Tendance 2", "Tendance 3"],
            "swot": {
                "strengths": ["Force globale du marché"],
                "weaknesses": ["Faiblesse globale des concurrents"],
                "opportunities": ["Opportunité pour un nouvel entrant"],
                "threats": ["Menace externe"]
            },
            "competitors_detailed": [
                {
                    "name": "Nom du concurrent",
                    "last_month_growth": "Estimation (ex: +5%)",
                    "sentiment_trend": "Positif/Négatif/Neutre",
                    "top_complaint": "Leur point faible majeur déduit"
                }
            ]
        }
        
        Sois réaliste, incisif et professionnel. Déduis les plaintes probables si elles ne sont pas explicites (ex: note basse = service ou prix).
    `;

    // 4. Generate
    const result = await model.generateContent(prompt)
    let jsonString = result.response.text()
    
    // Nettoyage basique du markdown si Gemini en met
    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

    const data = JSON.parse(jsonString);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Analysis Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
