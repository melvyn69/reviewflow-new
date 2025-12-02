import { supabase, isSupabaseConfigured } from './supabase';
import { 
  INITIAL_ORG, 
  INITIAL_REVIEWS, 
  INITIAL_ANALYTICS, 
  INITIAL_WORKFLOWS,
  INITIAL_COMPETITORS,
  INITIAL_USERS
} from './db';
import { 
  User, 
  Review, 
  Organization, 
  WorkflowRule, 
  ReviewStatus,
  BrandSettings,
  Customer,
  AppNotification
} from '../types';
import { GoogleGenAI } from '@google/genai';

// --- UTILS ---

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

// --- SERVICES ---

const authService = {
    getUser: async (): Promise<User | null> => {
      if (!isSupabaseConfigured()) return null; // Force Supabase
      
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return null;

      // Récupération du profil étendu (role, org)
      const { data: profile } = await supabase!.from('users').select('*').eq('id', user.id).single();
      
      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata.full_name || 'Utilisateur',
        avatar: user.user_metadata.avatar_url,
        role: profile?.role || 'viewer', // 'viewer' par défaut pour sécurité
        organizations: profile?.organization_id ? [profile.organization_id] : [],
        organization_id: profile?.organization_id
      };
    },
    login: async (email: string, password: string) => {
      if (!isSupabaseConfigured()) throw new Error("Erreur: Supabase non configuré.");
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    register: async (name: string, email: string, password: string) => {
        if (!isSupabaseConfigured()) throw new Error("Supabase non configuré.");
        
        // 1. Créer l'user Auth
        const { data: authData, error: authError } = await supabase!.auth.signUp({ 
            email, 
            password, 
            options: { data: { full_name: name } } 
        });
        if (authError) throw authError;

        if (authData.user) {
            // 2. Créer une Organisation par défaut pour ce nouvel user
            // Note: Idéalement, faire cela via un Trigger Supabase "on_auth_user_created" pour la robustesse
            const { data: org, error: orgError } = await supabase!.from('organizations').insert({
                name: `${name}'s Organization`,
                subscription_plan: 'free'
            }).select().single();

            if (!orgError && org) {
                // 3. Lier l'user à l'organisation
                await supabase!.from('users').upsert({
                    id: authData.user.id,
                    email: email,
                    role: 'admin',
                    organization_id: org.id
                });
            }
        }
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
        if (isSupabaseConfigured()) {
            const { error } = await supabase!.auth.signInWithOAuth({
                provider: 'google',
                options: { 
                    redirectTo: window.location.origin, 
                    queryParams: { access_type: 'offline', prompt: 'consent' } 
                }
            });
            if (error) throw error;
        } else { throw new Error("Supabase not configured"); }
    }
};

const organizationService = {
      get: async (): Promise<Organization | null> => {
          if (!isSupabaseConfigured()) return INITIAL_ORG; // Fallback temporaire pour UI dev

          try {
              const { data: { user } } = await supabase!.auth.getUser();
              if (!user) return null;

              const { data: profile } = await supabase!.from('users').select('organization_id').eq('id', user.id).single();
              if (!profile?.organization_id) return null;

              const { data: org, error } = await supabase!.from('organizations').select('*').eq('id', profile.organization_id).single();
              if (error || !org) return null;

              const { data: locations } = await supabase!.from('locations').select('*').eq('organization_id', profile.organization_id);

              return { 
                  ...INITIAL_ORG, // Garde les defaults pour les champs manquants en DB
                  ...org, 
                  brand: org.brand || INITIAL_ORG.brand,
                  integrations: org.integrations || INITIAL_ORG.integrations,
                  saved_replies: org.saved_replies || [],
                  workflows: org.workflows || [], 
                  locations: locations || [] 
              } as Organization;
          } catch (e) { 
              console.error("Erreur récupération organisation", e);
              return null; 
          }
      },
      update: async (data: Partial<Organization>) => {
          if (isSupabaseConfigured()) {
              const user = await authService.getUser();
              if (user?.organization_id) {
                  const { error } = await supabase!.from('organizations').update(data).eq('id', user.organization_id);
                  if (error) throw error;
              }
          }
          return INITIAL_ORG;
      },
      initiateGoogleAuth: async (clientId: string) => { 
          // C'est ici qu'on implémenterait le vrai flux OAuth Google Business Profile
          alert("Nécessite une App Google Cloud vérifiée avec scope 'business.manage'.");
          return true; 
      },
      toggleIntegration: async (provider: string, enabled: boolean) => { return true; },
      upgradePlan: async (plan: string) => { return true; }
};

