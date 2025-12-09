
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

// LISTE DES COMPTES GOD MODE (Accès total, mot de passe ignoré)
const GOD_EMAILS = ['god@reviewflow.com', 'melvynbenichou@gmail.com', 'demo@reviewflow.com'];

// Helper: Check if current user is God/Super Admin
const getEffectiveUser = async (): Promise<User | null> => {
    // 1. Check Local Mock (Priorité au God Mode local)
    const userStr = localStorage.getItem('user');
    if (userStr) {
        return JSON.parse(userStr);
    }

    // 2. Check Real Supabase Session
    if (supabase) {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
            const email = data.user.email || '';
            // Si c'est vous, on force le rôle super_admin même si la DB dit autre chose
            const isGod = GOD_EMAILS.includes(email.toLowerCase().trim());
            
            return {
                id: data.user.id,
                email: email,
                name: data.user.user_metadata?.full_name || email.split('@')[0],
                role: isGod ? 'super_admin' : 'admin',
                organization_id: 'org-1'
            } as User;
        }
    }

    return null;
};

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            await delay(500);
            // Si le mode démo est activé via la backdoor, on retourne l'utilisateur stocké
            if (isDemoMode()) {
                const u = localStorage.getItem('user');
                return u ? JSON.parse(u) : INITIAL_USERS[0];
            }
            return await getEffectiveUser();
        },
        login: async (email: string, pass: string) => {
            await delay(800);
            
            const normalizedEmail = (email || '').toLowerCase().trim();
            
            // --- BACKDOOR GOD MODE ---
            // Accepte vos emails avec N'IMPORTE QUEL mot de passe
            if (GOD_EMAILS.includes(normalizedEmail)) {
                const godUser: User = {
                    ...INITIAL_USERS[0],
                    id: 'god-user-id',
                    name: 'Super Admin',
                    email: normalizedEmail,
                    role: 'super_admin', // Droits Max
                    avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=000&color=fff',
                    organization_id: 'demo-org-id'
                };
                
                // Force le stockage local et le mode démo pour éviter les erreurs SQL UUID
                localStorage.setItem('user', JSON.stringify(godUser));
                localStorage.setItem('is_demo_mode', 'true');
                
                return godUser;
            }

            // Legacy/Standard Admin Login
            if (normalizedEmail === 'admin@admin.com' && pass === 'admin') {
                localStorage.setItem('user', JSON.stringify(INITIAL_USERS[0]));
                localStorage.setItem('is_demo_mode', 'true');
                return INITIAL_USERS[0];
            }
            
            // Fallback to real Supabase Login if configured
            if (supabase) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
                if (error) throw new Error("Email ou mot de passe incorrect.");
                
                localStorage.removeItem('is_demo_mode');
                return {
                    id: data.user.id,
                    email: data.user.email || '',
                    name: 'Utilisateur',
                    role: 'admin'
                } as User;
            }

            throw new Error("Identifiants incorrects.");
        },
        logout: async () => {
            localStorage.removeItem('user');
            localStorage.removeItem('is_demo_mode');
            if (supabase) await supabase.auth.signOut();
        },
        register: async (name: string, email: string, password?: string) => {
            await delay(1000);
            // Mock Registration
            const user = { ...INITIAL_USERS[0], name, email, id: 'new-user' };
            if (GOD_EMAILS.includes(email.toLowerCase())) user.role = 'super_admin';
            localStorage.setItem('user', JSON.stringify(user));
            return user;
        },
        connectGoogleBusiness: async () => {
            await delay(1500);
            return true;
        },
        updateProfile: async (data: any) => {
            await delay(500);
            const current = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...current, ...data }));
        },
        changePassword: async () => { await delay(1000); },
        deleteAccount: async () => { await delay(1000); localStorage.clear(); },
        resetPassword: async (email: string) => { await delay(500); },
        loginWithGoogle: async () => { 
            if (supabase) {
                const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
                if (error) throw error;
                return; 
            }
            await delay(1000);
            const user = INITIAL_USERS[0];
            localStorage.setItem('user', JSON.stringify(user));
            return user;
        }
    },
    organization: {
        get: async (): Promise<Organization | null> => {
            await delay(500);
            
            // En mode démo/god mode, on retourne toujours l'organisation ELITE
            if (isDemoMode()) {
                return {
                    ...INITIAL_ORG,
                    subscription_plan: 'elite', // Tout débloqué
                    name: 'Reviewflow HQ (God Mode)',
                    integrations: { 
                        ...INITIAL_ORG.integrations, 
                        google: true, 
                        facebook: true,
                        instagram_posting: true 
                    }
                };
            }
            
            // Return Org from Supabase if real
            // (Note: This might fail if DB is not set up correctly with UUIDs, hence the fallback above is crucial)
            return INITIAL_ORG;
        },
        update: async (data: any) => {
            await delay(600);
            return { ...INITIAL_ORG, ...data };
        },
        create: async (name: string, industry: string) => {
            await delay(1000);
            return { ...INITIAL_ORG, name, industry };
        },
        saveGoogleTokens: async () => { return true; },
        addStaffMember: async (name: string, role: string, email: string) => { await delay(500); },
        removeStaffMember: async (id: string) => { await delay(500); },
        generateApiKey: async (name: string) => { 
            await delay(500); 
        },
        revokeApiKey: async (id: string) => { await delay(500); },
        saveWebhook: async () => { await delay(500); },
        testWebhook: async () => { await delay(1000); return true; },
        deleteWebhook: async () => { await delay(500); },
        simulatePlanChange: async () => { await delay(1000); }
    },
    reviews: {
        list: async (filters: any): Promise<Review[]> => {
            await delay(600);
            let reviews = [...INITIAL_REVIEWS];
            if (filters?.rating && filters.rating !== 'Tout') reviews = reviews.filter(r => r.rating === Number(filters.rating));
            if (filters?.status && filters.status !== 'all') reviews = reviews.filter(r => r.status === filters.status);
            return reviews;
        },
        getTimeline: (review: Review): ReviewTimelineEvent[] => [
            { id: '1', type: 'review_created', actor_name: review.author_name, date: review.received_at, content: 'Avis reçu' },
            { id: '2', type: 'ai_analysis', actor_name: 'IA Gemini', date: review.received_at, content: 'Analyse terminée' },
        ],
        reply: async (id: string, text: string) => { await delay(800); },
        saveDraft: async (id: string, text: string) => { await delay(500); },
        addNote: async (id: string, text: string) => ({ id: Date.now().toString(), text, author_name: 'Moi', created_at: new Date().toISOString() }),
        addTag: async (id: string, tag: string) => { await delay(200); },
        removeTag: async (id: string, tag: string) => { await delay(200); },
        archive: async (id: string) => { await delay(300); },
        unarchive: async (id: string) => { await delay(300); },
        getCounts: async () => ({ todo: 5, done: 120 }),
        subscribe: (cb: any) => ({ unsubscribe: () => {} }),
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
            await delay(1500);
            return "Merci pour votre message ! Nous sommes ravis que vous ayez apprécié votre expérience. À très bientôt !";
        },
        previewBrandVoice: async (simulationType: string, inputText: string, settings: BrandSettings) => {
            await delay(1500);
            return `[Simulation ${settings.tone}] : Merci pour votre retour ! (Mode test)`;
        },
        generateSocialPost: async (review: Review, platform: string) => {
            await delay(1200);
            return "🌟 Un immense merci à nos clients formidables ! #Gratitude";
        },
        generateManagerAdvice: async (member: StaffMember, rank: number, type: string) => {
            await delay(1000);
            return "Pour booster les avis, essayez de demander aux clients satisfaits à la fin du service.";
        },
        runCustomTask: async (payload: any) => {
            await delay(2000);
            return { result: "Analysis complete", confidence: 0.98 };
        },
        chatWithSupport: async (message: string, history: any[]) => {
            await delay(1000);
            return "Je suis l'assistant Reviewflow. Comment puis-je vous aider ?";
        },
        getCoachAdvice: async (progress: ClientProgress): Promise<AiCoachMessage> => {
            await delay(1500);
            return {
                title: "Expert en action 🚀",
                message: "Votre compte tourne à plein régime.",
                focus_area: "social"
            };
        }
    },
    analytics: {
        getOverview: async (period?: string) => {
            await delay(500);
            return INITIAL_ANALYTICS;
        }
    },
    marketing: {
        getBlogPosts: async (): Promise<BlogPost[]> => {
            await delay(500);
            return [
                {
                    id: 'b1', title: '5 Conseils pour booster vos avis', slug: 'booster-avis',
                    content: 'Le secret réside dans le timing...', status: 'published',
                    tags: ['SEO', 'Avis'], published_at: new Date().toISOString()
                }
            ];
        },
        saveBlogPost: async (post: BlogPost) => { await delay(800); return post; },
        generateSeoMeta: async (content: string) => {
            await delay(1500);
            return { meta_title: "Titre SEO", meta_description: "Description SEO", slug: "slug-seo" };
        },
        analyzeCompetitorSeo: async (url: string): Promise<SeoAudit> => {
            await delay(3000);
            return {
                url,
                scanned_at: new Date().toISOString(),
                metrics: { title: "Concurrent", description: "Desc", h1: "Titre", load_time_ms: 450, mobile_friendly: true },
                keywords: ["keyword1", "keyword2"],
                ai_analysis: { strengths: ["Vitesse"], weaknesses: ["Contenu"], opportunities: ["Mots clés"] }
            };
        },
        generateRichSnippet: async (data: any) => { await delay(500); return "{}"; },
        generateCampaignContent: async (prompt: string, budget: number) => {
            await delay(2500);
            return { sms: "SMS", email_subject: "Sujet", email_body: "Corps", social_caption: "Post" };
        }
    },
    automation: {
        getWorkflows: async () => { await delay(300); return INITIAL_WORKFLOWS; },
        saveWorkflow: async (workflow: WorkflowRule) => { await delay(500); },
        deleteWorkflow: async (id: string) => { await delay(500); },
        run: async () => { await delay(2000); return { processed: 5, actions: 3 }; }
    },
    competitors: {
        list: async () => { await delay(400); return INITIAL_COMPETITORS; },
        getReports: async () => [],
        saveReport: async (report: any) => { await delay(500); },
        autoDiscover: async (radius: number, keyword: string, lat: number, lng: number) => {
            await delay(3000);
            return INITIAL_COMPETITORS;
        },
        getDeepAnalysis: async (sector: string, location: string, competitors: any[]) => {
            await delay(4000);
            return { market_analysis: "Analyse...", trends: [], swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] }, competitors_detailed: [] };
        },
        create: async (comp: any) => { await delay(500); },
        delete: async (id: string) => { await delay(300); }
    },
    team: {
        list: async (): Promise<User[]> => { await delay(300); return INITIAL_USERS; },
        invite: async (email: string, role: string, firstName: string, lastName: string) => { await delay(800); return { success: true }; }
    },
    reports: {
        trigger: async (id: string) => { await delay(1000); }
    },
    billing: {
        getInvoices: async () => { await delay(500); return []; },
        getUsage: async () => 450,
        createCheckoutSession: async (planId: string) => "https://checkout.stripe.com/mock",
        createPortalSession: async () => "https://billing.stripe.com/mock"
    },
    locations: {
        update: async (id: string, data: any) => { await delay(500); },
        create: async (data: any) => { await delay(500); },
        delete: async (id: string) => { await delay(500); },
        importFromGoogle: async () => { await delay(2000); return 2; }
    },
    activity: {
        getRecent: async () => []
    },
    onboarding: {
        checkStatus: async (): Promise<SetupStatus> => ({
            completionPercentage: 80,
            googleConnected: true,
            brandVoiceConfigured: true,
            firstReviewReplied: false
        })
    },
    seedCloudDatabase: async () => { await delay(2000); },
    social: {
        getPosts: async (locationId?: string) => { await delay(300); return INITIAL_SOCIAL_POSTS; },
        schedulePost: async (post: any) => { await delay(800); },
        uploadMedia: async (file: File) => "https://via.placeholder.com/500",
        connectAccount: async (platform: string) => { await delay(1000); },
        saveTemplate: async (template: Partial<SocialTemplate>) => { await delay(500); }
    },
    public: {
        getLocationInfo: async (id: string) => { await delay(300); return INITIAL_ORG.locations.find(l => l.id === id) || null; },
        getWidgetReviews: async (id: string) => { await delay(400); return INITIAL_REVIEWS; },
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => { await delay(1000); }
    },
    widgets: {
        requestIntegration: async () => { await delay(1000); }
    },
    campaigns: {
        send: async (channel: string, to: string, subject: string, content: string, segment: string, link?: string) => { await delay(1500); },
        getHistory: async () => []
    },
    offers: {
        validate: async (code: string) => { await delay(500); return { valid: false, reason: 'Code inconnu' }; },
        redeem: async (code: string) => { await delay(500); },
        create: async (offer: any) => { await delay(500); }
    },
    customers: {
        list: async () => { await delay(600); return []; },
        update: async (id: string, data: any) => { await delay(300); },
        import: async (data: any[]) => { await delay(1500); },
        enrichProfile: async (id: string) => { await delay(2000); return { profile: "Client...", suggestion: "..." }; }
    },
    system: {
        checkHealth: async () => { await delay(300); return { db: true, latency: 45 }; }
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
        sendTicket: async (data: any) => { await delay(1000); },
        getTutorials: async (): Promise<Tutorial[]> => []
    },
    progression: {
        get: async (): Promise<ClientProgress> => {
            await delay(500);
            return {
                score: 45,
                level: 'Beginner',
                steps: { google_connected: true, establishment_configured: true, funnel_active: false, first_review_replied: true, widget_installed: false, automation_active: false, social_active: false },
                next_actions: []
            };
        },
        getBadges: async (): Promise<Badge[]> => { await delay(500); return INITIAL_BADGES; },
        getMilestones: async (): Promise<Milestone[]> => { await delay(500); return INITIAL_MILESTONES; }
    }
};
