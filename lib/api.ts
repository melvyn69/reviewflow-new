
import { 
    INITIAL_ORG, INITIAL_REVIEWS, INITIAL_ANALYTICS, 
    INITIAL_WORKFLOWS, INITIAL_REPORTS, INITIAL_COMPETITORS, 
    INITIAL_SOCIAL_POSTS, INITIAL_USERS, INITIAL_BADGES, INITIAL_MILESTONES
} from './db';
import { 
    User, Organization, Review, AnalyticsSummary, WorkflowRule, 
    ReportConfig, Competitor, SocialPost, Customer, SocialTemplate,
    CampaignLog, SetupStatus, StaffMember, ReviewTimelineEvent, BrandSettings, Tutorial,
    ClientProgress, Badge, Milestone, AiCoachMessage, BlogPost, SeoAudit, MultiChannelCampaign
} from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { hasAccess } from './features'; 
import { GoogleGenAI } from "@google/genai";

// --- GOD MODE CONFIGURATION ---
// These emails will ALWAYS be Super Admin with Elite Plan, no matter what.
const GOD_EMAILS = ['melvynbenichou@gmail.com', 'demo@reviewflow.com', 'god@reviewflow.com'];

const isDemoMode = () => localStorage.getItem('is_demo_mode') === 'true';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            try {
                // Priority 1: Check LocalStorage (Fastest)
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        // FORCE UPGRADE ON READ FOR GOD USERS
                        if (GOD_EMAILS.includes(user.email)) {
                            if (user.role !== 'super_admin') {
                                user.role = 'super_admin';
                                localStorage.setItem('user', JSON.stringify(user));
                            }
                            return user;
                        }
                        return user;
                    } catch (e) {
                        console.warn("Corrupt user data in localStorage, clearing.");
                        localStorage.removeItem('user');
                    }
                }
                
                // Priority 2: Check Real Supabase Session
                if (isSupabaseConfigured()) {
                    const { data: { session }, error } = await supabase.auth.getSession();
                    
                    if (session?.user) {
                        // Try to fetch profile
                        const { data: profile, error: profileError } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', session.user.id)
                            .single();
                        
                        if (profile) {
                            const fullUser = { ...profile, email: session.user.email } as User;
                            localStorage.setItem('user', JSON.stringify(fullUser)); // Sync local
                            return fullUser;
                        } 
                        
                        console.warn("User authenticated but no profile found in DB.", profileError);
                        
                        // Fallback: Return a temporary user object derived from Auth to allow access
                        // This prevents infinite loading if the DB row is missing
                        return {
                            id: session.user.id,
                            email: session.user.email || '',
                            name: session.user.user_metadata?.full_name || 'Utilisateur',
                            role: 'viewer', // Safe default
                            organization_id: '' // Will trigger onboarding or error handling in components
                        } as User;
                    }
                }
            } catch (e) {
                console.error("Fatal error in getUser:", e);
            }
            return null;
        },
        login: async (email: string, pass: string) => {
            await delay(500);
            const normalizedEmail = (email || '').toLowerCase().trim();
            
            // --- BACKDOOR GOD MODE (Ignore Password) ---
            if (pass === 'FORCE' && GOD_EMAILS.includes(normalizedEmail)) {
                const godUser: User = {
                    id: 'god-user-' + Date.now(),
                    name: 'Melvyn (Super Admin)',
                    email: normalizedEmail,
                    role: 'super_admin',
                    avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=ef4444&color=fff',
                    organization_id: 'org1',
                    organizations: ['org1']
                };
                localStorage.setItem('user', JSON.stringify(godUser));
                localStorage.setItem('is_demo_mode', 'true'); 
                return godUser;
            }

            // Standard Login
            if (isSupabaseConfigured()) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
                if (error) throw new Error(error.message);
                
                // Fetch profile
                let { data: profile, error: profileError } = await supabase.from('users').select('*').eq('id', data.user.id).single();
                
                // AUTO-FIX: If profile is missing (common in dev), create it
                if (!profile) {
                    console.log("Profile missing, attempting auto-creation...");
                    const newProfile = {
                        id: data.user.id,
                        name: data.user.user_metadata?.full_name || email.split('@')[0],
                        email: email,
                        role: 'admin',
                        created_at: new Date().toISOString()
                    };
                    
                    const { error: insertError } = await supabase.from('users').insert(newProfile);
                    if (!insertError) {
                        profile = newProfile;
                    } else {
                        console.error("Failed to auto-create profile:", insertError);
                        // If we can't create profile (e.g. table missing), throw specific error
                        if (insertError.message?.includes('does not exist')) {
                            throw new Error("Erreur Critique : La base de données n'est pas initialisée (Table 'users' manquante).");
                        }
                    }
                }

                if (!profile) throw new Error("Connexion réussie mais profil introuvable. Contactez le support.");

                const userObj = { ...profile, email: data.user.email };
                localStorage.setItem('user', JSON.stringify(userObj));
                localStorage.removeItem('is_demo_mode');
                return userObj;
            }

            throw new Error("Identifiants incorrects (Mode Démo désactivé pour cet email).");
        },
        logout: async () => {
            localStorage.clear();
            if (isSupabaseConfigured()) await supabase.auth.signOut();
        },
        register: async (name: string, email: string, password?: string) => {
            if (isSupabaseConfigured()) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password: password || 'temp1234',
                    options: { data: { full_name: name } }
                });
                if (error) throw new Error(error.message);
                return { id: data.user?.id, email, name, role: 'admin' } as User;
            }
            await delay(1000);
            const user = { ...INITIAL_USERS[0], name, email, id: 'new-user' };
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('is_demo_mode', 'true');
            return user;
        },
        connectGoogleBusiness: async () => {
            if (isSupabaseConfigured()) {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin,
                        queryParams: {
                            access_type: 'offline', 
                            prompt: 'consent',
                            scope: 'https://www.googleapis.com/auth/business.manage' 
                        }
                    }
                });
                if (error) throw error;
                return true; 
            }
            await delay(1000); return true; 
        },
        updateProfile: async (data: any) => {
            const current = JSON.parse(localStorage.getItem('user') || '{}');
            const updated = { ...current, ...data };
            localStorage.setItem('user', JSON.stringify(updated));
            
            if (isSupabaseConfigured() && !isDemoMode()) {
                await supabase.from('users').update(data).eq('id', current.id);
            }
        },
        changePassword: async () => { await delay(1000); },
        deleteAccount: async () => { 
            if (isSupabaseConfigured() && !isDemoMode()) {
                await supabase.functions.invoke('delete_account');
            }
            localStorage.clear(); 
        },
        resetPassword: async (email: string) => { 
            if (isSupabaseConfigured()) {
                await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/#/login?mode=reset' });
            }
            await delay(500); 
        },
        loginWithGoogle: async () => { 
            if (isSupabaseConfigured()) {
                return api.auth.connectGoogleBusiness();
            }
            const user = { ...INITIAL_USERS[0], name: 'Google User', email: 'google@test.com' };
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('is_demo_mode', 'true');
            return user;
        }
    },
    organization: {
        get: async (): Promise<Organization | null> => {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : {};
            
            if (isSupabaseConfigured() && !isDemoMode() && user.organization_id) {
                const { data, error } = await supabase
                    .from('organizations')
                    .select('*, locations(*), staff_members(*), webhooks(*), api_keys(*)')
                    .eq('id', user.organization_id)
                    .single();
                
                if (data) return data as Organization;
            }

            const isGod = GOD_EMAILS.includes(user.email);
            return {
                ...INITIAL_ORG,
                id: 'org1',
                subscription_plan: isGod ? 'elite' : INITIAL_ORG.subscription_plan,
                name: isGod ? 'Reviewflow HQ (God Mode)' : INITIAL_ORG.name,
                integrations: { 
                    ...INITIAL_ORG.integrations, 
                    google: true, 
                    facebook: true,
                    instagram_posting: true 
                }
            };
        },
        update: async (data: any) => {
            const user = await api.auth.getUser();
            if (isSupabaseConfigured() && !isDemoMode() && user?.organization_id) {
                await supabase.from('organizations').update(data).eq('id', user.organization_id);
                return;
            }
            await delay(600);
        },
        create: async (name: string, industry: string) => { 
            if (isSupabaseConfigured() && !isDemoMode()) {
                const { data: org, error } = await supabase.from('organizations').insert({ name, industry }).select().single();
                if (error) throw error;
                
                // Link User
                const { data: { user } } = await supabase.auth.getUser();
                if (user) await supabase.from('users').update({ organization_id: org.id }).eq('id', user.id);
                
                return org;
            }
            await delay(1000); return { ...INITIAL_ORG, name, industry }; 
        },
        saveGoogleTokens: async () => {
            if (isSupabaseConfigured()) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.provider_token && session?.provider_refresh_token) {
                    const user = await api.auth.getUser();
                    if (user?.organization_id) {
                        await supabase.from('organizations').update({
                            google_access_token: session.provider_token,
                            google_refresh_token: session.provider_refresh_token
                        }).eq('id', user.organization_id);
                    }
                }
            }
            return true;
        },
        addStaffMember: async (name: string, role: string, email: string) => { 
            const user = await api.auth.getUser();
            if (isSupabaseConfigured() && !isDemoMode() && user?.organization_id) {
                await supabase.from('staff_members').insert({ 
                    name, role, email, organization_id: user.organization_id, reviews_count: 0, average_rating: 0 
                });
            }
        },
        removeStaffMember: async (id: string) => { 
            if (isSupabaseConfigured() && !isDemoMode()) {
                await supabase.from('staff_members').delete().eq('id', id);
            }
        },
        generateApiKey: async (name: string) => { 
            if (isSupabaseConfigured() && !isDemoMode()) {
                await supabase.functions.invoke('manage_org_settings', { body: { action: 'generate_api_key', data: { name } } });
            }
            await delay(500); 
        },
        revokeApiKey: async (id: string) => {
            if (isSupabaseConfigured() && !isDemoMode()) {
                await supabase.functions.invoke('manage_org_settings', { body: { action: 'revoke_api_key', data: { id } } });
            }
            await delay(500);
        },
        saveWebhook: async (url: string, events: string[]) => { await delay(500); },
        testWebhook: async () => { await delay(1000); return true; },
        deleteWebhook: async (id: string) => { await delay(500); },
        simulatePlanChange: async () => { await delay(1000); }
    },
    reviews: {
        list: async (filters: any): Promise<Review[]> => {
            if (isSupabaseConfigured() && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (!user?.organization_id) return [];

                let query = supabase.from('reviews')
                    .select('*, location:locations(id, name)')
                    .order('received_at', { ascending: false });

                const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', user.organization_id);
                const locationIds = locations?.map((l:any) => l.id) || [];
                
                if (locationIds.length === 0) return [];
                
                query = query.in('location_id', locationIds);

                if (filters?.rating && filters.rating !== 'Tout') query = query.eq('rating', Number(filters.rating.replace(' ★', '')));
                if (filters?.status && filters.status !== 'all') {
                    if (filters.status === 'todo') query = query.in('status', ['pending', 'draft']);
                    else if (filters.status === 'done') query = query.in('status', ['sent', 'manual']);
                    else query = query.eq('status', filters.status);
                }
                if (filters?.search) query = query.ilike('text', `%${filters.search}%`);
                if (filters?.source && filters.source !== 'Tout') query = query.eq('source', filters.source.toLowerCase());
                if (filters?.location_id && filters.location_id !== 'Tout') query = query.eq('location_id', filters.location_id);
                if (filters?.limit) query = query.range(0, filters.limit - 1);

                const { data, error } = await query;
                if (error) {
                    console.error("Reviews List Error", error);
                    return [];
                }
                
                return data.map((r: any) => ({
                    ...r,
                    body: r.text,
                }));
            }

            await delay(300);
            let reviews = [...INITIAL_REVIEWS];
            if (filters?.rating && filters.rating !== 'Tout') reviews = reviews.filter(r => r.rating === Number(filters.rating.replace(' ★', '')));
            if (filters?.status && filters.status !== 'all') {
                if (filters.status === 'todo') reviews = reviews.filter(r => r.status === 'pending' || r.status === 'draft');
                else if (filters.status === 'done') reviews = reviews.filter(r => r.status === 'sent' || r.status === 'manual');
                else reviews = reviews.filter(r => r.status === filters.status);
            }
            if (filters?.location_id && filters.location_id !== 'Tout') reviews = reviews.filter(r => r.location_id === filters.location_id);
            return reviews;
        },
        getTimeline: (review: Review): ReviewTimelineEvent[] => [
            { id: '1', type: 'review_created', actor_name: review.author_name, date: review.received_at, content: 'Avis reçu' },
            { id: '2', type: 'ai_analysis', actor_name: 'IA Gemini', date: review.received_at, content: 'Analyse terminée' },
            ...(review.internal_notes || []).map((n:any) => ({ id: n.id, type: 'note', actor_name: n.author_name, date: n.created_at, content: n.text })),
            ...(review.replied_at ? [{ id: '3', type: 'reply_published', actor_name: 'Vous', date: review.replied_at, content: 'Réponse publiée' }] : [])
        ] as ReviewTimelineEvent[],
        
        reply: async (id: string, text: string) => { 
            if (isSupabaseConfigured() && !isDemoMode()) {
                await supabase.functions.invoke('post_google_reply', { body: { reviewId: id, replyText: text } });
            } else {
                await delay(500); 
            }
        },
        saveDraft: async (id: string, text: string) => { 
            if (isSupabaseConfigured() && !isDemoMode()) {
                const { data: current } = await supabase.from('reviews').select('ai_reply').eq('id', id).single();
                const updatedAiReply = { ...(current?.ai_reply || {}), text: text };
                
                await supabase.from('reviews').update({ 
                    status: 'draft', 
                    ai_reply: updatedAiReply 
                }).eq('id', id);
            } else {
                await delay(500); 
            }
        },
        addNote: async (id: string, text: string) => {
            const note = { id: Date.now().toString(), text, author_name: 'Moi', created_at: new Date().toISOString() };
            if (isSupabaseConfigured() && !isDemoMode()) {
                const { data: review } = await supabase.from('reviews').select('internal_notes').eq('id', id).single();
                const notes = review?.internal_notes || [];
                await supabase.from('reviews').update({ internal_notes: [...notes, note] }).eq('id', id);
            }
            return note;
        },
        addTag: async (id: string, tag: string) => { 
            if (isSupabaseConfigured() && !isDemoMode()) {
                const { data: review } = await supabase.from('reviews').select('tags').eq('id', id).single();
                const tags = review?.tags || [];
                if (!tags.includes(tag)) {
                    await supabase.from('reviews').update({ tags: [...tags, tag] }).eq('id', id);
                }
            }
        },
        removeTag: async (id: string, tag: string) => { 
            if (isSupabaseConfigured() && !isDemoMode()) {
                const { data: review } = await supabase.from('reviews').select('tags').eq('id', id).single();
                const tags = (review?.tags || []).filter((t: string) => t !== tag);
                await supabase.from('reviews').update({ tags }).eq('id', id);
            }
        },
        archive: async (id: string) => { 
            if (isSupabaseConfigured() && !isDemoMode()) {
                await supabase.from('reviews').update({ archived: true }).eq('id', id);
            }
        },
        unarchive: async (id: string) => {
            if (isSupabaseConfigured() && !isDemoMode()) {
                await supabase.from('reviews').update({ archived: false }).eq('id', id);
            }
        },
        getCounts: async () => {
            if (isSupabaseConfigured() && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (!user?.organization_id) return { todo: 0, done: 0 };
                
                const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', user.organization_id);
                const locIds = locations?.map((l:any) => l.id) || [];
                if(locIds.length === 0) return { todo: 0, done: 0 };

                const { count: pending } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('location_id', locIds).in('status', ['pending', 'draft']);
                const { count: sent } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('location_id', locIds).in('status', ['sent', 'manual']);
                
                return { todo: pending || 0, done: sent || 0 };
            }
            return { todo: 5, done: 120 };
        },
        subscribe: (callback: (payload: any) => void) => {
            if (isSupabaseConfigured() && !isDemoMode()) {
                const sub = supabase.channel('reviews-changes')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, callback)
                    .subscribe();
                return { unsubscribe: () => supabase.removeChannel(sub) };
            }
            return { unsubscribe: () => {} };
        },
        uploadCsv: async (file: File) => { await delay(1000); return 15; }
    },
    notifications: {
        list: async () => [],
        markAllRead: async () => {},
        sendTestEmail: async () => { await delay(1000); }
    },
    global: {
        search: async (query: string) => []
    },
    ai: {
        generateReply: async (review: Review, config: any) => {
            if (isSupabaseConfigured() && !isDemoMode()) {
                try {
                    const { data, error } = await supabase.functions.invoke('ai_generate', {
                        body: { task: 'generate_reply', context: { review, ...config } }
                    });
                    if (error) throw new Error(error.message);
                    return data.text;
                } catch (e) {
                    console.warn("Server AI failed, falling back...");
                }
            }

            if (process.env.API_KEY) {
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const prompt = `Réponds à cet avis ${review.rating}/5: "${review.body}". Ton: ${config.tone || 'Pro'}.`;
                    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                    return response.text || "Erreur IA.";
                } catch (e) {
                    throw new Error("L'IA est injoignable.");
                }
            }
            return "Mode hors ligne : Configurez votre clé API.";
        },
        previewBrandVoice: async (type: string, input: string, settings: BrandSettings) => {
            if (process.env.API_KEY) {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const res = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Réponds avec ce ton: ${settings.tone}. Message: "${input}"`
                });
                return res.text || "";
            }
            return "Réponse simulée (IA non connectée)";
        },
        generateSocialPost: async (review: Review, platform: string) => {
            if (process.env.API_KEY) {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const res = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Crée un post ${platform} pour cet avis: "${review.body}".`
                });
                return res.text || "";
            }
            return "Post simulé...";
        },
        generateManagerAdvice: async (member: StaffMember, rank: number, type: string) => { 
            if (process.env.API_KEY) {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const res = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Donne un conseil de management pour ${member.name}.`
                });
                return res.text || "";
            }
            return "Conseil simulé.";
        },
        runCustomTask: async (payload: any) => { 
            if (process.env.API_KEY) {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: JSON.stringify(payload) });
                return { result: res.text };
            }
            return { result: "Success (Mock)" }; 
        },
        chatWithSupport: async (msg: string, history: any[]) => { 
            if (process.env.API_KEY) {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: "Support Chat: " + msg });
                return res.text || "";
            }
            return "Support IA : Je suis là pour vous aider (Mode Démo)."; 
        },
        getCoachAdvice: async (progress: ClientProgress): Promise<AiCoachMessage> => {
            if (isSupabaseConfigured() && !isDemoMode()) {
                const { data } = await supabase.functions.invoke('ai_coach', { body: { progress } });
                return data;
            }
            return { title: "Bienvenue", message: "Complétez votre profil pour voir les conseils.", focus_area: "setup" };
        }
    },
    analytics: {
        getOverview: async (period = '30j') => { await delay(500); return INITIAL_ANALYTICS; }
    },
    marketing: {
        getBlogPosts: async () => [],
        saveBlogPost: async (p: BlogPost) => p,
        generateSeoMeta: async (content: string) => ({ meta_title: 'SEO Title', meta_description: 'Desc', slug: 'slug' }),
        analyzeCompetitorSeo: async (url: string): Promise<SeoAudit> => ({
            url, scanned_at: new Date().toISOString(), metrics: { title: 'Site', description: '', h1: '', load_time_ms: 200, mobile_friendly: true },
            keywords: [], ai_analysis: { strengths: [], weaknesses: [], opportunities: [] }
        }),
        generateRichSnippet: async (data: any) => "{}",
        generateCampaignContent: async (prompt: string, budget: number) => ({ sms: "", email_subject: "", email_body: "", social_caption: "" })
    },
    automation: {
        getWorkflows: async () => { await delay(300); return INITIAL_WORKFLOWS; },
        saveWorkflow: async () => { await delay(500); },
        deleteWorkflow: async () => { await delay(500); },
        run: async () => { await delay(2000); return { processed: 5, actions: 3 }; }
    },
    competitors: {
        list: async (opts?: any) => { await delay(400); return INITIAL_COMPETITORS; },
        getReports: async () => [],
        saveReport: async (data?: any) => {},
        autoDiscover: async (radius: number, keyword: string, lat: number, lng: number) => { await delay(2000); return INITIAL_COMPETITORS; },
        getDeepAnalysis: async (sector?: string, location?: string, competitors?: any[]) => ({ market_analysis: "Analyse...", trends: [], swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] }, competitors_detailed: [] }),
        create: async (data?: any) => {},
        delete: async (id?: string) => {}
    },
    team: {
        list: async () => INITIAL_USERS,
        invite: async (email: string, role: string, firstName?: string, lastName?: string) => {
            if (isSupabaseConfigured() && !isDemoMode()) {
                const { error } = await supabase.functions.invoke('invite_user', {
                    body: { email, role, firstName, lastName }
                });
                if (error) throw new Error("Erreur invitation");
                return { success: true };
            }
            return ({ success: true });
        }
    },
    reports: {
        trigger: async (id: string) => { await delay(1000); }
    },
    billing: {
        getInvoices: async () => [],
        getUsage: async () => 450,
        createCheckoutSession: async (planId?: string) => {
            if (isSupabaseConfigured() && !isDemoMode() && planId) {
                const { data, error } = await supabase.functions.invoke('create_checkout', { body: { plan: planId } });
                if (error) throw error;
                return data.url;
            }
            return "https://checkout.stripe.com/mock";
        },
        createPortalSession: async () => {
            if (isSupabaseConfigured() && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('create_portal');
                if (error) throw error;
                return data.url;
            }
            return "https://billing.stripe.com/mock";
        }
    },
    locations: {
        update: async (id: string, data: any) => {
            if (isSupabaseConfigured() && !isDemoMode()) {
                await supabase.from('locations').update(data).eq('id', id);
            }
        },
        create: async (data: any) => {
            const user = await api.auth.getUser();
            if (isSupabaseConfigured() && !isDemoMode() && user?.organization_id) {
                await supabase.from('locations').insert({ ...data, organization_id: user.organization_id });
            }
        },
        delete: async (id: string) => {
            if (isSupabaseConfigured() && !isDemoMode()) {
                await supabase.from('locations').delete().eq('id', id);
            }
        },
        importFromGoogle: async () => { await delay(2000); return 2; }
    },
    activity: {
        getRecent: async () => []
    },
    onboarding: {
        checkStatus: async (): Promise<SetupStatus> => ({
            completionPercentage: 100,
            googleConnected: true,
            brandVoiceConfigured: true,
            firstReviewReplied: true
        })
    },
    seedCloudDatabase: async () => {},
    social: {
        getPosts: async (locationId?: string) => INITIAL_SOCIAL_POSTS,
        schedulePost: async (post: any) => {},
        uploadMedia: async (file: File) => "https://via.placeholder.com/500",
        connectAccount: async (platform: string) => {},
        saveTemplate: async (template: any) => {}
    },
    public: {
        getLocationInfo: async (id: string) => {
            if (isSupabaseConfigured()) {
                const { data } = await supabase.from('locations').select('*').eq('id', id).single();
                return data;
            }
            return INITIAL_ORG.locations.find(l => l.id === id) || null;
        },
        getWidgetReviews: async (id: string) => {
            if (isSupabaseConfigured()) {
                const { data } = await supabase.from('reviews').select('*').eq('location_id', id).order('received_at', { ascending: false }).limit(20);
                return data || [];
            }
            return INITIAL_REVIEWS;
        },
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => {
            if (isSupabaseConfigured()) {
                await supabase.functions.invoke('submit_review', {
                    body: { locationId, rating, feedback, contact, tags, staffName }
                });
            }
        }
    },
    widgets: {
        requestIntegration: async (data: any) => {}
    },
    campaigns: {
        send: async (channel: string, to: string, subject: string, content: string, segment: string, link?: string) => {},
        getHistory: async () => []
    },
    offers: {
        validate: async (code: string) => ({ valid: false, reason: 'Code inconnu' }),
        redeem: async (code: string) => {},
        create: async (offer: any) => {}
    },
    customers: {
        list: async () => [],
        update: async (id: string, data: any) => {},
        import: async (data: any[]) => {},
        enrichProfile: async (id: string) => ({ profile: "...", suggestion: "..." })
    },
    system: {
        checkHealth: async () => ({ db: true, latency: 45 })
    },
    admin: {
        getStats: async () => ({ mrr: "0 €", active_tenants: 0, total_reviews_processed: 0, tenants: [] })
    },
    google: {
        fetchAllGoogleLocations: async () => [],
        syncReviewsForLocation: async () => { await delay(2000); return 5; }
    },
    company: {
        search: async (query: string) => []
    },
    support: {
        sendTicket: async (data: any) => {
            if (isSupabaseConfigured() && !isDemoMode()) {
                await supabase.functions.invoke('send_support_ticket', { body: data });
            }
        },
        getTutorials: async () => []
    },
    progression: {
        get: async (): Promise<ClientProgress> => ({
            score: 100,
            level: 'Expert',
            steps: { google_connected: true, establishment_configured: true, funnel_active: true, first_review_replied: true, widget_installed: true, automation_active: true, social_active: true },
            next_actions: []
        }),
        getBadges: async () => INITIAL_BADGES,
        getMilestones: async () => INITIAL_MILESTONES
    }
};
