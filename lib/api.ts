
import { supabase, isSupabaseConfigured } from './supabase';
import { 
  INITIAL_ORG, 
  INITIAL_ANALYTICS, 
} from './db';
import { 
  User, 
  Review, 
  Organization, 
  WorkflowRule, 
  BrandSettings,
  Customer,
  Location,
  AnalyticsSummary
} from '../types';
import { GoogleGenAI } from '@google/genai';

// --- SERVICE HELPER ---

const requireSupabase = () => {
  if (!isSupabaseConfigured()) {
    throw new Error("La base de données n'est pas connectée.");
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
    updateProfile: async (data: { name?: string, email?: string, password?: string, role?: string }) => {
        const db = requireSupabase();
        const updates: any = {};
        if (data.email) updates.email = data.email;
        if (data.password) updates.password = data.password;
        if (data.name) updates.data = { full_name: data.name };

        const { error } = await db.auth.updateUser(updates);
        if (error) throw error;
        
        const { data: { user } } = await db.auth.getUser();
        if (user) {
            const profileUpdates: any = {};
            if (data.name) profileUpdates.full_name = data.name;
            if (data.role) profileUpdates.role = data.role;
            await db.from('users').update(profileUpdates).eq('id', user.id);
        }
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
    },
    connectGoogleBusiness: async () => {
        const db = requireSupabase();
        const { error } = await db.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.href, 
                scopes: 'https://www.googleapis.com/auth/business.manage', 
                queryParams: { access_type: 'offline', prompt: 'consent' }
            }
        });
        if (error) throw error;
    }
};

const companyService = {
    search: async (query: string) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!query || query.length < 3) return [];
        return [
            { siret: "12345678900012", legal_name: "SAS EXEMPLE RESTO", address: "Paris", vat: "FR12", industry: "restaurant" }
        ].filter(c => c.legal_name.toLowerCase().includes(query.toLowerCase()));
    }
};

const organizationService = {
      get: async (): Promise<Organization | null> => {
          if (!isSupabaseConfigured()) return null;
          try {
              const { data: { user } } = await supabase!.auth.getUser();
              if (!user) return null;
              const { data: profile } = await supabase!.from('users').select('organization_id').eq('id', user.id).single();
              if (!profile?.organization_id) return organizationService.createDefault(user.id);

              const { data: org, error } = await supabase!.from('organizations').select('*').eq('id', profile.organization_id).single();
              if (error || !org) return organizationService.createDefault(user.id);

              const { data: locations } = await supabase!.from('locations').select('*').eq('organization_id', profile.organization_id);

              return { 
                  ...INITIAL_ORG, 
                  ...org, 
                  brand: org.brand || INITIAL_ORG.brand,
                  integrations: org.integrations || INITIAL_ORG.integrations,
                  saved_replies: org.saved_replies || [],
                  workflows: org.workflows || [], 
                  notification_settings: org.notification_settings || INITIAL_ORG.notification_settings,
                  locations: locations || [] 
              } as Organization;
          } catch (e) { return null; }
      },
      createDefault: async (userId: string): Promise<Organization | null> => {
          try {
              const db = requireSupabase();
              const { data: org, error: orgError } = await db.from('organizations').insert({
                  name: 'Ma Société',
                  subscription_plan: 'free',
                  industry: 'other'
              }).select().single();
              if (orgError) throw orgError;

              await db.from('locations').insert({ organization_id: org.id, name: 'Siège Principal', city: 'Paris', country: 'France' });
              await db.from('users').update({ organization_id: org.id, role: 'admin' }).eq('id', userId);
              return await organizationService.get();
          } catch (e) { return null; }
      },
      update: async (data: Partial<Organization>) => {
          const user = await authService.getUser();
          if (user?.organization_id) {
              const { error } = await requireSupabase().from('organizations').update(data).eq('id', user.organization_id);
              if (error) throw error;
          }
          return INITIAL_ORG;
      },
      simulatePlanChange: async (plan: 'free' | 'starter' | 'pro') => {
          const user = await authService.getUser();
          if (user?.organization_id) {
              await requireSupabase().from('organizations').update({ subscription_plan: plan }).eq('id', user.organization_id);
          }
          return true;
      }
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
                // Map text to body for frontend compatibility if needed, or update Types
                const { data, error } = await query;
                if (!error && data) {
                    result = data.map((r: any) => ({...r, body: r.text || r.body})); 
                }
            } catch (e) { console.warn("DB Error", e); }
          }
          return result;
      },
      reply: async (id: string, text: string) => {
          await requireSupabase().from('reviews').update({ status: 'sent', posted_reply: text, replied_at: new Date().toISOString() }).eq('id', id);
          return true;
      },
      saveDraft: async (id: string, text: string) => {
          await requireSupabase().from('reviews').update({ status: 'draft', ai_reply: { text, needs_manual_validation: false } }).eq('id', id);
          return true;
      },
      addNote: async (id: string, text: string) => {
          const user = await authService.getUser();
          const newNote = { id: `n-${Date.now()}`, text, author_name: user?.name || 'Moi', created_at: new Date().toISOString() };
          const db = requireSupabase();
          const { data: review } = await db.from('reviews').select('internal_notes').eq('id', id).single();
          const notes = review?.internal_notes || [];
          await db.from('reviews').update({ internal_notes: [...notes, newNote] }).eq('id', id);
          return newNote;
      },
      uploadCsv: async (file: File, locationId: string) => { 
          // Client-side CSV parsing implementation would go here (PapaParse)
          // For now returning mock success
          return 10; 
      },
};

