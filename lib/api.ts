
import { supabase, isSupabaseConfigured } from './supabase';
import { 
  INITIAL_ORG, 
  INITIAL_ANALYTICS, 
} from './db';
import { 
  User, 
  Review, 
  Organization, 
  WorkflowRule, 
  BrandSettings,
  Customer,
  Location,
  AnalyticsSummary,
  Competitor
} from '../types';
import { GoogleGenAI } from '@google/genai';

// --- SERVICE HELPER ---

const requireSupabase = () => {
  if (!isSupabaseConfigured()) {
    throw new Error("La base de données n'est pas connectée.");
  }
  return supabase!;
};

// --- SERVICES ---

const authService = {
    getUser: async (): Promise<User | null> => {
      if (!isSupabaseConfigured()) return null;
      
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase!.from('users').select('*').eq('id', user.id).single();
      
      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata.full_name || 'Utilisateur',
        avatar: user.user_metadata.avatar_url,
        role: profile?.role || 'viewer',
        organizations: profile?.organization_id ? [profile.organization_id] : [],
        organization_id: profile?.organization_id
      };
    },
    login: async (email: string, password: string) => {
      const db = requireSupabase();
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    register: async (name: string, email: string, password: string) => {
        const db = requireSupabase();
        const { data: authData, error: authError } = await db.auth.signUp({ 
            email, 
            password, 
            options: { data: { full_name: name } } 
        });
        if (authError) throw authError;
    },
    updateProfile: async (data: { name?: string, email?: string, password?: string, role?: string }) => {
        const db = requireSupabase();
        const updates: any = {};
        if (data.email) updates.email = data.email;
        if (data.password) updates.password = data.password;
        if (data.name) updates.data = { full_name: data.name };

        const { error } = await db.auth.updateUser(updates);
        if (error) throw error;
        
        const { data: { user } } = await db.auth.getUser();
        if (user) {
            const profileUpdates: any = {};
            if (data.name) profileUpdates.full_name = data.name;
            if (data.role) profileUpdates.role = data.role;
            await db.from('users').update(profileUpdates).eq('id', user.id);
        }
        return true;
    },
    logout: async () => {
        if (isSupabaseConfigured()) { await supabase!.auth.signOut(); }
    },
    resetPassword: async (email: string) => {
        if (isSupabaseConfigured()) { 
            await supabase!.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/#reset-callback' }); 
        }
        return true;
    },
    loginWithGoogle: async () => {
        const db = requireSupabase();
        const { error } = await db.auth.signInWithOAuth({
            provider: 'google',
            options: { 
                redirectTo: window.location.origin, 
                queryParams: { access_type: 'offline', prompt: 'consent' } 
            }
        });
        if (error) throw error;
    },
    connectGoogleBusiness: async () => {
        const db = requireSupabase();
        // Force 'access_type=offline' et 'prompt=consent' pour obtenir le refresh_token indispensable pour l'accès offline/cron
        // Redirect to /settings so the user lands back where they started
        const { error } = await db.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/settings', 
                scopes: 'https://www.googleapis.com/auth/business.manage', 
                queryParams: { access_type: 'offline', prompt: 'consent' }
            }
        });
        if (error) throw error;
    }
};

const companyService = {
    search: async (query: string) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!query || query.length < 3) return [];
        return [
            { siret: "12345678900012", legal_name: "SAS EXEMPLE RESTO", address: "Paris", vat: "FR12", industry: "restaurant" }
        ].filter(c => c.legal_name.toLowerCase().includes(query.toLowerCase()));
    }
};

