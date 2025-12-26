
import { supabase } from './supabase';
import { Review, User, Organization, SetupStatus, Competitor, WorkflowRule, AnalyticsSummary, Customer, Offer, StaffMember, MarketReport, SocialPost, SocialAccount, SocialPlatform, PublicProfileConfig, Location, ReviewTimelineEvent, AppNotification } from '../types';
import { DEMO_USER, DEMO_ORG, DEMO_REVIEWS, DEMO_STATS, DEMO_COMPETITORS } from './demo';
import { ENABLE_DEMO_MODE, ENABLE_EXTRAS, isDemoModeEnabled, setDemoModeEnabled } from './flags';
import { GoogleGenAI } from "@google/genai";

const getEnv = (key: string): string => {
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            const v = (import.meta as any).env[key];
            return typeof v === 'string' ? v : '';
        }
    } catch {
        // ignore
    }

    try {
        if (typeof process !== 'undefined' && (process as any).env) {
            const v = (process as any).env[key];
            return typeof v === 'string' ? v : '';
        }
    } catch {
        // ignore
    }

    return '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

const logDuration = (label: string, start: number, extra?: Record<string, unknown>) => {
    const ms = Math.round(performance.now() - start);
    console.info(`[api] ${label} (${ms}ms)`, extra || {});
};

const DEFAULT_TIMEOUT_MS = 12000;
const CANONICAL_REDIRECT_BASE = 'https://reviewflow-new.vercel.app';

const withTimeout = async <T,>(promise: Promise<T>, ms = DEFAULT_TIMEOUT_MS, label = 'timeout'): Promise<T> => {
    const start = performance.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            const err = new Error(`${label} timeout after ${ms}ms`);
            console.error(err.message);
            reject(err);
        }, ms);
    });

    try {
        const result = await Promise.race([
            promise.then((value) => {
                logDuration(`${label} ok`, start);
                return value;
            }),
            timeoutPromise,
        ]);
        return result as T;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

export async function fetchJsonWithAbort(
    input: RequestInfo | URL,
    init: RequestInit = {},
    timeoutMs = 20000,
    label = 'fetch'
) {
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(input, { ...init, signal: controller.signal });
        const status = res.status;
        const text = await res.text();
        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch {}

        if (!res.ok) {
            const err = new Error(`${label} HTTP ${status}`);
            (err as any).status = status;
            (err as any).body = json ?? text;
            throw err;
        }

        return { data: json, status };
    } finally {
        window.clearTimeout(t);
    }
}

const isRetryableError = (error: any) => {
    const status = error?.status ?? error?.statusCode;
    if (status === 429 || (status >= 500 && status < 600)) return true;
    const message = String(error?.message || '').toLowerCase();
    return message.includes('network') || message.includes('fetch') || message.includes('timeout');
};

const runTimedQuery = async <T extends { error?: any }>(fn: () => Promise<T>, label: string): Promise<T> => {
    const attempt = () => withTimeout(fn(), DEFAULT_TIMEOUT_MS, label);
    const result = await attempt();
    if (result?.error && isRetryableError(result.error)) {
        console.warn(`[api] ${label} retry`, { status: result.error?.status, message: result.error?.message });
        return await attempt();
    }
    return result;
};

const runTimed = async <T,>(fn: () => Promise<T>, label: string): Promise<T> => {
    const attempt = () => withTimeout(fn(), DEFAULT_TIMEOUT_MS, label);
    try {
        return await attempt();
    } catch (error) {
        if (isRetryableError(error)) {
            console.warn(`[api] ${label} retry`, { status: error?.status, message: error?.message });
            return await attempt();
    }
    throw error;
  }
};

const withAbortSignal = (query: any, signal?: AbortSignal) => {
    return signal ? query.abortSignal(signal) : query;
};

let inFlightUser: Promise<User | null> | null = null;
let inFlightOrg: Promise<Organization | null> | null = null;

// Helper for Edge Functions
const invoke = async (functionName: string, body: any) => {
    if (isDemoModeEnabled()) {
        console.log(`[DEMO] Skipping Edge Function ${functionName}`, body);
        return {}; // Mock return for edge functions in demo
    }
    if (!supabase) throw new Error("Supabase not initialized");
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (error) throw error;
    return data;
};

