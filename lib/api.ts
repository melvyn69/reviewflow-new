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

// Services définis en interne pour éviter les problèmes d'initialisation circulaire
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
                  return { ...INITIAL_ORG, ...org, locations: locations || [] } as Organization;
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
              if (error) return [];
              let result = (data || []).map((r: any) => ({
                  ...r, internal_notes: r.internal_notes || [], analysis: r.analysis || { sentiment: 'neutral', themes: [], keywords: [], flags: {} }
              })) as Review[];
              if (filters.search) {
                  const q = filters.search.toLowerCase();
                  result = result.filter(r => r.body?.toLowerCase().includes(q) || r.author_name?.toLowerCase().includes(q));
              }
              return result;
          }
          return INITIAL_REVIEWS;
      },
      reply: async (id: string, text: string) => {
          if (isSupabaseConfigured()) {
              await supabase!.from('reviews').update({ status: 'sent', posted_reply: text, replied_at: new Date().toISOString() }).eq('id', id);
          }
          return true;
      },
      saveDraft: async (id: string, text: string) => {
          if (isSupabaseConfigured()) {
              await supabase!.from('reviews').update({ status: 'draft', ai_reply: { text, needs_manual_validation: false, created_at: new Date().toISOString() } }).eq('id', id);
          }
          return true;
      },
      addNote: async (id: string, text: string) => {
          const newNote = { id: `n-${Date.now()}`, text, author_name: 'Me', created_at: new Date().toISOString() };
          if (isSupabaseConfigured()) {
              const { data: review } = await supabase!.from('reviews').select('internal_notes').eq('id', id).single();
              const notes = review?.internal_notes || [];
              await supabase!.from('reviews').update({ internal_notes: [...notes, newNote] }).eq('id', id);
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
                  status: 'pending'
              }));
              const { error } = await supabase!.from('reviews').insert(formattedData);
              if (error) throw error;
          }
          return data.length;
      }
};

const aiService = {
      generateReply: async (review: Review, options: any) => {
          const apiKey = import.meta.env.VITE_API_KEY;
          if (!apiKey) throw new Error("Clé API manquante (VITE_API_KEY).");
          try {
              const org = await organizationService.get(); 
              const genAI = new GoogleGenerativeAI(apiKey);
              const brand = org?.brand || { tone: 'professionnel' };
              
              // Fallback strategy: Flash -> Pro
              const prompt = `Réponds à cet avis (${review.rating}/5): "${review.body}". Ton: ${options.tone || brand.tone}.`;
              try {
                  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
                  const result = await model.generateContent(prompt);
                  return result.response.text();
              } catch (e) {
                  const model = genAI.getGenerativeModel({ model: "gemini-pro"});
                  const result = await model.generateContent(prompt);
                  return result.response.text();
              }
          } catch (e: any) {
              throw new Error(`Erreur IA: ${e.message}`);
          }
      },
      generateSocialPost: async (review: Review, platform: 'instagram' | 'linkedin') => {
          const apiKey = import.meta.env.VITE_API_KEY;
          if (!apiKey) return "Clé manquante";
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
          const result = await model.generateContent(`Post ${platform} pour avis: "${review.body}"`);
          return result.response.text();
      },
      runCustomTask: async (payload: any) => {
          const apiKey = import.meta.env.VITE_API_KEY;
          if (!apiKey) return { error: "Clé manquante" };
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
          const result = await model.generateContent(JSON.stringify(payload));
          return JSON.parse(result.response.text());
      }
};

const seedCloudDatabase = async () => {
      if (!isSupabaseConfigured()) throw new Error("Supabase non connecté");
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) throw new Error("Connectez-vous.");
      try {
          const { data: org, error } = await supabase!.from('organizations').insert({ name: 'Démo Org', subscription_plan: 'pro' }).select().single();
          if (error) throw error;
          await supabase!.from('users').upsert({ id: user.id, email: user.email, role: 'admin', organization_id: org.id });
          const { data: locs } = await supabase!.from('locations').insert([{ organization_id: org.id, name: "Lieu Démo", address: "Paris" }]).select();
          if (locs) {
              const reviewsPayload = INITIAL_REVIEWS.map(r => ({ ...r, location_id: locs[0].id, internal_notes: [], analysis: r.analysis || {} }));
              await supabase!.from('reviews').insert(reviewsPayload);
          }
          window.location.reload();
          return true;
      } catch (e: any) {
          console.error(e);
          throw e;
      }
};

export const api = {
  auth: authService,
  reviews: reviewsService,
  organization: organizationService,
  ai: aiService,
  social: { connect: async () => true, publish: async () => true },
  automation: { 
      getWorkflows: async () => INITIAL_WORKFLOWS, 
      create: async () => true, 
      run: async () => ({ processed: 0, actions: 0, alerts: 0 }) 
  },
  seedCloudDatabase,
  analytics: { getOverview: async () => INITIAL_ANALYTICS },
  competitors: { list: async () => INITIAL_COMPETITORS, add: async () => INITIAL_COMPETITORS[0] },
  notifications: { list: async () => [], markAllRead: async () => true },
  locations: { create: async () => ({ id: 'new' }) },
  team: { list: async () => INITIAL_USERS, invite: async () => true, remove: async () => true },
  billing: { 
      getInvoices: async () => [], 
      downloadInvoice: () => {}, 
      createCheckoutSession: async (plan: string) => {
          const links: Record<string, string> = { 'starter': 'https://buy.stripe.com/test_starter', 'pro': 'https://buy.stripe.com/test_pro' };
          return links[plan] || "https://stripe.com";
      },
      createPortalSession: async () => "https://billing.stripe.com" 
  },
  onboarding: { checkStatus: async () => ({ googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 }) },
  activity: { getRecent: async () => [] },
  public: { 
      getLocationInfo: async (id: string) => ({ name: "Demo", city: "Paris", googleUrl: "#" }), 
      submitFeedback: async () => true 
  },
  customers: { list: async () => [] },
  admin: { getStats: async () => ({ mrr: "0", active_tenants: 0, total_reviews_processed: 0, tenants: [] }) }
};