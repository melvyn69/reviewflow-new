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
  SetupStatus
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
              if (!profile?.organization_id) return null;

              const { data: org, error } = await supabase!.from('organizations').select('*').eq('id', profile.organization_id).single();
              if (error || !org) return null;

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
          if (!isSupabaseConfigured()) return [];

          let query = supabase!.from('reviews').select('*').order('received_at', { ascending: false });
          
          if (filters.status && filters.status !== 'Tout') query = query.eq('status', filters.status.toLowerCase());
          if (filters.source && filters.source !== 'Tout') query = query.eq('source', filters.source.toLowerCase());
          if (filters.rating && filters.rating !== 'Tout') query = query.eq('rating', parseInt(filters.rating));
          
          const { data, error } = await query;
          
          if (error) {
              console.error("Error fetching reviews:", error);
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
                  ...r, 
                  id: undefined, 
                  location_id: locs[0].id, 
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
    create: async (data: { name: string, city: string, address: string, country: string }) => {
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
                    text: feedback,
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
                throw e;
            }
        }
        return true;
    }
};

const analyticsService = {
    getOverview: async (period?: string) => {
        return INITIAL_ANALYTICS;
    }
};

const customersService = {
    list: async (): Promise<Customer[]> => {
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
    })
};

const socialService = {
    publish: async (platform: string, content: string) => {
        console.log(`Publishing to ${platform}: ${content}`);
        return true;
    }
};

const notificationsService = {
    list: async (): Promise<AppNotification[]> => [],
    markAllRead: async () => true
};

const onboardingService = {
    checkStatus: async (): Promise<SetupStatus> => ({
        googleConnected: false,
        brandVoiceConfigured: true,
        firstReviewReplied: false,
        completionPercentage: 35
    })
};

const activityService = {
    getRecent: async () => [
        { id: 1, type: 'review', text: 'Nouvel avis 5 étoiles reçu', location: 'Paris', time: 'Il y a 2h' },
        { id: 2, type: 'alert', text: 'Réponse IA en attente de validation', location: 'Lyon', time: 'Il y a 4h' }
    ]
};

const teamService = {
    list: async (): Promise<User[]> => [],
    invite: async (email: string, role: string) => {
        console.log(`Inviting ${email} as ${role}`);
        return true;
    }
};

const competitorsService = {
    list: async (): Promise<Competitor[]> => INITIAL_COMPETITORS
};

const billingService = {
    createCheckoutSession: async (plan: 'starter' | 'pro') => {
        try {
            const res = await fetch('/api/create_checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan,
                    successUrl: window.location.origin + '/#billing?success=true',
                    cancelUrl: window.location.origin + '/#billing?canceled=true'
                })
            });
            const data = await res.json();
            if (data.url) return data.url;
            throw new Error(data.error || 'Erreur inconnue');
        } catch (e: any) {
            throw new Error(e.message);
        }
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