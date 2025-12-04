
import { supabase, isSupabaseConfigured } from './supabase';
import { 
  INITIAL_ORG, 
  INITIAL_REVIEWS, 
  INITIAL_ANALYTICS, 
  INITIAL_COMPETITORS
} from './db';
import { 
  User, 
  Review, 
  Organization, 
  WorkflowRule, 
  ReviewStatus,
  BrandSettings,
  Customer,
  AppNotification,
  Competitor,
  SetupStatus,
  Location,
  AnalyticsSummary
} from '../types';
import { GoogleGenAI } from '@google/genai';

// --- SERVICE HELPER ---

const requireSupabase = () => {
  if (!isSupabaseConfigured()) {
    throw new Error("La base de données n'est pas connectée. Veuillez configurer les variables d'environnement Vercel.");
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
        
        // Mettre à jour la table public.users
        const { data: { user } } = await db.auth.getUser();
        if (user) {
            const profileUpdates: any = {};
            if (data.name) profileUpdates.full_name = data.name;
            if (data.role) profileUpdates.role = data.role; // Allow role simulation
            
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
        const { error } = await db.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.href, 
                scopes: 'https://www.googleapis.com/auth/business.manage', 
                queryParams: {
                    access_type: 'offline', 
                    prompt: 'consent'
                }
            }
        });
        if (error) throw error;
    }
};

const companyService = {
    // Simulation d'une API type "Pappers" ou "Societe.com"
    search: async (query: string) => {
        console.log("Searching company registry for:", query);
        await new Promise(resolve => setTimeout(resolve, 800)); // Fake latency

        // Mock results
        if (!query || query.length < 3) return [];
        
        const mockDb = [
            {
                siret: "123 456 789 00012",
                legal_name: "SAS RESTAURANT DU PARC",
                address: "12 Avenue des Champs, 75008 Paris",
                vat: "FR12123456789",
                industry: "restaurant"
            },
            {
                siret: "987 654 321 00034",
                legal_name: "SARL LE GOURMET RAPIDE",
                address: "45 Rue de la République, 69002 Lyon",
                vat: "FR98987654321",
                industry: "restaurant"
            },
            {
                siret: "456 789 123 00056",
                legal_name: "EURL GARAGE DES LILAS",
                address: "8 Impasse des Fleurs, 33000 Bordeaux",
                vat: "FR456789123",
                industry: "automotive"
            },
            {
                siret: "321 654 987 00089",
                legal_name: "SCP AVOCATS ASSOCIES",
                address: "2 Place du Palais, 13001 Marseille",
                vat: "FR321654987",
                industry: "legal"
            }
        ];

        return mockDb.filter(c => 
            c.legal_name.toLowerCase().includes(query.toLowerCase()) || 
            c.siret.includes(query)
        );
    }
};

