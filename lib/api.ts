import { supabase } from './supabase';
import { Review, User, Organization, SetupStatus, Competitor, WorkflowRule, AnalyticsSummary, Customer, Offer, StaffMember, MarketReport, SocialPost, SocialAccount, SocialPlatform, PublicProfileConfig, Location, ReviewTimelineEvent, AppNotification } from '../types';
import { DEMO_USER, DEMO_ORG, DEMO_REVIEWS, DEMO_STATS, DEMO_COMPETITORS } from './demo';
import { GoogleGenAI } from '@google/genai';

// --- DEMO MODE UTILS ---
const isDemoMode = () => {
    return localStorage.getItem('is_demo_mode') === 'true';
};

const setDemoMode = (active: boolean) => {
    if (active) localStorage.setItem('is_demo_mode', 'true');
    else localStorage.removeItem('is_demo_mode');
};

// Helper for Edge Functions (kept for complex logic like Stripe)
const invoke = async (functionName: string, body: any) => {
    if (isDemoMode()) {
        console.log(`[DEMO] Skipping Edge Function ${functionName}`, body);
        return {}; 
    }
    if (!supabase) throw new Error("Supabase not initialized");
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (error) throw error;
    return data;
};

// Initialisation du client IA Client-Side
const getAiClient = () => {
    const key = process.env.API_KEY || process.env.VITE_API_KEY;
    if (!key) throw new Error("Clé API Google manquante");
    return new GoogleGenAI({ apiKey: key });
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
    connectGoogleBusiness: async () => {
        if (isDemoMode()) return true;
        if (!supabase) return;
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
          if (isDemoMode()) return false;
          if (!supabase) return false;
          
          // CRITICAL: Only proceed if URL actually contains tokens
          const hash = window.location.hash;
          if (!hash.includes('access_token') && !hash.includes('refresh_token')) {
              return false;
          }

          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.provider_token) {
              const user = session.user;
              const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle();
              
              if (profile?.organization_id) {
                  const updates: any = {
                      integrations: { google: true } // Simplified update
                  };
                  // Persist refresh token if present
                  if (session.provider_refresh_token) {
                      updates.google_refresh_token = session.provider_refresh_token;
                  }
                  
                  // Preserve existing integrations config
                  const { data: currentOrg } = await supabase.from('organizations').select('integrations').eq('id', profile.organization_id).single();
                  if (currentOrg?.integrations) {
                      updates.integrations = { ...currentOrg.integrations, google: true };
                  }

                  const { error } = await supabase.from('organizations').update(updates).eq('id', profile.organization_id);
                  return !error;
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
          if (filters.rating && filters.rating !== 'Tout') {
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
          if (error) return [];
          
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
          // Use direct function or DB update depending on architecture. 
          // For reliability, we might just update DB "posted_reply" and let a CRON sync with Google.
          await supabase!.from('reviews').update({
              status: 'sent',
              posted_reply: text,
              replied_at: new Date().toISOString()
          }).eq('id', reviewId);
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
          await supabase!.from('reviews').update({ internal_notes: [...currentNotes, newNote] }).eq('id', reviewId);
          return newNote;
      },
      addTag: async (reviewId: string, tag: string) => {
          if (isDemoMode()) return;
          const { data: review } = await supabase!.from('reviews').select('tags').eq('id', reviewId).single();
          const currentTags = review?.tags || [];
          if (!currentTags.includes(tag)) {
              await supabase!.from('reviews').update({ tags: [...currentTags, tag] }).eq('id', reviewId);
          }
      },
      removeTag: async (reviewId: string, tag: string) => {
          if (isDemoMode()) return;
          const { data: review } = await supabase!.from('reviews').select('tags').eq('id', reviewId).single();
          const currentTags = review?.tags || [];
          await supabase!.from('reviews').update({ tags: currentTags.filter((t: string) => t !== tag) }).eq('id', reviewId);
      },
      getTimeline: (review: Review): ReviewTimelineEvent[] => {
          const events: ReviewTimelineEvent[] = [];
          events.push({ id: 'evt_created', type: 'review_created', date: review.received_at, actor_name: review.author_name, content: 'Avis reçu' });
          if (review.analysis) {
              events.push({ id: 'evt_analysis', type: 'ai_analysis', date: new Date(new Date(review.received_at).getTime() + 1000 * 60).toISOString(), actor_name: 'System AI', content: `Analyse: ${review.analysis.sentiment}` });
          }
          if (review.ai_reply?.created_at) {
              events.push({ id: 'evt_draft', type: 'draft_generated', date: review.ai_reply.created_at, actor_name: 'Gemini', content: 'Brouillon généré' });
          }
          if (review.internal_notes) {
              review.internal_notes.forEach(note => events.push({ id: note.id, type: 'note', date: note.created_at, actor_name: note.author_name, content: note.text }));
          }
          if (review.replied_at && review.status === 'sent') {
              events.push({ id: 'evt_replied', type: 'reply_published', date: review.replied_at, actor_name: 'Moi', content: 'Réponse publiée' });
          }
          return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      },
      subscribe: (callback: (payload: any) => void) => {
          if (isDemoMode()) return { unsubscribe: () => {} };
          if (!supabase) return { unsubscribe: () => {} };
          return supabase.channel('reviews-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, callback).subscribe();
      },
      uploadCsv: async (file: File, locationId: string) => {
          if (isDemoMode()) return 10;
          // CSV Parsing logic here
          return 0;
      }
  },
  ai: {
      generateReply: async (review: Review, config: any) => {
          try {
              const ai = getAiClient();
              const prompt = `
                Rôle: Tu es le propriétaire d'un établissement répondant à un avis client.
                Tâche: Rédige une réponse à cet avis en suivant le ton et le style demandés.
                
                Avis Client (${review.rating}/5) de ${review.author_name}:
                "${review.body}"
                
                Consignes:
                - Ton: ${config.tone || 'Professionnel'}
                - Longueur: ${config.length === 'short' ? 'Courte (1 phrase)' : config.length === 'long' ? 'Détaillée (3-4 phrases)' : 'Moyenne (2 phrases)'}
                - Langue: Français
                - Ne mets JAMAIS de guillemets autour de la réponse.
                - Sois poli, empathique et constructif.
              `;

              const result = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt
              });
              
              const text = result.response.text();
              if(!text) throw new Error("Réponse vide de l'IA");
              return text.trim();

          } catch (e: any) {
              console.error("AI Error:", e);
              // Fail gracefully if API is down, but don't show "local simulation" message
              throw new Error("Erreur de connexion à Gemini AI. Vérifiez votre clé API ou connexion internet.");
          }
      },
      generateSocialPost: async (review: Review, platform: string) => {
          try {
              const ai = getAiClient();
              const prompt = `
                Act as a Social Media Manager. Write a caption for ${platform}.
                Context: 5-star review from ${review.author_name}: "${review.body}".
                Tone: Enthusiastic, grateful.
                Language: French.
                Include emojis and hashtags.
              `;
              const result = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt
              });
              return result.response.text()?.trim() || "";
          } catch (e) {
              return `Merci ${review.author_name} pour cet avis ! 🌟 #${review.source}`;
          }
      },
      previewBrandVoice: async (config: any, review: any) => {
          try {
              const ai = getAiClient();
              const prompt = `
                Rôle: Tu es le propriétaire d'un établissement.
                Tâche: Rédige une réponse à cet avis en utilisant EXCLUSIVEMENT la "Brand Voice" décrite ci-dessous.
                
                BRAND VOICE:
                - Ton: ${config.tone || 'Neutre'}
                - Style: ${config.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}
                - Emojis: ${config.use_emojis ? 'Oui' : 'Non'}
                - Contexte: ${config.knowledge_base || 'Aucun'}
                
                Avis (${review.rating}/5): "${review.body}"
                Réponds en français, sans guillemets.
              `;

              const result = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt
              });
              
              return result.response.text()?.trim() || "Erreur de génération.";
          } catch (e: any) {
              throw new Error("Erreur Gemini: " + e.message);
          }
      },
      runCustomTask: async (payload: any) => {
          try {
              const ai = getAiClient();
              const prompt = JSON.stringify(payload);
              const result = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: `Execute this task and return JSON: ${prompt}`
              });
              return { result: result.response.text() };
          } catch (e: any) {
              return { error: e.message };
          }
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

          // Fetch recent reviews directly to compute client-side stats (reliable)
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - (period === '7j' ? 7 : 30));
          
          const { data: reviews } = await supabase!
            .from('reviews')
            .select('rating, text, received_at')
            .in('location_id', org.locations.map(l => l.id))
            .gte('received_at', startDate.toISOString())
            .order('received_at', { ascending: true });

          const r = reviews || [];
          const total = r.length;
          const avg = total > 0 ? r.reduce((a, b) => a + b.rating, 0) / total : 0;
          const pos = r.filter(x => x.rating >= 4).length;
          const neg = r.filter(x => x.rating <= 2).length;
          const neu = total - pos - neg;

          // Simple dynamic summary generation
          let strengths = "Aucune donnée suffisante.";
          let weaknesses = "Aucune donnée suffisante.";

          if (pos > 0) {
              strengths = "La majorité des clients récents sont satisfaits de l'expérience globale.";
              if (r.some(x => x.text?.toLowerCase().includes('service') && x.rating >= 4)) strengths += " Le service est souvent cité positivement.";
          }
          if (neg > 0) {
              weaknesses = "Quelques avis négatifs récents.";
              if (r.some(x => x.text?.toLowerCase().includes('prix') && x.rating <= 3)) weaknesses += " Le prix est mentionné comme un frein.";
              if (r.some(x => x.text?.toLowerCase().includes('attente') && x.rating <= 3)) weaknesses += " Des plaintes sur l'attente.";
          }

          return {
              period,
              total_reviews: total,
              average_rating: parseFloat(avg.toFixed(1)),
              response_rate: 100, // Mock for now
              nps_score: Math.round(((pos - neg) / (total || 1)) * 100),
              global_rating: parseFloat(avg.toFixed(1)),
              sentiment_distribution: {
                  positive: pos / (total || 1),
                  neutral: neu / (total || 1),
                  negative: neg / (total || 1)
              },
              volume_by_date: [], // Simplified for this view
              top_themes_positive: [],
              top_themes_negative: [],
              top_keywords: [],
              strengths_summary: strengths,
              problems_summary: weaknesses
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
          if (isDemoMode()) return;
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
          return []; // Needs real backend
      },
      getDeepAnalysis: async (sector: string, location: string, competitors: any[]) => { return {} as any; },
      saveReport: async (report: any) => {},
      getReports: async () => []
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
      run: async () => { return { processed: 0, actions: 0 }; }
  },
  notifications: {
      list: async (filters?: any): Promise<AppNotification[]> => {
          if (isDemoMode()) return [];
          if (!supabase) return [];
          
          try {
              const org = await api.organization.get();
              if (!org || org.locations.length === 0) return [];
              
              // Get real pending critical reviews
              const { data: alerts } = await supabase
                .from('reviews')
                .select('id, rating, author_name, received_at')
                .in('location_id', org.locations.map(l => l.id))
                .lte('rating', 3)
                .eq('status', 'pending')
                .order('received_at', { ascending: false })
                .limit(5);
                
              if (alerts && alerts.length > 0) {
                  return alerts.map((r: any) => ({
                      id: `alert-${r.id}`,
                      type: 'warning',
                      title: `Avis critique (${r.rating}/5)`,
                      message: `Avis de ${r.author_name} en attente.`,
                      created_at: r.received_at,
                      read: false,
                      link: `/inbox?reviewId=${r.id}`
                  }));
              }
          } catch (e) {
              console.error("Notifications error", e);
          }
          return [];
      },
      markAllRead: async () => {},
      sendTestEmail: async () => {}
  },
  team: {
      list: async () => {
          if (isDemoMode()) return [DEMO_USER];
          const org = await api.organization.get();
          if (!org) return [];
          const { data } = await supabase!.from('users').select('*').eq('organization_id', org.id);
          return data || [];
      },
      invite: async (email: string, role: string) => {}
  },
  company: {
      search: async (query: string) => {
          return [{ legal_name: query + ' (Démo)', siret: '000000000', address: 'France' }];
      }
  },
  billing: {
      getInvoices: async () => [],
      createCheckoutSession: async (plan: string) => '',
      createPortalSession: async () => ''
  },
  activity: {
      getRecent: async () => {
          const reviews = await api.reviews.list({ limit: 5 });
          return reviews.map((r: any) => ({
              id: r.id,
              type: 'review',
              text: `Avis de ${r.author_name} (${r.rating}★)`,
              location: 'Google',
              time: new Date(r.received_at).toLocaleDateString()
          }));
      }
  },
  google: {
      fetchAllGoogleLocations: async () => [],
      syncReviewsForLocation: async () => 0
  },
  locations: {
      create: async (data: Partial<Location>) => {
          if (isDemoMode()) return;
          const org = await api.organization.get();
          if (!org) return;
          await supabase!.from('locations').insert({ ...data, organization_id: org.id });
      },
      update: async (id: string, data: Partial<Location>) => {
          if (isDemoMode()) return;
          await supabase!.from('locations').update(data).eq('id', id);
      },
      delete: async (id: string) => {
          if (isDemoMode()) return;
          await supabase!.from('locations').delete().eq('id', id);
      },
      importFromGoogle: async () => 0
  },
  onboarding: {
      checkStatus: async (): Promise<SetupStatus> => {
          if (isDemoMode()) return { googleConnected: true, brandVoiceConfigured: false, firstReviewReplied: true, completionPercentage: 66 };
          
          if (!supabase) return { googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 };

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
          
          const googleConnected = !!(org.integrations && (org.integrations as any).google === true);
          
          // Strict check: Description or KB must be set
          const brand = org.brand as any;
          const brandVoiceConfigured = !!(brand && brand.tone && (
              (brand.description && brand.description.length > 5) || 
              (brand.knowledge_base && brand.knowledge_base.length > 5)
          ));
          
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
  seedCloudDatabase: async () => {},
  campaigns: {
      send: async (type: string, recipient: string, subject: string, content: string) => {}
  },
  public: {
      getLocationInfo: async (id: string) => {
          if (isDemoMode()) return DEMO_ORG.locations.find(l => l.id === id);
          if (!supabase) return null;
          const { data } = await supabase.from('locations').select('*').eq('id', id).single();
          return data;
      },
      getActiveOffer: async () => null,
      submitFeedback: async (locationId: string, rating: number, feedback: string, contact: string, tags: string[], staffName?: string) => {
          if (isDemoMode()) return;
          if (!supabase) throw new Error("No DB");
          
          // DIRECT DB INSERT to ensure reliability
          await supabase.from('reviews').insert({
              location_id: locationId,
              rating,
              text: feedback,
              author_name: contact || 'Client Funnel',
              source: 'direct',
              status: 'pending',
              received_at: new Date().toISOString(),
              analysis: { sentiment: rating >= 4 ? 'positive' : 'negative', themes: tags || [], keywords: [], flags: {} }
          });
      },
      getWidgetReviews: async (locationId: string) => {
          if (isDemoMode()) return DEMO_REVIEWS;
          if (!supabase) return [];
          const { data } = await supabase.from('reviews').select('*').eq('location_id', locationId).eq('status', 'sent').order('received_at', { ascending: false }).limit(10);
          return data || [];
      }
  },
  offers: {
      create: async (data: any) => {},
      generateCoupon: async () => ({ code: 'DEMO' }),
      distributeCampaign: async (offerId: string, segment: string, channel: string) => ({ sent_count: 0 }),
      validate: async (code: string) => ({ valid: false }),
      redeem: async (code: string) => {}
  },
  customers: {
      list: async () => [],
      update: async (id: string, data: any) => {},
      enrichProfile: async (id: string) => ({ profile: "", suggestion: "", last_updated: "" })
  },
  admin: {
      getStats: async () => ({ mrr: '0€', active_tenants: 0, total_reviews_processed: 0, tenants: [] })
  },
  social: {
      getPosts: async () => [],
      schedulePost: async (post: any) => {},
      deletePost: async (id: string) => {},
      connectAccount: async (platform: string, connect: boolean) => {}
  },
  global: {
      search: async () => []
  },
  system: {
      checkHealth: async () => ({ db: true, latency: 10 })
  }
};