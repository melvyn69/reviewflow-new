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

const authService = {
    getUser: async (): Promise<User | null> => {
      if (isSupabaseConfigured()) {
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user) return null;
        const { data: profile } = await supabase!.from('users').select('*').eq('id', user.id).single();
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
            const { data, error } = await supabase!.auth.signUp({ email, password, options: { data: { full_name: name } } });
            if (error) throw error;
            return;
        }
        const newUser: User = { ...INITIAL_USERS[0], email, name, id: 'u_new' };
        localStorage.setItem('mock_user', JSON.stringify(newUser));
        return newUser;
    },
    logout: async () => {
        if (isSupabaseConfigured()) { await supabase!.auth.signOut(); }
        localStorage.removeItem('mock_user');
    },
    resetPassword: async (email: string) => {
        if (isSupabaseConfigured()) { await supabase!.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/#reset-callback' }); }
        return true;
    },
    loginWithGoogle: async () => {
        if (isSupabaseConfigured()) {
            const { error } = await supabase!.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin, queryParams: { access_type: 'offline', prompt: 'consent' } }
            });
            if (error) throw error;
        } else { throw new Error("Supabase not configured"); }
    }
};

const organizationService = {
      get: async (): Promise<Organization | null> => {
          if (isSupabaseConfigured()) {
              try {
                  const { data: { user } } = await supabase!.auth.getUser();
                  if (!user) return INITIAL_ORG;
                  const { data: profile } = await supabase!.from('users').select('organization_id').eq('id', user.id).single();
                  if (!profile?.organization_id) return INITIAL_ORG;
                  const { data: org, error } = await supabase!.from('organizations').select('*').eq('id', profile.organization_id).single();
                  if (error || !org) return INITIAL_ORG;
                  const { data: locations } = await supabase!.from('locations').select('*').eq('organization_id', profile.organization_id);
                  return { 
                      ...INITIAL_ORG, 
                      ...org, 
                      brand: org.brand || INITIAL_ORG.brand,
                      integrations: org.integrations || INITIAL_ORG.integrations,
                      saved_replies: org.saved_replies || INITIAL_ORG.saved_replies,
                      workflows: org.workflows || INITIAL_ORG.workflows || [], 
                      locations: locations || [] 
                  } as Organization;
              } catch (e) { return INITIAL_ORG; }
          }
          return INITIAL_ORG;
      },
      update: async (data: Partial<Organization>) => {
          if (isSupabaseConfigured()) {
              const user = await authService.getUser();
              if (user?.organization_id) {
                  await supabase!.from('organizations').update(data).eq('id', user.organization_id);
              }
          }
          Object.assign(INITIAL_ORG, data);
          return INITIAL_ORG;
      },
      initiateGoogleAuth: async (clientId: string) => { await new Promise(resolve => setTimeout(resolve, 1000)); return true; },
      toggleIntegration: async (provider: string, enabled: boolean) => { return true; },
      upgradePlan: async (plan: string) => { return true; }
};

