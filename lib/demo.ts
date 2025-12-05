
import { AnalyticsSummary, Competitor, Organization, Review, User } from '../types';

export const DEMO_USER: User = {
    id: 'demo-user-id',
    email: 'demo@reviewflow.com',
    name: 'Gérant Démo',
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=4f46e5&color=fff',
    organizations: ['demo-org-id'],
    organization_id: 'demo-org-id'
};

export const DEMO_ORG: Organization = {
    id: 'demo-org-id',
    name: 'Brasserie des Arts',
    created_at: '2023-01-01',
    subscription_plan: 'pro',
    industry: 'restaurant',
    ai_usage_count: 342,
    integrations: {
        google: true, // Simule connecté
        facebook: true,
        instagram_posting: true,
        facebook_posting: false,
        linkedin_posting: false,
        tiktok_posting: false
    },
    locations: [
        {
            id: 'loc-1',
            name: 'Brasserie des Arts - Paris',
            address: '15 Avenue Montaigne',
            city: 'Paris',
            country: 'France',
            connection_status: 'connected',
            platform_rating: 4.7,
            google_review_url: 'https://google.com',
            organization_id: 'demo-org-id'
        },
        {
            id: 'loc-2',
            name: 'Le Petit Arts - Lyon',
            address: '12 Rue de la République',
            city: 'Lyon',
            country: 'France',
            connection_status: 'connected',
            platform_rating: 4.2,
            google_review_url: 'https://google.com',
            organization_id: 'demo-org-id'
        }
    ],
    staff_members: [
        { id: 's1', name: 'Thomas', role: 'Serveur', reviews_count: 12, average_rating: 4.8, organization_id: 'demo-org-id' },
        { id: 's2', name: 'Léa', role: 'Manager', reviews_count: 8, average_rating: 4.5, organization_id: 'demo-org-id' },
        { id: 's3', name: 'Chef Mario', role: 'Cuisinier', reviews_count: 15, average_rating: 4.9, organization_id: 'demo-org-id' }
    ],
    workflows: [
        {
            id: 'wf1',
            name: 'Réponse Auto 5★',
            enabled: true,
            trigger: 'review_created',
            conditions: [{ id: 'c1', field: 'rating', operator: 'equals', value: 5 }],
            actions: [{ id: 'a1', type: 'auto_reply', config: { tone: 'enthusiastic' } }]
        }
    ]
};

export const DEMO_STATS: AnalyticsSummary = {
    period: '30j',
    total_reviews: 128,
    average_rating: 4.7,
    response_rate: 98,
    nps_score: 72,
    global_rating: 4.7,
    sentiment_distribution: {
        positive: 0.85,
        neutral: 0.10,
        negative: 0.05
    },
    volume_by_date: [
        { date: '01 Mar', count: 4 },
        { date: '02 Mar', count: 6 },
        { date: '03 Mar', count: 3 },
        { date: '04 Mar', count: 8 },
        { date: '05 Mar', count: 12 },
        { date: '06 Mar', count: 5 },
        { date: '07 Mar', count: 9 },
    ],
    top_themes_positive: [
        { name: 'Service', weight: 0.9 },
        { name: 'Ambiance', weight: 0.85 },
        { name: 'Cuisine', weight: 0.8 }
    ],
    top_themes_negative: [
        { name: 'Bruit', weight: 0.4 },
        { name: 'Prix', weight: 0.3 }
    ],
    top_keywords: [
        { keyword: "Excellent", count: 45 },
        { keyword: "Merci", count: 32 },
        { keyword: "Recommande", count: 28 },
        { keyword: "Thomas", count: 12 }
    ],
    strengths_summary: "L'excellence du service et la qualité des plats sont systématiquement saluées. L'équipe en salle, notamment Thomas, est un atout majeur.",
    problems_summary: "Le niveau sonore le samedi soir revient dans quelques avis négatifs récents."
};

