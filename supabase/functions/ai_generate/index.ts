
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

    // 1. Verify User & Get Organization ID
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    // FETCH USER PROFILE
    const { data: userProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
    if (!userProfile?.organization_id) throw new Error("No organization linked");

    const orgId = userProfile.organization_id;
    
    // Fetch Brand Identity
    const { data: org } = await supabase.from('organizations').select('brand, name, industry').eq('id', orgId).single();
    const brand = org?.brand || {};

    // 2. Parse Body
    const { task, context } = await req.json()
    const ai = new GoogleGenAI({ apiKey: geminiKey })
    const modelName = 'gemini-2.5-flash';
    let prompt = ""

    // --- HELPER: CONSTRUCT IDENTITY INSTRUCTIONS ---
    const buildIdentityInstruction = () => {
        if (!brand.enabled) return ""; 
        return `
        RESPECTE IMPÉRATIVEMENT L'IDENTITÉ DE MARQUE :
        - Ton : ${brand.tone || 'Professionnel'}
        - Style : ${brand.language_style === 'casual' ? 'Décontracté' : 'Formel'}
        - Contexte : ${brand.knowledge_base || org?.industry || ''}
        ${brand.forbidden_words?.length ? `- Mots interdits : ${brand.forbidden_words.join(', ')}` : ''}
        `;
    };

    // 3. Construct Prompt based on Task
    if (task === 'generate_reply') {
        const { review, tone: overrideTone, length } = context;
        const identityBlock = buildIdentityInstruction();
        const toneToUse = brand.enabled ? brand.tone : (overrideTone || 'Professionnel');

        prompt = `
            Rôle : Gérant de "${org?.name || 'l\'établissement'}".
            ${identityBlock}
            Tâche : Répondre à cet avis client (${review.rating}/5).
            Avis : "${review.body}"
            Consigne : Ton ${toneToUse}, réponse ${length || 'courte'}.
        `;
    } 
    else if (task === 'test_brand_voice') {
        const { simulationType, inputText, simulationSettings } = context;
        prompt = `
            Tu es le community manager.
            Ton : ${simulationSettings.tone}.
            Message client : "${inputText}"
            Réponds en respectant ce ton.
        `;
    }
    else if (task === 'social_post') {
        const { review, platform } = context;
        const identityBlock = buildIdentityInstruction();
        prompt = `
            Act as a Social Media Manager for ${platform}.
            ${identityBlock}
            Task: Write a caption promoting this customer review: "${review.body}".
            Language: French. Include emojis.
        `;
    }
    else if (task === 'generate_campaign_caption') {
        const { topic, platform } = context;
        const identityBlock = buildIdentityInstruction();
        prompt = `
            Rédacteur Marketing Expert.
            Plateforme : ${platform}.
            ${identityBlock}
            Sujet : "${topic}".
            Tâche : Rédige une légende engageante et virale.
        `;
    }
    else if (task === 'enrich_customer') {
        prompt = `Analyse le profil de ce client ID ${context.customerId}. Génère un profil psychologique court et une suggestion commerciale. JSON.`;
    }
    else if (task === 'generate_manager_advice') {
        const { name, role, reviewCount, avgRating } = context;
        prompt = `Coach en management. Donne un conseil court pour l'employé ${name} (${role}, ${reviewCount} avis, ${avgRating}/5).`;
    }
    else if (task === 'generate_sms') {
        const { offerTitle, offerDesc, offerCode } = context;
        const identityBlock = buildIdentityInstruction();
        prompt = `Copywriter SMS.
        ${identityBlock}
        Offre : "${offerTitle}" - ${offerDesc}.
        Code : ${offerCode}.
        Tâche : Rédiger un SMS court (max 160 chars), percutant, urgent. Français.`;
    }
    else if (task === 'generate_email_campaign') {
        const { offerTitle, offerDesc, segment } = context;
        const identityBlock = buildIdentityInstruction();
        prompt = `Email Marketing Expert.
        ${identityBlock}
        Offre : "${offerTitle}".
        Détails : "${offerDesc}".
        Cible : ${segment}.
        Tâche : Rédiger un objet d'email accrocheur et un corps d'email HTML court et vendeur.
        Format JSON attendu : { "subject": "...", "body": "..." }`;
    }
    else {
        throw new Error('Unknown task')
    }

    // 4. Generate
    const result = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { responseMimeType: task === 'generate_email_campaign' ? 'application/json' : 'text/plain' }
    })
    
    // 5. Log Usage
    if (task !== 'test_brand_voice') {
        await supabase.from('ai_usage').insert({
            organization_id: orgId,
            model: modelName,
            tokens_estimated: 1, 
            created_at: new Date().toISOString()
        }).catch(console.error);
    }

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
