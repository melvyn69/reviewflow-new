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
import { GoogleGenAI } from "@google/genai";

// --- GOD MODE CONFIGURATION ---
const GOD_EMAILS = ['melvynbenichou@gmail.com', 'demo@reviewflow.com', 'god@reviewflow.com'];

const isDemoMode = () => {
    if (supabase) return false;
    return localStorage.getItem('is_demo_mode') === 'true';
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const apiKey = process.env.API_KEY || '';
const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            try {
                if (!supabase) {
                    const userStr = localStorage.getItem('user');
                    return userStr ? JSON.parse(userStr) : null;
                }
                const { data: { session }, error: sessionError } = await (supabase.auth as any).getSession();
                if (sessionError || !session?.user) return null;

                const authUser = session.user;
                let profile = null;
                try {
                    const { data } = await supabase.from('users').select('*').eq('id', authUser.id).maybeSingle();
                    profile = data;
                } catch (dbError) { console.warn("Profile fetch failed", dbError); }

                if (!profile) {
                    // Self-healing profile creation
                    const newProfile = {
                        id: authUser.id,
                        email: authUser.email,
                        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Utilisateur',
                        avatar_url: authUser.user_metadata?.avatar_url,
                        role: 'admin',
                        created_at: new Date().toISOString()
                    };
                    await supabase.from('users').insert(newProfile);
                    profile = newProfile;
                }

                const appUser: User = {
                    id: authUser.id,
                    email: authUser.email || '',
                    name: profile?.name || 'Utilisateur',
                    role: profile?.role || 'admin',
                    organization_id: profile?.organization_id,
                    avatar: profile?.avatar_url,
                    is_super_admin: profile?.is_super_admin || false
                };
                localStorage.setItem('user', JSON.stringify(appUser));
                return appUser;
            } catch (e) { return null; }
        },
        login: async (email: string, pass: string) => {
            if (GOD_EMAILS.includes(email.toLowerCase())) {
                const godUser: User = { id: 'god', name: 'Super Admin', email, role: 'super_admin', organization_id: 'org1', is_super_admin: true };
                localStorage.setItem('user', JSON.stringify(godUser));
                return godUser;
            }
            if (!supabase) throw new Error("Backend non configuré");
            const { error } = await (supabase.auth as any).signInWithPassword({ email, password: pass });
            if (error) throw error;
            return api.auth.getUser();
        },
        register: async (name: string, email: string, password: string) => {
            if (!supabase) throw new Error("Backend non configuré");
            const { error } = await (supabase.auth as any).signUp({ email, password, options: { data: { full_name: name } } });
            if (error) throw error;
            await delay(1000);
            return api.auth.getUser();
        },
        logout: async () => { localStorage.clear(); if(supabase) await (supabase.auth as any).signOut(); },
        connectGoogleBusiness: async () => {
            if (!supabase) return;
            const { error } = await (supabase.auth as any).signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin, queryParams: { access_type: 'offline', prompt: 'consent' }, scopes: 'https://www.googleapis.com/auth/business.manage' }
            });
            if (error) throw error;
        },
        disconnectGoogle: async () => {},
        updateProfile: async (data: any) => { if(supabase) { const u = await api.auth.getUser(); if(u) await supabase.from('users').update(data).eq('id', u.id); } },
        changePassword: async () => {},
        deleteAccount: async () => {},
        resetPassword: async (email: string) => {}
    },
    organization: {
        get: async (): Promise<Organization | null> => {
            const user = await api.auth.getUser();
            if (!supabase || !user?.organization_id) {
                if(user?.is_super_admin) return { ...INITIAL_ORG, id: 'org1', name: 'Reviewflow HQ' };
                return null;
            }
            const { data } = await supabase.from('organizations').select('*, locations(*), staff_members(*), offers(*), workflows(*)').eq('id', user.organization_id).single();
            return data ? { ...data, integrations: { ...data.integrations, google: !!data.google_refresh_token } } : null;
        },
        create: async (name: string, industry: string) => { 
            if(supabase) { 
                const u = await api.auth.getUser();
                if(u) {
                    const {data} = await supabase.from('organizations').insert({name, industry, subscription_plan: 'free'}).select().single();
                    if(data) await supabase.from('users').update({organization_id: data.id}).eq('id', u.id);
                    return data;
                }
            }
            return INITIAL_ORG; 
        },
        update: async (data: any) => { if(supabase) { const u = await api.auth.getUser(); if(u?.organization_id) await supabase.from('organizations').update(data).eq('id', u.organization_id); } },
        saveGoogleTokens: async () => true,
        addStaffMember: async (name: string, role: string, email: string) => { if(supabase) { const u = await api.auth.getUser(); if(u?.organization_id) await supabase.from('staff_members').insert({name, role, email, organization_id: u.organization_id}); } },
        removeStaffMember: async (id: string) => { if(supabase) await supabase.from('staff_members').delete().eq('id', id); },
        generateApiKey: async (name: string) => {},
        revokeApiKey: async (id: string) => {},
        saveWebhook: async (config: any) => {},
        testWebhook: async (id: string) => true,
        deleteWebhook: async (id: string) => {},
        simulatePlanChange: async (plan: string) => {}
    },
    locations: {
        create: async (data: any) => { if(supabase) { const u = await api.auth.getUser(); if(u?.organization_id) await supabase.from('locations').insert({...data, organization_id: u.organization_id}); } },
        update: async (id: string, data: any) => { if(supabase) await supabase.from('locations').update(data).eq('id', id); },
        delete: async (id: string) => { if(supabase) await supabase.from('locations').delete().eq('id', id); },
        importFromGoogle: async () => 0
    },
    reviews: {
        list: async (filters: any = {}): Promise<Review[]> => {
            if(!supabase) return [];
            const u = await api.auth.getUser();
            if(!u?.organization_id) return [];
            const { data: locs } = await supabase.from('locations').select('id').eq('organization_id', u.organization_id);
            if(!locs?.length) return [];
            const { data } = await supabase.from('reviews').select('*').in('location_id', locs.map(l=>l.id)).order('received_at', {ascending: false});
            return (data || []).map((r: any) => ({...r, body: r.text || r.body}));
        },
        getCounts: async () => ({ todo: 0, done: 0 }),
        getTimeline: (review: Review) => [],
        reply: async (id: string, text: string) => { if(supabase) await supabase.functions.invoke('post_google_reply', {body: {reviewId: id, replyText: text}}); },
        saveDraft: async (id: string, text: string) => {},
        addNote: async (id: string, text: string) => ({ id: '1', text, author_name: 'Moi', created_at: new Date().toISOString() }),
        addTag: async (id: string, tag: string) => {},
        removeTag: async (id: string, tag: string) => {},
        archive: async (id: string) => {},
        unarchive: async (id: string) => {},
        subscribe: (cb: any) => ({ unsubscribe: () => {} }),
        uploadCsv: async (f: any) => 0
    },
    ai: {
        generateReply: async (review: Review, config: any) => {
            if(supabase) { const { data } = await supabase.functions.invoke('ai_generate', {body: {task: 'generate_reply', context: {review, ...config}}}); return data?.text || "Réponse IA"; }
            return "Réponse simulée";
        },
        generateSocialPost: async (review: any, platform: string) => "Post généré",
        previewBrandVoice: async (type: string, input: string, settings: BrandSettings) => "Preview",
        generateManagerAdvice: async (member: StaffMember, rank: number, type: string) => "Conseil",
        runCustomTask: async (task: any) => ({}),
        chatWithSupport: async (msg: string, history?: ChatMessage[]) => "Bonjour",
        getCoachAdvice: async (progress: ClientProgress): Promise<AiCoachMessage> => ({ title: "Bienvenue", message: "Complétez votre profil.", focus_area: "setup" })
    },
    analytics: { getOverview: async (period?: string) => INITIAL_ANALYTICS },
    competitors: {
        list: async () => [], create: async (data: any) => {}, delete: async (id: string) => {},
        getReports: async () => [], saveReport: async (data?: any) => {}, 
        autoDiscover: async (radius: number, keyword: string, lat: number, lng: number) => [], 
        getDeepAnalysis: async (industry: string, location: string, competitors: any[]) => null
    },
    social: {
        getPosts: async (locationId?: string) => [], 
        schedulePost: async (post: any) => {}, 
        uploadMedia: async (file: File) => "https://via.placeholder.com/500", 
        connectAccount: async (platform: string) => {}, 
        saveTemplate: async (template: any) => {}
    },
    marketing: {
        getBlogPosts: async () => [], saveBlogPost: async (post: any) => {}, generateSeoMeta: async (content: string) => ({}), analyzeCompetitorSeo: async (url: string): Promise<SeoAudit> => ({ url, scanned_at: new Date().toISOString(), metrics: { title: 'Audit', description: '', h1: '', load_time_ms: 200, mobile_friendly: true }, keywords: [], ai_analysis: { strengths: [], weaknesses: [], opportunities: [] } }), generateRichSnippet: async (data: any) => "", generateCampaignContent: async (prompt: string, budget: number) => ({ sms: "", email_subject: "", email_body: "", social_caption: "" })
    },
    automation: {
        getWorkflows: async () => [], saveWorkflow: async (workflow: any) => {}, deleteWorkflow: async (id: string) => {}, run: async () => ({ processed: 0, actions: 0 })
    },
    team: {
        list: async () => [], invite: async (email: string, role: string, firstName: string, lastName: string) => ({ success: true })
    },
    reports: { trigger: async (id: string) => {} },
    billing: { getInvoices: async () => [], getUsage: async () => 0, createCheckoutSession: async (planId: string) => "", createPortalSession: async () => "" },
    activity: { getRecent: async () => [] },
    onboarding: { checkStatus: async () => ({ completionPercentage: 0 } as any) },
    seedCloudDatabase: async () => {},
    public: { getLocationInfo: async (id: string) => null, getWidgetReviews: async (id: string) => [], submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => {} },
    widgets: { requestIntegration: async (data: any) => {} },
    campaigns: { send: async (channel: 'sms'|'email', recipient: string, subject: string, message: string, segment: string, link?: string) => {}, getHistory: async () => [] },
    offers: { validate: async (code: string) => ({ valid: false }), redeem: async (code: string) => {}, create: async (offer: any) => {} },
    customers: { list: async () => [], update: async (id: string, data: any) => {}, import: async (data: any[]) => {}, enrichProfile: async (id: string) => ({ profile: "Profil IA", suggestion: "Suggestion IA" }) },
    system: { checkHealth: async () => ({ db: true, latency: 0 }) },
    admin: { getStats: async () => ({}) as any },
    google: { fetchAllGoogleLocations: async () => [], syncReviewsForLocation: async () => 0 },
    company: { search: async (query: string) => [] },
    support: { sendTicket: async (form: any) => {}, getTutorials: async () => [] },
    progression: { get: async () => ({} as any), getBadges: async () => [], getMilestones: async () => [] },
    // Missing properties added
    notifications: { list: async () => [], markAllRead: async () => {}, sendTestEmail: async (email: string) => {} },
    global: { search: async (query: string) => [] }
};