import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request: any, response: any) {
  console.log("🤖 Robot Reviewflow : Démarrage...");

  // --- TEST HARDCODE (A REMPLACER PAR ENV APRES VALIDATION) ---
  // Collez vos vraies clés ici pour le test
  const SUPABASE_URL = "https://nlgqwmhktlpbkvyaxcuv.supabase.co"; 
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZ3F3bWhrdGxwYmt2eWF4Y3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzY2MTEsImV4cCI6MjA3OTkxMjYxMX0.KE3oYmhqbnH4hBNyXCpsbV6qg7fNU7WyWORNkUBOsP4";
  
  // L'API KEY Gemini semble bien passer (hasAi: true), donc on peut la laisser en env ou la hardcoder aussi si doute
  const API_KEY = process.env.VITE_API_KEY || process.env.API_KEY; 
  // ------------------------------------------------------------

  if (!SUPABASE_URL || !SUPABASE_KEY || !API_KEY) {
    console.error("❌ Configuration manquante");
    return response.status(500).json({ 
        error: 'Variables manquantes.',
        details: { hasUrl: !!SUPABASE_URL, hasKey: !!SUPABASE_KEY, hasAi: !!API_KEY }
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // ... (reste du code identique)
    // ...

    // Code simplifié pour tester la connexion rapidement
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`id, rating, text, location:locations(organization:organizations(brand, workflows))`)
      .eq('status', 'pending')
      .limit(5);

    if (error) throw error;

    if (!reviews || reviews.length === 0) {
      return response.status(200).json({ message: 'Tout est à jour (Connexion OK)' });
    }

    // ... (logique IA)
    // Pour le test rapide, on renvoie juste le succès de la lecture
    return response.status(200).json({ success: true, message: "Connexion DB réussie, avis trouvés", count: reviews.length });

  } catch (err: any) {
    console.error("❌ Erreur Critique:", err);
    return response.status(500).json({ error: err.message });
  }
}