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
import { GoogleGenAI } from '@google/genai';

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

export const api = {
  auth: {
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
  },

  reviews: {
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
              
              // Ensure result is an array and robust against missing fields
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
  },

  ai: {
      generateReply: async (review: Review, options: any) => {
          const org = await api.organization.get();
          const usage = org?.ai_usage_count || 0;
          const limit = org?.subscription_plan === 'free' ? 3 : org?.subscription_plan === 'starter' ? 100 : 300;
          
          if (usage >= limit) {
              throw new Error('LIMIT_REACHED');
          }

          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

          const systemPrompt = `
            Tu es un expert en relation client pour une entreprise de type "${industry}".
            
            [IDENTITÉ]
            - Ton: ${options.tone || brand.tone}
            - Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}
            - Emojis: ${brand.use_emojis ? 'Oui' : 'Non'}
            ${knowledgeBaseContext}

            Rédige une réponse empathique, sans être robotique.
            Longueur: ${options.length || 'medium'}.
            Langue: Français.
          `;

          const userPrompt = `
            Avis client (${review.rating}/5) de ${review.author_name}: "${review.body}"
          `;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
            ]
          });

          // Increment usage
          if (isSupabaseConfigured() && org) {
              await supabase!.from('organizations').update({ ai_usage_count: usage + 1 }).eq('id', org.id);
          } else {
              if (org) org.ai_usage_count = usage + 1;
          }

          return response.text;
      },
      generateSocialPost: async (review: Review, platform: 'instagram' | 'linkedin') => {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            Transforme cet avis client positif en un post pour les réseaux sociaux (${platform}).
            
            Avis: "${review.body}" par ${review.author_name} (${review.rating}/5).
            
            Le but est de remercier le client et de montrer notre qualité de service.
            Utilise des emojis et des hashtags pertinents.
            Ton: Enthousiaste et reconnaissant.
            
            Format: Texte complet du post uniquement.
          `;
          
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [{ role: 'user', parts: [{ text: prompt }] }]
          });
          
          return response.text;
      },
      runCustomTask: async (payload: any) => {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: JSON.stringify(payload),
              config: { responseMimeType: 'application/json' }
          });
          return JSON.parse(response.text);
      }
  },

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
                  if (error) {
                      // Silent fallback if table doesn't exist yet
                      return INITIAL_COMPETITORS;
                  }
                  return data && data.length > 0 ? data : INITIAL_COMPETITORS;
              } catch (e) {
                  return INITIAL_COMPETITORS;
              }
          }
          return INITIAL_COMPETITORS;
      },
      add: async (data: Omit<Competitor, 'id'>) => {
          if (isSupabaseConfigured()) {
              const user = await api.auth.getUser();
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

  social: {
      connect: async (platform: 'instagram' | 'facebook') => {
          // Simulate OAuth flow
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          if (isSupabaseConfigured()) {
              const org = await api.organization.get();
              if (org) {
                  const integrations = org.integrations || { google: false, facebook: false, instagram_posting: false, facebook_posting: false };
                  const key = platform === 'instagram' ? 'instagram_posting' : 'facebook_posting';
                  (integrations as any)[key] = true;
                  await api.organization.update({ integrations });
              }
          } else {
              const key = platform === 'instagram' ? 'instagram_posting' : 'facebook_posting';
              (INITIAL_ORG.integrations as any)[key] = true;
          }
          return true;
      },
      publish: async (platform: 'instagram' | 'facebook' | 'linkedin', content: string) => {
          // Simulate API call to Meta Graph API
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log(`[SOCIAL] Published to ${platform}:`, content);
          return true;
      }
  },
  automation: {
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

          const org = await api.organization.get();
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
                               const postContent = await api.ai.generateSocialPost(review as Review, action.config.platform || 'instagram');
                               await api.social.publish(action.config.platform || 'instagram', postContent);
                               actionCount++;
                           }
                       }
                  }
              }
          }
          return { processed: pendingReviews.length, actions: actionCount, alerts: alertCount };
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
  organization: {
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
              const user = await api.auth.getUser();
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
  },
  locations: {
      create: async (data: any) => {
          if (isSupabaseConfigured()) {
              const user = await api.auth.getUser();
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

  seedCloudDatabase: async () => {
      if (!isSupabaseConfigured()) throw new Error("Supabase non connecté");
      
      const user = await api.auth.getUser();
      if (!user) throw new Error("Vous devez être connecté pour injecter les données.");

      let orgId = user.organization_id;
      
      try {
          // 1. Check/Create Organization
          if (!orgId) {
              console.log("Création ou récupération de l'organisation...");
              const { data: org, error: orgError } = await supabase!
                .from('organizations')
                .insert({ 
                    name: 'Mon Organisation Démo',
                    subscription_plan: 'pro',
                    ai_usage_count: 12,
                    industry: 'restaurant'
                })
                .select()
                .single();
                
              if (orgError) {
                  console.error("Erreur Org:", orgError);
                  if (orgError.code === '42P01') throw new Error("TABLES MANQUANTES. Exécutez le script SQL 'Reset' dans Supabase.");
                  throw orgError;
              }
              orgId = org.id;
              
              // Link user to org
              await supabase!.from('users').upsert({
                  id: user.id,
                  organization_id: orgId,
                  role: 'admin',
                  email: user.email,
                  name: user.name
              });
          }
          
          // 2. Create Locations
          console.log("Création des établissements...");
          const { data: locs, error: locError } = await supabase!.from('locations').insert([
              { organization_id: orgId, name: "Boutique Paris Centre", city: "Paris", country: "France", connection_status: "connected", platform_rating: 4.8 },
              { organization_id: orgId, name: "Atelier Lyon", city: "Lyon", country: "France", connection_status: "disconnected", platform_rating: 4.2 }
          ]).select();
          
          if (locError) {
              console.error("Erreur Locations:", locError);
              throw locError;
          }
          
          // 3. Create Reviews
          console.log("Création des avis...");
          const locId = locs[0].id;
          const reviewsPayload = INITIAL_REVIEWS.map(r => ({
              location_id: locId,
              source: r.source,
              rating: r.rating,
              author_name: r.author_name,
              text: r.body,
              language: r.language,
              received_at: r.received_at,
              status: r.status,
              analysis: r.analysis,
              ai_reply: r.ai_reply
          }));
          
          const { error: revError } = await supabase!.from('reviews').insert(reviewsPayload);
          if (revError) {
              console.error("Erreur Reviews:", revError);
              throw revError;
          }

          // 4. Create Competitors
          console.log("Création des concurrents...");
          const competitorsPayload = INITIAL_COMPETITORS.map(c => ({
              organization_id: orgId,
              name: c.name,
              address: c.address,
              rating: c.rating,
              review_count: c.review_count,
              strengths: c.strengths,
              weaknesses: c.weaknesses
          }));
          
          const { error: compError } = await supabase!.from('competitors').insert(competitorsPayload);
          if (compError) {
              console.warn("Erreur Concurrents (peut-être table manquante?):", compError.message);
          }
          
          return true;

      } catch (e: any) {
          console.error("Seed Error Full:", e);
          if (e.message?.includes("relation") && e.message?.includes("does not exist")) {
              throw new Error(`TABLE MANQUANTE: ${e.message}. Copiez le script SQL 'Reset' dans Supabase.`);
          }
          throw new Error("Erreur d'injection : " + (e.message || e.details || "Inconnue"));
      }
  },

  public: {
      getLocationInfo: async (locationId: string) => { return { name: "Demo", city: "Paris", googleUrl: "#" }; },
      submitFeedback: async (locationId: string, rating: number, feedback: string, contact: string) => { return true; }
  },
  customers: {
      list: async () => { return []; }
  },
  admin: {
      getStats: async () => { return { mrr: "0", active_tenants: 0, total_reviews_processed: 0, tenants: [] }; }
  }
};