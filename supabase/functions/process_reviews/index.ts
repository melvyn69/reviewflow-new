
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'https://esm.sh/@google/genai'

declare const Deno: any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper: Sleep to respect rate limits
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: Check condition matches
const checkCondition = (condition: any, review: any) => {
    let reviewValue;
    switch (condition.field) {
        case 'rating': reviewValue = review.rating; break;
        case 'source': reviewValue = review.source; break;
        case 'content': reviewValue = review.text || review.body || ''; break;
        default: return false;
    }

    switch (condition.operator) {
        case 'equals': return reviewValue == condition.value;
        case 'gte': return reviewValue >= condition.value;
        case 'lte': return reviewValue <= condition.value;
        case 'contains': return String(reviewValue).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'not_contains': return !String(reviewValue).toLowerCase().includes(String(condition.value).toLowerCase());
        default: return false;
    }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiKey = Deno.env.get('API_KEY')!

    if (!geminiKey) throw new Error("API_KEY (Gemini) missing")

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const ai = new GoogleGenAI({ apiKey: geminiKey })
    
    // Utilisation du modèle flash pour la rapidité et le coût
    const modelName = 'gemini-2.5-flash';

    // 1. Fetch pending reviews with org data
    // Limit to 10 per run to ensure we stay well within timeout limits (Function execution limit)
    const { data: reviews, error: fetchError } = await supabase
      .from('reviews')
      .select('*, location:locations(organization:organizations(*))')
      .eq('status', 'pending')
      .limit(10) 

    if (fetchError) throw fetchError
    if (!reviews || reviews.length === 0) return new Response(JSON.stringify({ message: 'Nothing to process', processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    let processedCount = 0
    let actionsCount = 0

    console.log(`Processing ${reviews.length} reviews...`);

    // 2. Process each review
    for (const review of reviews) {
        // RATE LIMITING PROTECTION
        // Gemini Free Tier: 15 RPM (Requests Per Minute) => 1 request every 4 seconds.
        // Paid Tier: Much higher. We use a conservative 2s delay here to be safe.
        await sleep(2000); 

        const org = review.location?.organization
        if (!org) continue

        const workflows = org.workflows || []
        let matched = false
        let finalStatus = 'pending'
        let replyText = ''
        let aiModelUsed = ''

        // Evaluate Workflows
        for (const wf of workflows) {
            if (!wf.enabled) continue
            
            // Check all conditions (AND logic)
            const allMatch = wf.conditions.every((c: any) => checkCondition(c, review))
            
            if (allMatch) {
                matched = true
                console.log(`Review ${review.id} matched workflow ${wf.name}`)

                // Execute Actions
                for (const action of wf.actions) {
                    actionsCount++
                    
                    // A. AI Generation / Auto Reply
                    if (action.type === 'generate_ai_reply' || action.type === 'auto_reply') {
                        const brand = org.brand || {}
                        const tone = action.config?.tone || brand.tone || 'professionnel'
                        
                        const prompt = `
                            Rôle: Service client de "${org.name}" (${org.industry || 'commerce'}).
                            Ton: ${tone}.
                            Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}.
                            Contexte: ${brand.knowledge_base || ''}
                            
                            Réponds à cet avis ${review.rating}/5 de ${review.author_name}: "${review.text}"
                            Réponse courte, polie, sans guillemets.
                        `
                        
                        try {
                            const result = await ai.models.generateContent({
                                model: modelName,
                                contents: prompt
                            })
                            replyText = result.text || ""
                            aiModelUsed = modelName
                            
                            if (action.type === 'auto_reply') {
                                finalStatus = 'sent' 
                                // TODO: In a real scenario, initiate GMB API call here to post reply
                            } else {
                                finalStatus = 'draft'
                            }
                        } catch (e: any) {
                            console.error("AI Error for review " + review.id, e)
                            if (e.message.includes('429')) {
                                console.warn("Quota Limit Reached. Stopping batch.");
                                return new Response(JSON.stringify({ processed: processedCount, message: "Rate limit hit, stopping early." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
                            }
                        }
                    }

                    // B. Email Alert (Mock)
                    if (action.type === 'email_alert') {
                        console.log(`[Email] Sending alert to ${action.config?.email_to} for review ${review.id}`)
                        // Implementation note: Call Resend API here using Deno.env.get('RESEND_API_KEY')
                    }

                    // C. Tagging
                    if (action.type === 'add_tag') {
                        // Would update tags column in DB
                    }
                }
                
                break // Stop after first matching workflow
            }
        }

        // 3. Update DB if matched and processed
        if (matched && replyText) {
            const updatePayload: any = {
                status: finalStatus,
                ai_reply: {
                    text: replyText,
                    tone: 'automated',
                    model_used: aiModelUsed,
                    created_at: new Date().toISOString(),
                    needs_manual_validation: finalStatus === 'draft'
                }
            }
            
            if (finalStatus === 'sent') {
                updatePayload.posted_reply = replyText
                updatePayload.replied_at = new Date().toISOString()
            }

            const { error: updateError } = await supabase.from('reviews').update(updatePayload).eq('id', review.id)
            if (!updateError) {
                processedCount++
            } else {
                console.error("DB Update Error", updateError)
            }
        } else if (!matched) {
            // No workflow matched.
            // Optional: Auto-generate a draft anyway if "Default AI" is on?
            // For now, we leave it as pending to be safe.
        }
    }

    return new Response(
      JSON.stringify({ processed: processedCount, actions: actionsCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error("Fatal Function Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