// Initialize Gemini AI Client
const getAIClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const api = {
  auth: {
    getUser: async (): Promise<User | null> => {
      if (inFlightUser) return inFlightUser;
      inFlightUser = (async () => {
          const start = performance.now();
          console.info('[api] auth.getUser start', { url: supabase?.auth?.url });
          if (isDemoModeEnabled()) return DEMO_USER;
          
          if (!supabase) return null;
          const sessionRes = await supabase.auth.getSession();
          if (sessionRes.error) throw sessionRes.error;
          const sessionUser = sessionRes.data.session?.user;
          if (!sessionUser) return null;
          
          const { data, error } = await runTimedQuery(
              () => supabase.from('users').select('*').eq('id', sessionUser.id).maybeSingle(),
              'supabase.from(users).select'
          );
          if (error) throw error;

          const result = {
              id: sessionUser.id,
              email: sessionUser.email!,
              name: (data?.name) || (sessionUser.user_metadata?.name) || 'Utilisateur',
              avatar: data?.avatar || '',
              role: (data?.role) || 'admin', 
              organizations: data?.organizations || [],
              organization_id: data?.organization_id
          };
          logDuration('auth.getUser done', start, { userId: result.id, hasOrg: !!result.organization_id });
          return result;
      })().finally(() => {
          inFlightUser = null;
      });
      return inFlightUser;
    },
    login: async (email: string, password: string) => {
      if (email === 'demo@reviewflow.com') {
          if (!ENABLE_DEMO_MODE) {
              throw new Error("Demo mode disabled in production.");
          }
          setDemoModeEnabled(true);
          return;
      }
      setDemoModeEnabled(false);
      
      if (!supabase) throw new Error("No database connection");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    register: async (name: string, email: string, password: string) => {
      setDemoModeEnabled(false);
      if (!supabase) throw new Error("No database connection");
      const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { name } } 
      });
      if (error) throw error;
    },
    logout: async () => {
        setDemoModeEnabled(false);
        if (supabase) await supabase.auth.signOut();
    },
    loginWithGoogle: async () => {
        if (isDemoModeEnabled()) return;
        if (!supabase) return;
        await supabase.auth.signInWithOAuth({ 
            provider: 'google',
            options: {
                redirectTo: `${CANONICAL_REDIRECT_BASE}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
                scopes: 'https://www.googleapis.com/auth/business.manage'
            }
        });
    },
    connectGoogleBusiness: async () => {
        if (isDemoModeEnabled()) return true;
        if (!supabase) return;
        const { data } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${CANONICAL_REDIRECT_BASE}/auth/callback`,
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
        if (isDemoModeEnabled()) return data;
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
        if (isDemoModeEnabled()) return;
        if (supabase) await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/login?mode=reset'
        });
    },
    deleteAccount: async () => {
        if (isDemoModeEnabled()) return;
        await invoke('delete_account', {});
    }
  },
  organization: {
      ensureDefaultForCurrentUser: async (): Promise<Organization | null> => {
          const start = performance.now();
          console.info('[api] organization.ensureDefaultForCurrentUser start', { url: supabase?.rest?.url });
          if (!supabase) throw new Error("Supabase not initialized");
          const { data, error } = await runTimedQuery(
              () => supabase.rpc('create_default_org_for_current_user'),
              'supabase.rpc(create_default_org_for_current_user)'
          );
          if (error) throw error;
          logDuration('organization.ensureDefaultForCurrentUser done', start, { hasOrg: !!data });
          return data as Organization;
      },
      get: async (options?: { signal?: AbortSignal }): Promise<Organization | null> => {
          if (inFlightOrg) return inFlightOrg;
          inFlightOrg = (async () => {
              const start = performance.now();
              console.info('[api.organization.get] step 1: start');
              if (isDemoModeEnabled()) {
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
              console.info('[api.organization.get] step 2: before getSession');
              const sessionRes = await withTimeout(
                  supabase.auth.getSession(),
                  8000,
                  'supabase.auth.getSession'
              );
              console.info('[api.organization.get] step 3: after getSession', {
                  hasSession: !!sessionRes.data.session,
                  hasToken: !!sessionRes.data.session?.access_token,
              });
              if (sessionRes.error) throw sessionRes.error;
              const sessionUser = sessionRes.data.session?.user;
              if (!sessionUser) return null;
              const token = sessionRes.data.session?.access_token;

              const { data: userProfile, error: profileError } = await runTimedQuery(
                  () => withAbortSignal(
                      supabase.from('users').select('organization_id').eq('id', sessionUser.id).maybeSingle(),
                      options?.signal
                  ),
                  'supabase.from(users).select organization_id'
              );
              if (profileError) throw profileError;
              if (!userProfile?.organization_id) return null;

              if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !token) return null;

              const url =
                `${SUPABASE_URL}/rest/v1/organizations?select=` +
                `*,locations(*),staff_members(*),offers(*)` +
                `&id=eq.${userProfile.organization_id}&limit=1`;
              console.info('[api.organization.get] step 4: before fetch', { url });
              const { data, status } = await fetchJsonWithAbort(
                url,
                {
                  method: 'GET',
                  headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  }
                },
                20000,
                'api.organization.get'
              );
              console.info('[api.organization.get] step 5: after fetch', { status });
              const orgData = Array.isArray(data) ? data[0] : data;
                
              logDuration('organization.get done', start, { orgId: (orgData as any)?.id });
              return orgData as any;
          })().finally(() => {
              inFlightOrg = null;
          });
          return inFlightOrg;
      },
      create: async (name: string, industry: string) => {
          if (isDemoModeEnabled()) return;
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
          if (isDemoModeEnabled()) return;
          const org = await api.organization.get();
          if (!org) return;
          const { error } = await supabase!.from('organizations').update(data).eq('id', org.id);
          if (error) throw error;
      },
      saveGoogleTokens: async (tokens?: { accessToken?: string | null; refreshToken?: string | null }) => {
          if (isDemoModeEnabled()) return true;
          if (!supabase) return false;
          
          const sessionTokens = tokens || {};
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = sessionTokens.accessToken ?? session?.provider_token ?? null;
          const refreshToken = sessionTokens.refreshToken ?? session?.provider_refresh_token ?? null;
          
          if (accessToken) {
              const { error } = await supabase.rpc('save_google_tokens', {
                  access_token: accessToken,
                  refresh_token: refreshToken
              });

              if (!error) {
                  console.log("✅ Google Tokens & Status Saved to DB");
                  return true;
              }
              console.error("❌ Failed to save Google Tokens", error);
          }
          return false;
      },
      generateApiKey: async (name: string) => {
          if (!ENABLE_EXTRAS) return null;
          if (isDemoModeEnabled()) return { key: 'sk_demo_123' };
          return await invoke('manage_org_settings', { action: 'generate_api_key', data: { name } });
      },
      revokeApiKey: async (id: string) => {
          if (!ENABLE_EXTRAS) return null;
          if (isDemoModeEnabled()) return;
          return await invoke('manage_org_settings', { action: 'revoke_api_key', data: { id } });
      },
      saveWebhook: async (url: string, events: string[]) => {
          if (!ENABLE_EXTRAS) return null;
          if (isDemoModeEnabled()) return;
          return await invoke('manage_org_settings', { action: 'save_webhook', data: { url, events } });
      },
      deleteWebhook: async (id: string) => {
          if (!ENABLE_EXTRAS) return null;
          if (isDemoModeEnabled()) return;
          return await invoke('manage_org_settings', { action: 'delete_webhook', data: { id } });
      },
      testWebhook: async (id: string) => {
          if (!ENABLE_EXTRAS) return false;
          return true;
      },
      simulatePlanChange: async (plan: 'pro' | 'starter') => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) {
              DEMO_ORG.subscription_plan = plan;
              return;
          }
          const org = await api.organization.get();
          if (org) await supabase!.from('organizations').update({ subscription_plan: plan }).eq('id', org.id);
      },
      addStaffMember: async (name: string, role: string) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) {
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
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) {
              DEMO_ORG.staff_members = DEMO_ORG.staff_members?.filter(s => s.id !== id);
              return;
          }
          await supabase!.from('staff_members').delete().eq('id', id);
      },
      sendCongratulationEmail: async (id: string) => {
          if (!ENABLE_EXTRAS) return;
          console.log('Congratulating', id);
      }
  },
  reviews: {
      list: async (filters: any) => {
          if (isDemoModeEnabled()) {
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
          if (isDemoModeEnabled()) {
              const r = DEMO_REVIEWS.find(r => r.id === reviewId);
              if (r) {
                  r.status = 'sent';
                  r.posted_reply = text;
                  r.replied_at = new Date().toISOString();
              }
              return;
          }

          const { data: review } = await supabase!
              .from('reviews')
              .select('source, customer_email, author_name, location:locations(name)')
              .eq('id', reviewId)
              .single();

          if (review && review.source === 'direct') {
              // Réponse locale pour les avis QR Code
              await supabase!.from('reviews').update({
                  status: 'sent',
                  posted_reply: text,
                  replied_at: new Date().toISOString()
              }).eq('id', reviewId);

              // Tenter d'envoyer l'email
              if (review.customer_email) {
                  const locationName = (review.location as any)?.name || "Notre Établissement";
                  try {
                      await invoke('send_campaign_emails', {
                          emails: [review.customer_email],
                          subject: `Réponse à votre avis chez ${locationName}`,
                          html: `<h2>Bonjour ${review.author_name},</h2><p>Merci pour votre avis.</p><blockquote>"${text}"</blockquote>`
                      });
                  } catch (e) { console.error("Failed to send reply email", e); }
              }

          } else {
              // Réponse Google via Edge Function
              await invoke('post_google_reply', { reviewId, replyText: text });
          }
      },
      saveDraft: async (reviewId: string, text: string) => {
          if (isDemoModeEnabled()) return;
          await supabase!.from('reviews').update({
              status: 'draft',
              ai_reply: { text, needs_manual_validation: true, created_at: new Date().toISOString() }
          }).eq('id', reviewId);
      },
      addNote: async (reviewId: string, text: string) => {
          if (isDemoModeEnabled()) return { id: 'note-1', text, author_name: 'Moi', created_at: new Date().toISOString() };
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
          if (isDemoModeEnabled()) {
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
          if (isDemoModeEnabled()) {
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
          if (isDemoModeEnabled()) return { unsubscribe: () => {} };
          if (!supabase) return { unsubscribe: () => {} };
          return supabase
            .channel('reviews-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, callback)
            .subscribe();
      },
      uploadCsv: async (file: File, locationId: string) => {
          if (!ENABLE_EXTRAS) return 0;
          if (isDemoModeEnabled()) return 10;
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
          if (!ENABLE_EXTRAS) return '';
          if (isDemoModeEnabled()) {
              return "Bonjour " + review.author_name + ", merci pour votre avis 5 étoiles ! Nous sommes ravis que l'expérience vous ait plu.";
          }
          
          const ai = getAIClient();
          const prompt = `
            Rôle: Tu es le propriétaire d'un établissement répondant à un avis client.
            Tâche: Rédige une réponse à cet avis.
            
            Avis Client (${review.rating}/5) de ${review.author_name}:
            "${review.body}"
            
            Consignes:
            - Ton: ${config.tone || 'Professionnel'}
            - Longueur: ${config.length === 'short' ? 'Courte (1-2 phrases)' : config.length === 'long' ? 'Détaillée (3-4 phrases)' : 'Moyenne'}
            - Langue: Français
            - Ne pas mettre de guillemets autour de la réponse.
            - Sois poli, empathique et constructif.
          `;

          try {
              const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt
              });
              return response.text || "";
          } catch (e: any) {
              console.error("AI Gen Error", e);
              throw new Error("Erreur de génération IA. Vérifiez votre clé API ou réessayez.");
          }
      },
      generateSocialPost: async (review: Review, platform: string) => {
          if (!ENABLE_EXTRAS) return '';
          if (isDemoModeEnabled()) return "🌟 Avis 5 étoiles ! Merci " + review.author_name + " pour ce retour incroyable. #Reviewflow #CustomerLove";
          
          const ai = getAIClient();
          const prompt = `
            Act as a world-class Social Media Manager.
            Platform: ${platform} (Instagram, LinkedIn, or Facebook).
            Context: We received a glowing 5-star review from a customer.
            Task: Write a captivating, platform-native caption to go with an image of this review.
            
            Review Details:
            - Author: ${review.author_name}
            - Text: "${review.body}"
            - Rating: ${review.rating}/5
            
            Guidelines:
            - Language: French (Français)
            - Tone: Enthusiastic, grateful, and professional.
            - Include 3-5 relevant emojis.
            - Include 3-5 relevant hashtags at the end.
            - DO NOT wrap the output in quotes.
          `;

          try {
              const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt
              });
              return response.text || "";
          } catch (e: any) {
              throw new Error("Erreur de génération IA.");
          }
      },
      previewBrandVoice: async (config: any, review: any) => {
          if (!ENABLE_EXTRAS) return '';
          if (isDemoModeEnabled()) return "Ceci est un exemple de réponse généré avec le ton " + config.tone;
          
          const ai = getAIClient();
          const prompt = `
            Rôle: Tu es le propriétaire d'un établissement répondant à un avis client.
            Tâche: Rédige une réponse test pour valider le style de marque.
            
            Avis Test: "${review.body}"
            
            Paramètres de Marque:
            - Ton: ${config.tone}
            - Style: ${config.language_style}
            - Info contextuelle: ${config.knowledge_base}
            - Emojis: ${config.use_emojis ? 'Oui' : 'Non'}
            
            Réponse attendue: Courte, percutante, reflétant ces paramètres.
          `;

          try {
              const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt
              });
              return response.text || "";
          } catch (e) {
              return "Erreur lors du test de voix.";
          }
      },
      runCustomTask: async (payload: any) => {
          if (!ENABLE_EXTRAS) return { result: "" };
          if (isDemoModeEnabled()) return { result: "Demo Mode Custom Task Executed" };
          
          const ai = getAIClient();
          try {
              const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: JSON.stringify(payload)
              });
              return { result: response.text };
          } catch (e: any) {
              throw new Error(e.message);
          }
      }
  },
  analytics: {
      getOverview: async (period: string = '30j'): Promise<AnalyticsSummary> => {
          if (!ENABLE_EXTRAS) {
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
          if (isDemoModeEnabled()) return DEMO_STATS;

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

          // Appel RPC sécurisé
          const { data: kpi, error: rpcError } = await supabase!.rpc('get_dashboard_stats', { org_id: org.id });
          
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          
          const { data: recentReviews } = await supabase!
            .from('reviews')
            .select('rating, received_at, status, analysis')
            .in('location_id', org.locations.map(l => l.id))
            .gte('received_at', startDate.toISOString())
            .order('received_at', { ascending: true });

          const reviews = recentReviews || [];
          
          // Calcul stats manuelles si RPC échoue ou pour compléments
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
          if (!ENABLE_EXTRAS) return [];
          if (isDemoModeEnabled()) return DEMO_COMPETITORS;
          if (!supabase) return [];
          const { data } = await supabase.from('competitors').select('*');
          return data || [];
      },
      create: async (data: Partial<Competitor>) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) {
              DEMO_COMPETITORS.push({ id: 'new-comp', ...data } as Competitor);
              return;
          }
          if (!supabase) return;
          const org = await api.organization.get();
          await supabase.from('competitors').insert({ ...data, organization_id: org?.id });
      },
      delete: async (id: string) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) return;
          await supabase!.from('competitors').delete().eq('id', id);
      },
      autoDiscover: async (radius: number, sector: string, lat: number, lng: number) => {
          if (!ENABLE_EXTRAS) return [];
          if (isDemoModeEnabled()) return DEMO_COMPETITORS;
          const { results } = await invoke('fetch_places', {
              latitude: lat,
              longitude: lng,
              radius: radius,
              keyword: sector
          });
          return results;
      },
      getDeepAnalysis: async (sector?: string, location?: string, competitors?: Competitor[]) => {
          if (!ENABLE_EXTRAS) return {};
          if (isDemoModeEnabled()) {
              return { 
                  trends: ["Montée des prix", "Demande bio"], 
                  swot: { strengths: ["Service"], weaknesses: ["Prix"], opportunities: ["Livraison"], threats: ["Nouveaux entrants"] },
                  competitors_detailed: []
              };
          }
          const ai = getAIClient();
          const prompt = `Analyze competitors...`; 
          try {
              const result = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt
              });
              return JSON.parse(result.text || "{}");
          } catch (e) {
              return {};
          }
      },
      saveReport: async (report: Omit<MarketReport, 'id'>) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) return;
          if (supabase) await supabase.from('market_reports').insert(report);
      },
      getReports: async (): Promise<MarketReport[]> => {
          if (!ENABLE_EXTRAS) return [];
          if (isDemoModeEnabled()) return [];
          if (supabase) {
              const { data } = await supabase.from('market_reports').select('*').order('created_at', { ascending: false });
              return data || [];
          }
          return [];
      }
  },
  automation: {
      getWorkflows: async () => {
          if (!ENABLE_EXTRAS) return [];
          const org = await api.organization.get();
          return org?.workflows || [];
      },
      saveWorkflow: async (wf: WorkflowRule) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) return;
          const org = await api.organization.get();
          if (!org) return;
          let workflows = org.workflows || [];
          const idx = workflows.findIndex(w => w.id === wf.id);
          if (idx >= 0) workflows[idx] = wf;
          else workflows.push(wf);
          await supabase!.from('organizations').update({ workflows }).eq('id', org.id);
      },
      deleteWorkflow: async (id: string) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) return;
          const org = await api.organization.get();
          if (!org) return;
          const workflows = org.workflows?.filter(w => w.id !== id);
          await supabase!.from('organizations').update({ workflows }).eq('id', org.id);
      },
      run: async () => {
          if (!ENABLE_EXTRAS) return { processed: 0, actions: 0 };
          if (isDemoModeEnabled()) return { processed: 5, actions: 5 };
          const { processed, actions } = await invoke('process_reviews', {});
          return { processed, actions };
      }
  },
  notifications: {
      list: async (): Promise<AppNotification[]> => {
          if (!ENABLE_EXTRAS) return [];
          return [];
      },
      markAllRead: async () => {},
      sendTestEmail: async () => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) return;
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
          if (!ENABLE_EXTRAS) return [];
          if (isDemoModeEnabled()) return [DEMO_USER];
          const org = await api.organization.get();
          if (!org) return [];
          const { data } = await supabase!.from('users').select('*').eq('organization_id', org.id);
          return data || [];
      },
      invite: async (email: string, role: string) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) return;
          await invoke('invite_user', { email, role });
      }
  },
  company: {
      search: async (query: string) => {
          if (!ENABLE_EXTRAS) return [];
          return [{ legal_name: query + ' (Démo)', siret: '000000000', address: 'France' }];
      }
  },
  billing: {
      getInvoices: async () => {
          if (!ENABLE_EXTRAS) return [];
          if (isDemoModeEnabled()) return [];
          const { invoices } = await invoke('get_invoices', {});
          return invoices || [];
      },
      createCheckoutSession: async (plan: string) => {
          if (!ENABLE_EXTRAS) return '';
          if (isDemoModeEnabled()) return 'https://example.com/checkout';
          const { url } = await invoke('create_checkout', { 
              plan,
              successUrl: window.location.origin + '/billing?success=true',
              cancelUrl: window.location.origin + '/billing?canceled=true'
          });
          return url;
      },
      createPortalSession: async () => {
          if (!ENABLE_EXTRAS) return '';
          if (isDemoModeEnabled()) return 'https://example.com/portal';
          const { url } = await invoke('create_portal', {
              returnUrl: window.location.origin + '/billing'
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
          if (isDemoModeEnabled()) return [{ name: 'locations/123', title: 'Demo Google Loc', storeCode: 'STORE-1', address: '123 Demo St' }];
          if (!supabase) return [];
          const { data } = await supabase.auth.getSession();
          const token = data.session?.provider_token || data.session?.access_token; 
          const result = await invoke('fetch_google_locations', { accessToken: token }); 
          return result || [];
      },
      syncReviewsForLocation: async (locationId: string, googleLocationName: string) => {
          if (isDemoModeEnabled()) return 5;
          const org = await api.organization.get();
          if (!org?.google_refresh_token) {
              console.warn("Google refresh token missing; skipping sync.");
              return 0;
          }
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
          if (isDemoModeEnabled()) {
              DEMO_ORG.locations.push({ ...data, id: 'loc-new-' + Date.now() } as any);
              return;
          }
          if (!supabase) return;
          const user = await api.auth.getUser();
          if (!user || !user.organization_id) throw new Error("Organisation introuvable.");
          const { error } = await supabase.from('locations').insert({ ...data, organization_id: user.organization_id });
          if (error) throw new Error(error.message);
      },
      update: async (id: string, data: Partial<Location>) => {
          if (isDemoModeEnabled()) {
              const idx = DEMO_ORG.locations.findIndex(l => l.id === id);
              if (idx >= 0) DEMO_ORG.locations[idx] = { ...DEMO_ORG.locations[idx], ...data };
              return;
          }
          const { error } = await supabase!.from('locations').update(data).eq('id', id);
          if (error) throw new Error(error.message);
      },
      delete: async (id: string) => {
          if (isDemoModeEnabled()) {
              DEMO_ORG.locations = DEMO_ORG.locations.filter(l => l.id !== id);
              return;
          }
          const { error } = await supabase!.from('locations').delete().eq('id', id);
          if (error) throw new Error(error.message);
      },
      importFromGoogle: async () => {
          if (isDemoModeEnabled()) return 2;
          return 0;
      }
  },
  onboarding: {
      checkStatus: async (): Promise<SetupStatus> => {
          if (isDemoModeEnabled()) return { googleConnected: true, brandVoiceConfigured: false, firstReviewReplied: true, completionPercentage: 66 };
          if (!supabase) return { googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 };
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return { googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 };
          const { data: userProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
          if (!userProfile?.organization_id) return { googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 };
          const { data: org } = await supabase.from('organizations').select('integrations, brand').eq('id', userProfile.organization_id).single();
          if (!org) return { googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 };
          
          const googleConnected = !!(org.integrations && (org.integrations as any).google === true);
          const brandVoiceConfigured = !!(org.brand && (org.brand as any).tone);
          
          const { count } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'sent');
          const firstReviewReplied = (count || 0) > 0;
          
          const steps = [googleConnected, brandVoiceConfigured, firstReviewReplied];
          const completionPercentage = Math.round((steps.filter(Boolean).length / steps.length) * 100);
          return { googleConnected, brandVoiceConfigured, firstReviewReplied, completionPercentage };
      }
  },
  seedCloudDatabase: async () => {
      if (!ENABLE_EXTRAS) return;
      await new Promise(r => setTimeout(r, 2000));
  },
  campaigns: {
      send: async (type: 'sms'|'email', recipient: string, subject: string, content: string) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) return;
          await invoke('send_campaign_emails', {
              emails: [recipient],
              subject,
              html: content
          });
      }
  },
  public: {
      getLocationInfo: async (id: string) => {
          if (!ENABLE_EXTRAS) return null;
          if (isDemoModeEnabled()) return DEMO_ORG.locations.find(l => l.id === id);
          if (!supabase) return null;
          const { data } = await supabase.from('locations').select('*').eq('id', id).single();
          return data;
      },
      getActiveOffer: async (locationId: string, score: number) => {
          if (!ENABLE_EXTRAS) return null;
          if (isDemoModeEnabled()) return null;
          if (!supabase) return null;
          
          try {
              const { data: loc } = await supabase.from('locations').select('organization_id').eq('id', locationId).single();
              if (!loc) return null;
              
              const { data: offers } = await supabase
                .from('offers')
                .select('*')
                .eq('organization_id', loc.organization_id)
                .eq('active', true)
                .lte('trigger_rating', score) // Trigger rating must be less than or equal to score
                .limit(1);
                
              return offers && offers.length > 0 ? offers[0] : null;
          } catch(e) {
              console.error("Error fetching offers", e);
              return null;
          }
      },
      submitFeedback: async (locationId: string, rating: number, feedback: string, userInfo: { firstName: string, lastName: string, email: string, phone: string }, tags: string[], staffName?: string) => {
          if (!ENABLE_EXTRAS) return null;
          if (isDemoModeEnabled()) return;
          
          const payload = {
              locationId,
              rating,
              feedback,
              contact: userInfo.email || `${userInfo.firstName} ${userInfo.lastName}`,
              tags,
              staffName
          };

          try {
              // 1. Tenter via Edge Function (Méthode privilégiée)
              return await invoke('submit_review', payload);
          } catch (e) {
              console.warn("Edge Function failed, trying direct insert fallback...", e);
              
              // 2. Fallback: Insertion directe via Supabase Client (si RLS le permet)
              if (!supabase) throw new Error("Supabase not initialized");
              
              const newReview = {
                  location_id: locationId,
                  rating: rating,
                  text: feedback || '', 
                  author_name: payload.contact || 'Client Anonyme (Funnel)',
                  source: 'direct',
                  status: 'pending',
                  received_at: new Date().toISOString(),
                  language: 'fr',
                  staff_attributed_to: staffName || null,
                  tags: tags || [], // Important pour retrouver les tags
                  internal_notes: staffName ? [{ id: Date.now().toString(), text: `Attribué à ${staffName}`, author_name: 'Système', created_at: new Date().toISOString() }] : [],
                  analysis: { 
                      sentiment: rating >= 4 ? 'positive' : 'negative', 
                      themes: tags || [], 
                      keywords: tags || [], 
                      flags: { hygiene: false, security: false } 
                  },
              };

              const { data, error } = await supabase.from('reviews').insert(newReview).select().single();
              
              if (error) {
                  console.error("Fallback insert failed:", error);
                  throw error; // Re-throw if even fallback fails
              }
              
              return { success: true, review: data };
          }
      },
      getWidgetReviews: async (locationId: string) => {
          if (!ENABLE_EXTRAS) return [];
          if (isDemoModeEnabled()) return DEMO_REVIEWS;
          if (!supabase) return [];
          const { data } = await supabase.from('reviews').select('*').eq('location_id', locationId).eq('status', 'sent').order('received_at', { ascending: false }).limit(10);
          return data || [];
      }
  },
  offers: {
      create: async (data: any) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) return;
          const org = await api.organization.get();
          await supabase!.from('offers').insert({ ...data, organization_id: org?.id });
      },
      generateCoupon: async (offerId: string, email: string) => {
          if (!ENABLE_EXTRAS) return null;
          if (isDemoModeEnabled()) return { code: 'DEMO-123', offer_title: 'Offre Démo', discount_detail: '-10%', expires_at: new Date().toISOString(), status: 'active' };
          
          try {
              // Try edge function first
              return await invoke('manage_coupons', { action: 'create', offerId, email });
          } catch(e) {
              console.warn("Coupon generation failed via Edge Function, trying direct insert...");
              // Fallback direct insert if edge function fails (for simpler setups)
              if (!supabase) throw e;
              const { data: offer } = await supabase.from('offers').select('*').eq('id', offerId).single();
              if(!offer) throw new Error("Offer not found");
              
              const code = (offer.code_prefix || 'GIFT') + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + (offer.expiry_days || 30));
              
              const { data, error } = await supabase.from('coupons').insert({
                  code,
                  offer_id: offerId,
                  customer_email: email,
                  status: 'active',
                  expires_at: expiresAt.toISOString(),
                  offer_title: offer.title,
                  discount_detail: offer.description
              }).select().single();
              
              if(error) throw error;
              return data;
          }
      },
      distributeCampaign: async (offerId: string, segment: string, channel: string) => {
          if (!ENABLE_EXTRAS) return { sent_count: 0 };
          if (isDemoModeEnabled()) return { sent_count: 150 };
          return { sent_count: 0 };
      },
      validate: async (code: string) => {
          if (!ENABLE_EXTRAS) return { valid: false };
          if (isDemoModeEnabled()) return { valid: true, discount: 'Café Offert' };
          return await invoke('manage_coupons', { action: 'validate', code });
      },
      redeem: async (code: string) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) return;
          return await invoke('manage_coupons', { action: 'redeem', code });
      }
  },
  customers: {
      list: async () => {
          if (!ENABLE_EXTRAS) return [];
          if (isDemoModeEnabled()) return [
              { id: 'c1', name: 'Sophie Martin', email: 'sophie@mail.com', source: 'Google', last_interaction: new Date().toISOString(), total_reviews: 3, average_rating: 4.8, status: 'promoter', ltv_estimate: 450, stage: 'loyal', tags: ['VIP', 'Habitué'] }
          ] as Customer[];
          if (!supabase) return [];
          const { data } = await supabase.from('customers').select('*');
          return data || [];
      },
      update: async (id: string, data: Partial<Customer>) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) return;
          await supabase!.from('customers').update(data).eq('id', id);
      },
      enrichProfile: async (id: string) => {
          if (!ENABLE_EXTRAS) return null;
          if (isDemoModeEnabled()) return { profile: "Client exigent mais fidèle", suggestion: "Proposer une table calme", last_updated: new Date().toISOString() };
          return { profile: "Analyse IA...", suggestion: "...", last_updated: new Date().toISOString() };
      }
  },
  admin: {
      getStats: async () => {
          if (!ENABLE_EXTRAS) return { mrr: '0€', active_tenants: 0, total_reviews_processed: 0, tenants: [] };
          if (isDemoModeEnabled()) return { mrr: '12 450€', active_tenants: 142, total_reviews_processed: 45890, tenants: [] };
          return { mrr: '0€', active_tenants: 0, total_reviews_processed: 0, tenants: [] };
      }
  },
  social: {
      getPosts: async () => {
          if (!ENABLE_EXTRAS) return [];
          if (isDemoModeEnabled()) return [];
          if (!supabase) return [];
          const { data } = await supabase.from('social_posts').select('*');
          return data || [];
      },
      schedulePost: async (post: Partial<SocialPost>) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) return;
          const org = await api.organization.get();
          await supabase!.from('social_posts').insert({ ...post, organization_id: org?.id, status: 'scheduled' });
      },
      deletePost: async (id: string) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) return;
          await supabase!.from('social_posts').delete().eq('id', id);
      },
      connectAccount: async (platform: SocialPlatform, status: boolean) => {
          if (!ENABLE_EXTRAS) return;
          if (isDemoModeEnabled()) return;
      }
  },
  global: {
      search: async (query: string) => {
          if (!ENABLE_EXTRAS) return [];
          const lowerQuery = query.toLowerCase();
          
          if (isDemoModeEnabled()) {
              const results = [];
              if ('sophie'.includes(lowerQuery)) results.push({ type: 'customer', title: 'Sophie Martin', subtitle: 'Client VIP', link: '/customers' });
              if ('avis'.includes(lowerQuery)) results.push({ type: 'review', title: 'Avis de Jean', subtitle: '5 étoiles - "Super..."', link: '/inbox' });
              if ('facture'.includes(lowerQuery)) results.push({ type: 'page', title: 'Facturation', subtitle: 'Paramètres', link: '/billing' });
              return results;
          }

          if (!supabase) return [];
          
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
              subtitle: r.text ? r.text.substring(0, 30) + '...' : '', 
              link: `/inbox?reviewId=${r.id}` 
          }));

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
  system: {
      checkHealth: async () => {
          if (!ENABLE_EXTRAS) return { db: false, latency: 0 };
          if (isDemoModeEnabled()) return { db: false, latency: 0 };
          const start = Date.now();
          const { error } = await supabase!.from('organizations').select('id').limit(1);
          const end = Date.now();
          return { db: !error, latency: end - start };
      }
  }
};