const googleService = {
    getToken: async () => {
        const { data } = await supabase!.auth.getSession();
        return data.session?.provider_token;
    },
    
    // Mock for now as GMB Account Listing requires complex hierarchy traversal
    fetchAllGoogleLocations: async () => {
        return [
            { name: 'accounts/123/locations/456', title: 'Google Location Demo 1', storeCode: 'STORE-001' },
            { name: 'accounts/123/locations/789', title: 'Google Location Demo 2', storeCode: 'STORE-002' }
        ];
    },

    syncReviewsForLocation: async (locationId: string, googleLocationName: string) => {
        const token = await googleService.getToken();
        if (!token) throw new Error("Token Google introuvable. Veuillez vous reconnecter.");

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch_google_reviews`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                locationId,
                googleLocationName,
                accessToken: token
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Erreur de synchronisation");
        }

        const data = await response.json();
        return data.count;
    }
};

const aiService = {
      generateReply: async (review: Review, options: any) => {
          const apiKey = process.env.API_KEY; 
          if (!apiKey) throw new Error("Clé API manquante");
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: `Rédige une réponse à cet avis ${review.rating}/5: "${review.body}". Ton: ${options.tone}.`,
          });
          return response.text || "";
      },
      previewBrandVoice: async (brand: BrandSettings, mockReview: any) => { return "Réponse simulée par l'IA..."; },
      generateSocialPost: async (review: Review, platform: string) => { return `Super avis reçu ! ⭐⭐⭐⭐⭐ "${review.body}"`; },
      runCustomTask: async (payload: any) => { return { result: "ok" }; }
};

const automationService = {
      getWorkflows: async (): Promise<WorkflowRule[]> => {
          const org = await organizationService.get();
          if (org && (org as any).workflows) {
              return (org as any).workflows;
          }
          return [];
      },
      saveWorkflow: async (workflow: WorkflowRule) => {
          const org = await organizationService.get();
          if (!org) throw new Error("Organisation introuvable");
          
          let currentWorkflows = (org as any).workflows || [];
          const index = currentWorkflows.findIndex((w: WorkflowRule) => w.id === workflow.id);
          if (index >= 0) {
              currentWorkflows[index] = workflow;
          } else {
              currentWorkflows.push(workflow);
          }
          
          const { error } = await requireSupabase().from('organizations')
              .update({ workflows: currentWorkflows })
              .eq('id', org.id);
              
          if (error) throw error;
          return true;
      },
      deleteWorkflow: async (workflowId: string) => {
          const org = await organizationService.get();
          if (!org) throw new Error("Organisation introuvable");
          
          const currentWorkflows = (org as any).workflows || [];
          const newWorkflows = currentWorkflows.filter((w: WorkflowRule) => w.id !== workflowId);
          
          const { error } = await requireSupabase().from('organizations')
              .update({ workflows: newWorkflows })
              .eq('id', org.id);
              
          if (error) throw error;
          return true;
      },
      run: async () => {
          try {
             const { data: { session } } = await supabase!.auth.getSession();
             const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process_reviews`, {
                 method: 'POST',
                 headers: {
                     'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                     'Content-Type': 'application/json'
                 }
             });
             const data = await res.json();
             return { processed: data.processed || 0, actions: data.actions || 0, alerts: 0 };
          } catch (e) {
             console.error("Automation run error", e);
             return { processed: 0, actions: 0, alerts: 0 };
          }
      }
};

