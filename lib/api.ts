
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
import { GoogleGenAI } from "@google/genai";

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
        saveWebhook: async (url: string, events: string[]) => { await delay(500); },
        testWebhook: async () => { await delay(1000); return true; },
        deleteWebhook: async (id: string) => { await delay(500); },
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
        uploadCsv: async (file: File) => { await delay(1000); return 15; }
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
        generateReply: async (review: Review, config: any) => {
            // Attempt 1: Server-Side (Edge Function)
            if (supabase) {
                try {
                    const { data, error } = await supabase.functions.invoke('ai_generate', {
                        body: { task: 'generate_reply', context: { review, ...config } }
                    });
                    if (!error && data && !data.error) return data.text;
                } catch (e) {
                    console.warn("Server AI failed, trying client fallback...", e);
                }
            }

            // Attempt 2: Client-Side Direct (Fallback)
            if (process.env.API_KEY) {
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const isPositive = review.rating >= 4;
                    const prompt = `
                        Agis comme le propriétaire de l'établissement "${config.businessName || 'Mon Entreprise'}" (${config.category || 'Commerce'}).
                        Rédige une réponse à cet avis client.
                        
                        Contexte :
                        - Note : ${review.rating}/5
                        - Auteur : ${review.author_name}
                        - Message : "${review.body}"
                        
                        Consignes :
                        - Ton : ${config.tone || 'Professionnel'}
                        - Longueur : ${config.length === 'short' ? 'Très courte (1-2 phrases)' : 'Standard'}
                        - Langue : Français
                        - Format : Pas de guillemets autour de la réponse.
                        
                        ${isPositive ? "Remercie chaleureusement et valorise l'expérience." : "Sois empathique, excuse-toi pour le désagrément et propose de revenir."}
                    `;
                    
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: prompt
                    });
                    
                    return response.text || "Erreur lors de la génération.";
                } catch (e: any) {
                    console.error("Client AI Error:", e);
                    throw new Error("L'IA est injoignable (Erreur API: " + e.message + ")");
                }
            }

            return "Mode hors ligne : L'IA n'est pas connectée. Veuillez vérifier votre clé API.";
        },
        previewBrandVoice: async (type: string, input: string, settings: BrandSettings) => {
            // Attempt 1: Server
            if (supabase) {
                try {
                    const { data, error } = await supabase.functions.invoke('ai_generate', {
                        body: { task: 'test_brand_voice', context: { simulationType: type, inputText: input, simulationSettings: settings } }
                    });
                    if (!error && data && !data.error) return data.text;
                } catch(e) {}
            }

            // Attempt 2: Client
            if (process.env.API_KEY) {
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const prompt = `
                        Tu es le community manager. Applique STRICTEMENT cette identité :
                        - Ton : ${settings.tone}
                        - Style : ${settings.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}
                        - Mots interdits : ${settings.forbidden_words?.join(', ') || 'Aucun'}
                        
                        Réponds à ce message : "${input}"
                    `;
                    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                    return res.text;
                } catch(e) { return "Erreur test."; }
            }
            return "Réponse simulée (IA non connectée)";
        },
        generateSocialPost: async (review: Review, platform: string) => {
            // Attempt 1: Server
            if (supabase) {
                try {
                    const { data, error } = await supabase.functions.invoke('ai_generate', {
                        body: { task: 'social_post', context: { review, platform } }
                    });
                    if (!error && data && !data.error) return data.text;
                } catch(e) {}
            }

            // Attempt 2: Client
            if (process.env.API_KEY) {
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const prompt = `
                        Agis comme un Social Media Manager expert.
                        Plateforme : ${platform}.
                        
                        Tâche : Rédige une légende engageante pour mettre en avant cet avis 5 étoiles.
                        Avis : "${review.body}" par ${review.author_name}.
                        
                        Ton : Enthousiaste, reconnaissant.
                        Langue : Français.
                        Inclus des emojis et hashtags pertinents.
                    `;
                    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                    return res.text;
                } catch(e) { return "Erreur génération."; }
            }
            return "Post simulé...";
        },
        generateManagerAdvice: async (member: StaffMember, rank: number, type: string) => { 
            // Attempt 1: Server
            if (supabase) {
                try {
                    const { data } = await supabase.functions.invoke('ai_generate', {
                        body: { task: 'generate_manager_advice', context: { name: member.name, role: member.role, reviewCount: member.reviews_count, avgRating: member.average_rating, rank, type } }
                    });
                    if (data && data.text) return data.text;
                } catch(e) {}
            }
            
            // Attempt 2: Client
            if (process.env.API_KEY) {
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const prompt = `Coach Manager. Donne un conseil court (1 phrase) pour ${member.name} (${member.role}, ${member.reviews_count} avis). Objectif: ${type}.`;
                    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                    return res.text;
                } catch(e) {}
            }
            
            return "Conseil simulé : Félicitez-le pour ses efforts !";
        },
        runCustomTask: async (payload: any) => { 
            if (process.env.API_KEY) {
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: JSON.stringify(payload) });
                    return { result: res.text };
                } catch(e: any) { return { error: e.message }; }
            }
            return { result: "Success (Mock)" }; 
        },
        chatWithSupport: async (msg: string, history: any[]) => { 
            if (process.env.API_KEY) {
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const chat = ai.chats.create({ model: 'gemini-2.5-flash' }); // Simplified, history management needed for real context
                    const res = await chat.sendMessage({ message: "Tu es le support client de Reviewflow. Réponds à : " + msg });
                    return res.text || "Désolé, je n'ai pas compris.";
                } catch(e) { return "Erreur de connexion support."; }
            }
            return "Support IA : Je suis là pour vous aider (Mode Démo)."; 
        },
        getCoachAdvice: async (progress: ClientProgress): Promise<AiCoachMessage> => {
            // Attempt 1: Server
            if (supabase) {
                try {
                    const { data, error } = await supabase.functions.invoke('ai_coach', { body: { progress } });
                    if (!error && data) return data;
                } catch(e) {}
            }
            
            // Attempt 2: Client
            if (process.env.API_KEY) {
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const prompt = `Coach Success. Score: ${progress.score}/100. Niveau: ${progress.level}. Donne un conseil court JSON {title, message, focus_area}.`;
                    const res = await ai.models.generateContent({ 
                        model: 'gemini-2.5-flash', 
                        contents: prompt,
                        config: { responseMimeType: 'application/json' }
                    });
                    if (res.text) return JSON.parse(res.text);
                } catch(e) {}
            }

            return { title: "Bienvenue", message: "Complétez votre profil pour avancer.", focus_area: "setup" };
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
        saveWorkflow: async (workflow: WorkflowRule) => { await delay(500); },
        deleteWorkflow: async (id: string) => { await delay(500); },
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
        invite: async (email: string, role: string, firstName?: string, lastName?: string) => ({ success: true })
    },
    reports: {
        trigger: async (id: string) => { await delay(1000); }
    },
    billing: {
        getInvoices: async () => [],
        getUsage: async () => 450,
        createCheckoutSession: async (planId: string) => "https://checkout.stripe.com/mock",
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
        getWidgetReviews: async (id: string) => INITIAL_REVIEWS,
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => {}
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
        sendTicket: async (data: any) => {},
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
