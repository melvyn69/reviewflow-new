
import { supabase } from './supabase';
import { Review, User, Organization, SetupStatus, Competitor, WorkflowRule, AnalyticsSummary, Customer, Offer, StaffMember } from '../types';
import { DEMO_USER, DEMO_ORG, DEMO_REVIEWS, DEMO_STATS, DEMO_COMPETITORS } from './demo';

// --- DEMO MODE UTILS ---
const isDemoMode = () => {
    return localStorage.getItem('is_demo_mode') === 'true';
};

const setDemoMode = (active: boolean) => {
    if (active) localStorage.setItem('is_demo_mode', 'true');
    else localStorage.removeItem('is_demo_mode');
};

// Helper for Edge Functions
const invoke = async (functionName: string, body: any) => {
    if (isDemoMode()) {
        console.log(`[DEMO] Skipping Edge Function ${functionName}`, body);
        return {}; // Mock return for edge functions in demo
    }
    if (!supabase) throw new Error("Supabase not initialized");
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (error) throw error;
    return data;
};

export const api = {
  auth: {
    getUser: async (): Promise<User | null> => {
      if (isDemoMode()) return DEMO_USER;
      
      if (!supabase) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      return data as User;
    },
    login: async (email: string, password: string) => {
      if (email === 'demo@reviewflow.com') {
          setDemoMode(true);
          return;
      }
      setDemoMode(false);
      
      if (!supabase) throw new Error("No database connection");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    register: async (name: string, email: string, password: string) => {
      setDemoMode(false);
      if (!supabase) throw new Error("No database connection");
      const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { name } } 
      });
      if (error) throw error;
    },
    logout: async () => {
        setDemoMode(false);
        if (supabase) await supabase.auth.signOut();
    },
    loginWithGoogle: async () => {
        if (isDemoMode()) return; // Mock success
        if (!supabase) return;
        await supabase.auth.signInWithOAuth({ 
            provider: 'google',
            options: {
                queryParams: {
                    access_type: 'offline', // Force Refresh Token
                    prompt: 'consent',
                },
                scopes: 'https://www.googleapis.com/auth/business.manage' // GMB Permissions
            }
        });
    },
    connectGoogleBusiness: async () => {
        if (isDemoMode()) return true;
        // Re-trigger OAuth flow to get fresh tokens with business scope
        if (!supabase) return;
        const { data } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/settings',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
                scopes: 'https://www.googleapis.com/auth/business.manage'
            }
        });
        return true;
    },
    updateProfile: async (data: Partial<User> & { password?: string }) => {
        if (isDemoMode()) return data;
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user) throw new Error("Not logged in");
        
        // If password update
        if (data.password) {
            const { error } = await supabase!.auth.updateUser({ password: data.password });
            if (error) throw error;
            delete data.password; // Don't send to DB
        }

        const { error } = await supabase!.from('users').update(data).eq('id', user.id);
        if (error) throw error;
        return data;
    },
    resetPassword: async (email: string) => {
        if (isDemoMode()) return;
        if (supabase) await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/#/login?mode=reset'
        });
    },
    deleteAccount: async () => {
        if (isDemoMode()) return;
        await invoke('delete_account', {});
    }
  },
  organization: {
      get: async (): Promise<Organization | null> => {
          if (isDemoMode()) return DEMO_ORG;

          if (!supabase) return null;
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return null;

          const { data: userProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
          if (!userProfile?.organization_id) return null;

          const { data } = await supabase
            .from('organizations')
            .select(`
                *, 
                locations(*), 
                staff_members(*), 
                offers(*), 
                api_keys(*), 
                webhooks(*)
            `)
            .eq('id', userProfile.organization_id)
            .single();
            
          return data as any;
      },
      update: async (data: Partial<Organization>) => {
          if (isDemoMode()) return;
          const org = await api.organization.get();
          if (!org) return;
          const { error } = await supabase!.from('organizations').update(data).eq('id', org.id);
          if (error) throw error;
      },
      // Capture tokens returned by Google OAuth redirect
      saveGoogleTokens: async () => {
          if (isDemoMode()) return true;
          if (!supabase) return false;
          const { data: { session } } = await supabase.auth.getSession();
          
          // Check if we have provider tokens (only present on initial sign-in/callback)
          if (session?.provider_token) {
              const user = session.user;
              const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
              
              if (profile?.organization_id) {
                  // If we have a refresh token, save it for offline access
                  if (session.provider_refresh_token) {
                      await supabase.from('organizations').update({
                          google_refresh_token: session.provider_refresh_token,
                          integrations: { google: true } // Mark as connected
                      }).eq('id', profile.organization_id);
                      return true;
                  }
              }
          }
          return false;
      },
      generateApiKey: async (name: string) => {
          if (isDemoMode()) return { key: 'sk_demo_123' };
          return await invoke('manage_org_settings', { action: 'generate_api_key', data: { name } });
      },
      revokeApiKey: async (id: string) => {
          if (isDemoMode()) return;
          return await invoke('manage_org_settings', { action: 'revoke_api_key', data: { id } });
      },
      saveWebhook: async (url: string, events: string[]) => {
          if (isDemoMode()) return;
          return await invoke('manage_org_settings', { action: 'save_webhook', data: { url, events } });
      },
      deleteWebhook: async (id: string) => {
          if (isDemoMode()) return;
          return await invoke('manage_org_settings', { action: 'delete_webhook', data: { id } });
      },
      testWebhook: async (id: string) => {
          // Simulation for now, or implement a real ping
          return true;
      },
      simulatePlanChange: async (plan: 'pro' | 'starter') => {
          if (isDemoMode()) {
              DEMO_ORG.subscription_plan = plan;
              return;
          }
          const org = await api.organization.get();
          if (org) await supabase!.from('organizations').update({ subscription_plan: plan }).eq('id', org.id);
      },
      addStaffMember: async (name: string, role: string) => {
          if (isDemoMode()) {
              DEMO_ORG.staff_members?.push({ id: Date.now().toString(), name, role, reviews_count: 0, average_rating: 0, organization_id: 'demo-org-id' });
              return;
          }
          const org = await api.organization.get();
          if (!org) return;
          await supabase!.from('staff_members').insert({
              organization_id: org.id,
              name,
              role,
              reviews_count: 0
          });
      },
      removeStaffMember: async (id: string) => {
          if (isDemoMode()) {
              DEMO_ORG.staff_members = DEMO_ORG.staff_members?.filter(s => s.id !== id);
              return;
          }
          await supabase!.from('staff_members').delete().eq('id', id);
      },
      sendCongratulationEmail: async (id: string) => {
          // Would call an Edge Function ideally
          console.log('Congratulating', id);
      }
  },
  reviews: {
      list: async (filters: any) => {
          if (isDemoMode()) {
              let res = [...DEMO_REVIEWS];
              // Basic filtering for demo
              if (filters.rating && filters.rating !== 'Tout') {
                  const r = parseInt(filters.rating.toString().replace(/\D/g, ''));
                  res = res.filter(rev => rev.rating === r);
              }
              if (filters.status && filters.status !== 'Tout') {
                  res = res.filter(rev => rev.status === filters.status);
              }
              return res;
          }

          if (!supabase) return [];
          const org = await api.organization.get();
          if (!org) return [];

          // Get all location IDs for this org
          const locationIds = org.locations.map(l => l.id);
          if (locationIds.length === 0) return [];

          let query = supabase
            .from('reviews')
            .select('*')
            .in('location_id', locationIds)
            .order('received_at', { ascending: false });

          if (filters.status && filters.status !== 'Tout' && filters.status !== 'all') {
              query = query.eq('status', filters.status);
          }
          
          if (filters.rating && filters.rating !== 'Tout' && filters.rating !== 'all') {
              // Extract number from "5 ★" or just "5"
              const r = parseInt(filters.rating.toString().replace(/\D/g, ''));
              if (!isNaN(r)) query = query.eq('rating', r);
          }

          if (filters.source && filters.source !== 'Tout') {
              query = query.eq('source', filters.source.toLowerCase());
          }

          if (filters.search) {
              query = query.ilike('text', `%${filters.search}%`);
          }

          if (filters.limit) {
              query = query.limit(filters.limit);
          }
          
          if (filters.page) {
              const from = filters.page * (filters.limit || 20);
              const to = from + (filters.limit || 20) - 1;
              query = query.range(from, to);
          }

          const { data, error } = await query;
          if (error) {
              console.error(error);
              return [];
          }
          
          // Map 'text' to 'body' for frontend compatibility if needed
          return data.map((r: any) => ({ ...r, body: r.text }));
      },
      reply: async (reviewId: string, text: string) => {
          if (isDemoMode()) {
              const r = DEMO_REVIEWS.find(r => r.id === reviewId);
              if (r) {
                  r.status = 'sent';
                  r.posted_reply = text;
                  r.replied_at = new Date().toISOString();
              }
              return;
          }
          // Call Edge Function to post to Google
          await invoke('post_google_reply', { reviewId, replyText: text });
      },
      saveDraft: async (reviewId: string, text: string) => {
          if (isDemoMode()) return;
          await supabase!.from('reviews').update({
              status: 'draft',
              ai_reply: { text, needs_manual_validation: true, created_at: new Date().toISOString() }
          }).eq('id', reviewId);
      },
      addNote: async (reviewId: string, text: string) => {
          if (isDemoMode()) return { id: 'note-1', text, author_name: 'Moi', created_at: new Date().toISOString() };
          const { data: review } = await supabase!.from('reviews').select('internal_notes').eq('id', reviewId).single();
          const currentNotes = review?.internal_notes || [];
          
          const newNote = {
              id: Date.now().toString(),
              text,
              author_name: 'Moi', // In real app, fetch current user name
              created_at: new Date().toISOString()
          };
          
          const updatedNotes = [...currentNotes, newNote];
          
          await supabase!.from('reviews').update({ internal_notes: updatedNotes }).eq('id', reviewId);
          return newNote;
      },
      subscribe: (callback: (payload: any) => void) => {
          if (isDemoMode()) return { unsubscribe: () => {} };
          if (!supabase) return { unsubscribe: () => {} };
          return supabase
            .channel('reviews-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, callback)
            .subscribe();
      },
      uploadCsv: async (file: File, locationId: string) => {
          if (isDemoMode()) return 10;
          // Basic CSV parsing and inserting
          const text = await file.text();
          const lines = text.split('\n');
          let count = 0;
          
          for (let i = 1; i < lines.length; i++) { // Skip header
              const cols = lines[i].split(',');
              if (cols.length >= 3) {
                  const [date, author, rating, body] = cols;
                  // Simple insert
                  await supabase!.from('reviews').insert({
                      location_id: locationId,
                      received_at: new Date(date).toISOString(),
                      author_name: author,
                      rating: parseInt(rating),
                      text: body,
                      source: 'direct',
                      status: 'pending'
                  });
                  count++;
              }
          }
          return count;
      }
  },
  ai: {
      generateReply: async (review: Review, config: any) => {
          if (isDemoMode()) {
              return "Bonjour " + review.author_name + ", merci pour votre avis 5 étoiles ! Nous sommes ravis que l'expérience vous ait plu. À bientôt chez " + DEMO_ORG.name + ".";
          }
          const { text } = await invoke('ai_generate', {
              task: 'generate_reply',
              context: { review, ...config }
          });
          return text;
      },
      generateSocialPost: async (review: Review, platform: string) => {
          if (isDemoMode()) return "🌟 Avis 5 étoiles ! Merci " + review.author_name + " pour ce retour incroyable. Toute l'équipe est motivée ! #Reviewflow #CustomerLove";
          const { text } = await invoke('ai_generate', {
              task: 'social_post',
              context: { review, platform }
          });
          return text;
      },
      previewBrandVoice: async (config: any, review: any) => {
          if (isDemoMode()) return "Ceci est un exemple de réponse généré avec le ton " + config.tone;
          const { text } = await invoke('ai_generate', {
              task: 'generate_reply',
              context: { review, ...config } // Re-use reply logic for voice test
          });
          return text;
      },
      runCustomTask: async (payload: any) => {
          if (isDemoMode()) return { result: "Demo Mode Custom Task Executed" };
          return await invoke('ai_generate', {
              task: payload.task,
              context: payload.review || payload.context
          });
      }
  },
  analytics: {
      getOverview: async (period: string = '30j'): Promise<AnalyticsSummary> => {
          if (isDemoMode()) return DEMO_STATS;

          const org = await api.organization.get();
          if (!org || org.locations.length === 0) {
              return {
                  period,
                  total_reviews: 0,
                  average_rating: 0,
                  response_rate: 0,
                  nps_score: 0,
                  global_rating: 0,
                  sentiment_distribution: { positive: 0, neutral: 0, negative: 0 },
                  volume_by_date: [],
                  top_themes_positive: [],
                  top_themes_negative: [],
                  top_keywords: []
              };
          }

          // 1. FAST SERVER-SIDE STATS (KPIs via RPC)
          // Appel de la fonction SQL optimisée 'get_dashboard_stats'
          const { data: kpi, error: rpcError } = await supabase!.rpc('get_dashboard_stats', { org_id: org.id });
          
          if (rpcError) console.warn("RPC get_dashboard_stats error:", rpcError);

          // 2. Fetch Recent Data for Charts (Last 30 Days)
          // On ne charge pas tout l'historique pour l'affichage des graphiques
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          
          const { data: recentReviews } = await supabase!
            .from('reviews')
            .select('rating, received_at, status, analysis')
            .in('location_id', org.locations.map(l => l.id))
            .gte('received_at', startDate.toISOString())
            .order('received_at', { ascending: true });

          const reviews = recentReviews || [];
          
          // Calculate volume chart locally
          const volumeMap = new Map<string, number>();
          reviews.forEach(r => {
              const d = new Date(r.received_at).toLocaleDateString();
              volumeMap.set(d, (volumeMap.get(d) || 0) + 1);
          });
          
          const volumeByDate = Array.from(volumeMap.entries())
            .map(([date, count]) => ({ date, count }))
            .slice(-7); // Keep last 7 days for the chart view

          // Use RPC KPIs if available, else fallback to calculation from recent
          const total = kpi?.total_reviews ?? reviews.length;
          const avg = kpi?.average_rating ?? (reviews.length > 0 ? reviews.reduce((a, b) => a + b.rating, 0) / reviews.length : 0);
          const responseRate = kpi?.response_rate ?? 0;
          const nps = kpi?.nps_score ?? 0;

          // Simple sentiment from recent reviews
          const pos = reviews.filter(r => r.rating >= 4).length;
          const neg = reviews.filter(r => r.rating <= 2).length;
          const neu = reviews.length - pos - neg;
          const totalRecent = reviews.length || 1;

          return {
              period,
              total_reviews: total,
              average_rating: parseFloat(avg.toFixed(1)),
              response_rate: responseRate,
              nps_score: nps,
              global_rating: parseFloat(avg.toFixed(1)),
              sentiment_distribution: {
                  positive: pos / totalRecent,
                  neutral: neu / totalRecent,
                  negative: neg / totalRecent
              },
              volume_by_date: volumeByDate,
              top_themes_positive: [{ name: 'Service', weight: 0.8 }, { name: 'Qualité', weight: 0.7 }],
              top_themes_negative: [{ name: 'Prix', weight: 0.4 }],
              top_keywords: [{ keyword: 'Top', count: 5 }]
          };
      }
  },
  competitors: {
      list: async () => {
          if (isDemoMode()) return DEMO_COMPETITORS;
          if (!supabase) return [];
          const { data } = await supabase.from('competitors').select('*');
          return data || [];
      },
      create: async (data: Partial<Competitor>) => {
          if (isDemoMode()) {
              DEMO_COMPETITORS.push({ id: 'new-comp', ...data } as Competitor);
              return;
          }
          if (!supabase) return;
          const org = await api.organization.get();
          await supabase.from('competitors').insert({ ...data, organization_id: org?.id });
      },
      delete: async (id: string) => {
          if (isDemoMode()) return;
          await supabase!.from('competitors').delete().eq('id', id);
      },
      // Uses the Real Google Places Edge Function
      autoDiscover: async (radius: number, sector: string, lat: number, lng: number) => {
          if (isDemoMode()) return DEMO_COMPETITORS;
          const { results } = await invoke('fetch_places', {
              latitude: lat,
              longitude: lng,
              radius: radius,
              keyword: sector
          });
          return results;
      },
      // Uses the Real Gemini Analysis Edge Function
      getDeepAnalysis: async () => {
          if (isDemoMode()) return { trends: ["Montée des prix", "Demande bio"], swot: { strengths: ["Localisation"], weaknesses: ["Prix"] } };
          const competitors = await api.competitors.list();
          const data = await invoke('analyze_market', {
              competitors: competitors,
              sector: 'Commerce',
              location: 'Locale'
          });
          return data;
      }
  },
  automation: {
      getWorkflows: async () => {
          const org = await api.organization.get();
          return org?.workflows || [];
      },
      saveWorkflow: async (wf: WorkflowRule) => {
          if (isDemoMode()) return;
          const org = await api.organization.get();
          if (!org) return;
          
          let workflows = org.workflows || [];
          const idx = workflows.findIndex(w => w.id === wf.id);
          if (idx >= 0) workflows[idx] = wf;
          else workflows.push(wf);
          
          await supabase!.from('organizations').update({ workflows }).eq('id', org.id);
      },
      deleteWorkflow: async (id: string) => {
          if (isDemoMode()) return;
          const org = await api.organization.get();
          if (!org) return;
          const workflows = org.workflows?.filter(w => w.id !== id);
          await supabase!.from('organizations').update({ workflows }).eq('id', org.id);
      },
      run: async () => {
          if (isDemoMode()) return { processed: 5, actions: 5 };
          const { processed, actions } = await invoke('process_reviews', {});
          return { processed, actions };
      }
  },
  notifications: {
      list: async () => {
          // Placeholder for real notification system
          return [];
      },
      markAllRead: async () => {},
      sendTestEmail: async () => {
          if (isDemoMode()) return;
          const user = await api.auth.getUser();
          await invoke('send_campaign_emails', {
              emails: [user?.email],
              subject: 'Test Notification Reviewflow',
              html: '<h1>Ceci est un test</h1><p>Le système de mail fonctionne.</p>'
          });
      }
  },
  team: {
      list: async () => {
          if (isDemoMode()) return [DEMO_USER];
          const org = await api.organization.get();
          if (!org) return [];
          const { data } = await supabase!.from('users').select('*').eq('organization_id', org.id);
          return data || [];
      },
      invite: async (email: string, role: string) => {
          if (isDemoMode()) return;
          await invoke('invite_user', { email, role });
      }
  },
  company: {
      search: async (query: string) => {
          // Mock SIRET search or connect to Pappers/Societe.com API via Edge Function
          return [{ legal_name: query + ' (Démo)', siret: '000000000', address: 'France' }];
      }
  },
  billing: {
      getInvoices: async () => {
          if (isDemoMode()) return [];
          const { invoices } = await invoke('get_invoices', {});
          return invoices || [];
      },
      createCheckoutSession: async (plan: string) => {
          if (isDemoMode()) return 'https://example.com/checkout';
          const { url } = await invoke('create_checkout', { 
              plan,
              successUrl: window.location.origin + '/#/billing?success=true',
              cancelUrl: window.location.origin + '/#/billing?canceled=true'
          });
          return url;
      },
      createPortalSession: async () => {
          if (isDemoMode()) return 'https://example.com/portal';
          const { url } = await invoke('create_portal', {
              returnUrl: window.location.origin + '/#/billing'
          });
          return url;
      }
  },
  activity: {
      getRecent: async () => {
          const reviews = await api.reviews.list({ limit: 5 });
          return reviews.map(r => ({
              id: r.id,
              type: 'review',
              text: `Avis ${r.rating}★ reçu`,
              time: new Date(r.received_at).toLocaleTimeString(),
              location: 'Google'
          }));
      }
  },
  onboarding: {
      checkStatus: async (): Promise<SetupStatus> => {
          const org = await api.organization.get();
          const reviews = await api.reviews.list({ limit: 1 });
          
          return {
              googleConnected: !!org?.integrations.google,
              brandVoiceConfigured: !!org?.brand?.tone,
              firstReviewReplied: reviews.length > 0 && reviews[0].status === 'sent',
              completionPercentage: isDemoMode() ? 100 : 0 
          };
      }
  },
  seedCloudDatabase: async () => {
      if (isDemoMode()) return;
      if (!supabase) return;
      
      const org = await api.organization.get();
      if (!org) throw new Error("Organisation introuvable.");

      console.log("Seeding data for org:", org.id);

      // 1. Locations
      if (!org.locations || org.locations.length === 0) {
          const { data: locs, error } = await supabase.from('locations').insert([
            { organization_id: org.id, name: 'Salon Éclat Coiffure', address: '12 Rue de la République', city: 'Lyon', country: 'France', connection_status: 'connected' },
            { organization_id: org.id, name: 'Le Petit Bistro', address: '45 Avenue Jean Jaurès', city: 'Paris', country: 'France', connection_status: 'disconnected' }
          ]).select();
          
          if (error) throw error;
          
          // Refresh org locations
          const { data: locations } = await supabase.from('locations').select('*').eq('organization_id', org.id);
          const locId = locations?.[0]?.id;

          if (locId) {
              // 2. Reviews
              const reviews = [
                  { location_id: locId, rating: 5, text: "Service impeccable, je recommande !", author_name: "Sophie Martin", source: "google", status: "pending", received_at: new Date().toISOString() },
                  { location_id: locId, rating: 4, text: "Très bon moment, un peu d'attente.", author_name: "Marc Dubourg", source: "tripadvisor", status: "replied", posted_reply: "Merci Marc !", received_at: new Date(Date.now() - 86400000).toISOString() },
                  { location_id: locId, rating: 2, text: "Déçu par l'accueil.", author_name: "Jean Dupont", source: "facebook", status: "pending", received_at: new Date(Date.now() - 172800000).toISOString() }
              ];
              await supabase.from('reviews').insert(reviews);
          }
      }

      // 3. Competitors
      const { count: compCount } = await supabase.from('competitors').select('*', { count: 'exact', head: true }).eq('organization_id', org.id);
      if (compCount === 0) {
          await supabase.from('competitors').insert([
              { organization_id: org.id, name: 'Concurrent A', rating: 4.5, review_count: 120, address: 'Paris' },
              { organization_id: org.id, name: 'Concurrent B', rating: 3.8, review_count: 50, address: 'Lyon' }
      ]);
  }

  // 4. Staff
  const { count: staffCount } = await supabase.from('staff_members').select('*', { count: 'exact', head: true }).eq('organization_id', org.id);
  if (staffCount === 0) {
      await supabase.from('staff_members').insert([
          { organization_id: org.id, name: 'Thomas', role: 'Manager' },
          { organization_id: org.id, name: 'Julie', role: 'Serveuse' }
      ]);
  }
  
  // 5. Offers
  const { count: offerCount } = await supabase.from('offers').select('*', { count: 'exact', head: true }).eq('organization_id', org.id);
  if (offerCount === 0) {
      await supabase.from('offers').insert([
          { organization_id: org.id, title: 'Café Offert', description: 'Pour tout repas > 15€', code_prefix: 'CAFE', active: true }
      ]);
  }
},
locations: {
  create: async (data: any) => {
      if (isDemoMode()) return;
      const org = await api.organization.get();
      await supabase!.from('locations').insert({ ...data, organization_id: org?.id });
  },
  update: async (id: string, data: any) => {
      if (isDemoMode()) return;
      await supabase!.from('locations').update(data).eq('id', id);
  },
  delete: async (id: string) => {
      if (isDemoMode()) return;
      await supabase!.from('locations').delete().eq('id', id);
  }
},
google: {
  fetchAllGoogleLocations: async () => {
      if (isDemoMode()) return [];
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session?.provider_token) throw new Error("Google Token missing. Reconnect Google.");
      
      const locations = await invoke('fetch_google_locations', { accessToken: session.provider_token });
      return locations;
  },
  syncReviewsForLocation: async (id: string, ref: string) => {
      if (isDemoMode()) return 10;
      const org = await api.organization.get();
      const { count } = await invoke('fetch_google_reviews', {
          locationId: id,
          googleLocationName: ref,
          organizationId: org?.id
      });
      return count;
  }
},
public: {
  getLocationInfo: async (id: string) => {
      if (isDemoMode()) return DEMO_ORG.locations?.[0];
      const { data } = await supabase!.from('locations').select('*').eq('id', id).single();
      return data;
  },
  getActiveOffer: async (id: string, rating: number) => {
      if (isDemoMode()) return DEMO_ORG.offers?.[0];
      const { data } = await supabase!
        .from('offers')
        .select('*')
        .eq('active', true)
        .lte('trigger_rating', rating)
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid error if null
      
      // Check association via organization if needed, for simplicity assume offers are org-wide
      return data;
  },
  submitFeedback: async (id: string, rating: number, text: string, contact: string, tags: string[], staff?: string) => {
      if (isDemoMode()) return;
      await invoke('submit_review', { locationId: id, rating, feedback: text, contact, tags, staffName: staff });
  },
  getWidgetReviews: async (id: string) => {
      if (isDemoMode()) return DEMO_REVIEWS.filter(r => r.rating >= 4);
      const { data } = await supabase!
        .from('reviews')
        .select('*')
        .eq('location_id', id)
        .gte('rating', 4) // Only show good reviews on widget
        .order('received_at', { ascending: false })
        .limit(20);
      return data || [];
  }
},
campaigns: {
  send: async (type: string, recipient: string, subject: string, content: string) => {
      if (isDemoMode()) return;
      // If SMS, would use Twilio/other. For now assuming Email via Resend
      if (type === 'email') {
          await invoke('send_campaign_emails', {
              emails: [recipient],
              subject,
              html: content
          });
      }
  }
},
customers: {
  list: async (): Promise<Customer[]> => {
      if (isDemoMode()) return [];
      // Mock or real table if implemented
      return [];
  }
},
offers: {
  generateCoupon: async (offerId: string, email: string): Promise<any> => {
      if (isDemoMode()) return { code: 'DEMO-123', offer_title: 'Demo Offer' };
      return await invoke('manage_coupons', { action: 'create', offerId, email });
  },
  validate: async (code: string) => {
      if (isDemoMode()) return { valid: true, discount: 'Café Offert' };
      return await invoke('manage_coupons', { action: 'validate', code });
  },
  redeem: async (code: string) => {
      if (isDemoMode()) return { success: true };
      return await invoke('manage_coupons', { action: 'redeem', code });
  }
},
admin: {
  getStats: async () => {
      return { 
          mrr: '12 500€', 
          active_tenants: 142,
          total_reviews_processed: 45200,
          tenants: [
              { id: '1', name: 'Restaurant Le Gourmet', admin_email: 'contact@legourmet.fr', plan: 'pro', usage: 450, mrr: '89€' },
              { id: '2', name: 'Garage Auto Fix', admin_email: 'service@autofix.com', plan: 'starter', usage: 28, mrr: '49€' },
              { id: '3', name: 'Salon Beauty', admin_email: 'hello@beauty.com', plan: 'pro', usage: 120, mrr: '89€' }
          ]
      };
  }
}
};
