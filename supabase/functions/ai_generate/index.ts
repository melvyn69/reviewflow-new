
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'https://esm.sh/@google/genai'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Plan Limits Definition
const PLAN_LIMITS: Record<string, number> = {
    'free': 10,
    'starter': 150,
    'pro': 500,
    'elite': 999999
};

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

    // FETCH USER PROFILE TO CHECK GOD MODE
    const { data: userProfile } = await supabase.from('users').select('organization_id, is_super_admin').eq('id', user.id).single();
    if (!userProfile?.organization_id) throw new Error("No organization linked");

    // --- ENFORCE PLAN LIMITS ---
    const orgId = userProfile.organization_id;
    const isGodMode = !!userProfile.is_super_admin;
    
    // Fetch Org Data (Plan + Brand Identity)
    const { data: org } = await supabase.from('organizations').select('subscription_plan, brand, name, industry').eq('id', orgId).single();
    
    const brand = org?.brand || {};

    // ONLY CHECK LIMITS IF NOT GOD MODE
    if (!isGodMode) {
        const currentPlan = org?.subscription_plan || 'free';
        const limit = PLAN_LIMITS[currentPlan] || 10;

        // Fetch Usage for current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

        const { count, error: countError } = await supabase
            .from('ai_usage')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .gte('created_at', startOfMonth.toISOString());

        if (!countError && (count || 0) >= limit) {
            return new Response(
                JSON.stringify({ error: `LIMIT_REACHED: Vous avez atteint la limite de ${limit} réponses pour votre plan ${currentPlan}. Mettez à niveau pour continuer.` }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
    }
    // ---------------------------

    // 2. Parse Body
    const { task, context, config } = await req.json()
    const ai = new GoogleGenAI({ apiKey: geminiKey })
    // Using the latest flash model for speed
    const modelName = 'gemini-2.5-flash';
    let prompt = ""

    // --- HELPER: CONSTRUCT IDENTITY INSTRUCTIONS ---
    const buildIdentityInstruction = () => {
        if (!brand.enabled) return ""; 

        return `
        RESPECTE IMPÉRATIVEMENT L'IDENTITÉ DE MARQUE SUIVANTE :
        - Ton : ${brand.tone || 'Professionnel'}
        - Style de langage : ${brand.language_style === 'casual' ? 'Tutoiement, décontracté, emojis autorisés' : 'Vouvoiement, formel, poli'}
        - Contexte établissement : ${brand.knowledge_base || org?.industry || ''}
        ${brand.forbidden_words?.length ? `- MOTS INTERDITS : ${brand.forbidden_words.join(', ')}` : ''}
        ${brand.response_examples ? `- EXEMPLES DE STYLE À IMITER :\n${brand.response_examples}` : ''}
        
        Si les instructions de l'identité de marque entrent en conflit avec des consignes génériques, l'identité de marque GAGNE.
        `;
    };

    // 3. Construct Prompt based on Task
    if (task === 'generate_reply') {
        const { review, tone: overrideTone, length, businessName, city, category } = context;
        const isPositive = review.rating >= 4;
        
        const identityBlock = buildIdentityInstruction();
        const toneToUse = brand.enabled ? brand.tone : (overrideTone || 'Professionnel mais chaleureux');

        prompt = `
            Rôle : Tu es le gérant de "${businessName || org?.name || 'notre établissement'}", situé à ${city || 'votre ville'} (${category || org?.industry || 'Commerce'}).
            
            ${identityBlock}

            Tâche : Répondre à cet avis client.
            
            DÉTAILS DE L'AVIS :
            - Note : ${review.rating}/5
            - Auteur : ${review.author_name}
            - Commentaire : "${review.body}"
            
            OBJECTIFS & STYLE :
            1. **SEO Local** : Mentionne naturellement le nom de l'établissement ("${businessName}") et la ville ("${city}") ou le type de service dans la réponse.
            2. **Ton** : ${toneToUse}. Utilise un français courant, naturel.
            3. **Longueur** : ${length === 'short' ? 'Très court (1-2 phrases)' : 'Court (2-3 phrases max)'}.
            4. **Format** : Pas de guillemets, pas de "Bonjour [Nom]" au début si c'est un chat, mais ok pour un avis Google.

            LOGIQUE DE RÉPONSE :
            ${isPositive ? 
                `-> C'est un BON avis. Remercie chaleureusement. Rebondis sur un point positif mentionné.` : 
                `-> C'est un avis MITIGÉ ou NÉGATIF. Sois empathique et orienté solution. Présente des excuses sincères.`
            }
        `;
    } 
    else if (task === 'test_brand_voice') {
        const { simulationType, inputText, simulationSettings } = context;
        const activeBrand = simulationSettings || brand;
        
        prompt = `
            Tu es le community manager de "${org?.name || 'Notre Entreprise'}".
            
            Applique STRICTEMENT cette identité de marque :
            - Ton : ${activeBrand.tone}
            - Style : ${activeBrand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}
            - Mots interdits : ${activeBrand.forbidden_words?.join(', ') || 'Aucun'}
            - Contexte : ${activeBrand.knowledge_base || ''}
            
            Tâche : Réponds à ce message client (${simulationType}).
            Message client : "${inputText}"
            
            Réponse :
        `;
    }
    else if (task === 'social_post') {
        const { review, platform } = context;
        const identityBlock = buildIdentityInstruction();

        prompt = `
            Act as a world-class Social Media Manager.
            Platform: ${platform}.
            
            ${identityBlock}

            Context: We received a glowing 5-star review from a customer.
            Task: Write a captivating, platform-native caption.
            Review: "${review.body}" by ${review.author_name}.
            Tone: Enthusiastic, grateful. French. Include emojis and hashtags.
        `;
    }
    else if (task === 'enrich_customer') {
        prompt = `Analyse le profil de ce client ID ${context.customerId}. Génère un profil psychologique court et une suggestion commerciale. JSON.`;
    }
    else if (task === 'generate_manager_advice') {
        const { name, role, reviewCount, avgRating, rank, type } = context;
        prompt = `Coach en management. Donne un conseil court et actionnable au manager pour l'employé ${name} (${role}, ${reviewCount} avis, ${avgRating}/5, rank #${rank}). Objectif: ${type}.`;
    }
    else if (task === 'generate_sms') {
        const { offerTitle, offerDesc, offerCode } = context;
        const identityBlock = buildIdentityInstruction();
        prompt = `Expert Marketing. Rédiger SMS (max 160 chars) pour offre "${offerTitle}". Code: ${offerCode}. Français, urgent, emoji. ${identityBlock}`;
    }
    else if (task === 'generate_email_campaign') {
        const { offerTitle, offerDesc, segment } = context;
        const identityBlock = buildIdentityInstruction();
        prompt = `Copywriter Email. Rédiger objet et corps HTML pour offre "${offerTitle}". Cible: ${segment}. JSON strict: {subject, body}. ${identityBlock}`;
    }
    else {
        throw new Error('Unknown task')
    }

    // 4. Generate
    const result = await ai.models.generateContent({
        model: modelName,
        contents: prompt
    })
    let text = result.text || ""

    // Clean JSON
    if (task === 'enrich_customer' || task === 'generate_email_campaign') {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    // 5. Log Usage
    if (task !== 'test_brand_voice') {
        try {
            await supabase.from('ai_usage').insert({
                organization_id: userProfile.organization_id,
                model: modelName,
                tokens_estimated: 1, 
                created_at: new Date().toISOString()
            });
        } catch (dbErr) {
            console.error("Failed to log AI usage:", dbErr);
        }
    }

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    const isLimitError = error.message.includes('LIMIT_REACHED');
    const status = isLimitError ? 403 : 500;
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