const organizationService = {
      get: async (): Promise<Organization | null> => {
          if (!isSupabaseConfigured()) return null;

          try {
              const { data: { user } } = await supabase!.auth.getUser();
              if (!user) return null;

              const { data: profile } = await supabase!.from('users').select('organization_id').eq('id', user.id).single();
              
              if (!profile?.organization_id) {
                  return await organizationService.createDefault(user.id);
              }

              const { data: org, error } = await supabase!.from('organizations').select('*').eq('id', profile.organization_id).single();
              
              if (error || !org) {
                   return await organizationService.createDefault(user.id);
              }

              const { data: locations } = await supabase!.from('locations').select('*').eq('organization_id', profile.organization_id);

              return { 
                  ...INITIAL_ORG, 
                  ...org, 
                  brand: org.brand || INITIAL_ORG.brand,
                  integrations: org.integrations || INITIAL_ORG.integrations,
                  saved_replies: org.saved_replies || [],
                  workflows: org.workflows || [], 
                  notification_settings: org.notification_settings || {
                      email_alerts: true,
                      alert_threshold: 3,
                      weekly_digest: true,
                      digest_day: 'monday',
                      marketing_emails: false
                  },
                  locations: locations || [] 
              } as Organization;
          } catch (e) { 
              console.error("Error fetching organization", e);
              return null; 
          }
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

              await db.from('locations').insert({
                  organization_id: org.id,
                  name: 'Siège Principal',
                  city: 'Paris',
                  country: 'France',
                  connection_status: 'disconnected'
              });

              await db.from('users').update({
                  organization_id: org.id,
                  role: 'admin'
              }).eq('id', userId);

              return await organizationService.get();

          } catch (e) {
              console.error("Critical error creating default org:", e);
              return null;
          }
      },
      update: async (data: Partial<Organization>) => {
          const user = await authService.getUser();
          if (user?.organization_id) {
              const { error } = await requireSupabase().from('organizations').update(data).eq('id', user.organization_id);
              if (error) throw error;
          }
          return INITIAL_ORG;
      },
      // Force plan update for demo purposes
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
                
                if (filters.status && filters.status !== 'Tout') query = query.eq('status', filters.status.toLowerCase());
                if (filters.source && filters.source !== 'Tout') query = query.eq('source', filters.source.toLowerCase());
                if (filters.rating && filters.rating !== 'Tout') query = query.eq('rating', parseInt(filters.rating));
                
                const { data, error } = await query;
                if (!error && data) {
                    result = data.map((r: any) => {
                        const bodyContent = r.text || r.body || '';
                        const analysis = r.analysis || { sentiment: 'neutral', themes: [], keywords: [], flags: {} };
                        if ((!analysis.keywords || analysis.keywords.length === 0) && analysis.themes && analysis.themes.length > 0) {
                            analysis.keywords = analysis.themes;
                        }

                        return {
                            ...r, 
                            body: bodyContent,
                            internal_notes: r.internal_notes || [], 
                            analysis: analysis
                        };
                    });
                }
            } catch (e) {
                console.warn("DB Fetch Error", e);
            }
          }

          if (filters.search) {
              const q = filters.search.toLowerCase();
              result = result.filter(r => r.body?.toLowerCase().includes(q) || r.author_name?.toLowerCase().includes(q));
          }
          
          return result;
      },
      reply: async (id: string, text: string) => {
          const { error } = await requireSupabase().from('reviews').update({ status: 'sent', posted_reply: text, replied_at: new Date().toISOString() }).eq('id', id);
          if (error) throw error;
          return true;
      },
      saveDraft: async (id: string, text: string) => {
          const { error } = await requireSupabase().from('reviews').update({ 
              status: 'draft', 
              ai_reply: { text, needs_manual_validation: false, created_at: new Date().toISOString() } 
          }).eq('id', id);
          if (error) throw error;
          return true;
      },
      updateStatus: async (id: string, status: ReviewStatus) => {
          await requireSupabase().from('reviews').update({ status }).eq('id', id);
          return true; 
      },
      addNote: async (id: string, text: string) => {
          const user = await authService.getUser();
          const newNote = { 
              id: `n-${Date.now()}`, 
              text, 
              author_name: user?.name || 'Moi', 
              created_at: new Date().toISOString() 
          };
          
          const db = requireSupabase();
          const { data: review } = await db.from('reviews').select('internal_notes').eq('id', id).single();
          const notes = review?.internal_notes || [];
          
          const { error } = await db.from('reviews').update({ internal_notes: [...notes, newNote] }).eq('id', id);
          if (error) throw error;

          return newNote;
      },
      uploadCsv: async (file: File, locationId: string) => {
          return new Promise<number>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = async (e) => {
                  const text = e.target?.result as string;
                  if (!text) return reject("Fichier vide");
                  
                  // Simple CSV Parser (Header expected: Date,Author,Rating,Comment,Source)
                  const lines = text.split('\n').slice(1); // Skip header
                  const parsedReviews = [];
                  
                  for (const line of lines) {
                      if (!line.trim()) continue;
                      const cols = line.split(','); 
                      if (cols.length >= 3) {
                          const date = cols[0] ? new Date(cols[0]).toISOString() : new Date().toISOString();
                          const author = cols[1] || 'Anonyme';
                          const rating = parseInt(cols[2]) || 5;
                          const body = cols.slice(3).join(',').replace(/^"|"$/g, '').trim(); 
                          
                          parsedReviews.push({
                              received_at: date,
                              author_name: author,
                              rating: rating,
                              text: body,
                              source: 'direct' 
                          });
                      }
                  }
                  
                  if (parsedReviews.length > 0) {
                      try {
                          const db = requireSupabase();
                          const formattedData = parsedReviews.map(r => ({
                              location_id: locationId,
                              source: r.source,
                              rating: r.rating,
                              author_name: r.author_name,
                              text: r.text,
                              language: 'fr',
                              received_at: r.received_at,
                              status: 'manual', 
                              analysis: { sentiment: 'neutral', themes: [], keywords: [], flags: { hygiene: false, security: false } }
                          }));
                          
                          const { error } = await db.from('reviews').insert(formattedData);
                          if (error) throw error;
                          resolve(parsedReviews.length);
                      } catch(err) {
                          reject(err);
                      }
                  } else {
                      resolve(0);
                  }
              };
              reader.readAsText(file);
          });
      },
      importBulk: async (data: any[], locationId: string) => {
          const db = requireSupabase();
          const formattedData = data.map(r => ({
              location_id: locationId,
              source: r.source?.toLowerCase() || 'google',
              rating: parseInt(r.rating) || 5,
              author_name: r.author_name || 'Anonyme',
              text: r.text || r.body || '',
              language: 'fr',
              received_at: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
              status: 'pending',
              analysis: {
                  sentiment: 'neutral',
                  themes: [],
                  keywords: [],
                  flags: { hygiene: false, security: false }
              }
          }));
          const { error } = await db.from('reviews').insert(formattedData);
          if (error) throw error;
          return data.length;
      }
};