const locationsService = {
    create: async (data: any) => { 
        const user = await authService.getUser();
        if(user?.organization_id) {
            await requireSupabase().from('locations').insert({...data, organization_id: user.organization_id});
        }
        return true; 
    },
    update: async (id: string, data: any) => { 
        await requireSupabase().from('locations').update(data).eq('id', id);
        return true; 
    },
    delete: async (id: string) => { 
        await requireSupabase().from('locations').delete().eq('id', id);
        return true; 
    }
};

const teamService = {
    list: async () => [],
    invite: async (email: string, role: string) => true,
    remove: async (id: string) => true
};

const competitorsService = {
    list: async () => [],
    create: async (c: any) => true,
    delete: async (id: string) => true,
    autoDiscover: async (rad: number, sec: string) => [],
    getDeepAnalysis: async () => ({ 
        trends: [], 
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] }, 
        competitors_detailed: [] 
    })
};

const analyticsService = {
    getOverview: async (period?: string): Promise<AnalyticsSummary> => {
        // Real implementation using DB aggregation
        // In a real pro app, this should be an RPC call or a dedicated stats table updated via triggers.
        // Here we simulate it by fetching reviews client side (not optimal for scale but works for <1000 reviews)
        
        if (!isSupabaseConfigured()) return INITIAL_ANALYTICS;

        try {
            const { data: reviews } = await supabase!.from('reviews').select('rating, analysis, received_at');
            
            if (!reviews || reviews.length === 0) return { ...INITIAL_ANALYTICS, total_reviews: 0 };

            const total = reviews.length;
            const avg = reviews.reduce((a, b) => a + b.rating, 0) / total;
            
            // Basic Sentiment Calc
            let positive = 0, neutral = 0, negative = 0;
            reviews.forEach(r => {
                if (r.rating >= 4) positive++;
                else if (r.rating === 3) neutral++;
                else negative++;
            });

            return {
                period: period || 'all_time',
                total_reviews: total,
                average_rating: parseFloat(avg.toFixed(1)),
                response_rate: 0, // Need to fetch 'status' to calc this
                nps_score: Math.round(((positive - negative) / total) * 100),
                global_rating: parseFloat(avg.toFixed(1)),
                sentiment_distribution: {
                    positive: positive / total,
                    neutral: neutral / total,
                    negative: negative / total
                },
                volume_by_date: [], // Fill with real histogram logic if needed
                top_themes_positive: [],
                top_themes_negative: [],
                top_keywords: []
            };
        } catch (e) {
            console.error("Analytics Error", e);
            return INITIAL_ANALYTICS;
        }
    }
};

const customersService = {
    list: async () => []
};

const adminService = {
    getStats: async () => ({ mrr: "0€", active_tenants: 0, total_reviews_processed: 0, tenants: [] }),
    resetAccount: async () => true
};

const socialService = {
    publish: async (platform: string, content: string) => true
};

const notificationsService = {
    list: async () => [],
    markAllRead: async () => true,
    sendTestEmail: async () => true
};

const onboardingService = {
    checkStatus: async () => ({ googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 })
};

const activityService = {
    getRecent: async () => []
};

const billingService = {
    createCheckoutSession: async (plan: string) => "",
    createPortalSession: async () => "",
    getInvoices: async () => []
};

const seedCloudDatabase = async () => true;

export const api = {
    auth: authService,
    company: companyService,
    organization: organizationService,
    reviews: reviewsService,
    ai: aiService,
    automation: automationService,
    locations: locationsService,
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
    seedCloudDatabase,
    public: { 
        getLocationInfo: async (id: string) => null, 
        getWidgetReviews: async (id: string) => [], 
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: string, tags: string[]) => true 
    },
    google: googleService
};