const reviewsService = {
  list: async (filters: any): Promise<Review[]> => {
    if (isSupabaseConfigured()) {
      let query = supabase!
        .from('reviews')
        .select('*')
        .order('received_at', { ascending: false });

      if (filters.status && filters.status !== 'Tout') {
        query = query.eq('status', filters.status.toLowerCase());
      }
      if (filters.source && filters.source !== 'Tout') {
        query = query.eq('source', filters.source.toLowerCase());
      }
      if (filters.rating && filters.rating !== 'Tout') {
        query = query.eq('rating', parseInt(filters.rating, 10));
      }

      const { data, error } = await query;
      if (error || !data) return [];

      let result = (data || []).map((r: any) => ({
        ...r,
        internal_notes: r.internal_notes || [],
        analysis:
          r.analysis || {
            sentiment: 'neutral',
            themes: [],
            keywords: [],
            flags: {
              hygiene: false,
              discrimination: false,
              security: false,
              staff_conflict: false,
              pricing_issue: false,
            },
          },
      })) as Review[];

      if (filters.search) {
        const q = (filters.search as string).toLowerCase();
        result = result.filter(
          (r) =>
            r.body?.toLowerCase().includes(q) ||
            r.author_name?.toLowerCase().includes(q)
        );
      }

      return result;
    }

    // ---- Fallback : données mock quand Supabase n'est pas configuré ----
    let data = [...INITIAL_REVIEWS];

    if (filters.status && filters.status !== 'Tout') {
      data = data.filter(
        (r) => r.status === filters.status.toLowerCase()
      );
    }
    if (filters.source && filters.source !== 'Tout') {
      data = data.filter(
        (r) => r.source === filters.source.toLowerCase()
      );
    }
    if (filters.rating && filters.rating !== 'Tout') {
      const ratingInt = parseInt(filters.rating.toString(), 10);
      data = data.filter((r) => r.rating === ratingInt);
    }
    if (filters.search) {
      const q = (filters.search as string).toLowerCase();
      data = data.filter(
        (r) =>
          r.body.toLowerCase().includes(q) ||
          r.author_name.toLowerCase().includes(q)
      );
    }

    return data;
  },

  reply: async (id: string, text: string) => {
    if (isSupabaseConfigured()) {
      await supabase!
        .from('reviews')
        .update({
          status: 'sent',
          posted_reply: text,
          replied_at: new Date().toISOString(),
        })
        .eq('id', id);
    }
    return true;
  },

  saveDraft: async (id: string, text: string) => {
    if (isSupabaseConfigured()) {
      await supabase!
        .from('reviews')
        .update({
          status: 'draft',
          ai_reply: {
            text,
            needs_manual_validation: false,
            created_at: new Date().toISOString(),
          },
        })
        .eq('id', id);
    }
    return true;
  },

  updateStatus: async (id: string, status: ReviewStatus) => {
    if (isSupabaseConfigured()) {
      await supabase!
        .from('reviews')
        .update({ status })
        .eq('id', id);
    }
    return true;
  },

  addNote: async (id: string, text: string) => {
    const newNote = {
      id: `n-${Date.now()}`,
      text,
      author_name: 'Me',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { data: review } = await supabase!
        .from('reviews')
        .select('internal_notes')
        .eq('id', id)
        .single();

      const notes = review?.internal_notes || [];
      await supabase!
        .from('reviews')
        .update({ internal_notes: [...notes, newNote] })
        .eq('id', id);
    }

    return newNote;
  },

  importBulk: async (data: any[], locationId: string) => {
    if (isSupabaseConfigured()) {
      const formattedData = data.map((r) => ({
        location_id: locationId,
        source: r.source?.toLowerCase() || 'google',
        rating: parseInt(r.rating, 10) || 5,
        author_name: r.author_name || 'Anonyme',
        body: r.text || '',
        language: 'fr',
        received_at: r.date
          ? new Date(r.date).toISOString()
          : new Date().toISOString(),
        status: 'pending',
        analysis: {
          sentiment: 'neutral',
          themes: [],
          keywords: [],
          flags: {
            hygiene: false,
            discrimination: false,
            security: false,
            staff_conflict: false,
            pricing_issue: false,
          },
        },
      }));

      const { error } = await supabase!
        .from('reviews')
        .insert(formattedData);

      if (error) throw error;
    }

    return data.length;
  },
};