const googleService = {
    getToken: async () => {
        const { data } = await supabase!.auth.getSession();
        return data.session?.provider_token;
    },
    listAccounts: async () => {
        const token = await googleService.getToken();
        if (!token) throw new Error("Session Google expirée. Veuillez vous reconnecter via le bouton 'Sign in with Google'.");
        
        const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            console.error(await res.text());
            throw new Error("Impossible de récupérer les comptes Google. Vérifiez vos accès.");
        }
        const data = await res.json();
        return data.accounts || [];
    },
    listLocations: async (accountName: string) => {
        const token = await googleService.getToken();
        if (!token) throw new Error("Token manquant");
        
        const res = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storeCode,metadata`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Erreur GMB Locations: " + res.statusText);
        const data = await res.json();
        return data.locations || [];
    },
    fetchAllGoogleLocations: async () => {
        try {
            const accounts = await googleService.listAccounts();
            let allLocs: any[] = [];
            for (const acc of accounts) {
                const locs = await googleService.listLocations(acc.name);
                const enriched = locs.map((l:any) => ({...l, accountName: acc.name}));
                allLocs = [...allLocs, ...enriched];
            }
            return allLocs;
        } catch (e) {
            console.error(e);
            throw e;
        }
    },
    fetchReviews: async (locationName: string) => {
        const token = await googleService.getToken();
        if (!token) throw new Error("Token manquant");
        
        const res = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/reviews`, {
             headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Erreur GMB Reviews: " + res.statusText);
        const data = await res.json();
        return data.reviews || [];
    },
    syncReviewsForLocation: async (locationId: string, googleLocationName: string) => {
        const reviews = await googleService.fetchReviews(googleLocationName);
        if (!reviews || !reviews.length) return 0;
        
        const db = requireSupabase();
        
        let count = 0;
        for (const r of reviews) {
            const receivedAt = r.createTime || new Date().toISOString();
            const author = r.reviewer?.displayName || 'Anonyme';
            const ratingMap: any = { "ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5, "STAR_RATING_UNSPECIFIED": 0 };
            const rating = ratingMap[r.starRating] || 0;
            const text = r.comment || '';

            const { data: existing } = await db.from('reviews')
                .select('id')
                .eq('location_id', locationId)
                .eq('received_at', receivedAt)
                .eq('author_name', author)
                .single();
            
            if (!existing) {
                await db.from('reviews').insert({
                    location_id: locationId,
                    source: 'google',
                    rating: rating,
                    text: text,
                    author_name: author,
                    received_at: receivedAt,
                    status: 'pending',
                    language: 'fr', // Default
                    analysis: { 
                        sentiment: 'neutral', 
                        themes: [], 
                        keywords: [], 
                        flags: { hygiene: false, security: false } 
                    }
                });
                count++;
            }
        }
        return count;
    }
};

const aiService = {
      generateReply: async (review: Review, options: any) => {
          const apiKey = process.env.API_KEY; 
          
          if (!apiKey) {
             throw new Error("Clé API Google Gemini manquante (process.env.API_KEY).");
          }

          try {
              const org = await organizationService.get(); 
              const brand: BrandSettings = org?.brand || { tone: 'professionnel', description: '', knowledge_base: '', use_emojis: false, language_style: 'formal', signature: '' };
              const industry = org?.industry || 'other';
              const knowledgeBaseContext = brand.knowledge_base ? `\n\n[INFO CONTEXTE ENTREPRISE]:\n${brand.knowledge_base}` : '';

              const prompt = `
                Tu es le gestionnaire des avis pour une entreprise de type "${industry}".
                
                [IDENTITÉ DE MARQUE]
                - Ton: ${options.tone || brand.tone}
                - Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}.
                - Emojis: ${brand.use_emojis ? 'Oui, modérément' : 'Non'}
                - Longueur: ${options.length || 'Moyenne (2-3 phrases)'}
                ${knowledgeBaseContext}

                [TÂCHE]
                Rédige une réponse professionnelle et empathique à cet avis.
                Ne mets PAS de guillemets autour de la réponse.
                
                [AVIS CLIENT]
                Note: ${review.rating}/5
                Auteur: ${review.author_name}
                Commentaire: "${review.body}"
              `;

              const ai = new GoogleGenAI({ apiKey });
              const response = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: prompt,
              });

              const text = response.text || "";

              if (isSupabaseConfigured() && org) {
                  await supabase!.from('organizations').update({ ai_usage_count: (org.ai_usage_count || 0) + 1 }).eq('id', org.id);
              }

              return text;

          } catch (e: any) {
              console.error("Erreur IA:", e);
              throw new Error(e.message || "Erreur lors de la génération IA.");
          }
      },
      previewBrandVoice: async (brand: BrandSettings, mockReview: any) => {
          const apiKey = process.env.API_KEY; 
          if (!apiKey) throw new Error("Clé API Google Gemini manquante.");

          try {
              const knowledgeBaseContext = brand.knowledge_base ? `\n\n[INFO CONTEXTE ENTREPRISE]:\n${brand.knowledge_base}` : '';
              
              const prompt = `
                Tu es le gestionnaire des avis client.
                
                [PARAMÈTRES DE MARQUE À TESTER]
                - Ton: ${brand.tone || 'Neutre'}
                - Style: ${brand.language_style === 'casual' ? 'Tutoiement' : 'Vouvoiement'}.
                - Emojis: ${brand.use_emojis ? 'Oui, modérément' : 'Non'}
                ${knowledgeBaseContext}

                [TÂCHE]
                Rédige une réponse TEST à cet avis fictif pour montrer ton style.
                Ne mets PAS de guillemets.
                
                [AVIS FICTIF]
                Note: ${mockReview.rating}/5
                Commentaire: "${mockReview.body}"
              `;

              const ai = new GoogleGenAI({ apiKey });
              const response = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: prompt,
              });

              return response.text || "";
          } catch (e: any) {
              throw new Error(e.message || "Erreur simulation IA");
          }
      },
      generateSocialPost: async (review: Review, platform: 'instagram' | 'linkedin' | 'facebook') => {
          const apiKey = process.env.API_KEY;
          if (!apiKey) return "Clé manquante";
          const ai = new GoogleGenAI({ apiKey });
          
          try {
              const response = await ai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: `Rédige un post court et engageant pour ${platform} (avec emojis et hashtags) pour mettre en avant cet avis client positif : "${review.body}".`
              });
              return response.text || "";
          } catch (e) {
              return "Erreur génération post social.";
          }
      },
      runCustomTask: async (payload: any) => {
          const apiKey = process.env.API_KEY;
          if (!apiKey) return { error: "Clé manquante" };
          const ai = new GoogleGenAI({ apiKey });
          
          try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: JSON.stringify(payload)
            });
            return { result: response.text };
          } catch (e: any) {
             return { error: e.message };
          }
      }
};

