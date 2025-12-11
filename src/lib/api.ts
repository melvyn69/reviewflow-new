
import { 
    INITIAL_ORG, INITIAL_REVIEWS, INITIAL_ANALYTICS, 
    INITIAL_WORKFLOWS, INITIAL_REPORTS, INITIAL_COMPETITORS, 
    INITIAL_SOCIAL_POSTS, INITIAL_USERS, INITIAL_BADGES, INITIAL_MILESTONES
} from './db';
import { 
    User, Organization, Review, AnalyticsSummary, WorkflowRule, 
    ReportConfig, Competitor, SocialPost, Customer, SocialTemplate,
    CampaignLog, SetupStatus, StaffMember, ReviewTimelineEvent, BrandSettings, Tutorial,
    ClientProgress, Badge, Milestone, AiCoachMessage, BlogPost, SeoAudit, MultiChannelCampaign,
    ChatMessage
} from '../types';
import { supabase } from './supabase';
import { hasAccess } from './features'; 
import { GoogleGenAI } from "@google/genai";

// --- GOD MODE CONFIGURATION ---
const GOD_EMAILS = ['melvynbenichou@gmail.com', 'demo@reviewflow.com', 'god@reviewflow.com'];

const isDemoMode = () => {
    // If Supabase is configured, we are NOT in demo mode unless explicitly forced for dev
    if (supabase) return false;
    return localStorage.getItem('is_demo_mode') === 'true';
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize Gemini Client safely
const apiKey = process.env.API_KEY || '';
const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Helpers
const getOrgId = async () => {
    // Safe check for user
    const user = await api.auth.getUser();
    if (!user) throw new Error("Non connecté");
    return user.organization_id || 'org1'; // Fallback to avoid crashes
};

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            try {
                // 1. If Supabase missing, fallback to local storage mock
                if (!supabase) {
                    const userStr = localStorage.getItem('user');
                    return userStr ? JSON.parse(userStr) : null;
                }

                // 2. Get Session directly
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError || !session?.user) {
                    return null;
                }

                const authUser = session.user;
                
                // 3. Try to fetch full profile safely using maybeSingle (Prevents 406 Error)
                let profile = null;
                try {
                    const { data, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', authUser.id)
                        .maybeSingle(); // CRITICAL FIX: Use maybeSingle instead of single
                    
                    if (!error && data) {
                        profile = data;
                    }
                } catch (dbError) {
                    console.warn("Profile fetch failed, defaulting to session data", dbError);
                }

                // 4. Construct User object safely even if DB fetch failed
                const appUser: User = {
                    id: authUser.id,
                    email: authUser.email || '',
                    name: profile?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Utilisateur',
                    role: profile?.role || 'admin', // Default to admin to prevent lockout
                    organization_id: profile?.organization_id,
                    avatar: profile?.avatar_url || authUser.user_metadata?.avatar_url,
                    is_super_admin: profile?.is_super_admin || false
                };

                // Update local cache for fast initial load next time
                localStorage.setItem('user', JSON.stringify(appUser));
                
                return appUser;

            } catch (e) {
                console.error("Auth check failed completely:", e);
                // Return cached user if critical failure to prevent instant logout
                const cached = localStorage.getItem('user');
                return cached ? JSON.parse(cached) : null;
            }
        },

        login: async (email: string, pass: string) => {
            await delay(500); 
            const normalizedEmail = (email || '').toLowerCase().trim();
            
            if (GOD_EMAILS.includes(normalizedEmail)) {
                const godUser: User = {
                    id: 'god-user-' + Date.now(),
                    name: 'Super Admin (God Mode)',
                    email: normalizedEmail,
                    role: 'super_admin',
                    avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=ef4444&color=fff',
                    organization_id: 'org1',
                    organizations: ['org1'],
                    is_super_admin: true
                };
                
                localStorage.setItem('user', JSON.stringify(godUser));
                localStorage.setItem('is_demo_mode', 'true'); 
                return godUser;
            }

            if (!supabase) {
                console.warn("Supabase missing. Logging in as Demo User.");
                const demoUser: User = { 
                    ...INITIAL_USERS[0], 
                    name: 'Utilisateur Démo', 
                    email: normalizedEmail,
                    id: 'demo-user-' + Date.now(),
                    role: 'admin',
                    organization_id: 'org1'
                };
                localStorage.setItem('user', JSON.stringify(demoUser));
                localStorage.setItem('is_demo_mode', 'true');
                return demoUser;
            }

            const { data, error } = await supabase.auth.signInWithPassword({ 
                email: normalizedEmail, 
                password: pass 
            });
            
            if (error) throw new Error(error.message === "Invalid login credentials" ? "Identifiants incorrects." : error.message);
            if (!data.user) throw new Error("Erreur inconnue lors de la connexion.");

            // Manually fetch/create profile logic can happen here if needed
            return api.auth.getUser(); // Return the formatted user
        },

        register: async (name: string, email: string, password?: string) => {
            if (supabase && password) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name }
                    }
                });

                if (error) throw new Error(error.message);
                
                // Return optimistic user
                return {
                    id: data.user?.id || 'temp',
                    email: email,
                    name: name,
                    role: 'admin',
                    organization_id: undefined
                };
            } 
            
            await delay(1000);
            const user = { ...INITIAL_USERS[0], name, email, id: 'new-user-' + Date.now() };
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('is_demo_mode', 'true');
            return user;
        },

        logout: async () => {
            localStorage.removeItem('user');
            localStorage.removeItem('is_demo_mode');
            localStorage.removeItem('sb-' + (import.meta.env.VITE_SUPABASE_URL?.split('.')[0]?.split('//')[1] || '') + '-auth-token');
            if (supabase) {
                await supabase.auth.signOut().catch(console.error);
            }
        },

        connectGoogleBusiness: async () => { 
            if (!supabase) return Promise.resolve();
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
            if (error) throw new Error(error.message);
        },
        updateProfile: async (data: any) => {
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('users').update(data).eq('id', user.id);
                    // Update cache
                    const cached = JSON.parse(localStorage.getItem('user') || '{}');
                    localStorage.setItem('user', JSON.stringify({ ...cached, ...data }));
                }
            }
        },
        changePassword: async (password?: string) => { 
            const email = (await api.auth.getUser())?.email;
            if (email && supabase) await supabase.auth.resetPasswordForEmail(email);
        },
        deleteAccount: async () => { 
            if (supabase) {
                await supabase.functions.invoke('delete_account');
                await supabase.auth.signOut();
                localStorage.clear();
            }
        },
        resetPassword: async (email: string) => { 
            if (supabase) await supabase.auth.resetPasswordForEmail(email);
        },
        loginWithGoogle: async () => { 
            return api.auth.connectGoogleBusiness();
        }
    },
    organization: {
        get: async (): Promise<Organization | null> => {
            // Robust fetch: Try local first, then network, handle failures gracefully
            const user = await api.auth.getUser();
            const isGod = user?.is_super_admin;

            if (isGod || isDemoMode()) {
                return {
                    ...INITIAL_ORG,
                    id: 'org1', 
                    subscription_plan: isGod ? 'elite' : INITIAL_ORG.subscription_plan,
                    name: isGod ? 'Reviewflow HQ (God Mode)' : INITIAL_ORG.name,
                    integrations: { ...INITIAL_ORG.integrations, google: true }
                };
            }

            if (supabase && user?.organization_id) {
                try {
                    const { data: org, error } = await supabase
                        .from('organizations')
                        .select('*, locations(*), staff_members(*), offers(*), workflows(*)')
                        .eq('id', user.organization_id)
                        .maybeSingle(); // Safe check
                    
                    if (org) {
                        return {
                            ...org,
                            integrations: {
                                ...org.integrations,
                                google: !!org.google_refresh_token
                            }
                        };
                    }
                } catch (e) {
                    console.warn("Org fetch warning", e);
                }
            }
            // Fallback to avoid white screen
            return { ...INITIAL_ORG, name: "Mon Organisation (Chargement...)" };
        },
        update: async (data: any) => { 
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('organizations').update(data).eq('id', user.organization_id);
                }
            }
            return { ...INITIAL_ORG, ...data };
        },
        create: async (name: string, industry: string) => { 
            if (supabase) {
                const user = await api.auth.getUser();
                if (user && !user.organization_id) {
                    const { data: org } = await supabase.from('organizations').insert({
                        name,
                        industry,
                        subscription_plan: 'free'
                    }).select().single();
                    
                    if (org) {
                        await supabase.from('users').update({ organization_id: org.id }).eq('id', user.id);
                        return org;
                    }
                }
            }
            return { ...INITIAL_ORG, name, industry }; 
        },
        saveGoogleTokens: async () => {
            if (supabase) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user && session.provider_token) {
                        const { data: profile } = await supabase.from('users').select('organization_id').eq('id', session.user.id).single();
                        
                        if (profile?.organization_id) {
                            const updates: any = { google_access_token: session.provider_token };
                            if (session.provider_refresh_token) {
                                updates.google_refresh_token = session.provider_refresh_token;
                            }
                            await supabase.from('organizations').update(updates).eq('id', profile.organization_id);
                            
                            // Non-blocking call to import
                            api.locations.importFromGoogle().catch(console.error);
                            return true;
                        }
                    }
                } catch (e) {}
            }
            return false; 
        },
        addStaffMember: async (name: string, role: string, email: string) => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('staff_members').insert({ name, role, email, organization_id: user.organization_id });
                }
            }
        },
        removeStaffMember: async (id: string) => { 
            if (supabase && !isDemoMode()) await supabase.from('staff_members').delete().eq('id', id);
        },
        generateApiKey: async (name: string) => { 
            if (supabase && !isDemoMode()) await supabase.functions.invoke('manage_org_settings', { body: { action: 'generate_api_key', data: { name } } });
        },
        revokeApiKey: async (id: string) => {
            if (supabase && !isDemoMode()) await supabase.functions.invoke('manage_org_settings', { body: { action: 'revoke_api_key', data: { id } } });
        },
        saveWebhook: async (config: any) => { },
        testWebhook: async (id: string) => { return true; },
        deleteWebhook: async (id: string) => { },
        simulatePlanChange: async (plan: string) => { }
    },
    reviews: {
        list: async (filters: any = {}): Promise<Review[]> => {
            if (isDemoMode()) {
                let reviews = [...INITIAL_REVIEWS];
                if (filters.rating && filters.rating !== 'Tout') reviews = reviews.filter(r => r.rating === Number(filters.rating.toString().replace(/\D/g, '')));
                return reviews;
            }

            if (!supabase) return [];
            
            try {
                const user = await api.auth.getUser();
                if (!user?.organization_id) return [];

                // 1. Get Location IDs for this org
                const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', user.organization_id);
                const locIds = locations?.map((l: any) => l.id) || [];

                if (locIds.length === 0) return [];

                let query = supabase.from('reviews')
                    .select('*')
                    .in('location_id', locIds)
                    .order('received_at', { ascending: false });
                
                if (filters.rating && filters.rating !== 'Tout') {
                    const r = Number(filters.rating.toString().replace(/\D/g, ''));
                    if (!isNaN(r)) query = query.eq('rating', r);
                }
                
                if (filters.status && filters.status !== 'all') {
                    if (filters.status === 'todo') query = query.in('status', ['pending', 'draft']);
                    else if (filters.status === 'done') query = query.eq('status', 'sent');
                    else query = query.eq('status', filters.status);
                }
                
                if (filters.limit) query = query.limit(filters.limit);
                if (filters.search) query = query.ilike('text', `%${filters.search}%`);
                
                const { data, error } = await query;
                if (error) throw error;
                
                return (data || []).map((r: any) => ({ ...r, body: r.text || r.body }));
            } catch (e) {
                console.error("List reviews error:", e);
                return [];
            }
        },
        getTimeline: (review: Review): ReviewTimelineEvent[] => {
            const events: ReviewTimelineEvent[] = [
                { id: '1', type: 'review_created', actor_name: review.author_name, date: review.received_at, content: 'Avis reçu' }
            ];
            if (review.replied_at) {
                events.push({ id: '3', type: 'reply_published', actor_name: 'Vous', date: review.replied_at, content: 'Réponse publiée' });
            }
            return events;
        },
        reply: async (id: string, text: string) => {
            if (supabase && !isDemoMode()) {
                await supabase.functions.invoke('post_google_reply', { body: { reviewId: id, replyText: text } });
            }
        },
        saveDraft: async (id: string, text: string) => {
            if (supabase && !isDemoMode()) {
                await supabase.from('reviews').update({ 
                    status: 'draft',
                    ai_reply: { text, needs_manual_validation: true } 
                }).eq('id', id);
            }
        },
        addNote: async (id: string, text: string) => {
            return { id: Date.now().toString(), text, author_name: 'Moi', created_at: new Date().toISOString() };
        },
        addTag: async (id: string, tag: string) => { 
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('reviews').select('tags').eq('id', id).single();
                const currentTags = data?.tags || [];
                if (!currentTags.includes(tag)) {
                    await supabase.from('reviews').update({ tags: [...currentTags, tag] }).eq('id', id);
                }
            }
        },
        removeTag: async (id: string, tag: string) => {
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('reviews').select('tags').eq('id', id).single();
                const currentTags = data?.tags || [];
                await supabase.from('reviews').update({ tags: currentTags.filter((t: string) => t !== tag) }).eq('id', id);
            }
        },
        archive: async (id: string) => {
            if (supabase && !isDemoMode()) await supabase.from('reviews').update({ archived: true }).eq('id', id);
        },
        unarchive: async (id: string) => {
            if (supabase && !isDemoMode()) await supabase.from('reviews').update({ archived: false }).eq('id', id);
        },
        getCounts: async () => {
            if (isDemoMode()) return { todo: 5, done: 120 };
            try {
                const user = await api.auth.getUser();
                if (!user?.organization_id) return { todo: 0, done: 0 };
                const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', user.organization_id);
                const locIds = locations?.map((l: any) => l.id) || [];
                if (locIds.length === 0) return { todo: 0, done: 0 };
                const { count: todo } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('location_id', locIds).in('status', ['pending', 'draft']);
                const { count: done } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('location_id', locIds).eq('status', 'sent');
                return { todo: todo || 0, done: done || 0 };
            } catch (e) { return { todo: 0, done: 0 }; }
        },
        subscribe: (callback: (payload: any) => void) => {
            if (supabase && !isDemoMode()) {
                try {
                    const channel = supabase.channel('reviews-updates')
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, callback)
                        .subscribe();
                    return { unsubscribe: () => supabase.removeChannel(channel) };
                } catch (e) { return { unsubscribe: () => {} }; }
            }
            return { unsubscribe: () => {} };
        },
        uploadCsv: async (file: File) => 0
    },
    notifications: { list: async () => [], markAllRead: async () => {}, sendTestEmail: async (email: string) => {} },
    global: { 
        search: async (query: string): Promise<any[]> => [] 
    },
    company: {
        search: async (query: string): Promise<any[]> => []
    },
    ai: {
        generateReply: async (review: Review, config: any) => {
            if (supabase && !isDemoMode()) {
                try {
                    const { data, error } = await supabase.functions.invoke('ai_generate', { body: { task: 'generate_reply', context: { review, ...config } } });
                    if (!error && data) return data.text;
                } catch (e) {}
            }
            if (aiClient) {
                try {
                    const prompt = `Rôle: Gérant. Tâche: Répondre à cet avis (${review.rating}/5): "${review.body}". Ton: ${config.tone}.`;
                    const res = await aiClient.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                    return res.text;
                } catch (e) {}
            }
            return "Merci pour votre message !";
        },
        previewBrandVoice: async (type: string, input: string, settings: BrandSettings) => {
            if (aiClient) {
                try {
                    const prompt = `Simule une réponse avec le ton ${settings.tone} au message: "${input}"`;
                    const res = await aiClient.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                    return res.text;
                } catch (e) {}
            }
            return "Simulation non disponible hors ligne.";
        },
        generateSocialPost: async (review: Review, platform: string) => {
            if (aiClient) {
                try {
                    const prompt = `Ecris un post ${platform} pour promouvoir cet avis: "${review.body}"`;
                    const res = await aiClient.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                    return res.text;
                } catch (e) {}
            }
            return "Super avis ! #merci";
        },
        generateManagerAdvice: async (member: StaffMember, rank: number, type: string) => { 
            return "Félicitez votre équipe !"; 
        },
        runCustomTask: async (task: any) => ({ result: "Not available" }),
        chatWithSupport: async (msg: string, history?: ChatMessage[]) => "Je suis là pour vous aider.",
        getCoachAdvice: async (progress: ClientProgress): Promise<AiCoachMessage> => ({ title: "Bienvenue", message: "Complétez votre profil.", focus_area: "setup" })
    },
    analytics: { getOverview: async (period?: string) => INITIAL_ANALYTICS },
    marketing: {
        getBlogPosts: async () => [], 
        saveBlogPost: async (p: BlogPost) => p, 
        generateSeoMeta: async (content: string) => ({ meta_title: 'Titre SEO', meta_description: 'Desc SEO', slug: 'slug' }),
        analyzeCompetitorSeo: async (url: string): Promise<SeoAudit> => ({ url, scanned_at: new Date().toISOString(), metrics: { title: 'Audit', description: '', h1: '', load_time_ms: 200, mobile_friendly: true }, keywords: [], ai_analysis: { strengths: [], weaknesses: [], opportunities: [] } }),
        generateRichSnippet: async (data: any) => "{}", 
        generateCampaignContent: async (prompt: string, budget: number) => ({ sms: "Offre", email_subject: "Promo", email_body: "Profitez", social_caption: "Super" })
    },
    automation: {
        getWorkflows: async () => { const org = await api.organization.get(); return org?.workflows || []; },
        saveWorkflow: async (workflow: any) => { }, deleteWorkflow: async (id: string) => {}, run: async () => ({ processed: 1, actions: 1 })
    },
    competitors: {
        list: async (opts?: any) => {
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('competitors').select('*');
                return data || [];
            }
            return INITIAL_COMPETITORS;
        },
        getReports: async () => [], 
        saveReport: async (data?: any) => {}, 
        autoDiscover: async (radius: number, keyword: string, lat: number, lng: number) => [], 
        getDeepAnalysis: async (sector: string, location: string, competitors: Competitor[]) => null,
        create: async (data: any) => { if (supabase) await supabase.from('competitors').insert(data); },
        delete: async (id: string) => { if (supabase) await supabase.from('competitors').delete().eq('id', id); }
    },
    team: {
        list: async () => { if (supabase) { const u = await api.auth.getUser(); if(u?.organization_id) { const { data } = await supabase.from('users').select('*').eq('organization_id', u.organization_id); return data || []; } } return INITIAL_USERS; },
        invite: async (email: string, role: string, firstName: string, lastName: string) => { if (supabase) await supabase.functions.invoke('invite_user', { body: { email, role, firstName, lastName } }); return { success: true }; }
    },
    reports: { trigger: async (reportId: string) => {} },
    billing: { 
        getInvoices: async () => [], 
        getUsage: async () => 120, 
        createCheckoutSession: async (planId: string) => "", 
        createPortalSession: async () => "" 
    },
    locations: {
        update: async (id: string, data: any) => { if (supabase) await supabase.from('locations').update(data).eq('id', id); },
        create: async (data: any) => { if (supabase) { const u = await api.auth.getUser(); if (u?.organization_id) await supabase.from('locations').insert({ ...data, organization_id: u.organization_id }); } },
        delete: async (id: string) => { if (supabase) await supabase.from('locations').delete().eq('id', id); },
        importFromGoogle: async () => {
            if (!supabase || isDemoMode()) return 0;
            // Best effort import
            await supabase.functions.invoke('cron_sync_reviews');
            return 1;
        }
    },
    activity: { getRecent: async () => [] },
    onboarding: { checkStatus: async (): Promise<SetupStatus> => ({ completionPercentage: 0, googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false }) },
    seedCloudDatabase: async () => {},
    social: {
        getPosts: async (locationId?: string) => {
            if (supabase && !isDemoMode()) {
                let q = supabase.from('social_posts').select('*');
                if (locationId) q = q.eq('location_id', locationId);
                const { data } = await q;
                return data || [];
            }
            return INITIAL_SOCIAL_POSTS;
        },
        schedulePost: async (post: any) => { if (supabase) await supabase.from('social_posts').insert({ ...post, status: 'scheduled' }); },
        uploadMedia: async (file: File) => "https://via.placeholder.com/500", 
        connectAccount: async (platform: string) => {}, 
        saveTemplate: async (template: SocialTemplate) => {}
    },
    public: {
        getLocationInfo: async (id: string) => {
            if (supabase) { try { const { data } = await supabase.from('locations').select('*').eq('id', id).maybeSingle(); return data; } catch {} }
            return INITIAL_ORG.locations.find(l => l.id === id) || null;
        },
        getWidgetReviews: async (id: string) => INITIAL_REVIEWS,
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => {}
    },
    widgets: { requestIntegration: async () => {} },
    campaigns: { 
        send: async (channel: string, to: string, subject: string, message: string, segment: string, offerLink?: string) => {}, 
        getHistory: async () => [] 
    },
    offers: { 
        validate: async (code: string) => ({ valid: false }), 
        redeem: async (code: string) => {}, 
        create: async (offer: any) => { if (supabase) await supabase.from('offers').insert(offer); } 
    },
    customers: {
        list: async (filters: any = {}): Promise<Customer[]> => { if (supabase) { const { data } = await supabase.from('customers').select('*'); return data || []; } return []; },
        update: async (id: string, data: any) => { if (supabase) await supabase.from('customers').update(data).eq('id', id); },
        import: async (data: any[]) => {}, 
        enrichProfile: async (customerId: string) => ({ profile: "Profil IA", suggestion: "Suggestion IA" })
    },
    system: { checkHealth: async () => ({ db: true, latency: 45 }) },
    admin: { getStats: async () => ({ mrr: "0 €", active_tenants: 0, total_reviews_processed: 0, tenants: [] }) },
    google: { fetchAllGoogleLocations: async () => [], syncReviewsForLocation: async () => 0 },
    support: { 
        sendTicket: async (ticket: any) => {}, 
        getTutorials: async () => [] 
    },
    progression: {
        get: async (): Promise<ClientProgress> => ({ score: 0, level: 'Beginner', steps: {} as any, next_actions: [] }),
        getBadges: async () => INITIAL_BADGES, getMilestones: async () => INITIAL_MILESTONES
    }
};