const reviewsService = {
      list: async (filters: any): Promise<Review[]> => {
          if (!isSupabaseConfigured()) return [];

          let query = supabase!.from('reviews').select('*').order('received_at', { ascending: false });
          
          // Récupérer l'org ID de l'utilisateur courant pour filtrer (géré par RLS normalement, mais double sécurité)
          const user = await authService.getUser();
          if (!user?.organization_id) return [];

          // Note: Avec RLS activé, le filtre location_id se fait implicitement, mais on peut joindre si besoin.
          
          if (filters.status && filters.status !== 'Tout') query = query.eq('status', filters.status.toLowerCase());
          if (filters.source && filters.source !== 'Tout') query = query.eq('source', filters.source.toLowerCase());
          if (filters.rating && filters.rating !== 'Tout') query = query.eq('rating', parseInt(filters.rating));
          
          const { data, error } = await query;
          
          if (error) {
              console.error("Erreur fetch reviews:", error);
              return [];
          }

          let result = (data || []).map((r: any) => ({
              ...r, 
              internal_notes: r.internal_notes || [], 
              analysis: r.analysis || { sentiment: 'neutral', themes: [], keywords: [], flags: {} }
          })) as Review[];

          if (filters.search) {
              const q = filters.search.toLowerCase();
              result = result.filter(r => r.body?.toLowerCase().includes(q) || r.author_name?.toLowerCase().includes(q));
          }
          return result;
      },
      reply: async (id: string, text: string) => {
          if (isSupabaseConfigured()) {
              await supabase!.from('reviews').update({ status: 'sent', posted_reply: text, replied_at: new Date().toISOString() }).eq('id', id);
          }
          return true;
      },
      saveDraft: async (id: string, text: string) => {
          if (isSupabaseConfigured()) {
              await supabase!.from('reviews').update({ 
                  status: 'draft', 
                  ai_reply: { text, needs_manual_validation: false, created_at: new Date().toISOString() } 
              }).eq('id', id);
          }
          return true;
      },
      updateStatus: async (id: string, status: ReviewStatus) => {
          if (isSupabaseConfigured()) {
              await supabase!.from('reviews').update({ status }).eq('id', id);
          }
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
          
          if (isSupabaseConfigured()) {
              // Récupérer les notes existantes
              const { data: review } = await supabase!.from('reviews').select('internal_notes').eq('id', id).single();
              const notes = review?.internal_notes || [];
              
              // Ajouter la nouvelle note
              const { error } = await supabase!.from('reviews').update({ internal_notes: [...notes, newNote] }).eq('id', id);
              if (error) throw error;
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
          }
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
              
              // Check Quotas
              const usage = org?.ai_usage_count || 0;
              const limit = org?.subscription_plan === 'free' ? 5 : org?.subscription_plan === 'starter' ? 100 : 300;
              
              if (usage >= limit) {
                  throw new Error("LIMIT_REACHED: Vous avez atteint votre quota d'IA. Passez au plan Pro.");
              }

              const ai = new GoogleGenAI({ apiKey });
              const brand: BrandSettings = org?.brand || { tone: 'professionnel', description: '', knowledge_base: '', use_emojis: false, language_style: 'formal', signature: '' };
              const industry = org?.industry || 'other';
              const knowledgeBaseContext = brand.knowledge_base ? `\n\n[INFO CONTEXTE ENTREPRISE]:\n${brand.knowledge_base}` : '';

              const prompt = `
                Tu es le gestionnaire des avis pour une entreprise de type "${industry}".
                
                [IDENTITÉ DE MARQUE]
                - Ton: ${options.tone || brand.tone}
                - Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}
                - Emojis: ${brand.use_emojis ? 'Oui, modérément' : 'Non'}
                - Longueur: ${options.length || 'Moyenne (2-3 phrases)'}
                ${knowledgeBaseContext}

                [TÂCHE]
                Rédige une réponse professionnelle et empathique à cet avis.
                Ne mets PAS de guillemets autour de la réponse.
                Ne signe pas (la signature sera ajoutée automatiquement).
                
                [AVIS CLIENT]
                Note: ${review.rating}/5
                Auteur: ${review.author_name}
                Commentaire: "${review.body}"
              `;

              // Utilisation recommandée : Gemini 2.5 Flash pour la vitesse
              const response = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: prompt,
              });

              const text = response.text || "";

              // Incrémenter l'usage côté DB si connecté
              if (isSupabaseConfigured() && org) {
                  await supabase!.from('organizations').update({ ai_usage_count: usage + 1 }).eq('id', org.id);
              }

              return text;

          } catch (e: any) {
              console.error("Erreur IA:", e);
              throw new Error(e.message || "Erreur lors de la génération IA.");
          }
      },
      generateSocialPost: async (review: Review, platform: 'instagram' | 'linkedin') => {
          const apiKey = process.env.API_KEY;
          if (!apiKey) return "Clé manquante";
          const ai = new GoogleGenAI({ apiKey });
          
          try {
              const response = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: `Rédige un post court et engageant pour ${platform} (avec emojis et hashtags) pour mettre en avant cet avis client positif : "${review.body}". L'objectif est de remercier le client et montrer notre qualité de service.`
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
          return [];
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
          return false;
      },
      run: async () => {
          // Call the Vercel function
          try {
             const res = await fetch('/api/cron', { method: 'GET' });
             const data = await res.json();
             return { processed: data.processed?.length || 0, actions: 0, alerts: 0 };
          } catch (e) {
             return { processed: 0, actions: 0, alerts: 0 };
          }
      }
};