const organizationService = {
      get: async (): Promise<Organization | null> => {
          if (!isSupabaseConfigured()) return null;
          try {
              const { data: { user } } = await supabase!.auth.getUser();
              if (!user) return null;
              const { data: profile } = await supabase!.from('users').select('organization_id').eq('id', user.id).single();
              if (!profile?.organization_id) return organizationService.createDefault(user.id);

              const { data: org, error } = await supabase!.from('organizations').select('*').eq('id', profile.organization_id).single();
              if (error || !org) return organizationService.createDefault(user.id);

              const { data: locations } = await supabase!.from('locations').select('*').eq('organization_id', profile.organization_id);

              return { 
                  ...INITIAL_ORG, 
                  ...org, 
                  brand: org.brand || INITIAL_ORG.brand,
                  integrations: org.integrations || INITIAL_ORG.integrations,
                  saved_replies: org.saved_replies || [],
                  workflows: org.workflows || [], 
                  notification_settings: org.notification_settings || INITIAL_ORG.notification_settings,
                  locations: locations || [] 
              } as Organization;
          } catch (e) { return null; }
      },
      createDefault: async (userId: string): Promise<Organization | null> => {
          try {
              const db = requireSupabase();
              const { data: org, error: orgError } = await db.from('organizations').insert({
                  name: 'Ma Société',
                  subscription_plan: 'free',
                  industry: 'other'
              }).select().single();
              if (orgError) throw orgError;

              await db.from('locations').insert({ organization_id: org.id, name: 'Siège Principal', city: 'Paris', country: 'France' });
              await db.from('users').update({ organization_id: org.id, role: 'admin' }).eq('id', userId);
              return await organizationService.get();
          } catch (e) { return null; }
      },
      update: async (data: Partial<Organization>) => {
          const user = await authService.getUser();
          if (user?.organization_id) {
              const { error } = await requireSupabase().from('organizations').update(data).eq('id', user.organization_id);
              if (error) throw error;
          }
          return INITIAL_ORG;
      },
      saveGoogleTokens: async () => {
          console.log("🔐 Vérification du Refresh Token Google...");
          const { data } = await supabase!.auth.getSession();
          const refreshToken = data.session?.provider_refresh_token;
          
          if (refreshToken) {
              console.log("✅ Token trouvé ! Sauvegarde en cours...");
              const user = await authService.getUser();
              if (user?.organization_id) {
                  const { data: currentOrg } = await requireSupabase()
                      .from('organizations')
                      .select('integrations')
                      .eq('id', user.organization_id)
                      .single();
                  
                  const currentIntegrations = currentOrg?.integrations || {};
                  
                  const { error } = await requireSupabase().from('organizations').update({ 
                      google_refresh_token: refreshToken,
                      integrations: { ...currentIntegrations, google: true }
                  }).eq('id', user.organization_id);
                  
                  if (error) {
                      console.error("❌ Erreur sauvegarde token:", error);
                      return false;
                  }
                  return true;
              }
          }
          return false;
      },
      simulatePlanChange: async (plan: 'free' | 'starter' | 'pro') => {
          const user = await authService.getUser();
          if (user?.organization_id) {
              await requireSupabase().from('organizations').update({ subscription_plan: plan }).eq('id', user.organization_id);
          }
          return true;
      }
};

const reviewsService = {
      list: async (filters: any): Promise<Review[]> => {
          let result: Review[] = [];
          if (isSupabaseConfigured()) {
            try {
                let query = supabase!.from('reviews').select('*').order('received_at', { ascending: false });
                
                if (filters.status && filters.status !== 'Tout') {
                    query = query.eq('status', filters.status.toLowerCase());
                }
                if (filters.source && filters.source !== 'Tout') {
                    query = query.eq('source', filters.source.toLowerCase());
                }
                if (filters.rating && filters.rating !== 'Tout') {
                    const ratingVal = typeof filters.rating === 'string' ? parseInt(filters.rating) : filters.rating;
                    if (!isNaN(ratingVal)) {
                        query = query.eq('rating', ratingVal);
                    }
                }
                if (filters.search) {
                    query = query.ilike('text', `%${filters.search}%`);
                }

                const { data, error } = await query;
                if (!error && data) {
                    result = data.map((r: any) => ({
                        ...r, 
                        body: r.text || r.body
                    })); 
                }
            } catch (e) { console.warn("DB Error", e); }
          }
          return result;
      },
      reply: async (id: string, text: string) => {
          await requireSupabase().from('reviews').update({ status: 'sent', posted_reply: text, replied_at: new Date().toISOString() }).eq('id', id);
          return true;
      },
      saveDraft: async (id: string, text: string) => {
          await requireSupabase().from('reviews').update({ status: 'draft', ai_reply: { text, needs_manual_validation: false } }).eq('id', id);
          return true;
      },
      addNote: async (id: string, text: string) => {
          const user = await authService.getUser();
          const newNote = { id: `n-${Date.now()}`, text, author_name: user?.name || 'Moi', created_at: new Date().toISOString() };
          const db = requireSupabase();
          const { data: review } = await db.from('reviews').select('internal_notes').eq('id', id).single();
          const notes = review?.internal_notes || [];
          await db.from('reviews').update({ internal_notes: [...notes, newNote] }).eq('id', id);
          return newNote;
      },
      uploadCsv: async (file: File, locationId: string) => { 
          const text = await file.text();
          const lines = text.split('\n').slice(1);
          let count = 0;
          for(const line of lines) {
              if(!line.trim()) continue;
              const [date, author, rating, comment] = line.split(',');
              if(rating && comment) {
                  await requireSupabase().from('reviews').insert({
                      location_id: locationId,
                      rating: parseInt(rating),
                      author_name: author || 'Anonyme',
                      text: comment,
                      received_at: new Date().toISOString(),
                      source: 'direct',
                      status: 'pending'
                  });
                  count++;
              }
          }
          return count;
      },
};

