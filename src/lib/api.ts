
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
import { supabase } from './supabase';
import { hasAccess } from './features'; 

const isDemoMode = () => localStorage.getItem('is_demo_mode') === 'true';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// LISTE DES COMPTES GOD MODE
const GOD_EMAILS = ['melvynbenichou@gmail.com', 'demo@reviewflow.com', 'god@reviewflow.com'];

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            // 1. Check LocalStorage (Fastest)
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                // Force upgrade if it's you but stored as normal admin
                if (GOD_EMAILS.includes(user.email) && user.role !== 'super_admin') {
                    user.role = 'super_admin';
                    localStorage.setItem('user', JSON.stringify(user));
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
                console.log("🔓 GOD MODE ACTIVATED for", normalizedEmail);
                
                const godUser: User = {
                    id: 'god-user-' + Date.now(),
                    name: 'Melvyn (Super Admin)',
                    email: normalizedEmail,
                    role: 'super_admin',
                    avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=000&color=fff',
                    organization_id: 'org1',
                    organizations: ['org1']
                };
                
                // Force Demo Mode to bypass DB RLS policies
                localStorage.setItem('user', JSON.stringify(godUser));
                localStorage.setItem('is_demo_mode', 'true');
                
                return godUser;
            }

            // Fallback Supabase (Real Auth)
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
            localStorage.clear(); // Nuke everything on logout
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
            // Always return Elite plan for you
            const user = JSON.parse(localStorage.getItem('user') || '{}');
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
        update: async (data: any) => { await delay(600); return { ...INITIAL_ORG, ...data }; },
        create: async (name: string, industry: string) => { await delay(1000); return { ...INITIAL_ORG, name, industry }; },
        saveGoogleTokens: async () => { return true; },
        addStaffMember: async () => { await delay(500); },
        removeStaffMember: async () => { await delay(500); },
        generateApiKey: async () => { await delay(500); },
        revokeApiKey: async () => { await delay(500); },
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
        reply: async () => { await delay(500); },
        saveDraft: async () => { await delay(500); },
        addNote: async (id: string, text: string) => ({ id: Date.now().toString(), text, author_name: 'Moi', created_at: new Date().toISOString() }),
        addTag: async () => { await delay(200); },
        removeTag: async () => { await delay(200); },
        archive: async () => { await delay(300); },
        unarchive: async () => { await delay(300); },
        getCounts: async () => ({ todo: 5, done: 120 }),
        subscribe: () => ({ unsubscribe: () => {} }),
        uploadCsv: async () => { await delay(1000); return 15; }
    },
    notifications: {
        list: async () => [],
        markAllRead: async () => {},
        sendTestEmail: async () => { await delay(1000); }
    },
    global: {
        search: async () => []
    },
    ai: {
        generateReply: async () => {
            await delay(1000);
            return "Merci pour votre message ! Nous sommes ravis que vous ayez apprécié votre expérience. À très bientôt !";
        },
        previewBrandVoice: async (t: string, i: string, settings: BrandSettings) => {
            await delay(1000);
            return `[${settings.tone}] Merci beaucoup ! (Ceci est une simulation locale)`;
        },
        generateSocialPost: async () => {
            await delay(1000);
            return "🌟 Un immense merci à nos clients formidables ! #Gratitude";
        },
        generateManagerAdvice: async () => { await delay(1000); return "Conseil IA : Encouragez les photos."; },
        runCustomTask: async () => { await delay(2000); return { result: "Success" }; },
        chatWithSupport: async () => { await delay(1000); return "Je suis l'assistant de test. Tout fonctionne !"; },
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
        getOverview: async () => { await delay(500); return INITIAL_ANALYTICS; }
    },
    marketing: {
        getBlogPosts: async () => [],
        saveBlogPost: async (p: BlogPost) => p,
        generateSeoMeta: async () => ({ meta_title: 'SEO Title', meta_description: 'Desc', slug: 'slug' }),
        analyzeCompetitorSeo: async (url: string): Promise<SeoAudit> => ({
            url, scanned_at: new Date().toISOString(), metrics: { title: 'Site', description: '', h1: '', load_time_ms: 200, mobile_friendly: true },
            keywords: [], ai_analysis: { strengths: [], weaknesses: [], opportunities: [] }
        }),
        generateRichSnippet: async () => "{}",
        generateCampaignContent: async () => ({ sms: "", email_subject: "", email_body: "", social_caption: "" })
    },
    automation: {
        getWorkflows: async () => { await delay(300); return INITIAL_WORKFLOWS; },
        saveWorkflow: async () => { await delay(500); },
        deleteWorkflow: async () => { await delay(500); },
        run: async () => { await delay(2000); return { processed: 5, actions: 3 }; }
    },
    competitors: {
        list: async () => { await delay(400); return INITIAL_COMPETITORS; },
        getReports: async () => [],
        saveReport: async () => {},
        autoDiscover: async () => { await delay(2000); return INITIAL_COMPETITORS; },
        getDeepAnalysis: async () => ({ market_analysis: "Analyse...", trends: [], swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] }, competitors_detailed: [] }),
        create: async () => {},
        delete: async () => {}
    },
    team: {
        list: async () => INITIAL_USERS,
        invite: async () => ({ success: true })
    },
    reports: {
        trigger: async () => { await delay(1000); }
    },
    billing: {
        getInvoices: async () => [],
        getUsage: async () => 450,
        createCheckoutSession: async () => "https://checkout.stripe.com/mock",
        createPortalSession: async () => "https://billing.stripe.com/mock"
    },
    locations: {
        update: async () => {},
        create: async () => {},
        delete: async () => {},
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
        getPosts: async () => INITIAL_SOCIAL_POSTS,
        schedulePost: async () => {},
        uploadMedia: async () => "https://via.placeholder.com/500",
        connectAccount: async () => {},
        saveTemplate: async () => {}
    },
    public: {
        getLocationInfo: async (id: string) => INITIAL_ORG.locations.find(l => l.id === id) || null,
        getWidgetReviews: async () => INITIAL_REVIEWS,
        submitFeedback: async () => {}
    },
    widgets: {
        requestIntegration: async () => {}
    },
    campaigns: {
        send: async () => {},
        getHistory: async () => []
    },
    offers: {
        validate: async () => ({ valid: false, reason: 'Code inconnu' }),
        redeem: async () => {},
        create: async () => {}
    },
    customers: {
        list: async () => [],
        update: async () => {},
        import: async () => {},
        enrichProfile: async () => ({ profile: "...", suggestion: "..." })
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
        search: async () => []
    },
    support: {
        sendTicket: async () => {},
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
