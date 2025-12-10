
import { supabase } from './supabase';
import { 
    User, Organization, Review, AnalyticsSummary, WorkflowRule, 
    ReportConfig, Competitor, SocialPost, Customer, SocialTemplate,
    CampaignLog, SetupStatus, StaffMember, ReviewTimelineEvent, BrandSettings, Tutorial,
    ClientProgress, Badge, Milestone, AiCoachMessage, BlogPost, SeoAudit, MultiChannelCampaign,
    ChatMessage
} from '../types';
import { 
    INITIAL_REVIEWS, INITIAL_ANALYTICS, 
    INITIAL_WORKFLOWS, INITIAL_REPORTS, INITIAL_COMPETITORS, 
    INITIAL_SOCIAL_POSTS, INITIAL_BADGES, INITIAL_MILESTONES
} from './db';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            if (!supabase) return null;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // Fetch public profile
            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                return {
                    id: user.id,
                    email: user.email!,
                    name: profile.name || user.email!.split('@')[0],
                    role: profile.role || 'viewer',
                    avatar: profile.avatar,
                    organization_id: profile.organization_id,
                    is_super_admin: profile.is_super_admin
                };
            }
            return null;
        },
        login: async (email: string, pass: string) => {
            if (!supabase) throw new Error("Supabase non configuré");
            const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
            if (error) throw error;
            return data.user;
        },
        logout: async () => {
            if (supabase) await supabase.auth.signOut();
            localStorage.clear();
        },
        register: async (name: string, email: string, password?: string) => {
            if (!supabase) throw new Error("Supabase non configuré");
            const { data, error } = await supabase.auth.signUp({
                email,
                password: password || 'temp-pass-' + Math.random(),
                options: {
                    data: { full_name: name }
                }
            });
            if (error) throw error;
            return data.user;
        },
        // --- REAL GOOGLE OAUTH CONNECTION ---
        connectGoogleBusiness: async () => {
            if (!supabase) throw new Error("Supabase non configuré");
            
            // Trigger OAuth with specific Business scopes and offline access (for refresh token)
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/dashboard',
                    scopes: 'https://www.googleapis.com/auth/business.manage',
                    queryParams: {
                        access_type: 'offline', // Critical for getting a Refresh Token
                        prompt: 'consent',      // Force consent to ensure we get the token
                    },
                },
            });
            
            if (error) throw error;
            return data;
        },
        updateProfile: async (data: any) => {
            if (!supabase) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('users').update(data).eq('id', user.id);
            }
        },
        changePassword: async () => { await delay(1000); },
        deleteAccount: async () => { 
            if (supabase) {
                // Call Edge Function or just delete from auth (cascade handled by DB)
                // For safety in this demo context, we just sign out
                await supabase.auth.signOut();
            }
        },
        resetPassword: async (email: string) => { 
            if (supabase) await supabase.auth.resetPasswordForEmail(email);
        },
        loginWithGoogle: async () => {
            // Simple login (not business connect)
            if (!supabase) throw new Error("Supabase non configuré");
            const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
            if (error) throw error;
            return data;
        }
    },
    organization: {
        get: async (): Promise<Organization | null> => {
            if (!supabase) return null;
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // 1. Get User Profile for Org ID
            const { data: profile } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) return null;

            // 2. Get Organization Data
            const { data: org } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', profile.organization_id)
                .single();

            if (!org) return null;

            // 3. Get Locations
            const { data: locations } = await supabase
                .from('locations')
                .select('*')
                .eq('organization_id', org.id);

            // 4. Return formatted object with REAL integration status
            return {
                ...org,
                locations: locations || [],
                integrations: {
                    // Check if refresh token exists in DB to determine connection status
                    google: !!org.google_refresh_token, 
                    facebook: !!org.facebook_access_token,
                    instagram_posting: !!org.instagram_access_token,
                    facebook_posting: !!org.facebook_page_access_token,
                    linkedin_posting: !!org.linkedin_access_token,
                    tiktok_posting: false
                },
                // Parse JSON fields if they are stored as JSONB in Supabase but types here expect objects
                brand: typeof org.brand === 'string' ? JSON.parse(org.brand) : org.brand,
                notification_settings: typeof org.notification_settings === 'string' ? JSON.parse(org.notification_settings) : org.notification_settings
            };
        },
        update: async (data: any) => { 
            if (!supabase) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
            if (profile?.organization_id) {
                await supabase.from('organizations').update(data).eq('id', profile.organization_id);
            }
        },
        create: async (name: string, industry: string) => { 
            // Logic handled by Supabase Trigger usually, or implemented here
            return null; 
        },
        saveGoogleTokens: async () => {
            // This is called after OAuth redirect to save the provider tokens into the organization table
            if (!supabase) return;
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.provider_token && session.user) {
                const { data: profile } = await supabase.from('users').select('organization_id').eq('id', session.user.id).single();
                
                if (profile?.organization_id) {
                    const updates: any = {
                        google_access_token: session.provider_token
                    };
                    if (session.provider_refresh_token) {
                        updates.google_refresh_token = session.provider_refresh_token;
                    }
                    
                    await supabase.from('organizations')
                        .update(updates)
                        .eq('id', profile.organization_id);
                }
            }
        },
        addStaffMember: async (name: string, role: string, email: string) => { /* Imp in Supabase */ },
        removeStaffMember: async (id: string) => { /* Imp in Supabase */ },
        generateApiKey: async (name: string) => { /* Imp in Supabase */ },
        revokeApiKey: async (id: string) => { /* Imp in Supabase */ },
        saveWebhook: async () => { /* Imp in Supabase */ },
        testWebhook: async () => { return true; },
        deleteWebhook: async () => { /* Imp in Supabase */ },
        simulatePlanChange: async () => { /* Imp in Supabase */ }
    },
    locations: {
        importFromGoogle: async () => {
            if (!supabase) return 0;
            // Trigger Edge Function to fetch locations using stored tokens
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            const { data, error } = await supabase.functions.invoke('fetch_google_locations', {
                body: { accessToken: session.provider_token } // Pass current session token or handle via DB refresh token in edge function
            });

            if (error) throw error;
            return data?.length || 0;
        },
        update: async (id: string, data: any) => {
            if (supabase) await supabase.from('locations').update(data).eq('id', id);
        },
        create: async (data: any) => {
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user?.id).single();
                if (profile) {
                    await supabase.from('locations').insert({ ...data, organization_id: profile.organization_id });
                }
            }
        },
        delete: async (id: string) => {
            if (supabase) await supabase.from('locations').delete().eq('id', id);
        }
    },
    // ... Keep other methods as pass-through or mock if not core to the request
    reviews: {
        list: async (filters: any): Promise<Review[]> => {
            if (!supabase) return INITIAL_REVIEWS;
            
            let query = supabase.from('reviews').select('*').order('received_at', { ascending: false });
            
            if (filters?.rating && filters.rating !== 'Tout') {
                const r = parseInt(filters.rating.toString().charAt(0));
                query = query.eq('rating', r);
            }
            // ... other filters
            
            const { data } = await query;
            return (data || []) as Review[];
        },
        getTimeline: (review: Review) => [],
        reply: async (id: string, text: string) => {
            if (supabase) {
                // Call edge function to post to Google
                await supabase.functions.invoke('post_google_reply', { body: { reviewId: id, replyText: text }});
            }
        },
        saveDraft: async (id: string, text: string) => {
            if (supabase) await supabase.from('reviews').update({ status: 'draft', ai_reply: { text } }).eq('id', id);
        },
        addNote: async (id: string, text: string) => { return null; },
        addTag: async () => {},
        removeTag: async () => {},
        archive: async () => {},
        unarchive: async () => {},
        getCounts: async () => ({ todo: 0, done: 0 }),
        subscribe: () => ({ unsubscribe: () => {} }),
        uploadCsv: async () => 0
    },
    // Mock the rest to avoid compile errors, can be implemented later
    notifications: { list: async () => [], markAllRead: async () => {}, sendTestEmail: async () => {} },
    global: { search: async () => [] },
    ai: {
        generateReply: async () => "Réponse générée par IA...",
        previewBrandVoice: async () => "Preview...",
        generateSocialPost: async () => "Social post...",
        generateManagerAdvice: async () => "Advice...",
        runCustomTask: async () => ({}),
        chatWithSupport: async () => "Bonjour",
        getCoachAdvice: async () => ({ title: "Go", message: "Connectez Google !", focus_area: "setup" })
    },
    analytics: { getOverview: async () => INITIAL_ANALYTICS },
    marketing: {
        getBlogPosts: async () => [],
        saveBlogPost: async (p: any) => p,
        generateSeoMeta: async () => ({}),
        analyzeCompetitorSeo: async () => ({ metrics: {}, ai_analysis: {} } as any),
        generateRichSnippet: async () => "{}",
        generateCampaignContent: async () => ({})
    },
    automation: {
        getWorkflows: async () => INITIAL_WORKFLOWS,
        saveWorkflow: async () => {},
        deleteWorkflow: async () => {},
        run: async () => ({ processed: 0, actions: 0 })
    },
    competitors: {
        list: async () => INITIAL_COMPETITORS,
        getReports: async () => [],
        saveReport: async () => {},
        autoDiscover: async () => [],
        getDeepAnalysis: async () => ({}),
        create: async () => {},
        delete: async () => {}
    },
    team: { list: async () => [], invite: async () => ({}) },
    reports: { trigger: async () => {} },
    billing: { getInvoices: async () => [], getUsage: async () => 0, createCheckoutSession: async () => "", createPortalSession: async () => "" },
    activity: { getRecent: async () => [] },
    onboarding: { checkStatus: async () => ({ completionPercentage: 0, googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false }) },
    seedCloudDatabase: async () => {},
    social: { getPosts: async () => [], schedulePost: async () => {}, uploadMedia: async () => "", connectAccount: async () => {}, saveTemplate: async () => {} },
    public: { getLocationInfo: async () => null, getWidgetReviews: async () => [], submitFeedback: async () => {} },
    widgets: { requestIntegration: async () => {} },
    campaigns: { send: async () => {}, getHistory: async () => [] },
    offers: { validate: async () => ({}), redeem: async () => {}, create: async () => {} },
    customers: { list: async () => [], update: async () => {}, import: async () => {}, enrichProfile: async () => ({}) },
    system: { checkHealth: async () => ({}) },
    admin: { getStats: async () => ({}) },
    google: { fetchAllGoogleLocations: async () => [], syncReviewsForLocation: async () => 0 },
    company: { search: async () => [] },
    support: { sendTicket: async () => {}, getTutorials: async () => [] },
    progression: { get: async () => ({ score: 0, level: 'Beginner', steps: {}, next_actions: [] } as any), getBadges: async () => INITIAL_BADGES, getMilestones: async () => INITIAL_MILESTONES }
};
