
import { supabase } from './supabase';
import { 
    User, Organization, Review, Competitor, SocialPost, 
    ReviewTimelineEvent, BrandSettings, ClientProgress, 
    AiCoachMessage, BlogPost, SeoAudit, AppNotification, AnalyticsSummary
} from '../types';
import { GoogleGenAI } from "@google/genai";

// Client Gemini
const apiKey = import.meta.env.VITE_API_KEY || '';
const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Structure vide pour éviter les crashs si pas de données
const EMPTY_ANALYTICS: AnalyticsSummary = {
    period: '30j',
    total_reviews: 0,
    average_rating: 0,
    response_rate: 0,
    nps_score: 0,
    global_rating: 0,
    sentiment_distribution: { positive: 0, neutral: 0, negative: 0 },
    volume_by_date: [],
    top_themes_positive: [],
    top_themes_negative: [],
    top_keywords: [],
    strengths_summary: "Pas assez de données pour l'analyse.",
    problems_summary: "Pas assez de données pour l'analyse."
};

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            if (!supabase) return null;
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return null;

            // Récupération du profil public.users
            const { data: profile, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            // Fallback si le trigger n'a pas encore couru (rare mais possible)
            if (error || !profile) {
                return {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: session.user.user_metadata.full_name || 'Utilisateur',
                    role: 'admin',
                    organization_id: undefined
                };
            }

            return {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                role: profile.role,
                organization_id: profile.organization_id,
                avatar: profile.avatar_url,
                is_super_admin: false // Désactivé par sécurité par défaut
            };
        },

        login: async (email: string, pass: string) => {
            if (!supabase) throw new Error("Supabase non configuré");
            const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
            if (error) throw error;
        },

        register: async (name: string, email: string, password: string) => {
            if (!supabase) throw new Error("Supabase non configuré");
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: name } }
            });
            if (error) throw error;
        },

        logout: async () => {
            if (supabase) await supabase.auth.signOut();
            localStorage.clear();
        },

        connectGoogleBusiness: async () => {
            if (!supabase) return;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        access_type: 'offline', // OBLIGATOIRE pour le refresh_token
                        prompt: 'consent',      // OBLIGATOIRE pour forcer le renvoi du refresh_token
                    },
                    scopes: 'https://www.googleapis.com/auth/business.manage'
                }
            });
            if (error) throw error;
        },

        disconnectGoogle: async () => {
            const user = await api.auth.getUser();
            if (user?.organization_id && supabase) {
                await supabase.from('organizations').update({
                    google_access_token: null,
                    google_refresh_token: null
                }).eq('id', user.organization_id);
            }
        },

        updateProfile: async (data: Partial<User>) => {
            if (!supabase) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('users').update(data).eq('id', user.id);
            }
        },
        
        changePassword: async () => {},
        deleteAccount: async () => { if(supabase) await supabase.functions.invoke('delete_account'); },
        resetPassword: async (email: string) => { if(supabase) await supabase.auth.resetPasswordForEmail(email); }
    },

    organization: {
        get: async (): Promise<Organization | null> => {
            const user = await api.auth.getUser();
            if (!supabase || !user?.organization_id) return null;

            const { data, error } = await supabase
                .from('organizations')
                .select('*, locations(*), staff_members(*), offers(*), workflows(*)')
                .eq('id', user.organization_id)
                .single();

            if (error) return null;

            return {
                ...data,
                integrations: {
                    ...data.integrations,
                    google: !!data.google_refresh_token // Vrai check de connexion
                }
            };
        },

        update: async (data: Partial<Organization>) => {
            const user = await api.auth.getUser();
            if (user?.organization_id && supabase) {
                await supabase.from('organizations').update(data).eq('id', user.organization_id);
            }
        },

        saveGoogleTokens: async () => {
            if (!supabase) return false;
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.provider_token) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    const updates: any = { google_access_token: session.provider_token };
                    
                    if (session.provider_refresh_token) {
                        updates.google_refresh_token = session.provider_refresh_token;
                    }
                    
                    await supabase.from('organizations').update(updates).eq('id', user.organization_id);
                    return true;
                }
            }
            return false;
        },
        
        addStaffMember: async (name: string, role: string, email: string) => {
             const user = await api.auth.getUser();
             if(user?.organization_id && supabase) await supabase.from('staff_members').insert({name, role, email, organization_id: user.organization_id});
        },
        removeStaffMember: async (id: string) => { if(supabase) await supabase.from('staff_members').delete().eq('id', id); },
        generateApiKey: async (name: string) => { if(supabase) await supabase.functions.invoke('manage_org_settings', { body: { action: 'generate_api_key', data: { name } } }); },
        revokeApiKey: async (id: string) => { if(supabase) await supabase.functions.invoke('manage_org_settings', { body: { action: 'revoke_api_key', data: { id } } }); },
        saveWebhook: async (config: any) => {},
        testWebhook: async (id: string) => true,
        deleteWebhook: async (id: string) => {},
        simulatePlanChange: async (plan: string) => {},
        create: async (name: string, industry: string) => { return null as any; }
    },

    reviews: {
        list: async (filters: any = {}): Promise<Review[]> => {
            const user = await api.auth.getUser();
            if (!supabase || !user?.organization_id) return [];

            const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', user.organization_id);
            const locIds = locations?.map((l: any) => l.id) || [];

            if (locIds.length === 0) return [];

            let query = supabase.from('reviews')
                .select('*')
                .in('location_id', locIds)
                .order('received_at', { ascending: false });

            if (filters.status && filters.status !== 'all') {
                if (filters.status === 'todo') query = query.in('status', ['pending', 'draft']);
                else if (filters.status === 'done') query = query.eq('status', 'sent');
            }
            if (filters.limit) query = query.limit(filters.limit);

            const { data } = await query;
            return (data || []).map((r: any) => ({ ...r, body: r.text || r.body }));
        },
        
        reply: async (id: string, text: string) => {
            if(supabase) await supabase.functions.invoke('post_google_reply', { body: { reviewId: id, replyText: text } });
        },
        
        saveDraft: async (id: string, text: string) => { if(supabase) await supabase.from('reviews').update({ status: 'draft', ai_reply: { text, needs_manual_validation: true } }).eq('id', id); },
        addNote: async (id: string, text: string) => ({ id: '1', text, author_name: 'Moi', created_at: new Date().toISOString() }),
        addTag: async (id: string, tag: string) => {},
        removeTag: async (id: string, tag: string) => {},
        archive: async (id: string) => {},
        unarchive: async (id: string) => {},
        getCounts: async () => ({ todo: 0, done: 0 }),
        getTimeline: (review: Review) => [],
        subscribe: (cb: any) => { 
            if(!supabase) return { unsubscribe: () => {} };
            return supabase.channel('reviews').on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, cb).subscribe(); 
        },
        uploadCsv: async (f: any) => 0
    },

    locations: {
        create: async (data: any) => {
            const user = await api.auth.getUser();
            if (user?.organization_id && supabase) {
                await supabase.from('locations').insert({ ...data, organization_id: user.organization_id });
            }
        },
        update: async (id: string, data: any) => { if(supabase) await supabase.from('locations').update(data).eq('id', id); },
        delete: async (id: string) => { if(supabase) await supabase.from('locations').delete().eq('id', id); },
        importFromGoogle: async () => {
            if(!supabase) return 0;
            const { data, error } = await supabase.functions.invoke('cron_sync_reviews');
            if (error) throw error;
            return data?.count || 0;
        }
    },

    ai: {
        generateReply: async (review: Review, config: any) => {
            if(!supabase) return "Mode démo : Réponse IA désactivée.";
            const { data, error } = await supabase.functions.invoke('ai_generate', { 
                body: { task: 'generate_reply', context: { review, ...config } } 
            });
            if (error || !data) return "Erreur de génération IA.";
            return data.text;
        },
        generateSocialPost: async () => "Post généré par IA...",
        previewBrandVoice: async () => "Aperçu du ton de marque...",
        generateManagerAdvice: async () => "Conseil managérial...",
        runCustomTask: async () => ({}),
        chatWithSupport: async () => "Je suis là pour vous aider.",
        getCoachAdvice: async () => ({ title: "Bienvenue", message: "Complétez votre profil.", focus_area: "setup" } as AiCoachMessage)
    },

    analytics: { 
        getOverview: async () => EMPTY_ANALYTICS 
    },

    competitors: { list: async () => [], create: async () => {}, delete: async () => {}, getReports: async () => [], saveReport: async () => {}, autoDiscover: async () => [], getDeepAnalysis: async () => null },
    social: { getPosts: async () => [], schedulePost: async () => {}, uploadMedia: async () => "", connectAccount: async () => {}, saveTemplate: async () => {} },
    marketing: { getBlogPosts: async () => [], saveBlogPost: async () => {}, generateSeoMeta: async () => ({}), analyzeCompetitorSeo: async () => ({}) as any, generateRichSnippet: async () => "", generateCampaignContent: async () => ({}) as any },
    automation: { getWorkflows: async () => [], saveWorkflow: async () => {}, deleteWorkflow: async () => {}, run: async () => ({ processed: 0, actions: 0 }) },
    team: { list: async () => [], invite: async () => ({ success: true }) },
    reports: { trigger: async () => {} },
    billing: { getInvoices: async () => [], getUsage: async () => 0, createCheckoutSession: async () => "", createPortalSession: async () => "" },
    activity: { getRecent: async () => [] },
    onboarding: { checkStatus: async () => ({ completionPercentage: 0 } as any) },
    public: { getLocationInfo: async () => null, getWidgetReviews: async () => [], submitFeedback: async () => {} },
    widgets: { requestIntegration: async () => {} },
    campaigns: { send: async () => {}, getHistory: async () => [] },
    offers: { validate: async () => ({ valid: false }), redeem: async () => {}, create: async () => {} },
    customers: { list: async () => [], update: async () => {}, import: async () => {}, enrichProfile: async () => ({}) as any },
    system: { checkHealth: async () => ({ db: true, latency: 0 }) },
    admin: { getStats: async () => ({}) as any },
    google: { fetchAllGoogleLocations: async () => [], syncReviewsForLocation: async () => 0 },
    company: { search: async () => [] },
    support: { sendTicket: async () => {}, getTutorials: async () => [] },
    progression: { get: async () => ({} as any), getBadges: async () => [], getMilestones: async () => [] },
    notifications: { list: async () => [], markAllRead: async () => {}, sendTestEmail: async () => {} },
    global: { search: async () => [] }
};
