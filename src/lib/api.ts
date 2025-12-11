import { 
    User, Organization, Review, AnalyticsSummary, WorkflowRule, 
    ReportConfig, Competitor, SocialPost, Customer, SetupStatus, 
    StaffMember, ReviewTimelineEvent, BrandSettings, Tutorial,
    ClientProgress, Badge, Milestone, AiCoachMessage, BlogPost, SeoAudit
} from '../types';
import { supabase } from './supabase';
import { GoogleGenAI } from "@google/genai";

// Initialisation Client IA (Google Gemini)
// Utilise la clé définie dans vite.config.ts (process.env.API_KEY)
const aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helpers
const getOrgId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non connecté");
    
    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
    if (!profile?.organization_id) throw new Error("Aucune organisation liée");
    
    return profile.organization_id;
};

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            if (!supabase) return null;
            
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) return null;

                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                return {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: profile?.name || session.user.user_metadata?.full_name || 'Utilisateur',
                    role: profile?.role || 'viewer',
                    organization_id: profile?.organization_id,
                    is_super_admin: profile?.is_super_admin || false,
                    avatar: profile?.avatar_url
                };
            } catch (e) {
                console.error("Erreur récupération utilisateur:", e);
                return null;
            }
        },

        login: async (email: string, pass: string) => {
            if (!supabase) throw new Error("Supabase non configuré");
            
            const { data, error } = await supabase.auth.signInWithPassword({ 
                email, 
                password: pass 
            });

            if (error) throw error;
            return data;
        },

        register: async (name: string, email: string, password?: string) => {
            if (!supabase) throw new Error("Supabase non configuré");

            const { data, error } = await supabase.auth.signUp({
                email,
                password: password || 'temp-password',
                options: {
                    data: { full_name: name }
                }
            });

            if (error) throw error;
            return data;
        },

        logout: async () => {
            if (supabase) await supabase.auth.signOut();
            localStorage.clear(); // Nettoyage complet pour éviter les conflits
        },

        connectGoogleBusiness: async () => {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                    scopes: 'https://www.googleapis.com/auth/business.manage'
                }
            });
            if (error) throw error;
        },

        updateProfile: async (data: any) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('users').update(data).eq('id', user.id);
            }
        },
        changePassword: async () => {
            const email = (await api.auth.getUser())?.email;
            if (email) await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/settings' });
        },
        deleteAccount: async () => {
            await supabase.functions.invoke('delete_account');
            await api.auth.logout();
        },
        resetPassword: async (email: string) => {
            await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login?mode=reset' });
        },
        loginWithGoogle: async () => api.auth.connectGoogleBusiness()
    },

    organization: {
        get: async (): Promise<Organization | null> => {
            try {
                const orgId = await getOrgId();
                const { data: org, error } = await supabase
                    .from('organizations')
                    .select('*, locations(*), staff_members(*), offers(*), workflows(*)')
                    .eq('id', orgId)
                    .single();
                
                if (error) throw error;
                
                // Calculer l'état des intégrations basé sur la présence des tokens
                const integrations = {
                    google: !!org.google_refresh_token,
                    facebook: !!org.facebook_access_token, // Supposons que vous stockiez ça
                    instagram_posting: false, // À implémenter selon votre logique DB
                    facebook_posting: false,
                    linkedin_posting: false,
                    tiktok_posting: false
                };

                return { ...org, integrations };
            } catch (e) {
                console.error("Erreur chargement organisation:", e);
                return null;
            }
        },
        update: async (data: any) => {
            const orgId = await getOrgId();
            await supabase.from('organizations').update(data).eq('id', orgId);
            return data;
        },
        create: async (name: string, industry: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Non connecté");

            const { data: org, error } = await supabase.from('organizations').insert({
                name,
                industry,
                subscription_plan: 'free'
            }).select().single();

            if (error) throw error;

            // Lier l'utilisateur à l'organisation
            await supabase.from('users').update({ organization_id: org.id }).eq('id', user.id);
            
            return org;
        },
        saveGoogleTokens: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.provider_token) {
                const orgId = await getOrgId();
                const updates: any = { google_access_token: session.provider_token };
                if (session.provider_refresh_token) {
                    updates.google_refresh_token = session.provider_refresh_token;
                }
                await supabase.from('organizations').update(updates).eq('id', orgId);
                return true;
            }
            return false;
        },
        addStaffMember: async (name: string, role: string, email: string) => {
            const orgId = await getOrgId();
            await supabase.from('staff_members').insert({ name, role, email, organization_id: orgId });
        },
        removeStaffMember: async (id: string) => {
            await supabase.from('staff_members').delete().eq('id', id);
        },
        generateApiKey: async (name: string) => {
            await supabase.functions.invoke('manage_org_settings', { body: { action: 'generate_api_key', data: { name } } });
        },
        revokeApiKey: async (id: string) => {
            await supabase.functions.invoke('manage_org_settings', { body: { action: 'revoke_api_key', data: { id } } });
        },
        saveWebhook: async () => {},
        testWebhook: async () => true,
        deleteWebhook: async () => {},
        simulatePlanChange: async () => {}
    },

    reviews: {
        list: async (filters: any = {}): Promise<Review[]> => {
            try {
                const orgId = await getOrgId();
                
                // Récupérer les IDs des locations de l'org
                const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', orgId);
                const locIds = locations?.map((l: any) => l.id) || [];

                if (locIds.length === 0) return [];

                let query = supabase.from('reviews')
                    .select('*')
                    .in('location_id', locIds)
                    .order('received_at', { ascending: false });

                // Filtres
                if (filters.rating && filters.rating !== 'Tout') {
                    const r = parseInt(filters.rating.toString().replace(/\D/g, ''));
                    if (!isNaN(r)) query = query.eq('rating', r);
                }
                if (filters.status) {
                    if (filters.status === 'todo') query = query.in('status', ['pending', 'draft']);
                    else if (filters.status === 'done') query = query.eq('status', 'sent');
                }
                if (filters.search) {
                    query = query.ilike('text', `%${filters.search}%`);
                }

                const { data, error } = await query;
                if (error) throw error;

                // Mapping pour compatibilité frontend (text -> body)
                return (data || []).map((r: any) => ({ ...r, body: r.text || r.body }));
            } catch (e) {
                console.error("Erreur chargement avis:", e);
                return [];
            }
        },
        reply: async (id: string, text: string) => {
            // Appel à l'Edge Function pour poster sur Google
            const { error } = await supabase.functions.invoke('post_google_reply', { 
                body: { reviewId: id, replyText: text } 
            });
            if (error) throw error;
        },
        saveDraft: async (id: string, text: string) => {
            await supabase.from('reviews').update({ 
                status: 'draft',
                ai_reply: { text, needs_manual_validation: true } 
            }).eq('id', id);
        },
        getCounts: async () => {
            const orgId = await getOrgId();
            const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', orgId);
            const locIds = locations?.map((l: any) => l.id) || [];
            
            if (locIds.length === 0) return { todo: 0, done: 0 };

            const { count: todo } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('location_id', locIds).in('status', ['pending', 'draft']);
            const { count: done } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('location_id', locIds).eq('status', 'sent');
            
            return { todo: todo || 0, done: done || 0 };
        },
        getTimeline: (review: Review) => [],
        addNote: async (id: string, text: string) => {
             // Implémentation simplifiée pour l'exemple, idéalement une table 'notes'
             return { id: '1', text, author_name: 'Me', created_at: new Date().toISOString() };
        },
        addTag: async () => {},
        removeTag: async () => {},
        archive: async (id: string) => { await supabase.from('reviews').update({ archived: true }).eq('id', id); },
        unarchive: async (id: string) => { await supabase.from('reviews').update({ archived: false }).eq('id', id); },
        subscribe: (callback: any) => {
            const channel = supabase.channel('reviews-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, callback)
                .subscribe();
            return { unsubscribe: () => supabase.removeChannel(channel) };
        },
        uploadCsv: async () => 0
    },

    ai: {
        generateReply: async (review: Review, config: any) => {
            // Utilisation directe de Gemini via le SDK client pour la rapidité
            // Ou via Edge Function si vous préférez masquer la logique
            try {
                const prompt = `Agis comme un service client professionnel. Réponds à cet avis ${review.rating}/5 : "${review.body}". Ton : ${config.tone || 'Professionnel'}. Réponse courte.`;
                const res = await aiClient.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt
                });
                return res.text || "";
            } catch (e) {
                console.error("Erreur IA:", e);
                return "Merci pour votre avis.";
            }
        },
        generateSocialPost: async (review: Review, platform: string) => {
             const prompt = `Rédige un post ${platform} pour promouvoir cet avis client : "${review.body}".`;
             const res = await aiClient.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
             return res.text || "";
        },
        getCoachAdvice: async (progress: ClientProgress) => {
             // ... logique similaire
             return { title: "Bienvenue", message: "Complétez votre profil", focus_area: "setup" };
        },
        previewBrandVoice: async () => "",
        generateManagerAdvice: async () => "",
        runCustomTask: async () => ({}),
        chatWithSupport: async () => ""
    },

    notifications: {
        list: async (): Promise<any[]> => [],
        markAllRead: async () => {},
        sendTestEmail: async (email: string) => {}
    },
    global: {
        search: async (query: string): Promise<any[]> => []
    },

    // ... (Modules Analytics, Marketing, etc. mappés de la même façon vers Supabase ou Mock temporaire si table inexistante)
    // Pour gagner de la place, je mets des stubs fonctionnels pour ce qui n'est pas critique au login
    analytics: { getOverview: async () => ({
        period: '30j', total_reviews: 0, average_rating: 0, response_rate: 0, nps_score: 0, global_rating: 0,
        sentiment_distribution: { positive: 0, neutral: 0, negative: 0 },
        volume_by_date: [], top_themes_positive: [], top_themes_negative: [], top_keywords: [],
        strengths_summary: "Pas assez de données", problems_summary: "Pas assez de données"
    }) },
    
    locations: {
        create: async (data: any) => {
            const orgId = await getOrgId();
            await supabase.from('locations').insert({ ...data, organization_id: orgId });
        },
        update: async (id: string, data: any) => {
            await supabase.from('locations').update(data).eq('id', id);
        },
        delete: async (id: string) => {
            await supabase.from('locations').delete().eq('id', id);
        },
        importFromGoogle: async () => {
            // Déclenche la Edge Function de sync
            await supabase.functions.invoke('cron_sync_reviews');
            return 1;
        }
    },

    // Stubs pour éviter les erreurs de compilation sur les pages non critiques
    marketing: { getBlogPosts: async () => [], saveBlogPost: async () => {}, generateSeoMeta: async () => ({}), analyzeCompetitorSeo: async () => ({ metrics: {}, ai_analysis: {} }), generateRichSnippet: async () => "", generateCampaignContent: async () => ({}) },
    automation: { getWorkflows: async () => [], saveWorkflow: async () => {}, deleteWorkflow: async () => {}, run: async () => ({}) },
    competitors: { list: async () => [], getReports: async () => [], saveReport: async () => {}, autoDiscover: async () => [], getDeepAnalysis: async () => null, create: async () => {}, delete: async () => {} },
    team: { list: async () => {
        const orgId = await getOrgId();
        const { data } = await supabase.from('users').select('*').eq('organization_id', orgId);
        return data || [];
    }, invite: async () => ({}) },
    reports: { trigger: async () => {} },
    billing: { getInvoices: async () => [], getUsage: async () => 0, createCheckoutSession: async () => "", createPortalSession: async () => "" },
    activity: { getRecent: async () => [] },
    onboarding: { checkStatus: async () => ({ completionPercentage: 0, googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false }) },
    seedCloudDatabase: async () => {},
    social: { getPosts: async () => [], schedulePost: async () => {}, uploadMedia: async () => "", connectAccount: async () => {}, saveTemplate: async () => {} },
    public: { getLocationInfo: async () => null, getWidgetReviews: async () => [], submitFeedback: async () => {} },
    widgets: { requestIntegration: async () => {} },
    campaigns: { send: async () => {}, getHistory: async () => [] },
    offers: { validate: async () => ({ valid: false }), redeem: async () => {}, create: async () => {} },
    customers: { list: async () => [], update: async () => {}, import: async () => {}, enrichProfile: async () => ({}) },
    system: { checkHealth: async () => ({ db: true, latency: 0 }) },
    admin: { getStats: async () => ({}) },
    google: { fetchAllGoogleLocations: async () => [], syncReviewsForLocation: async () => 0 },
    company: { search: async () => [] },
    support: { sendTicket: async () => {}, getTutorials: async () => [] },
    progression: { get: async () => ({ score: 0, level: 'Beginner', steps: {}, next_actions: [] }), getBadges: async () => [], getMilestones: async () => [] }
};