
import { supabase, isSupabaseConfigured } from './supabase';
import { 
  INITIAL_ORG, 
  INITIAL_REVIEWS, 
  INITIAL_ANALYTICS, 
  INITIAL_COMPETITORS
} from './db';
import { 
  User, 
  Review, 
  Organization, 
  WorkflowRule, 
  ReviewStatus,
  BrandSettings,
  Customer,
  AppNotification,
  Competitor,
  SetupStatus,
  Location,
  AnalyticsSummary
} from '../types';
import { GoogleGenAI } from '@google/genai';

// --- SERVICE HELPER ---

const requireSupabase = () => {
  if (!isSupabaseConfigured()) {
    throw new Error("La base de données n'est pas connectée. Veuillez configurer les variables d'environnement Vercel.");
  }
  return supabase!;
};

// --- SERVICES ---

const authService = {
    getUser: async (): Promise<User | null> => {
      if (!isSupabaseConfigured()) return null;
      
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase!.from('users').select('*').eq('id', user.id).single();
      
      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata.full_name || 'Utilisateur',
        avatar: user.user_metadata.avatar_url,
        role: profile?.role || 'viewer',
        organizations: profile?.organization_id ? [profile.organization_id] : [],
        organization_id: profile?.organization_id
      };
    },
    login: async (email: string, password: string) => {
      const db = requireSupabase();
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    register: async (name: string, email: string, password: string) => {
        const db = requireSupabase();
        
        const { data: authData, error: authError } = await db.auth.signUp({ 
            email, 
            password, 
            options: { data: { full_name: name } } 
        });
        if (authError) throw authError;
    },
    updateProfile: async (data: { name?: string, email?: string, password?: string }) => {
        const db = requireSupabase();
        const updates: any = {};
        
        if (data.email) updates.email = data.email;
        if (data.password) updates.password = data.password;
        if (data.name) updates.data = { full_name: data.name };

        const { error } = await db.auth.updateUser(updates);
        if (error) throw error;
        return true;
    },
    logout: async () => {
        if (isSupabaseConfigured()) { await supabase!.auth.signOut(); }
    },
    resetPassword: async (email: string) => {
        if (isSupabaseConfigured()) { 
            await supabase!.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/#reset-callback' }); 
        }
        return true;
    },
    loginWithGoogle: async () => {
        const db = requireSupabase();
        const { error } = await db.auth.signInWithOAuth({
            provider: 'google',
            options: { 
                redirectTo: window.location.origin, 
                queryParams: { access_type: 'offline', prompt: 'consent' } 
            }
        });
        if (error) throw error;
    }
};

const organizationService = {
      get: async (): Promise<Organization | null> => {
          if (!isSupabaseConfigured()) return null;

          try {
              const { data: { user } } = await supabase!.auth.getUser();
              if (!user) return null;

              const { data: profile } = await supabase!.from('users').select('organization_id').eq('id', user.id).single();
              
              // AUTO-REPAIR: Si l'utilisateur n'a pas d'organisation, on en crée une par défaut
              if (!profile?.organization_id) {
                  console.log("⚠️ Aucune organisation trouvée pour cet utilisateur. Création automatique...");
                  return await organizationService.createDefault(user.id);
              }

              const { data: org, error } = await supabase!.from('organizations').select('*').eq('id', profile.organization_id).single();
              
              if (error || !org) {
                  // Double check: si l'ID est dans le profil mais l'org n'existe pas en DB (cas rare de suppression)
                   return await organizationService.createDefault(user.id);
              }

              const { data: locations } = await supabase!.from('locations').select('*').eq('organization_id', profile.organization_id);

              return { 
                  ...INITIAL_ORG, 
                  ...org, 
                  brand: org.brand || INITIAL_ORG.brand,
                  integrations: org.integrations || INITIAL_ORG.integrations,
                  saved_replies: org.saved_replies || [],
                  workflows: org.workflows || [], 
                  locations: locations || [] 
              } as Organization;
          } catch (e) { 
              console.error("Error fetching organization", e);
              return null; 
          }
      },
      createDefault: async (userId: string): Promise<Organization | null> => {
          try {
              const db = requireSupabase();
              
              // 1. Créer l'organisation
              const { data: org, error: orgError } = await db.from('organizations').insert({
                  name: 'Ma Société',
                  subscription_plan: 'free',
                  industry: 'other'
              }).select().single();
              
              if (orgError) throw orgError;

              // 2. Créer un établissement par défaut
              await db.from('locations').insert({
                  organization_id: org.id,
                  name: 'Siège Principal',
                  city: 'Paris',
                  country: 'France',
                  connection_status: 'disconnected'
              });

              // 3. Lier l'utilisateur
              await db.from('users').update({
                  organization_id: org.id,
                  role: 'admin'
              }).eq('id', userId);

              // 4. Recharger l'organisation complète (récursif mais safe car profile.organization_id est set)
              return await organizationService.get();

          } catch (e) {
              console.error("Critical error creating default org:", e);
              return null;
          }
      },
      update: async (data: Partial<Organization>) => {
          const user = await authService.getUser();
          if (user?.organization_id) {
              const { error } = await requireSupabase().from('organizations').update(data).eq('id', user.organization_id);
              if (error) throw error;
          }
          return INITIAL_ORG;
      },
      initiateGoogleAuth: async (clientId: string) => { 
          alert("Nécessite une App Google Cloud vérifiée avec scope 'business.manage'.");
          return true; 
      },
      toggleIntegration: async (provider: string, enabled: boolean) => { return true; },
      upgradePlan: async (plan: string) => { return true; }
};