const automationService = {
      getWorkflows: async (): Promise<WorkflowRule[]> => {
          const org = await organizationService.get();
          if (org && (org as any).workflows) {
              return (org as any).workflows;
          }
          return [];
      },
      create: async (workflow: WorkflowRule) => {
          const org = await organizationService.get();
          if (org) {
               const currentWorkflows = (org as any).workflows || [];
               const newWorkflows = [...currentWorkflows, workflow];
               const { error } = await requireSupabase().from('organizations').update({ workflows: newWorkflows }).eq('id', org.id);
               if (error) throw error;
               return true;
          }
          return false;
      },
      run: async () => {
          try {
             const res = await fetch('/api/cron', { method: 'GET' });
             const data = await res.json();
             return { processed: data.processed?.length || 0, actions: 0, alerts: 0 };
          } catch (e) {
             return { processed: 0, actions: 0, alerts: 0 };
          }
      }
};

const locationsService = {
    create: async (data: any) => {
        const user = await authService.getUser();
        if (user?.organization_id) {
            const { error } = await requireSupabase().from('locations').insert({
                organization_id: user.organization_id,
                name: data.name,
                address: data.address,
                city: data.city,
                country: data.country || 'France',
                phone: data.phone,
                website: data.website,
                google_review_url: data.google_review_url,
                description: data.description
            });
            if (error) throw error;
            return true;
        }
        throw new Error("Utilisateur sans organisation.");
    },
    update: async (id: string, data: Partial<Location>) => {
        const { error } = await requireSupabase().from('locations').update(data).eq('id', id);
        if (error) throw error;
        return true;
    },
    delete: async (id: string) => {
        const { error } = await requireSupabase().from('locations').delete().eq('id', id);
        if (error) throw error;
        return true;
    }
};

