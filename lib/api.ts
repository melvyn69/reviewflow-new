
import { 
    INITIAL_ORG, INITIAL_REVIEWS, INITIAL_ANALYTICS, 
    INITIAL_WORKFLOWS, INITIAL_REPORTS, INITIAL_COMPETITORS, 
    INITIAL_SOCIAL_POSTS, INITIAL_USERS 
} from './db';
import { 
    User, Organization, Review, AnalyticsSummary, WorkflowRule, 
    ReportConfig, Competitor, SocialPost, Customer, SocialTemplate,
    CampaignLog, SetupStatus, StaffMember, ReviewTimelineEvent, BrandSettings
} from '../types';

// Mock function for demo mode check
const isDemoMode = () => localStorage.getItem('is_demo_mode') === 'true';

// Helper to simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            await delay(500);
            const userStr = localStorage.getItem('user');
            if (userStr) return JSON.parse(userStr);
            if (isDemoMode()) return INITIAL_USERS[0];
            return null;
        },
        login: async (email: string, pass: string) => {
            await delay(800);
            if (email === 'demo@reviewflow.com' || email === 'admin@admin.com') {
                localStorage.setItem('user', JSON.stringify(INITIAL_USERS[0]));
                localStorage.setItem('is_demo_mode', 'true');
                return INITIAL_USERS[0];
            }
            throw new Error("Identifiants incorrects (Essayez demo@reviewflow.com / demo)");
        },
        logout: async () => {
            localStorage.removeItem('user');
            localStorage.removeItem('is_demo_mode');
        },
        register: async (name: string, email: string, password?: string) => {
            await delay(1000);
            const user = { ...INITIAL_USERS[0], name, email, id: 'new-user' };
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
            await delay(1000);
            const user = INITIAL_USERS[0];
            localStorage.setItem('user', JSON.stringify(user));
            return user;
        }
    },
    organization: {
        get: async (): Promise<Organization | null> => {
            await delay(500);
            return INITIAL_ORG;
        },
        update: async (data: any) => {
            await delay(600);
            console.log("Updated Org", data);
            return { ...INITIAL_ORG, ...data };
        },
        create: async (name: string, industry: string) => {
            await delay(1000);
            return { ...INITIAL_ORG, name, industry };
        },
        saveGoogleTokens: async () => { return true; },
        addStaffMember: async (name: string, role: string, email: string) => { await delay(500); },
        removeStaffMember: async (id: string) => { await delay(500); },
        generateApiKey: async () => { await delay(500); },
        revokeApiKey: async () => { await delay(500); },
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
            // Simulation logic depending on settings to show dynamic preview in mock mode
            const isCasual = settings.language_style === 'casual';
            const tone = settings.tone || 'standard';
            
            let prefix = isCasual ? "Salut ! " : "Bonjour, ";
            let body = "Merci pour ce retour.";
            
            if (tone === 'enthousiaste') body = "C'est génial de lire ça ! Merci infiniment !";
            if (tone === 'empathique') body = "Nous comprenons tout à fait votre ressenti et vous remercions de partager cela.";
            
            return `${prefix}${body} (Réponse générée avec le ton '${tone}' et le style '${settings.language_style}')`;
        },
        generateSocialPost: async (review: Review, platform: string) => {
            await delay(1200);
            return "🌟 Un immense merci à nos clients formidables ! Votre satisfaction est notre moteur au quotidien. #Gratitude #ServiceClient #Excellence";
        },
        generateManagerAdvice: async (member: StaffMember, rank: number, type: string) => {
            await delay(1000);
            return "Pour booster les avis, essayez de demander aux clients satisfaits à la fin du service s'ils peuvent scanner le QR code.";
        },
        runCustomTask: async (payload: any) => {
            await delay(2000);
            return { result: "Analysis complete", confidence: 0.98 };
        }
    },
    analytics: {
        getOverview: async (period?: string) => {
            await delay(500);
            return INITIAL_ANALYTICS;
        }
    },
    automation: {
        getWorkflows: async () => {
            await delay(300);
            return INITIAL_WORKFLOWS;
        },
        saveWorkflow: async (workflow: WorkflowRule) => { await delay(500); },
        deleteWorkflow: async (id: string) => { await delay(500); },
        run: async () => {
            await delay(2000);
            return { processed: 5, actions: 3 };
        }
    },
    competitors: {
        list: async () => {
            await delay(400);
            return INITIAL_COMPETITORS;
        },
        getReports: async () => [],
        saveReport: async (report: any) => { await delay(500); },
        autoDiscover: async (radius: number, keyword: string, lat: number, lng: number) => {
            await delay(3000);
            return INITIAL_COMPETITORS;
        },
        getDeepAnalysis: async (sector: string, location: string, competitors: any[]) => {
            await delay(4000);
            return {
                market_analysis: "Marché dynamique avec une forte concurrence sur la qualité de service.",
                trends: ["Digitalisation", "Proximité", "Éco-responsabilité"],
                swot: {
                    strengths: ["Réputation", "Emplacement"],
                    weaknesses: ["Prix", "Digital"],
                    opportunities: ["Livraison", "Click&Collect"],
                    threats: ["Inflation", "Nouveaux entrants"]
                },
                competitors_detailed: [
                    { name: 'Concurrent A', last_month_growth: '+5%', sentiment_trend: 'Positive', top_complaint: 'Prix' }
                ]
            };
        },
        create: async (comp: any) => { await delay(500); },
        delete: async (id: string) => { await delay(300); }
    },
    team: {
        list: async (): Promise<User[]> => {
            await delay(300);
            // Returns USERS (colleagues), mocked with INITIAL_USERS for now.
            // Reports page uses this for distribution.
            // Staff members (for ratings) are in organization.staff_members.
            return INITIAL_USERS;
        },
        invite: async (email: string, role: string) => { await delay(800); }
    },
    reports: {
        trigger: async (id: string) => { await delay(1000); }
    },
    billing: {
        getInvoices: async () => {
            await delay(500);
            return [
                { id: 'inv1', date: '2023-10-01', amount: 7900, status: 'paid', number: 'INV-001', organization_id: 'demo-org-id', stripe_invoice_id: 'si_123', currency: 'eur' }
            ];
        },
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
        getRecent: async () => [
            { id: '1', type: 'review', text: 'Nouvel avis 5 étoiles reçu', time: 'Il y a 5 min', location: 'Paris' },
            { id: '2', type: 'reply', text: 'Réponse automatique envoyée', time: 'Il y a 10 min', location: 'Lyon' }
        ]
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
        getPosts: async (locationId?: string) => {
            await delay(300);
            return INITIAL_SOCIAL_POSTS;
        },
        schedulePost: async (post: any) => { await delay(800); },
        uploadMedia: async (file: File) => "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d",
        connectAccount: async (platform: string) => { await delay(1000); },
        saveTemplate: async (template: Partial<SocialTemplate>) => { await delay(500); }
    },
    public: {
        getLocationInfo: async (id: string) => {
            await delay(300);
            return INITIAL_ORG.locations.find(l => l.id === id) || null;
        },
        getWidgetReviews: async (id: string) => {
            await delay(400);
            return INITIAL_REVIEWS.filter(r => r.rating >= 4);
        },
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
        validate: async (code: string) => {
            await delay(500);
            if (code === 'PROMO20') return { valid: true, discount: '-20%', coupon: { customer_email: 'client@mail.com', expires_at: new Date().toISOString() } };
            return { valid: false, reason: 'Code inconnu' };
        },
        redeem: async (code: string) => { await delay(500); },
        create: async (offer: any) => { await delay(500); }
    },
    customers: {
        list: async () => {
            await delay(600);
            return [
                { id: 'c1', name: 'Jean Dupont', email: 'jean@dupont.fr', total_reviews: 3, average_rating: 4.5, status: 'promoter', ltv_estimate: 450, last_interaction: new Date().toISOString(), source: 'google', stage: 'loyal' }
            ] as Customer[];
        },
        update: async (id: string, data: any) => { await delay(300); },
        import: async (data: any[]) => { await delay(1500); },
        enrichProfile: async (id: string) => {
            await delay(2000);
            return { profile: "Client fidèle et enthousiaste", suggestion: "Lui proposer le programme VIP" };
        }
    },
    system: {
        checkHealth: async () => {
            await delay(300);
            return { db: true, latency: 45 };
        }
    },
    admin: {
        getStats: async () => ({
            mrr: "12,450 €",
            active_tenants: 142,
            total_reviews_processed: 8540,
            tenants: [
                { id: 't1', name: 'Brasserie des Arts', plan: 'pro', usage: 450, mrr: '79 €' }
            ]
        })
    },
    google: {
        fetchAllGoogleLocations: async () => [],
        syncReviewsForLocation: async () => { await delay(2000); return 5; }
    },
    company: {
        search: async (query: string) => {
            try {
                const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&limit=5`);
                if (!response.ok) throw new Error("Erreur API");
                const data = await response.json();
                
                return data.results.map((r: any) => ({
                    legal_name: r.nom_complet,
                    siret: r.siege.siret,
                    address: r.siege.adresse,
                    city: r.siege.libelle_commune,
                    zip: r.siege.code_postal,
                    activity: r.activite_principale 
                }));
            } catch (e) {
                console.error("Company Search Error", e);
                if (isDemoMode()) {
                     return [
                        { legal_name: 'Ma Société SAS', siret: '12345678900012', address: '1 Rue de la Paix, 75002 Paris', city: 'Paris', zip: '75002' }
                    ];
                }
                return [];
            }
        }
    }
};
