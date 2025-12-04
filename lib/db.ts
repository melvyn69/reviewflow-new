
import { Review, User, Organization, AnalyticsSummary, WorkflowRule, ReportConfig, Competitor } from '../types';

// --- INITIAL SEED DATA ---

export const INITIAL_USERS = [
  {
    id: 'u1',
    name: 'Alex Martin',
    email: 'alex@reviewflow.com',
    password: 'password',
    avatar: 'https://ui-avatars.com/api/?name=Alex+Martin&background=4f46e5&color=fff',
    role: 'admin' as User['role'],
    organizations: ['org1']
  }
];

export const INITIAL_ORG: Organization = {
  id: 'org1',
  name: 'Groupe Multiservices',
  created_at: '2023-01-01',
  subscription_plan: 'free',
  industry: 'services',
  ai_usage_count: 0,
  locations: [
    { 
      id: 'loc1', 
      name: 'Salon Éclat Coiffure', 
      address: '12 Rue de la République', 
      city: 'Lyon', 
      country: 'France', 
      connection_status: 'connected', 
      platform_rating: 4.8,
      google_review_url: 'https://www.google.com/search?q=Salon+Eclat+Coiffure+Lyon' 
    },
    { 
      id: 'loc2', 
      name: 'Martin Plomberie Express', 
      address: 'Zone Industrielle Nord', 
      city: 'Paris', 
      country: 'France', 
      connection_status: 'disconnected', 
      platform_rating: 4.2,
      google_review_url: 'https://www.google.com/search?q=Martin+Plomberie+Paris'
    },
    { 
      id: 'loc3', 
      name: 'Mode & Tendance', 
      address: '45 Avenue Jean Jaurès', 
      city: 'Lille', 
      country: 'France', 
      connection_status: 'connected', 
      platform_rating: 4.5,
      google_review_url: 'https://www.google.com/search?q=Mode+Tendance+Lille'
    },
  ],
  integrations: {
    google: false,
    facebook: false,
    instagram_posting: false,
    facebook_posting: false,
    linkedin_posting: false,
    tiktok_posting: false
  },
  saved_replies: [
      { id: 't1', title: 'Remerciement Simple', content: 'Merci beaucoup pour votre avis ! Nous sommes ravis que vous ayez apprécié votre visite.', category: 'positive' },
      { id: 't2', title: 'Excuses Retard', content: 'Bonjour, nous sommes désolés pour l\'attente lors de votre visite. Nous faisons tout notre possible pour améliorer la fluidité du service.', category: 'negative' },
      { id: 't3', title: 'Inviter à revenir', content: 'Merci pour votre retour ! N\'hésitez pas à découvrir nos nouveautés lors de votre prochain passage.', category: 'positive' }
  ]
};