const teamService = {
    list: async (): Promise<User[]> => {
        const user = await authService.getUser();
        if(!user?.organization_id) return [];
        
        const { data: users, error } = await requireSupabase().from('users').select('*').eq('organization_id', user.organization_id);
        
        if(error) return [];
        
        return users.map((u: any) => ({
            id: u.id,
            email: u.email || 'user@reviewflow.com',
            name: u.full_name || u.email?.split('@')[0] || 'Membre',
            role: u.role || 'viewer',
            organizations: [u.organization_id],
            avatar: `https://ui-avatars.com/api/?name=${u.full_name || 'U'}&background=random`,
            status: 'active'
        }));
    },
    invite: async (email: string, role: string) => {
        console.log(`Inviting ${email} as ${role}`);
        try {
            await fetch('/api/send-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    subject: 'Invitation à rejoindre Reviewflow',
                    html: `
                        <h1>Vous avez été invité !</h1>
                        <p>Vous avez été invité à rejoindre l'espace de travail sur Reviewflow en tant que <strong>${role}</strong>.</p>
                        <p><a href="${window.location.origin}/register?invite=${btoa(email)}">Cliquez ici pour accepter l'invitation</a></p>
                    `
                })
            });
        } catch (e) {
            console.warn("Impossible d'envoyer l'email d'invitation", e);
        }
        return true;
    },
    remove: async (userId: string) => {
        const { error } = await requireSupabase().from('users').update({ organization_id: null }).eq('id', userId);
        if (error) throw error;
        return true;
    }
};

const competitorsService = {
    list: async (): Promise<Competitor[]> => {
        if (!isSupabaseConfigured()) return INITIAL_COMPETITORS;
        try {
            const { data, error } = await supabase!.from('competitors').select('*');
            if (error) throw error;
            if (data && data.length > 0) {
                return data.map(c => ({
                    ...c,
                    strengths: c.strengths || [],
                    weaknesses: c.weaknesses || []
                }));
            }
            return INITIAL_COMPETITORS; 
        } catch (e) {
            return INITIAL_COMPETITORS;
        }
    },
    create: async (competitor: Omit<Competitor, 'id'>) => {
        if (!isSupabaseConfigured()) {
            INITIAL_COMPETITORS.push({ ...competitor, id: `c-${Date.now()}` });
            return true;
        }
        try {
            const user = await authService.getUser();
            const { error } = await supabase!.from('competitors').insert({
                ...competitor,
                organization_id: user?.organization_id
            });
            if (error) throw error;
            return true;
        } catch (e) {
            INITIAL_COMPETITORS.push({ ...competitor, id: `c-${Date.now()}` });
            return true;
        }
    },
    delete: async (id: string) => {
        if (isSupabaseConfigured()) {
            try {
                await supabase!.from('competitors').delete().eq('id', id);
            } catch (e) { /* ignore */ }
        }
        const idx = INITIAL_COMPETITORS.findIndex(c => c.id === id);
        if (idx !== -1) INITIAL_COMPETITORS.splice(idx, 1);
        return true;
    },
    autoDiscover: async (radius: number = 5, sectorOverride?: string): Promise<any[]> => {
        const apiKey = process.env.API_KEY; 
        if (!apiKey) throw new Error("Clé API manquante pour l'auto-découverte.");

        const org = await organizationService.get();
        if (!org || org.locations.length === 0) throw new Error("Aucun établissement configuré.");

        const location = org.locations[0]; 
        const industry = sectorOverride || org.industry || 'commerce';
        const city = location.city || 'Paris';

        const prompt = `
            Trouve 5 concurrents directs réalistes pour un établissement de type "${industry}" situé à "${city}" dans un rayon de ${radius}km.
            Pour chaque concurrent, invente des données plausibles.
            Retourne UNIQUEMENT un tableau JSON strict :
            [
              {
                "name": "Nom",
                "rating": 4.5,
                "review_count": 150,
                "address": "Adresse",
                "strengths": ["Point fort 1", "Point fort 2"],
                "weaknesses": ["Faiblesse 1", "Faiblesse 2"],
                "threat_level": 85,
                "distance": "1.2 km",
                "estimated_revenue": "45k €/mois"
              }
            ]
        `;

        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });

            const text = response.text || "[]";
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const results = JSON.parse(cleanJson);
            return results;
        } catch (e: any) {
            throw new Error("Erreur IA lors de la découverte: " + e.message);
        }
    },
    getDeepAnalysis: async (): Promise<any> => {
        const apiKey = process.env.API_KEY;
        const comps = await competitorsService.list();
        const org = await organizationService.get();
        const industry = org?.industry || 'commerce';
        
        if (comps.length === 0) {
             return {
                trends: ["Ajoutez des concurrents pour générer une analyse."],
                swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
                competitors_detailed: []
            };
        }

        const competitorsNames = comps.map(c => c.name).join(', ');

        const prompt = `
            Tu es un expert en stratégie d'entreprise spécialisé dans le secteur "${industry}".
            Concurrents surveillés : ${competitorsNames}.
            Génère une analyse de marché fictive mais réaliste (JSON uniquement) :
            {
                "trends": ["Tendance 1", "Tendance 2", "Tendance 3"],
                "swot": {
                    "strengths": ["Force"],
                    "weaknesses": ["Faiblesse"],
                    "opportunities": ["Opportunité"],
                    "threats": ["Menace"]
                },
                "competitors_detailed": [
                    {
                        "name": "${comps[0].name}", 
                        "sentiment_trend": "Positif",
                        "last_month_growth": "+5%",
                        "top_complaint": "Service"
                    }
                ]
            }
        `;

        try {
            if (!apiKey) throw new Error("Clé API manquante");
            
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });

            const text = response.text || "{}";
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(cleanJson);
            
            return {
                ...analysis,
                competitors_detailed: analysis.competitors_detailed.map((d: any) => {
                    const original = comps.find(c => c.name === d.name);
                    return { ...original, ...d };
                })
            };
        } catch (e) {
            return {
                trends: ["Impossible de générer l'analyse."],
                swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
                competitors_detailed: []
            };
        }
    }
};

