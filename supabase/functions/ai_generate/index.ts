import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.24.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 0) Auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1) Env
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiKey = Deno.env.get("API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !geminiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Missing env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / API_KEY)",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 2) Verify user via Supabase Auth
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Parse body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { task, context } = body;

    if (!task || !context) {
      return new Response(
        JSON.stringify({ error: "Missing fields: task, context" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4) Gemini client
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 5) Construct prompt
    let prompt = "";

    if (task === "generate_reply") {
      const { review, tone, length } = context;

      if (!review?.body || !review?.author_name || typeof review?.rating !== "number") {
        return new Response(
          JSON.stringify({
            error:
              "Missing review fields (author_name, body, rating) for generate_reply",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      prompt = `
Rôle: Tu es le propriétaire d'un établissement répondant à un avis client.
Tâche: Rédige une réponse à cet avis.

Avis Client (${review.rating}/5) de ${review.author_name}:
"${review.body}"

Consignes:
- Ton: ${tone || "Professionnel"}
- Longueur: ${
        length === "short"
          ? "Courte (1-2 phrases)"
          : length === "long"
          ? "Détaillée (3-4 phrases)"
          : "Moyenne"
      }
- Langue: Français
- Ne pas mettre de guillemets autour de la réponse.
- Sois poli, empathique et constructif.
`.trim();
    } else if (task === "social_post") {
      const { review, platform } = context;

      if (!review?.body || !review?.author_name || typeof review?.rating !== "number") {
        return new Response(
          JSON.stringify({
            error:
              "Missing review fields (author_name, body, rating) for social_post",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      prompt = `
Act as a world-class Social Media Manager.
Platform: ${platform || "Instagram"} (Instagram, LinkedIn, or Facebook).
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
`.trim();
    } else {
      return new Response(JSON.stringify({ error: "Unknown task" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6) Generate
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});