const aiService = {
      generateReply: async (review: Review, options: any) => {
          const apiKey = import.meta.env.VITE_API_KEY;
          
          if (!apiKey) {
             throw new Error("ERREUR CONFIG: Clé API manquante. Ajoutez VITE_API_KEY dans Vercel.");
          }

          try {
              const org = await organizationService.get(); 
              const usage = org?.ai_usage_count || 0;
              const limit = org?.subscription_plan === 'free' ? 3 : org?.subscription_plan === 'starter' ? 100 : 300;
              
              if (usage >= limit) {
                  throw new Error("Limite d'utilisation atteinte. Passez au plan supérieur.");
              }

              const genAI = new GoogleGenerativeAI(apiKey);
              const brand: BrandSettings = org?.brand || { tone: 'professionnel', description: '', knowledge_base: '', use_emojis: false, language_style: 'formal', signature: '' };
              const industry = org?.industry || 'other';
              const knowledgeBaseContext = brand.knowledge_base ? `\n\n[BASE DE CONNAISSANCE]:\n${brand.knowledge_base}` : '';

              const prompt = `
                Rôle: Expert Relation Client pour une entreprise de type "${industry}".
                [IDENTITÉ MARQUE]
                - Ton: ${options.tone || brand.tone}
                - Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}
                - Emojis: ${brand.use_emojis ? 'Oui' : 'Non'}
                ${knowledgeBaseContext}

                TACHE: Rédige une réponse empathique et personnalisée à cet avis.
                Avis client (${review.rating}/5) de ${review.author_name}: "${review.body}"
                Réponse (texte seul, pas de guillemets):
              `;

              // Stratégie de modèle : 2.5 Flash -> 3 Pro -> 1.5 Flash
              const models = ["gemini-2.5-flash", "gemini-3-pro", "gemini-1.5-flash"];
              
              for (const modelName of models) {
                  try {
                      console.log(`Essai modèle: ${modelName}...`);
                      const model = genAI.getGenerativeModel({ model: modelName });
                      const result = await model.generateContent(prompt);
                      const text = result.response.text();
                      if (text) return text;
                  } catch (err: any) {
                      console.warn(`Echec ${modelName}:`, err.message);
                      if (modelName === models[models.length - 1]) throw err;
                  }
              }
              
              throw new Error("Tous les modèles IA ont échoué.");

          } catch (e: any) {
              console.error("ERREUR IA FINALE:", e);
              if (e.message?.includes('403') || e.message?.includes('API key')) throw new Error("Clé API invalide.");
              if (e.message?.includes('429')) throw new Error("Quota Google dépassé.");
              throw new Error(`Erreur IA: ${e.message}`);
          }
      },
      generateSocialPost: async (review: Review, platform: 'instagram' | 'linkedin') => {
          const apiKey = import.meta.env.VITE_API_KEY;
          if (!apiKey) throw new Error("Clé API manquante");

          const genAI = new GoogleGenerativeAI(apiKey);
          const prompt = `Crée un post ${platform} pour cet avis : "${review.body}" (${review.rating}/5). Ajoute emojis et hashtags.`;
          
          const models = ["gemini-2.5-flash", "gemini-3-pro", "gemini-1.5-flash"];
          for (const modelName of models) {
              try {
                  const model = genAI.getGenerativeModel({ model: modelName });
                  const result = await model.generateContent(prompt);
                  return result.response.text();
              } catch (e) { continue; }
          }
          return "Erreur génération post.";
      },
      runCustomTask: async (payload: any) => {
          const apiKey = import.meta.env.VITE_API_KEY;
          if (!apiKey) throw new Error("Clé API manquante");

          const genAI = new GoogleGenerativeAI(apiKey);
          const prompt = JSON.stringify(payload);

          const models = ["gemini-2.5-flash", "gemini-3-pro", "gemini-1.5-flash"];
          for (const modelName of models) {
              try {
                  const model = genAI.getGenerativeModel({ model: modelName });
                  const result = await model.generateContent(prompt);
                  return JSON.parse(result.response.text());
              } catch (e) { continue; }
          }
          throw new Error("Erreur Custom Task");
      }
};

const socialService = {
    connect: async (platform: string) => true,
    publish: async (platform: string, content: string) => true
};

