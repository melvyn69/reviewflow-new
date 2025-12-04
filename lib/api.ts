import { supabase } from './supabase';
import { INITIAL_USERS, INITIAL_ORG, INITIAL_REVIEWS, INITIAL_COMPETITORS, INITIAL_WORKFLOWS, INITIAL_REPORTS } from './db';
import { Review, User, Organization, SetupStatus, Competitor, WorkflowRule, AnalyticsSummary, Customer, Offer, StaffMember } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const useSupabase = () => !!supabase;

// Mock data storage in memory for demo session
let users = [...INITIAL_USERS];
let org = { ...INITIAL_ORG };
let reviews = [...INITIAL_REVIEWS];
let competitors = [...INITIAL_COMPETITORS];
let workflows = [...INITIAL_WORKFLOWS];
let reports = [...INITIAL_REPORTS];

export const api = {
  auth: {
    getUser: async (): Promise<User | null> => {
      if (useSupabase()) {
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user) return null;
        // Fetch profile
        const { data } = await supabase!.from('users').select('*').eq('id', user.id).single();
        return data as User;
      }
      return users[0] || null;
    },
    login: async (email: string, password: string) => {
      if (useSupabase()) {
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return;
      }
      await delay(500);
      if (email === 'demo@reviewflow.com' && password === 'password') return users[0];
      // For demo purposes, allow any login if mock
      return users[0];
    },
    register: async (name: string, email: string, password: string) => {
      if (useSupabase()) {
        const { error } = await supabase!.auth.signUp({ 
            email, 
            password,
            options: { data: { name } } 
        });
        if (error) throw error;
        return;
      }
      await delay(800);
      return { ...users[0], name, email };
    },
    logout: async () => {
        if (useSupabase()) await supabase!.auth.signOut();
        // window.location.reload(); handled in component
    },
    loginWithGoogle: async () => {
        if (useSupabase()) {
            await supabase!.auth.signInWithOAuth({ provider: 'google' });
        } else {
            console.warn("Supabase not configured for Google Login");
        }
    },
    connectGoogleBusiness: async () => {
        // Mock
        await delay(1000);
        return true;
    },
    updateProfile: async (data: Partial<User>) => {
        await delay(500);
        users[0] = { ...users[0], ...data };
        return users[0];
    },
    resetPassword: async (email: string) => {
        if (useSupabase()) await supabase!.auth.resetPasswordForEmail(email);
        await delay(500);
    },
    deleteAccount: async () => {
        // Mock
        await delay(500);
    }
  },
  organization: {
      get: async (): Promise<Organization | null> => {
          if (useSupabase()) {
              const { data } = await supabase!.from('organizations').select('*, locations(*), staff_members(*), offers(*), api_keys(*), webhooks(*)').single();
              if (data) return data as any;
          }
          await delay(300);
          return org;
      },
      update: async (data: Partial<Organization>) => {
          if (useSupabase()) {
              await supabase!.from('organizations').update(data).eq('id', org.id);
              return;
          }
          await delay(500);
          org = { ...org, ...data };
          return org;
      },
      saveGoogleTokens: async () => {
          // Mock check for redirect params
          return false;
      },
      generateApiKey: async (name: string) => {
          await delay(500);
          const key = { id: Date.now().toString(), name, key: 'sk_' + Date.now(), created_at: new Date().toISOString() };
          org.api_keys = [...(org.api_keys || []), key];
          return key;
      },
      revokeApiKey: async (id: string) => {
          await delay(300);
          org.api_keys = org.api_keys?.filter(k => k.id !== id);
      },
      saveWebhook: async (url: string, events: string[]) => {
          await delay(500);
          const hook = { id: Date.now().toString(), url, events, active: true, secret: 'whsec_', created_at: new Date().toISOString() };
          org.webhooks = [...(org.webhooks || []), hook as any];
      },
      deleteWebhook: async (id: string) => {
          org.webhooks = org.webhooks?.filter(w => w.id !== id);
      },
      testWebhook: async (id: string) => {
          await delay(1000);
          return true;
      },
      simulatePlanChange: async (plan: 'pro' | 'starter') => {
          org.subscription_plan = plan;
      },
      addStaffMember: async (name: string, role: string) => {
          await delay(500);
          const newStaff = { id: Date.now().toString(), name, role, reviews_count: 0, average_rating: 0 };
          org.staff_members = [...(org.staff_members || []), newStaff as any];
      },
      removeStaffMember: async (id: string) => {
          org.staff_members = org.staff_members?.filter(s => s.id !== id);
      },
      sendCongratulationEmail: async (id: string) => {
          await delay(500);
      }
  },
  reviews: {
      list: async (filters: any) => {
          await delay(300);
          let data = [...reviews];
          if (filters.status && filters.status !== 'all' && filters.status !== 'Tout') {
              data = data.filter(r => r.status === filters.status);
          }
          if (filters.rating && filters.rating !== 'all' && filters.rating !== 'Tout') {
              data = data.filter(r => r.rating === parseInt(filters.rating));
          }
          return data;
      },
      reply: async (reviewId: string, text: string) => {
          await delay(500);
          const r = reviews.find(rv => rv.id === reviewId);
          if (r) {
              r.status = 'sent';
              r.posted_reply = text;
              r.replied_at = new Date().toISOString();
          }
      },
      saveDraft: async (reviewId: string, text: string) => {
          await delay(300);
          const r = reviews.find(rv => rv.id === reviewId);
          if (r) {
              r.status = 'draft';
              if (!r.ai_reply) r.ai_reply = {} as any;
              r.ai_reply!.text = text;
          }
      },
      addNote: async (reviewId: string, text: string) => {
          await delay(300);
          const note = { id: Date.now().toString(), text, author_name: 'Moi', created_at: new Date().toISOString() };
          const r = reviews.find(rv => rv.id === reviewId);
          if (r) {
              r.internal_notes = [...(r.internal_notes || []), note];
          }
          return note;
      },
      subscribe: (callback: any) => {
          return { unsubscribe: () => {} };
      },
      uploadCsv: async (file: File, locationId: string) => {
          await delay(2000);
          return 50; // Mock 50 imported
      }
  },
  ai: {
      generateReply: async (review: Review, config: any) => {
          if (useSupabase()) {
              // Call edge function would go here
              // For now mock return even if supabase connected to avoid complex setup
          }
          await delay(1000);
          return `Merci ${review.author_name} pour votre avis ${review.rating} étoiles ! Nous sommes ravis de vous avoir accueilli.`;
      },
      generateSocialPost: async (review: Review, platform: string) => {
          await delay(1500);
          return `🌟 Avis Client 🌟\n\nMerci à ${review.author_name} pour ce retour incroyable !\n"${review.body}"\n\n#reviewflow #customerlove #feedback`;
      },
      previewBrandVoice: async (config: any, review: any) => {
          await delay(1000);
          return "Ceci est un aperçu de la voix de votre marque générée par l'IA.";
      },
      runCustomTask: async (payload: any) => {
          await delay(1000);
          return { status: 'success', result: 'Mock AI Result' };
      }
  },
  analytics: {
      getOverview: async (period?: string): Promise<AnalyticsSummary> => {
          await delay(500);
          return {
              period: period || '30d',
              total_reviews: reviews.length,
              average_rating: 4.5,
              response_rate: 94,
              nps_score: 72,
              global_rating: 4.5,
              sentiment_distribution: { positive: 0.8, neutral: 0.1, negative: 0.1 },
              volume_by_date: [{ date: 'Lun', count: 5 }, { date: 'Dim', count: 10 }],
              top_themes_positive: [{ name: 'Service', weight: 0.9 }],
              top_themes_negative: [{ name: 'Prix', weight: 0.4 }],
              top_keywords: [{ keyword: 'Top', count: 10 }]
          };
      }
  },
  competitors: {
      list: async () => {
          await delay(300);
          return competitors;
      },
      create: async (data: Partial<Competitor>) => {
          await delay(300);
          competitors.push({ ...data, id: Date.now().toString() } as Competitor);
      },
      delete: async (id: string) => {
          await delay(300);
          competitors = competitors.filter(c => c.id !== id);
      },
      autoDiscover: async (radius: number, sector: string, lat: number, lng: number) => {
          await delay(2000);
          return [
              { name: 'Concurrent A', rating: 4.2, review_count: 120, address: 'Rue voisine', strengths: ['Prix'], weaknesses: ['Service'], threat_level: 65 },
              { name: 'Concurrent B', rating: 3.8, review_count: 50, address: 'Place centrale', strengths: ['Emplacement'], weaknesses: ['Qualité'], threat_level: 40 }
          ];
      },
      getDeepAnalysis: async () => {
          await delay(3000);
          return {
              trends: ['Demande bio en hausse', 'Prix sensibles'],
              swot: { strengths: ['Qualité'], weaknesses: ['Prix'], opportunities: ['Livraison'], threats: ['Nouveaux entrants'] },
              competitors_detailed: []
          };
      }
  },
  automation: {
      getWorkflows: async () => {
          await delay(300);
          return workflows;
      },
      saveWorkflow: async (wf: WorkflowRule) => {
          await delay(300);
          const idx = workflows.findIndex(w => w.id === wf.id);
          if (idx >= 0) workflows[idx] = wf;
          else workflows.push(wf);
      },
      deleteWorkflow: async (id: string) => {
          workflows = workflows.filter(w => w.id !== id);
      },
      run: async () => {
          await delay(1000);
          return { processed: 5, actions: 3 };
      }
  },
  notifications: {
      list: async () => {
          return [];
      },
      markAllRead: async () => {},
      sendTestEmail: async () => { await delay(1000); }
  },
  team: {
      list: async () => {
          await delay(300);
          return [{ id: 'u1', name: 'Alex', email: 'alex@test.com', role: 'admin' }] as User[];
      },
      invite: async (email: string, role: string) => {
          await delay(500);
      }
  },
  company: {
      search: async (query: string) => {
          await delay(500);
          return [{ legal_name: query + ' SAS', siret: '12345678900012', address: '10 Rue de Paris' }];
      }
  },
  billing: {
      getInvoices: async () => {
          await delay(500);
          return [];
      },
      createCheckoutSession: async (plan: string) => {
          await delay(1000);
          return 'https://stripe.com/mock-checkout';
      },
      createPortalSession: async () => {
          return 'https://billing.stripe.com/p/login/mock';
      }
  },
  activity: {
      getRecent: async () => {
          return [
              { id: '1', type: 'review', text: 'Nouvel avis 5 étoiles', time: '2 min', location: 'Paris' }
          ];
      }
  },
  onboarding: {
      checkStatus: async (): Promise<SetupStatus> => {
          return {
              googleConnected: true,
              brandVoiceConfigured: true,
              firstReviewReplied: false,
              completionPercentage: 66
          };
      }
  },
  seedCloudDatabase: async () => {
      await delay(2000);
  },
  locations: {
      create: async (data: any) => {
          await delay(500);
          const newLoc = { ...data, id: Date.now().toString() };
          org.locations = [...org.locations, newLoc];
      },
      update: async (id: string, data: any) => {
          await delay(500);
          org.locations = org.locations.map(l => l.id === id ? { ...l, ...data } : l);
      },
      delete: async (id: string) => {
          org.locations = org.locations.filter(l => l.id !== id);
      }
  },
  google: {
      fetchAllGoogleLocations: async () => {
          await delay(1000);
          return [{ name: 'accounts/1/locations/1', title: 'Mon Etablissement', storeCode: 'STORE1', address: 'Paris' }];
      },
      syncReviewsForLocation: async (id: string, ref: string) => {
          await delay(2000);
          return 10;
      }
  },
  public: {
      getLocationInfo: async (id: string) => {
          await delay(300);
          return org.locations.find(l => l.id === id) || null;
      },
      getActiveOffer: async (id: string, rating: number) => {
          await delay(300);
          return org.offers?.find(o => o.active && rating >= o.trigger_rating) || null;
      },
      submitFeedback: async (id: string, rating: number, text: string, contact: string, tags: string[], staff?: string) => {
          await delay(800);
          reviews.unshift({
              id: Date.now().toString(),
              location_id: id,
              rating,
              body: text,
              author_name: contact || 'Anonyme',
              received_at: new Date().toISOString(),
              source: 'direct',
              status: 'pending',
              language: 'fr',
              analysis: { sentiment: rating >= 4 ? 'positive' : 'negative', themes: tags, keywords: [], flags: { hygiene: false, discrimination: false, security: false, staff_conflict: false, pricing_issue: false } }
          } as any);
      },
      getWidgetReviews: async (id: string) => {
          return reviews.filter(r => r.location_id === id && r.rating >= 4);
      }
  },
  campaigns: {
      send: async (type: string, recipient: string, subject: string, content: string) => {
          await delay(1000);
      }
  },
  customers: {
      list: async (): Promise<Customer[]> => {
          await delay(500);
          return [
              { id: 'c1', name: 'Sophie Martin', average_rating: 5, total_reviews: 2, status: 'promoter', source: 'Google', last_interaction: new Date().toISOString() }
          ];
      }
  },
  offers: {
      generateCoupon: async (offerId: string, email: string): Promise<any> => {
          await delay(500);
          return {
              id: 'cp-' + Date.now(),
              code: 'GIFT-' + Math.floor(Math.random() * 10000),
              offer_title: 'Cadeau Surprise',
              discount_detail: '1 Café Offert',
              expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
              status: 'active'
          };
      },
      validate: async (code: string) => {
          await delay(500);
          return { valid: true, discount: 'Café Offert' };
      },
      redeem: async (code: string) => {
          await delay(500);
          return { success: true };
      }
  },
  admin: {
      getStats: async () => {
          await delay(500);
          return { mrr: '12500€', active_tenants: 142, total_reviews_processed: 15430, tenants: [] };
      }
  }
};