const reviewsService = {
      list: async (filters: any): Promise<Review[]> => {
          let result: Review[] = [];
          
          if (isSupabaseConfigured()) {
            try {
                let query = supabase!.from('reviews').select('*').order('received_at', { ascending: false });
                
                if (filters.status && filters.status !== 'Tout') query = query.eq('status', filters.status.toLowerCase());
                if (filters.source && filters.source !== 'Tout') query = query.eq('source', filters.source.toLowerCase());
                if (filters.rating && filters.rating !== 'Tout') query = query.eq('rating', parseInt(filters.rating));
                
                const { data, error } = await query;
                if (!error && data) {
                    result = data.map((r: any) => {
                        // Assurer que le texte est visible même si colonne 'text' ou 'body'
                        const bodyContent = r.text || r.body || '';
                        
                        // Assurer que les mots-clés sont visibles s'ils existent dans les thèmes
                        const analysis = r.analysis || { sentiment: 'neutral', themes: [], keywords: [], flags: {} };
                        if ((!analysis.keywords || analysis.keywords.length === 0) && analysis.themes && analysis.themes.length > 0) {
                            analysis.keywords = analysis.themes;
                        }

                        return {
                            ...r, 
                            body: bodyContent,
                            internal_notes: r.internal_notes || [], 
                            analysis: analysis
                        };
                    });
                }
            } catch (e) {
                console.warn("DB Fetch Error", e);
            }
          }

          // Filter on combined results if needed
          if (filters.search) {
              const q = filters.search.toLowerCase();
              result = result.filter(r => r.body?.toLowerCase().includes(q) || r.author_name?.toLowerCase().includes(q));
          }
          
          return result;
      },
      reply: async (id: string, text: string) => {
          const { error } = await requireSupabase().from('reviews').update({ status: 'sent', posted_reply: text, replied_at: new Date().toISOString() }).eq('id', id);
          if (error) throw error;
          return true;
      },
      saveDraft: async (id: string, text: string) => {
          const { error } = await requireSupabase().from('reviews').update({ 
              status: 'draft', 
              ai_reply: { text, needs_manual_validation: false, created_at: new Date().toISOString() } 
          }).eq('id', id);
          if (error) throw error;
          return true;
      },
      updateStatus: async (id: string, status: ReviewStatus) => {
          await requireSupabase().from('reviews').update({ status }).eq('id', id);
          return true; 
      },
      addNote: async (id: string, text: string) => {
          const user = await authService.getUser();
          const newNote = { 
              id: `n-${Date.now()}`, 
              text, 
              author_name: user?.name || 'Moi', 
              created_at: new Date().toISOString() 
          };
          
          const db = requireSupabase();
          const { data: review } = await db.from('reviews').select('internal_notes').eq('id', id).single();
          const notes = review?.internal_notes || [];
          
          const { error } = await db.from('reviews').update({ internal_notes: [...notes, newNote] }).eq('id', id);
          if (error) throw error;

          return newNote;
      },
      importBulk: async (data: any[], locationId: string) => {
          const db = requireSupabase();
          const formattedData = data.map(r => ({
              location_id: locationId,
              source: r.source?.toLowerCase() || 'google',
              rating: parseInt(r.rating) || 5,
              author_name: r.author_name || 'Anonyme',
              // Use text for DB insertion
              text: r.text || r.body || '',
              language: 'fr',
              received_at: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
              status: 'pending',
              analysis: {
                  sentiment: 'neutral',
                  themes: [],
                  keywords: [],
                  flags: { hygiene: false, security: false }
              }
          }));
          const { error } = await db.from('reviews').insert(formattedData);
          if (error) throw error;
          return data.length;
      }
};

