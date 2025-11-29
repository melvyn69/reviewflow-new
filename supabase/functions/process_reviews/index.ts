
// Follow this setup guide to deploy: https://supabase.com/docs/guides/functions/deploy
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'https://esm.sh/@google/genai'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: any) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize Supabase Client
    const supabaseClient = createClient(
      // Supabase API URL - env var automatically populated by Supabase
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API Anon Key - env var automatically populated by Supabase
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Fetch Pending Reviews
    const { data: reviews, error: fetchError } = await supabaseClient
      .from('reviews')
      .select('*, organization:locations(organization_id)')
      .eq('status', 'pending')
      .limit(10); // Batch size

    if (fetchError) throw fetchError;
    if (!reviews || reviews.length === 0) {
        return new Response(JSON.stringify({ message: 'No pending reviews' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 3. Initialize AI
    const apiKey = Deno.env.get('API_KEY');
    if (!apiKey) throw new Error("Missing Google API Key");
    const ai = new GoogleGenAI({ apiKey });
    
    const results = [];

    // 4. Process Each Review
    for (const review of reviews) {
        // Generate AI Reply
        const prompt = `
            You are a helpful customer support agent.
            Review from ${review.author_name} (${review.rating}/5 stars): "${review.body}"
            Write a professional, short, and polite response in ${review.language || 'French'}.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        const replyText = response.text;

        // Update Review in DB
        const { error: updateError } = await supabaseClient
            .from('reviews')
            .update({
                status: 'draft', // Safety first: set to draft
                ai_reply: {
                    text: replyText,
                    created_at: new Date().toISOString(),
                    needs_manual_validation: review.rating <= 2 // Flag bad reviews
                }
            })
            .eq('id', review.id);
            
        if (!updateError) {
            results.push({ id: review.id, status: 'processed' });
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
