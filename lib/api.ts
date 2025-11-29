import { supabase, isSupabaseConfigured } from './supabase';
import { 
  INITIAL_USERS, 
  INITIAL_ORG, 
  INITIAL_REVIEWS, 
  INITIAL_ANALYTICS, 
  INITIAL_WORKFLOWS,
  INITIAL_COMPETITORS
} from './db';
import { 
  User, 
  Review, 
  Organization, 
  AnalyticsSummary, 
  WorkflowRule, 
  ReviewStatus,
  Location,
  Competitor,
  AppNotification,
  BrandSettings,
  Customer
} from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper
const evaluateCondition = (review: Review, condition: any): boolean => {
  const { field, operator, value } = condition;
  const reviewValue = (review as any)[field];

  switch (operator) {
    case 'equals': return reviewValue == value;
    case 'contains': return typeof reviewValue === 'string' && reviewValue.includes(value);
    case 'gte': return reviewValue >= value;
    case 'lte': return reviewValue <= value;
    case 'in': return Array.isArray(value) && value.includes(reviewValue);
    default: return false;
  }
};

// --- Services Definition ---

const authService = {
    getUser: async (): Promise<User | null> => {
      if (isSupabaseConfigured()) {
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user) return null;
        
        // Try to get role/org from public.users table
        const { data: profile } = await supabase!
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata.full_name || 'User',
          avatar: user.user_metadata.avatar_url,
          role: profile?.role || 'admin',
          organizations: profile?.organization_id ? [profile.organization_id] : [],
          organization_id: profile?.organization_id
        };
      }
      const mockUser = localStorage.getItem('mock_user');
      return mockUser ? JSON.parse(mockUser) : null;
    },
    login: async (email: string, password: string) => {
      if (isSupabaseConfigured()) {
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return;
      }
      const user = INITIAL_USERS.find(u => u.email === email && u.password === password);
      if (user) {
        localStorage.setItem('mock_user', JSON.stringify(user));
        return user;
      }
      throw new Error("Invalid credentials (Mock)");
    },
    register: async (name: string, email: string, password: string) => {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase!.auth.signUp({ 
                email, 
                password,
                options: { data: { full_name: name } }
            });
            if (error) throw error;
            return;
        }
        const newUser: User = { ...INITIAL_USERS[0], email, name, id: 'u_new' };
        localStorage.setItem('mock_user', JSON.stringify(newUser));
        return newUser;
    },
    logout: async () => {
        if (isSupabaseConfigured()) {
            await supabase!.auth.signOut();
        }
        localStorage.removeItem('mock_user');
    },
    resetPassword: async (email: string) => {
        if (isSupabaseConfigured()) {
            await supabase!.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/#reset-callback'
            });
        }
        return true;
    },
    loginWithGoogle: async () => {
        if (isSupabaseConfigured()) {
            const { error } = await supabase!.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                }
            });
            if (error) throw error;
        } else {
            throw new Error("Supabase not configured for OAuth");
        }
    }
};

