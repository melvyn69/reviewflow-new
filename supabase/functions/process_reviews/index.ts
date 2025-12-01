// Follow this setup guide to deploy: https://supabase.com/docs/guides/functions/deploy
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai'

declare const Deno: any

// --- Types simples pour clarifier ce qu'on manipule ---

type Operator = 'equals' | 'contains' | 'gte' | 'lte' | 'in'

interface WorkflowCondition {
  field: string
  operator: Operator
  value: any
}

interface WorkflowAction {
  type: 'generate_ai_reply' | 'auto_reply'
}

interface Brand {
  tone?: string
  language_style?: 'casual' | 'formal'
  knowledge_base?: string
}

interface Workflow {
  enabled: boolean
  conditions?: WorkflowCondition[]
  actions?: WorkflowAction[]
}

interface Organization {
  id: string
  name: string
  industry?: string
  workflows?: Workflow[]
  brand?: Brand
}

interface Location {
  id: string
  organization?: Organization
}

interface Review {
  id: string
  rating: number
  text: string
  author_name?: string
  status: string
  location?: Location
  // autres champs possibles, mais pas nécessaires ici
}

// --- CORS ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Helper pour évaluer les conditions d’un workflow ---

const evaluateCondition = (review: Review, condition: WorkflowCondition): boolean => {
  const { field, operator, value } = condition
  const reviewValue: any = (review as any)[field]

  switch (operator) {
    case 'equals':
      return reviewValue == value
    case 'contains':
      return typeof reviewValue === 'string' && typeof value === 'string' && reviewValue.includes(value)
    case 'gte':
      return typeof reviewValue === 'number' && reviewValue >= value
    case 'lte':
      return typeof reviewValue === 'number' && reviewValue <= value
    case 'in':
      return Array.isArray(value) && value.includes(reviewValue)
    default:
      return false
  }
}

// --- Fonction principale Edge ---

Deno.serve(async (req: Request) => {
  // Pré-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // On ne veut accepter que POST (ou GET si tu préfères)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    // ⚠️ IMPORTANT : utiliser la SERVICE_ROLE KEY uniquement côté serveur / Edge Function
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const apiKey = Deno.env.get('API_KEY') // Google AI key

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    }

    if (!apiKey) {
      throw new Error('Missing Google API Key (API_KEY)')
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    // 1. Récupérer les avis en attente (pending) + organisation liée
    const { data: reviews, error: fetchError } = await supabaseClient
      .from('reviews')
      .select('*, location:locations(organization:organizations(*))')
      .eq('status', 'pending')
      .limit(20) // batch raisonnable

    if (fetchError) throw fetchError

    if (!reviews || reviews.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending reviews to process' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 2. Init Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const results: any[] = []

    // 3. Traitement de chaque avis
    for (const rawReview of reviews as Review[]) {
      const review = rawReview as Review

      const org: Organization | undefined = review.location?.organization
      if (!org) {
        console.warn(`Review ${review.id} n'a pas d'organisation liée, skip`)
        continue
      }

      const workflows: Workflow[] = (org.workflows as any) || []
      const brand: Brand = org.brand || { tone: 'professionnel', language_style: 'formal' }

      let actionTaken = false
      let replyText = ''
      let status: 'pending' | 'draft' | 'sent' = 'pending'

      // --- A. Vérification des workflows personnalisés ---
      for (const wf of workflows) {
        if (!wf || !wf.enabled) continue

        const conditions = wf.conditions || []
        const actions = wf.actions || []

        const match = conditions.length === 0
          ? true // si pas de conditions, le workflow matche toujours
          : conditions.every((c) => evaluateCondition(review, c))

        if (!match) continue

        // Workflow matche → on applique les actions
        for (const action of actions) {
          if (!action?.type) continue

          if (action.type === 'generate_ai_reply' || action.type === 'auto_reply') {
            const prompt = `
Rôle: Tu es le service client pour "${org.name}" (${org.industry || 'commerce'}).
Ton: ${brand.tone || 'professionnel'}.
Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}.
Contexte marque: ${brand.knowledge_base || 'Réponds de manière claire, concise et bienveillante.'}

Tâche: Rédige une réponse à cet avis client Google.
Note: ${review.rating}/5
Auteur: ${review.author_name || 'Client'}
Avis: "${review.text}"

Contraintes:
- Réponse courte (2-4 phrases).
- Ton positif, poli, et professionnel.
- Si l'avis est négatif (< 3), commence par présenter des excuses et propose un contact (sans inventer d'e-mail).
            `.trim()

            try {
              const aiResult = await model.generateContent(prompt)
              replyText = aiResult.response.text().trim()

              // auto_reply = on considère que c'est déjà envoyé
              status = action.type === 'auto_reply' ? 'sent' : 'draft'
              actionTaken = true
            } catch (e) {
              console.error(`AI Error for review ${review.id}:`, e)
            }
          }
        }

        // On s'arrête au premier workflow qui matche pour éviter les conflits
        if (actionTaken) break
      }

      // --- B. Logique par défaut si aucun workflow n'a pris la main ---
      if (!actionTaken && typeof review.rating === 'number' && review.rating >= 4) {
        const defaultPrompt = `
Rédige une courte réponse (2-3 phrases) en français pour remercier ce client de son avis positif.
Auteur: ${review.author_name || 'Client'}
Note: ${review.rating}/5
Avis: "${review.text}"

Style: poli, chaleureux, professionnel. Utilise le "vous".
        `.trim()

        try {
          const defaultResult = await model.generateContent(defaultPrompt)
          replyText = defaultResult.response.text().trim()
          status = 'draft'
          actionTaken = true
        } catch (e) {
          console.error(`AI Error (default) for review ${review.id}:`, e)
        }
      }

      // --- C. Mise à jour en base ---
      if (actionTaken && replyText) {
        const payload: any = {
          status,
          ai_reply: {
            text: replyText,
            created_at: new Date().toISOString(),
            needs_manual_validation: status === 'draft',
          },
        }

        if (status === 'sent') {
          payload.posted_reply = replyText
          payload.replied_at = new Date().toISOString()
        }

        const { error: updateError } = await supabaseClient
          .from('reviews')
          .update(payload)
          .eq('id', review.id)

        if (updateError) {
          console.error(`Update error for review ${review.id}:`, updateError)
          results.push({ id: review.id, status: 'error', message: updateError.message })
        } else {
          results.push({ id: review.id, status: 'processed', outcome: status })
        }
      } else {
        results.push({ id: review.id, status: 'skipped', reason: 'no_matching_workflow_or_logic' })
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.filter((r) => r.status === 'processed').length,
        reviews_count: (reviews as Review[]).length,
        details: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('process_reviews error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