const automationService = {
      getWorkflows: async (): Promise<WorkflowRule[]> => {
          const org = await organizationService.get();
          if (org && (org as any).workflows) {
              return (org as any).workflows;
          }
          return INITIAL_WORKFLOWS;
      },
      create: async (workflow: WorkflowRule) => {
          if (isSupabaseConfigured()) {
             const org = await organizationService.get();
             if (org) {
                 const currentWorkflows = (org as any).workflows || [];
                 const newWorkflows = [...currentWorkflows, workflow];
                 await supabase!.from('organizations').update({ workflows: newWorkflows }).eq('id', org.id);
                 return true;
             }
          }
          INITIAL_WORKFLOWS.push(workflow);
          return true;
      },
      run: async () => {
          if (!isSupabaseConfigured()) {
               return { processed: 0, actions: 0, alerts: 0 };
          }
          
          const { data: pendingReviews } = await supabase!.from('reviews').select('*').eq('status', 'pending');
          if (!pendingReviews || pendingReviews.length === 0) return { processed: 0, actions: 0, alerts: 0 };
          
          const rules = await automationService.getWorkflows();
          let actionCount = 0;
          let alertCount = 0;

          const org = await organizationService.get(); 
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
                               
                               let replyText = "";
                               try {
                                   replyText = await aiService.generateReply(review as Review, { tone: 'professional', length: 'medium' });
                               } catch (e) {
                                   replyText = "Erreur génération IA.";
                               }

                               await supabase!.from('reviews').update({ 
                                  status: 'draft',
                                  ai_reply: { 
                                      text: replyText, 
                                      needs_manual_validation: true, 
                                      created_at: new Date().toISOString() 
                                  }
                               }).eq('id', review.id);
                               actionCount++;
                           }
                           if (action.type === 'publish_social') {
                               const postContent = await aiService.generateSocialPost(review as Review, action.config.platform || 'instagram'); 
                               await socialService.publish(action.config.platform || 'instagram', postContent); 
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
                saved_replies: INITIAL_ORG.saved_replies || [],
                workflows: []
            })
            .select()
            .single();
            
          if (orgError) {
              console.error("Erreur Création Org:", JSON.stringify(orgError));
              throw new Error(`Erreur SQL Org: ${orgError.message}.`);
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

const locationsService = {
    create: async (data: any) => ({ id: 'new' })
};

const publicService = {
    getLocationInfo: async (id: string) => {
        if (isSupabaseConfigured()) {
            try {
                const { data, error } = await supabase!.from('locations').select('*').eq('id', id).single();
                if (!error && data) return { name: data.name, city: data.city, googleUrl: data.google_review_url || '#' };
            } catch (e) { console.warn("Fallback public"); }
        }
        return { name: "Notre Établissement", city: "Paris", googleUrl: "#" };
    },
    submitFeedback: async (locationId: string, rating: number, feedback: string, contact: string) => {
        console.log("Feedback:", { locationId, rating, feedback });
        if (isSupabaseConfigured()) {
            try {
                const newReview = {
                    location_id: locationId,
                    rating: rating,
                    text: feedback,
                    author_name: contact || 'Client Anonyme',
                    source: 'direct',
                    status: 'pending',
                    received_at: new Date().toISOString(),
                    language: 'fr',
                    analysis: { sentiment: 'neutral', themes: [], keywords: [], flags: {} },
                    ai_reply: null,
                    internal_notes: [{ text: `Feedback direct (Funnel): ${feedback}`, author_name: 'Système', created_at: new Date().toISOString() }]
                };
                const { error } = await supabase!.from('reviews').insert(newReview);
                if (error) throw error;
            } catch (e) {
                console.error("Erreur Supabase Feedback:", e);
            }
        }
        return true;
    }
};

const customersService = {
    list: async (): Promise<Customer[]> => {
        return [];
    }
};

const adminService = {
    getStats: async () => ({ mrr: "0", active_tenants: 0, total_reviews_processed: 0, tenants: [] })
};

export const api = {
  auth: authService,
  reviews: reviewsService,
  organization: organizationService,
  ai: aiService,
  social: socialService,
  automation: automationService,
  seedCloudDatabase,
  analytics: { getOverview: async (period?: string) => INITIAL_ANALYTICS },
  competitors: { list: async () => INITIAL_COMPETITORS, add: async (data: any) => INITIAL_COMPETITORS[0] },
  notifications: { list: async () => [], markAllRead: async () => true },
  locations: locationsService,
  team: { list: async () => INITIAL_USERS, invite: async (email: string, role: string) => true, remove: async (id: string) => true },
  billing: { 
      getInvoices: async () => [], 
      downloadInvoice: (id: string) => {}, 
      createCheckoutSession: async (plan: string) => {
          const links: Record<string, string> = { 'starter': 'https://buy.stripe.com/test_starter_link', 'pro': 'https://buy.stripe.com/test_pro_link' };
          return links[plan] || "https://stripe.com";
      },
      createPortalSession: async () => "https://billing.stripe.com" 
  },
  onboarding: { checkStatus: async () => ({ googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 }) },
  activity: { getRecent: async () => [] },
  public: publicService,
  customers: customersService,
  admin: adminService
};