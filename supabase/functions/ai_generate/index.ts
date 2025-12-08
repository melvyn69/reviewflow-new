
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

    // 2. Parse Body
    const { task, context, config } = await req.json()
    const ai = new GoogleGenAI({ apiKey: geminiKey })
    
    // Using Flash for speed/cost effectiveness for interactive tasks
    const modelName = 'gemini-2.5-flash';

    let prompt = ""

    // 3. Construct Prompt based on Task
    if (task === 'generate_reply') {
        const { review, tone, length, businessName, city, category } = context;
        
        // Logique conditionnelle basée sur la note
        const isPositive = review.rating >= 4;
        const isNegative = review.rating <= 3;

        prompt = `
            Rôle : Tu es le gérant de "${businessName || 'notre établissement'}", situé à ${city || 'votre ville'} (${category || 'Commerce'}).
            
            Tâche : Répondre à cet avis client.
            
            DÉTAILS DE L'AVIS :
            - Note : ${review.rating}/5
            - Auteur : ${review.author_name}
            - Commentaire : "${review.body}"
            
            OBJECTIFS & STYLE (CRUCIAL) :
            1. **SEO Local** : Mentionne naturellement le nom de l'établissement ("${businessName}") et la ville ("${city}") ou le type de service dans la réponse. Cela doit couler de source, ne pas faire "robot".
            2. **Ton** : ${tone || 'Professionnel mais chaleureux'}. Utilise un français courant, naturel, pas de formules pompeuses ("Nous sommes honorés de..."). Sois direct et humain.
            3. **Longueur** : ${length === 'short' ? 'Très court (1-2 phrases)' : 'Court (2-3 phrases max)'}. Pas de pavés.
            4. **Format** : Pas de guillemets, pas de "Bonjour [Nom]" au début (sauf si nécessaire), va droit au but.

            LOGIQUE DE RÉPONSE :
            ${isPositive ? 
                `-> C'est un BON avis. Remercie chaleureusement (sans en faire trop). Rebondis sur un point positif mentionné (le "point fort") pour le valoriser.` : 
                `-> C'est un avis MITIGÉ ou NÉGATIF. Sois empathique et orienté solution. Présente des excuses sincères si nécessaire (sans s'aplatir). Invite à repasser ou à contacter le support si le problème est précis. Ne sois JAMAIS agressif ou défensif.`
            }
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
    else if (task === 'enrich_customer') {
        prompt = `
            Analyse le profil de ce client basé sur ses données :
            ID: ${context.customerId}
            
            Tâche : Génère un profil psychologique court (1 phrase) et une "Next Best Action" (suggestion commerciale).
            Format JSON attendu : { "profile": "...", "suggestion": "..." }
        `;
    }
    else if (task === 'generate_manager_advice') {
        const { name, role, reviewCount, avgRating, rank, type } = context;
        
        prompt = `
            Rôle : Coach en management d'équipe pour un commerce de proximité.
            Objectif : Donner un conseil court, concret et actionnable au manager concernant un employé spécifique.
            
            Employé : ${name} (${role})
            Performance : ${reviewCount} avis collectés, Note moyenne de ${avgRating}/5.
            Classement dans l'équipe : #${rank}.
            
            Le manager veut un conseil axé sur : ${type === 'volume' ? "L'augmentation du nombre d'avis (Volume)" : "L'amélioration de la note moyenne (Qualité)"}.
            
            Consignes :
            - Le conseil doit être directement applicable.
            - Ton motivant et professionnel.
            - Mentionne le prénom "${name}".
            - Fais référence à sa performance actuelle.
            - Maximum 2 phrases.
            - Pas de généralités, du concret.
        `;
    }
    else if (task === 'generate_sms') {
        const { offerTitle, offerDesc, offerCode, segment, channel } = context;
        
        prompt = `
            Rôle: Expert Marketing Direct.
            Tâche: Rédiger un message SMS (max 160 caractères) pour une campagne promotionnelle.
            
            Contexte:
            - Offre: "${offerTitle}" (${offerDesc})
            - Code Promo: ${offerCode}
            - Cible: ${segment === 'vip' ? 'Clients très fidèles' : segment === 'risk' ? 'Clients inactifs depuis longtemps' : 'Tous clients'}
            
            Contraintes:
            - Langue: Français.
            - Très court, percutant, urgent.
            - Inclure un emoji pertinent.
            - Inclure le code promo clairement.
            - Pas de bla-bla.
            
            Exemple de ton attendu: "🎁 Surprise ! Profitez de -20% ce weekend avec le code PROMO20. A très vite !"
        `;
    }
    else if (task === 'generate_email_campaign') {
        const { offerTitle, offerDesc, segment } = context;
        
        prompt = `
            Rôle: Copywriter Email Marketing Expert.
            Tâche: Rédiger l'objet et le corps d'un email pour une campagne de collecte d'avis ou d'offre.
            
            Contexte:
            - Offre/Sujet: "${offerTitle}" (${offerDesc})
            - Cible: ${segment}
            
            Consignes:
            - Langue: Français.
            - Format JSON strict: { "subject": "...", "body": "..." }
            - L'Objet (subject) doit être accrocheur (moins de 50 caractères), utiliser un emoji si pertinent.
            - Le Corps (body) doit être en HTML simple (p, br, strong, ul, li).
            - Utilise les variables {{name}} pour le prénom et {{link}} pour le lien d'action.
            - Ton: Engageant, personnel, incite au clic.
            - Ne pas inclure de markdown (\`\`\`json), juste le JSON brut.
        `;
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

    // Nettoyage basique JSON
    if (task === 'enrich_customer' || task === 'generate_email_campaign') {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    }

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