export const DEMO_REVIEWS: Review[] = [
    {
        id: 'r1',
        source: 'google',
        location_id: 'loc-1',
        rating: 5,
        language: 'fr',
        author_name: 'Sophie Marceau',
        body: "Un moment magique ! Le service était impeccable du début à la fin. Les plats sont aussi beaux que bons. Mention spéciale pour le soufflé au chocolat.",
        received_at: new Date().toISOString(),
        status: 'pending',
        analysis: {
            sentiment: 'positive',
            themes: ['cuisine', 'service', 'dessert'],
            keywords: ['magique', 'impeccable', 'soufflé'],
            flags: { hygiene: false, security: false, discrimination: false, staff_conflict: false, pricing_issue: false }
        },
        ai_reply: {
            text: "Merci infiniment Sophie ! Nous sommes ravis que le soufflé vous ait plu. Toute l'équipe espère vous revoir très bientôt pour d'autres douceurs.",
            tone: 'enthusiastic',
            needs_manual_validation: false
        }
    },
    {
        id: 'r2',
        source: 'tripadvisor',
        location_id: 'loc-1',
        rating: 3,
        language: 'fr',
        author_name: 'Jean Dujardin',
        body: "Correct mais un peu cher pour la quantité. L'ambiance est sympa mais la musique était trop forte, on ne s'entendait pas parler.",
        received_at: new Date(Date.now() - 86400000).toISOString(),
        status: 'pending',
        analysis: {
            sentiment: 'neutral',
            themes: ['prix', 'ambiance', 'bruit'],
            keywords: ['cher', 'musique', 'forte'],
            flags: { hygiene: false, security: false, discrimination: false, staff_conflict: false, pricing_issue: true }
        }
    },
    {
        id: 'r3',
        source: 'facebook',
        location_id: 'loc-2',
        rating: 5,
        language: 'fr',
        author_name: 'Marion Cotillard',
        body: "Le meilleur restaurant de Lyon ! L'accueil de Thomas était parfait. Je recommande les yeux fermés.",
        received_at: new Date(Date.now() - 172800000).toISOString(),
        status: 'sent',
        posted_reply: "Merci Marion ! Thomas sera ravi de lire votre commentaire. À très vite !",
        replied_at: new Date().toISOString(),
        analysis: {
            sentiment: 'positive',
            themes: ['accueil', 'équipe'],
            keywords: ['meilleur', 'parfait', 'recommande'],
            flags: { hygiene: false, security: false, discrimination: false, staff_conflict: false, pricing_issue: false }
        }
    },
    {
        id: 'r4',
        source: 'google',
        location_id: 'loc-1',
        rating: 1,
        language: 'fr',
        author_name: 'Critique Anonyme',
        body: "Inacceptable. J'ai attendu 45 minutes pour une table alors que j'avais réservé. Le manager n'a même pas présenté d'excuses.",
        received_at: new Date(Date.now() - 250000000).toISOString(),
        status: 'draft',
        analysis: {
            sentiment: 'negative',
            themes: ['attente', 'service', 'manager'],
            keywords: ['inacceptable', 'attente', 'réservation'],
            flags: { hygiene: false, security: false, discrimination: false, staff_conflict: true, pricing_issue: false }
        },
        ai_reply: {
            text: "Bonjour, nous sommes sincèrement désolés pour cette attente inhabituelle malgré votre réservation. Ce n'est pas le standard de service que nous visons. Pouvez-vous nous contacter par email pour que nous puissions nous rattraper ?",
            tone: 'apologetic',
            needs_manual_validation: true
        }
    }
];

export const DEMO_COMPETITORS: Competitor[] = [
    {
        id: 'c1',
        name: 'Le Gourmet Voisin',
        rating: 4.8,
        review_count: 850,
        address: '20m',
        strengths: ['Carte des vins', 'Terrasse'],
        weaknesses: ['Prix élevés'],
        organization_id: 'demo-org-id'
    },
    {
        id: 'c2',
        name: 'Bistro du Coin',
        rating: 3.9,
        review_count: 210,
        address: '150m',
        strengths: ['Prix bas', 'Rapidité'],
        weaknesses: ['Hygiène', 'Bruit'],
        organization_id: 'demo-org-id'
    }
];