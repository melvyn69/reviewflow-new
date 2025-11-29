// ... (Imports restent identiques sauf google)
import { supabase, isSupabaseConfigured } from './supabase';
import { 
  INITIAL_USERS, 
  INITIAL_ORG, 
  INITIAL_REVIEWS, 
  INITIAL_ANALYTICS, 
  INITIAL_WORKFLOWS,
  INITIAL_COMPETITORS
} from './db';
import { 
  User, 
  Review, 
  Organization, 
  AnalyticsSummary, 
  WorkflowRule, 
  ReviewStatus,
  Location,
  Competitor,
  AppNotification,
  BrandSettings,
  Customer
} from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai'; // CHANGED IMPORT

// ... (evaluateCondition function remains same)

export const api = {
  // ... (auth and reviews objects remain same) ...

  ai: {
      generateReply: async (review: Review, options: any) => {
          const org = await api.organization.get();
          // ... (usage checks remain same) ...

          const genAI = new GoogleGenerativeAI(process.env.API_KEY || ''); // CHANGED INSTANCE
          const model = genAI.getGenerativeModel({ model: "gemini-pro"}); // CHANGED MODEL CALL

          const brand: BrandSettings = org?.brand || { 
            tone: 'professionnel', 
            description: '', 
            knowledge_base: '',
            use_emojis: false,
            language_style: 'formal',
            signature: ''
          };
          const industry = org?.industry || 'other';

          const knowledgeBaseContext = brand.knowledge_base 
            ? `\n\n[BASE DE CONNAISSANCE]:\n${brand.knowledge_base}`
            : '';

          const prompt = `
            Tu es un expert en relation client pour une entreprise de type "${industry}".
            
            [IDENTITÉ]
            - Ton: ${options.tone || brand.tone}
            - Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}
            - Emojis: ${brand.use_emojis ? 'Oui' : 'Non'}
            ${knowledgeBaseContext}

            Rédige une réponse empathique, sans être robotique.
            Longueur: ${options.length || 'medium'}.
            Langue: Français.

            Avis client (${review.rating}/5) de ${review.author_name}: "${review.body}"
          `;

          const result = await model.generateContent(prompt);
          return result.response.text();
      },
      generateSocialPost: async (review: Review, platform: 'instagram' | 'linkedin') => {
          const genAI = new GoogleGenerativeAI(process.env.API_KEY || '');
          const model = genAI.getGenerativeModel({ model: "gemini-pro"});

          const prompt = `
            Transforme cet avis client positif en un post pour les réseaux sociaux (${platform}).
            
            Avis: "${review.body}" par ${review.author_name} (${review.rating}/5).
            
            Le but est de remercier le client et de montrer notre qualité de service.
            Utilise des emojis et des hashtags pertinents.
            Ton: Enthousiaste et reconnaissant.
            
            Format: Texte complet du post uniquement.
          `;
          
          const result = await model.generateContent(prompt);
          return result.response.text();
      },
      runCustomTask: async (payload: any) => {
          const genAI = new GoogleGenerativeAI(process.env.API_KEY || '');
          const model = genAI.getGenerativeModel({ model: "gemini-pro"});
          
          // Gemini Pro doesn't support JSON mode strictly in early versions like flash, using standard prompt for demo
          const prompt = JSON.stringify(payload);
          const result = await model.generateContent(prompt);
          return JSON.parse(result.response.text());
      }
  },

  // ... (rest of the file remains identical)
  analytics: { ...api.analytics },
  competitors: { ...api.competitors },
  social: { ...api.social },
  automation: { ...api.automation },
  notifications: { ...api.notifications },
  organization: { ...api.organization },
  locations: { ...api.locations },
  team: { ...api.team },
  billing: { ...api.billing },
  onboarding: { ...api.onboarding },
  activity: { ...api.activity },
  seedCloudDatabase: api.seedCloudDatabase, // Already defined above
  public: { ...api.public },
  customers: { ...api.customers },
  admin: { ...api.admin }
};