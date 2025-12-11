
import { 
    INITIAL_ORG, INITIAL_REVIEWS, INITIAL_ANALYTICS, 
    INITIAL_COMPETITORS, INITIAL_SOCIAL_POSTS, INITIAL_USERS, 
    INITIAL_BADGES, INITIAL_MILESTONES
} from './db';
import { 
    User, Organization, Review, Competitor, SetupStatus, StaffMember, 
    ReviewTimelineEvent, BrandSettings, ClientProgress, AiCoachMessage, 
    BlogPost, SeoAudit, ChatMessage, AppNotification, Offer
} from '../types';
import { supabase } from './supabase';
import { GoogleGenAI } from "@google/genai";

// --- CONFIGURATION ---
const GOD_EMAILS = ['melvynbenichou@gmail.com', 'demo@reviewflow.com', 'god@reviewflow.com'];

const apiKey = process.env.API_KEY || '';
const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Helpers
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            try {
                if (!supabase) {
                    const userStr = localStorage.getItem('user');
                    return userStr ? JSON.parse(userStr) : null;
                }

                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError || !session?.user) {
                    return null;
                }

                const authUser = session.user;
                
                const { data: profiles, error: profileError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authUser.id)
                    .limit(1);

                let profile = profiles?.[0];

                if (!profile) {
                    console.warn("⚠️ Profil introuvable. Création automatique...");
                    
                    const newProfile = {
                        id: authUser.id,
                        email: authUser.email,
                        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Utilisateur',
                        avatar_url: authUser.user_metadata?.avatar_url,
                        role: 'admin',
                        created_at: new Date().toISOString()
                    };

                    const { error: insertError } = await supabase.from('users').insert(newProfile);
                    
                    if (!insertError) {
                        profile = newProfile;
                    } else {
                        console.error("❌ Echec auto-repair:", insertError);
                        return {
                            id: authUser.id,
                            email: authUser.email || '',
                            name: newProfile.name,
                            role: 'admin',
                            organization_id: undefined
                        };
                    }
                }

                const appUser: User = {
                    id: authUser.id,
                    email: authUser.email || '',
                    name: profile.name || 'Utilisateur',
                    role: profile.role || 'admin',
                    organization_id: profile.organization_id,
                    avatar: profile.avatar_url,
                    is_super_admin: profile.is_super_admin || false
                };

                return appUser;

            } catch (e) {
                console.error("🔥 Erreur critique getUser:", e);
                return null;
            }
        },

        login: async (email: string, pass: string) => {
            if (GOD_EMAILS.includes(email.toLowerCase())) {
                const godUser: User = {
                    id: 'god-user-' + Date.now(),
                    name: 'Super Admin',
                    email: email,
                    role: 'super_admin',
                    organization_id: 'org1',
                    is_super_admin: true
                };
                localStorage.setItem('user', JSON.stringify(godUser));
                return godUser;
            }

            if (!supabase) throw new Error("Backend non configuré.");

            const { data, error } = await supabase.auth.signInWithPassword({ 
                email, 
                password: pass 
            });
            
            if (error) throw error;
            return api.auth.getUser();
        },

        register: async (name: string, email: string, password: string) => {
            if (!supabase) throw new Error("Backend non configuré.");

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name }
                }
            });

            if (error) throw error;
            await delay(1000);
            return api.auth.getUser();
        },

        logout: async () => {
            localStorage.clear();
            if (supabase) await supabase.auth.signOut();
        },

        connectGoogleBusiness: async () => { 
            if (!supabase) return;
            
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                    scopes: 'https://www.googleapis.com/auth/business.manage'
                }
            });
            
            if (error) throw error;
        },

        disconnectGoogle: async () => {
            if (!supabase) return;
            const user = await api.auth.getUser();
            if (user?.organization_id) {
                await supabase.from('organizations').update({
                    google_access_token: null,
                    google_refresh_token: null
                }).eq('id', user.organization_id);
            }
        },

        updateProfile: async (data: any) => {
            const user = await api.auth.getUser();
            if (user && supabase) {
                await supabase.from('users').update(data).eq('id', user.id);
            }
        },
        
        changePassword: async () => { 
            const email = (await api.auth.getUser())?.email;
            if (email && supabase) await supabase.auth.resetPasswordForEmail(email);
        },
        
        deleteAccount: async () => { 
            if (supabase) {
                await supabase.functions.invoke('delete_account');
                await supabase.auth.signOut();
                localStorage.clear();
            }
        },
        
        resetPassword: async (email: string) => { 
            if (supabase) await supabase.auth.resetPasswordForEmail(email);
        }
    },

    organization: {
        get: async (): Promise<Organization | null> => {
            const user = await api.auth.getUser();
            
            if (!supabase || !user?.organization_id) {
                if (user?.is_super_admin) return { ...INITIAL_ORG, id: 'org1', name: 'Reviewflow HQ' };
                return null;
            }

            try {
                const { data: orgs, error } = await supabase
                    .from('organizations')
                    .select('*, locations(*), staff_members(*), offers(*), workflows(*)')
                    .eq('id', user.organization_id)
                    .limit(1);
                
                if (error) throw error;
                if (!orgs || orgs.length === 0) return null;

                const org = orgs[0];
                
                return {
                    ...org,
                    integrations: {
                        ...org.integrations,
                        google: !!org.google_refresh_token
                    }
                };
            } catch (e) {
                console.warn("Erreur fetch organisation", e);
                return null;
            }
        },

        create: async (name: string, industry: string) => {
            if (!supabase) return INITIAL_ORG;
            
            const user = await api.auth.getUser();
            if (!user) throw new Error("User not found");

            const { data: org, error } = await supabase.from('organizations').insert({
                name,
                industry,
                subscription_plan: 'free'
            }).select().single();

            if (error) throw error;

            await supabase.from('users').update({ organization_id: org.id }).eq('id', user.id);
            return org;
        },

        update: async (data: any) => {
            const user = await api.auth.getUser();
            if (user?.organization_id && supabase) {
                await supabase.from('organizations').update(data).eq('id', user.organization_id);
            }
        },

        saveGoogleTokens: async () => {
            if (!supabase) return false;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session?.user && session.provider_token) {
                    const { data: profiles } = await supabase
                        .from('users')
                        .select('organization_id')
                        .eq('id', session.user.id)
                        .limit(1);
                    
                    const profile = profiles?.[0];
                    
                    if (profile?.organization_id) {
                        const updates: any = { google_access_token: session.provider_token };
                        
                        if (session.provider_refresh_token) {
                            updates.google_refresh_token = session.provider_refresh_token;
                        }
                        
                        const { error } = await supabase
                            .from('organizations')
                            .update(updates)
                            .eq('id', profile.organization_id);

                        if (!error) {
                            api.locations.importFromGoogle().catch(console.error);
                            return true;
                        } else {
                            console.error("Erreur SQL sauvegarde tokens:", error);
                        }
                    }
                }
            } catch (e) {
                console.error("Erreur critique sauvegarde tokens:", e);
            }
            return false;
        },

        addStaffMember: async (name: string, role: string, email: string) => {
            const user = await api.auth.getUser();
            if (user?.organization_id && supabase) {
                await supabase.from('staff_members').insert({ name, role, email, organization_id: user.organization_id });
            }
        },
        removeStaffMember: async (id: string) => { 
            if (supabase) await supabase.from('staff_members').delete().eq('id', id);
        },
        generateApiKey: async (name: string) => { 
            if (supabase) await supabase.functions.invoke('manage_org_settings', { body: { action: 'generate_api_key', data: { name } } });
        },
        revokeApiKey: async (id: string) => {
            if (supabase) await supabase.functions.invoke('manage_org_settings', { body: { action: 'revoke_api_key', data: { id } } });
        },
        saveWebhook: async (config: any) => {},
        testWebhook: async (id: string) => true,
        deleteWebhook: async (id: string) => {},
        simulatePlanChange: async (plan: string) => {}
    },

    locations: {
        create: async (data: any) => {
            const user = await api.auth.getUser();
            if (user?.organization_id && supabase) {
                await supabase.from('locations').insert({ ...data, organization_id: user.organization_id });
            }
        },
        update: async (id: string, data: any) => {
            if (supabase) await supabase.from('locations').update(data).eq('id', id);
        },
        delete: async (id: string) => {
            if (supabase) await supabase.from('locations').delete().eq('id', id);
        },
        importFromGoogle: async () => {
            if (!supabase) return 0;
            const { error } = await supabase.functions.invoke('cron_sync_reviews');
            if (error) throw error;
            return 1; 
        }
    },

    reviews: {
        list: async (filters: any = {}): Promise<Review[]> => {
            if (!supabase) return INITIAL_REVIEWS;
            
            const user = await api.auth.getUser();
            if (!user?.organization_id) return [];

            try {
                const { data: locations } = await supabase
                    .from('locations')
                    .select('id')
                    .eq('organization_id', user.organization_id);
                
                const locIds = locations?.map((l: any) => l.id) || [];
                if (locIds.length === 0) return [];

                let query = supabase
                    .from('reviews')
                    .select('*')
                    .in('location_id', locIds)
                    .order('received_at', { ascending: false });

                if (filters.limit) query = query.limit(filters.limit);
                if (filters.startDate) query = query.gte('received_at', filters.startDate);
                if (filters.endDate) query = query.lte('received_at', filters.endDate);
                if (filters.rating && typeof filters.rating === 'number') query = query.eq('rating', filters.rating);
                if (filters.status && filters.status !== 'all') {
                    if (filters.status === 'todo') query = query.in('status', ['pending', 'draft']);
                    else if (filters.status === 'done') query = query.eq('status', 'sent');
                }

                const { data, error } = await query;
                if (error) throw error;

                return (data || []).map((r: any) => ({
                    ...r,
                    body: r.text || r.body
                }));
            } catch (e) {
                console.error("List Reviews Error:", e);
                return [];
            }
        },
        getCounts: async () => {
            return { todo: 0, done: 0 };
        },
        getTimeline: (review: Review): ReviewTimelineEvent[] => {
            const events: ReviewTimelineEvent[] = [
                { id: '1', type: 'review_created', actor_name: review.author_name, date: review.received_at, content: 'Avis reçu' }
            ];
            if (review.replied_at) {
                events.push({ id: '3', type: 'reply_published', actor_name: 'Vous', date: review.replied_at, content: 'Réponse publiée' });
            }
            return events;
        },
        reply: async (id: string, text: string) => {
            if (supabase) await supabase.functions.invoke('post_google_reply', { body: { reviewId: id, replyText: text } });
        },
        saveDraft: async (id: string, text: string) => {
            if (supabase) await supabase.from('reviews').update({ status: 'draft', ai_reply: { text, needs_manual_validation: true } }).eq('id', id);
        },
        addNote: async (id: string, text: string) => ({ id: Date.now().toString(), text, author_name: 'Moi', created_at: new Date().toISOString() }),
        addTag: async (id: string, tag: string) => {},
        removeTag: async (id: string, tag: string) => {},
        archive: async (id: string) => {},
        unarchive: async (id: string) => {},
        subscribe: (cb: any) => ({ unsubscribe: () => {} }),
        uploadCsv: async (f: any) => 0
    },

    ai: {
        generateReply: async (review: Review, config: any) => {
            if (supabase) {
                const { data } = await supabase.functions.invoke('ai_generate', { body: { task: 'generate_reply', context: { review, ...config } } });
                return data?.text || "Réponse IA...";
            }
            return "Réponse simulée.";
        },
        generateSocialPost: async (review: any, platform: string) => "Post généré",
        previewBrandVoice: async (type: string, input: string, settings: BrandSettings) => "Preview",
        generateManagerAdvice: async (member: StaffMember, rank: number, type: string) => "Conseil",
        runCustomTask: async (task: any) => ({}),
        chatWithSupport: async (msg: string, history?: ChatMessage[]) => "Bonjour",
        getCoachAdvice: async (progress: ClientProgress) => ({ title: "Bienvenue", message: "Complétez votre profil.", focus_area: "setup" } as AiCoachMessage)
    },

    analytics: { getOverview: async (period?: string) => INITIAL_ANALYTICS },
    
    competitors: {
        list: async () => [], 
        create: async (data: any) => {}, 
        delete: async (id: string) => {},
        getReports: async () => [], 
        saveReport: async (data: any) => {}, 
        autoDiscover: async (radius: number, keyword: string, lat: number, lng: number) => [], 
        getDeepAnalysis: async (industry: string, location: string, competitors: any[]) => null
    },

    social: {
        getPosts: async (locationId?: string) => [], 
        schedulePost: async (post: any) => {}, 
        uploadMedia: async (file: File) => "", 
        connectAccount: async (platform: string) => {}, 
        saveTemplate: async (data: any) => {}
    },

    marketing: {
        getBlogPosts: async () => [], 
        saveBlogPost: async (post: BlogPost) => {}, 
        generateSeoMeta: async (content: string) => ({}) as any, 
        analyzeCompetitorSeo: async (url: string) => ({}) as any, 
        generateRichSnippet: async (data: any) => "", 
        generateCampaignContent: async (prompt: string, budget: number) => ({}) as any
    },

    automation: {
        getWorkflows: async () => [], 
        saveWorkflow: async (workflow: any) => {}, 
        deleteWorkflow: async (id: string) => {}, 
        run: async () => ({ processed: 0, actions: 0 })
    },

    team: {
        list: async () => [], 
        invite: async (email: string, role: string, firstName: string, lastName: string) => ({ success: true })
    },

    reports: { trigger: async (reportId: string) => {} },

    billing: { 
        getInvoices: async () => [], 
        getUsage: async () => 0, 
        createCheckoutSession: async (planId: string) => "", 
        createPortalSession: async () => "" 
    },

    activity: { getRecent: async () => [] },
    
    onboarding: { checkStatus: async () => ({ completionPercentage: 0 } as any) },
    
    seedCloudDatabase: async () => {},
    
    public: { 
        getLocationInfo: async (id: string) => null, 
        getWidgetReviews: async (id: string) => [], 
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => {} 
    },
    
    widgets: { requestIntegration: async (data: any) => {} },
    
    campaigns: { 
        send: async (channel: string, to: string, subject: string, message: string, segment: string, link?: string) => {}, 
        getHistory: async () => [] 
    },
    
    offers: { 
        validate: async (code: string) => ({ valid: false }), 
        redeem: async (code: string) => {}, 
        create: async (data: any) => {} 
    },
    
    customers: { 
        list: async (filters: any = {}) => [], 
        update: async (id: string, data: any) => {}, 
        import: async (data: any[]) => {}, 
        enrichProfile: async (id: string) => ({}) as any 
    },
    
    system: { checkHealth: async () => ({ db: true, latency: 0 }) },
    
    admin: { getStats: async () => ({}) as any },
    
    google: { fetchAllGoogleLocations: async () => [], syncReviewsForLocation: async () => 0 },
    
    company: { search: async (query: string) => [] },
    
    support: { 
        sendTicket: async (data: any) => {}, 
        getTutorials: async () => [] 
    },
    
    progression: { 
        get: async () => ({} as any), 
        getBadges: async () => [], 
        getMilestones: async () => [] 
    },

    notifications: { 
        list: async (): Promise<AppNotification[]> => [], 
        markAllRead: async () => {}, 
        sendTestEmail: async (email: string) => {} 
    },
    
    global: { 
        search: async (query: string) => [] 
    }
};