const aiService = {
      generateReply: async (review: Review, options: any) => {
          const apiKey = process.env.API_KEY; 
          
          if (!apiKey) {
             throw new Error("Clé API Google Gemini manquante (process.env.API_KEY).");
          }

          try {
              const org = await organizationService.get(); 
              const brand: BrandSettings = org?.brand || { tone: 'professionnel', description: '', knowledge_base: '', use_emojis: false, language_style: 'formal', signature: '' };
              const industry = org?.industry || 'other';
              const knowledgeBaseContext = brand.knowledge_base ? `\n\n[INFO CONTEXTE ENTREPRISE]:\n${brand.knowledge_base}` : '';

              const prompt = `
                Tu es le gestionnaire des avis pour une entreprise de type "${industry}".
                
                [IDENTITÉ DE MARQUE]
                - Ton: ${options.tone || brand.tone}
                - Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}.
                - Emojis: ${brand.use_emojis ? 'Oui, modérément' : 'Non'}
                - Longueur: ${options.length || 'Moyenne (2-3 phrases)'}
                ${knowledgeBaseContext}

                [TÂCHE]
                Rédige une réponse professionnelle et empathique à cet avis.
                Ne mets PAS de guillemets autour de la réponse.
                
                [AVIS CLIENT]
                Note: ${review.rating}/5
                Auteur: ${review.author_name}
                Commentaire: "${review.body}"
              `;

              const ai = new GoogleGenAI({ apiKey });
              const response = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: prompt,
              });

              const text = response.text || "";

              if (isSupabaseConfigured() && org) {
                  await supabase!.from('organizations').update({ ai_usage_count: (org.ai_usage_count || 0) + 1 }).eq('id', org.id);
              }

              return text;

          } catch (e: any) {
              console.error("Erreur IA:", e);
              throw new Error(e.message || "Erreur lors de la génération IA.");
          }
      },
      previewBrandVoice: async (brand: BrandSettings, mockReview: any) => {
          const apiKey = process.env.API_KEY; 
          if (!apiKey) throw new Error("Clé API Google Gemini manquante.");

          try {
              const knowledgeBaseContext = brand.knowledge_base ? `\n\n[INFO CONTEXTE ENTREPRISE]:\n${brand.knowledge_base}` : '';
              
              const prompt = `
                Tu es le gestionnaire des avis client.
                
                [PARAMÈTRES DE MARQUE À TESTER]
                - Ton: ${brand.tone || 'Neutre'}
                - Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}.
                - Emojis: ${brand.use_emojis ? 'Oui, modérément' : 'Non'}
                ${knowledgeBaseContext}

                [TÂCHE]
                Rédige une réponse TEST à cet avis fictif pour montrer ton style.
                Ne mets PAS de guillemets.
                
                [AVIS FICTIF]
                Note: ${mockReview.rating}/5
                Commentaire: "${mockReview.body}"
              `;

              const ai = new GoogleGenAI({ apiKey });
              const response = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: prompt,
              });

              return response.text || "";
          } catch (e: any) {
              throw new Error(e.message || "Erreur simulation IA");
          }
      },
      generateSocialPost: async (review: Review, platform: 'instagram' | 'linkedin' | 'facebook') => {
          const apiKey = process.env.API_KEY;
          if (!apiKey) return "Clé manquante";
          const ai = new GoogleGenAI({ apiKey });
          
          try {
              const response = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: `Rédige un post court et engageant pour ${platform} (avec emojis et hashtags) pour mettre en avant cet avis client positif : "${review.body}".`
              });
              return response.text || "";
          } catch (e) {
              return "Erreur génération post social.";
          }
      },
      runCustomTask: async (payload: any) => {
          const apiKey = process.env.API_KEY;
          if (!apiKey) return { error: "Clé manquante" };
          const ai = new GoogleGenAI({ apiKey });
          
          try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: JSON.stringify(payload)
            });
            return { result: response.text };
          } catch (e: any) {
             return { error: e.message };
          }
      }
};

const automationService = {
      getWorkflows: async (): Promise<WorkflowRule[]> => {
          const org = await organizationService.get();
          if (org && (org as any).workflows) {
              return (org as any).workflows;
          }
          return [];
      },
      create: async (workflow: WorkflowRule) => {
          const org = await organizationService.get();
          if (org) {
               const currentWorkflows = (org as any).workflows || [];
               const newWorkflows = [...currentWorkflows, workflow];
               const { error } = await requireSupabase().from('organizations').update({ workflows: newWorkflows }).eq('id', org.id);
               if (error) throw error;
               return true;
          }
          return false;
      },
      run: async () => {
          try {
             const res = await fetch('/api/cron', { method: 'GET' });
             const data = await res.json();
             return { processed: data.processed?.length || 0, actions: 0, alerts: 0 };
          } catch (e) {
             return { processed: 0, actions: 0, alerts: 0 };
          }
      }
};