const publicService = {
    getLocationInfo: async (id: string) => {
        if (isSupabaseConfigured()) {
            try {
                const { data, error } = await supabase!.from('locations').select('*').eq('id', id).single();
                if (!error && data) return { name: data.name, city: data.city, googleUrl: data.google_review_url || '#' };
            } catch (e) { console.warn("Erreur publique", e); }
        }
        return null;
    },
    getWidgetReviews: async (locationId: string) => {
        if (!isSupabaseConfigured()) return [];
        try {
            const { data, error } = await supabase!
                .from('reviews')
                .select('author_name, rating, text, received_at')
                .eq('location_id', locationId)
                .gte('rating', 4)
                .order('received_at', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            
            return data.map((r: any) => ({
                author_name: r.author_name,
                rating: r.rating,
                body: r.text || '', 
                received_at: r.received_at
            }));
        } catch (e) {
            return [];
        }
    },
    submitFeedback: async (locationId: string, rating: number, feedback: string, contact: string, tags: string[] = []) => {
        try {
            const response = await fetch('/api/submit-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locationId, rating, feedback, contact, tags })
            });
            if (!response.ok) throw new Error("Erreur API");
            return true;
        } catch (e: any) {
            // Fallback DB
            const db = requireSupabase();
            const newReview = {
                location_id: locationId,
                rating: rating,
                text: feedback || '',
                author_name: contact || 'Client Funnel',
                source: 'direct',
                status: 'pending',
                received_at: new Date().toISOString(),
                language: 'fr',
                analysis: { 
                    sentiment: rating >= 4 ? 'positive' : 'negative', 
                    themes: tags || [], keywords: tags || [], flags: { hygiene: false, security: false } 
                }
            };
            await db.from('reviews').insert(newReview);
            return true;
        }
    }
};

