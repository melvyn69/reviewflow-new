
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
import { hasAccess } from './features'; // Import helper

// Mock function for demo mode check
const isDemoMode = () => localStorage.getItem('is_demo_mode') === 'true';

// Helper to simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to check for God Mode (Super Admin)
const isGodMode = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    return user.email === 'god@reviewflow.com';
};

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
            
            // GOD MODE LOGIN
            if (email === 'god@reviewflow.com' && pass === 'godmode') {
                const godUser: User = {
                    ...INITIAL_USERS[0],
                    id: 'god-user-id',
                    name: 'Super Admin',
                    email: 'god@reviewflow.com',
                    role: 'super_admin',
                    avatar: 'https://cdn-icons-png.flaticon.com/512/2622/2622075.png'
                };
                localStorage.setItem('user', JSON.stringify(godUser));
                localStorage.setItem('is_demo_mode', 'true');
                return godUser;
            }

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
            // If God Mode, return organization with ELITE plan to unlock everything
            if (isGodMode()) {
                return {
                    ...INITIAL_ORG,
                    subscription_plan: 'elite',
                    name: 'Reviewflow HQ (God Mode)'
                };
            }
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
        generateApiKey: async (name: string) => { 
            // Mocked backend guard - bypassed in God Mode or Elite plan
            const org = await api.organization.get();
            if (!hasAccess(org, 'api_access')) throw new Error("Accès API réservé au plan Elite.");
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
            // Check Access
            const org = await api.organization.get();
            if (!hasAccess(org, 'social_studio')) throw new Error("Social Studio réservé aux plans Pro.");
            
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
        },
        chatWithSupport: async (message: string, history: any[]) => {
            await delay(1000);
            // Mock response logic for demo
            const lower = message.toLowerCase();
            if (lower.includes('avis') || lower.includes('google')) {
                return "Pour connecter Google, allez dans Paramètres > Intégrations. Une fois connecté, vos avis apparaîtront dans la boîte de réception.";
            } else if (lower.includes('qr') || lower.includes('code')) {
                return "Vous pouvez générer votre QR code dans le menu 'Collecte d'avis'. Il est disponible en plusieurs formats (PDF, PNG).";
            }
            return "Je suis l'assistant Reviewflow. Je peux vous aider sur la configuration, la gestion des avis ou les automatisations. Que voulez-vous savoir ?";
        },
        getCoachAdvice: async (progress: ClientProgress): Promise<AiCoachMessage> => {
            // MOCKED: In production, this would call supabase/functions/ai_coach
            if (supabase) {
                try {
                    const { data, error } = await supabase.functions.invoke('ai_coach', { body: { progress } });
                    if (!error && data) return data;
                } catch(e) { console.warn("Supabase coach error, falling back to mock"); }
            }
            
            await delay(1500);
            // Fallback Mock Logic
            if (progress.score < 30) {
                return {
                    title: "Démarrage en douceur",
                    message: "Vous avez fait le plus dur : commencer ! Pour décoller, connectez votre fiche Google Business dès maintenant.",
                    focus_area: "setup"
                };
            } else if (progress.score < 60) {
                return {
                    title: "Bonne dynamique !",
                    message: "Vos avis sont traités, c'est super. Pour aller plus loin, essayez d'activer l'automatisation pour les avis 5 étoiles.",
                    focus_area: "setup"
                };
            }
            return {
                title: "Expert en action 🚀",
                message: "Votre compte tourne à plein régime. Avez-vous pensé à utiliser Social Studio pour transformer vos meilleurs avis en posts Instagram ?",
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
            // Mock blog posts
            return [
                {
                    id: 'b1', title: '5 Conseils pour booster vos avis Google', slug: 'booster-avis-google',
                    content: 'Le secret réside dans le timing...', status: 'published',
                    meta_title: '5 Conseils Avis Google - Guide 2025', meta_description: 'Découvrez comment obtenir plus d\'avis 5 étoiles.',
                    tags: ['SEO', 'Avis'], published_at: new Date().toISOString()
                },
                {
                    id: 'b2', title: 'Pourquoi répondre aux avis négatifs ?', slug: 'repondre-avis-negatifs',
                    content: 'Ne les ignorez pas, c\'est une opportunité.', status: 'draft',
                    meta_title: '', meta_description: '',
                    tags: ['E-réputation'], published_at: undefined
                }
            ];
        },
        saveBlogPost: async (post: BlogPost) => {
            await delay(800);
            return post;
        },
        generateSeoMeta: async (content: string) => {
            await delay(1500);
            // Simulate AI
            return {
                meta_title: "Titre Optimisé SEO | Votre Marque",
                meta_description: "Ceci est une méta-description générée par IA, optimisée pour le taux de clic et contenant les mots-clés pertinents extraits du contenu.",
                slug: "titre-optimise-seo"
            };
        },
        analyzeCompetitorSeo: async (url: string): Promise<SeoAudit> => {
            await delay(3000);
            return {
                url,
                scanned_at: new Date().toISOString(),
                metrics: {
                    title: "Titre du site concurrent - Mots clés",
                    description: "Description méta trouvée sur le site concurrent.",
                    h1: "Le H1 principal de la page",
                    load_time_ms: 450,
                    mobile_friendly: true
                },
                keywords: ["restaurant paris", "meilleur burger", "terrasse"],
                ai_analysis: {
                    strengths: ["Vitesse de chargement excellente", "Structure Hn propre"],
                    weaknesses: ["Méta description trop courte", "Manque de balises alt sur les images"],
                    opportunities: ["Se positionner sur 'burger vegan'"]
                }
            };
        },
        generateRichSnippet: async (data: any) => {
            await delay(500);
            return JSON.stringify({
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                "name": data.name,
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": data.rating,
                    "reviewCount": data.count
                }
            }, null, 2);
        },
        generateCampaignContent: async (prompt: string, budget: number) => {
            await delay(2500);
            return {
                sms: `🔥 ${prompt} ! Profitez-en vite. Code: SUMMER20. Stop au 36111.`,
                email_subject: `Ne ratez pas ${prompt} 🎁`,
                email_body: `<p>Bonjour,</p><p>C'est le moment de profiter de <strong>${prompt}</strong>.</p>`,
                social_caption: `C'est parti pour ${prompt} ! 🚀 Venez nous voir. #Promo #${prompt.replace(/\s/g, '')}`
            };
        }
    },
    automation: {
        getWorkflows: async () => {
            await delay(300);
            return INITIAL_WORKFLOWS;
        },
        saveWorkflow: async (workflow: WorkflowRule) => { 
            const org = await api.organization.get();
            if (!hasAccess(org, 'automation')) throw new Error("Upgrade requis.");
            await delay(500); 
        },
        deleteWorkflow: async (id: string) => { await delay(500); },
        run: async () => {
            await delay(2000);
            return { processed: 5, actions: 3 };
        }
    },
    competitors: {
        list: async () => {
            const org = await api.organization.get();
            if (!hasAccess(org, 'competitors')) return [];
            await delay(400);
            return INITIAL_COMPETITORS;
        },
        getReports: async () => [],
        saveReport: async (report: any) => { await delay(500); },
        autoDiscover: async (radius: number, keyword: string, lat: number, lng: number) => {
            const org = await api.organization.get();
            if (!hasAccess(org, 'competitors')) throw new Error("Upgrade requis pour le scan.");
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
            if (isDemoMode()) {
                await delay(300);
                return INITIAL_USERS;
            }
            // Fetch real users if not demo
            if (supabase) {
                const { data } = await supabase.from('users').select('*');
                return data as User[] || [];
            }
            return [];
        },
        invite: async (email: string, role: string, firstName: string, lastName: string) => { 
            if (isDemoMode()) {
                await delay(800);
                return { success: true };
            }
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('invite_user', {
                    body: { email, role, firstName, lastName }
                });
                if (error) throw error;
                return data;
            }
        }
    },
    reports: {
        trigger: async (id: string) => { 
            const org = await api.organization.get();
            if (!hasAccess(org, 'advanced_reports')) throw new Error("Upgrade requis.");
            await delay(1000); 
        }
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
            const org = await api.organization.get();
            if (!hasAccess(org, 'social_studio')) return [];
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
    },
    support: {
        sendTicket: async (data: { name: string, email: string, subject: string, message: string, urgency: 'normal' | 'high' | 'critical' }) => {
            if (isDemoMode()) {
                await delay(1000);
                return { success: true };
            }
            if (supabase) {
                const { error } = await supabase.functions.invoke('send_support_ticket', { body: data });
                if (error) throw error;
            }
        },
        getTutorials: async (): Promise<Tutorial[]> => {
            await delay(200);
            return [
                {
                    id: 't1',
                    title: 'Connecter sa fiche Google Business',
                    category: 'Prise en main',
                    description: 'Importez vos avis et synchronisez vos établissements en 2 minutes.',
                    videoUrl: 'https://www.loom.com/embed/e5b8c04bca094dd8a5507925ab887002', // Fake ID
                    steps: [
                        'Allez dans Paramètres > Intégrations.',
                        'Cliquez sur le bouton "Connecter" dans la carte Google Business Profile.',
                        'Connectez-vous avec le compte Google qui gère vos fiches.',
                        'Sélectionnez les établissements à importer et validez.'
                    ],
                    duration: '2:30'
                },
                {
                    id: 't2',
                    title: 'Créer un QR Code de collecte',
                    category: 'Avis',
                    description: 'Générez des supports physiques pour inciter vos clients à laisser un avis.',
                    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Fake
                    steps: [
                        'Allez dans le menu "Collecte d\'avis".',
                        'Choisissez l\'établissement concerné.',
                        'Personnalisez les couleurs et le logo.',
                        'Téléchargez le PDF prêt à imprimer (Affiche, Sticker, Carte).'
                    ],
                    duration: '4:15'
                },
                {
                    id: 't3',
                    title: 'Configurer l\'IA et le ton de marque',
                    category: 'Configuration',
                    description: 'Apprenez à l\'IA à parler comme vous.',
                    steps: [
                        'Allez dans Paramètres > Identité IA.',
                        'Définissez le ton (Professionnel, Amical, etc.).',
                        'Ajoutez des exemples de réponses types.',
                        'Testez la configuration dans le simulateur en bas de page.'
                    ],
                    duration: '3:00'
                }
            ];
        }
    },
    progression: {
        get: async (): Promise<ClientProgress> => {
            await delay(500);
            return {
                score: 45,
                level: 'Beginner',
                steps: {
                    google_connected: true,
                    establishment_configured: true,
                    funnel_active: false,
                    first_review_replied: true,
                    widget_installed: false,
                    automation_active: false,
                    social_active: false
                },
                next_actions: [
                    { id: '1', title: 'Activer le Funnel', description: 'Interceptez les avis négatifs avant Google.', action_link: '/collect', impact: 'high' },
                    { id: '2', title: 'Installer le Widget', description: 'Affichez votre note sur votre site.', action_link: '/widget', impact: 'medium' },
                    { id: '3', title: 'Automatisation', description: 'Répondez automatiquement aux 5 étoiles.', action_link: '/automation', impact: 'medium' }
                ]
            };
        },
        getBadges: async (): Promise<Badge[]> => {
            await delay(500);
            return INITIAL_BADGES;
        },
        getMilestones: async (): Promise<Milestone[]> => {
            await delay(500);
            return INITIAL_MILESTONES;
        }
    }
};