const seedCloudDatabase = async () => {
      const db = requireSupabase();
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error("Vous devez être connecté pour initialiser la DB.");
      
      try {
          const { data: existingUser } = await db.from('users').select('organization_id').eq('id', user.id).single();
          let orgId = existingUser?.organization_id;

          if (!orgId) {
              const { data: org, error: orgError } = await db.from('organizations').insert({ 
                  name: 'Organisation Démo', 
                  subscription_plan: 'pro',
                  workflows: [] 
              }).select().single();
              if (orgError) throw orgError;
              orgId = org.id;
              await db.from('users').update({ role: 'admin', organization_id: orgId }).eq('id', user.id);
          }
          
          const { data: locs, error: locError } = await db.from('locations').insert([{ 
              organization_id: orgId, 
              name: "Boutique Paris Centre", 
              city: "Paris" 
          }]).select();
          if (locError) throw locError;

          if (locs) {
              const reviewsPayload = INITIAL_REVIEWS.map(r => ({ 
                  location_id: locs[0].id, 
                  source: r.source,
                  rating: r.rating,
                  text: r.body,
                  author_name: r.author_name,
                  received_at: r.received_at,
                  status: r.status,
                  language: r.language,
                  internal_notes: [], 
                  analysis: r.analysis || {} 
              }));
              await db.from('reviews').insert(reviewsPayload);
          }
          
          window.location.reload();
          return true;
      } catch (e: any) {
          console.error("Seed error:", e);
          throw new Error("Erreur injection: " + e.message);
      }
};

const locationsService = {
    create: async (data: { name: string, city: string, address: string, country: string, google_review_url?: string }) => {
        const user = await authService.getUser();
        if (user?.organization_id) {
            const { error } = await requireSupabase().from('locations').insert({
                organization_id: user.organization_id,
                ...data
            });
            if (error) throw error;
            return true;
        }
        throw new Error("Utilisateur sans organisation.");
    },
    update: async (id: string, data: Partial<Location>) => {
        const { error } = await requireSupabase().from('locations').update(data).eq('id', id);
        if (error) throw error;
        return true;
    }
};

const publicService = {
    getLocationInfo: async (id: string) => {
        if (isSupabaseConfigured()) {
            try {
                const { data, error } = await supabase!.from('locations').select('*').eq('id', id).single();
                if (!error && data) return { name: data.name, city: data.city, googleUrl: data.google_review_url || '#' };
            } catch (e) { console.warn("Erreur publique", e); }
        }
        return null;
    },
    getWidgetReviews: async (locationId: string) => {
        if (!isSupabaseConfigured()) return [];
        try {
            // Uniquement les avis positifs pour le widget (marketing)
            const { data, error } = await supabase!
                .from('reviews')
                .select('author_name, rating, text, received_at')
                .eq('location_id', locationId)
                .gte('rating', 4)
                .order('received_at', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            
            return data.map((r: any) => ({
                author_name: r.author_name,
                rating: r.rating,
                body: r.text || '', // Mapping text -> body
                received_at: r.received_at
            }));
        } catch (e) {
            console.error("Widget fetch error", e);
            return [];
        }
    },
    submitFeedback: async (locationId: string, rating: number, feedback: string, contact: string, tags: string[] = []) => {
        // STRATÉGIE ROBUSTE :
        // 1. Tenter via l'API Serverless (meilleur pour la sécurité, contourne RLS)
        // 2. Si échoue (ex: environnement local sans API), tenter en direct Supabase (nécessite RLS ouvert)
        
        let apiError: any = null;

        try {
            const response = await fetch('/api/submit-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locationId, rating, feedback, contact, tags })
            });

            // Si 404, l'API n'existe pas (dev local), on throw pour passer au catch
            if (response.status === 404) throw new Error("API Route not found");

            if (!response.ok) {
                // Tenter de lire le message d'erreur JSON
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const err = await response.json();
                    throw new Error(err.error || "Erreur API inconnue");
                } else {
                    const text = await response.text();
                    throw new Error(`Erreur API (${response.status}): ${text.substring(0, 50)}`);
                }
            }
            return true;

        } catch (e) {
            apiError = e;
            console.warn("API Submit failed, attempting direct DB insert...", e);
            
            // FALLBACK : Insertion directe
            const db = requireSupabase();
            const finalBody = feedback || '';

            const newReview = {
                location_id: locationId,
                rating: rating,
                text: finalBody,
                author_name: contact || 'Client Anonyme (Funnel)',
                source: 'direct',
                status: 'pending',
                received_at: new Date().toISOString(),
                language: 'fr',
                analysis: { 
                    sentiment: rating >= 4 ? 'positive' : 'negative', 
                    themes: tags || [], 
                    keywords: tags || [], // Duplication pour visibilité UI
                    flags: { hygiene: false, security: false } 
                }
            };

            const { error } = await db.from('reviews').insert(newReview);
            if (error) {
                console.error("DB Insert Error:", error);
                const msg = apiError ? `${apiError.message}` : error.message;
                throw new Error(`Échec de l'envoi. Cause: ${msg}`);
            }
            return true;
        }
    }
};

