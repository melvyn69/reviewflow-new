import { createClient } from '@supabase/supabase-js';

// --- INSTRUCTIONS POUR LE CLIENT ---
// 1. Allez dans votre dashboard Supabase > Project Settings > API
// 2. Copiez "Project URL" et collez-le ci-dessous
// 3. Copiez "anon public" key et collez-la ci-dessous

// REMPLACEZ CECI PAR VOTRE URL SUPABASE (ex: https://xyz.supabase.co)
const SUPABASE_URL: string = "https://nlgqwmhktlpbkvyaxcuv.supabase.co";

// REMPLACEZ CECI PAR VOTRE CLÉ ANON PUBLIC (ex: eyJhbGc...)
const SUPABASE_ANON_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZ3F3bWhrdGxwYmt2eWF4Y3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzY2MTEsImV4cCI6MjA3OTkxMjYxMX0.KE3oYmhqbnH4hBNyXCpsbV6qg7fNU7WyWORNkUBOsP4";

// Création du client (Le pont entre l'app et la base de données)
// Nous utilisons une condition pour ne pas faire planter l'app si les clés ne sont pas encore mises
export const supabase = (SUPABASE_URL !== "REMPLACER_PAR_VOTRE_PROJECT_URL") 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Fonction utilitaire pour vérifier si Supabase est configuré
export const isSupabaseConfigured = () => {
    return supabase !== null;
};