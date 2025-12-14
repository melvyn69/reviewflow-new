
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
    const geminiKey = Deno.env.get('API_KEY')!
    if (!geminiKey) throw new Error("API_KEY (Gemini) missing")

    const ai = new GoogleGenAI({ apiKey: geminiKey })
    
    const { progress } = await req.json();

    const prompt = `
        Tu es "Coach ReviewFlow", un expert en Customer Success pour une application SaaS de gestion d'e-réputation.
        
        DONNÉES DU CLIENT :
        - Score global : ${progress.score}/100
        - Étapes complétées :
          - Google Connecté : ${progress.steps.google_connected ? 'OUI' : 'NON'}
          - Funnel Activé : ${progress.steps.funnel_active ? 'OUI' : 'NON'}
          - Premier avis répondu : ${progress.steps.first_review_replied ? 'OUI' : 'NON'}
          - Widget installé : ${progress.steps.widget_installed ? 'OUI' : 'NON'}
          - Automatisation active : ${progress.steps.automation_active ? 'OUI' : 'NON'}
        
        TACHE :
        Génère un message court, motivant et personnalisé pour ce client.
        Le message doit :
        1. Féliciter pour ce qui est fait.
        2. Pousser gentiment vers la prochaine étape logique (celle qui manque et a le plus d'impact).
        3. Adopter un ton coach sportif / dynamique.
        
        FORMAT JSON STRICT ATTENDU :
        {
            "title": "Titre court (ex: Super début !)",
            "message": "Message de 2-3 phrases max.",
            "focus_area": "setup" | "response" | "collection" | "social"
        }
    `;

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    return new Response(result.text, { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error("Coach Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