const analyticsService = {
    getOverview: async (period?: string): Promise<AnalyticsSummary> => {
        if (!isSupabaseConfigured()) return INITIAL_ANALYTICS;

        // Récupération des avis réels
        const { data: reviews, error } = await supabase!
            .from('reviews')
            .select('*');

        if (error || !reviews || reviews.length === 0) {
            // S'il n'y a pas encore d'avis, on retourne une structure vide propre plutôt que les mocks statiques
            return { ...INITIAL_ANALYTICS, total_reviews: 0, average_rating: 0, volume_by_date: [] };
        }

        // Calculs dynamiques
        const total = reviews.length;
        const sumRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
        const avgRating = total > 0 ? parseFloat((sumRating / total).toFixed(1)) : 0;

        // Sentiment Distribution
        const positiveCount = reviews.filter(r => r.rating >= 4).length;
        const neutralCount = reviews.filter(r => r.rating === 3).length;
        const negativeCount = reviews.filter(r => r.rating <= 2).length;

        // NPS Calculation (Simplified for Reviews)
        // Promoters: 5 stars, Passives: 4 stars, Detractors: 1-3 stars (approx)
        const promoters = reviews.filter(r => r.rating === 5).length;
        const detractors = reviews.filter(r => r.rating <= 3).length;
        const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

        // Volume by Date (Last 7 days approx)
        const volumeMap: Record<string, number> = {};
        reviews.forEach(r => {
            const date = new Date(r.received_at).toLocaleDateString('fr-FR', { weekday: 'short' });
            volumeMap[date] = (volumeMap[date] || 0) + 1;
        });
        const volumeData = Object.entries(volumeMap).map(([date, count]) => ({ date, count }));

        // Keywords Extraction (Basic Frequency)
        const allText = reviews.map(r => r.text || r.body || "").join(" ").toLowerCase();
        const words = allText.split(/\s+/).filter(w => w.length > 3); // Filter short words
        const stopWords = ['pour', 'avec', 'très', 'mais', 'nous', 'vous', 'cette', 'était', 'sont'];
        const freqMap: Record<string, number> = {};
        
        words.forEach(w => {
            const cleanWord = w.replace(/[.,!?;:()]/g, "");
            if (!stopWords.includes(cleanWord)) {
                freqMap[cleanWord] = (freqMap[cleanWord] || 0) + 1;
            }
        });

        const topKeywords = Object.entries(freqMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([keyword, count]) => ({ keyword, count }));

        return {
            period: period || 'all_time',
            total_reviews: total,
            average_rating: avgRating,
            response_rate: 85, // Placeholder for now or calc based on 'status'
            nps_score: nps,
            sentiment_distribution: {
                positive: total > 0 ? positiveCount / total : 0,
                neutral: total > 0 ? neutralCount / total : 0,
                negative: total > 0 ? negativeCount / total : 0
            },
            volume_by_date: volumeData.length > 0 ? volumeData : INITIAL_ANALYTICS.volume_by_date,
            top_themes_positive: INITIAL_ANALYTICS.top_themes_positive, // Requires complex AI analysis, keep mock or simpler logic
            top_themes_negative: INITIAL_ANALYTICS.top_themes_negative,
            top_keywords: topKeywords.length > 0 ? topKeywords : INITIAL_ANALYTICS.top_keywords,
            problems_summary: "Analyse en temps réel activée.",
            strengths_summary: "Les données sont mises à jour dynamiquement."
        };
    }
};