const analyticsService = {
    getOverview: async (period?: string): Promise<AnalyticsSummary> => {
        if (!isSupabaseConfigured()) return INITIAL_ANALYTICS;

        const { data: reviews, error } = await supabase!
            .from('reviews')
            .select('*');

        if (error || !reviews || reviews.length === 0) {
            return { ...INITIAL_ANALYTICS, total_reviews: 0, average_rating: 0, volume_by_date: [] };
        }

        const total = reviews.length;
        const sumRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
        const avgRating = total > 0 ? parseFloat((sumRating / total).toFixed(1)) : 0;

        const positiveCount = reviews.filter(r => r.rating >= 4).length;
        const neutralCount = reviews.filter(r => r.rating === 3).length;
        const negativeCount = reviews.filter(r => r.rating <= 2).length;

        const promoters = reviews.filter(r => r.rating === 5).length;
        const detractors = reviews.filter(r => r.rating <= 3).length;
        const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

        const volumeMap: Record<string, number> = {};
        reviews.forEach(r => {
            const date = new Date(r.received_at).toLocaleDateString('fr-FR', { weekday: 'short' });
            volumeMap[date] = (volumeMap[date] || 0) + 1;
        });
        const volumeData = Object.entries(volumeMap).map(([date, count]) => ({ date, count }));

        const allText = reviews.map(r => r.text || r.body || "").join(" ").toLowerCase();
        const words = allText.split(/\s+/).filter(w => w.length > 3);
        const stopWords = ['pour', 'avec', 'très', 'mais', 'nous', 'vous', 'cette', 'était', 'sont'];
        const freqMap: Record<string, number> = {};
        
        words.forEach(w => {
            const cleanWord = w.replace(/[.,!?;:()]/g, "");
            if (!stopWords.includes(cleanWord)) {
                freqMap[cleanWord] = (freqMap[cleanWord] || 0) + 1;
            }
        });

        const topKeywords = Object.entries(freqMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([keyword, count]) => ({ keyword, count }));

        return {
            period: period || 'all_time',
            total_reviews: total,
            average_rating: avgRating,
            response_rate: 85,
            nps_score: nps,
            sentiment_distribution: {
                positive: total > 0 ? positiveCount / total : 0,
                neutral: total > 0 ? neutralCount / total : 0,
                negative: total > 0 ? negativeCount / total : 0
            },
            volume_by_date: volumeData.length > 0 ? volumeData : INITIAL_ANALYTICS.volume_by_date,
            top_themes_positive: INITIAL_ANALYTICS.top_themes_positive, 
            top_themes_negative: INITIAL_ANALYTICS.top_themes_negative,
            top_keywords: topKeywords.length > 0 ? topKeywords : INITIAL_ANALYTICS.top_keywords,
            problems_summary: "Analyse en temps réel activée.",
            strengths_summary: "Les données sont mises à jour dynamiquement."
        };
    }
};

const customersService = {
    list: async (): Promise<Customer[]> => {
        if (!isSupabaseConfigured()) return [];

        try {
            const { data: reviews, error } = await supabase!
                .from('reviews')
                .select('author_name, rating, source, received_at')
                .order('received_at', { ascending: false });

            if (error) throw error;

            const customerMap = new Map<string, Customer>();

            reviews?.forEach((r) => {
                const name = r.author_name || 'Anonyme';
                if (!customerMap.has(name)) {
                    customerMap.set(name, {
                        id: `cust-${name.replace(/\s+/g, '-').toLowerCase()}`,
                        name: name,
                        source: r.source,
                        last_interaction: r.received_at,
                        total_reviews: 0,
                        average_rating: 0,
                        status: 'passive'
                    } as any);
                }
                
                const cust = customerMap.get(name)!;
                cust.average_rating += r.rating;
                cust.total_reviews += 1;
            });

            return Array.from(customerMap.values()).map(c => {
                const avg = c.average_rating / c.total_reviews;
                let status: Customer['status'] = 'passive';
                if (avg >= 4.5) status = 'promoter';
                if (avg <= 3) status = 'detractor';

                return {
                    ...c,
                    average_rating: avg,
                    status
                };
            });

        } catch (e) {
            console.error("Error fetching customers:", e);
            return [];
        }
    }
};

const adminService = {
    getStats: async () => ({ 
        mrr: "2,450 €", 
        active_tenants: 42, 
        total_reviews_processed: 1540, 
        tenants: [
            { id: '1', name: 'Demo Corp', admin_email: 'ceo@demo.com', plan: 'pro', usage: 120, mrr: '79€' },
            { id: '2', name: 'Boulangerie Paul', admin_email: 'paul@boulangerie.com', plan: 'starter', usage: 45, mrr: '49€' }
        ] 
    }),
    resetAccount: async () => {
        if (!isSupabaseConfigured()) {
            return true;
        }
        const user = await authService.getUser();
        if (!user?.organization_id) return false;

        const { data: locations } = await supabase!.from('locations').select('id').eq('organization_id', user.organization_id);
        const locationIds = locations?.map(l => l.id) || [];
        
        if (locationIds.length > 0) {
            await supabase!.from('reviews').delete().in('location_id', locationIds);
        }
        
        await supabase!.from('organizations').update({ ai_usage_count: 0 }).eq('id', user.organization_id);
        
        return true;
    }
};

const socialService = {
    publish: async (platform: string, content: string) => {
        console.log(`Publishing to ${platform}: ${content}`);
        return true;
    }
};

const notificationsService = {
    list: async (): Promise<AppNotification[]> => [],
    markAllRead: async () => true,
    sendTestEmail: async () => {
        const user = await authService.getUser();
        if (!user || !user.email) throw new Error("Utilisateur non identifié");

        try {
            await fetch('/api/send-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: user.email,
                    subject: '🔔 Test Notification Reviewflow',
                    html: '<h1>Ceci est un test</h1><p>Configuration Resend OK !</p>'
                })
            });
        } catch(e) { throw new Error("Erreur SMTP"); }
        return true;
    }
};

