// Follow this setup guide to deploy: https://supabase.com/docs/guides/functions/deploy
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai' // CHANGED

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: any) => {
  // ... (CORS handling same)

  try {
    // ... (Supabase client init same)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // ... (Fetch reviews same)
    const { data: reviews, error: fetchError } = await supabaseClient
      .from('reviews')
      .select('*, organization:locations(organization_id)')
      .eq('status', 'pending')
      .limit(10);

    if (fetchError) throw fetchError;
    if (!reviews || reviews.length === 0) {
        return new Response(JSON.stringify({ message: 'No pending reviews' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 3. Initialize AI
    const apiKey = Deno.env.get('API_KEY');
    if (!apiKey) throw new Error("Missing Google API Key");
    const genAI = new GoogleGenerativeAI(apiKey); // CHANGED
    const model = genAI.getGenerativeModel({ model: "gemini-pro"}); // CHANGED
    
    const results = [];

    // 4. Process Each Review
    for (const review of reviews) {
        const prompt = `
            You are a helpful customer support agent.
            Review from ${review.author_name} (${review.rating}/5 stars): "${review.body}"
            Write a professional, short, and polite response in ${review.language || 'French'}.
        `;

        const result = await model.generateContent(prompt);
        const replyText = result.response.text();

        // ... (Update DB same)
        const { error: updateError } = await supabaseClient
            .from('reviews')
            .update({
                status: 'draft',
                ai_reply: {
                    text: replyText,
                    created_at: new Date().toISOString(),
                    needs_manual_validation: review.rating <= 2
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