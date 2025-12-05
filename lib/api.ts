
import { supabase } from './supabase';
import { Review, User, Organization, SetupStatus, Competitor, WorkflowRule, AnalyticsSummary, Customer, Offer, StaffMember, MarketReport, SocialPost, SocialAccount, SocialPlatform, PublicProfileConfig, Location, ReviewTimelineEvent, AppNotification } from '../types';
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
      
      const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
      
      return {
          id: user.id,
          email: user.email!,
          name: (data?.name) || (user.user_metadata?.name) || 'Utilisateur',
          avatar: data?.avatar || '',
          role: (data?.role) || 'admin', 
          organizations: data?.organizations || [],
          organization_id: data?.organization_id
      };
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
        if (isDemoMode()) return;
        if (!supabase) return;
        await supabase.auth.signInWithOAuth({ 
            provider: 'google',
            options: {
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
                scopes: 'https://www.googleapis.com/auth/business.manage'
            }
        });
    },
    connectGoogleBusiness: async () => {
        if (isDemoMode()) return true;
        if (!supabase) return;
        // On redirige vers les settings avec l'onglet integrations ouvert
        const { data } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/settings?tab=integrations',
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
        
        if (data.password) {
            const { error } = await supabase!.auth.updateUser({ password: data.password });
            if (error) throw error;
            delete data.password;
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
          if (isDemoMode()) {
              if (DEMO_ORG.locations && DEMO_ORG.locations.length > 0 && !DEMO_ORG.locations[0].public_config) {
                  DEMO_ORG.locations[0].public_config = {
                      template: 'modern',
                      primaryColor: '#4f46e5',
                      showReviews: true,
                      showMap: true,
                      customCta: { enabled: true, label: 'Réserver', url: 'https://cal.com' },
                      stats: { views: 1240, clicks: 85 }
                  };
              }
              return DEMO_ORG;
          }

          if (!supabase) return null;
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return null;

          const { data: userProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle();
          if (!userProfile?.organization_id) return null;

          // Note: jsonb columns must be handled carefully. Using * is safe.
          const { data } = await supabase
            .from('organizations')
            .select(`
                *, 
                locations(*), 
                staff_members(*), 
                offers(*)
            `)
            .eq('id', userProfile.organization_id)
            .single();
            
          return data as any;
      },
      create: async (name: string, industry: string) => {
          if (isDemoMode()) return;
          if (!supabase) return;
          
          const user = await api.auth.getUser();
          if (!user) throw new Error("Not logged in");

          // Ajout de owner_id pour passer la politique RLS
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({ 
                name, 
                industry, 
                subscription_plan: 'free',
                owner_id: user.id 
            })
            .select()
            .single();
            
          if (orgError) throw orgError;

          const { error: userError } = await supabase
            .from('users')
            .upsert({ 
                id: user.id,
                email: user.email,
                name: user.name,
                organization_id: org.id, 
                role: 'admin' 
            });

          if (userError) throw userError;
          
          return org;
      },
      update: async (data: Partial<Organization>) => {
          if (isDemoMode()) return;
          const org = await api.organization.get();
          if (!org) return;
          const { error } = await supabase!.from('organizations').update(data).eq('id', org.id);
          if (error) throw error;
      },
      saveGoogleTokens: async () => {
          if (isDemoMode()) return true;
          if (!supabase) return false;
          
          // 1. Get Session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.provider_token) {
              const user = session.user;
              // 2. Get User's Organization ID
              const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle();
              
              if (profile?.organization_id) {
                  // 3. Get Current Integrations State
                  const { data: org } = await supabase.from('organizations').select('integrations').eq('id', profile.organization_id).single();
                  const currentIntegrations = org?.integrations || {};

                  // 4. Update Organization with Tokens AND Status
                  const updates: any = {
                      integrations: { ...currentIntegrations, google: true }
                  };

                  // Only update refresh token if a new one is provided (it's not always sent on re-login)
                  if (session.provider_refresh_token) {
                      updates.google_refresh_token = session.provider_refresh_token;
                  }

                  const { error } = await supabase.from('organizations').update(updates).eq('id', profile.organization_id);
                  
                  if (!error) {
                      console.log("✅ Google Tokens & Status Saved to DB");
                      return true;
                  } else {
                      console.error("❌ Failed to save Google Tokens", error);
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
          console.log('Congratulating', id);
      }
  },
  reviews: {
      list: async (filters: any) => {
          if (isDemoMode()) {
              let res = [...DEMO_REVIEWS];
              if (filters.rating && filters.rating !== 'Tout') {
                  const r = parseInt(filters.rating.toString().replace(/\D/g, ''));
                  res = res.filter(rev => rev.rating === r);
              }
              if (filters.status && filters.status !== 'Tout') {
                  res = res.filter(rev => rev.status === filters.status);
              }
              res = res.map(r => ({
                  ...r,
                  tags: r.tags || (Math.random() > 0.7 ? (r.rating < 3 ? ['Urgent'] : r.rating === 5 ? ['VIP'] : []) : [])
              }));
              return res;
          }

          if (!supabase) return [];
          const org = await api.organization.get();
          if (!org) return [];

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
              author_name: 'Moi',
              created_at: new Date().toISOString()
          };
          
          const updatedNotes = [...currentNotes, newNote];
          await supabase!.from('reviews').update({ internal_notes: updatedNotes }).eq('id', reviewId);
          return newNote;
      },
      addTag: async (reviewId: string, tag: string) => {
          if (isDemoMode()) {
              const r = DEMO_REVIEWS.find(r => r.id === reviewId);
              if (r) r.tags = [...(r.tags || []), tag];
              return;
          }
          const { data: review } = await supabase!.from('reviews').select('tags').eq('id', reviewId).single();
          const currentTags = review?.tags || [];
          if (!currentTags.includes(tag)) {
              await supabase!.from('reviews').update({ tags: [...currentTags, tag] }).eq('id', reviewId);
          }
      },
      removeTag: async (reviewId: string, tag: string) => {
          if (isDemoMode()) {
              const r = DEMO_REVIEWS.find(r => r.id === reviewId);
              if (r) r.tags = r.tags?.filter(t => t !== tag);
              return;
          }
          const { data: review } = await supabase!.from('reviews').select('tags').eq('id', reviewId).single();
          const currentTags = review?.tags || [];
          const newTags = currentTags.filter((t: string) => t !== tag);
          await supabase!.from('reviews').update({ tags: newTags }).eq('id', reviewId);
      },
      getTimeline: (review: Review): ReviewTimelineEvent[] => {
          const events: ReviewTimelineEvent[] = [];
          
          events.push({
              id: 'evt_created',
              type: 'review_created',
              date: review.received_at,
              actor_name: review.author_name,
              content: 'Avis reçu'
          });

          if (review.analysis) {
              const analysisTime = new Date(new Date(review.received_at).getTime() + 1000 * 60).toISOString();
              events.push({
                  id: 'evt_analysis',
                  type: 'ai_analysis',
                  date: analysisTime,
                  actor_name: 'System AI',
                  content: `Analyse terminée: ${review.analysis.sentiment} - ${review.analysis.emotion || ''}`
              });
          }

          if (review.ai_reply?.created_at) {
              events.push({
                  id: 'evt_draft',
                  type: 'draft_generated',
                  date: review.ai_reply.created_at,
                  actor_name: 'Gemini',
                  content: 'Brouillon de réponse généré'
              });
          }

          if (review.internal_notes) {
              review.internal_notes.forEach(note => {
                  events.push({
                      id: note.id,
                      type: 'note',
                      date: note.created_at,
                      actor_name: note.author_name,
                      content: note.text
                  });
              });
          }

          if (review.replied_at && review.status === 'sent') {
              events.push({
                  id: 'evt_replied',
                  type: 'reply_published',
                  date: review.replied_at,
                  actor_name: 'Moi',
                  content: 'Réponse publiée'
              });
          }

          return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
          const text = await file.text();
          const lines = text.split('\n');
          let count = 0;
          
          for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',');
              if (cols.length >= 3) {
                  const [date, author, rating, body] = cols;
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
              return "Bonjour " + review.author_name + ", merci pour votre avis 5 étoiles ! Nous sommes ravis que l'expérience vous ait plu.";
          }
          const { text } = await invoke('ai_generate', {
              task: 'generate_reply',
              context: { review, ...config }
          });
          return text;
      },
      generateSocialPost: async (review: Review, platform: string) => {
          if (isDemoMode()) return "🌟 Avis 5 étoiles ! Merci " + review.author_name + " pour ce retour incroyable. #Reviewflow #CustomerLove";
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
              context: { review, ...config }
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

          const { data: kpi, error: rpcError } = await supabase!.rpc('get_dashboard_stats', { org_id: org.id });
          if (rpcError) console.warn("RPC get_dashboard_stats error:", rpcError);

          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          
          const { data: recentReviews } = await supabase!
            .from('reviews')
            .select('rating, received_at, status, analysis')
            .in('location_id', org.locations.map(l => l.id))
            .gte('received_at', startDate.toISOString())
            .order('received_at', { ascending: true });

          const reviews = recentReviews || [];
          
          const volumeMap = new Map<string, number>();
          reviews.forEach(r => {
              const d = new Date(r.received_at).toLocaleDateString();
              volumeMap.set(d, (volumeMap.get(d) || 0) + 1);
          });
          
          const volumeByDate = Array.from(volumeMap.entries())
            .map(([date, count]) => ({ date, count }))
            .slice(-7);

          const total = kpi?.total_reviews ?? reviews.length;
          const avg = kpi?.average_rating ?? (reviews.length > 0 ? reviews.reduce((a, b) => a + b.rating, 0) / reviews.length : 0);
          const responseRate = kpi?.response_rate ?? 0;
          const nps = kpi?.nps_score ?? 0;

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
      getDeepAnalysis: async (sector?: string, location?: string, competitors?: Competitor[]) => {
          const comps = competitors || await api.competitors.list();
          
          if (isDemoMode()) {
              return { 
                  trends: ["Montée des prix généralisée dans le secteur " + (sector || "local"), "Demande croissante pour des produits bio/locaux"], 
                  swot: { 
                      strengths: ["Bonne réputation locale", "Qualité de service"], 
                      weaknesses: ["Prix perçus comme élevés", "Temps d'attente"],
                      opportunities: ["Développer la livraison", "Partenariats locaux"],
                      threats: ["Nouveaux entrants agressifs sur les prix"]
                  },
                  competitors_detailed: comps.slice(0, 3).map(c => ({
                      name: c.name,
                      last_month_growth: "+5%",
                      sentiment_trend: "Stable",
                      top_complaint: "Prix"
                  }))
              };
          }
          
          const data = await invoke('analyze_market', {
              competitors: comps,
              sector: sector || 'Commerce',
              location: location || 'Locale'
          });
          return data;
      },
      saveReport: async (report: Omit<MarketReport, 'id'>) => {
          if (isDemoMode()) {
              const saved = JSON.parse(localStorage.getItem('demo_market_reports') || '[]');
              saved.push({ ...report, id: Date.now().toString() });
              localStorage.setItem('demo_market_reports', JSON.stringify(saved));
              return;
          }
          try {
              if (supabase) await supabase.from('market_reports').insert(report);
          } catch (e) {
              const saved = JSON.parse(localStorage.getItem('market_reports') || '[]');
              saved.push({ ...report, id: Date.now().toString() });
              localStorage.setItem('market_reports', JSON.stringify(saved));
          }
      },
      getReports: async (): Promise<MarketReport[]> => {
          if (isDemoMode()) {
              return JSON.parse(localStorage.getItem('demo_market_reports') || '[]');
          }
          try {
              if (supabase) {
                  const { data, error } = await supabase.from('market_reports').select('*').order('created_at', { ascending: false });
                  if (!error) return data || [];
                  throw error;
              }
              return [];
          } catch (e) {
              return JSON.parse(localStorage.getItem('market_reports') || '[]');
          }
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
      list: async (): Promise<AppNotification[]> => {
          if (isDemoMode()) {
              return [
                  { id: '1', type: 'info', title: 'Nouvelle fonctionnalité', message: 'Le module concurrents est disponible !', created_at: new Date().toISOString(), read: false },
                  { id: '2', type: 'success', title: 'Rapport Hebdo', message: 'Votre rapport de performance est prêt.', created_at: new Date().toISOString(), read: true }
              ];
          }
          // Real Implementation could fetch from a notifications table or edge function
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
          return reviews.map((r: any) => ({
              id: r.id,
              type: 'review',
              text: `Nouvel avis de ${r.author_name} (${r.rating}★)`,
              location: 'Google',
              time: new Date(r.received_at).toLocaleDateString()
          }));
      }
  },
  google: {
      fetchAllGoogleLocations: async () => {
          if (isDemoMode()) return [{ name: 'locations/123', title: 'Demo Google Loc', storeCode: 'STORE-1', address: '123 Demo St' }];
          if (!supabase) return [];
          const { data } = await supabase.auth.getSession();
          const token = data.session?.provider_token || data.session?.access_token; 
          const result = await invoke('fetch_google_locations', { accessToken: token }); 
          return result || [];
      },
      syncReviewsForLocation: async (locationId: string, googleLocationName: string) => {
          if (isDemoMode()) return 5;
          const org = await api.organization.get();
          const res = await invoke('fetch_google_reviews', { 
              locationId, 
              googleLocationName,
              organizationId: org?.id 
          });
          return res.count || 0;
      }
  },
  locations: {
      create: async (data: Partial<Location>) => {
          if (isDemoMode()) {
              DEMO_ORG.locations.push({ ...data, id: 'loc-new-' + Date.now() } as any);
              return;
          }
          const org = await api.organization.get();
          if (!org) return;
          await supabase!.from('locations').insert({ ...data, organization_id: org.id });
      },
      update: async (id: string, data: Partial<Location>) => {
          if (isDemoMode()) {
              const idx = DEMO_ORG.locations.findIndex(l => l.id === id);
              if (idx >= 0) DEMO_ORG.locations[idx] = { ...DEMO_ORG.locations[idx], ...data };
              return;
          }
          await supabase!.from('locations').update(data).eq('id', id);
      },
      delete: async (id: string) => {
          if (isDemoMode()) {
              DEMO_ORG.locations = DEMO_ORG.locations.filter(l => l.id !== id);
              return;
          }
          await supabase!.from('locations').delete().eq('id', id);
      },
      importFromGoogle: async () => {
          if (isDemoMode()) return 2;
          return 0;
      }
  },
  onboarding: {
      checkStatus: async (): Promise<SetupStatus> => {
          // Si mode demo, on renvoie "partiellement" complété pour que l'utilisateur puisse tester les boutons
          if (isDemoMode()) return { googleConnected: true, brandVoiceConfigured: false, firstReviewReplied: true, completionPercentage: 66 };
          
          if (!supabase) return { googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 };

          // Fetch fresh org data directly to ensure no caching issues
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return { googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 };

          const { data: userProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
          if (!userProfile?.organization_id) return { googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 };

          const { data: org } = await supabase
            .from('organizations')
            .select('integrations, brand')
            .eq('id', userProfile.organization_id)
            .single();

          if (!org) return { googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 };
          
          // Check Google
          const googleConnected = !!(org.integrations && (org.integrations as any).google === true);
          
          // Check Brand - STRICTER CHECK
          // Il ne suffit pas d'avoir un ton par défaut, il faut avoir configuré une description ou une base de connaissances
          const brandVoiceConfigured = !!(org.brand && (org.brand as any).tone && ((org.brand as any).description || (org.brand as any).knowledge_base));
          
          // Check Reviews (Sent)
          // We check if ANY review has 'sent' status in reviews table linked to this org's locations
          // First get location IDs
          const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', userProfile.organization_id);
          const locationIds = locations?.map(l => l.id) || [];
          
          let firstReviewReplied = false;
          if (locationIds.length > 0) {
              const { count } = await supabase
                .from('reviews')
                .select('*', { count: 'exact', head: true })
                .in('location_id', locationIds)
                .eq('status', 'sent');
              firstReviewReplied = (count || 0) > 0;
          }
          
          const steps = [googleConnected, brandVoiceConfigured, firstReviewReplied];
          const completionPercentage = Math.round((steps.filter(Boolean).length / steps.length) * 100);
          
          return { googleConnected, brandVoiceConfigured, firstReviewReplied, completionPercentage };
      }
  },
  seedCloudDatabase: async () => {
      await new Promise(r => setTimeout(r, 2000));
  },
  campaigns: {
      send: async (type: 'sms'|'email', recipient: string, subject: string, content: string) => {
          if (isDemoMode()) return;
          await invoke('send_campaign_emails', {
              emails: [recipient],
              subject,
              html: content
          });
      }
  },
  public: {
      getLocationInfo: async (id: string) => {
          if (isDemoMode()) return DEMO_ORG.locations.find(l => l.id === id);
          if (!supabase) return null;
          const { data } = await supabase.from('locations').select('*').eq('id', id).single();
          return data;
      },
      getActiveOffer: async (locationId: string, score: number) => {
          if (isDemoMode()) return null;
          return null;
      },
      submitFeedback: async (locationId: string, rating: number, feedback: string, contact: string, tags: string[], staffName?: string) => {
          if (isDemoMode()) return;
          await invoke('submit_review', { locationId, rating, feedback, contact, tags, staffName });
      },
      getWidgetReviews: async (locationId: string) => {
          if (isDemoMode()) return DEMO_REVIEWS;
          if (!supabase) return [];
          const { data } = await supabase.from('reviews').select('*').eq('location_id', locationId).eq('status', 'sent').order('received_at', { ascending: false }).limit(10);
          return data || [];
      }
  },
  offers: {
      create: async (data: any) => {
          if (isDemoMode()) return;
          const org = await api.organization.get();
          await supabase!.from('offers').insert({ ...data, organization_id: org?.id });
      },
      generateCoupon: async (offerId: string, email: string) => {
          if (isDemoMode()) return { code: 'DEMO-123', offer_title: 'Offre Démo', discount_detail: '-10%', expires_at: new Date().toISOString(), status: 'active' };
          return await invoke('manage_coupons', { action: 'create', offerId, email });
      },
      distributeCampaign: async (offerId: string, segment: string, channel: string) => {
          if (isDemoMode()) return { sent_count: 150 };
          return { sent_count: 0 };
      },
      validate: async (code: string) => {
          if (isDemoMode()) return { valid: true, discount: 'Café Offert' };
          return await invoke('manage_coupons', { action: 'validate', code });
      },
      redeem: async (code: string) => {
          if (isDemoMode()) return;
          return await invoke('manage_coupons', { action: 'redeem', code });
      }
  },
  customers: {
      list: async () => {
          if (isDemoMode()) return [
              { id: 'c1', name: 'Sophie Martin', email: 'sophie@mail.com', source: 'Google', last_interaction: new Date().toISOString(), total_reviews: 3, average_rating: 4.8, status: 'promoter', ltv_estimate: 450, stage: 'loyal', tags: ['VIP', 'Habitué'] }
          ] as Customer[];
          if (!supabase) return [];
          const { data } = await supabase.from('customers').select('*');
          return data || [];
      },
      update: async (id: string, data: Partial<Customer>) => {
          if (isDemoMode()) return;
          await supabase!.from('customers').update(data).eq('id', id);
      },
      enrichProfile: async (id: string) => {
          if (isDemoMode()) return { profile: "Client exigent mais fidèle", suggestion: "Proposer une table calme", last_updated: new Date().toISOString() };
          return { profile: "Analyse IA...", suggestion: "...", last_updated: new Date().toISOString() };
      }
  },
  admin: {
      getStats: async () => {
          if (isDemoMode()) return { mrr: '12 450€', active_tenants: 142, total_reviews_processed: 45890, tenants: [] };
          return { mrr: '0€', active_tenants: 0, total_reviews_processed: 0, tenants: [] };
      }
  },
  social: {
      getPosts: async () => {
          if (isDemoMode()) return [];
          if (!supabase) return [];
          const { data } = await supabase.from('social_posts').select('*');
          return data || [];
      },
      schedulePost: async (post: Partial<SocialPost>) => {
          if (isDemoMode()) return;
          const org = await api.organization.get();
          await supabase!.from('social_posts').insert({ ...post, organization_id: org?.id, status: 'scheduled' });
      },
      deletePost: async (id: string) => {
          if (isDemoMode()) return;
          await supabase!.from('social_posts').delete().eq('id', id);
      },
      connectAccount: async (platform: SocialPlatform, status: boolean) => {
          if (isDemoMode()) return;
      }
  },
  global: {
      search: async (query: string) => {
          const lowerQuery = query.toLowerCase();
          
          if (isDemoMode()) {
              // Mock search
              const results = [];
              if ('sophie'.includes(lowerQuery)) results.push({ type: 'customer', title: 'Sophie Martin', subtitle: 'Client VIP', link: '/customers' });
              if ('avis'.includes(lowerQuery)) results.push({ type: 'review', title: 'Avis de Jean', subtitle: '5 étoiles - "Super..."', link: '/inbox' });
              if ('facture'.includes(lowerQuery)) results.push({ type: 'page', title: 'Facturation', subtitle: 'Paramètres', link: '/billing' });
              return results;
          }

          if (!supabase) return [];
          
          // Parallel search in DB
          const [customers, reviews] = await Promise.all([
              supabase.from('customers').select('id, name, email').ilike('name', `%${query}%`).limit(3),
              supabase.from('reviews').select('id, author_name, text').ilike('text', `%${query}%`).limit(3)
          ]);

          const results: any[] = [];
          
          customers.data?.forEach((c: any) => results.push({ 
              type: 'customer', 
              title: c.name, 
              subtitle: c.email, 
              link: `/customers` 
          }));

          reviews.data?.forEach((r: any) => results.push({ 
              type: 'review', 
              title: `Avis de ${r.author_name}`, 
              subtitle: r.text.substring(0, 30) + '...', 
              link: `/inbox?reviewId=${r.id}` 
          }));

          // Static Pages Search
          const pages = [
              { name: 'Tableau de bord', path: '/dashboard' },
              { name: 'Boîte de réception', path: '/inbox' },
              { name: 'Clients', path: '/customers' },
              { name: 'Paramètres', path: '/settings' },
              { name: 'Facturation', path: '/billing' }
          ];
          
          pages.filter(p => p.name.toLowerCase().includes(lowerQuery)).forEach(p => {
              results.push({ type: 'page', title: p.name, subtitle: 'Navigation', link: p.path });
          });

          return results;
      }
  },
  // --- SYSTEM HEALTH ---
  system: {
      checkHealth: async () => {
          if (isDemoMode()) return { db: false, latency: 0 };
          const start = Date.now();
          const { error } = await supabase!.from('organizations').select('id').limit(1);
          const end = Date.now();
          return { db: !error, latency: end - start };
      }
  }
};