const notificationsService = {
    list: async (): Promise<AppNotification[]> => {
        // En prod: fetch depuis table 'notifications'
        return []; 
    },
    markAllRead: async () => true,
    sendAlert: async (email: string, message: string) => {
          // En prod: appel API Vercel /api/send-alert
          console.log(`Sending alert to ${email}: ${message}`);
    }
};

const seedCloudDatabase = async () => {
      if (!isSupabaseConfigured()) throw new Error("Supabase non connecté");
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) throw new Error("Vous devez être connecté pour initialiser la DB.");
      
      try {
          // 1. Créer Org
          const { data: org, error: orgError } = await supabase!.from('organizations').insert({ 
              name: 'Organisation Démo', 
              subscription_plan: 'pro',
              workflows: [] 
          }).select().single();
          
          if (orgError) throw orgError;
          
          // 2. Lier User
          await supabase!.from('users').upsert({ id: user.id, email: user.email, role: 'admin', organization_id: org.id });
          
          // 3. Créer Location
          const { data: locs, error: locError } = await supabase!.from('locations').insert([{ 
              organization_id: org.id, 
              name: "Boutique Paris Centre", 
              city: "Paris" 
          }]).select();
          
          if (locError) throw locError;

          // 4. Injecter Avis
          if (locs) {
              const reviewsPayload = INITIAL_REVIEWS.map(r => ({ 
                  ...r, 
                  id: undefined, // Let DB generate ID
                  location_id: locs[0].id, 
                  internal_notes: [], 
                  analysis: r.analysis || {} 
              }));
              await supabase!.from('reviews').insert(reviewsPayload);
          }
          
          window.location.reload();
          return true;
      } catch (e: any) {
          console.error("Seed error:", e);
          throw new Error("Erreur injection: " + e.message);
      }
};

const locationsService = {
    create: async (data: { name: string, city: string, address: string, country: string }) => {
        if (isSupabaseConfigured()) {
            const user = await authService.getUser();
            if (user?.organization_id) {
                const { error } = await supabase!.from('locations').insert({
                    organization_id: user.organization_id,
                    ...data
                });
                if (error) throw error;
                return true;
            }
        }
        throw new Error("Impossible de créer l'établissement");
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
    submitFeedback: async (locationId: string, rating: number, feedback: string, contact: string) => {
        if (isSupabaseConfigured()) {
            try {
                const newReview = {
                    location_id: locationId,
                    rating: rating,
                    text: feedback, // Mappé vers 'body' ou 'text' selon schema
                    body: feedback,
                    author_name: contact || 'Client Anonyme (Funnel)',
                    source: 'direct',
                    status: 'pending',
                    received_at: new Date().toISOString(),
                    language: 'fr',
                    analysis: { sentiment: 'neutral', themes: [], keywords: [], flags: {} },
                    ai_reply: null
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
        // Mock data generator for analytics visualization since we don't store customers separately yet
        return Array(20).fill(null).map((_, i) => ({
            id: `cust-${i}`,
            name: `Client ${i + 1}`,
            source: i % 2 === 0 ? 'Google' : 'Facebook',
            last_interaction: new Date().toISOString(),
            total_reviews: Math.floor(Math.random() * 5) + 1,
            average_rating: 4 + Math.random(),
            status: i % 3 === 0 ? 'promoter' : 'passive'
        }));
    }
};

const adminService = {
    getStats: async () => ({ 
        mrr: "2,450 €", 
        active_tenants: 42, 
        total_reviews_processed: 1540, 
        tenants: [
            { id: '1', name: 'Demo Corp', admin_email: 'ceo@demo.com', plan: 'pro', usage: 120, mrr: '79€' },
            { id: '2', name: 'Boulangerie Paul', admin_email: 'paul@pain.fr', plan: 'starter', usage: 45, mrr: '49€' }
        ] 
    })
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
  notifications: notificationsService,
  locations: locationsService,
  team: { list: async () => [], invite: async (email: string, role: string) => true, remove: async (id: string) => true },
  billing: { 
      getInvoices: async () => [{id: 'INV-001', date: '2023-10-01', amount: '79.00€', status: 'Paid'}], 
      downloadInvoice: (id: string) => {}, 
      createCheckoutSession: async (plan: string) => {
          try {
             const res = await fetch('/api/create_checkout', {
                 method: 'POST',
                 body: JSON.stringify({ 
                    plan,
                    successUrl: window.location.origin + '/#dashboard?payment=success',
                    cancelUrl: window.location.origin + '/#billing?payment=cancelled'
                 })
             });
             const data = await res.json();
             return data.url;
          } catch(e) {
             console.error(e);
             return null;
          }
      },
      createPortalSession: async () => "https://billing.stripe.com" 
  },
  onboarding: { checkStatus: async () => ({ googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 25 }) },
  activity: { getRecent: async () => [] },
  public: publicService,
  customers: customersService,
  admin: adminService
};