export const INITIAL_COMPETITORS: Competitor[] = [
  {
    id: 'c1',
    name: 'Salon Prestige',
    rating: 4.9,
    review_count: 320,
    address: '2 Rue de la Paix, Lyon',
    strengths: ['Luxe', 'Champagne offert', 'Technique'],
    weaknesses: ['Prix très élevé', 'Délais rdv']
  },
  {
    id: 'c2',
    name: 'Coiffure Low Cost',
    rating: 3.8,
    review_count: 850,
    address: 'Gare Part-Dieu, Lyon',
    strengths: ['Prix imbattable', 'Sans rendez-vous'],
    weaknesses: ['Hygiène moyenne', 'Personnel pressé', 'Attente']
  },
  {
    id: 'c3',
    name: 'Barber Shop Authentic',
    rating: 4.6,
    review_count: 150,
    address: 'Vieux Lyon',
    strengths: ['Ambiance', 'Produits'],
    weaknesses: ['Stationnement']
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'r1',
    source: 'google',
    location_id: 'loc1', // Coiffure
    rating: 5,
    language: 'fr',
    author_name: 'Sophie Dubois',
    body: 'Coiffeuse très à l\'écoute ! J\'adore ma nouvelle coupe et le balayage est parfait. Salon très propre et relaxant.',
    received_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: 'pending',
    analysis: {
      sentiment: 'positive',
      themes: ['coupe', 'ambiance', 'propreté'],
      keywords: ['écoute', 'parfait', 'relaxant'],
      emotion: 'joie',
      summary: 'Cliente ravie de sa coupe et de l\'ambiance du salon.',
      flags: {
        hygiene: false,
        discrimination: false,
        security: false,
        staff_conflict: false,
        pricing_issue: false
      }
    },
    ai_reply: {
      text: "Merci beaucoup Sophie ! Toute l'équipe du Salon Éclat est ravie que votre nouvelle coupe vous plaise. Au plaisir de vous revoir pour un moment de détente !",
      tone: 'enthusiastic',
      needs_manual_validation: false,
      created_at: new Date().toISOString()
    }
  },
  {
    id: 'r2',
    source: 'google',
    location_id: 'loc2', // Plomberie
    rating: 2,
    language: 'fr',
    author_name: 'Jean Michel',
    body: 'Intervention rapide pour la fuite, mais le technicien a laissé le sol sale après son départ. Un peu cher pour 30min de travail.',
    received_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: 'draft',
    analysis: {
      sentiment: 'negative',
      themes: ['propreté', 'prix', 'rapidité'],
      keywords: ['sale', 'cher', 'rapide'],
      emotion: 'déception',
      summary: 'Intervention rapide mais problème de propreté fin de chantier et prix élevé.',
      flags: {
        hygiene: true, // Propreté chantier
        discrimination: false,
        security: false,
        staff_conflict: false,
        pricing_issue: true
      }
    },
    ai_reply: {
      text: "Bonjour Jean, merci pour votre retour. Nous sommes navrés que l'état des lieux après intervention n'ait pas été impeccable. Ce n'est pas représentatif de nos standards. Nous prenons note pour le prix.",
      tone: 'apologetic',
      needs_manual_validation: true,
      reasons_for_validation: ['problème propreté', 'plainte prix'],
      created_at: new Date().toISOString()
    },
    assigned_to: 'u1'
  },
  {
    id: 'r3',
    source: 'facebook',
    location_id: 'loc1', // Coiffure
    rating: 4,
    language: 'fr',
    author_name: 'Emilie Blanc',
    body: 'Super équipe, très pro. Juste un peu de retard sur mon rendez-vous (15min).',
    received_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    status: 'sent',
    analysis: {
      sentiment: 'positive',
      themes: ['équipe', 'ponctualité'],
      keywords: ['pro', 'retard'],
      emotion: 'satisfaction mitigée',
      summary: 'Bon service mais léger retard.',
      flags: {
        hygiene: false,
        discrimination: false,
        security: false,
        staff_conflict: false,
        pricing_issue: false
      }
    },
    posted_reply: "Merci Emilie pour votre avis positif ! Désolé pour le petit retard, nous faisons tout pour rester ponctuels malgré l'affluence.",
    replied_at: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
  },
  {
    id: 'r4',
    source: 'google',
    location_id: 'loc3', // Retail (Boutique)
    rating: 3,
    language: 'fr',
    author_name: 'Claire L.',
    body: 'J\'aime beaucoup vos articles, mais impossible de se faire rembourser un article défectueux, seulement un avoir. C\'est dommage.',
    received_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    status: 'pending',
    analysis: {
      sentiment: 'neutral',
      themes: ['politique retour', 'qualité produit'],
      keywords: ['avoir', 'remboursement', 'défectueux'],
      emotion: 'frustration',
      summary: 'Cliente déçue par la politique de retour (avoir vs remboursement).',
      flags: {
        hygiene: false,
        discrimination: false,
        security: false,
        staff_conflict: false,
        pricing_issue: true
      }
    }
  }
];

export const INITIAL_ANALYTICS: AnalyticsSummary = {
  period: 'last_30_days',
  total_reviews: 1248,
  average_rating: 4.5,
  response_rate: 94,
  nps_score: 72,
  global_rating: 4.5,
  sentiment_distribution: {
    positive: 0.75,
    neutral: 0.15,
    negative: 0.10
  },
  volume_by_date: [
    { date: 'Lun', count: 12 },
    { date: 'Mar', count: 15 },
    { date: 'Mer', count: 20 },
    { date: 'Jeu', count: 18 },
    { date: 'Ven', count: 25 },
    { date: 'Sam', count: 30 },
    { date: 'Dim', count: 10 },
  ],
  top_themes_positive: [
    { name: 'professionnalisme', weight: 0.9 },
    { name: 'résultat', weight: 0.85 },
    { name: 'accueil', weight: 0.7 }
  ],
  top_themes_negative: [
    { name: 'retard', weight: 0.6 },
    { name: 'prix', weight: 0.5 },
    { name: 'disponibilité', weight: 0.3 }
  ],
  top_keywords: [
      { keyword: "équipe", count: 150 },
      { keyword: "merci", count: 120 },
      { keyword: "recommande", count: 90 }
  ],
  problems_summary: "Quelques mentions de retard sur les rendez-vous en fin de journée et des remarques isolées sur les tarifs.",
  strengths_summary: "La qualité du service et l'amabilité de l'équipe sont plébiscitées par la majorité des clients."
};

export const INITIAL_WORKFLOWS: WorkflowRule[] = [
  {
    id: 'wf1',
    name: 'Réponse Auto 5 étoiles',
    enabled: true,
    trigger: 'review_created',
    conditions: [
      { id: 'c1', field: 'rating', operator: 'equals', value: 5 },
      { id: 'c2', field: 'source', operator: 'equals', value: 'google' }
    ],
    actions: [
      { id: 'a1', type: 'generate_ai_reply', config: { tone: 'enthusiastic' } },
      { id: 'a2', type: 'auto_reply', config: { delay_minutes: 15 } }
    ]
  }
];

export const INITIAL_REPORTS: ReportConfig[] = [
  {
    id: 'rep1',
    name: 'Rapport Mensuel Activité',
    format: 'pdf',
    frequency: 'monthly',
    time: '08:00',
    enabled: true,
    last_sent: '2023-10-01'
  }
];

export const db = {};