const customersService = {
    list: async (): Promise<Customer[]> => {
        if (!isSupabaseConfigured()) {
             // Fallback to mock if no DB
             return Array(20).fill(null).map((_, i) => ({
                id: `cust-${i}`,
                name: `Client ${i + 1}`,
                source: i % 2 === 0 ? 'Google' : 'Facebook',
                last_interaction: new Date().toISOString(),
                total_reviews: Math.floor(Math.random() * 5) + 1,
                average_rating: 4 + Math.random(),
                status: i % 3 === 0 ? 'promoter' : 'passive'
            })) as Customer[];
        }

        try {
            const { data: reviews, error } = await supabase!
                .from('reviews')
                .select('author_name, rating, source, received_at')
                .order('received_at', { ascending: false });

            if (error) throw error;

            const customerMap = new Map<string, Customer>();

            reviews?.forEach((r) => {
                const name = r.author_name || 'Anonyme';
                if (!customerMap.has(name)) {
                    customerMap.set(name, {
                        id: `cust-${name.replace(/\s+/g, '-').toLowerCase()}`,
                        name: name,
                        source: r.source, // Derniere source vue car trié par date desc
                        last_interaction: r.received_at,
                        total_reviews: 0,
                        average_rating: 0,
                        status: 'passive'
                    } as any); // temporary type for calculation
                }
                
                const cust = customerMap.get(name)!;
                // We store sum in average_rating temporarily
                cust.average_rating += r.rating;
                cust.total_reviews += 1;
            });

            // Finalize calculations
            return Array.from(customerMap.values()).map(c => {
                const avg = c.average_rating / c.total_reviews;
                let status: Customer['status'] = 'passive';
                if (avg >= 4.5) status = 'promoter';
                if (avg <= 3) status = 'detractor';

                return {
                    ...c,
                    average_rating: avg,
                    status
                };
            });

        } catch (e) {
            console.error("Error fetching customers:", e);
            return [];
        }
    }
};

const adminService = {
    getStats: async () => ({ 
        mrr: "2,450 €", 
        active_tenants: 42, 
        total_reviews_processed: 1540, 
        tenants: [
            { id: '1', name: 'Demo Corp', admin_email: 'ceo@demo.com', plan: 'pro', usage: 120, mrr: '79€' },
            { id: '2', name: 'Boulangerie Paul', admin_email: 'paul@boulangerie.com', plan: 'starter', usage: 45, mrr: '49€' }
        ] 
    }),
    resetAccount: async () => {
        if (!isSupabaseConfigured()) {
            return true;
        }
        const user = await authService.getUser();
        if (!user?.organization_id) return false;

        // Supprimer les avis liés à l'organisation via les locations
        const { data: locations } = await supabase!.from('locations').select('id').eq('organization_id', user.organization_id);
        const locationIds = locations?.map(l => l.id) || [];
        
        if (locationIds.length > 0) {
            await supabase!.from('reviews').delete().in('location_id', locationIds);
        }
        
        // Reset usage count
        await supabase!.from('organizations').update({ ai_usage_count: 0 }).eq('id', user.organization_id);
        
        return true;
    }
};

const socialService = {
    publish: async (platform: string, content: string) => {
        console.log(`Publishing to ${platform}: ${content}`);
        return true;
    }
};

const notificationsService = {
    list: async (): Promise<AppNotification[]> => [],
    markAllRead: async () => true,
    sendTestEmail: async () => {
        const user = await authService.getUser();
        if (!user || !user.email) throw new Error("Utilisateur non identifié");

        const response = await fetch('/api/send-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: user.email,
                subject: '🔔 Test Notification Reviewflow',
                html: '<h1>Ceci est un test</h1><p>Si vous lisez ceci, votre configuration Resend fonctionne parfaitement !</p>'
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Erreur lors de l'envoi");
        }
        return true;
    }
};

const onboardingService = {
    checkStatus: async (): Promise<SetupStatus> => {
        if (!isSupabaseConfigured()) {
             return {
                googleConnected: false,
                brandVoiceConfigured: true,
                firstReviewReplied: false,
                completionPercentage: 35
            };
        }

        try {
            // 1. Check Org Settings
            const org = await organizationService.get();
            const googleConnected = !!org?.integrations?.google;
            const brandVoiceConfigured = !!(org?.brand?.tone && org?.brand?.tone.length > 0);

            // 2. Check Activity (Replies)
            // We use count from DB to be faster
            const { count } = await supabase!
                .from('reviews')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'sent');
            
            const firstReviewReplied = (count || 0) > 0;

            // Calculate Percentage
            const steps = [googleConnected, brandVoiceConfigured, firstReviewReplied];
            const completed = steps.filter(Boolean).length;
            const completionPercentage = Math.round((completed / 3) * 100);

            return {
                googleConnected,
                brandVoiceConfigured,
                firstReviewReplied,
                completionPercentage
            };
        } catch (e) {
            console.warn("Onboarding check failed", e);
             return {
                googleConnected: false,
                brandVoiceConfigured: false,
                firstReviewReplied: false,
                completionPercentage: 0
            };
        }
    }
};

