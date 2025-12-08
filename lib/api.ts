
import { supabase } from './supabase';
import { 
    INITIAL_USERS, 
    INITIAL_ORG, 
    INITIAL_REVIEWS, 
    INITIAL_ANALYTICS, 
    INITIAL_WORKFLOWS, 
    INITIAL_REPORTS, 
    INITIAL_COMPETITORS
} from './db';
import { 
    DEMO_REVIEWS, 
    DEMO_STATS, 
    DEMO_ORG, 
    DEMO_USER, 
    DEMO_COMPETITORS 
} from './demo';
import { 
    User, 
    Organization, 
    Review, 
    AnalyticsSummary, 
    WorkflowRule, 
    ReportConfig, 
    Competitor, 
    AppNotification, 
    SocialPost, 
    SocialAccount, 
    Location, 
    StaffMember, 
    Offer, 
    Customer, 
    MarketReport, 
    SetupStatus, 
    ReviewTimelineEvent,
    SavedReply,
    BrandSettings,
    NotificationSettings,
    SocialTemplate
} from '../types';

const isDemoMode = () => {
    return localStorage.getItem('is_demo_mode') === 'true' || !supabase;
};

// --- MOCK STORAGE FOR DEMO MODE ---
// Simple in-memory storage for demo session (resets on reload)
let mockReviews = [...DEMO_REVIEWS, ...INITIAL_REVIEWS];
let mockPosts: SocialPost[] = [];
let mockCustomers: Customer[] = [];

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            if (isDemoMode()) return DEMO_USER;
            if (!supabase) return null;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
            return data;
        },
        login: async (email: string, password: string): Promise<User> => {
            if (email.includes('demo')) {
                localStorage.setItem('is_demo_mode', 'true');
                return DEMO_USER;
            }
            if (!supabase) throw new Error("Supabase not configured");
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            const { data: user } = await supabase.from('users').select('*').eq('id', data.user.id).single();
            return user;
        },
        register: async (name: string, email: string, password: string) => {
            if (!supabase) throw new Error("Supabase not configured");
            const { data, error } = await supabase.auth.signUp({ 
                email, 
                password,
                options: { data: { name } }
            });
            if (error) throw error;
            return data;
        },
        logout: async () => {
            localStorage.removeItem('is_demo_mode');
            localStorage.removeItem('setup_completed_hidden');
            if (supabase) await supabase.auth.signOut();
        },
        connectGoogleBusiness: async () => {
            if (isDemoMode()) return true;
            // In real app, this redirects to OAuth
            window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID}&redirect_uri=${window.location.origin}/auth/callback&response_type=code&scope=https://www.googleapis.com/auth/business.manage`;
        },
        updateProfile: async (data: Partial<User> & { password?: string }) => {
            if (isDemoMode()) return { ...DEMO_USER, ...data };
            const { data: user } = await supabase!.auth.getUser();
            if (!user.user) throw new Error("Not authenticated");
            
            if (data.password) {
                const { error } = await supabase!.auth.updateUser({ password: data.password });
                if (error) throw error;
                delete data.password; // Don't send to public profile table
            }

            if (Object.keys(data).length > 0) {
                const { error } = await supabase!.from('users').update(data).eq('id', user.user.id);
                if (error) throw error;
            }
        },
        deleteAccount: async () => {
            if (isDemoMode()) return;
            const { error } = await supabase!.functions.invoke('delete_account');
            if (error) throw error;
        },
        resetPassword: async (email: string) => {
            if (isDemoMode()) return;
            await supabase!.auth.resetPasswordForEmail(email);
        },
        loginWithGoogle: async () => {
            if (!supabase) throw new Error("Supabase not configured");
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/dashboard',
                    scopes: 'https://www.googleapis.com/auth/business.manage'
                }
            });
            if (error) throw error;
        }
    },
    organization: {
        get: async (): Promise<Organization | null> => {
            if (isDemoMode()) return DEMO_ORG;
            if (!supabase) return null;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data: userProfile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
            if (!userProfile?.organization_id) return null;
            const { data } = await supabase.from('organizations').select('*, locations(*), staff_members(*), offers(*), api_keys(*), webhooks(*)').eq('id', userProfile.organization_id).single();
            return data;
        },
        create: async (name: string, industry: string) => {
            if (!supabase) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase.from('organizations').insert({ name, industry, subscription_plan: 'free' }).select().single();
            if (error) throw error;
            await supabase.from('users').update({ organization_id: data.id }).eq('id', user.id);
            return data;
        },
        update: async (data: Partial<Organization>) => {
            if (isDemoMode()) return { ...DEMO_ORG, ...data };
            const org = await api.organization.get();
            if (!org) throw new Error("No org");
            const { error } = await supabase!.from('organizations').update(data).eq('id', org.id);
            if (error) throw error;
        },
        saveGoogleTokens: async () => {
            if (!supabase) return false;
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.provider_token) {
                const { data: user } = await supabase.from('users').select('organization_id').eq('id', session.user.id).single();
                if (user?.organization_id) {
                    await supabase.from('organizations').update({
                        google_refresh_token: session.provider_refresh_token,
                        integrations: { google: true } // Merge logic needed in real DB
                    }).eq('id', user.organization_id);
                    return true;
                }
            }
            return false;
        },
        generateApiKey: async (name: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('manage_org_settings', { body: { action: 'generate_api_key', data: { name } } });
        },
        revokeApiKey: async (id: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('manage_org_settings', { body: { action: 'revoke_api_key', data: { id } } });
        },
        saveWebhook: async (url: string, events: string[]) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('manage_org_settings', { body: { action: 'save_webhook', data: { url, events } } });
        },
        deleteWebhook: async (id: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('manage_org_settings', { body: { action: 'delete_webhook', data: { id } } });
        },
        testWebhook: async (id: string) => {
            return true; // Mock
        },
        simulatePlanChange: async (plan: string) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('organizations').update({ subscription_plan: plan }).eq('id', org?.id);
        },
        addStaffMember: async (name: string, role: string) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('staff_members').insert({ name, role, organization_id: org?.id });
        },
        removeStaffMember: async (id: string) => {
            if (isDemoMode()) return;
            await supabase!.from('staff_members').delete().eq('id', id);
        },
        sendCongratulationEmail: async (staffId: string) => {
            return true;
        }
    },
    reviews: {
        list: async (filters: any): Promise<Review[]> => {
            if (isDemoMode()) {
                let res = mockReviews;
                if (filters.status) res = res.filter(r => r.status === filters.status);
                if (filters.rating) res = res.filter(r => r.rating === parseInt(filters.rating.replace(' ★', '')));
                return res;
            }
            if (!supabase) return [];
            const org = await api.organization.get();
            let query = supabase.from('reviews').select('*').in('location_id', org?.locations.map(l => l.id) || []);
            
            if (filters.status) query = query.eq('status', filters.status);
            if (filters.source) query = query.eq('source', filters.source.toLowerCase());
            if (filters.rating) {
                const rating = parseInt(filters.rating.toString().replace(' ★', ''));
                if (!isNaN(rating)) query = query.eq('rating', rating);
            }
            if (filters.search) query = query.ilike('text', `%${filters.search}%`);
            
            if (filters.page !== undefined && filters.limit) {
                query = query.range(filters.page * filters.limit, (filters.page + 1) * filters.limit - 1);
            }
            
            const { data } = await query.order('received_at', { ascending: false });
            return (data || []).map(r => ({...r, body: r.text}));
        },
        reply: async (reviewId: string, text: string) => {
            if (isDemoMode()) {
                mockReviews = mockReviews.map(r => r.id === reviewId ? { ...r, status: 'sent', posted_reply: text, replied_at: new Date().toISOString() } : r);
                return;
            }
            // If connected to Google, post to Google
            const { error } = await supabase!.functions.invoke('post_google_reply', { body: { reviewId, replyText: text } });
            if (error) throw error;
        },
        saveDraft: async (reviewId: string, text: string) => {
            if (isDemoMode()) {
                mockReviews = mockReviews.map(r => r.id === reviewId ? { ...r, status: 'draft', ai_reply: { ...r.ai_reply!, text } } : r);
                return;
            }
            await supabase!.from('reviews').update({ 
                status: 'draft', 
                ai_reply: { text, created_at: new Date().toISOString() } 
            }).eq('id', reviewId);
        },
        addNote: async (reviewId: string, text: string) => {
            if (isDemoMode()) return { id: Date.now().toString(), text, author_name: 'Moi', created_at: new Date().toISOString() };
            const { data: { user } } = await supabase!.auth.getUser();
            const note = { id: crypto.randomUUID(), text, author_name: user?.user_metadata?.name || 'User', created_at: new Date().toISOString() };
            // In real DB, we would append to a JSONB array or a separate table.
            // Using RPC or array append approach:
            // await supabase.rpc('append_internal_note', { review_id: reviewId, note });
            return note;
        },
        addTag: async (reviewId: string, tag: string) => {
            // Implementation depends on DB structure
        },
        removeTag: async (reviewId: string, tag: string) => {
            // Implementation depends on DB structure
        },
        getTimeline: (review: Review): ReviewTimelineEvent[] => {
            const events: ReviewTimelineEvent[] = [
                { id: '1', type: 'review_created', actor_name: review.author_name, date: review.received_at, content: `A laissé un avis ${review.rating}★` }
            ];
            if (review.analysis) {
                events.push({ id: '2', type: 'ai_analysis', actor_name: 'Reviewflow AI', date: new Date(new Date(review.received_at).getTime() + 1000).toISOString(), content: `Sentiment: ${review.analysis.sentiment}` });
            }
            if (review.ai_reply) {
                events.push({ id: '3', type: 'draft_generated', actor_name: 'Reviewflow AI', date: review.ai_reply.created_at, content: 'Brouillon généré' });
            }
            if (review.status === 'sent' && review.replied_at) {
                events.push({ id: '4', type: 'reply_published', actor_name: 'Vous', date: review.replied_at, content: 'Réponse publiée' });
            }
            return events.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
        uploadCsv: async (file: File, locationId: string) => {
            // Mock upload
            return 50;
        },
        subscribe: (callback: (payload: any) => void) => {
            if (!supabase) return { unsubscribe: () => {} };
            return supabase.channel('reviews-all').on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, callback).subscribe();
        }
    },
    analytics: {
        getOverview: async (period = '30j'): Promise<AnalyticsSummary> => {
            if (isDemoMode()) return DEMO_STATS;
            // Real implementation would calculate aggregates via RPC or Edge Function
            return DEMO_STATS; 
        }
    },
    competitors: {
        list: async (): Promise<Competitor[]> => {
            if (isDemoMode()) return DEMO_COMPETITORS;
            const org = await api.organization.get();
            const { data } = await supabase!.from('competitors').select('*').eq('organization_id', org?.id);
            return data || [];
        },
        create: async (competitor: Partial<Competitor>) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('competitors').insert({ ...competitor, organization_id: org?.id });
        },
        delete: async (id: string) => {
            if (isDemoMode()) return;
            await supabase!.from('competitors').delete().eq('id', id);
        },
        getReports: async (): Promise<MarketReport[]> => {
            if (isDemoMode()) return [];
            const org = await api.organization.get();
            const { data } = await supabase!.from('market_reports').select('*').eq('organization_id', org?.id).order('created_at', { ascending: false });
            return data || [];
        },
        saveReport: async (report: Partial<MarketReport>) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('market_reports').insert({ ...report, organization_id: org?.id });
        },
        autoDiscover: async (radius: number, sector: string, lat: number, lng: number) => {
            const { data, error } = await supabase!.functions.invoke('fetch_places', {
                body: { latitude: lat, longitude: lng, radius, keyword: sector }
            });
            if (error) throw error;
            return data.results;
        },
        getDeepAnalysis: async (sector: string, location: string, competitors: Competitor[]) => {
            const { data, error } = await supabase!.functions.invoke('analyze_market', {
                body: { sector, location, competitors }
            });
            if (error) throw error;
            return data;
        }
    },
    automation: {
        getWorkflows: async (): Promise<WorkflowRule[]> => {
            if (isDemoMode()) return INITIAL_WORKFLOWS;
            const org = await api.organization.get();
            return org?.workflows || [];
        },
        saveWorkflow: async (workflow: WorkflowRule) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            let workflows = org?.workflows || [];
            const idx = workflows.findIndex(w => w.id === workflow.id);
            if (idx >= 0) workflows[idx] = workflow;
            else workflows.push(workflow);
            
            await supabase!.from('organizations').update({ workflows }).eq('id', org?.id);
        },
        deleteWorkflow: async (id: string) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            const workflows = org?.workflows?.filter(w => w.id !== id) || [];
            await supabase!.from('organizations').update({ workflows }).eq('id', org?.id);
        },
        run: async () => {
            const { data, error } = await supabase!.functions.invoke('process_reviews');
            if (error) throw error;
            return data;
        }
    },
    notifications: {
        list: async (): Promise<AppNotification[]> => {
            return [
                { id: '1', type: 'info', title: 'Bienvenue !', message: 'Commencez par connecter votre fiche Google.', read: false, created_at: new Date().toISOString() }
            ];
        },
        markAllRead: async () => { },
        sendTestEmail: async () => {
            const user = await api.auth.getUser();
            if (!user?.email) return;
            await supabase!.functions.invoke('send_campaign_emails', {
                body: { 
                    emails: [user.email], 
                    subject: 'Test Reviewflow', 
                    html: '<h1>Ceci est un test</h1><p>Tout fonctionne !</p>'
                }
            });
        }
    },
    team: {
        list: async (): Promise<User[]> => {
            if (isDemoMode()) return [DEMO_USER];
            const org = await api.organization.get();
            const { data } = await supabase!.from('users').select('*').eq('organization_id', org?.id);
            return data || [];
        },
        invite: async (email: string, role: string) => {
            if (isDemoMode()) return;
            await supabase!.functions.invoke('invite_user', { body: { email, role } });
        }
    },
    global: {
        search: async (term: string) => {
            // Mock search
            return [];
        }
    },
    ai: {
        generateReply: async (review: Review, config?: any) => {
            if (isDemoMode()) return "Merci pour votre avis ! (Mode Démo)";
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { task: 'generate_reply', context: { review, ...config } }
            });
            if (error) throw error;
            return data.text;
        },
        generateSocialPost: async (review: Review, platform: string, config?: any) => {
            if (isDemoMode()) return `Super avis de ${review.author_name} ! ⭐⭐⭐⭐⭐ "${review.body}" #Reviewflow`;
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { task: 'social_post', context: { review, platform }, config }
            });
            if (error) throw error;
            return data.text;
        },
        runCustomTask: async (payload: any) => {
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { ...payload }
            });
            if (error) throw error;
            return data;
        },
        previewBrandVoice: async (settings: BrandSettings, sampleReview: any) => {
            // Reuse generate reply logic with specific settings
            return api.ai.generateReply(sampleReview, { tone: settings.tone });
        }
    },
    social: {
        getPosts: async (): Promise<SocialPost[]> => {
            if (isDemoMode()) {
                const now = new Date();
                return [
                    { 
                        id: 'sp1', 
                        platform: 'instagram', 
                        content: 'Découvrez notre nouveau menu ! 🥗', 
                        scheduled_date: new Date(now.getTime() + 86400000).toISOString(), 
                        status: 'scheduled',
                        tags: ['Promotion', 'Produit']
                    },
                    { 
                        id: 'sp2', 
                        platform: 'facebook', 
                        content: 'Soirée spéciale Jazz ce vendredi 🎷', 
                        scheduled_date: new Date(now.getTime() + 172800000).toISOString(), 
                        status: 'scheduled',
                        tags: ['Évènement']
                    },
                    // Mock Published History
                    {
                        id: 'sp3',
                        platform: 'instagram',
                        content: 'Merci à tous pour vos retours ! ❤️',
                        scheduled_date: new Date(now.getTime() - 86400000).toISOString(),
                        status: 'published',
                        published_url: 'https://instagram.com',
                        tags: ['Remerciement']
                    }
                ];
            }
            const org = await api.organization.get();
            const { data } = await supabase!.from('social_posts').select('*').eq('organization_id', org?.id);
            return data || [];
        },
        schedulePost: async (post: Partial<SocialPost>): Promise<SocialPost> => {
            if (isDemoMode()) return { id: 'new-' + Date.now(), ...post, status: 'scheduled' } as SocialPost;
            const org = await api.organization.get();
            const { data, error } = await supabase!.from('social_posts').insert({ ...post, organization_id: org?.id, status: 'scheduled' }).select().single();
            if (error) throw error;
            return data;
        },
        updatePost: async (id: string, post: Partial<SocialPost>): Promise<SocialPost> => {
            if (isDemoMode()) return { id, ...post } as SocialPost; // Mock update
            const { data, error } = await supabase!.from('social_posts').update(post).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        deletePost: async (id: string) => {
            await supabase!.from('social_posts').delete().eq('id', id);
        },
        getAccounts: async (): Promise<SocialAccount[]> => {
            if (isDemoMode()) return [{ id: '1', platform: 'instagram', name: 'Demo Account', connected_at: new Date().toISOString() }];
            const org = await api.organization.get();
            const { data } = await supabase!.from('social_accounts').select('*').eq('organization_id', org?.id);
            return data || [];
        },
        handleCallback: async (platform: string, code: string) => {
            const { error } = await supabase!.functions.invoke('social_oauth', {
                body: { action: 'exchange', platform, code, redirectUri: window.location.origin + '/social' }
            });
            if (error) throw error;
        },
        connectAccount: async (platform: string) => {
            // Mock logic for demo, real would redirect to specific OAuth URL
            if (platform === 'facebook') window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${import.meta.env.VITE_FACEBOOK_CLIENT_ID}&redirect_uri=${window.location.origin}/social&state=${btoa(JSON.stringify({platform: 'facebook'}))}&scope=pages_show_list,pages_read_engagement,pages_manage_posts`;
            // Add others...
        },
        getTemplates: async (): Promise<SocialTemplate[]> => {
            return []; // To be implemented with DB
        },
        saveTemplate: async (template: Partial<SocialTemplate>) => {
            // Just local mock or DB insert
        }
    },
    campaigns: {
        send: async (type: 'sms'|'email', recipient: string, subject: string, content: string) => {
            if (isDemoMode()) return;
            if (type === 'email') {
                await supabase!.functions.invoke('send_campaign_emails', {
                    body: { emails: [recipient], subject, html: content }
                });
            }
        }
    },
    public: {
        getLocationInfo: async (id: string) => {
            if (isDemoMode() || id === 'loc-1') return DEMO_ORG.locations[0];
            const { data } = await supabase!.from('locations').select('*').eq('id', id).single();
            return data;
        },
        getActiveOffer: async (locationId: string, rating: number): Promise<Offer | null> => {
            // Mock logic
            if (rating >= 5) return { 
                id: 'off1', 
                title: 'Café Offert', 
                description: 'Sur présentation de ce code', 
                code_prefix: 'CAFE', 
                style: { icon: 'coffee', color: '#000' },
                trigger_rating: 5,
                active: true,
                expiry_days: 30,
                stats: { distributed: 0, redeemed: 0 }
            };
            return null;
        },
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => {
            if (isDemoMode()) return;
            const { error } = await supabase!.functions.invoke('submit_review', {
                body: { locationId, rating, feedback, contact, tags, staffName }
            });
            if (error) throw error;
        },
        getWidgetReviews: async (locationId: string) => {
            if (isDemoMode()) return DEMO_REVIEWS;
            const { data } = await supabase!.from('reviews').select('*').eq('location_id', locationId).order('received_at', { ascending: false }).limit(20);
            return (data || []).map(r => ({...r, body: r.text}));
        }
    },
    offers: {
        create: async (offer: Partial<Offer>) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('offers').insert({ ...offer, organization_id: org?.id });
        },
        distributeCampaign: async (offerId: string, segment: string, channel: string) => {
            return { sent_count: 150 }; // Mock
        },
        validate: async (code: string) => {
            if (isDemoMode()) return { valid: true, discount: 'Café Offert' };
            const { data, error } = await supabase!.functions.invoke('manage_coupons', {
                body: { action: 'validate', code }
            });
            if (error) throw error;
            return data;
        },
        redeem: async (code: string) => {
            if (isDemoMode()) return true;
            const { error } = await supabase!.functions.invoke('manage_coupons', {
                body: { action: 'redeem', code }
            });
            if (error) throw error;
        },
        generateCoupon: async (offerId: string, email: string) => {
            if (isDemoMode()) return { code: 'DEMO-123', offer_title: 'Offre Démo', discount_detail: 'Gratuit', expires_at: new Date(Date.now() + 86400000).toISOString() };
            const { data, error } = await supabase!.functions.invoke('manage_coupons', {
                body: { action: 'create', offerId, email }
            });
            if (error) throw error;
            return data;
        }
    },
    activity: {
        getRecent: async () => {
            return [
                { id: 1, type: 'review', text: 'Nouvel avis 5 étoiles reçu', location: 'Paris', time: 'Il y a 2 min' },
                { id: 2, type: 'alert', text: 'Réponse approuvée automatiquement', location: 'Lyon', time: 'Il y a 1h' }
            ];
        }
    },
    billing: {
        getInvoices: async () => {
            if (isDemoMode()) return [];
            const { data } = await supabase!.functions.invoke('get_invoices');
            return data?.invoices || [];
        },
        createCheckoutSession: async (plan: string) => {
            if (isDemoMode()) return '#';
            const { data } = await supabase!.functions.invoke('create_checkout', { body: { plan } });
            return data.url;
        },
        createPortalSession: async () => {
            if (isDemoMode()) return '#';
            const { data } = await supabase!.functions.invoke('create_portal');
            return data.url;
        }
    },
    onboarding: {
        checkStatus: async (): Promise<SetupStatus> => {
            // Logic to check DB fields
            return {
                completionPercentage: 33,
                googleConnected: false,
                brandVoiceConfigured: false,
                firstReviewReplied: false
            };
        }
    },
    admin: {
        getStats: async () => {
            return { mrr: '12 450 €', active_tenants: 142, total_reviews_processed: 45000, tenants: [] };
        }
    },
    company: {
        search: async (query: string) => {
            return []; // Connect to Sirene API or similar
        }
    },
    locations: {
        create: async (data: Partial<Location>) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('locations').insert({ ...data, organization_id: org?.id });
        },
        update: async (id: string, data: Partial<Location>) => {
            if (isDemoMode()) return;
            await supabase!.from('locations').update(data).eq('id', id);
        },
        delete: async (id: string) => {
            await supabase!.from('locations').delete().eq('id', id);
        },
        importFromGoogle: async () => {
            // Trigger cloud function or local sync
            const { data } = await supabase!.functions.invoke('cron_sync_reviews');
            return data?.report?.length || 0;
        }
    },
    customers: {
        list: async (): Promise<Customer[]> => {
            if (isDemoMode()) return [];
            // This would likely come from a 'customers' table in real DB
            return mockCustomers; 
        },
        update: async (id: string, data: Partial<Customer>) => {
            // Mock update
        },
        enrichProfile: async (id: string) => {
            // Call AI
            return { profile: "Client exigeant mais fidèle", suggestion: "Offrir un dessert" };
        }
    },
    system: {
        checkHealth: async () => {
            const start = Date.now();
            const { error } = await supabase!.from('users').select('count', { count: 'exact', head: true });
            return { db: !error, latency: Date.now() - start };
        }
    },
    seedCloudDatabase: async () => {
        // Only for dev
    },
    google: {
        fetchAllGoogleLocations: async () => {
            if (isDemoMode()) return [];
            const { data: { session } } = await supabase!.auth.getSession();
            if (!session?.provider_token) throw new Error("No Google Token");
            
            const { data, error } = await supabase!.functions.invoke('fetch_google_locations', {
                body: { accessToken: session.provider_token }
            });
            if (error) throw error;
            return data;
        },
        syncReviewsForLocation: async (locationId: string, googleLocationName: string) => {
            if (isDemoMode()) return 5;
            const org = await api.organization.get();
            const { data, error } = await supabase!.functions.invoke('fetch_google_reviews', {
                body: { locationId, googleLocationName, organizationId: org?.id }
            });
            if (error) throw error;
            return data.count;
        }
    }
};