const googleService = {
    getToken: async () => {
        const { data } = await supabase!.auth.getSession();
        return data.session?.provider_token;
    },
    fetchAllGoogleLocations: async () => {
        const token = await googleService.getToken();
        if (!token) {
            throw new Error("Token Google introuvable. Veuillez reconnecter votre compte.");
        }
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch_google_locations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ accessToken: token })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Erreur récupération établissements");
        }
        return await response.json();
    },
    syncReviewsForLocation: async (locationId: string, googleLocationName: string) => {
        const user = await authService.getUser();
        if (!user?.organization_id) throw new Error("Organisation manquante");

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch_google_reviews`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                locationId,
                googleLocationName,
                organizationId: user.organization_id 
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Erreur de synchronisation backend");
        }
        const data = await response.json();
        return data.count;
    }
};

const aiService = {
      generateReply: async (review: Review, options: any) => {
          const apiKey = process.env.API_KEY; 
          if (!apiKey) throw new Error("Clé API manquante");
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: `Rédige une réponse à cet avis ${review.rating}/5: "${review.body}". Ton: ${options.tone}.`,
          });
          return response.text || "";
      },
      previewBrandVoice: async (brand: BrandSettings, mockReview: any) => { return "Réponse simulée par l'IA..."; },
      generateSocialPost: async (review: Review, platform: string) => { return `Super avis reçu ! ⭐⭐⭐⭐⭐ "${review.body}"`; },
      runCustomTask: async (payload: any) => { return { result: "ok" }; }
};

const automationService = {
      getWorkflows: async (): Promise<WorkflowRule[]> => {
          const org = await organizationService.get();
          if (org && (org as any).workflows) {
              return (org as any).workflows;
          }
          return [];
      },
      saveWorkflow: async (workflow: WorkflowRule) => {
          const org = await organizationService.get();
          if (!org) throw new Error("Organisation introuvable");
          
          let currentWorkflows = (org as any).workflows || [];
          const index = currentWorkflows.findIndex((w: WorkflowRule) => w.id === workflow.id);
          if (index >= 0) {
              currentWorkflows[index] = workflow;
          } else {
              currentWorkflows.push(workflow);
          }
          
          const { error } = await requireSupabase().from('organizations')
              .update({ workflows: currentWorkflows })
              .eq('id', org.id);
              
          if (error) throw error;
          return true;
      },
      deleteWorkflow: async (workflowId: string) => {
          const org = await organizationService.get();
          if (!org) throw new Error("Organisation introuvable");
          
          const currentWorkflows = (org as any).workflows || [];
          const newWorkflows = currentWorkflows.filter((w: WorkflowRule) => w.id !== workflowId);
          
          const { error } = await requireSupabase().from('organizations')
              .update({ workflows: newWorkflows })
              .eq('id', org.id);
              
          if (error) throw error;
          return true;
      },
      run: async () => {
          try {
             const { data: { session } } = await supabase!.auth.getSession();
             const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process_reviews`, {
                 method: 'POST',
                 headers: {
                     'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                     'Content-Type': 'application/json'
                 }
             });
             const data = await res.json();
             return { processed: data.processed || 0, actions: data.actions || 0, alerts: 0 };
          } catch (e) {
             console.error("Automation run error", e);
             return { processed: 0, actions: 0, alerts: 0 };
          }
      }
};

const locationsService = {
    create: async (data: any) => { 
        const user = await authService.getUser();
        if(user?.organization_id) {
            await requireSupabase().from('locations').insert({...data, organization_id: user.organization_id});
        }
        return true; 
    },
    update: async (id: string, data: any) => { 
        await requireSupabase().from('locations').update(data).eq('id', id);
        return true; 
    },
    delete: async (id: string) => { 
        await requireSupabase().from('locations').delete().eq('id', id);
        return true; 
    }
};