const activityService = {
    getRecent: async () => {
        if (!isSupabaseConfigured()) {
            return [
                { id: 1, type: 'review', text: 'Mode Démo: Nouvel avis 5 étoiles', location: 'Démo', time: 'Il y a 2h' },
            ];
        }

        try {
            // Récupérer les 5 derniers avis
            const { data: reviews } = await supabase!
                .from('reviews')
                .select('id, rating, author_name, received_at, status')
                .order('received_at', { ascending: false })
                .limit(5);

            if (!reviews) return [];

            return reviews.map((r: any) => ({
                id: r.id,
                type: 'review',
                text: `${r.author_name} a laissé une note de ${r.rating}/5`,
                location: r.status === 'pending' ? 'À traiter' : 'Traité',
                time: new Date(r.received_at).toLocaleDateString()
            }));

        } catch (e) {
            console.error("Erreur Activity Feed", e);
            return [];
        }
    }
};

const teamService = {
    list: async (): Promise<User[]> => [],
    invite: async (email: string, role: string) => {
        console.log(`Inviting ${email} as ${role}`);
        return true;
    }
};

const competitorsService = {
    list: async (): Promise<Competitor[]> => {
        // Fallback Mock si la table n'existe pas encore
        if (!isSupabaseConfigured()) return INITIAL_COMPETITORS;
        try {
            const { data, error } = await supabase!.from('competitors').select('*');
            if (error) throw error;
            if (data && data.length > 0) {
                return data.map(c => ({
                    ...c,
                    strengths: c.strengths || [],
                    weaknesses: c.weaknesses || []
                }));
            }
            return INITIAL_COMPETITORS; // Return mock if DB empty for better DX
        } catch (e) {
            return INITIAL_COMPETITORS;
        }
    },
    create: async (competitor: Omit<Competitor, 'id'>) => {
        if (!isSupabaseConfigured()) {
            INITIAL_COMPETITORS.push({ ...competitor, id: `c-${Date.now()}` });
            return true;
        }
        try {
            const user = await authService.getUser();
            const { error } = await supabase!.from('competitors').insert({
                ...competitor,
                organization_id: user?.organization_id
            });
            if (error) throw error;
            return true;
        } catch (e) {
            console.warn("Ajout concurrent en mémoire (table manquante)", e);
            INITIAL_COMPETITORS.push({ ...competitor, id: `c-${Date.now()}` });
            return true;
        }
    },
    delete: async (id: string) => {
        if (isSupabaseConfigured()) {
            try {
                await supabase!.from('competitors').delete().eq('id', id);
            } catch (e) { /* ignore if fails */ }
        }
        // Remove from memory fallback too
        const idx = INITIAL_COMPETITORS.findIndex(c => c.id === id);
        if (idx !== -1) INITIAL_COMPETITORS.splice(idx, 1);
        return true;
    },
    autoDiscover: async (radius: number = 5, sectorOverride?: string): Promise<any[]> => {
        const apiKey = process.env.API_KEY; 
        if (!apiKey) throw new Error("Clé API manquante pour l'auto-découverte.");

        const org = await organizationService.get();
        if (!org || org.locations.length === 0) throw new Error("Aucun établissement configuré pour localiser la recherche.");

        const location = org.locations[0]; // On prend le premier établissement
        const industry = sectorOverride || org.industry || 'commerce';
        const city = location.city || 'Paris';

        const prompt = `
            Agis comme un expert en intelligence économique locale.
            Trouve 5 concurrents directs réalistes pour un établissement de type "${industry}" situé à "${city}" dans un rayon de ${radius}km.
            Pour chaque concurrent, invente des données plausibles basées sur le marché local.
            
            Calcul également le "threat_level" (niveau de menace) de 1 à 100, la distance estimée, et le revenu estimé mensuel.
            
            Retourne UNIQUEMENT un tableau JSON strict (pas de texte avant/après) avec cette structure :
            [
              {
                "name": "Nom du concurrent",
                "rating": 4.5 (nombre entre 3.0 et 5.0),
                "review_count": 150 (nombre entre 50 et 2000),
                "address": "Adresse approximative à ${city}",
                "strengths": ["Point fort 1", "Point fort 2"],
                "weaknesses": ["Faiblesse 1", "Faiblesse 2"],
                "threat_level": 85 (score calculé basé sur note+volume),
                "distance": "1.2 km",
                "estimated_revenue": "45k €/mois"
              }
            ]
        `;

        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });

            const text = response.text || "[]";
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const results = JSON.parse(cleanJson);
            return results;
        } catch (e: any) {
            console.error("Auto-discover error", e);
            throw new Error("Erreur IA lors de la découverte: " + e.message);
        }
    },
    // Nouvelle fonction pour simuler le rapport d'analyse approfondie
    getDeepAnalysis: async (): Promise<any> => {
        const apiKey = process.env.API_KEY;
        const comps = await competitorsService.list();
        const org = await organizationService.get();
        const industry = org?.industry || 'commerce';
        
        // Si aucun concurrent n'est suivi, on renvoie une structure vide ou un message
        if (comps.length === 0) {
             return {
                trends: ["Ajoutez des concurrents à votre liste pour générer une analyse de marché pertinente."],
                swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
                competitors_detailed: []
            };
        }

        const competitorsNames = comps.map(c => c.name).join(', ');

        const prompt = `
            Tu es un expert en stratégie d'entreprise spécialisé dans le secteur "${industry}".
            
            Voici une liste de concurrents que je surveille : ${competitorsNames}.
            
            Basé sur ta connaissance générale de ce secteur et de ces types d'établissements, génère une analyse de marché fictive mais réaliste pour simuler un rapport de veille concurrentielle.
            
            Format de réponse attendu (JSON uniquement) :
            {
                "trends": ["Tendance 1 (ex: hausse prix)", "Tendance 2", "Tendance 3"],
                "swot": {
                    "strengths": ["Force globale du marché"],
                    "weaknesses": ["Faiblesse courante"],
                    "opportunities": ["Opportunité à saisir"],
                    "threats": ["Menace externe"]
                },
                "competitors_detailed": [
                    {
                        "name": "${comps[0].name}", 
                        "sentiment_trend": "Positif" | "Stable" | "Négatif",
                        "last_month_growth": "+X%",
                        "top_complaint": "Sujet de plainte probable"
                    }
                    // ... répéter pour les autres concurrents si possible, sinon au moins un
                ]
            }
        `;

        try {
            if (!apiKey) throw new Error("Clé API manquante");
            
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });

            const text = response.text || "{}";
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(cleanJson);
            
            // Merge AI data with existing competitor objects to handle missing fields gracefully
            return {
                ...analysis,
                competitors_detailed: analysis.competitors_detailed.map((d: any) => {
                    const original = comps.find(c => c.name === d.name);
                    return { ...original, ...d };
                })
            };
        } catch (e) {
            console.error("Deep analysis error", e);
            // Fallback en cas d'erreur IA pour ne pas casser l'UI
            return {
                trends: ["Impossible de générer l'analyse IA pour le moment. Veuillez réessayer plus tard."],
                swot: { strengths: ["-"], weaknesses: ["-"], opportunities: ["-"], threats: ["-"] },
                competitors_detailed: comps.map(c => ({
                    ...c,
                    last_month_growth: "?",
                    sentiment_trend: "Inconnu",
                    top_complaint: "-"
                }))
            };
        }
    }
};

