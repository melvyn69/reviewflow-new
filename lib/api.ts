
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

// --- GOD MODE CONFIGURATION ---
// These emails will ALWAYS be Super Admin with Elite Plan, no matter what.
const GOD_EMAILS = ['melvynbenichou@gmail.com', 'demo@reviewflow.com', 'god@reviewflow.com'];

const isDemoMode = () => localStorage.getItem('is_demo_mode') === 'true';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            // Priority 1: Check LocalStorage
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                
                // FORCE UPGRADE ON READ
                if (GOD_EMAILS.includes(user.email)) {
                    if (user.role !== 'super_admin') {
                        user.role = 'super_admin'; // Force role
                        localStorage.setItem('user', JSON.stringify(user)); // Persist fix
                    }
                    return user;
                }
                return user;
            }
            return null;
        },
        login: async (email: string, pass: string) => {
            await delay(500);
            
            const normalizedEmail = (email || '').toLowerCase().trim();
            
            // --- BACKDOOR GOD MODE (Ignore Password) ---
            if (GOD_EMAILS.includes(normalizedEmail)) {
                const godUser: User = {
                    id: 'god-user-' + Date.now(),
                    name: 'Melvyn (Super Admin)',
                    email: normalizedEmail,
                    role: 'super_admin',
                    avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=ef4444&color=fff',
                    organization_id: 'org1',
                    organizations: ['org1']
                };
                
                // Force Demo Mode to ensure DB calls don't fail due to RLS/UUID mismatch
                localStorage.setItem('user', JSON.stringify(godUser));
                localStorage.setItem('is_demo_mode', 'true'); 
                
                return godUser;
            }

            // Standard Login
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
                if (error) throw new Error("Email ou mot de passe incorrect.");
                
                return {
                    id: data.user.id,
                    email: data.user.email || '',
                    name: 'Utilisateur',
                    role: 'admin',
                    organization_id: 'org1'
                } as User;
            }

            throw new Error("Identifiants incorrects.");
        },
        logout: async () => {
            localStorage.clear();
            if (supabase) await supabase.auth.signOut();
        },
        register: async (name: string, email: string, password?: string) => {
            await delay(1000);
            const user = { ...INITIAL_USERS[0], name, email, id: 'new-user' };
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('is_demo_mode', 'true');
            return user;
        },
        connectGoogleBusiness: async () => { await delay(1000); return true; },
        updateProfile: async (data: any) => {
            const current = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...current, ...data }));
        },
        changePassword: async () => { await delay(1000); },
        deleteAccount: async () => { await delay(1000); localStorage.clear(); },
        resetPassword: async (email: string) => { await delay(500); },
        loginWithGoogle: async () => { 
            const user = { ...INITIAL_USERS[0], name: 'Google User', email: 'google@test.com' };
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('is_demo_mode', 'true');
            return user;
        }
    },
    organization: {
        get: async (): Promise<Organization | null> => {
            // Get current user email to determine rights
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : {};
            const isGod = GOD_EMAILS.includes(user.email);

            return {
                ...INITIAL_ORG,
                id: 'org1', // Force ID match with user
                subscription_plan: isGod ? 'elite' : INITIAL_ORG.subscription_plan, // FORCE ELITE PLAN
                name: isGod ? 'Reviewflow HQ (God Mode)' : INITIAL_ORG.name,
                integrations: { 
                    ...INITIAL_ORG.integrations, 
                    google: true, 
                    facebook: true,
                    instagram_posting: true 
                }
            };
        },
        update: async (data: any) => { await delay(600); return { ...INITIAL_ORG, ...data }; },
        create: async (name: string, industry: string) => { await delay(1000); return { ...INITIAL_ORG, name, industry }; },
        saveGoogleTokens: async () => { return true; },
        addStaffMember: async (name: string, role: string, email: string) => { await delay(500); },
        removeStaffMember: async (id: string) => { await delay(500); },
        generateApiKey: async (name: string) => { await delay(500); },
        revokeApiKey: async (id: string) => { await delay(500); },
        saveWebhook: async () => { await delay(500); },
        testWebhook: async () => { await delay(1000); return true; },
        deleteWebhook: async () => { await delay(500); },
        simulatePlanChange: async () => { await delay(1000); }
    },
    reviews: {
        list: async (filters: any): Promise<Review[]> => {
            await delay(300);
            let reviews = [...INITIAL_REVIEWS];
            if (filters?.rating && filters.rating !== 'Tout') reviews = reviews.filter(r => r.rating === Number(filters.rating));
            if (filters?.status && filters.status !== 'all') reviews = reviews.filter(r => r.status === filters.status);
            return reviews;
        },
        getTimeline: (review: Review): ReviewTimelineEvent[] => [
            { id: '1', type: 'review_created', actor_name: review.author_name, date: review.received_at, content: 'Avis reçu' },
            { id: '2', type: 'ai_analysis', actor_name: 'IA Gemini', date: review.received_at, content: 'Analyse terminée' },
        ],
        reply: async (id: string, text: string) => { await delay(500); },
        saveDraft: async (id: string, text: string) => { await delay(500); },
        addNote: async (id: string, text: string) => ({ id: Date.now().toString(), text, author_name: 'Moi', created_at: new Date().toISOString() }),
        addTag: async (id: string, tag: string) => { await delay(200); },
        removeTag: async (id: string, tag: string) => { await delay(200); },
        archive: async (id: string) => { await delay(300); },
        unarchive: async (id: string) => { await delay(300); },
        getCounts: async () => ({ todo: 5, done: 120 }),
        subscribe: (callback: (payload: any) => void) => ({ unsubscribe: () => {} }),
        uploadCsv: async () => { await delay(1000); return 15; }
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
            await delay(1000);
            return "Merci pour votre message ! Nous sommes ravis que vous ayez apprécié votre expérience. À très bientôt !";
        },
        previewBrandVoice: async (t: string, i: string, settings: BrandSettings) => {
            await delay(1000);
            return `[${settings.tone}] Merci beaucoup ! (Ceci est une simulation locale)`;
        },
        generateSocialPost: async (review: Review, platform: string) => {
            await delay(1000);
            return "🌟 Un immense merci à nos clients formidables ! #Gratitude";
        },
        generateManagerAdvice: async (staff: StaffMember, rank: number, type: string) => { await delay(1000); return "Conseil IA : Encouragez les photos."; },
        runCustomTask: async (payload: any) => { await delay(2000); return { result: "Success" }; },
        chatWithSupport: async (msg: string, history?: ChatMessage[]) => { await delay(1000); return "Je suis l'assistant de test. Tout fonctionne !"; },
        getCoachAdvice: async (progress: ClientProgress): Promise<AiCoachMessage> => {
            await delay(1000);
            return {
                title: "Mode Expert 🚀",
                message: "Vous avez un accès total. Profitez-en pour explorer toutes les fonctionnalités.",
                focus_area: "social"
            };
        }
    },
    analytics: {
        getOverview: async (period?: string) => { await delay(500); return INITIAL_ANALYTICS; }
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
        saveWorkflow: async (workflow: any) => { await delay(500); },
        deleteWorkflow: async (id: string) => { await delay(500); },
        run: async () => { await delay(2000); return { processed: 5, actions: 3 }; }
    },
    competitors: {
        list: async (opts?: any) => { await delay(400); return INITIAL_COMPETITORS; },
        getReports: async () => [],
        saveReport: async (data?: any) => {},
        autoDiscover: async (radius: number, keyword: string, lat: number, lng: number) => { await delay(2000); return INITIAL_COMPETITORS; },
        getDeepAnalysis: async (sector: string, location: string, competitors: any[]) => ({ market_analysis: "Analyse...", trends: [], swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] }, competitors_detailed: [] }),
        create: async (data: any) => {},
        delete: async (id: string) => {}
    },
    team: {
        list: async () => INITIAL_USERS,
        invite: async (email: string, role: string, firstName: string, lastName: string) => ({ success: true })
    },
    reports: {
        trigger: async (reportId: string) => { await delay(1000); }
    },
    billing: {
        getInvoices: async () => [],
        getUsage: async () => 450,
        createCheckoutSession: async (plan: string) => "https://checkout.stripe.com/mock",
        createPortalSession: async () => "https://billing.stripe.com/mock"
    },
    locations: {
        update: async (id: string, data: any) => {},
        create: async (data: any) => {},
        delete: async (id: string) => {},
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
        getLocationInfo: async (id: string) => INITIAL_ORG.locations.find(l => l.id === id) || null,
        getWidgetReviews: async (locationId: string) => INITIAL_REVIEWS,
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => {}
    },
    widgets: {
        requestIntegration: async () => {}
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
        sendTicket: async (ticket: any) => {},
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