const reviewsService = {
      list: async (filters: any): Promise<Review[]> => {
          if (isSupabaseConfigured()) {
              let query = supabase!.from('reviews').select('*').order('received_at', { ascending: false });
              
              if (filters.status && filters.status !== 'Tout') query = query.eq('status', filters.status.toLowerCase());
              if (filters.source && filters.source !== 'Tout') query = query.eq('source', filters.source.toLowerCase());
              if (filters.rating && filters.rating !== 'Tout') query = query.eq('rating', parseInt(filters.rating));
              
              const { data, error } = await query;
              if (error) {
                  console.error(error);
                  return [];
              }
              
              let result = (data || []).map((r: any) => ({
                  ...r,
                  internal_notes: r.internal_notes || [],
                  analysis: r.analysis || { sentiment: 'neutral', themes: [], keywords: [], flags: {} }
              })) as Review[];
              
              if (filters.search) {
                  const q = filters.search.toLowerCase();
                  result = result.filter(r => 
                      r.body?.toLowerCase().includes(q) || 
                      r.author_name?.toLowerCase().includes(q)
                  );
              }
              return result;
          }
          let data = [...INITIAL_REVIEWS];
          if (filters.status && filters.status !== 'Tout') data = data.filter(r => r.status === filters.status.toLowerCase());
          if (filters.source && filters.source !== 'Tout') data = data.filter(r => r.source === filters.source.toLowerCase());
          if (filters.rating && filters.rating !== 'Tout') data = data.filter(r => r.rating === parseInt(filters.rating.toString()[0]));
          if (filters.search) {
              const q = filters.search.toLowerCase();
              data = data.filter(r => r.body.toLowerCase().includes(q) || r.author_name.toLowerCase().includes(q));
          }
          return data;
      },
      reply: async (id: string, text: string) => {
          if (isSupabaseConfigured()) {
              await supabase!.from('reviews').update({
                  status: 'sent',
                  posted_reply: text,
                  replied_at: new Date().toISOString()
              }).eq('id', id);
              return true;
          }
          console.log(`Replied to ${id}: ${text}`);
          return true;
      },
      saveDraft: async (id: string, text: string) => {
          if (isSupabaseConfigured()) {
              await supabase!.from('reviews').update({
                  status: 'draft',
                  ai_reply: { text: text, needs_manual_validation: false, created_at: new Date().toISOString() } 
              }).eq('id', id);
              return true;
          }
          console.log(`Draft saved for ${id}: ${text}`);
          return true;
      },
      updateStatus: async (id: string, status: ReviewStatus) => {
          if (isSupabaseConfigured()) {
              await supabase!.from('reviews').update({ status }).eq('id', id);
              return true;
          }
          return true;
      },
      addNote: async (id: string, text: string) => {
          const newNote = {
              id: `n-${Date.now()}`,
              text,
              author_name: 'Me', 
              created_at: new Date().toISOString()
          };
          
          if (isSupabaseConfigured()) {
              const { data: review } = await supabase!.from('reviews').select('internal_notes').eq('id', id).single();
              const notes = review?.internal_notes || [];
              const updatedNotes = [...notes, newNote];
              
              await supabase!.from('reviews').update({
                  internal_notes: updatedNotes
              }).eq('id', id);
          }
          return newNote;
      },
      importBulk: async (data: any[], locationId: string) => {
          if (isSupabaseConfigured()) {
              const formattedData = data.map(r => ({
                  location_id: locationId,
                  source: r.source?.toLowerCase() || 'google',
                  rating: parseInt(r.rating) || 5,
                  author_name: r.author_name || 'Anonyme',
                  body: r.text || '',
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
              
              const { error } = await supabase!.from('reviews').insert(formattedData);
              if (error) throw error;
              return data.length;
          }
          return data.length;
      }
};

const organizationService = {
      get: async (): Promise<Organization | null> => {
          if (isSupabaseConfigured()) {
              try {
                  const { data: { user } } = await supabase!.auth.getUser();
                  if (!user) return INITIAL_ORG;
                  
                  const { data: profile } = await supabase!.from('users').select('organization_id').eq('id', user.id).single();
                  
                  if (!profile?.organization_id) {
                      return INITIAL_ORG;
                  }
                  
                  const { data: org, error } = await supabase!.from('organizations').select('*').eq('id', profile.organization_id).single();
                  
                  if (error || !org) {
                      return INITIAL_ORG;
                  }

                  const { data: locations } = await supabase!.from('locations').select('*').eq('organization_id', profile.organization_id);
                  
                  return {
                      ...INITIAL_ORG,
                      ...org,
                      locations: locations || []
                  } as Organization;
              } catch (e) {
                  return INITIAL_ORG;
              }
          }
          return INITIAL_ORG;
      },
      update: async (data: Partial<Organization>) => {
          if (isSupabaseConfigured()) {
              const user = await authService.getUser();
              if (user?.organization_id) {
                  await supabase!.from('organizations').update(data).eq('id', user.organization_id);
              }
              Object.assign(INITIAL_ORG, data);
              return INITIAL_ORG;
          }
          Object.assign(INITIAL_ORG, data);
          return INITIAL_ORG;
      },
      initiateGoogleAuth: async (clientId: string) => { await new Promise(resolve => setTimeout(resolve, 1000)); return true; },
      toggleIntegration: async (provider: string, enabled: boolean) => { return true; },
      upgradePlan: async (plan: string) => { return true; }
};

const aiService = {
      generateReply: async (review: Review, options: any) => {
          const apiKey = import.meta.env.VITE_API_KEY;
          
          // Log de débogage (visible dans la console du navigateur)
          console.log("Tentative génération IA. Clé présente:", !!apiKey);

          if (!apiKey) {
             throw new Error("ERREUR CONFIGURATION: Clé API manquante. Ajoutez VITE_API_KEY dans Vercel.");
          }

          try {
              const org = await organizationService.get(); // Use internal service reference
              const usage = org?.ai_usage_count || 0;
              const limit = org?.subscription_plan === 'free' ? 3 : org?.subscription_plan === 'starter' ? 100 : 300;
              
              if (usage >= limit) {
                  throw new Error("Limite d'utilisation atteinte. Passez au plan supérieur.");
              }

              const genAI = new GoogleGenerativeAI(apiKey);
              // Utilisation du modèle flash (plus rapide et fiable)
              const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

              const brand: BrandSettings = org?.brand || { 
                tone: 'professionnel', 
                description: '', 
                knowledge_base: '',
                use_emojis: false,
                language_style: 'formal',
                signature: ''
              };
              const industry = org?.industry || 'other';

              const knowledgeBaseContext = brand.knowledge_base 
                ? `\n\n[BASE DE CONNAISSANCE]:\n${brand.knowledge_base}`
                : '';

              const prompt = `
                Rôle: Expert Relation Client pour une entreprise de type "${industry}".
                
                [IDENTITÉ MARQUE]
                - Ton: ${options.tone || brand.tone}
                - Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}
                - Emojis: ${brand.use_emojis ? 'Oui' : 'Non'}
                ${knowledgeBaseContext}

                TACHE: Rédige une réponse empathique et personnalisée à cet avis.
                Ne mets pas de guillemets. Sois concis.

                Avis client (${review.rating}/5) de ${review.author_name}: "${review.body}"
              `;

              const result = await model.generateContent(prompt);
              const response = await result.response;
              const text = response.text();
              
              if (!text) throw new Error("Réponse vide de l'IA.");

              return text;

          } catch (e: any) {
              console.error("ERREUR IA:", e);
              if (e.message?.includes('404')) throw new Error("Modèle IA indisponible. Contactez le support.");
              if (e.message?.includes('403') || e.message?.includes('API key')) throw new Error("Clé API invalide.");
              throw new Error(`Erreur IA: ${e.message}`);
          }
      },
      generateSocialPost: async (review: Review, platform: 'instagram' | 'linkedin') => {
          const apiKey = import.meta.env.VITE_API_KEY;
          if (!apiKey) throw new Error("Clé API manquante");

          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

          const prompt = `Crée un post ${platform} pour cet avis : "${review.body}" (${review.rating}/5). Ajoute emojis et hashtags.`;
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
      },
      runCustomTask: async (payload: any) => {
          const apiKey = import.meta.env.VITE_API_KEY;
          if (!apiKey) throw new Error("Clé API manquante");

          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
          
          const result = await model.generateContent(JSON.stringify(payload));
          const response = await result.response;
          return JSON.parse(response.text());
      }
};

const socialService = {
      connect: async (platform: 'instagram' | 'facebook') => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          if (isSupabaseConfigured()) {
              const org = await organizationService.get(); // Use internal service reference
              if (org) {
                  const integrations = org.integrations || { google: false, facebook: false, instagram_posting: false, facebook_posting: false };
                  const key = platform === 'instagram' ? 'instagram_posting' : 'facebook_posting';
                  (integrations as any)[key] = true;
                  await organizationService.update({ integrations }); // Use internal service reference
              }
          } else {
              const key = platform === 'instagram' ? 'instagram_posting' : 'facebook_posting';
              (INITIAL_ORG.integrations as any)[key] = true;
          }
          return true;
      },
      publish: async (platform: 'instagram' | 'facebook' | 'linkedin', content: string) => {
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log(`[SOCIAL] Published to ${platform}:`, content);
          return true;
      }
};

const automationService = {
      getWorkflows: async (): Promise<WorkflowRule[]> => {
          return INITIAL_WORKFLOWS;
      },
      create: async (workflow: any) => {
          return true;
      },
      run: async () => {
          if (!isSupabaseConfigured()) {
               const pendingReviews = INITIAL_REVIEWS.filter(r => r.status === 'pending');
               return { processed: pendingReviews.length, actions: 0, alerts: 0 };
          }
          
          const { data: pendingReviews } = await supabase!.from('reviews').select('*').eq('status', 'pending');
          if (!pendingReviews || pendingReviews.length === 0) return { processed: 0, actions: 0, alerts: 0 };
          
          const rules = INITIAL_WORKFLOWS; 
          let actionCount = 0;
          let alertCount = 0;

          const org = await organizationService.get(); // Use internal service reference
          const alertThreshold = org?.notification_settings?.alert_threshold || 3;
          const emailAlerts = org?.notification_settings?.email_alerts || false;

          for (const review of pendingReviews) {
              if (emailAlerts && review.rating <= alertThreshold) {
                  alertCount++;
              }
              for (const rule of rules) {
                  if (rule.enabled && rule.conditions.every(c => evaluateCondition(review as Review, c))) {
                       for (const action of rule.actions) {
                           if (action.type === 'generate_ai_reply' || action.type === 'auto_reply') {
                               await supabase!.from('reviews').update({ 
                                  status: 'draft',
                                  ai_reply: { text: "Réponse automatique générée...", needs_manual_validation: true, created_at: new Date().toISOString() }
                               }).eq('id', review.id);
                               actionCount++;
                           }
                           if (action.type === 'publish_social') {
                               const postContent = await aiService.generateSocialPost(review as Review, action.config.platform || 'instagram'); // Use internal service reference
                               await socialService.publish(action.config.platform || 'instagram', postContent); // Use internal service reference
                               actionCount++;
                           }
                       }
                  }
              }
          }
          return { processed: pendingReviews.length, actions: actionCount, alerts: alertCount };
      }
};

const seedCloudDatabase = async () => {
      if (!isSupabaseConfigured()) throw new Error("Supabase non connecté");
      
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) throw new Error("Vous devez être connecté pour injecter les données.");

      try {
          console.log("1. Démarrage de l'injection...");

          const { data: org, error: orgError } = await supabase!
            .from('organizations')
            .insert({ 
                name: 'Mon Organisation Démo',
                subscription_plan: 'pro',
                ai_usage_count: 12,
                industry: 'restaurant',
                integrations: INITIAL_ORG.integrations,
                brand: INITIAL_ORG.brand,
                notification_settings: INITIAL_ORG.notification_settings,
                saved_replies: INITIAL_ORG.saved_replies || []
            })
            .select()
            .single();
            
          if (orgError) {
              console.error("Erreur Création Org:", JSON.stringify(orgError));
              throw new Error(`Erreur SQL Org: ${orgError.message}. Avez-vous exécuté le script SQL dans Supabase ?`);
          }
          const orgId = org.id;
          
          const { error: userError } = await supabase!.from('users').upsert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || 'Admin',
              role: 'admin',
              organization_id: orgId
          });

          if (userError) {
              console.error("Erreur Liaison User:", JSON.stringify(userError));
              throw new Error(`Impossible de lier votre utilisateur: ${userError.message}`);
          }
          
          const { data: locs, error: locError } = await supabase!.from('locations').insert([
              { organization_id: orgId, name: "Boutique Paris Centre", city: "Paris", country: "France", connection_status: "connected", platform_rating: 4.8 },
              { organization_id: orgId, name: "Atelier Lyon", city: "Lyon", country: "France", connection_status: "disconnected", platform_rating: 4.2 }
          ]).select();
          
          if (locError) {
              console.error("Erreur Locations:", JSON.stringify(locError));
              throw locError;
          }
          
          const locId = locs[0].id;
          const reviewsPayload = INITIAL_REVIEWS.map(r => ({
              location_id: locId,
              source: r.source,
              rating: r.rating,
              author_name: r.author_name,
              text: r.body || "",
              language: r.language || "fr",
              received_at: r.received_at,
              status: r.status,
              analysis: r.analysis || null,
              ai_reply: r.ai_reply || null,
              internal_notes: r.internal_notes || [],
              posted_reply: r.posted_reply || null,
              replied_at: r.replied_at || null
          }));
          
          const { error: revError } = await supabase!.from('reviews').insert(reviewsPayload);
          if (revError) {
              console.error("Erreur Reviews:", JSON.stringify(revError));
              throw new Error(`Erreur Reviews: ${revError.message}`);
          }

          const competitorsPayload = INITIAL_COMPETITORS.map(c => ({
              organization_id: orgId,
              name: c.name,
              address: c.address,
              rating: c.rating,
              review_count: c.review_count,
              strengths: c.strengths || [],
              weaknesses: c.weaknesses || []
          }));
          
          await supabase!.from('competitors').insert(competitorsPayload);
          
          console.log("Injection terminée.");
          window.location.reload();
          return true;

      } catch (e: any) {
          console.error("Erreur Fatale Injection:", e);
          throw e;
      }
};

