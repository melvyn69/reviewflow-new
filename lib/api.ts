
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
import { hasAccess } from './features'; 

// --- GOD MODE CONFIGURATION ---
// These emails will ALWAYS be Super Admin with Elite Plan, no matter what.
const GOD_EMAILS = ['melvynbenichou@gmail.com', 'demo@reviewflow.com', 'god@reviewflow.com'];

const isDemoMode = () => localStorage.getItem('is_demo_mode') === 'true';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    auth: {
        getUser: async (): Promise<User | null> => {
            // Priority 1: Check LocalStorage
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                
                // FORCE UPGRADE ON READ
                if (GOD_EMAILS.includes(user.email)) {
                    if (user.role !== 'super_admin') {
                        user.role = 'super_admin'; // Force role
                        localStorage.setItem('user', JSON.stringify(user)); // Persist fix
                    }
                    return user;
                }
                return user;
            }
            // Priority 2: Check Supabase Session
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Fetch profile details
                    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
                    if (profile) {
                        const fullUser = {
                            id: user.id,
                            email: user.email || '',
                            name: profile.name || 'Utilisateur',
                            role: profile.role || 'viewer',
                            organization_id: profile.organization_id,
                            is_super_admin: profile.is_super_admin
                        };
                        localStorage.setItem('user', JSON.stringify(fullUser));
                        return fullUser;
                    }
                }
            }
            return null;
        },
        login: async (email: string, pass: string) => {
            await delay(500);
            
            const normalizedEmail = (email || '').toLowerCase().trim();
            
            // --- BACKDOOR GOD MODE (Ignore Password) ---
            if (GOD_EMAILS.includes(normalizedEmail)) {
                const godUser: User = {
                    id: 'god-user-' + Date.now(),
                    name: 'Melvyn (Super Admin)',
                    email: normalizedEmail,
                    role: 'super_admin',
                    avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=ef4444&color=fff',
                    organization_id: 'org1',
                    organizations: ['org1']
                };
                
                // Force Demo Mode to ensure DB calls don't fail due to RLS/UUID mismatch
                localStorage.setItem('user', JSON.stringify(godUser));
                localStorage.setItem('is_demo_mode', 'true'); 
                
                return godUser;
            }

            // Standard Login
            if (supabase) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
                if (error) throw new Error("Email ou mot de passe incorrect.");
                
                // Fetch profile to verify organization link
                const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single();
                
                const user: User = {
                    id: data.user.id,
                    email: data.user.email || '',
                    name: profile?.name || 'Utilisateur',
                    role: profile?.role || 'admin',
                    organization_id: profile?.organization_id,
                    is_super_admin: profile?.is_super_admin
                };
                
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.removeItem('is_demo_mode');
                return user;
            }

            throw new Error("Identifiants incorrects.");
        },
        logout: async () => {
            localStorage.clear();
            if (supabase) await supabase.auth.signOut();
        },
        register: async (name: string, email: string, password?: string) => {
            if (supabase) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password: password || 'temp-pass-123',
                    options: {
                        data: { full_name: name }
                    }
                });
                if (error) throw error;
                // Note: The triggers in DB will handle user/org creation
                return { ...INITIAL_USERS[0], email, name };
            }
            await delay(1000);
            return { ...INITIAL_USERS[0], name, email };
        },
        connectGoogleBusiness: async () => { 
            if (supabase) {
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin,
                        scopes: 'https://www.googleapis.com/auth/business.manage',
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent'
                        }
                    }
                });
                if (error) throw error;
            }
            return true; 
        },
        updateProfile: async (data: any) => {
            const current = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...current, ...data }));
            if(supabase && !isDemoMode()) {
                await supabase.from('users').update(data).eq('id', current.id);
            }
        },
        changePassword: async () => { await delay(1000); },
        deleteAccount: async () => { 
            if (supabase && !isDemoMode()) {
                await supabase.functions.invoke('delete_account');
            }
            localStorage.clear(); 
        },
        resetPassword: async (email: string) => { 
            if (supabase) await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/#/login?mode=reset' });
        },
        loginWithGoogle: async () => { 
            if (supabase) {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin,
                        queryParams: { access_type: 'offline', prompt: 'consent' }
                    }
                });
                if (error) throw error;
            }
        }
    },
    organization: {
        get: async (): Promise<Organization | null> => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    const { data } = await supabase
                        .from('organizations')
                        .select('*, locations(*)')
                        .eq('id', user.organization_id)
                        .single();
                    return data;
                }
            }
            
            // Fallback Demo
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : {};
            const isGod = GOD_EMAILS.includes(user.email);

            return {
                ...INITIAL_ORG,
                id: 'org1', 
                subscription_plan: isGod ? 'elite' : INITIAL_ORG.subscription_plan, 
                name: isGod ? 'Reviewflow HQ (God Mode)' : INITIAL_ORG.name,
                integrations: { ...INITIAL_ORG.integrations, google: true, facebook: true, instagram_posting: true }
            };
        },
        update: async (data: any) => { 
            if(supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                await supabase.from('organizations').update(data).eq('id', user?.organization_id);
            }
            return { ...INITIAL_ORG, ...data }; 
        },
        create: async (name: string, industry: string) => { 
            // This is usually handled by triggers on signup, but for manual creation:
            return { ...INITIAL_ORG, name, industry }; 
        },
        saveGoogleTokens: async () => { 
            if (supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.provider_token && session?.provider_refresh_token) {
                    const user = await api.auth.getUser();
                    if(user?.organization_id) {
                        await supabase.from('organizations').update({
                            google_access_token: session.provider_token,
                            google_refresh_token: session.provider_refresh_token
                        }).eq('id', user.organization_id);
                    }
                }
            }
            return true; 
        },
        addStaffMember: async (name: string, role: string, email: string) => { 
            if(supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                await supabase.from('staff_members').insert({ 
                    organization_id: user?.organization_id, 
                    name, role, email 
                });
            }
        },
        removeStaffMember: async (id: string) => { 
            if(supabase && !isDemoMode()) await supabase.from('staff_members').delete().eq('id', id);
        },
        generateApiKey: async (name: string) => { 
            if (supabase && !isDemoMode()) {
                await supabase.functions.invoke('manage_org_settings', { body: { action: 'generate_api_key', data: { name } } });
            }
        },
        revokeApiKey: async (id: string) => { 
            if (supabase && !isDemoMode()) {
                await supabase.functions.invoke('manage_org_settings', { body: { action: 'revoke_api_key', data: { id } } });
            }
        },
        saveWebhook: async () => { await delay(500); },
        testWebhook: async () => { await delay(1000); return true; },
        deleteWebhook: async () => { await delay(500); },
        simulatePlanChange: async () => { await delay(1000); }
    },
    reviews: {
        list: async (filters: any): Promise<Review[]> => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                let query = supabase.from('reviews')
                    .select('*, location:locations(organization_id)')
                    .order('received_at', { ascending: false });
                
                // Filter by organization via location join is implicit via RLS policy
                
                if (filters?.rating && filters.rating !== 'Tout') {
                    query = query.eq('rating', parseInt(filters.rating));
                }
                if (filters?.status && filters.status !== 'all') {
                    if (filters.status === 'todo') query = query.in('status', ['pending', 'draft']);
                    else query = query.eq('status', filters.status);
                }
                if (filters?.search) {
                    query = query.ilike('text', `%${filters.search}%`);
                }
                if (filters?.limit) {
                    const from = (filters.page || 0) * filters.limit;
                    query = query.range(from, from + filters.limit - 1);
                }

                const { data, error } = await query;
                if (error) console.error(error);
                return data || [];
            }

            await delay(300);
            let reviews = [...INITIAL_REVIEWS];
            if (filters?.rating && filters.rating !== 'Tout') reviews = reviews.filter(r => r.rating === Number(filters.rating));
            if (filters?.status && filters.status !== 'all') reviews = reviews.filter(r => r.status === filters.status);
            return reviews;
        },
        getTimeline: (review: Review): ReviewTimelineEvent[] => [
            { id: '1', type: 'review_created', actor_name: review.author_name, date: review.received_at, content: 'Avis reçu' },
            { id: '2', type: 'ai_analysis', actor_name: 'IA Gemini', date: review.received_at, content: 'Analyse terminée' },
        ],
        reply: async (reviewId: string, text: string) => { 
            if (supabase && !isDemoMode()) {
                await supabase.functions.invoke('post_google_reply', { body: { reviewId, replyText: text } });
            }
        },
        saveDraft: async (reviewId: string, text: string) => { 
            if (supabase && !isDemoMode()) {
                await supabase.from('reviews').update({ 
                    status: 'draft', 
                    ai_reply: { text, created_at: new Date().toISOString() } // simplified update
                }).eq('id', reviewId);
            }
        },
        addNote: async (id: string, text: string) => {
            if (supabase && !isDemoMode()) {
                // Fetch current notes first (simple append)
                // In real app, notes should be a separate table
                return { id: Date.now().toString(), text, author_name: 'Moi', created_at: new Date().toISOString() };
            }
            return { id: Date.now().toString(), text, author_name: 'Moi', created_at: new Date().toISOString() };
        },
        addTag: async (id: string, tag: string) => { await delay(200); },
        removeTag: async (id: string, tag: string) => { await delay(200); },
        archive: async (id: string) => { await delay(300); },
        unarchive: async (id: string) => { await delay(300); },
        getCounts: async () => {
            if (supabase && !isDemoMode()) {
                const { count: todo } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('status', ['pending', 'draft']);
                const { count: done } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'sent');
                return { todo: todo || 0, done: done || 0 };
            }
            return { todo: 5, done: 120 };
        },
        subscribe: (callback: (payload: any) => void) => {
            if (supabase && !isDemoMode()) {
                return supabase.channel('custom-all-channel')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, callback)
                    .subscribe();
            }
            return { unsubscribe: () => {} };
        },
        uploadCsv: async () => { await delay(1000); return 15; }
    },
    notifications: {
        list: async (...args: any[]) => [],
        markAllRead: async () => {},
        sendTestEmail: async () => { await delay(1000); }
    },
    global: {
        search: async (query: string) => []
    },
    ai: {
        generateReply: async (review: Review, config: any) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'generate_reply', context: { review, ...config } }
                });
                if (error) throw new Error(error.message);
                if (data.error) throw new Error(data.error);
                return data.text;
            }
            await delay(1000);
            return "Merci pour votre message ! Nous sommes ravis que vous ayez apprécié votre expérience. À très bientôt !";
        },
        previewBrandVoice: async (type: string, input: string, settings: BrandSettings) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'test_brand_voice', context: { simulationType: type, inputText: input, simulationSettings: settings } }
                });
                if (error) throw new Error(error.message);
                return data.text;
            }
            await delay(1000);
            return `[${settings.tone}] Merci beaucoup ! (Ceci est une simulation locale)`;
        },
        generateSocialPost: async (review: Review, platform: string) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'social_post', context: { review, platform } }
                });
                if (error) throw new Error(error.message);
                return data.text;
            }
            await delay(1000);
            return "🌟 Un immense merci à nos clients formidables ! #Gratitude";
        },
        generateManagerAdvice: async (member: StaffMember, rank: number, type: string) => { 
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'generate_manager_advice', context: { name: member.name, role: member.role, reviewCount: member.reviews_count, avgRating: member.average_rating, rank, type } }
                });
                return data.text;
            }
            await delay(1000); return "Conseil IA : Encouragez les photos."; 
        },
        runCustomTask: async (payload: any) => { await delay(2000); return { result: "Success" }; },
        chatWithSupport: async (msg: string, history: any[]) => { await delay(1000); return "Je suis l'assistant de test. Tout fonctionne !"; },
        getCoachAdvice: async (progress: ClientProgress): Promise<AiCoachMessage> => {
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.functions.invoke('ai_coach', { body: { progress } });
                return data;
            }
            await delay(1000);
            return {
                title: "Mode Expert 🚀",
                message: "Vous avez un accès total. Profitez-en pour explorer toutes les fonctionnalités.",
                focus_area: "social"
            };
        }
    },
    analytics: {
        getOverview: async (period = '30j') => { 
            // In real implementation, this would call a Supabase RPC function that aggregates data
            await delay(500); 
            return INITIAL_ANALYTICS; 
        }
    },
    marketing: {
        getBlogPosts: async () => [],
        saveBlogPost: async (p: BlogPost) => p,
        generateSeoMeta: async (content: string) => {
             await delay(1000);
             return { meta_title: 'Titre Optimisé SEO', meta_description: 'Description optimisée générée par IA...', slug: 'slug-optimise' };
        },
        analyzeCompetitorSeo: async (url: string): Promise<SeoAudit> => ({
            url, scanned_at: new Date().toISOString(), metrics: { title: 'Site Concurrent', description: 'Meta Description', h1: 'H1 Principal', load_time_ms: 200, mobile_friendly: true },
            keywords: ['keyword1', 'keyword2'], ai_analysis: { strengths: ['Vitesse'], weaknesses: ['Contenu'], opportunities: ['Mots-clés manquants'] }
        }),
        generateRichSnippet: async (data: any) => JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": data.name,
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": data.rating,
                "reviewCount": data.count
            }
        }, null, 2),
        generateCampaignContent: async (prompt: string, budget: number) => {
             if (supabase && !isDemoMode()) {
                 const { data } = await supabase.functions.invoke('ai_generate', {
                     body: { task: 'generate_email_campaign', context: { offerTitle: prompt, segment: 'all' } }
                 });
                 // Parse JSON result from AI
                 try {
                     const parsed = JSON.parse(data.text);
                     return {
                         sms: `Offre: ${prompt}. Code: PROMO.`,
                         email_subject: parsed.subject,
                         email_body: parsed.body,
                         social_caption: `Découvrez ${prompt} !`
                     };
                 } catch (e) {
                     return { sms: '', email_subject: 'Offre', email_body: data.text, social_caption: '' };
                 }
             }
             await delay(1500);
             return { 
                 sms: `Offre Spéciale : ${prompt}! -20% avec ce SMS.`, 
                 email_subject: `Découvrez ${prompt}`, 
                 email_body: `<p>Bonjour, profitez de notre offre sur ${prompt}...</p>`, 
                 social_caption: `Ne manquez pas ${prompt} ! 🚀 #promo` 
             };
        }
    },
    automation: {
        getWorkflows: async () => { 
            if(supabase && !isDemoMode()) {
                const org = await api.organization.get();
                return org?.workflows || [];
            }
            await delay(300); return INITIAL_WORKFLOWS; 
        },
        saveWorkflow: async (workflow: WorkflowRule) => { 
            if(supabase && !isDemoMode()) {
                const org = await api.organization.get();
                const workflows = org?.workflows || [];
                const updated = workflows.some(w => w.id === workflow.id) 
                    ? workflows.map(w => w.id === workflow.id ? workflow : w)
                    : [...workflows, workflow];
                
                await supabase.from('organizations').update({ workflows: updated }).eq('id', org?.id);
            }
        },
        deleteWorkflow: async (id: string) => { 
            if(supabase && !isDemoMode()) {
                const org = await api.organization.get();
                const updated = (org?.workflows || []).filter(w => w.id !== id);
                await supabase.from('organizations').update({ workflows: updated }).eq('id', org?.id);
            }
        },
        run: async () => { 
            if(supabase && !isDemoMode()) {
                const { data } = await supabase.functions.invoke('process_reviews');
                return data;
            }
            await delay(2000); return { processed: 5, actions: 3 }; 
        }
    },
    competitors: {
        list: async () => { 
            if(supabase && !isDemoMode()) {
                const { data } = await supabase.from('competitors').select('*');
                return data || [];
            }
            await delay(400); return INITIAL_COMPETITORS; 
        },
        getReports: async () => [],
        saveReport: async (report: any) => {},
        autoDiscover: async (radius: number, keyword: string, lat: number, lng: number) => { 
            if(isDemoMode() || !supabase) { await delay(2000); return INITIAL_COMPETITORS; }
            const { data, error } = await supabase.functions.invoke('fetch_places', {
                body: { latitude: lat, longitude: lng, radius, keyword }
            });
            if(error) throw error;
            return data.results || [];
        },
        getDeepAnalysis: async (sector: string, location: string, competitors: any[]) => {
            if(supabase && !isDemoMode()) {
                const { data } = await supabase.functions.invoke('analyze_market', {
                    body: { sector, location, competitors }
                });
                return data;
            }
            return { market_analysis: "Analyse...", trends: [], swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] }, competitors_detailed: [] };
        },
        create: async (data: any) => {
            if(supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                await supabase.from('competitors').insert({ ...data, organization_id: user?.organization_id });
            }
        },
        delete: async (id: string) => {
            if(supabase && !isDemoMode()) await supabase.from('competitors').delete().eq('id', id);
        }
    },
    team: {
        list: async () => {
            if(supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                const { data } = await supabase.from('users').select('*').eq('organization_id', user?.organization_id);
                return data || [];
            }
            return INITIAL_USERS;
        },
        invite: async (email: string, role: string, firstName: string, lastName: string) => {
            if(supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('invite_user', {
                    body: { email, role, firstName, lastName }
                });
                if(error) throw new Error(error.message);
                if(data.error) throw new Error(data.error);
                return data;
            }
            return { success: true };
        }
    },
    reports: {
        trigger: async (reportId: string) => { 
            // In real scenario, trigger a single report generation function
            if(supabase && !isDemoMode()) {
                await supabase.functions.invoke('send_scheduled_reports'); // Trigger global cron for now
            }
            await delay(1000); 
        }
    },
    billing: {
        getInvoices: async () => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('get_invoices');
                if (error) throw error;
                return data.invoices;
            }
            return [];
        },
        getUsage: async () => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                // Count AI usage for current month
                const startOfMonth = new Date(); startOfMonth.setDate(1);
                const { count } = await supabase.from('ai_usage').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()).eq('organization_id', user?.organization_id);
                return count || 0;
            }
            return 450;
        },
        createCheckoutSession: async (planId: string) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('create_checkout', {
                    body: { 
                        plan: planId, // 'starter' or 'pro'
                        successUrl: window.location.origin + '/#/billing?success=true',
                        cancelUrl: window.location.origin + '/#/billing?canceled=true',
                    }
                });
                if (error) throw error;
                if (data.error) throw new Error(data.error);
                return data.url;
            }
            return "https://checkout.stripe.com/mock";
        },
        createPortalSession: async () => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('create_portal', {
                    body: { returnUrl: window.location.origin + '/#/billing' }
                });
                if (error) throw error;
                return data.url;
            }
            return "https://billing.stripe.com/mock";
        }
    },
    locations: {
        update: async (id: string, data: any) => {
            if(supabase && !isDemoMode()) await supabase.from('locations').update(data).eq('id', id);
        },
        create: async (data: any) => {
            if(supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                await supabase.from('locations').insert({ ...data, organization_id: user?.organization_id });
            }
        },
        delete: async (id: string) => {
            if(supabase && !isDemoMode()) await supabase.from('locations').delete().eq('id', id);
        },
        importFromGoogle: async () => { 
            if(supabase && !isDemoMode()) {
                const { data } = await supabase.functions.invoke('cron_sync_reviews'); // Reuse global sync or dedicated import
                return data?.report?.length || 0;
            }
            await delay(2000); return 2; 
        }
    },
    activity: {
        getRecent: async () => []
    },
    onboarding: {
        checkStatus: async (): Promise<SetupStatus> => {
            // Check real data to determine progress
            if(supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                const { data: org } = await supabase.from('organizations').select('integrations, brand, locations(*)').eq('id', user?.organization_id).single();
                
                return {
                    completionPercentage: 80, // Mock calc
                    googleConnected: !!org?.integrations?.google,
                    brandVoiceConfigured: !!org?.brand?.enabled,
                    firstReviewReplied: true // Check reviews count > 0
                }
            }
            return {
                completionPercentage: 100,
                googleConnected: true,
                brandVoiceConfigured: true,
                firstReviewReplied: true
            };
        }
    },
    seedCloudDatabase: async () => {},
    social: {
        getPosts: async (locationId?: string) => {
            if(supabase && !isDemoMode()) {
                let q = supabase.from('social_posts').select('*');
                if(locationId) q = q.eq('location_id', locationId);
                const { data } = await q;
                return data || [];
            }
            return INITIAL_SOCIAL_POSTS;
        },
        schedulePost: async (post: any) => {
            if(supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                await supabase.from('social_posts').insert({
                    organization_id: user?.organization_id,
                    ...post,
                    status: 'scheduled'
                });
            }
        },
        uploadMedia: async (file: File) => {
            if(supabase && !isDemoMode()) {
                const fileName = `${Date.now()}-${file.name}`;
                const { data, error } = await supabase.storage.from('media').upload(fileName, file);
                if (error) throw error;
                // Get Public URL
                const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
                return publicUrl;
            }
            return "https://via.placeholder.com/500";
        },
        connectAccount: async (platform: string) => {
            // Redirect to OAuth
            if(supabase && !isDemoMode()) {
                // Should invoke oauth function or redirect to endpoint
            }
        },
        saveTemplate: async (tpl: Omit<SocialTemplate, 'id'> | SocialTemplate) => {
            if(supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                await supabase.from('social_templates').insert({ ...tpl, organization_id: user?.organization_id });
            }
        }
    },
    public: {
        getLocationInfo: async (id: string) => {
            if(supabase) {
                const { data } = await supabase.from('locations').select('*').eq('id', id).single();
                return data;
            }
            return INITIAL_ORG.locations.find(l => l.id === id) || null;
        },
        getWidgetReviews: async (locationId: string) => {
            if(supabase) {
                const { data } = await supabase.from('reviews').select('*').eq('location_id', locationId).limit(20);
                return data || [];
            }
            return INITIAL_REVIEWS;
        },
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags?: string[], staffName?: string) => {
            if(supabase) {
                const { data, error } = await supabase.functions.invoke('submit_review', {
                    body: { locationId, rating, feedback, contact, tags, staffName }
                });
                if(error) throw error;
            }
        }
    },
    widgets: {
        requestIntegration: async () => {}
    },
    campaigns: {
        send: async (type: 'sms' | 'email', to: string, subject: string, content: string, segment: string, link?: string) => {
            if (supabase && !isDemoMode()) {
                if (type === 'sms') {
                    await supabase.functions.invoke('send_sms_campaign', { body: { to, body: content } });
                } else {
                    await supabase.functions.invoke('send_campaign_emails', { body: { recipients: [{ email: to }], subject, html: content } });
                }
                
                const user = await api.auth.getUser();
                await supabase.from('campaign_logs').insert({
                    organization_id: user?.organization_id,
                    type,
                    subject,
                    content,
                    segment_name: segment,
                    recipient_count: 1, // Mock
                    success_count: 1,
                    status: 'completed',
                    funnel_link: link
                });
            }
        },
        getHistory: async () => {
            if(supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                const { data } = await supabase.from('campaign_logs').select('*').eq('organization_id', user?.organization_id).order('created_at', { ascending: false });
                return data || [];
            }
            return [];
        }
    },
    offers: {
        validate: async (code: string) => {
            if(supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('manage_coupons', {
                    body: { action: 'validate', code }
                });
                if(error) throw error;
                return data;
            }
            return { valid: false, reason: 'Code inconnu' };
        },
        redeem: async (code: string) => {
            if(supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('manage_coupons', {
                    body: { action: 'redeem', code }
                });
                if(error) throw error;
                return data;
            }
        },
        create: async (offer: any) => {
            if(supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                await supabase.from('offers').insert({ ...offer, organization_id: user?.organization_id });
            }
        }
    },
    customers: {
        list: async () => {
            if(supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                const { data } = await supabase.from('customers').select('*').eq('organization_id', user?.organization_id);
                return data || [];
            }
            return [];
        },
        update: async (id: string, updates: any) => {
            if(supabase && !isDemoMode()) await supabase.from('customers').update(updates).eq('id', id);
        },
        import: async (customers: any[]) => {
            if(supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                const payload = customers.map(c => ({ ...c, organization_id: user?.organization_id }));
                await supabase.from('customers').upsert(payload, { onConflict: 'email, organization_id' });
            }
        },
        enrichProfile: async (customerId: string) => {
            if(supabase && !isDemoMode()) {
                const { data } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'enrich_customer', context: { customerId } }
                });
                return JSON.parse(data.text);
            }
            return { profile: "Client fidèle sensible aux promos", suggestion: "Envoyer un code -10%" };
        }
    },
    system: {
        checkHealth: async () => ({ db: true, latency: 45 })
    },
    admin: {
        getStats: async () => {
            if(supabase && !isDemoMode()) {
                // Mock admin stats because implementing real aggregate queries for Super Admin would be complex here
                // Real implementation would use RPC
                const { count: tenants } = await supabase.from('organizations').select('*', { count: 'exact', head: true });
                const { count: reviews } = await supabase.from('reviews').select('*', { count: 'exact', head: true });
                return { mrr: "12,450 €", active_tenants: tenants, total_reviews_processed: reviews, tenants: [] };
            }
            return { mrr: "0 €", active_tenants: 0, total_reviews_processed: 0, tenants: [] };
        }
    },
    google: {
        fetchAllGoogleLocations: async () => [],
        syncReviewsForLocation: async () => { await delay(2000); return 5; }
    },
    company: {
        search: async (query: string) => {
            // Mock company search or use Google Places Autocomplete if Key available
            if (supabase) {
                // Using fetch_places edge function which calls Google Places API
                // This is a bit hacky but reuses existing infrastructure
                const { data } = await supabase.functions.invoke('fetch_places', {
                    body: { keyword: query, latitude: 48.8566, longitude: 2.3522, radius: 50 } // Default Paris center for company lookup
                });
                return data.results?.map((r: any) => ({
                    legal_name: r.name,
                    address: r.address,
                    city: 'France' // Simplified
                })) || [];
            }
            return [];
        }
    },
    support: {
        sendTicket: async (ticket: any) => {
            if (supabase && !isDemoMode()) {
                await supabase.functions.invoke('send_support_ticket', { body: ticket });
            }
        },
        getTutorials: async () => []
    },
    progression: {
        get: async (): Promise<ClientProgress> => {
            if (supabase && !isDemoMode()) {
                const status = await api.onboarding.checkStatus();
                // Simple score calc
                const score = (status.googleConnected ? 20 : 0) + (status.firstReviewReplied ? 30 : 0) + (status.brandVoiceConfigured ? 20 : 0);
                return {
                    score,
                    level: score > 80 ? 'Expert' : score > 40 ? 'Pro' : 'Beginner',
                    steps: { 
                        google_connected: status.googleConnected, 
                        establishment_configured: true,
                        funnel_active: false, 
                        first_review_replied: status.firstReviewReplied, 
                        widget_installed: false, 
                        automation_active: false, 
                        social_active: false 
                    },
                    next_actions: []
                }
            }
            return {
                score: 100,
                level: 'Expert',
                steps: { 
                    google_connected: true, 
                    establishment_configured: true,
                    funnel_active: true, 
                    first_review_replied: true, 
                    widget_installed: true, 
                    automation_active: true, 
                    social_active: true 
                },
                next_actions: []
            };
        },
        getBadges: async () => INITIAL_BADGES,
        getMilestones: async () => INITIAL_MILESTONES
    }
};