const analyticsService = {
    getOverview: async (period: string = '30j'): Promise<AnalyticsSummary> => {
        if (!isSupabaseConfigured()) return INITIAL_ANALYTICS;

        try {
            const user = await authService.getUser();
            if (!user?.organization_id) return INITIAL_ANALYTICS;

            // 1. Get Location IDs
            const { data: locations } = await supabase!.from('locations').select('id').eq('organization_id', user.organization_id);
            const locationIds = locations?.map(l => l.id) || [];

            if (locationIds.length === 0) return { ...INITIAL_ANALYTICS, total_reviews: 0 };

            // 2. Fetch Reviews with basic filtering
            let query = supabase!
                .from('reviews')
                .select('rating, status, received_at, source, analysis')
                .in('location_id', locationIds);

            // Date filtering
            const now = new Date();
            let startDate = new Date();
            if (period === '7j') startDate.setDate(now.getDate() - 7);
            else if (period === '30j') startDate.setDate(now.getDate() - 30);
            else if (period === 'Trimestre') startDate.setDate(now.getDate() - 90);
            else startDate.setDate(now.getDate() - 365); // Default year

            query = query.gte('received_at', startDate.toISOString());

            const { data: reviews, error } = await query;
            
            if (error || !reviews || reviews.length === 0) {
                return { ...INITIAL_ANALYTICS, total_reviews: 0, period };
            }

            // 3. Calculate Real KPIs
            const total = reviews.length;
            const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / total;
            
            // Sentiment & NPS
            let positive = 0, neutral = 0, negative = 0;
            let promoters = 0, detractors = 0;
            let responded = 0;

            reviews.forEach(r => {
                // Sentiment
                if (r.rating >= 4) positive++;
                else if (r.rating === 3) neutral++;
                else negative++;

                // NPS (5 = Promoter, 4 = Passive, 1-3 = Detractor)
                if (r.rating === 5) promoters++;
                else if (r.rating <= 3) detractors++;

                // Response Rate
                if (r.status === 'sent' || r.status === 'manual') responded++;
            });

            const nps = Math.round(((promoters - detractors) / total) * 100);
            const responseRate = Math.round((responded / total) * 100);

            // 4. Group by Date (Histogram)
            const volumeByDate: Record<string, number> = {};
            reviews.forEach(r => {
                const dateKey = new Date(r.received_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
                volumeByDate[dateKey] = (volumeByDate[dateKey] || 0) + 1;
            });
            const chartData = Object.entries(volumeByDate)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(-14); // Last 14 points

            return {
                period,
                total_reviews: total,
                average_rating: parseFloat(avgRating.toFixed(1)),
                response_rate: responseRate,
                nps_score: nps,
                global_rating: parseFloat(avgRating.toFixed(1)),
                sentiment_distribution: {
                    positive: positive / total,
                    neutral: neutral / total,
                    negative: negative / total
                },
                volume_by_date: chartData,
                // Static for now, as real extraction needs complex SQL or AI batching
                top_themes_positive: [
                    { name: 'service', weight: 0.8 },
                    { name: 'qualité', weight: 0.7 }
                ],
                top_themes_negative: [
                    { name: 'attente', weight: 0.5 }
                ],
                top_keywords: [
                    { keyword: "merci", count: positive },
                    { keyword: "problème", count: negative }
                ],
                problems_summary: negative > 0 ? "Attention aux notes inférieures à 3 étoiles récentes." : "Aucun problème majeur détecté.",
                strengths_summary: "La majorité des clients sont satisfaits (Note > 4)."
            };

        } catch (e) {
            console.error("Analytics Error", e);
            return { ...INITIAL_ANALYTICS, total_reviews: 0 };
        }
    }
};

const teamService = {
    list: async () => [],
    invite: async (email: string, role: string) => true,
    remove: async (id: string) => true
};

// --- COMPETITORS SERVICE ENHANCED ---
const competitorsService = {
    list: async (): Promise<Competitor[]> => {
        // Return tracked competitors from DB or LocalStorage for now
        // In a real app, this would fetch from 'competitors' table
        const saved = localStorage.getItem('tracked_competitors');
        return saved ? JSON.parse(saved) : [
            {
                id: 'c1', name: 'Le Concurrent A', rating: 4.2, review_count: 320, address: '500m - Centre Ville',
                strengths: ['Prix', 'Emplacement'], weaknesses: ['Service', 'Bruit']
            }
        ];
    },
    create: async (c: any) => {
        const current = await competitorsService.list();
        const newComp = { ...c, id: `comp-${Date.now()}` };
        localStorage.setItem('tracked_competitors', JSON.stringify([...current, newComp]));
        return true;
    },
    delete: async (id: string) => {
        const current = await competitorsService.list();
        const filtered = current.filter(c => c.id !== id);
        localStorage.setItem('tracked_competitors', JSON.stringify(filtered));
        return true;
    },
    autoDiscover: async (radius: number, sector: string): Promise<any[]> => {
        // Mock Google Places API behavior
        // In prod, this would call a Supabase Edge Function to query Google Maps
        await new Promise(r => setTimeout(r, 2000)); // Simulate radar scan delay
        
        return [
            { 
                name: "Brasserie du Coin", 
                distance: "300m", 
                rating: 4.5, 
                review_count: 1250, 
                estimated_revenue: "1.2M€",
                strengths: ["Terrasse", "Happy Hour"],
                weaknesses: ["Service Lent"],
                threat_level: 85 // High threat
            },
            { 
                name: "Pizza Express", 
                distance: "800m", 
                rating: 3.9, 
                review_count: 450, 
                estimated_revenue: "450K€",
                strengths: ["Prix bas", "Vitesse"],
                weaknesses: ["Qualité produits"],
                threat_level: 40 // Low threat
            },
            { 
                name: "Sushi World", 
                distance: "1.2km", 
                rating: 4.8, 
                review_count: 89, 
                estimated_revenue: "N/A",
                strengths: ["Fraîcheur", "Originalité"],
                weaknesses: ["Prix élevés"],
                threat_level: 60 // Medium threat
            }
        ];
    },
    getDeepAnalysis: async (): Promise<any> => {
        // Mock AI aggregated analysis
        await new Promise(r => setTimeout(r, 3000)); // Simulate expensive AI computation
        return {
            trends: [
                "Les clients de la zone se plaignent de plus en plus du temps d'attente le midi.",
                "La demande pour les options végétariennes a augmenté de 40% ce trimestre.",
                "Votre concurrent 'Brasserie du Coin' a augmenté ses prix de 10% récemment."
            ],
            swot: {
                strengths: ["Votre note moyenne (4.8) est supérieure au marché (4.2)", "Vos avis citent souvent l'accueil chaleureux"],
                weaknesses: ["Vous avez moins d'avis photos que la moyenne", "Visibilité faible le soir"],
                opportunities: ["Lancer une offre Happy Hour pour contrer 'Brasserie du Coin'", "Mettre en avant vos produits locaux"],
                threats: ["Arrivée d'une nouvelle franchise à 500m", "Baisse globale de la fréquentation le lundi"]
            },
            competitors_detailed: [
                { name: "Brasserie du Coin", last_month_growth: "+5%", sentiment_trend: "Négatif", top_complaint: "Prix", rating: 4.5 },
                { name: "Pizza Express", last_month_growth: "-2%", sentiment_trend: "Stable", top_complaint: "Qualité", rating: 3.9 }
            ]
        };
    }
};

const customersService = {
    list: async () => []
};

const adminService = {
    getStats: async () => ({ mrr: "0€", active_tenants: 0, total_reviews_processed: 0, tenants: [] }),
    resetAccount: async () => true
};

const socialService = {
    publish: async (platform: string, content: string) => true
};

const notificationsService = {
    list: async () => [],
    markAllRead: async () => true,
    sendTestEmail: async () => true
};

const onboardingService = {
    checkStatus: async () => ({ googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false, completionPercentage: 0 })
};

const activityService = {
    getRecent: async () => []
};

const billingService = {
    createCheckoutSession: async (plan: string) => "",
    createPortalSession: async () => "",
    getInvoices: async () => []
};

const seedCloudDatabase = async () => true;

export const api = {
    auth: authService,
    company: companyService,
    organization: organizationService,
    reviews: reviewsService,
    ai: aiService,
    automation: automationService,
    locations: locationsService,
    analytics: analyticsService,
    customers: customersService,
    admin: adminService,
    social: socialService,
    notifications: notificationsService,
    onboarding: onboardingService,
    activity: activityService,
    team: teamService,
    competitors: competitorsService,
    billing: billingService,
    seedCloudDatabase,
    public: { 
        getLocationInfo: async (id: string) => null, 
        getWidgetReviews: async (id: string) => [], 
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: string, tags: string[]) => true 
    },
    google: googleService
};
