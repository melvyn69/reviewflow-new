
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai'

declare const Deno: any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const ai = new GoogleGenerativeAI(geminiKey)
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // 1. Fetch pending reviews with org data
    const { data: reviews, error: fetchError } = await supabase
      .from('reviews')
      .select('*, location:locations(organization:organizations(*))')
      .eq('status', 'pending')
      .limit(50) // Process in batches

    if (fetchError) throw fetchError
    if (!reviews || reviews.length === 0) return new Response(JSON.stringify({ message: 'Nothing to process', processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    let processedCount = 0
    let actionsCount = 0

    // 2. Process each review
    for (const review of reviews) {
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
                            const result = await model.generateContent(prompt)
                            replyText = result.response.text()
                            aiModelUsed = 'gemini-1.5-flash'
                            
                            if (action.type === 'auto_reply') {
                                finalStatus = 'sent' // In reality, we would call the GMB API here
                            } else {
                                finalStatus = 'draft'
                            }
                        } catch (e) {
                            console.error("AI Error", e)
                        }
                    }

                    // B. Email Alert (Mock)
                    if (action.type === 'email_alert') {
                        console.log(`[Email] Sending alert to ${action.config?.email_to} for review ${review.id}`)
                        // Here we would call Resend API
                    }

                    // C. Tagging
                    if (action.type === 'add_tag') {
                        // Would update tags column in DB
                    }
                }
                
                // Stop after first matching workflow to prevent conflicts? 
                // For now, yes.
                break 
            }
        }

        // 3. Update DB
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

            await supabase.from('reviews').update(updatePayload).eq('id', review.id)
            processedCount++
        } else if (!matched) {
            // No rule matched -> Keep pending or move to manual? 
            // Let's verify if default AI is enabled (could be a setting). 
            // For now, we leave it pending.
        }
    }

    return new Response(
      JSON.stringify({ processed: processedCount, actions: actionsCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
