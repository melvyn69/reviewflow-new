import { 
    INITIAL_ORG, INITIAL_REVIEWS, INITIAL_ANALYTICS, 
    INITIAL_WORKFLOWS, INITIAL_REPORTS, INITIAL_COMPETITORS, 
    INITIAL_SOCIAL_POSTS, INITIAL_USERS, INITIAL_BADGES, INITIAL_MILESTONES
} from './db';
import { 
    User, Organization, Review, AnalyticsSummary, WorkflowRule, 
    ReportConfig, Competitor, SocialPost, Customer, SocialTemplate,
    CampaignLog, SetupStatus, StaffMember, ReviewTimelineEvent, BrandSettings, Tutorial,
    ClientProgress, Badge, Milestone, AiCoachMessage, BlogPost, SeoAudit, MultiChannelCampaign,
    ChatMessage
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
            try {
                // 1. PRIORITÉ : Vérifier le cache LocalStorage (Performance + God Mode + Offline support)
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const localUser = JSON.parse(userStr);
                        // Si c'est un God User, on le retourne directement (bypass Supabase)
                        if (GOD_EMAILS.includes(localUser.email)) {
                            return localUser;
                        }
                        // Retourner le cache pour éviter les attentes réseau
                        return localUser;
                    } catch (e) {
                        localStorage.removeItem('user');
                    }
                }

                // 2. SUPABASE : Si pas de cache, on demande à Supabase
                if (!supabase) return null;

                // On vérifie la session mais on catch les erreurs réseau (ex: offline)
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error || !session?.user) {
                    localStorage.removeItem('user');
                    return null;
                }

                const authUser = session.user;

                // 3. RECUPERATION PROFIL (Table 'users')
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authUser.id)
                    .single();

                // 4. CONSTRUCTION OBJET USER
                const appUser: User = {
                    id: authUser.id,
                    email: authUser.email || '',
                    name: profile?.name || authUser.user_metadata?.full_name || 'Utilisateur',
                    role: profile?.role || 'viewer',
                    organization_id: profile?.organization_id,
                    avatar: profile?.avatar_url,
                    is_super_admin: profile?.is_super_admin || false
                };

                // 5. MISE EN CACHE
                localStorage.setItem('user', JSON.stringify(appUser));
                localStorage.removeItem('is_demo_mode');
                
                return appUser;

            } catch (e) {
                console.warn("Auth check failed (likely network issue):", e);
                // En cas d'erreur réseau, si on avait un user en cache on l'aurait déjà retourné.
                // Si on arrive ici, c'est qu'on a pas de cache ET pas de réseau => null.
                return null;
            }
        },

        login: async (email: string, pass: string) => {
            await delay(500); 
            
            const normalizedEmail = (email || '').toLowerCase().trim();
            
            // --- A. GOD MODE BACKDOOR ---
            if (GOD_EMAILS.includes(normalizedEmail)) {
                const godUser: User = {
                    id: 'god-user-' + Date.now(),
                    name: 'Super Admin (God Mode)',
                    email: normalizedEmail,
                    role: 'super_admin',
                    avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=ef4444&color=fff',
                    organization_id: 'org1',
                    organizations: ['org1'],
                    is_super_admin: true
                };
                
                localStorage.setItem('user', JSON.stringify(godUser));
                localStorage.setItem('is_demo_mode', 'true'); 
                
                return godUser;
            }

            // --- B. STANDARD SUPABASE LOGIN ---
            if (!supabase) throw new Error("Supabase non configuré.");

            const { data, error } = await supabase.auth.signInWithPassword({ 
                email: normalizedEmail, 
                password: pass 
            });
            
            if (error) {
                console.error("Login failed:", error.message);
                throw new Error(error.message === "Invalid login credentials" ? "Email ou mot de passe incorrect." : error.message);
            }
            
            const appUser = await api.auth.getUser();
            
            if (!appUser) {
                throw new Error("Connexion réussie mais profil introuvable.");
            }

            return appUser;
        },

        register: async (name: string, email: string, password?: string) => {
            // --- A. INSCRIPTION REELLE ---
            if (supabase && password) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name }
                    }
                });

                if (error) throw new Error(error.message);
                
                if (data.session) {
                    await delay(1000); 
                    const user = await api.auth.getUser();
                    if (user) return user;
                }

                return { id: 'pending', email, name, role: 'viewer' } as User;
            } 
            
            // --- B. MODE DEMO (Fallback) ---
            await delay(1000);
            const user = { ...INITIAL_USERS[0], name, email, id: 'new-user' };
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('is_demo_mode', 'true');
            return user;
        },

        logout: async () => {
            localStorage.removeItem('user');
            localStorage.removeItem('is_demo_mode');
            if (supabase) {
                await supabase.auth.signOut().catch(console.error);
            }
        },

        connectGoogleBusiness: async () => { 
            if (!supabase) throw new Error("Supabase non configuré.");
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                    scopes: 'https://www.googleapis.com/auth/business.manage'
                }
            });
            if (error) throw new Error(error.message);
        },
        updateProfile: async (data: any) => {
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('users').update(data).eq('id', user.id);
                    const current = JSON.parse(localStorage.getItem('user') || '{}');
                    localStorage.setItem('user', JSON.stringify({ ...current, ...data }));
                }
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
        },
        loginWithGoogle: async () => { 
            return api.auth.connectGoogleBusiness();
        }
    },
    organization: {
        get: async (): Promise<Organization | null> => {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const isGod = GOD_EMAILS.includes(user?.email);

            if (isGod || isDemoMode()) {
                return {
                    ...INITIAL_ORG,
                    id: 'org1', 
                    subscription_plan: isGod ? 'elite' : INITIAL_ORG.subscription_plan,
                    name: isGod ? 'Reviewflow HQ (God Mode)' : INITIAL_ORG.name,
                    integrations: { 
                        ...INITIAL_ORG.integrations, 
                        google: true, 
                        facebook: true,
                        instagram_posting: true 
                    }
                };
            }

            if (supabase && user?.organization_id) {
                try {
                    const { data: org, error } = await supabase
                        .from('organizations')
                        .select('*, locations(*), staff_members(*), offers(*), workflows(*)')
                        .eq('id', user.organization_id)
                        .single();
                    
                    if (org) {
                        const googleConnected = !!org.google_refresh_token;
                        return {
                            ...org,
                            integrations: {
                                ...org.integrations,
                                google: googleConnected
                            }
                        };
                    }
                } catch (e) {
                    console.warn("Failed to fetch org (network?):", e);
                    // Return minimal org if offline to prevent crash
                    return { ...INITIAL_ORG, name: "Mode Hors Ligne" };
                }
            }
            return null;
        },
        update: async (data: any) => { 
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('organizations').update(data).eq('id', user.organization_id);
                }
            }
            return { ...INITIAL_ORG, ...data };
        },
        create: async (name: string, industry: string) => { 
            return { ...INITIAL_ORG, name, industry }; 
        },
        saveGoogleTokens: async () => {
            if (supabase) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user && session.provider_token) {
                        const { data: profile } = await supabase.from('users').select('organization_id').eq('id', session.user.id).single();
                        if (profile?.organization_id) {
                            const updates: any = { google_access_token: session.provider_token };
                            if (session.provider_refresh_token) {
                                updates.google_refresh_token = session.provider_refresh_token;
                            }
                            await supabase.from('organizations').update(updates).eq('id', profile.organization_id);
                            return true;
                        }
                    }
                } catch (e) {
                    console.warn("Token save failed", e);
                }
            }
            return false; 
        },
        addStaffMember: async (name: string, role: string, email: string) => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('staff_members').insert({
                        name, role, email, organization_id: user.organization_id
                    });
                }
            }
        },
        removeStaffMember: async (id: string) => { 
            if (supabase && !isDemoMode()) await supabase.from('staff_members').delete().eq('id', id);
        },
        generateApiKey: async (name: string) => { 
            if (supabase && !isDemoMode()) await supabase.functions.invoke('manage_org_settings', { body: { action: 'generate_api_key', data: { name } } });
        },
        revokeApiKey: async (id: string) => {
            if (supabase && !isDemoMode()) await supabase.functions.invoke('manage_org_settings', { body: { action: 'revoke_api_key', data: { id } } });
        },
        saveWebhook: async (config: any) => { },
        testWebhook: async (id: string) => { return true; },
        deleteWebhook: async (id: string) => { },
        simulatePlanChange: async (plan: string) => { }
    },
    reviews: {
        list: async (filters: any = {}): Promise<Review[]> => {
            if (isDemoMode()) {
                await delay(300);
                let reviews = [...INITIAL_REVIEWS];
                if (filters.rating && filters.rating !== 'Tout') reviews = reviews.filter(r => r.rating === Number(filters.rating.toString().replace(/\D/g, '')));
                return reviews;
            }

            if (!supabase) return [];
            
            try {
                const user = await api.auth.getUser();
                if (!user?.organization_id) return [];

                const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', user.organization_id);
                const locIds = locations?.map((l: any) => l.id) || [];

                if (locIds.length === 0) return [];

                let query = supabase.from('reviews').select('*').in('location_id', locIds).order('received_at', { ascending: false });
                
                if (filters.rating && filters.rating !== 'Tout') {
                    const r = Number(filters.rating.toString().replace(/\D/g, ''));
                    if (!isNaN(r)) query = query.eq('rating', r);
                }
                if (filters.source && filters.source !== 'Tout') query = query.eq('source', filters.source.toLowerCase());
                
                if (filters.status && filters.status !== 'all') {
                    if (filters.status === 'todo') query = query.in('status', ['pending', 'draft']);
                    else if (filters.status === 'done') query = query.eq('status', 'sent');
                    else query = query.eq('status', filters.status);
                }
                
                if (filters.limit) query = query.limit(filters.limit);
                if (filters.startDate) query = query.gte('received_at', filters.startDate);
                if (filters.endDate) query = query.lte('received_at', filters.endDate);
                if (filters.search) query = query.ilike('text', `%${filters.search}%`);
                
                const { data, error } = await query;
                if (error) throw error;
                
                return (data || []).map((r: any) => ({ ...r, body: r.text || r.body }));
            } catch (e) {
                console.warn("Review list fetch failed", e);
                return [];
            }
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
            if (supabase && !isDemoMode()) {
                await supabase.functions.invoke('post_google_reply', { body: { reviewId: id, replyText: text } });
            }
        },
        saveDraft: async (id: string, text: string) => {
            if (supabase && !isDemoMode()) {
                await supabase.from('reviews').update({ 
                    status: 'draft',
                    ai_reply: { text, needs_manual_validation: true } 
                }).eq('id', id);
            }
        },
        addNote: async (id: string, text: string) => {
            return { id: Date.now().toString(), text, author_name: 'Moi', created_at: new Date().toISOString() };
        },
        addTag: async (id: string, tag: string) => { 
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('reviews').select('tags').eq('id', id).single();
                const currentTags = data?.tags || [];
                if (!currentTags.includes(tag)) {
                    await supabase.from('reviews').update({ tags: [...currentTags, tag] }).eq('id', id);
                }
            }
        },
        removeTag: async (id: string, tag: string) => {
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('reviews').select('tags').eq('id', id).single();
                const currentTags = data?.tags || [];
                await supabase.from('reviews').update({ tags: currentTags.filter((t: string) => t !== tag) }).eq('id', id);
            }
        },
        archive: async (id: string) => {
            if (supabase && !isDemoMode()) await supabase.from('reviews').update({ archived: true }).eq('id', id);
        },
        unarchive: async (id: string) => {
            if (supabase && !isDemoMode()) await supabase.from('reviews').update({ archived: false }).eq('id', id);
        },
        getCounts: async () => {
            if (isDemoMode()) return { todo: 5, done: 120 };
            
            if (supabase) {
                try {
                    const user = await api.auth.getUser();
                    if (!user?.organization_id) return { todo: 0, done: 0 };
                    
                    const { data: locations } = await supabase.from('locations').select('id').eq('organization_id', user.organization_id);
                    const locIds = locations?.map((l: any) => l.id) || [];
                    
                    if (locIds.length === 0) return { todo: 0, done: 0 };

                    const { count: todo } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('location_id', locIds).in('status', ['pending', 'draft']);
                    const { count: done } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).in('location_id', locIds).eq('status', 'sent');
                    
                    return { todo: todo || 0, done: done || 0 };
                } catch (e) {
                    console.warn("Count fetch failed", e);
                    return { todo: 0, done: 0 };
                }
            }
            return { todo: 0, done: 0 };
        },
        subscribe: (callback: (payload: any) => void) => {
            if (supabase && !isDemoMode()) {
                try {
                    const channel = supabase.channel('reviews-updates')
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, callback)
                        .subscribe((status) => {
                            // Silecne error logs if offline or connection fails
                            if (status !== 'SUBSCRIBED') {
                                // console.warn('Realtime subscription status:', status);
                            }
                        });
                    return { unsubscribe: () => supabase.removeChannel(channel) };
                } catch (e) {
                    console.warn("Realtime subscription error:", e);
                    return { unsubscribe: () => {} };
                }
            }
            return { unsubscribe: () => {} };
        },
        uploadCsv: async (file: File) => { return 0; }
    },
    notifications: {
        list: async () => [],
        markAllRead: async () => {},
        sendTestEmail: async (email: string) => {}
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
                return data.text;
            }
            return "Merci pour votre message ! (Réponse démo)";
        },
        previewBrandVoice: async (type: string, input: string, settings: BrandSettings) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'test_brand_voice', context: { simulationType: type, inputText: input, simulationSettings: settings } }
                });
                if (error) throw new Error(error.message);
                return data.text;
            }
            return `[${settings.tone}] Simulation : Merci !`;
        },
        generateSocialPost: async (review: Review, platform: string) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'social_post', context: { review, platform } }
                });
                if (error) throw new Error(error.message);
                return data.text;
            }
            return "Post social généré pour la démo.";
        },
        generateManagerAdvice: async (member: StaffMember, rank: number, type: string) => { 
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'generate_manager_advice', context: { ...member, rank, type } }
                });
                if (!error) return data.text;
            }
            return "Conseil manager simulé."; 
        },
        runCustomTask: async (task: any) => { return { result: "Not available" }; },
        chatWithSupport: async (msg: string, history?: ChatMessage[]) => { return "Support IA bientôt disponible."; },
        getCoachAdvice: async (progress: ClientProgress): Promise<AiCoachMessage> => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('ai_coach', {
                    body: { progress }
                });
                if (!error) return JSON.parse(data); 
            }
            return { title: "Bienvenue", message: "Complétez votre profil pour avancer.", focus_area: "setup" };
        }
    },
    analytics: {
        getOverview: async (period?: string) => { return INITIAL_ANALYTICS; }
    },
    marketing: {
        getBlogPosts: async () => [],
        saveBlogPost: async (p: BlogPost) => p,
        generateSeoMeta: async (content: string) => ({ meta_title: '', meta_description: '', slug: '' }),
        analyzeCompetitorSeo: async (url: string): Promise<SeoAudit> => ({
            url, scanned_at: new Date().toISOString(), metrics: { title: '', description: '', h1: '', load_time_ms: 0, mobile_friendly: true },
            keywords: [], ai_analysis: { strengths: [], weaknesses: [], opportunities: [] }
        }),
        generateRichSnippet: async (data: any) => "{}",
        generateCampaignContent: async (prompt: string, budget: number) => ({ sms: "", email_subject: "", email_body: "", social_caption: "" })
    },
    automation: {
        getWorkflows: async () => {
            const org = await api.organization.get();
            return org?.workflows || [];
        },
        saveWorkflow: async (workflow: any) => {
            // ...
        },
        deleteWorkflow: async (id: string) => {},
        run: async () => { 
            if (supabase && !isDemoMode()) await supabase.functions.invoke('process_reviews');
            return { processed: 1, actions: 1 }; 
        }
    },
    competitors: {
        list: async (opts?: any) => {
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('competitors').select('*');
                return data || [];
            }
            return INITIAL_COMPETITORS;
        },
        getReports: async () => [],
        saveReport: async (data?: any) => {},
        autoDiscover: async (radius: number, keyword: string, lat: number, lng: number) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('fetch_places', {
                    body: { radius, keyword, latitude: lat, longitude: lng }
                });
                if (error) throw new Error(error.message);
                return data.results;
            }
            return [];
        },
        getDeepAnalysis: async (sector: string, location: string, competitors: any[]) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('analyze_market', {
                    body: { sector, location, competitors }
                });
                if (error) throw new Error(error.message);
                return data;
            }
            return null; 
        },
        create: async (data: any) => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('competitors').insert({ ...data, organization_id: user.organization_id });
                }
            }
        },
        delete: async (id: string) => {
            if (supabase && !isDemoMode()) await supabase.from('competitors').delete().eq('id', id);
        }
    },
    team: {
        list: async () => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    const { data } = await supabase.from('users').select('*').eq('organization_id', user.organization_id);
                    return data as User[] || [];
                }
            }
            return INITIAL_USERS;
        },
        invite: async (email: string, role: string, firstName: string, lastName: string) => {
            if (supabase && !isDemoMode()) {
                const { error } = await supabase.functions.invoke('invite_user', {
                    body: { email, role, firstName, lastName }
                });
                if (error) throw new Error(error.message);
                return { success: true };
            }
            return { success: true };
        }
    },
    reports: {
        trigger: async (reportId: string) => {}
    },
    billing: {
        getInvoices: async () => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('get_invoices');
                if (!error) return data.invoices;
            }
            return [];
        },
        getUsage: async () => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    const { count } = await supabase.from('ai_usage').select('*', { count: 'exact', head: true }).eq('organization_id', user.organization_id);
                    return count || 0;
                }
            }
            return 120;
        },
        createCheckoutSession: async (planId: string) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('create_checkout', {
                    body: { 
                        plan: planId,
                        successUrl: window.location.origin + '/#/billing?success=true',
                        cancelUrl: window.location.origin + '/#/billing?canceled=true'
                    }
                });
                if (error) throw new Error(error.message);
                return data.url;
            }
            return "";
        },
        createPortalSession: async () => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('create_portal', {
                    body: { returnUrl: window.location.origin + '/#/billing' }
                });
                if (error) throw new Error(error.message);
                return data.url;
            }
            return "";
        }
    },
    locations: {
        update: async (id: string, data: any) => {
            if (supabase && !isDemoMode()) await supabase.from('locations').update(data).eq('id', id);
        },
        create: async (data: any) => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('locations').insert({ ...data, organization_id: user.organization_id });
                }
            }
        },
        delete: async (id: string) => {
            if (supabase && !isDemoMode()) await supabase.from('locations').delete().eq('id', id);
        },
        importFromGoogle: async () => {
            if (supabase && !isDemoMode()) {
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.provider_token;
                
                const { data, error } = await supabase.functions.invoke('fetch_google_locations', {
                    body: { accessToken } 
                });

                if (error) throw new Error(error.message);
                
                const user = await api.auth.getUser();
                if (user?.organization_id && Array.isArray(data)) {
                    let count = 0;
                    for (const loc of data) {
                        const { error: insertError } = await supabase.from('locations').upsert({
                            organization_id: user.organization_id,
                            name: loc.title,
                            external_reference: loc.name,
                            address: loc.address,
                            connection_status: 'connected',
                            city: loc.address.split(',')[1]?.trim() || 'Inconnu'
                        }, { onConflict: 'external_reference' });
                        if (!insertError) count++;
                    }
                    return count;
                }
            }
            return 0;
        }
    },
    activity: {
        getRecent: async () => []
    },
    onboarding: {
        checkStatus: async (): Promise<SetupStatus> => ({
            completionPercentage: 0,
            googleConnected: false,
            brandVoiceConfigured: false,
            firstReviewReplied: false
        })
    },
    seedCloudDatabase: async () => {},
    social: {
        getPosts: async (locationId?: string) => {
            if (supabase && !isDemoMode()) {
                let q = supabase.from('social_posts').select('*');
                if (locationId) q = q.eq('location_id', locationId);
                const { data } = await q;
                return data as SocialPost[] || [];
            }
            return INITIAL_SOCIAL_POSTS;
        },
        schedulePost: async (post: any) => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('social_posts').insert({
                        ...post,
                        organization_id: user.organization_id,
                        status: 'scheduled'
                    });
                }
            }
        },
        uploadMedia: async (file: File) => {
            if (supabase && !isDemoMode()) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const { data, error } = await supabase.storage.from('media').upload(fileName, file);
                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
                return publicUrl;
            }
            return "https://via.placeholder.com/500";
        },
        connectAccount: async (platform: string) => { },
        saveTemplate: async (template: any) => { }
    },
    public: {
        getLocationInfo: async (id: string) => {
            if (supabase && !isDemoMode()) {
                try {
                    const { data } = await supabase.from('locations').select('*').eq('id', id).single();
                    return data;
                } catch { return null; }
            }
            return INITIAL_ORG.locations.find(l => l.id === id) || null;
        },
        getWidgetReviews: async (id: string) => {
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('reviews').select('*').eq('location_id', id).gte('rating', 4).order('received_at', { ascending: false }).limit(20);
                return data || [];
            }
            return INITIAL_REVIEWS;
        },
        submitFeedback: async (locationId: string, rating: number, feedback: string, contact: any, tags: string[], staffName?: string) => {
            if (supabase && !isDemoMode()) {
                const { error } = await supabase.functions.invoke('submit_review', {
                    body: { locationId, rating, feedback, contact, tags, staffName }
                });
                if (error) throw new Error(error.message);
            }
        }
    },
    widgets: {
        requestIntegration: async (data: any) => {}
    },
    campaigns: {
        send: async (channel: string, to: string, subject: string, content: string, segment: string, link?: string) => {
            if (supabase && !isDemoMode()) {
                if (channel === 'sms') {
                    const { error } = await supabase.functions.invoke('send_sms_campaign', { body: { to, body: content } });
                    if (error) throw new Error(error.message);
                } else {
                    const { error } = await supabase.functions.invoke('send_campaign_emails', { body: { recipients: [{ email: to }], subject, html: content } });
                    if (error) throw new Error(error.message);
                }
            }
        },
        getHistory: async () => []
    },
    offers: {
        validate: async (code: string) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('manage_coupons', {
                    body: { action: 'validate', code }
                });
                if (error) throw new Error(error.message);
                return data;
            }
            return { valid: false };
        },
        redeem: async (code: string) => {
            if (supabase && !isDemoMode()) {
                const { error } = await supabase.functions.invoke('manage_coupons', {
                    body: { action: 'redeem', code }
                });
                if (error) throw new Error(error.message);
            }
        },
        create: async (offer: any) => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    await supabase.from('offers').insert({ ...offer, organization_id: user.organization_id });
                }
            }
        }
    },
    customers: {
        list: async (filters: any = {}): Promise<Customer[]> => {
            if (supabase && !isDemoMode()) {
                const { data } = await supabase.from('customers').select('*');
                return data as Customer[] || [];
            }
            return [];
        },
        update: async (id: string, data: any) => {
            if (supabase && !isDemoMode()) await supabase.from('customers').update(data).eq('id', id);
        },
        import: async (data: any[]) => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                if (user?.organization_id) {
                    const customers = data.map(c => ({ ...c, organization_id: user.organization_id }));
                    await supabase.from('customers').upsert(customers, { onConflict: 'email' });
                }
            }
        },
        enrichProfile: async (id: string) => {
            if (supabase && !isDemoMode()) {
                const { data, error } = await supabase.functions.invoke('ai_generate', {
                    body: { task: 'enrich_customer', context: { customerId: id } }
                });
                if (!error) return JSON.parse(data.text);
            }
            return { profile: "Profil IA", suggestion: "Suggestion IA" };
        }
    },
    system: {
        checkHealth: async () => ({ db: true, latency: 45 })
    },
    admin: {
        getStats: async () => ({ mrr: "0 €", active_tenants: 0, total_reviews_processed: 0, tenants: [] })
    },
    google: {
        fetchAllGoogleLocations: async () => [],
        syncReviewsForLocation: async (locationId: string) => { return 0; }
    },
    company: {
        search: async (query: string) => []
    },
    support: {
        sendTicket: async (ticket: any) => {
            if (supabase && !isDemoMode()) {
                const user = await api.auth.getUser();
                await supabase.functions.invoke('send_support_ticket', {
                    body: { ...ticket, email: user?.email, name: user?.name }
                });
            }
        },
        getTutorials: async () => []
    },
    progression: {
        get: async (): Promise<ClientProgress> => ({
            score: 0,
            level: 'Beginner',
            steps: { google_connected: false, establishment_configured: false, funnel_active: false, first_review_replied: false, widget_installed: false, automation_active: false, social_active: false },
            next_actions: []
        }),
        getBadges: async () => INITIAL_BADGES,
        getMilestones: async () => INITIAL_MILESTONES
    }
};