
import { createClient } from '@supabase/supabase-js';

// Récupération des variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- DEBUG LOGS (Regardez votre console navigateur F12) ---
console.log("--- SUPABASE CONFIG DEBUG ---");
console.log("URL définie :", !!SUPABASE_URL, SUPABASE_URL ? `(${SUPABASE_URL.substring(0, 15)}...)` : 'NON');
console.log("KEY définie :", !!SUPABASE_ANON_KEY, SUPABASE_ANON_KEY ? '(Présente)' : 'NON');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("ERREUR CRITIQUE : Les variables VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY sont manquantes. Vérifiez votre fichier .env");
}
// ---------------------------------------------------------

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true, // Garde la session active après refresh
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce', // INDISPENSABLE pour la stabilité OAuth (Google) et les erreurs de clock skew
        },
        // Désactivation des websockets par défaut si la connexion est instable
        realtime: {
            params: {
                eventsPerSecond: 1,
            },
        },
      })
    : null;

export const isSupabaseConfigured = () => supabase !== null;