// Main API Export
export const api = {
  auth: authService,
  reviews: reviewsService,
  organization: organizationService,
  ai: aiService,
  social: socialService,
  automation: automationService,
  seedCloudDatabase: seedCloudDatabase,
  
  analytics: {
      getOverview: async (period?: string): Promise<AnalyticsSummary> => {
          if (isSupabaseConfigured()) {
              const { count } = await supabase!.from('reviews').select('*', { count: 'exact', head: true });
              return {
                  ...INITIAL_ANALYTICS,
                  total_reviews: count || 0
              };
          }
          return INITIAL_ANALYTICS;
      }
  },

  competitors: {
      list: async (): Promise<Competitor[]> => {
          if (isSupabaseConfigured()) {
              try {
                  const { data, error } = await supabase!.from('competitors').select('*');
                  if (error) return INITIAL_COMPETITORS;
                  return data && data.length > 0 ? data : INITIAL_COMPETITORS;
              } catch (e) {
                  return INITIAL_COMPETITORS;
              }
          }
          return INITIAL_COMPETITORS;
      },
      add: async (data: Omit<Competitor, 'id'>) => {
          if (isSupabaseConfigured()) {
              const user = await authService.getUser(); // Use service directly
              if (user?.organization_id) {
                  const { data: comp } = await supabase!.from('competitors').insert({
                      ...data,
                      organization_id: user.organization_id
                  }).select().single();
                  return comp;
              }
          }
          const newComp = { ...data, id: `comp-${Date.now()}` };
          INITIAL_COMPETITORS.push(newComp);
          return newComp;
      }
  },

  notifications: {
      list: async (): Promise<AppNotification[]> => {
          return [
              { id: 'n1', type: 'info', title: 'Rapport mensuel disponible', message: 'Votre rapport est prêt.', created_at: new Date().toISOString(), read: false, link: '/reports' }
          ];
      },
      markAllRead: async () => { return true; }
  },

  locations: {
      create: async (data: any) => {
          if (isSupabaseConfigured()) {
              const user = await authService.getUser(); // Use service directly
              if (user?.organization_id) {
                  const { data: loc, error } = await supabase!.from('locations').insert({
                      ...data,
                      organization_id: user.organization_id,
                      connection_status: 'disconnected'
                  }).select().single();
                  if (error) throw error;
                  return loc;
              }
          }
          return { ...data, id: 'loc-new' };
      }
  },
  team: {
      list: async (): Promise<User[]> => { return INITIAL_USERS; },
      invite: async (email: string, role: string) => { return true; },
      remove: async (userId: string) => { return true; }
  },
  billing: {
      getInvoices: async () => { return []; },
      downloadInvoice: (id: string) => { alert("Téléchargement"); },
      createCheckoutSession: async (plan: string) => { return "https://stripe.com"; },
      createPortalSession: async () => { return "https://stripe.com"; }
  },
  onboarding: {
      checkStatus: async () => { return { googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 }; }
  },
  activity: {
      getRecent: async () => { return []; }
  },

  public: {
      getLocationInfo: async (locationId: string) => {
          if (isSupabaseConfigured()) {
              try {
                  const { data, error } = await supabase!.from('locations').select('*').eq('id', locationId).single();
                  if (!error && data) {
                      return { name: data.name, city: data.city, googleUrl: data.google_review_url || '#' };
                  }
              } catch (e) {
                  console.warn("Using fallback for public location info");
              }
          }
          return INITIAL_ORG.locations.find(l => l.id === locationId) || { name: "Notre Établissement", city: "Paris", googleUrl: "#" };
      },
      submitFeedback: async (locationId: string, rating: number, feedback: string, contact: string) => {
          console.log("Feedback:", { locationId, rating, feedback });
          if (isSupabaseConfigured()) {
              try {
                  await supabase!.from('reviews').insert({
                      location_id: locationId,
                      rating,
                      text: feedback,
                      author_name: contact || 'Client Anonyme',
                      source: 'direct',
                      status: 'pending',
                      received_at: new Date().toISOString(),
                      language: 'fr',
                      internal_notes: [{
                          text: `Feedback direct (Funnel): ${feedback}`,
                          author_name: 'Système',
                          created_at: new Date().toISOString()
                      }]
                  });
              } catch (e) {
                  console.warn("Could not save to DB (RLS?), saving locally only.");
              }
          }
          return true;
      }
  },
  customers: {
      list: async () => { return []; }
  },
  admin: {
      getStats: async () => { return { mrr: "0", active_tenants: 0, total_reviews_processed: 0, tenants: [] }; }
  }
};