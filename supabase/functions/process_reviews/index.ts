// Follow this setup guide to deploy: https://supabase.com/docs/guides/functions/deploy
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper pour évaluer les conditions
const evaluateCondition = (review: any, condition: any): boolean => {
  const { field, operator, value } = condition;
  const reviewValue = review[field];

  switch (operator) {
    case 'equals': return reviewValue == value;
    case 'contains': return typeof reviewValue === 'string' && reviewValue.includes(value);
    case 'gte': return reviewValue >= value;
    case 'lte': return reviewValue <= value;
    case 'in': return Array.isArray(value) && value.includes(reviewValue);
    default: return false;
  }
};

Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Récupérer les avis en attente (Pending)
    // On récupère aussi les infos de l'organisation liée pour avoir les règles et la marque
    const { data: reviews, error: fetchError } = await supabaseClient
      .from('reviews')
      .select('*, location:locations(organization:organizations(*))')
      .eq('status', 'pending')
      .limit(20); // Batch size raisonnable

    if (fetchError) throw fetchError;
    if (!reviews || reviews.length === 0) {
        return new Response(JSON.stringify({ message: 'No pending reviews to process' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 2. Init AI
    const apiKey = Deno.env.get('API_KEY');
    if (!apiKey) throw new Error("Missing Google API Key");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
    
    const results = [];

    // 3. Traitement de chaque avis
    for (const review of reviews) {
        const org = review.location?.organization;
        if (!org) continue;

        const workflows = org.workflows || [];
        const brand = org.brand || { tone: 'professionnel' };
        let actionTaken = false;
        let replyText = '';
        let status = 'pending'; // Par défaut, on ne change rien si aucune règle ne matche

        // A. Vérification des Workflows
        for (const wf of workflows) {
            if (!wf.enabled) continue;
            
            // Vérifier si toutes les conditions du workflow sont remplies
            const match = wf.conditions.every((c: any) => evaluateCondition(review, c));
            
            if (match) {
                // Exécuter les actions du workflow
                for (const action of wf.actions) {
                    if (action.type === 'generate_ai_reply' || action.type === 'auto_reply') {
                        // Génération IA
                        const prompt = `
                            Rôle: Service Client pour "${org.name}" (${org.industry || 'commerce'}).
                            Ton: ${brand.tone}. Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}.
                            Contexte: ${brand.knowledge_base || ''}
                            
                            Tâche: Répondre à cet avis client (${review.rating}/5): "${review.text}".
                            Réponse courte et professionnelle.
                        `;
                        
                        try {
                            const result = await model.generateContent(prompt);
                            replyText = result.response.text();
                            
                            // Si c'est "auto_reply", on passe en 'sent' (simulation d'envoi), sinon 'draft'
                            status = action.type === 'auto_reply' ? 'sent' : 'draft';
                            actionTaken = true;
                        } catch (e) {
                            console.error(`AI Error for review ${review.id}:`, e);
                        }
                    }
                }
            }
            if (actionTaken) break; // On s'arrête au premier workflow qui matche pour éviter les conflits
        }

        // B. Si aucun workflow spécifique, on applique une logique par défaut (optionnel)
        // Pour l'instant, on ne fait rien si pas de règle, ou on génère un brouillon simple
        if (!actionTaken && review.rating >= 4) {
             // Fallback: Générer un brouillon pour les bons avis même sans règle
             const prompt = `Réponds merci à cet avis positif de ${review.author_name}: "${review.text}"`;
             const result = await model.generateContent(prompt);
             replyText = result.response.text();
             status = 'draft';
             actionTaken = true;
        }

        // C. Sauvegarde du résultat
        if (actionTaken && replyText) {
            const { error: updateError } = await supabaseClient
                .from('reviews')
                .update({
                    status: status,
                    ai_reply: {
                        text: replyText,
                        created_at: new Date().toISOString(),
                        needs_manual_validation: status === 'draft'
                    },
                    // Si c'est 'sent', on simule la date d'envoi réel
                    ...(status === 'sent' ? { posted_reply: replyText, replied_at: new Date().toISOString() } : {})
                })
                .eq('id', review.id);
                
            if (!updateError) {
                results.push({ id: review.id, status: 'processed', outcome: status });
            }
        }
    }

    return new Response(JSON.stringify({ processed: results.length, details: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})