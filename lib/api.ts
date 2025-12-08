


import { supabase } from './supabase';
import { 
    INITIAL_USERS, 
    INITIAL_ORG, 
    INITIAL_REVIEWS, 
    INITIAL_ANALYTICS, 
    INITIAL_WORKFLOWS, 
    INITIAL_REPORTS, 
    INITIAL_COMPETITORS,
    INITIAL_SOCIAL_POSTS
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
    SocialTemplate,
    SocialLog,
    ShortLink,
    CampaignLog
} from '../types';

const isDemoMode = () => {
    return localStorage.getItem('is_demo_mode') === 'true' || !supabase;
};

// --- MOCK STORAGE FOR DEMO MODE ---
let mockReviews = [...DEMO_REVIEWS, ...INITIAL_REVIEWS];
let mockPosts: SocialPost[] = INITIAL_SOCIAL_POSTS ? [...INITIAL_SOCIAL_POSTS] : [];
let mockLogs: SocialLog[] = [
    { id: '1', post_id: 'sp3', platform: 'instagram', status: 'success', message: 'Published successfully', created_at: new Date(Date.now() - 86400000).toISOString() }
];
let mockCustomers: Customer[] = [
    { id: 'cust1', name: 'Jean Dupont', source: 'Google', stage: 'new', average_rating: 4.5, total_reviews: 2, last_interaction: new Date().toISOString(), status: 'promoter', ltv_estimate: 150, email: 'jean.dupont@demo.com', phone: '+33612345678' },
    { id: 'cust2', name: 'Marie Martin', source: 'Facebook', stage: 'risk', average_rating: 2.0, total_reviews: 1, last_interaction: new Date(Date.now() - 1000000000).toISOString(), status: 'detractor', ltv_estimate: 45, email: 'marie.m@demo.com', phone: '+33698765432' },
    { id: 'cust3', name: 'Sophie Bernard', source: 'Google', stage: 'loyal', average_rating: 5.0, total_reviews: 5, last_interaction: new Date().toISOString(), status: 'promoter', ltv_estimate: 450, email: 'sophie.b@demo.com', phone: '+33611223344' }
];
// Mock Campaign History
let mockCampaignHistory: CampaignLog[] = [
    { id: 'camp1', type: 'email', status: 'completed', subject: 'Merci de votre visite !', content: 'Laissez-nous un avis...', segment_name: 'VIP', recipient_count: 120, success_count: 118, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'camp2', type: 'sms', status: 'completed', content: 'Promo flash -20% code SUMMER', segment_name: 'Tous les clients', recipient_count: 450, success_count: 440, created_at: new Date(Date.now() - 86400000 * 5).toISOString() }
];

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
            window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID}&redirect_uri=${window.location.origin}/auth/callback&response_type=code&scope=https://www.googleapis.com/auth/business.manage`;
        },
        updateProfile: async (data: Partial<User> & { password?: string }) => {
            if (isDemoMode()) return { ...DEMO_USER, ...data };
            const { data: user } = await supabase!.auth.getUser();
            if (!user.user) throw new Error("Not authenticated");
            
            if (data.password) {
                const { error } = await supabase!.auth.updateUser({ password: data.password });
                if (error) throw error;
                delete data.password; 
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
                        integrations: { google: true }
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
            return true;
        },
        simulatePlanChange: async (plan: string) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('organizations').update({ subscription_plan: plan }).eq('id', org?.id);
        },
        addStaffMember: async (name: string, role: string, email?: string) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            await supabase!.from('staff_members').insert({ name, role, email, organization_id: org?.id });
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
            const showArchived = filters.archived === true;

            if (isDemoMode()) {
                let res = mockReviews;
                if (!showArchived) {
                    res = res.filter(r => !r.archived);
                } else {
                    res = res.filter(r => r.archived);
                }

                if (filters.status) {
                    if (filters.status === 'todo') res = res.filter(r => ['pending', 'draft'].includes(r.status));
                    else if (filters.status === 'done') res = res.filter(r => ['sent', 'manual'].includes(r.status));
                    else res = res.filter(r => r.status === filters.status);
                }
                
                if (filters.rating && filters.rating !== 'Tout') res = res.filter(r => r.rating === parseInt(filters.rating.toString().replace(' ★', '')));
                
                // Date Filtering Mock
                if (filters.startDate) {
                    res = res.filter(r => new Date(r.received_at) >= new Date(filters.startDate));
                }
                if (filters.endDate) {
                    res = res.filter(r => new Date(r.received_at) <= new Date(filters.endDate));
                }

                return res;
            }
            if (!supabase) return [];
            const org = await api.organization.get();
            let query = supabase.from('reviews').select('*').in('location_id', org?.locations.map(l => l.id) || []);
            
            // Handle archived state filter
            if (showArchived) {
                query = query.eq('archived', true);
            } else {
                // By default, only show non-archived reviews or where archived is null
                query = query.or('archived.is.null,archived.eq.false');
            }

            if (filters.status) {
                if (filters.status === 'todo') {
                    query = query.in('status', ['pending', 'draft']);
                } else if (filters.status === 'done') {
                    query = query.in('status', ['sent', 'manual']);
                } else if (filters.status !== 'Tout') {
                    query = query.eq('status', filters.status);
                }
            }
            if (filters.source && filters.source !== 'Tout') query = query.eq('source', filters.source.toLowerCase());
            if (filters.rating && filters.rating !== 'Tout') {
                const rating = parseInt(filters.rating.toString().replace(' ★', ''));
                if (!isNaN(rating)) query = query.eq('rating', rating);
            }
            if (filters.search) query = query.ilike('text', `%${filters.search}%`);
            
            // Date Filtering
            if (filters.startDate) query = query.gte('received_at', filters.startDate);
            if (filters.endDate) query = query.lte('received_at', filters.endDate);

            if (filters.page !== undefined && filters.limit) {
                query = query.range(filters.page * filters.limit, (filters.page + 1) * filters.limit - 1);
            }
            
            const { data } = await query.order('received_at', { ascending: false });
            return (data || []).map(r => ({...r, body: r.text}));
        },
        getCounts: async (): Promise<{ todo: number, done: number }> => {
            if (isDemoMode()) {
                return {
                    todo: mockReviews.filter(r => !r.archived && ['pending', 'draft'].includes(r.status)).length,
                    done: mockReviews.filter(r => !r.archived && ['sent', 'manual'].includes(r.status)).length
                };
            }
            if (!supabase) return { todo: 0, done: 0 };
            const org = await api.organization.get();
            const locIds = org?.locations.map(l => l.id) || [];
            
            if (locIds.length === 0) return { todo: 0, done: 0 };

            // Count TODO
            const { count: todo } = await supabase
                .from('reviews')
                .select('*', { count: 'exact', head: true })
                .in('location_id', locIds)
                .in('status', ['pending', 'draft'])
                .or('archived.is.null,archived.eq.false');

            // Count DONE
            const { count: done } = await supabase
                .from('reviews')
                .select('*', { count: 'exact', head: true })
                .in('location_id', locIds)
                .in('status', ['sent', 'manual'])
                .or('archived.is.null,archived.eq.false');

            return { todo: todo || 0, done: done || 0 };
        },
        reply: async (reviewId: string, text: string) => {
            if (isDemoMode()) {
                mockReviews = mockReviews.map(r => r.id === reviewId ? { ...r, status: 'sent', posted_reply: text, replied_at: new Date().toISOString() } : r);
                return;
            }
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
            return note;
        },
        addTag: async (reviewId: string, tag: string) => {
            if (isDemoMode()) {
                mockReviews = mockReviews.map(r => {
                    if (r.id === reviewId) {
                        return { ...r, tags: [...(r.tags || []), tag] };
                    }
                    return r;
                });
            }
        },
        removeTag: async (reviewId: string, tag: string) => {
            if (isDemoMode()) {
                mockReviews = mockReviews.map(r => {
                    if (r.id === reviewId) {
                        return { ...r, tags: r.tags?.filter(t => t !== tag) || [] };
                    }
                    return r;
                });
            }
        },
        archive: async (reviewId: string) => {
            if (isDemoMode()) {
                mockReviews = mockReviews.map(r => r.id === reviewId ? { ...r, archived: true } : r);
                return;
            }
            await supabase!.from('reviews').update({ archived: true }).eq('id', reviewId);
        },
        unarchive: async (reviewId: string) => {
            if (isDemoMode()) {
                mockReviews = mockReviews.map(r => r.id === reviewId ? { ...r, archived: false } : r);
                return;
            }
            await supabase!.from('reviews').update({ archived: false }).eq('id', reviewId);
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
                    recipients: [{ email: user.email, name: user.name }], 
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
        generateSms: async (context: any) => {
            if (isDemoMode()) return `Bonjour ! Profitez de ${context.offerTitle} avec le code ${context.offerCode}. A bientôt !`;
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { task: 'generate_sms', context }
            });
            if (error) throw error;
            return data.text;
        },
        generateEmailCampaign: async (context: any) => {
            if (isDemoMode()) return { subject: "Offre exclusive : -20% sur tout !", body: "<p>Bonjour {{name}},</p><p>Profitez de notre offre...</p>" };
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { task: 'generate_email_campaign', context }
            });
            if (error) throw error;
            
            try {
                // Ensure text is clean JSON
                let jsonText = data.text;
                jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(jsonText);
            } catch (e) {
                return { subject: "Campagne", body: data.text }; // Fallback
            }
        },
        runCustomTask: async (payload: any) => {
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { ...payload }
            });
            if (error) throw error;
            return data;
        },
        previewBrandVoice: async (settings: BrandSettings, sampleReview: any) => {
            return api.ai.generateReply(sampleReview, { tone: settings.tone });
        },
        generateManagerAdvice: async (member: StaffMember, rank: number, type: 'volume' | 'quality') => {
            if (isDemoMode()) {
                if (type === 'volume') return `Pour booster ${member.name}, proposez-lui un mini-challenge : 5 avis collectés cette semaine = une récompense immédiate !`;
                return `${member.name} a une bonne note (${member.average_rating}/5). Encouragez-le à demander aux clients satisfaits de mentionner son prénom dans l'avis.`;
            }
            const { data, error } = await supabase!.functions.invoke('ai_generate', {
                body: { 
                    task: 'generate_manager_advice', 
                    context: { 
                        name: member.name, 
                        role: member.role, 
                        reviewCount: member.reviews_count, 
                        avgRating: member.average_rating, 
                        rank, 
                        type 
                    } 
                }
            });
            if (error) throw error;
            return data.text;
        }
    },
    links: {
        createShortLink: async (targetUrl: string): Promise<ShortLink> => {
            const slug = Math.random().toString(36).substr(2, 6);
            const shortUrl = `avis.reviewflow.com/v/${slug}`;
            
            // In demo mode or mockup, just return the obj
            if (isDemoMode()) {
                return {
                    id: 'mock-short-id-' + Date.now(),
                    slug,
                    target_url: targetUrl,
                    short_url: shortUrl,
                    organization_id: 'demo-org-id',
                    clicks: 0,
                    created_at: new Date().toISOString()
                };
            }
            
            // In real app, call backend to store link mapping
            // const { data, error } = await supabase.from('short_links').insert({...}).select().single();
            // return data;
            
            // Simulating real backend success
            return {
                id: 'real-short-id-' + Date.now(),
                slug,
                target_url: targetUrl,
                short_url: shortUrl,
                organization_id: 'org',
                clicks: 0,
                created_at: new Date().toISOString()
            };
        }
    },
    social: {
        getPosts: async (locationId?: string): Promise<SocialPost[]> => {
            if (isDemoMode()) {
                let res = mockPosts;
                if (locationId) res = res.filter(p => p.location_id === locationId);
                return res;
            }
            const org = await api.organization.get();
            let query = supabase!.from('social_posts').select('*').eq('organization_id', org?.id);
            if (locationId) query = query.eq('location_id', locationId);
            const { data } = await query;
            return data || [];
        },
        schedulePost: async (post: Partial<SocialPost>): Promise<SocialPost> => {
            if (isDemoMode()) {
                const newPost = { id: 'new-' + Date.now(), ...post, status: 'scheduled' } as SocialPost;
                mockPosts.push(newPost);
                return newPost;
            }
            const org = await api.organization.get();
            const { data, error } = await supabase!.from('social_posts').insert({ ...post, organization_id: org?.id, status: 'scheduled' }).select().single();
            if (error) throw error;
            return data;
        },
        updatePost: async (id: string, post: Partial<SocialPost>): Promise<SocialPost> => {
            if (isDemoMode()) {
                const updated = { id, ...post } as SocialPost;
                mockPosts = mockPosts.map(p => p.id === id ? { ...p, ...post } : p);
                return updated;
            }
            const { data, error } = await supabase!.from('social_posts').update(post).eq('id', id).select().single();
            if (error) throw error;
            return data;
        },
        deletePost: async (id: string) => {
            if (isDemoMode()) {
                mockPosts = mockPosts.filter(p => p.id !== id);
                return;
            }
            await supabase!.from('social_posts').delete().eq('id', id);
        },
        getAccounts: async (locationId?: string): Promise<SocialAccount[]> => {
            if (isDemoMode()) return [{ id: '1', platform: 'instagram', name: 'Demo Account', connected_at: new Date().toISOString(), location_id: locationId }];
            const org = await api.organization.get();
            let query = supabase!.from('social_accounts').select('*').eq('organization_id', org?.id);
            if (locationId) query = query.eq('location_id', locationId);
            const { data } = await query;
            return data || [];
        },
        handleCallback: async (platform: string, code: string) => {
            const { error } = await supabase!.functions.invoke('social_oauth', {
                body: { action: 'exchange', platform, code, redirectUri: window.location.origin + '/social' }
            });
            if (error) throw error;
        },
        connectAccount: async (platform: string) => {
            if (platform === 'facebook') window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${import.meta.env.VITE_FACEBOOK_CLIENT_ID}&redirect_uri=${window.location.origin}/social&state=${btoa(JSON.stringify({platform: 'facebook'}))}&scope=pages_show_list,pages_read_engagement,pages_manage_posts`;
        },
        getTemplates: async (locationId?: string): Promise<SocialTemplate[]> => {
            return []; // To be implemented with DB
        },
        saveTemplate: async (template: Partial<SocialTemplate>) => {
            // Local mock or DB
        },
        getLogs: async (): Promise<SocialLog[]> => {
            if (isDemoMode()) return mockLogs;
            return mockLogs; 
        },
        publishNow: async (postId: string) => {
            if (isDemoMode()) {
                const log: SocialLog = { id: 'new-log', post_id: postId, platform: 'instagram', status: 'success', message: 'Published successfully (Demo)', created_at: new Date().toISOString() };
                mockLogs.unshift(log);
                return { success: true };
            }
            const { data, error } = await supabase!.functions.invoke('publish_social', {
                body: { postId }
            });
            if (error) throw error;
            return data;
        },
        uploadMedia: async (file: File): Promise<string> => {
            if (isDemoMode()) {
                // Return a fake object URL for preview
                return URL.createObjectURL(file);
            }
            // Real Supabase Storage upload
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `social-media/${fileName}`;
            
            const { error: uploadError } = await supabase!.storage.from('assets').upload(filePath, file);
            if (uploadError) throw uploadError;
            
            const { data } = supabase!.storage.from('assets').getPublicUrl(filePath);
            return data.publicUrl;
        }
    },
    campaigns: {
        getHistory: async (): Promise<CampaignLog[]> => {
            // Should be fetched from DB in real scenario
            return mockCampaignHistory.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        },
        send: async (type: 'sms'|'email', recipients: string | any[], subject: string, content: string, segmentName?: string, funnelLink?: string): Promise<CampaignLog> => {
            
            // recipients can be a segment ID string (e.g. "list:vip"), a raw email string, or an array of customer objects.
            let recipientsList: any[] = [];

            if (typeof recipients === 'string') {
                if (recipients.startsWith('list:')) {
                    throw new Error("Please pass a recipient array for segments.");
                } else {
                    recipientsList = [{ email: recipients, name: 'Client' }];
                }
            } else if (Array.isArray(recipients)) {
                recipientsList = recipients;
            }

            if (isDemoMode()) {
                // Mock success and return a CampaignLog
                const log: CampaignLog = {
                    id: 'camp-' + Date.now(),
                    type,
                    status: 'completed',
                    subject: type === 'email' ? subject : undefined,
                    content,
                    recipient_count: recipientsList.length,
                    success_count: Math.floor(recipientsList.length * 0.98), // Mock 98% success
                    segment_name: segmentName || 'Custom',
                    funnel_link: funnelLink,
                    created_at: new Date().toISOString()
                };
                mockCampaignHistory.unshift(log);
                return log;
            }

            if (type === 'email') {
                await supabase!.functions.invoke('send_campaign_emails', {
                    body: { 
                        recipients: recipientsList, 
                        subject, 
                        html: content 
                    }
                });
            } else if (type === 'sms') {
                const org = await api.organization.get();
                if (!org?.twilio_settings?.account_sid) {
                    throw new Error("Twilio non configuré dans les paramètres");
                }
                
                // For SMS, we simplify and just send to the first one or loop
                for (const r of recipientsList.slice(0, 10)) { // Safety limit for demo
                    const phone = r.phone || r.email; // Fallback? No, need phone.
                    if (phone && (phone.startsWith('+') || phone.length > 9)) {
                         await supabase!.functions.invoke('send_sms_campaign', {
                            body: { 
                                to: phone, 
                                body: content 
                            }
                        });
                    }
                }
            }

            // Real backend should generate and return the ID. Mocking response for now.
            return {
                id: 'real-camp-' + Date.now(),
                type,
                status: 'completed',
                subject,
                content,
                segment_name: segmentName || 'List',
                recipient_count: recipientsList.length,
                success_count: recipientsList.length,
                funnel_link: funnelLink,
                created_at: new Date().toISOString()
            };
        },
        requestQuote: async (data: any) => {
            if (isDemoMode()) return;
            const org = await api.organization.get();
            const { error } = await supabase!.from('campaign_requests').insert({
                organization_id: org?.id,
                contact_name: data.name,
                contact_email: data.email,
                needs_description: data.needs,
                estimated_volume: data.volume,
                created_at: new Date().toISOString()
            });
            if (error) throw error;
        }
    },
    public: {
        getLocationInfo: async (id: string) => {
            if (isDemoMode() || id === 'loc-1') return DEMO_ORG.locations[0];
            const { data } = await supabase!.from('locations').select('*').eq('id', id).single();
            return data;
        },
        getActiveOffer: async (locationId: string, rating: number): Promise<Offer | null> => {
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
    google: {
        fetchAllGoogleLocations: async () => {
            if (isDemoMode()) return [];
            // Requires accessToken, usually handled via backend or client-side context. 
            // Assuming backend proxy or using stored token via edge function
            const { data, error } = await supabase!.functions.invoke('fetch_google_locations');
            if (error) throw error;
            return data;
        },
        syncReviewsForLocation: async (locationId: string, resourceName: string) => {
            if (isDemoMode()) return 5;
            const org = await api.organization.get();
            const { data, error } = await supabase!.functions.invoke('fetch_google_reviews', {
                body: { locationId, googleLocationName: resourceName, organizationId: org?.id }
            });
            if (error) throw error;
            return data.count;
        }
    },
    system: {
        checkHealth: async () => {
            if (!supabase) return { db: false, latency: 0 };
            const start = Date.now();
            const { error } = await supabase.from('users').select('count').limit(1).single();
            return { db: !error, latency: Date.now() - start };
        }
    },
    company: {
        search: async (query: string) => {
            // Mock API call to sirene or similar
            if (isDemoMode()) {
                return [
                    { legal_name: query + ' SAS', siret: '12345678900012', address: '10 Rue de Paris' }
                ];
            }
            return []; // Placeholder for real implementation
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
            if (isDemoMode()) return;
            await supabase!.from('locations').delete().eq('id', id);
        },
        importFromGoogle: async () => {
            if (isDemoMode()) return 3;
            const { data, error } = await supabase!.functions.invoke('fetch_google_locations');
            if (error) throw error;
            // logic to match and save would typically be here or inside function, simplifying to return count
            return data?.length || 0; 
        }
    },
    activity: {
        getRecent: async () => {
            // Mock or DB call
            return [
                { id: '1', type: 'review', text: 'Nouvel avis 5 étoiles reçu', location: 'Paris', time: '2 min' },
                { id: '2', type: 'alert', text: 'Avis négatif détecté', location: 'Lyon', time: '1h' },
                { id: '3', type: 'reply', text: 'Réponse automatique envoyée', location: 'Paris', time: '3h' }
            ];
        }
    },
    onboarding: {
        checkStatus: async (): Promise<SetupStatus> => {
            if (isDemoMode()) return { completionPercentage: 30, googleConnected: false, brandVoiceConfigured: false, firstReviewReplied: false };
            const org = await api.organization.get();
            return {
                completionPercentage: org?.integrations.google ? 100 : 30,
                googleConnected: !!org?.integrations.google,
                brandVoiceConfigured: !!org?.brand?.tone,
                firstReviewReplied: false // Placeholder, check reviews table in real app
            };
        }
    },
    seedCloudDatabase: async () => {
        // Demo function to populate empty DB
        console.log("Seeding database...");
    },
    billing: {
        getInvoices: async () => {
            if (isDemoMode()) return [];
            const { data, error } = await supabase!.functions.invoke('get_invoices');
            if (error) throw error;
            return data.invoices;
        },
        createCheckoutSession: async (plan: string) => {
            if (isDemoMode()) return 'https://checkout.stripe.com/demo';
            const { data, error } = await supabase!.functions.invoke('create_checkout', { body: { plan } });
            if (error) throw error;
            return data.url;
        },
        createPortalSession: async () => {
            if (isDemoMode()) return 'https://billing.stripe.com/demo';
            const { data, error } = await supabase!.functions.invoke('create_portal');
            if (error) throw error;
            return data.url;
        }
    },
    customers: {
        list: async (): Promise<Customer[]> => {
            if (isDemoMode()) return mockCustomers; 
            const { data } = await supabase!.from('customers').select('*');
            return data || [];
        },
        update: async (id: string, data: Partial<Customer>) => {
            if (isDemoMode()) return;
            await supabase!.from('customers').update(data).eq('id', id);
        },
        enrichProfile: async (id: string) => {
            if (isDemoMode()) return { profile: "Client exigent", suggestion: "Offrir un dessert" };
            const { data, error } = await supabase!.functions.invoke('ai_generate', { body: { task: 'enrich_customer', context: { customerId: id } } });
            if (error) throw error;
            return data.insight;
        }
    },
    admin: {
        getStats: async () => {
            return {
                mrr: '12,450€',
                active_tenants: 142,
                total_reviews_processed: 45000,
                tenants: [
                    { id: '1', name: 'Org Demo', admin_email: 'demo@org.com', plan: 'pro', usage: 120, mrr: '89€' }
                ]
            };
        }
    }
};