const onboardingService = {
    checkStatus: async (): Promise<SetupStatus> => {
        if (!isSupabaseConfigured()) {
             return {
                googleConnected: false,
                brandVoiceConfigured: true,
                firstReviewReplied: false,
                completionPercentage: 35
            };
        }

        try {
            const org = await organizationService.get();
            const googleConnected = !!org?.integrations?.google;
            const brandVoiceConfigured = !!(org?.brand?.tone && org?.brand?.tone.length > 0);

            const { count } = await supabase!
                .from('reviews')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'sent');
            
            const firstReviewReplied = (count || 0) > 0;

            const steps = [googleConnected, brandVoiceConfigured, firstReviewReplied];
            const completed = steps.filter(Boolean).length;
            const completionPercentage = Math.round((completed / 3) * 100);

            return {
                googleConnected,
                brandVoiceConfigured,
                firstReviewReplied,
                completionPercentage
            };
        } catch (e) {
             return {
                googleConnected: false,
                brandVoiceConfigured: false,
                firstReviewReplied: false,
                completionPercentage: 0
            };
        }
    }
};

const activityService = {
    getRecent: async () => {
        if (!isSupabaseConfigured()) {
            return [
                { id: 1, type: 'review', text: 'Mode Démo: Nouvel avis 5 étoiles', location: 'Démo', time: 'Il y a 2h' },
            ];
        }

        try {
            const { data: reviews } = await supabase!
                .from('reviews')
                .select('id, rating, author_name, received_at, status')
                .order('received_at', { ascending: false })
                .limit(5);

            if (!reviews) return [];

            return reviews.map((r: any) => ({
                id: r.id,
                type: 'review',
                text: `${r.author_name} a laissé une note de ${r.rating}/5`,
                location: r.status === 'pending' ? 'À traiter' : 'Traité',
                time: new Date(r.received_at).toLocaleDateString()
            }));

        } catch (e) {
            return [];
        }
    }
};

const billingService = {
    createCheckoutSession: async (plan: 'starter' | 'pro') => {
        const user = await authService.getUser();
        const email = user?.email || '';

        const linkStarter = import.meta.env.VITE_STRIPE_LINK_STARTER;
        const linkPro = import.meta.env.VITE_STRIPE_LINK_PRO;

        let url = plan === 'starter' ? linkStarter : linkPro;

        if (!url) throw new Error("Lien de paiement manquant.");

        if (email) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}prefilled_email=${encodeURIComponent(email)}`;
        }

        return url;
    },
    createPortalSession: async () => {
        return "https://billing.stripe.com/p/login/test"; 
    },
    getInvoices: async () => {
        return [
            { id: 'INV-001', date: '01/10/2023', amount: '49.00 €', status: 'Payé' },
            { id: 'INV-002', date: '01/11/2023', amount: '49.00 €', status: 'Payé' }
        ];
    }
};

const seedCloudDatabase = async () => {
      const db = requireSupabase();
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error("Connectez-vous d'abord.");
      
      try {
          const { data: existingUser } = await db.from('users').select('organization_id').eq('id', user.id).single();
          let orgId = existingUser?.organization_id;

          if (!orgId) {
              const { data: org, error: orgError } = await db.from('organizations').insert({ 
                  name: 'Organisation Démo', 
                  subscription_plan: 'pro',
                  workflows: [] 
              }).select().single();
              if (orgError) throw orgError;
              orgId = org.id;
              await db.from('users').update({ role: 'admin', organization_id: orgId }).eq('id', user.id);
          }
          
          const { data: locs, error: locError } = await db.from('locations').insert([{ 
              organization_id: orgId, 
              name: "Boutique Paris Centre", 
              city: "Paris" 
          }]).select();
          if (locError) throw locError;

          if (locs) {
              const reviewsPayload = INITIAL_REVIEWS.map(r => ({ 
                  location_id: locs[0].id, 
                  source: r.source,
                  rating: r.rating,
                  text: r.body,
                  author_name: r.author_name,
                  received_at: r.received_at,
                  status: r.status,
                  language: r.language,
                  internal_notes: [], 
                  analysis: r.analysis || {} 
              }));
              await db.from('reviews').insert(reviewsPayload);
          }
          
          window.location.reload();
          return true;
      } catch (e: any) {
          throw new Error("Erreur injection: " + e.message);
      }
};

export const api = {
    auth: authService,
    company: companyService,
    organization: organizationService,
    reviews: reviewsService,
    ai: aiService,
    automation: automationService,
    locations: locationsService,
    public: publicService,
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
    google: googleService
};