const billingService = {
    createCheckoutSession: async (plan: 'starter' | 'pro') => {
        const user = await authService.getUser();
        const email = user?.email || '';

        const linkStarter = import.meta.env.VITE_STRIPE_LINK_STARTER;
        const linkPro = import.meta.env.VITE_STRIPE_LINK_PRO;

        let url = plan === 'starter' ? linkStarter : linkPro;

        if (!url) {
            console.error(`Lien manquant pour le plan ${plan}. Vérifiez VITE_STRIPE_LINK_${plan.toUpperCase()}`);
            throw new Error("La configuration de paiement est incomplète. Veuillez contacter le support.");
        }

        if (email) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}prefilled_email=${encodeURIComponent(email)}`;
        }

        return url;
    },
    createPortalSession: async () => {
        return "https://billing.stripe.com/p/login/test"; 
    },
    getInvoices: async () => {
        return [
            { id: 'INV-001', date: '01/10/2023', amount: '49.00 €', status: 'Payé' },
            { id: 'INV-002', date: '01/11/2023', amount: '49.00 €', status: 'Payé' }
        ];
    }
};

// --- EXPORT GLOBAL API ---

export const api = {
    auth: authService,
    organization: organizationService,
    reviews: reviewsService,
    ai: aiService,
    automation: automationService,
    locations: locationsService,
    public: publicService,
    analytics: analyticsService,
    customers: customersService,
    admin: adminService,
    social: socialService,
    notifications: notificationsService,
    onboarding: onboardingService,
    activity: activityService,
    team: teamService,
    competitors: competitorsService,
    billing: billingService,
    seedCloudDatabase
};
