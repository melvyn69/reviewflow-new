
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

    // 2. Parse Body
    const { task, context, config } = await req.json()
    const ai = new GoogleGenerativeAI({ apiKey: geminiKey })
    
    // Using Flash for speed/cost effectiveness for interactive tasks
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' })

    let prompt = ""

    // 3. Construct Prompt based on Task
    if (task === 'generate_reply') {
        const { review, tone, length } = context;
        prompt = `
            Rôle: Tu es le propriétaire d'un établissement répondant à un avis client.
            Tâche: Rédige une réponse à cet avis.
            
            Avis Client (${review.rating}/5) de ${review.author_name}:
            "${review.body}"
            
            Consignes:
            - Ton: ${tone || 'Professionnel'}
            - Longueur: ${length === 'short' ? 'Courte (1-2 phrases)' : length === 'long' ? 'Détaillée (3-4 phrases)' : 'Moyenne'}
            - Langue: Français
            - Ne pas mettre de guillemets autour de la réponse.
            - Sois poli, empathique et constructif.
        `;
    } 
    else if (task === 'social_post') {
        const { review, platform } = context;
        prompt = `
            Act as a world-class Social Media Manager.
            Platform: ${platform} (Instagram, LinkedIn, or Facebook).
            Context: We received a glowing 5-star review from a customer.
            Task: Write a captivating, platform-native caption to go with an image of this review.
            
            Review Details:
            - Author: ${review.author_name}
            - Text: "${review.body}"
            - Rating: ${review.rating}/5
            
            Guidelines:
            - Language: French (Français)
            - Tone: Enthusiastic, grateful, and professional.
            - Include 3-5 relevant emojis.
            - Include 3-5 relevant hashtags at the end.
            - DO NOT wrap the output in quotes.
        `;
    }
    else {
        throw new Error('Unknown task')
    }

    // 4. Generate
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
